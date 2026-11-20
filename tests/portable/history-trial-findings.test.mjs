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
    assert.doesNotMatch(transport, /named in the host's instructions or offered as a tool, it is exposed/);
    // Item 3 (2026-11-20): the packaged agent now has `edit`, confined to session transport files.
    const flat = transport.replace(/\s+/g, " ");
    assert.match(flat, /packaged `marketing-iq` agent has `edit` for this staging only/);
    assert.match(flat, /never to create or change workspace, plugin, skill or source files/);
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

test("HT-05 WorkIQ admission uses the node workiq-capture route, never a model-written events script (A3/A4)", () => {
    const flat = connector.replace(/\s+/g, " ");
    assert.match(flat, /cli\.js workiq-capture --events <absolute path of this session's events\.jsonl> --select/);
    assert.match(flat, /needs no file writer and no script of your own/);
    assert.match(flat, /Never write your own PowerShell, node or other script that reads events\.jsonl/);
});

test("HT-06 every WorkIQ admission instruction names workiq-capture first, so a writer does not invite staging (A6)", async () => {
    // A6: with `edit` available, the agent followed three passages that teach a staged handoff +
    // `evidence --input-file` and never tried workiq-capture. Each passage must now lead with it.
    const flat = text => text.replace(/\s+/g, " ");
    const adapters = flat(await read("adapters.md"));
    assert.match(adapters, /For WorkIQ in Copilot CLI, admit with `workiq-capture` from the session's own events\.jsonl \(`connector-workflow\.md`\)/);
    assert.doesNotMatch(adapters, /cli\.js check node \.github\\skills\\marketing-iq\\scripts\\portable\\cli\.js evidence --adapter workiq/);
    const generalRule = flat(connector).split("When the host saved")[0];
    assert.ok(generalRule.indexOf("workiq-capture") < generalRule.indexOf("evidence --adapter <id>"),
        "connector-workflow states the WorkIQ route before the general evidence route");
    assert.match(flat(transport), /2\. Evidence admission: for WorkIQ in Copilot CLI use `workiq-capture` from the session's events\.jsonl \(`connector-workflow\.md`\); never stage a WorkIQ handoff/);
});

test("HT-07 a host-saved connector result is admitted with capture before any staging route (eval E1/E2)", () => {
    // E1/E2: Microsoft Learn output was saved to a temp file; the agent copied it into a handoff by hand.
    const flat = text => text.replace(/\s+/g, " ");
    const general = flat(connector).split("The WorkIQ-specific routing")[0];
    const captureAt = general.indexOf("cli.js capture --adapter <id>");
    const stagingAt = general.indexOf("`--input-file <absolute-session-handoff.json>`");
    assert.ok(captureAt > 0 && stagingAt > 0 && captureAt < stagingAt, "saved-file capture comes before the staging route");
    assert.match(general, /use `node \.github\\skills\\marketing-iq\\scripts\\portable\\cli\.js capture --adapter <id>/);
    assert.match(general, /Never copy a saved result into a handoff file/);
    assert.match(flat(transport), /If the host saved the result to a file, admit it with `cli\.js capture` \(`connector-workflow\.md`\), never by copying it into a handoff/);
});

test("HT-08 hand-staged bodies mark every skipped span with the capture separator (eval E1/E5)", async () => {
    // E1/E5: staged bodies were verbatim sentence by sentence but joined non-adjacent passages unmarked.
    const flat = text => text.replace(/\s+/g, " ");
    const rule = /Each body is one contiguous passage of the current result; join non-adjacent passages only with a line containing exactly `\[\.\.\.\]`, as capture does/;
    assert.match(flat(connector), rule);
    const web = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "examples", "marketing-iq-web.agent.md"), "utf8");
    assert.match(flat(web), /join non-adjacent passages only with a line containing exactly `\[\.\.\.\]`/);
});

test("HT-09 an inline result is admitted with events-capture before any staging route (eval E1/E5)", async () => {
    // E1/E5: inline fetch bodies were hand-copied; events-capture reads them from the session record instead.
    const flat = text => text.replace(/\s+/g, " ");
    const general = flat(connector).split("The WorkIQ-specific routing")[0];
    const eventsAt = general.indexOf("cli.js events-capture --events");
    const stagingAt = general.indexOf("`--input-file <absolute-session-handoff.json>`");
    assert.ok(eventsAt > 0 && eventsAt < stagingAt, "events-capture comes before the staging route");
    assert.match(general, /Only when no capture route applies \(an inline result on a host without an events\.jsonl record/);
    assert.match(general, /`SOURCE_UNIDENTIFIED`/);
    assert.match(general, /`RESULT_SAVED_TO_FILE`/);
    assert.match(flat(transport), /Any other inline result in Copilot CLI is admitted with `cli\.js events-capture`/);
    const web = flat(await fs.readFile(join(root, ".github", "skills", "marketing-iq", "examples", "marketing-iq-web.agent.md"), "utf8"));
    assert.ok(web.indexOf("events-capture --adapter web") < web.indexOf("evidence --adapter web"), "web profile leads with events-capture");
    assert.match(web, /Never copy page text into a handoff in Copilot CLI/);
});

test("HT-10 every comma-list template is single-quoted, so the host's command check can parse it (eval E6)", async () => {
    // E6: an unquoted `--lines 2-10,46-72` was flagged hasParseErrors by Copilot's PowerShell check and
    // denied unattended, although node would have received it intact. A7 had quoted its --select.
    const web = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "examples", "marketing-iq-web.agent.md"), "utf8");
    const adapters = await read("adapters.md");
    for (const [name, body] of [["connector-workflow", connector], ["web profile", web], ["adapters", adapters]]) {
        assert.doesNotMatch(body, /--lines <|--select\s+<|--select\s*\n<workiq/, `${name} has an unquoted comma-list template`);
    }
    assert.match(connector.replace(/\s+/g, " "), /in PowerShell an unquoted comma builds an array, which the host's command check cannot parse/);
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
