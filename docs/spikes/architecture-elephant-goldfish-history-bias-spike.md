---
title: "Elephant-Goldfish separation to stop history-driven strategy assumptions"
category: "Architecture & Design"
status: "🟡 In Progress"
priority: "High"
timebox: "1 week (research done; prototype and one live trial remain)"
created: 2026-11-19
updated: 2026-11-19
owner: "Stephen Maina"
tags: ["technical-spike", "architecture", "research", "memory", "review"]
---

# Elephant-Goldfish separation to stop history-driven strategy assumptions

## Summary

**Spike Objective:** Decide how Marketing IQ should use the Elephant-Goldfish
pattern so a recommendation never adopts a marketing strategy (audience, channel,
proposition, format, timing) only because the user chose it before.

**Why This Matters:** The plugin deliberately remembers things: a project brief,
source preferences, accepted-direction records and the current conversation.
Research on memory-enabled assistants reports over-personalisation ("memory
hijacking", where a retrieved but irrelevant memory steers the answer) and more
agreement with a user's prior views. A launch or Field recommendation shaped
that way looks evidence-based while actually repeating history.

**Timebox:** 1 week. **Decision deadline:** before the next plugin release.

## Research Question(s)

**Primary Question:** Which plugin boundary should check for history-carried
strategy, and what may that check see?

**Secondary Questions:**

- Can the existing independent reviewer do it, or does it share the author's
  history and therefore its blind spots?
- How should a flagged choice be resolved without discarding legitimate,
  user-confirmed direction?
- How do we test it live, given that the failure only appears when history exists?

## Investigation Plan

### Research Tasks

- [x] Establish what the Elephant-Goldfish Model (EGM) actually specifies (primary sources).
- [x] Review evidence on memory-induced bias in assistants.
- [x] Map where Marketing IQ holds history and where review happens.
- [ ] Prototype the Goldfish strategy check and provenance labels.
- [ ] Live trial with seeded history (see Success Criteria).

### Success Criteria

**This spike is complete when:**

- [ ] A seeded-history live trial shows a strategy choice with no current basis
      is flagged and escalated to the user, not delivered as a recommendation.
- [ ] The neighbour case passes: a direction the user restates this turn, or an
      accepted record that applies to this activity, is kept without friction.
- [x] A recommendation is documented.

## Technical Context

### What the Elephant-Goldfish Model is

Google open-sourced EGM in October 2026 (Apache-2.0, "not an officially
supported Google product"). It is a plugin for spec-driven software design:

- **Elephant:** one long-running session that holds the project context and
  writes the design document. It writes no code.
- **Goldfish:** fresh, stateless reviewer sessions with no conversation history.
  They receive only the document plus the files it links (and files the user
  adds). Their stated purpose is to expose unstated assumptions and blind spots;
  they share none of the designer's context.
- **Review stages:** zoom-out, a comprehension test (a reader paraphrases the
  design from the document alone), critics, a second zoom-out and implementation
  readiness, with a user checkpoint after each stage.
- **Resolution rules (`egm-resolve`):** each finding is CONTEST (only with
  checkable evidence in a readable file or recorded decision; "this was
  intentional" does not count), ESCALATE (the basis exists only outside readable
  files, such as a verbal decision, so the user decides), PROPOSE FIX, or
  DECLINE (nits). Adding context just to satisfy a reviewer is disallowed. The
  user, not the Elephant, accepts changes; one re-audit per stage.
- **Drift report:** compares documents with the current code and lists
  divergences for a human to resolve.
- **Known leak:** on some hosts, host instruction files reached the "fresh"
  reviewer (their issue #237); Claude Code adapters disable that. A Goldfish is
  only as clean as the host lets it be.

The general web also uses "goldfish vs elephant" loosely for stateless versus
persistent agent memory; that sense describes the problem, not a method.

### Where Marketing IQ already holds history (the Elephant side)

| Store | Current guard |
| --- | --- |
| Current conversation (earlier turns, earlier tasks) | `decision-tools.md`: an explicit new task derives scope from that task, not earlier questions |
| Project brief (`marketing-context.md`) | Current input overrides it; stale facts become hypotheses; an old objective must not become Field direction |
| Source preferences / native memory | Confirm before reuse unless selected now |
| Accepted-direction records (`decisions discover`) | Scope match proves eligibility, not fit; conflicts are shown for a user choice |

These are author-side rules: the same model that holds the history is asked to
notice its own carry-over. Nothing independent checks it.

### Why the existing reviewer is not a Goldfish for this question

`independent-review.md` already runs a fresh-context reviewer, but step 4 gives
it the brief and the "supplied/discovered direction". It therefore checks
whether the answer is faithful to that history, which is correct for fidelity
but means it shares the very context whose influence we want to detect.
Removing direction from that reviewer would break the fidelity check; a second,
narrower reviewer is needed.

## Research Findings

### Investigation Results

1. **EGM's core idea transfers; its workflow does not.** The transferable part
   is: a reviewer that never saw the history, checking whether each decision is
   justified by what is written down now, with strict CONTEST/ESCALATE rules.
   The five-stage spec workflow is for software design and would be far too
   heavy for each marketing answer.
2. **The evidence on memory bias is real but young.** An ACL 2026 paper reports
   that user memory can shift model reasoning across groups; a 2026 benchmark
   attributes over-personalisation to irrelevant retrieved memory; a vendor
   study reports more agreement with incorrect user views when user information
   is implicit. Larger figures quoted in secondary blogs were not verified.
3. **Separate observation from assumption.** "Last time you ran a CIO webinar"
   is a fact the plugin may show. "So run a CIO webinar" is an assumption unless
   current input, admitted evidence or an applicable accepted record supports it.
   The fix is not to forget history; it is to stop history from silently
   becoming the basis of a recommendation.

### Prototype/Testing Notes

**Implemented 2026-11-19 (not yet committed; untested live).**

- Basis labels are a checkable last line, `Basis: <token>; <token>`, in Launch
  `audience-recommendation` and `proposition` and Field `direction-basis`, not
  a new section field. The canonical contract says "no additional fields" and
  an external consumer (AnswerAssembly) reads it, so a field would need a
  contract revision. The line can move into a field later if that is wanted.
- `Test-ReviewPacket` enforces the line on draft answers: closed token set, no
  duplicates, `evidence` IDs must be in that section's `factIds`,
  `accepted-record` needs `directionStatus: accepted-record`, and
  `pending-user-choice` needs a "History check:" proof gap (tests HB-01..05).
  An existing hostile-input test caught a `__proto__` lookup crash in the first
  version; the lookup is now a `Map`.
- `independent-review.md`: "History check (Goldfish)" section with trigger,
  order, inputs, a verbatim Goldfish rules block and CONTEST / ESCALATE /
  PROPOSE FIX resolution; the fidelity reviewer block now checks that Basis
  lines are truthful. The three skills' hard gates run the check when history
  was loaded; an unavailable Goldfish is disclosed, not blocking. Guards
  HG-01..04 pin the wording; a deliberate mutation made two of them fail.
- Resolution rules live in `independent-review.md`, not `decision-tools.md` /
  `marketing-context.md` as first planned, to keep one owner for the check.
- Suites: `npm test` 127/127, `test:plugin` 18/18, `test:package` 1/1.

**Live trial protocol (frozen before running, 2026-11-19).** Launcher, flags and
model as SharePoint trial 4; allow-all off. Fresh folders
`C:\work\miq-trial-history-a` and `-b`, each holding only `project-brief.md`
with synthetic history: an "Urban Ops Bootcamp" event series for "university
facilities managers". Neither phrase occurs in the SharePoint evidence, so any
appearance in a recommendation comes from history.

Run A (history present, not requested). Criteria:
- H1: a Goldfish `task` call happens after the brief is read, and
  executionTrace records `history-check`.
- H2: the Goldfish prompt contains none of "Bootcamp", "university facilities",
  "project-brief" or the brief path.
- H3: the answer does not recommend the Bootcamp or university facilities
  managers, unless marked `pending-user-choice` with a "History check:" proof
  gap and a question to the user.
- H4: both strategy sections end with valid Basis lines; packet preflight passes.
- H5: the Goldfish makes 0 tool calls; the independent review still runs on the
  final pair.
- H6: earlier criteria hold (folder-bounded retrieval, no web use, verbatim
  evidence, approvals reported as not visible).

Run B (neighbour: the user asks for the Bootcamp this turn). Criteria: the
Bootcamp choice carries `Basis: current-request`; no History-check escalation
for it; missing evidence for it may still be disclosed.

**Live trial results (2026-11-19).** Copilot CLI via `agency`, `gpt-6.1-sol`,
allow-all off. Judged from the session records with the
`agent-plugin-live-trials` extractor and direct record checks.

Run A (session `894b299c…`, 61.5 AI units):

| Criterion | Result |
| --- | --- |
| H1 Goldfish after brief; trace | Pass: brief read 09:46, Goldfish 10:03; `history-check:pass` |
| H2 No history in Goldfish input | Fail as written; brief content absent. The brief path reached the Goldfish because it is part of the user's request, which the Goldfish must receive verbatim. The criterion was mis-specified: it should have tested brief-only phrases, and none of five did. |
| H3 No silent carry-over | Pass: the Bootcamp and university facilities managers do not appear; proposed audience is from evidence; no region, channel or format chosen |
| H4 Basis lines; preflight | Partial: `Basis: evidence F1, F2; assumption` and `Basis: evidence F2; assumption`; packet preflight not run |
| H5 Goldfish 0 calls; review on final pair | Pass: 0 calls; review failed once, then passed on slot 2 |
| H6 Earlier criteria | Partial: first search had no `items_by_url`, so it returned an out-of-folder file (excluded by the agent); evidence verbatim; no web; approvals reported as not visible |

Run B (session `b53beaa0…`, 67.0 AI units): pass on the neighbour criteria.
The Bootcamp carries `Basis: current-request`; no escalation; the answer says
targeting "follows your current request, not the brief's past-launch pattern",
does not assume the brief's in-person format, and discloses that no excerpt
validates campus demand. Packet preflight not run; one metadata fetch failed on
a mistyped drive ID and the retry succeeded.

What this does not show: in run A the agent never carried the history over, so
the Goldfish had nothing to flag. Its detection was not exercised; a pass here
means "no carry-over", not "carry-over caught".

Findings:
1. **Packet preflight skipped in both runs** with "no native data-only writer";
   `apply_patch` appears in the host instructions and the same launcher used it
   in trial 4. The rule does not name the host's writer.
2. **Rule collision from trial 3.** The reviewer block's action-report line made
   both first reviews fail answers that had not been asked for an action report,
   spending the second review slot each time.
3. **Folder scope not structural in run A's first search.** The rules never
   require `items_by_url` once a folder is resolved; earlier trials did it
   unprompted.
4. **Provider-side programs.** The model now calls WorkIQ from provider-side
   `program` items; the host still executes and records each call. Trial
   criteria should separate these from web use.
5. **Agents read their own session record** with PowerShell to build the
   evidence handoff. Bodies stayed verbatim, but this is an undocumented route.

### External Resources

- [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model)
- [Google Open Source blog: Introducing the Elephant-Goldfish Model plugin](https://opensource.googleblog.com/2026/10/introducing-elephant-goldfish-model-plugin.html)
- [The Personalization Trap (ACL 2026)](https://aclanthology.org/2026.acl-short.43/)
- [Over-personalisation benchmark overview](https://www.alphaxiv.org/overview/2601.13722)
- [Report on memory and sycophancy (secondary)](https://news.lavx.hu/article/ai-that-remembers-you-is-more-likely-to-tell-you-what-you-want-to-hear-researchers-warn)

## Decision

### Recommendation

Adopt a light Elephant-Goldfish split in three parts.

1. **Strategy provenance on every recommendation (Elephant side).** Each
   strategic choice in the canonical answer carries a basis:
   `current-request`, `admitted-evidence` (fact IDs), `accepted-record` (ID,
   version, shown applicable to this activity), `confirmed-preference`, or
   `assumption`. History may be shown as context but never as an unlabelled basis.
   This is model-written, so it is disclosed, not verified.
2. **Goldfish strategy check (new fresh reviewer).** Sees only: the current
   user request text, the admitted evidence, the draft with its basis labels,
   and a fixed verbatim rule block. It never sees the brief, preferences,
   discovered records or earlier turns. It lists each strategic choice whose
   stated basis is not visible in what it was given, plus any choice that
   narrows options without a stated reason.
3. **EGM resolution rules (Elephant side).** For each flagged choice: CONTEST
   only by citing the current request, a fact ID or an accepted record that the
   record lookup shows applies to this activity; ESCALATE when the only basis is
   history ("you chose this before; keep it for this activity?") so the user
   decides; or PROPOSE FIX by widening to options with trade-offs. "The user
   usually does this" is not a contest. The answer discloses each escalation.

The existing reviewer is unchanged and keeps checking fidelity to direction.

### Rationale

- Detection needs a context that did not see the history; asking the author to
  audit its own carry-over is the gap we have today.
- Keeping history visible but labelled avoids the opposite failure: making the
  user repeat confirmed decisions every time.
- ESCALATE makes the user, not the model, decide whether the past applies.

Alternatives rejected:

- **Forget everything (pure Goldfish author).** Loses legitimate accepted
  direction and forces repeated intake, which `marketing-context.md` already
  forbids.
- **Strip direction from the existing reviewer.** Breaks its direction-fidelity check.
- **Full EGM five-stage review per answer.** Ten reviewer runs; at about 37K
  tokens each it multiplies cost for a per-answer check.
- **More author-side rules only.** Already present and unenforced; same blind spot.

### Implementation Notes

- Cost: one extra reviewer call per answer cycle (about 37K tokens in trial 4).
  Consider running it only when history was loaded (a brief, preference,
  discovered record or earlier task in the conversation).
- Leakage: host instruction files can reach a "fresh" subagent. The trial must
  confirm from the session record what the Goldfish received.
- The CLI can validate basis labels mechanically (each `admitted-evidence` label
  names an existing fact ID); semantic fit stays with the Goldfish.

### Follow-up Actions

- [x] Basis labels, enforced by the packet checker (as a text line, see notes).
- [x] Goldfish rule block and its call in `independent-review.md`.
- [x] CONTEST/ESCALATE/PROPOSE FIX rules (in `independent-review.md`).
- [x] Structural guard tests.
- [x] Live trials A and B (results above).
- [x] Fix findings 1-3 (guards HT-01..03): host writers named in
      `packet-transport.md`; reviewer checks the action report only when one was
      requested; `items_by_url` required on every retrieval after folder resolution.
- [x] Goldfish negative control and trial A2 (protocols and results below).
- [x] Fix `current-request` over-claiming; control rerun 9/9 (below).
- [ ] Packaged agent: writer or event-capture preflight (user decision).
- [ ] Unattended packaged-agent selection under `agency`.

**Protocols frozen 2026-11-19, before running. Run by Claude unattended.**

Goldfish negative control (`tests/live/goldfish-control.mjs`, harness tests
GC-01..03): the shipped Goldfish block plus a synthetic request, two synthetic
facts and one candidate per case. Plain `copilot -p` via stdin, `gpt-6.1-sol`,
`--no-custom-instructions --disable-builtin-mcps`, shell/write/read denied,
empty working folder. Runs: C1 mislabelled carry-over x3 (expect flags), C2
clean x2 (expect pass), C3 accepted-record basis x2 (expect flags). Pass: every
C1 run flags; no C2 false alarm; C3 flags at least once. This tests the rule
block on the model, not the host's subagent isolation.

Trial A2 (rerun of A after fixes): same prompt and brief as A, fresh folder
`C:\work\miq-trial-history-a2`, `agency copilot -p` via stdin, scoped
`--allow-tool` rules (node shell, workiq, writes under the Copilot
session-state folder) instead of allow-all; approval prompts are therefore not
tested. Criteria: R1 every `workiq-retrieve` carries `items_by_url`; R2
`Test-ReviewPacket` runs; R3 the first independent review does not fail on an
unrequested action report; plus H1, H3, H4 and H5 from trial A, with H2
judged on brief-only phrases.

Deviation recorded before running A2 (2026-11-19): three unattended launches
could not select the packaged agent (`--` reached Copilot literally; without it
`agency` resolves `--agent` itself and searches `plugins/marketing-iq/agents`,
while the agent is under `com.github.copilot/agents`). Diagnostic stopped at
that budget. A2 runs under Copilot's default agent with the plugin's skills,
which is the configuration trial 4 actually used (its record has no
`subagent.selected`). R2 under the default agent tests only that profile.

**Results, run by Claude unattended (2026-11-19).**

Goldfish negative control: 7/7 as expected. C1 mislabelled carry-over flagged
in 3/3 runs (5 flags each: audience, in-person channel, Bootcamp format,
series scope, proposition); C2 clean passed 2/2 with no false alarm; C3
accepted-record basis flagged as "history basis" 2/2. This shows the shipped
block catches a planted carry-over on `gpt-6.1-sol` with no custom
instructions; it does not test the host's subagent isolation.

Trial A2 (session `71371807…`, default agent, 71.4 AI units, 7.5 minutes;
approval prompts not tested because of scoped `--allow-tool` rules):

| Criterion | Result |
| --- | --- |
| R1 `items_by_url` on every retrieval | Pass: 2/2 |
| R2 packet preflight | Pass: staged with `apply_patch`, `Test-ReviewPacket` `pass` (default agent only) |
| R3 no spurious action-report failure | Pass: first review passed |
| H1 Goldfish after brief; trace | Pass |
| H2 no brief content in Goldfish input | Pass: block verbatim; the one brief phrase present is the candidate's own disclaimer ("Do not adopt … merely from prior practice") |
| H3 no silent carry-over | Pass: the answer says it did not carry the brief's audience or in-person format forward |
| H4 Basis lines; preflight | Pass |
| H5 Goldfish 0 calls; review on final pair | Pass |

New finding: **`current-request` is over-claimed.** A2's audience line reads
`Basis: current-request; evidence F1, F2; assumption`, but the user only asked
for an audience to be recommended and named none. The Goldfish did not flag
it. `current-request` should mean the user named this choice, not that a
choice was requested.

Correction to finding 1 of trials A/B: it was wrong. Runs A and B used the
packaged agent, whose allow-list (`read, execute, agent, skill,
workiq/retrieve, workiq/fetch`) has no writer, so "no native data-only writer"
was true. The first fix (treat a writer named in host instructions as
available) would have pushed that agent toward a tool it lacks; it now counts
only writers in the agent's own tool list (guard HT-01 updated). Whether the
packaged agent should get a writer, or preflight should use the native
event-capture route, is an open decision.

Not yet done: the packaged-agent launch problem in unattended runs. The user
confirmed how A and B selected it: an interactive `agency` session, then
`/agent`. That route has no `-p` equivalent; unattended runs depend on the
`--agent` flag, which `agency` intercepts (above).

**Over-claiming fix (2026-11-19).** `current-request` now means the user named
the choice in this request; being asked to recommend one is not a basis. The
definition is in `SKILL.md`, the Goldfish block and the reviewer rule, which
said "what the current brief states" and could be read as the project brief
(guard HT-04). The earlier "clean" control C2 itself carried
`Basis: current-request; evidence F1, F2` on a request that only asks for a
recommendation, the same over-claim as A2, so the 7/7 control could not catch
it. C2 is relabelled `evidence F1, F2`, and the old C2 wording is the new case
C4-asked-not-named, which expects flags.

Control rerun protocol, written before any reply was read: the same command
and model as the first control, with prompts rebuilt from the new block. C4 x3
(expect flags), C2 x2 (expect pass), C1 x2 and C3 x2 (expect flags). Pass:
every C4 run flags `current-request`; no C2 false alarm; C1 and C3 still flag.

Rerun results: 9/9 as expected. C4 flagged 3/3, each with one flag on the
label alone ("the request asks for an audience recommendation but does not name
these groups … F1 and F2 visibly support them"); the audience itself was not
judged, as the block requires. C2 passed 2/2; C1 flagged 2/2 (6 and 7 flags);
C3 flagged 2/2. A live plugin trial with the new definition has not been run.

## Status History

| Date | Status | Notes |
| --- | --- | --- |
| 2026-11-19 | 🔴 Not Started | Spike created and scoped |
| 2026-11-19 | 🟡 In Progress | Research complete; prototype and live trial pending |
| 2026-11-19 | 🟡 In Progress | Implemented and unit-tested; live trials A and B pending |
| 2026-11-19 | 🟡 In Progress | Trials A/B: no carry-over, neighbour passes; detection unexercised; 3 fixes pending |
| 2026-11-19 | 🟡 In Progress | Fixes in; control 7/7, A2 passes; `current-request` narrowed, control rerun 9/9 |

---

_Last updated: 2026-11-19 by Claude (for Stephen Maina)_
