import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root, run } from "./fixtures.mjs";
import { normalizeEvidence } from "../../.github/skills/marketing-iq/scripts/portable/evidence.js";
import { routes, context } from "../../.github/skills/marketing-iq/scripts/portable/routes.js";

const fixture = JSON.parse(await fs.readFile(join(root, ".github", "skills", "marketing-iq", "examples", "synthetic-evidence.json")));
const clone = () => structuredClone(fixture);

test("explicit local-file example admits bounded original body with synthetic limitation", () => {
    const result = run(["local-file", "--file", join(root, ".github", "skills", "marketing-iq", "examples", "synthetic-evidence.json")]);
    assert.equal(result.code, 0); assert.equal(result.value.status, "ready");
    assert.equal(result.value.evidence[0].body, fixture.sources[0].body);
    assert.match(result.value.proofGaps.join(" "), /Synthetic local-file/);
});

test("custom adapter uses the same core without WorkIQ fields or network SDK", () => {
    const value = clone(); value.adapterId = "my-connector";
    Object.assign(value.sources[0], { sourceKind: "document" });
    value.sources[0].provenance.tool = "already-exposed-document-tool";
    const result = normalizeEvidence(value, "my-connector");
    assert.equal(result.status, "ready");
    assert.equal(result.sources[0].sourceKind, "document");
    assert.throws(() => normalizeEvidence(value, "workiq"));
});

test("WorkIQ handoff accepts only observed channel/provenance, never invents a raw result schema", () => {
    const value = clone(); value.adapterId = "workiq";
    value.sources[0].sourceKind = "sharepoint"; value.sources[0].provenance.tool = "workiq-retrieve";
    assert.equal(normalizeEvidence(value, "workiq").status, "ready");
    value.sources[0].provenance.tool = "generated-answer";
    assert.throws(() => normalizeEvidence(value, "workiq"));
    assert.throws(() => normalizeEvidence({ structuredContent: { results: [] } }, "workiq"));
});

test("denied/unavailable/unsupported outcomes block without fallback or fabricated sources", () => {
    for (const outcome of ["denied", "unavailable", "unsupported"]) {
        const value = { ...clone(), outcome, sources: [] };
        const result = normalizeEvidence(value, "local-file");
        assert.equal(result.status, "blocked");
        assert.deepEqual(result.sources, []); assert.deepEqual(result.evidence, []);
        assert.match(result.proofGaps[0], new RegExp(outcome));
    }
    assert.throws(() => normalizeEvidence({ ...clone(), outcome: "denied" }, "local-file"));
});

test("metadata, generated meeting recaps, stale flags and nonexistent hits are not factual bodies", () => {
    const value = clone(), item = value.sources[0];
    Object.assign(item, { evidenceKind: "meeting-summary", coverage: "metadata-only", body: null });
    assert.equal(normalizeEvidence(value, "local-file").status, "blocked");
    item.coverage = "partial-body"; item.body = "Generated recap.";
    assert.throws(() => normalizeEvidence(value, "local-file"));
    for (const field of ["retrievedThisSession", "currentResponse"]) {
        const current = clone();
        if (field === "currentResponse") current.sources[0].provenance.currentResponse = false;
        else current.sources[0].retrievedThisSession = false;
        assert.throws(() => normalizeEvidence(current, "local-file"));
    }
    const absent = clone();
    Object.assign(absent.sources[0], { coverage: "unavailable", evidenceKind: "none", retrievedThisSession: false, body: null });
    assert.equal(normalizeEvidence(absent, "local-file").status, "blocked");
});

test("whole-segment scope, origin, exact identity and resolved containing location are enforced", () => {
    for (const url of ["https://sample.invalid/harbor-other/note", "https://other.invalid/harbor/note",
        "https://sample.invalid/sites/other/Doc.aspx?sourcedoc=fictional"]) {
        const value = clone(); value.sources[0].sourceUrl = url;
        assert.equal(normalizeEvidence(value, "local-file").status, "blocked");
    }
    const exact = clone(); exact.scope.kind = "exact";
    assert.equal(normalizeEvidence(exact, "local-file").status, "blocked");
    exact.scope.url = exact.sources[0].sourceUrl;
    assert.equal(normalizeEvidence(exact, "local-file").status, "ready");
    const resolved = clone(); resolved.sources[0].sourceUrl = "https://sample.invalid/sites/demo/Doc.aspx?sourcedoc=fixture";
    resolved.sources[0].provenance.locationUrl = "https://sample.invalid/harbor/child";
    assert.equal(normalizeEvidence(resolved, "local-file").status, "ready");
    resolved.sources[0].sourceUrl = "https://other.invalid/Doc.aspx";
    assert.equal(normalizeEvidence(resolved, "local-file").status, "blocked");
});

test("access and use restrictions exclude bodies while unknowns stay visible", () => {
    for (const access of ["denied", "unknown"]) {
        const value = clone(); value.sources[0].restrictions.access = access;
        assert.equal(normalizeEvidence(value, "local-file").status, "blocked");
    }
    const value = clone(); value.sources[0].restrictions.usage = "prohibited";
    assert.equal(normalizeEvidence(value, "local-file").status, "blocked");
    value.sources[0].restrictions.usage = "unknown"; value.sources[0].restrictions.sensitivityLabel = null;
    const admitted = normalizeEvidence(value, "local-file");
    assert.equal(admitted.status, "ready");
    assert.match(admitted.proofGaps.join(" "), /not fully established/);
});

test("source and exact character ceilings exclude rather than silently truncate", () => {
    const value = clone();
    value.sources = Array.from({ length: 4 }, (_, index) => ({
        ...structuredClone(fixture.sources[0]), sourceId: `source-${index}`,
        sourceUrl: `https://sample.invalid/harbor/note-${index}`, body: "x".repeat(20000)
    }));
    const result = normalizeEvidence(value, "local-file");
    assert.equal(result.evidence.length, 3);
    assert.equal(result.evidence.reduce((total, item) => total + item.body.length, 0), 60000);
    assert.equal(result.sources[3].coverage, "excluded-over-limit");
    const oversize = clone(); oversize.sources[0].body = "x".repeat(20001);
    assert.equal(normalizeEvidence(oversize, "local-file").evidence.length, 0);
    assert.equal(normalizeEvidence(oversize, "local-file").sources[0].coverage, "excluded-over-limit");
});

test("closed fields, duplicate identities/URLs, malformed URLs and traversal reject", () => {
    for (const mutate of [
        value => value.token = "not-allowed",
        value => value.outcome = ["ok"],
        value => value.sources[0].sourceKind = ["local-file"],
        value => value.sources[0].evidenceKind = ["document-excerpt"],
        value => value.sources[0].coverage = ["partial-body"],
        value => value.sources[0].restrictions.access = ["allowed"],
        value => value.sources[0].restrictions.usage = ["internal-review"],
        value => value.sources[0].extra = true,
        value => value.sources[0].sourceUrl = "https://sample.invalid/harbor/../other",
        value => value.sources[0].sourceUrl = "https://sample.invalid/harbor/%2e%2e/other",
        value => value.sources[0].sourceUrl = "https://sample.invalid/harbor/%252fother",
        value => value.sources[0].sourceUrl = "https://user:password@sample.invalid/harbor/note",
        value => value.sources[0].sourceUrl = "not-a-url",
        value => value.sources[0].sourceUrl = " https://sample.invalid/harbor/note",
        value => value.sources[0].sourceUrl = "https://sam\nple.invalid/harbor/note",
        value => value.sources.push(structuredClone(value.sources[0])),
        value => value.sources.push({ ...structuredClone(value.sources[0]), sourceId: "another-id" })
    ]) { const value = clone(); mutate(value); assert.throws(() => normalizeEvidence(value, "local-file")); }
});

test("portable context is static; empty route registry does not imply discovery or authority", () => {
    const result = context("launch-decision");
    assert.equal(result.defaultAdapter, "workiq");
    assert.deepEqual(result.retrievalRequests, []);
    assert.equal(result.limits.maxSources, 3);
    assert.throws(() => context("invented"));
    const selected = routes({ schemaVersion: 1, revision: "fixture", routes: [] }, "field-activation", "harbor", "readiness", "product-truth");
    assert.equal(selected.routeState, "empty-registry"); assert.deepEqual(selected.candidates, []);
});

test("maintained routes preserve ranking, scope and review states without becoming evidence", () => {
    const route = {
        id: "route-a", locationKind: "folder", siteUrl: "https://example.sharepoint.com/sites/fixture",
        folderUrl: "https://example.sharepoint.com/sites/fixture/Shared%20Documents/Harbor",
        workflows: ["launch-decision"], productKeys: ["harbor"], topicKeys: ["readiness"], evidenceNeeds: ["product-truth"],
        priority: 2, ordinal: 1, provenance: { kind: "maintainer-fixture", reference: "fixture-only" },
        review: { lastReviewedDate: "2026-10-19", status: "provisional" }
    };
    const registry = { schemaVersion: 1, revision: "fixture", routes: [route, { ...route, id: "route-b", priority: 1 }] };
    const select = input => routes(input, "launch-decision", "harbor", "readiness", "product-truth");
    const result = select(registry);
    assert.equal(result.candidates[0].id, "route-b");
    assert.equal(result.candidates[0].authorityStatus, "not-authority");
    for (const folderUrl of [route.siteUrl + "/../escape", route.siteUrl + "/%252fescape", route.siteUrl + "/bad?query"]) {
        assert.throws(() => select({ ...registry, routes: [{ ...route, folderUrl }] }));
    }
    assert.equal(select({ ...registry, routes: [{ ...route, review: { ...route.review, status: "needs-review" } }] }).routeState, "needs-review-only");
    assert.throws(() => select({ ...registry, routes: [{ ...route, review: { ...route.review, lastReviewedDate: "0000-01-01" } }] }));
    assert.throws(() => select({ ...registry, routes: [{ ...route, provenance: { ...route.provenance, kind: ["maintainer-fixture"] } }] }));
    assert.throws(() => select({ ...registry, routes: [{ ...route, review: { ...route.review, status: ["active"] } }] }));
});
