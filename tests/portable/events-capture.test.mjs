import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { root, run } from "./fixtures.mjs";

// Evaluation E1/E5 (2026-11-20): with an inline fetch result, the model hand-copied bodies into a
// staged handoff; they were verbatim sentence by sentence but joined passages without `[...]`.
// events-capture admits line ranges of any connector's inline result straight from the host's own
// events.jsonl, with source URL, tool and time taken from the record rather than from the caller.
const page = "https://vendor.example.invalid/products/widget";
const scope = "https://vendor.example.invalid/products";
const content = `Contents of ${page}:\n# Widget\nFIXTURE line three: Widget is in beta.\n\nFIXTURE line five: costs $5 a month.\nFIXTURE line six: footer.`;
function call(callId, { toolName = "web_fetch", args = { url: page, max_length: 20000 }, success = true,
    at = new Date().toISOString(), result = { content } } = {}) {
    return [
        { type: "tool.execution_start", data: { toolCallId: callId, toolName, arguments: args } },
        { type: "tool.execution_complete", timestamp: at, data: { toolCallId: callId, success, result } }
    ];
}
async function events(t, records, { tail = "" } = {}) {
    const directory = join(root, "tests", "portable", `ecap-${randomUUID()}`);
    await fs.mkdir(directory);
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const path = join(directory, "events.jsonl");
    await fs.writeFile(path, records.map(record => JSON.stringify(record)).join("\n") + "\n" + tail);
    return path;
}
const capture = (path, callId, lines, extra = []) => run(["events-capture", "--adapter", "web", "--events", path,
    "--call", callId, "--lines", lines, "--scope-url", scope, "--scope-kind", "container", ...extra]);
const invalid = (result, code, note) => {
    assert.equal(result.code, 1, note);
    assert.deepEqual(result.value, { status: "invalid", diagnostics: [code] }, note);
};

test("EC-01 line ranges of an inline fetch are admitted with URL, tool and time from the record", async t => {
    const at = new Date(Date.now() - 60000).toISOString();
    const path = await events(t, call("call_F", { at }));
    const result = capture(path, "call_F", "3-3,5-5");
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.equal(result.value.status, "ready");
    assert.equal(result.value.adapterId, "web");
    assert.deepEqual(result.value.evidence, [{ sourceId: page, sourceUrl: page,
        body: "FIXTURE line three: Widget is in beta.\n[...]\nFIXTURE line five: costs $5 a month." }]);
    assert.equal(result.value.sources[0].sourceKind, "document");
    assert.equal(result.value.provenance[0].tool, "web_fetch");
    assert.equal(result.value.provenance[0].observedAt, at);
    assert.match(result.value.proofGaps.join("\n"),
        /lines 3-3,5-5 of web_fetch call call_F, selected by the caller; the selection is not an independent review/);
});

test("EC-02 any connector's fetch works; the source URL cannot be supplied by the caller", async t => {
    const learn = "https://learn.example.invalid/docs/page";
    const path = await events(t, call("call_L", { toolName: "microsoft-learn-microsoft_docs_fetch", args: { url: learn },
        result: { content: "# Page\r\nFIXTURE learn body.\r\n", detailedContent: "different display text" } }));
    const result = run(["events-capture", "--adapter", "microsoft-learn", "--events", path, "--call", "call_L",
        "--lines", "2-2", "--scope-url", "https://learn.example.invalid/docs", "--scope-kind", "container"]);
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.deepEqual(result.value.evidence, [{ sourceId: learn, sourceUrl: learn, body: "FIXTURE learn body." }]);
    assert.equal(result.value.provenance[0].tool, "microsoft-learn-microsoft_docs_fetch");
    invalid(capture(path, "call_L", "2-2", ["--source-url", page]), "INVALID_REQUEST", "no --source-url option");
});

test("EC-03 search results and other calls without one https url argument are not body evidence", async t => {
    for (const [note, options] of [
        ["web_search", { toolName: "web_search", args: { query: "widget pricing" } }],
        ["two urls", { args: { url: page, urls: [page] } }],
        ["non-https", { args: { url: "http://vendor.example.invalid/products/widget" } }]]) {
        const path = await events(t, call("call_S", options));
        invalid(capture(path, "call_S", "2-2"), "SOURCE_UNIDENTIFIED", note);
    }
});

test("EC-04 a result the host saved to a file is routed to capture, not admitted from the pointer", async t => {
    const path = await events(t, call("call_F", { result: {
        content: "Output too large to read at once (22.1 KB). Saved to: C:\\Temp\\copilot-tool-output.txt\nConsider using tools like grep." } }));
    invalid(capture(path, "call_F", "1-1"), "RESULT_SAVED_TO_FILE");
});

test("EC-05 the call must be one successful completion with text content, recent, in scope", async t => {
    invalid(capture(await events(t, call("call_F", { success: false })), "call_F", "2-2"), "CAPTURE_UNAVAILABLE", "failed");
    invalid(capture(await events(t, call("call_F")), "call_missing", "2-2"), "CAPTURE_UNAVAILABLE", "missing");
    invalid(capture(await events(t, [...call("call_F"), call("call_F")[1]]), "call_F", "2-2"), "CAPTURE_UNAVAILABLE", "two completions");
    invalid(capture(await events(t, call("call_F", { result: { structuredContent: {} } })), "call_F", "1-1"),
        "CAPTURE_UNAVAILABLE", "no text content");
    invalid(capture(await events(t, call("call_F", { at: new Date(Date.now() - 7 * 3600 * 1000).toISOString() })), "call_F", "2-2"),
        "CAPTURE_STALE");
    const outside = await events(t, call("call_F", { args: { url: "https://other.example.invalid/products/widget" } }));
    const result = capture(outside, "call_F", "2-2");
    assert.equal(result.value.status, "blocked");
    assert.match(result.value.proofGaps.join("\n"), /excluded \(outside selected scope\)/);
});

test("EC-06 line ranges follow capture's rules, WorkIQ keeps its own command, failures never echo text", async t => {
    const path = await events(t, call("call_F"));
    for (const lines of ["3-4,5-5", "5-5,3-3", "0-1", "9-9", "4-4", "3-3,4-4"])
        invalid(capture(path, "call_F", lines), "INVALID_REQUEST", lines);
    const workiq = run(["events-capture", "--adapter", "workiq", "--events", path, "--call", "call_F", "--lines", "2-2",
        "--scope-url", scope, "--scope-kind", "container"]);
    invalid(workiq, "INVALID_REQUEST", "workiq uses workiq-capture");
    const renamed = path.replace(/events\.jsonl$/, "other.jsonl");
    await fs.copyFile(path, renamed);
    invalid(capture(renamed, "call_F", "2-2"), "INVALID_REQUEST", "not events.jsonl");
    const broken = await events(t, call("call_F"), { tail: "not json\n" });
    const result = capture(broken, "call_F", "3-3");
    invalid(result, "CAPTURE_UNAVAILABLE", "malformed complete line");
    assert.doesNotMatch(JSON.stringify(result.value), /FIXTURE/);
    const partial = await events(t, call("call_F"), { tail: '{"type":"tool.execution_start","data":{"toolC' });
    assert.equal(capture(partial, "call_F", "3-3").value.status, "ready", "a partly written last line is ignored");
});

test("EC-07 --index lists line numbers and line starts so the caller can choose ranges of an inline result", async t => {
    const long = "FIXTURE " + "x".repeat(200);
    const path = await events(t, call("call_F", { result: { content: `Contents of ${page}:\n${long}\n\nend` } }));
    const result = run(["events-capture", "--events", path, "--call", "call_F", "--index"]);
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.equal(result.value.status, "ok");
    assert.equal(result.value.tool, "web_fetch");
    assert.equal(result.value.sourceUrl, page);
    assert.deepEqual(result.value.lines.map(line => line.n), [1, 2, 4]);
    assert.ok(result.value.lines[1].start.length <= 81 && result.value.lines[1].start.endsWith("…"));
    invalid(run(["events-capture", "--events", path, "--call", "call_F", "--index", "--lines", "2-2"]), "INVALID_REQUEST",
        "--index takes no admission options");
});
