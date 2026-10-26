import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, run, candidate, discover } from "./fixtures.mjs";
import { normalizeEvidence } from "../../.github/skills/marketing-iq/scripts/portable/evidence.js";

const scripts = join(root, ".github", "skills", "marketing-iq", "scripts");
const envelope = JSON.parse(await fs.readFile(join(scripts, "..", "examples", "synthetic-evidence.json"), "utf8"));

async function workspace(t) {
    const path = join(root, "tests", "portable", `transport-${randomUUID()}`);
    await fs.mkdir(path);
    t.after(() => fs.rm(path, { recursive: true, force: true }));
    return path;
}

function invoke(script, args) {
    const result = spawnSync(process.execPath, [join(scripts, script), ...args], { cwd: root, encoding: "utf8", timeout: 20000 });
    if (result.error) throw result.error;
    return { code: result.status, value: JSON.parse(result.stdout || result.stderr), output: result.stdout + result.stderr };
}

function packet() {
    const admitted = normalizeEvidence(envelope, "local-file");
    const value = candidate("launch-decision", admitted);
    value.summary = "Synthetic café “準備” $(throw 'not-code'); ` & <script>inert</script>";
    return { candidate: value, presentationMode: "readable-artifact", readableView: value.summary,
        evidence: admitted.evidence, context: { brief: "Synthetic transport regression.", direction: "Proposed only.",
            operationState: "No direction write; diagnostic export after review." } };
}

test("TRANSPORT-01 native-created data file feeds evidence without a source-bearing shell literal", async t => {
    const directory = await workspace(t), input = join(directory, "normalized handoff.json");
    await fs.writeFile(input, JSON.stringify(envelope));
    const result = run(["evidence", "--adapter", "local-file", "--input-file", input]);
    assert.equal(result.code, 0);
    assert.deepEqual(result.value, normalizeEvidence(envelope, "local-file"));
});

test("TRANSPORT-02 exact packet file preflights and exports canonical-only UTF-8 data with read-back", async t => {
    const directory = await workspace(t), input = join(directory, "review packet.json"), value = packet();
    const marker = join(directory, "should-not-exist");
    value.candidate.summary += `; require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'executed')`;
    value.readableView = value.candidate.summary;
    await fs.writeFile(input, JSON.stringify(value));
    assert.deepEqual(invoke("Test-ReviewPacket.mjs", ["--packet-file", input]), {
        code: 0, value: { status: "pass", findings: [] }, output: '{"status":"pass","findings":[]}\n'
    });
    const result = invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--packet-file", input]);
    assert.equal(result.code, 0);
    assert.equal(result.value.kind, "diagnostic-result");
    const saved = JSON.parse(await fs.readFile(result.value.path, "utf8"));
    assert.deepEqual(saved, value.candidate);
    assert.equal(Object.hasOwn(saved, "evidence"), false);
    await assert.rejects(fs.access(marker));
    const second = invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--candidate-file", result.value.path]);
    assert.equal(second.code, 0);
    assert.notEqual(second.value.path, result.value.path);
    assert.deepEqual(JSON.parse(await fs.readFile(second.value.path, "utf8")), saved);
});

test("TRANSPORT-03 invalid pair cannot export by selecting a valid candidate inside it", async t => {
    const directory = await workspace(t), input = join(directory, "invalid-packet.json"), value = packet();
    value.evidence[0].body = "A different synthetic passage.";
    await fs.writeFile(input, JSON.stringify(value));
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", input]).code, 1);
    const result = invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--packet-file", input]);
    assert.equal(result.code, 1);
    assert.equal(result.value.code, "invalid-packet");
    assert.deepEqual(await fs.readdir(directory), ["invalid-packet.json"]);
    const admitted = normalizeEvidence(envelope, "local-file");
    value.candidate = candidate("field-activation", admitted);
    value.readableView = value.candidate.sections.map(section => section.text).join("\n\n");
    value.evidence = admitted.evidence;
    await fs.writeFile(input, JSON.stringify(value));
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", input]).code, 0);
    value.readableView = value.readableView.replace(value.candidate.sections[1].text, "Changed outward-facing invitation.");
    await fs.writeFile(input, JSON.stringify(value));
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", input]).code, 1);
    assert.equal(invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--packet-file", input]).code, 1);
    assert.deepEqual(await fs.readdir(directory), ["invalid-packet.json"]);
});

test("TRANSPORT-04 file input rejects duplicates, malformed UTF-8, oversize and missing paths without disclosure or writes", async t => {
    const directory = await workspace(t), input = join(directory, "bad.json");
    const privateMarker = "SYNTHETIC-PRIVATE-MARKER";
    for (const bytes of [
        Buffer.from(`{"summary":"${privateMarker}","summary":"duplicate"}`),
        Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]),
        Buffer.alloc(262145, 0x20),
        Buffer.from("")
    ]) {
        await fs.writeFile(input, bytes);
        const gate = invoke("Test-ReviewPacket.mjs", ["--packet-file", input]);
        assert.equal(gate.code, 1); assert.equal(gate.output.includes(privateMarker), false);
        const exportResult = invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--candidate-file", input]);
        assert.equal(exportResult.code, 1); assert.equal(exportResult.output.includes(privateMarker), false);
        assert.deepEqual(await fs.readdir(directory), ["bad.json"]);
    }
    await fs.unlink(input);
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", input]).code, 1);
    assert.equal(run(["evidence", "--adapter", "local-file", "--input-file", input]).code, 1);
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", "relative.json"]).code, 1);
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", directory]).code, 1);
});

test("TRANSPORT-05 decisions file input preserves read-only discovery and approval guards", async t => {
    const directory = await workspace(t), input = join(directory, "decision-request.json"), store = join(directory, "store");
    await fs.writeFile(input, JSON.stringify(discover()));
    const args = ["decisions", "--store-root", store, "--read-only"];
    assert.deepEqual(run([...args, "--input-file", input]), run(args, discover()));
    assert.deepEqual(await fs.readdir(directory), ["decision-request.json"]);
    await fs.writeFile(input, JSON.stringify({ schemaVersion: 1, operation: "publish" }));
    const invalid = run([...args, "--input-file", input]);
    assert.equal(invalid.code, 1);
    assert.equal(invalid.value.status, "invalid");
    assert.deepEqual(await fs.readdir(directory), ["decision-request.json"]);
});

test("TRANSPORT-06 linked input is rejected without following it or writing an export", async t => {
    const directory = await workspace(t), input = join(directory, "packet.json"), linked = join(directory, "linked.json");
    await fs.writeFile(input, JSON.stringify(packet()));
    await fs.link(input, linked);
    assert.equal(invoke("Test-ReviewPacket.mjs", ["--packet-file", linked]).code, 1);
    const result = invoke("Save-ResultArtifact.mjs", ["--directory", directory, "--packet-file", linked]);
    assert.equal(result.code, 1);
    assert.deepEqual((await fs.readdir(directory)).sort(), ["linked.json", "packet.json"]);
});
