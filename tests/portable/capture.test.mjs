import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { root, run } from "./fixtures.mjs";

// R3 (MarketingIQ_Source_Resolution_Spec.md §11): admit a host-captured connector result by line
// range, so the model never rebuilds source text in a script or a written handoff file.
const url = "https://learn.example.invalid/docs/synthetic-overview";
const lines = ["# Synthetic overview", "FIXTURE: readiness briefings need licensing context.",
    "FIXTURE: admins assign licenses.", "## Unrelated", "FIXTURE: data stays in the tenant boundary.", "end"];

async function capture(t, content = lines.join("\r\n"), age = 0) {
    const directory = join(root, "tests", "portable", `capture-${randomUUID()}`);
    await fs.mkdir(directory);
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const path = join(directory, "copilot-tool-output.txt");
    await fs.writeFile(path, content);
    if (age) { const when = new Date(Date.now() - age); await fs.utimes(path, when, when); }
    return path;
}
const args = (path, overrides = {}) => Object.entries({
    "--adapter": "microsoft-learn", "--capture-file": path, "--lines": "2-3,5-5", "--source-url": url,
    "--scope-url": url, "--scope-kind": "exact", "--tool": "microsoft-learn-microsoft_docs_fetch", ...overrides
}).filter(([, value]) => value !== null).flat();

test("CAPTURE-01 selected line ranges become one admitted body with an explicit gap marker", async t => {
    const path = await capture(t);
    const modified = (await fs.stat(path)).mtime.toISOString();
    const result = run(["capture", ...args(path)]);
    assert.equal(result.code, 0, JSON.stringify(result.value));
    assert.equal(result.value.status, "ready");
    assert.equal(result.value.adapterId, "microsoft-learn");
    assert.deepEqual(result.value.evidence, [{ sourceId: url, sourceUrl: url, body:
        "FIXTURE: readiness briefings need licensing context.\nFIXTURE: admins assign licenses.\n[...]\n" +
        "FIXTURE: data stays in the tenant boundary." }]);
    assert.deepEqual(result.value.sources, [{ sourceId: url, sourceUrl: url, sourceKind: "document",
        evidenceKind: "document-excerpt", coverage: "partial-body", retrievedThisSession: true }]);
    const [provenance] = result.value.provenance;
    assert.equal(provenance.tool, "microsoft-learn-microsoft_docs_fetch");
    assert.equal(provenance.observedAt, modified);
    assert.ok(result.value.proofGaps.some(gap => /line ranges? 2-3,5-5 of a host-captured tool result/.test(gap)));
    assert.ok(result.value.proofGaps.some(gap => /use restrictions or sensitivity are not fully established/.test(gap)));
});

test("CAPTURE-02 malformed, out-of-range, overlapping, adjacent and blank selections reject without disclosure", async t => {
    const path = await capture(t);
    // Positive controls: the command exists and these neighbours are valid selections.
    for (const selection of ["6-6", "1-6", "2-2,4-4"]) {
        assert.equal(run(["capture", ...args(path, { "--lines": selection })]).value.status, "ready", selection);
    }
    for (const selection of ["0-1", "3-2", "2-7", "2-3,3-4", "2-3,4-5", "5-5,2-3", "2", "2-3,", "a-b"]) {
        const result = run(["capture", ...args(path, { "--lines": selection })]);
        assert.equal(result.code, 1, selection);
        assert.deepEqual(result.value, { status: "invalid", diagnostics: ["INVALID_REQUEST"] }, selection);
    }
    const blank = await capture(t, "title\n\n   \nbody");
    assert.equal(run(["capture", ...args(blank, { "--lines": "2-3" })]).code, 1, "whitespace-only selection");
});

test("CAPTURE-03 stale, future, relative, missing and non-UTF-8 captures reject", async t => {
    const stale = await capture(t, undefined, 7 * 3600 * 1000);
    assert.deepEqual(run(["capture", ...args(stale)]).value, { status: "invalid", diagnostics: ["CAPTURE_STALE"] });
    const fresh = await capture(t, undefined, 5 * 3600 * 1000);
    assert.equal(run(["capture", ...args(fresh)]).value.status, "ready", "under six hours is still current");
    const future = await capture(t);
    const later = new Date(Date.now() + 3600 * 1000);
    await fs.utimes(future, later, later);
    assert.deepEqual(run(["capture", ...args(future)]).value, { status: "invalid", diagnostics: ["CAPTURE_STALE"] });
    for (const path of ["copilot-tool-output.txt", join(root, "tests", "portable", `missing-${randomUUID()}.txt`)]) {
        assert.equal(run(["capture", ...args(path)]).code, 1, path);
    }
    const binary = await capture(t, Buffer.from([0x46, 0x0a, 0xc3, 0x28, 0x0a, 0x47]));
    assert.equal(run(["capture", ...args(binary, { "--lines": "1-1" })]).code, 1);
});

test("CAPTURE-04 existing admission rules still decide scope, limits and adapter identity", async t => {
    const path = await capture(t);
    const outside = run(["capture", ...args(path, { "--scope-url": "https://learn.example.invalid/docs/other" })]).value;
    assert.equal(outside.status, "blocked");
    assert.deepEqual(outside.evidence, []);
    assert.ok(outside.proofGaps.some(gap => /outside selected scope/.test(gap)));
    const large = await capture(t, ["title", "x".repeat(20001)].join("\n"));
    const over = run(["capture", ...args(large, { "--lines": "2-2" })]).value;
    assert.equal(over.status, "blocked");
    assert.equal(over.sources[0].coverage, "excluded-over-limit");
    assert.equal(JSON.stringify(over).includes("x".repeat(100)), false, "over-limit body is not echoed");
    for (const adapter of ["workiq", "local-file"]) {
        assert.equal(run(["capture", ...args(path, { "--adapter": adapter })]).code, 1, adapter);
    }
    assert.equal(run(["capture", ...args(path, { "--scope-kind": null })]).code, 1, "required option");
    assert.equal(run(["capture", ...args(path), "--extra", "x"]).code, 1, "unknown option");
});

test("CAPTURE-05 a WorkIQ retrieve capture admits as SharePoint by default; fetch and explicit kinds stay strict", async t => {
    const path = await capture(t);
    const folder = "https://contoso-my.sharepoint.example.invalid/personal/synthetic/Documents/Hackathon";
    const workiq = { "--adapter": "workiq", "--tool": "workiq-retrieve", "--source-url": `${folder}/brief.docx`,
        "--scope-url": folder, "--scope-kind": "container" };
    const admitted = run(["capture", ...args(path, workiq)]).value;
    assert.equal(admitted.status, "ready");
    assert.equal(admitted.sources[0].sourceKind, "sharepoint");
    assert.equal(run(["capture", ...args(path, workiq), "--source-kind", "email"]).value.sources[0].sourceKind, "email");
    assert.equal(run(["capture", ...args(path, workiq), "--source-kind", "document"]).code, 1, "workiq rejects document");
    assert.equal(run(["capture", ...args(path, { ...workiq, "--tool": "workiq-fetch" })]).code, 1, "fetch is not body evidence");
});
