import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { root, run, record, publish, discover, candidate, cliRelative } from "../portable/fixtures.mjs";

test("allowlisted archive runs the synthetic Launch-confirm-discover-Field helper journey after relocation", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-relocated-test-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const { version } = JSON.parse(await fs.readFile(join(root, "package.json")));
    const archive = join(root, "artifacts", `marketing-iq-workspace-${version}.tgz`);
    const hash = createHash("sha256").update(await fs.readFile(archive)).digest("hex");
    assert.match(await fs.readFile(archive + ".sha256", "utf8"), new RegExp("^" + hash + "  "));
    const extraction = spawnSync("tar", ["-xzf", archive, "-C", temporary], { encoding: "utf8", timeout: 20000 });
    if (extraction.error) throw extraction.error;
    assert.equal(extraction.status, 0, extraction.stderr);
    const workspace = join(temporary, "package");
    assert.equal(run(["check"], undefined, workspace).value.dotnetRequired, false);
    assert.equal(run(["context", "--use-case", "launch-decision"], undefined, workspace).value.useCase, "launch-decision");
    const routes = run(["routes", "--use-case", "launch-decision", "--product-key", "harbor", "--topic-key", "readiness", "--evidence-need", "product-truth"], undefined, workspace);
    assert.equal(routes.code, 0); assert.equal(routes.value.routeState, "empty-registry");
    const evidence = run(["local-file", "--file",
        join(".github", "skills", "marketing-iq", "examples", "synthetic-evidence.json")], undefined, workspace).value;
    assert.equal(evidence.status, "ready");
    const checkerPath = join(workspace, ".github", "skills", "marketing-iq", "scripts", "Test-ReviewPacket.mjs");
    const checker = await import(pathToFileURL(checkerPath).href);
    const launch = candidate("launch-decision", evidence);
    const packet = (value, direction = "Synthetic proposal; not accepted.") => ({
        candidate: value, presentationMode: "json-only", readableView: null, evidence: evidence.evidence,
        context: { brief: "Explicit synthetic Harbor helper fixture only.", direction, operationState: "synthetic; semantic review not run; publication not approved" }
    });
    assert.equal(checker.validateReviewPacket(packet(launch)).status, "pass");
    const store = join(workspace, "local-data", "launch-decisions");
    const decision = record();
    assert.equal(run(["decisions", "--store-root", store], { ...publish(decision), acceptance: null }, workspace).value.status, "approval-required");
    assert.equal(await fs.stat(store).then(() => true, () => false), false);
    assert.equal(run(["decisions", "--store-root", store], publish(decision), workspace).value.status, "published");
    const fresh = run(["decisions", "--store-root", store, "--read-only"], discover(), workspace).value;
    assert.equal(fresh.status, "selected");
    assert.equal(fresh.decisions[0].direction, decision.direction);
    const field = candidate("field-activation", evidence, "accepted-record");
    const fieldPacket = packet(field, JSON.stringify(fresh.decisions[0]));
    fieldPacket.presentationMode = "readable-artifact";
    fieldPacket.readableView = field.sections.map(section => section.text).join("\n\n");
    const review = checker.validateReviewPacket(fieldPacket);
    assert.equal(review.status, "pass", JSON.stringify(review));
    const wrongCount = structuredClone(fieldPacket);
    wrongCount.candidate.sections.find(section => section.name === "talk-track").text += "\n4. Extra invalid point.";
    assert.equal(checker.validateReviewPacket(wrongCount).status, "fail");
    const directory = join(workspace, "session-artifacts"); await fs.mkdir(directory);
    const writer = join(workspace, ".github", "skills", "marketing-iq", "scripts", "Save-ResultArtifact.mjs");
    const saved = spawnSync(process.execPath, [writer, "--directory", directory], {
        cwd: workspace, input: JSON.stringify(field), encoding: "utf8", timeout: 20000
    });
    assert.equal(saved.status, 0, saved.stderr + saved.stdout);
    const receipt = JSON.parse(saved.stdout);
    assert.equal(receipt.kind, "diagnostic-result");
    assert.deepEqual(JSON.parse(await fs.readFile(receipt.path, "utf8")), field);
    assert.equal(receipt.sha256, createHash("sha256").update(await fs.readFile(receipt.path)).digest("hex"));
    assert.equal(Object.keys(field).length, 11);
    const files = await fs.readdir(workspace, { recursive: true });
    assert.ok(files.includes(cliRelative));
    assert.ok(files.some(path => path.endsWith("marketing-iq-field-activation" + (process.platform === "win32" ? "\\" : "/") + "SKILL.md")));
    for (const path of files)
        assert.doesNotMatch(path, /node_modules|\.dll$|\.cs$|\.ts$|\.ps1$|deadline\.json|use-cases\.json/i);
    const routeBytes = await fs.readFile(join(workspace, ".github", "skills", "marketing-iq", "references", "sharepoint-source-routes.json"), "utf8");
    assert.deepEqual(JSON.parse(routeBytes).routes, []);
    const envelope = JSON.parse(await fs.readFile(join(workspace, ".github", "skills", "marketing-iq", "examples", "synthetic-evidence.json")));
    const template = await import(pathToFileURL(join(workspace, ".github", "skills", "marketing-iq", "examples", "adapter-template.mjs")).href);
    const custom = template.handoff({
        adapterId: "sample-connector", scope: envelope.scope, outcome: "ok",
        observedSources: envelope.sources.map(source => ({ ...source, sourceKind: "document",
            provenance: { ...source.provenance, tool: "sample-observed-tool" } }))
    });
    const normalized = run(["evidence", "--adapter", "sample-connector"], custom, workspace).value;
    assert.equal(normalized.status, "ready"); assert.equal(normalized.sources[0].sourceKind, "document");
    const documentCandidate = candidate("launch-decision", normalized);
    assert.equal(checker.validateReviewPacket({ ...packet(documentCandidate), evidence: normalized.evidence }).status, "pass");
    const documentSave = spawnSync(process.execPath, [writer, "--directory", directory], {
        cwd: workspace, input: JSON.stringify(documentCandidate), encoding: "utf8", timeout: 20000
    });
    assert.equal(documentSave.status, 0, documentSave.stdout + documentSave.stderr);
    for (const outcome of ["denied", "unavailable", "unsupported"]) {
        const blocked = run(["evidence", "--adapter", "sample-connector"], { ...custom, outcome, sources: [] }, workspace).value;
        assert.equal(blocked.status, "blocked"); assert.deepEqual(blocked.evidence, []);
    }
    assert.equal(run(["evidence", "--adapter", "different-connector"], custom, workspace).code, 1);
});
