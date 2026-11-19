// Structural instruction regressions for SharePoint trial 3 (session 9a3b6cbb, 2026-11-11).
// They pin the governing text; whether a model follows it needs a live CLI run.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";

const read = (...parts) => fs.readFile(join(root, ".github", "skills", ...parts), "utf8");
const skills = await Promise.all(["marketing-iq", "marketing-iq-launch-decision", "marketing-iq-field-activation"]
    .map(async name => [name, await read(name, "SKILL.md")]));
const review = await read("marketing-iq", "references", "independent-review.md");
const transport = await read("marketing-iq", "references", "packet-transport.md");

test("TF-01 action reports do not turn invisible host approval prompts into 'not observed'", () => {
    for (const [name, text] of skills) {
        assert.doesNotMatch(text, /write "not observed" otherwise/, name);
        assert.match(text, /cannot observe host approval prompts/, name);
        assert.match(text, /host's session record/, name);
    }
});

test("TF-02 the reviewer gets one fixed rule block verbatim, keeping the preflight qualifier", () => {
    assert.match(review, /Pass the Reviewer rules block below verbatim/);
    const block = review.split("Reviewer rules (verbatim)")[1];
    assert.ok(block, "block heading present");
    assert.match(block, /disclosed not-run mechanical preflight is not itself a violation/);
    assert.match(block, /unavailable only when required input is missing/);
    assert.doesNotMatch(review, /a faithful list of the applicable requirements in their own\s+terms/);
});

test("TF-03 an unavailable review caused by a fixable input gap uses the remaining slot", () => {
    assert.match(review, /fix that input and use the remaining slot/);
});

test("TF-04 session staging for preflight is processing, not saving", () => {
    assert.match(transport, /Staging and removing these files is processing, not saving/);
    assert.match(transport, /leave-unsaved choice does not skip preflight/);
});

// Elephant-Goldfish history check (spike 2026-11-19). Text pins only; behaviour needs a live trial.
const sharedSkill = skills.find(([name]) => name === "marketing-iq")[1];

test("HG-01 the shared schema defines the Basis line and treats history as never current-request", () => {
    assert.match(sharedSkill, /end their `text` with one line `Basis: <token>; <token>`/);
    assert.match(sharedSkill, /history, never `current-request`/);
});

test("HG-02 the Goldfish never sees history and its rules are passed verbatim", () => {
    const block = review.split("### Goldfish rules (verbatim)")[1];
    assert.ok(block, "Goldfish block present");
    assert.match(review, /Never give it the project brief, preferences, discovered\s+records, direction context, earlier turns or tasks, or file paths/);
    assert.match(block, /Do not judge whether a strategy is good; judge only whether its basis is visible/);
});

test("HG-03 history-only choices are escalated to the user, not contested by habit", () => {
    assert.match(review, /"The user usually does this", a brief's\s+old objective or an earlier answer is not a contest/);
    assert.match(review, /ESCALATE when the only basis is history/);
    assert.match(review, /history-check:not-run:no-history/);
});

test("HG-04 every workflow runs the History check when history was loaded, without blocking on unavailable", () => {
    for (const [name, text] of skills) {
        assert.match(text, /run the History check \(Goldfish\) first/, name);
        assert.match(text, /that returns unavailable is disclosed in proofGaps; it does not block/, name);
    }
});
