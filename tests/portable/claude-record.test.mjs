import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { root, run } from "./fixtures.mjs";
import { normalizeEvidence } from "../../.github/skills/marketing-iq/scripts/portable/evidence.js";

// Claude Code gap (2026-11-20): the capture commands read only Copilot's events.jsonl, so in Claude
// Code a connector body could only be hand-copied. Claude records each tool call in its session file
// (<session-id>.jsonl): an assistant tool_use block and a later user tool_result block. The record is
// undocumented, so the reader is strict and fails closed. WebFetch returns a model-written summary,
// never page text, so no built-in Claude tool result is admitted as a body.
const page = "https://learn.example.invalid/docs/widget";
const folder = "https://contoso.example.invalid/personal/synthetic_user/Documents/Hackathon";
const body = `# Widget\nFIXTURE line two: Widget is in beta.\n\nFIXTURE line four: costs $5 a month.`;
let sequence = 0;
const entry = (type, content, at, extra = {}) => ({ type, uuid: `u-${++sequence}`, timestamp: at, sessionId: "s",
    message: { role: type, content }, ...extra });
function call(id, { name = "mcp__microsoft-learn__microsoft_docs_fetch", input = { url: page }, at = new Date().toISOString(),
    content = [{ type: "text", text: body }], isError } = {}) {
    return [
        entry("assistant", [{ type: "tool_use", id, name, input }], at),
        entry("user", [{ type: "tool_result", tool_use_id: id, content, ...(isError === undefined ? {} : { is_error: isError }) }],
            at, { toolUseResult: "display copy, not used" })
    ];
}
async function record(t, entries, name = `${randomUUID()}.jsonl`) {
    const directory = join(root, "tests", "portable", `crec-${randomUUID()}`);
    await fs.mkdir(directory);
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const path = join(directory, name);
    await fs.writeFile(path, [{ type: "summary" }, ...entries].map(value => JSON.stringify(value)).join("\n") + "\n");
    return path;
}
const capture = (path, id, lines) => run(["events-capture", "--adapter", "microsoft-learn", "--events", path, "--call", id,
    "--lines", lines, "--scope-url", "https://learn.example.invalid/docs", "--scope-kind", "container"]);
const invalid = (result, code, note) => {
    assert.equal(result.code, 1, note);
    assert.deepEqual(result.value, { status: "invalid", diagnostics: [code] }, note);
};

test("CR-01 an MCP fetch in a Claude session record is indexed and admitted with URL, tool and time from the record", async t => {
    const at = new Date(Date.now() - 60000).toISOString();
    const path = await record(t, call("toolu_01A", { at }));
    const index = run(["events-capture", "--events", path, "--call", "toolu_01A", "--index"]);
    assert.equal(index.code, 0, JSON.stringify(index.value));
    assert.deepEqual(index.value.lines.map(line => line.n), [1, 2, 4]);
    assert.equal(index.value.sourceUrl, page);
    const result = capture(path, "toolu_01A", "2-2,4-4");
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.deepEqual(result.value.evidence, [{ sourceId: page, sourceUrl: page,
        body: "FIXTURE line two: Widget is in beta.\n[...]\nFIXTURE line four: costs $5 a month." }]);
    assert.equal(result.value.provenance[0].tool, "mcp__microsoft-learn__microsoft_docs_fetch");
    assert.equal(result.value.provenance[0].observedAt, at);
    const text = await record(t, call("toolu_01B", { content: body }));
    assert.equal(capture(text, "toolu_01B", "2-2").value.status, "ready", "string content");
});

test("CR-02 built-in Claude tool results are never body evidence: WebFetch is a model summary", async t => {
    const path = await record(t, [...call("toolu_W", { name: "WebFetch", input: { url: page, prompt: "Summarise" } }),
        ...call("toolu_S", { name: "WebSearch", input: { query: "widget" } })]);
    invalid(capture(path, "toolu_W", "2-2"), "RESULT_NOT_VERBATIM", "WebFetch");
    invalid(run(["events-capture", "--events", path, "--call", "toolu_W", "--index"]), "RESULT_NOT_VERBATIM", "index too");
    invalid(capture(path, "toolu_S", "2-2"), "RESULT_NOT_VERBATIM", "WebSearch");
});

test("CR-03 the reader fails closed on errors, non-text results and conflicting records", async t => {
    invalid(capture(await record(t, call("toolu_E", { isError: true })), "toolu_E", "2-2"), "CAPTURE_UNAVAILABLE", "error result");
    invalid(capture(await record(t, call("toolu_I", { content: [{ type: "text", text: body },
        { type: "image", source: {} }] })), "toolu_I", "2-2"), "CAPTURE_UNAVAILABLE", "non-text block");
    const [use, result] = call("toolu_D");
    invalid(capture(await record(t, [use, result, { ...result, uuid: "u-other" }]), "toolu_D", "2-2"),
        "CAPTURE_UNAVAILABLE", "two different results");
    assert.equal(capture(await record(t, [use, result, result]), "toolu_D", "2-2").value.status, "ready",
        "the same entry written twice is one result");
    invalid(capture(await record(t, call("toolu_N"), "transcript.jsonl"), "toolu_N", "2-2"), "INVALID_REQUEST",
        "only events.jsonl or a <session-id>.jsonl record");
    invalid(capture(await record(t, call("toolu_N"), `${randomUUID()}xjsonl`), "toolu_N", "2-2"), "INVALID_REQUEST",
        "the extension is literal");
    assert.equal(capture(await record(t, call("toolu_G", { }), "agent-a286e557e95784986.jsonl"), "toolu_G", "2-2").value.status,
        "ready", "a subagent's record (how a plugin agent usually runs) is read the same way");
    invalid(capture(await record(t, call("toolu_G"), "agent-a286e557e95784986.meta.jsonl"), "toolu_G", "2-2"), "INVALID_REQUEST");
    invalid(capture(await record(t, call("toolu_H")), "toolu_absent", "2-2"), "CAPTURE_UNAVAILABLE", "a call from another record");
});

test("CR-04 WorkIQ retrieval through Claude's mcp__workiq__retrieve is admitted by workiq-capture and evidence", async t => {
    const hit = { contentProtection: "allowed", resourceId: "RES1", webUrl: `${folder}/Doc1.docx`,
        sensitivityLabel: { displayName: "General" }, markdown: "- **Doc 1**\n- **snippet:** FIXTURE 1: leaders need one view." };
    const payload = { "application/vnd.ms-workiq.retrieval": { resultCount: 1, results: [hit] } };
    const input = { query: "Within this folder only", capabilities: [{ name: "OneDriveAndSharePoint", items_by_url: [{ url: folder }] }] };
    const path = await record(t, call("toolu_Q", { name: "mcp__workiq__retrieve", input,
        content: [{ type: "text", text: JSON.stringify(payload) }] }));
    const result = run(["workiq-capture", "--events", path, "--select", "toolu_Q:0"]);
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.equal(result.value.status, "ready");
    assert.equal(result.value.provenance[0].tool, "mcp__workiq__retrieve");
    assert.deepEqual(result.value.evidence.map(item => item.body), ["FIXTURE 1: leaders need one view."]);
    const other = await record(t, call("toolu_X", { name: "mcp__other__retrieve", input,
        content: [{ type: "text", text: JSON.stringify(payload) }] }));
    invalid(run(["workiq-capture", "--events", other, "--select", "toolu_X:0"]), "CAPTURE_UNAVAILABLE", "another server");
    const fixture = JSON.parse(await fs.readFile(join(root, ".github", "skills", "marketing-iq", "examples", "synthetic-evidence.json")));
    fixture.adapterId = "workiq"; fixture.sources[0].sourceKind = "sharepoint";
    fixture.sources[0].provenance.tool = "mcp__workiq__retrieve";
    assert.equal(normalizeEvidence(fixture, "workiq").status, "ready");
    fixture.sources[0].provenance.tool = "mcp__other__retrieve";
    assert.throws(() => normalizeEvidence(fixture, "workiq"));
});
