// Structural regressions for history-check trials A and B (sessions 894b299c, b53beaa0; 2026-11-19).
// They pin governing text only; model compliance needs a live run.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";

const read = (...parts) => fs.readFile(join(root, ".github", "skills", "marketing-iq", "references", ...parts), "utf8");
const transport = await read("packet-transport.md");
const review = await read("independent-review.md");
const connector = await read("connector-workflow.md");
const reviewerBlock = review.split("### Reviewer rules (verbatim)")[1].split("```")[1];

test("HT-01 a writer counts only when it is in the agent's own callable tool list", () => {
    // Corrected after the A/B records showed the packaged agent's allow-list has no writer:
    // host instructions naming apply_patch must not make the model believe it can write.
    assert.match(transport, /Copilot CLI `apply_patch`/);
    assert.match(transport, /Claude Code `Write`/);
    assert.match(transport, /Only a\s+writer in your own callable tool list is exposed/);
    assert.match(transport, /packaged `marketing-iq` agent has no writer/);
    assert.doesNotMatch(transport, /named in the host's instructions or offered as a tool, it is exposed/);
});

test("HT-02 the reviewer checks the action report only when one was requested", () => {
    assert.match(reviewerBlock, /When the user asked for an action report, it lists only tool calls actually\s+made/);
    assert.match(reviewerBlock, /No action report requested is not a violation/);
    assert.doesNotMatch(reviewerBlock, /^- The action report lists only tool calls actually made\./m);
});

test("HT-03 every retrieval after folder resolution is bounded structurally, not only in query text", () => {
    assert.match(connector, /pass that folder in `items_by_url` on every `workiq-retrieve` call/);
    assert.match(connector, /Naming the folder only in the query text is not a boundary/);
});

test("HT-04 current-request means the user named the choice, not that they asked for one (trial A2)", async () => {
    // A2 labelled a recommended audience `current-request` although the request named none.
    const skill = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "SKILL.md"), "utf8");
    const goldfish = review.split("### Goldfish rules (verbatim)")[1].split("```text")[1].split("```")[0];
    const flat = text => text.replace(/\s+/g, " ");
    assert.match(flat(skill), /`current-request` \(the user named this choice in this request; being asked to recommend one is not a basis\)/);
    assert.match(flat(goldfish), /current-request covers only a choice the user named in the request/);
    assert.match(flat(goldfish), /asked to recommend or choose is not a basis for the choice made/);
    assert.match(flat(reviewerBlock), /current-request only for a choice the user named in the current request/);
    assert.doesNotMatch(reviewerBlock, /current-request only for what\s+the current brief states/);
});
