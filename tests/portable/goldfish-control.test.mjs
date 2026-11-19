// Offline checks for the Goldfish negative-control harness. The live run itself needs a model.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";
import { goldfishBlock, buildCases, scoreResponse } from "../live/goldfish-control.mjs";

const shipped = await fs.readFile(join(root, "plugins", "marketing-iq", "skills", "marketing-iq", "references", "independent-review.md"), "utf8");

test("GC-01 the harness uses the shipped Goldfish block verbatim", () => {
    const block = goldfishBlock(shipped);
    assert.match(block, /^You see only the current request/);
    assert.match(block, /judge only whether its basis is visible/);
    for (const testCase of buildCases(shipped)) assert.ok(testCase.prompt.includes(block), testCase.id);
});

test("GC-02 cases carry no history text; only the candidate can carry it over", () => {
    const cases = buildCases(shipped);
    assert.deepEqual(cases.map(item => [item.id, item.expect]),
        [["C1-mislabelled-carry-over", "flags"], ["C2-clean", "pass"], ["C3-history-basis", "flags"], ["C4-asked-not-named", "flags"]]);
    for (const item of cases) {
        const request = item.prompt.split("CURRENT USER REQUEST VERBATIM:")[1].split("ADMITTED EVIDENCE:")[0];
        assert.doesNotMatch(request, /bootcamp|university|facilities/i, item.id);
        assert.doesNotMatch(item.prompt, /last two launches|usual approach|project brief/i, item.id);
    }
    assert.match(cases[0].prompt, /Urban Ops Bootcamp/);
    assert.match(cases[0].prompt, /Basis: current-request/);
    assert.doesNotMatch(cases[1].prompt, /Bootcamp/);
    // The request only asks for a recommendation, so a clean candidate never claims current-request.
    assert.doesNotMatch(cases[1].prompt, /Basis: current-request/);
    assert.match(cases[2].prompt, /Basis: accepted-record/);
    // C4 is the A2 shape: a recommended audience mislabelled current-request, no history involved.
    assert.match(cases[3].prompt, /Basis: current-request; evidence F1, F2/);
    assert.doesNotMatch(cases[3].prompt, /Bootcamp/);
});

test("GC-03 scoring parses the reply strictly and compares with the expectation", () => {
    assert.deepEqual(scoreResponse('{"status":"flags","flags":[{"path":"p","choice":"c","reason":"r"}]}', "flags"),
        { status: "flags", flags: 1, verdict: "as-expected" });
    assert.deepEqual(scoreResponse('noise\n{"status":"pass","flags":[]}\n', "pass"), { status: "pass", flags: 0, verdict: "as-expected" });
    assert.deepEqual(scoreResponse('{"status":"pass","flags":[]}', "flags"), { status: "pass", flags: 0, verdict: "missed" });
    assert.deepEqual(scoreResponse('{"status":"flags","flags":[{}]}', "pass"), { status: "flags", flags: 1, verdict: "false-alarm" });
    assert.deepEqual(scoreResponse("I cannot help", "pass"), { status: "unparseable", flags: null, verdict: "unparseable" });
    assert.deepEqual(scoreResponse('{"status":"pass","flags":[{}]}', "pass"), { status: "inconsistent", flags: 1, verdict: "unparseable" });
});
