import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { root, run } from "./fixtures.mjs";
import { adapterId, githubContentsHandoff } from "../../.github/skills/marketing-iq/examples/github-contents-adapter.mjs";
import { normalizeEvidence } from "../../.github/skills/marketing-iq/scripts/portable/evidence.js";

const example = join(root, ".github", "skills", "marketing-iq", "examples");
const fixture = JSON.parse(await fs.readFile(join(example, "github-contents.synthetic.json")));
const clone = () => structuredClone(fixture);
const admit = input => normalizeEvidence(githubContentsHandoff(input), adapterId);

test("synthetic Contents API shape preserves native identity, original bytes and unknown restrictions", () => {
    const result = admit(clone());
    assert.equal(result.status, "ready");
    assert.equal(result.sources[0].sourceId, fixture.response.url);
    assert.equal(result.sources[0].sourceUrl, fixture.response.html_url);
    assert.equal(result.provenance[0].versionId, fixture.response.sha);
    assert.equal(result.provenance[0].locator, fixture.response.path);
    assert.equal(result.provenance[0].locationUrl, null);
    assert.equal(result.provenance[0].tool, "SYNTHETIC-ONLY-contents-get");
    assert.equal(result.evidence[0].body, Buffer.from(fixture.response.content, "base64").toString("utf8"));
    assert.match(result.evidence[0].body, /SYNTHETIC ONLY/);
    assert.match(result.proofGaps.join(" "), /not fully established/);
});

test("host-classified failures preserve denied/unavailable/unsupported without raw error bodies or fallback", () => {
    for (const outcome of ["denied", "unavailable", "unsupported"]) {
        const input = clone();
        input.observation.outcome = outcome;
        input.observation.currentResponse = false;
        input.response = null;
        const result = admit(input);
        assert.equal(result.status, "blocked");
        assert.deepEqual(result.sources, []);
        assert.match(result.proofGaps.join(" "), new RegExp(outcome));
        input.response = fixture.response;
        assert.throws(() => githubContentsHandoff(input));
    }
});

test("exact scope cannot expand to another file or container; no location is fabricated", () => {
    const input = clone();
    input.scope.url = input.scope.url.replace("readiness.md", "other.md");
    assert.equal(admit(input).status, "blocked");
    assert.match(admit(input).proofGaps.join(" "), /outside selected scope/);
    input.scope.kind = "container";
    assert.throws(() => githubContentsHandoff(input));
});

test("missing body is metadata only, empty bodies are not invented, limits are unchanged", () => {
    const input = clone();
    Object.assign(input.response, { encoding: "none", content: "", size: 1048577 });
    const result = admit(input);
    assert.equal(result.status, "blocked");
    assert.equal(result.sources[0].coverage, "metadata-only");
    Object.assign(input.response, { encoding: "base64", content: "", size: 0 });
    assert.equal(admit(input).status, "blocked");
    const body = "x".repeat(20001);
    Object.assign(input.response, { content: Buffer.from(body).toString("base64"), size: Buffer.byteLength(body) });
    assert.equal(admit(input).sources[0].coverage, "excluded-over-limit");
});

test("malformed, stale, mismatched, unsupported and non-UTF8 response variants reject", () => {
    for (const change of [
        input => input.observation.currentResponse = false,
        input => input.observation.observedAt = "yesterday",
        input => input.response = [],
        input => input.response.type = "dir",
        input => input.response.submodule_git_url = "https://github.com/synthetic-marketing-iq/another",
        input => input.response.target = "another.md",
        input => delete input.response.html_url,
        input => input.response.sha = "invented",
        input => input.response.path = "other.md",
        input => input.response.url = input.response.url.replace("fictional-harbor", "other"),
        input => input.response.html_url = input.response.html_url.replace("github.com", "other.invalid"),
        input => input.response.url += "?token=synthetic",
        input => input.response.content = "!!!",
        input => input.response.size++,
        input => input.response.encoding = "utf-8",
        input => Object.assign(input.response, { content: "/w==", size: 1 }),
        input => Object.assign(input.response, { content: "AA==", size: 1 })
    ]) {
        const input = clone(); change(input);
        assert.throws(() => githubContentsHandoff(input));
    }
});

test("documented stdin invocation reaches existing admission CLI without custom runtime", () => {
    const mapped = spawnSync(process.execPath, [join(example, "github-contents-adapter.mjs")], {
        cwd: root, input: JSON.stringify(fixture), encoding: "utf8"
    });
    assert.equal(mapped.status, 0, mapped.stderr);
    const result = run(["evidence", "--adapter", adapterId], mapped.stdout);
    assert.equal(result.code, 0);
    assert.equal(result.value.status, "ready");
    for (const input of ['{"scope":1,"scope":2}', "not-json", Buffer.from([0xff]), "x".repeat(262145)]) {
        const failed = spawnSync(process.execPath, [join(example, "github-contents-adapter.mjs")], {
            cwd: root, input, encoding: "utf8"
        });
        assert.equal(failed.status, 1);
        assert.equal(failed.stdout, "");
        assert.deepEqual(JSON.parse(failed.stderr), { code: "INVALID_ADAPTER_INPUT" });
    }
});
