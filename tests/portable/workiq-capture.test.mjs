import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cliRelative, root, run } from "./fixtures.mjs";

// Trials A3/A4 (2026-11-20): the packaged agent admitted WorkIQ evidence through an improvised
// PowerShell pipeline over its own events.jsonl, which unattended runs cannot approve. workiq-capture
// does the same mapping deterministically in node, and takes the scope from the retrieval call's own
// items_by_url so an unbounded search cannot be admitted (HT-03 as code, not prose).
const folder = "https://contoso.example.invalid/personal/synthetic_user/Documents/Hackathon";
const other = "https://contoso.example.invalid/personal/synthetic_user/Documents/Elsewhere";
const doc = n => `https://contoso.example.invalid/personal/synthetic_user/_layouts/15/Doc.aspx?sourcedoc=%7B${n}%7D&file=Doc${n}.docx`;
const hit = (n, overrides = {}) => ({
    contentProtection: "allowed", driveId: "b!synthetic", entityType: "Files", entityUrl: `/drives/b!synthetic/items/ITEM${n}`,
    id: `ID${n}`, itemId: `ITEM${n}`, resourceId: `RES${n}`, resourceMetadata: {},
    sensitivityLabel: { displayName: "General" }, webUrl: doc(n),
    markdown: `- **Synthetic document ${n}**\n- **snippet:** FIXTURE ${n}: transit leaders need one shared view.`, ...overrides
});
function retrieval(callId, hits, { scope = folder, toolName = "workiq-retrieve", success = true, at = new Date().toISOString(), capabilities } = {}) {
    const payload = { "application/vnd.ms-workiq.retrieval": { resultCount: hits.length, results: hits } };
    return [
        { type: "tool.execution_start", data: { toolCallId: callId, toolName, arguments: {
            query: "Within this folder only, find excerpts.", strategy: "grounding",
            capabilities: capabilities ?? [{ name: "OneDriveAndSharePoint", ...(scope ? { items_by_url: [{ url: scope }] } : {}) }] } } },
        { type: "tool.execution_complete", timestamp: at, data: { toolCallId: callId, success,
            result: { content: JSON.stringify(payload), structuredContent: payload } } }
    ];
}
async function events(t, records, { tail = "" } = {}) {
    const directory = join(root, "tests", "portable", `wcap-${randomUUID()}`);
    await fs.mkdir(directory);
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const path = join(directory, "events.jsonl");
    await fs.writeFile(path, records.map(record => JSON.stringify(record)).join("\n") + "\n" + tail);
    return path;
}
const capture = (path, select) => run(["workiq-capture", "--events", path, "--select", select]);
const invalid = (result, code, note) => {
    assert.equal(result.code, 1, note);
    assert.deepEqual(result.value, { status: "invalid", diagnostics: [code] }, note);
};

test("WC-01 selected hits of one bounded retrieval are admitted with the call's own folder as scope", async t => {
    const at = new Date(Date.now() - 60000).toISOString();
    const path = await events(t, retrieval("call_A", [hit(1), hit(2, { sensitivityLabel: undefined }), hit(3)], { at }));
    const result = capture(path, "call_A:0,1");
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.equal(result.value.status, "ready");
    assert.equal(result.value.adapterId, "workiq");
    assert.deepEqual(result.value.evidence, [
        { sourceId: "RES1", sourceUrl: doc(1), body: "FIXTURE 1: transit leaders need one shared view." },
        { sourceId: "RES2", sourceUrl: doc(2), body: "FIXTURE 2: transit leaders need one shared view." }]);
    assert.deepEqual(result.value.sources.map(source => [source.sourceKind, source.evidenceKind, source.coverage]),
        [["sharepoint", "document-excerpt", "partial-body"], ["sharepoint", "document-excerpt", "partial-body"]]);
    const [first, second] = result.value.provenance;
    assert.equal(first.tool, "workiq-retrieve");
    assert.equal(first.observedAt, at);
    assert.equal(first.locationUrl, folder);
    assert.equal(first.restrictions.sensitivityLabel, "General");
    assert.equal(second.restrictions.sensitivityLabel, null);
    const gaps = result.value.proofGaps.join("\n");
    assert.match(gaps, /RES1: in scope only through caller-stated location/);
    assert.match(gaps, /results 0,1 of workiq-retrieve call call_A, selected by the caller; the selection is not an independent review/);
    assert.match(gaps, /RES2: use restrictions or sensitivity are not fully established/);
});

test("WC-02 a retrieval without one items_by_url folder cannot be admitted", async t => {
    for (const [note, options] of [["no items_by_url", { scope: null }],
        ["two folders", { capabilities: [{ name: "OneDriveAndSharePoint", items_by_url: [{ url: folder }, { url: other }] }] }],
        ["folder only in query", { capabilities: [{ name: "OneDriveAndSharePoint" }] }]]) {
        const path = await events(t, retrieval("call_A", [hit(1)], options));
        invalid(capture(path, "call_A:0"), "RETRIEVAL_NOT_BOUNDED", note);
    }
});

test("WC-03 several calls combine only when they share one folder, under one set of admission limits", async t => {
    const same = await events(t, [...retrieval("call_A", [hit(1)]), ...retrieval("call_B", [hit(2), hit(3)])]);
    const result = capture(same, "call_A:0+call_B:0,1");
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.deepEqual(result.value.evidence.map(item => item.sourceId), ["RES1", "RES2", "RES3"]);
    const split = await events(t, [...retrieval("call_A", [hit(1)]), ...retrieval("call_B", [hit(2)], { scope: other })]);
    invalid(capture(split, "call_A:0+call_B:0"), "SCOPE_MISMATCH");
    const repeated = await events(t, [...retrieval("call_A", [hit(1)]), ...retrieval("call_B", [hit(1)])]);
    invalid(capture(repeated, "call_A:0+call_B:0"), "DUPLICATE_SOURCE");
    invalid(capture(same, "call_A:0+call_A:0"), "INVALID_REQUEST", "a call is selected once");
});

test("WC-04 the selected call must be one successful workiq-retrieve completion", async t => {
    const failed = await events(t, retrieval("call_A", [hit(1)], { success: false }));
    invalid(capture(failed, "call_A:0"), "CAPTURE_UNAVAILABLE", "failed");
    const fetch = await events(t, retrieval("call_A", [hit(1)], { toolName: "workiq-fetch" }));
    invalid(capture(fetch, "call_A:0"), "CAPTURE_UNAVAILABLE", "not a retrieve call");
    const twice = await events(t, [...retrieval("call_A", [hit(1)]), retrieval("call_A", [hit(1)])[1]]);
    invalid(capture(twice, "call_A:0"), "CAPTURE_UNAVAILABLE", "two completions");
    invalid(capture(failed, "call_missing:0"), "CAPTURE_UNAVAILABLE", "missing");
});

test("WC-05 result selections and snippet markers are strict", async t => {
    const path = await events(t, retrieval("call_A", [hit(1), hit(2),
        hit(3, { markdown: "- **No snippet here**" }), hit(4, { markdown: "- **snippet:** a\n- **snippet:** b" }),
        hit(5, { markdown: "- **Doc**\n- **snippet:**    " })]));
    assert.equal(capture(path, "call_A:1").value.status, "ready", "positive control");
    for (const select of ["call_A:9", "call_A:1,0", "call_A:0,0", "call_A:", "call_A:-1", "call_A:01", "call_A", ":0"])
        invalid(capture(path, select), "INVALID_REQUEST", select);
    for (const select of ["call_A:2", "call_A:3", "call_A:4"]) invalid(capture(path, select), "SNIPPET_UNAVAILABLE", select);
});

test("WC-06 stale captures, unsafe paths and non-allowed content are not admitted as allowed", async t => {
    const stale = await events(t, retrieval("call_A", [hit(1)], { at: new Date(Date.now() - 7 * 3600 * 1000).toISOString() }));
    invalid(capture(stale, "call_A:0"), "CAPTURE_STALE");
    invalid(run(["workiq-capture", "--events", "events.jsonl", "--select", "call_A:0"]), "INVALID_REQUEST", "relative");
    const path = await events(t, retrieval("call_A", [hit(1)]));
    const renamed = path.replace(/events\.jsonl$/, "other.jsonl");
    await fs.copyFile(path, renamed);
    invalid(capture(renamed, "call_A:0"), "INVALID_REQUEST", "not events.jsonl");
    const protectedHit = await events(t, retrieval("call_A", [hit(1, { contentProtection: "blocked" })]));
    const result = capture(protectedHit, "call_A:0");
    assert.equal(result.value.status, "blocked");
    assert.match(result.value.proofGaps.join("\n"), /RES1: excluded \(access denied or unverified\)/);
});

test("WC-08 '<command> --help' prints usage, so a model checking usage is not told the command is invalid (A5)", () => {
    // A5: the agent ran `workiq-capture --help`, got INVALID_REQUEST and fell back to staging source text.
    for (const command of ["workiq-capture", "evidence", "capture"]) {
        const result = spawnSync(process.execPath, [join(root, cliRelative), command, "--help"], { encoding: "utf8", timeout: 20000 });
        assert.equal(result.status, 0, command);
        assert.match(result.stdout, /workiq-capture --events <absolute events\.jsonl> --select <toolCallId>:<i,j>/, command);
    }
    const extra = spawnSync(process.execPath, [join(root, cliRelative), "workiq-capture", "--help", "--select", "x:0"], { encoding: "utf8" });
    assert.equal(extra.status, 1, "--help combined with other options stays invalid");
});

test("WC-07 a live session's partly written last line is ignored, and failures never echo source text", async t => {
    const path = await events(t, retrieval("call_A", [hit(1)]), { tail: '{"type":"tool.execution_start","data":{"toolCallId":"call_Z' });
    assert.equal(capture(path, "call_A:0").value.status, "ready");
    const broken = await events(t, retrieval("call_A", [hit(1)]), { tail: "not json\n" });
    const result = capture(broken, "call_A:0");
    invalid(result, "CAPTURE_UNAVAILABLE", "a malformed complete line");
    assert.doesNotMatch(JSON.stringify(result.value), /FIXTURE/);
});
