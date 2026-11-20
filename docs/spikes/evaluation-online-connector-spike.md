---
title: "Evaluation: Marketing IQ with a non-WorkIQ online connector"
category: "Evaluation"
status: "🟢 Complete"
priority: "High"
timebox: "1 day"
created: 2026-11-20
updated: 2026-11-20
owner: "Stephen Maina"
tags: ["technical-spike", "evaluation", "connectors", "research"]
---

# Evaluation: Marketing IQ with a non-WorkIQ online connector

## Summary

**Objective:** check that the plugin can use an available connector other than
WorkIQ, including online sources, and score its Launch answer against facts
published by the product owner.

**Why:** every live trial so far used WorkIQ over one SharePoint folder. The
plugin claims to be provider-neutral (`adapters.md`, `connector-workflow.md`).

## Design

### Why no off-the-shelf benchmark

A search found marketing datasets for ad copy (arXiv 2506.17863), native ads
(NaiAD, arXiv 2605.09918), textbook knowledge (MSI 25-127) and product
descriptions (Amazon Science), but none with ground truth for launch
readiness or positioning, which is what the plugin produces. So ground truth is
taken from the product owner's own public documentation.

### Test subject and ground truth

Microsoft Learn: "Manage agents across multiple tenants in the Microsoft 365
admin center" (`learn.microsoft.com/en-us/microsoft-agent-365/admin/agent-multi-tenant`,
updated 2026-11-09). Fixed before any run, quoted verbatim:

| ID | Fact | Page text |
| --- | --- | --- |
| GT1 | Stage | "Multi-tenant agent management is in public preview." No GA date or timeline is stated. |
| GT2 | Audience | "Microsoft partners that manage customer tenants by using Partner Center." "Enterprises that manage multiple tenants and connect by using Microsoft Entra Tenant Governance." |
| GT3 | Prerequisites | Active relationship with a governed tenant; "Partners establish GDAP relationships in Partner Center."; a supported delegated role in each governed tenant |
| GT4 | Licensing | "Viewing and managing agents across connected tenants requires no additional licenses." Risk/activity views need a Microsoft Agent 365 license. |
| GT5 | Value | "reduce repetitive administration, maintain a consistent rollout posture" |

### Connectors available (probe 2026-11-20, `agency copilot`, default agent)

Besides WorkIQ: built-in `web_search` and `web_fetch`, Microsoft Learn MCP
(`microsoft_docs_search`, `microsoft_docs_fetch`), GitHub MCP. The packaged
`marketing-iq` agent requests only WorkIQ tools, so other connectors are meant
to come through a client profile (`client-profiles.md`). Creating a profile
would change the user's agent configuration, so E1/E2 run the plugin's skills
under Copilot's default agent instead (as trials 2-4 and A2 did).

## Protocol, frozen 2026-11-20 before running (Claude, unattended)

Common: `agency copilot --plugin-dir plugins/marketing-iq`, `gpt-6.1-sol`, fresh
empty folder each, `-p` via stdin, `--allow-tool shell(node)` and
`write(<home>\.copilot\session-state\**)` plus the connector named below.
WorkIQ is **not** allowed, so any WorkIQ attempt shows as a denial. One launch
per trial.

- **E1, Microsoft Learn connector.** Allow `microsoft-learn`. Prompt: "Use
  Microsoft Learn as my only source, not WorkIQ or my files. You may search
  Microsoft Learn for this topic. Assess launch readiness of multi-tenant agent
  management in the Microsoft 365 admin center and recommend an audience and a
  proposition. Leave the result unsaved."
- **E2, generic web.** Allow `web_search` and `web_fetch`. Same prompt with
  "public web pages" in place of "Microsoft Learn".
- **E3, packaged agent, negative.** `--agent marketing-iq:marketing-iq`, E1's
  prompt, connector allowed. Expected: the agent cannot see Microsoft Learn, so
  it blocks with the capability gap, retrieves nothing and makes no facts.

Scoring (E1/E2):
- S1 retrieval only through the named connector; zero WorkIQ calls or denials.
- S2 evidence admitted through the CLI (`ready`), adapter named for that connector.
- S3 faithfulness: every candidate fact quote appears verbatim in a retrieval
  result in the record (checked mechanically).
- G1 stage: says preview and not GA; no launch-ready claim, no GA date.
- G2 audience consistent with GT2 and cited.
- G3 at least one of GT3/GT4 stated correctly; nothing contradicts them (for
  example "requires an additional license to manage").
- G4 no fabricated dates, prices, metrics or customers.
- P1 `Test-ReviewPacket` runs and passes; independent review runs.
- N1 no `current-request` basis on the audience or proposition (none named).

E3: blocked; names the missing connector; no WorkIQ call; facts and sources empty.

## Results (2026-11-20, all three unattended, no permission prompts)

| | E1 Learn (`993a11a7…`) | E2 "public web" (`70d5279a…`) | E3 packaged agent (`7062f77e…`) |
| --- | --- | --- | --- |
| Time / AI units | 5.7 min / 70 | 3.4 min / 51 | 1.7 min / 32 |
| S1 connector | **Pass**: Microsoft Learn search + fetch only; 0 WorkIQ | **Partial**: Microsoft Learn MCP, not `web_search`/`web_fetch`; public source, 0 WorkIQ | n/a |
| S2 admission | **Pass**: `evidence --adapter microsoft-learn` → `ready` | **Pass**: same | n/a |
| S3 quotes verbatim | **Pass**: 8/8 | **Pass**: 6/6 | n/a |
| G1 stage | **Pass**: "public preview", "not a GA announcement" | **Pass**: "not a general-availability launch" | n/a |
| G2 audience | **Pass**: partners via GDAP, enterprise Tenant Governance as alternative | **Pass**: same split | n/a |
| G3 prerequisites/licensing | **Pass**: no extra licence to manage; Agent 365 for risk/activity; roles | **Pass**: same, plus "do not frame the whole solution as free" | n/a |
| G4 no fabrication | **Pass**: no prices, metrics or GA date; the only year is the run date | **Pass** | n/a |
| P1 preflight / review | **Pass**: two preflights `pass`; review 1 failed on a real trace inconsistency (`preflight:pending` after it had run), fixed; review 2 `pass` | **Pass**: preflight `pass`, review `pass` | Preflight and review `pass` on the blocked answer |
| N1 Basis | **Pass**: `evidence …; assumption` | **Pass** | n/a |
| E3 expectation | | | **Pass**: "Microsoft Learn search and retrieval aren't exposed in this context"; no WorkIQ, files or web substitute; no facts; readiness "unassessed, not failed" |

**Verdict.** The plugin's skills work end to end with a non-WorkIQ online
connector. Both runs reached the official page through Microsoft Learn,
admitted it through the provider-neutral adapter path, quoted it faithfully
(14/14) and matched every ground-truth fact: preview not GA, the documented
partner/enterprise audience, the prerequisites and the licensing split, with
no invented specifics. The packaged agent refused correctly when the connector
was outside its allow-list.

### Findings

1. **Hand-staged evidence for large outputs.** In E1 and E2 the Learn result
   was too large to return inline and was saved to a temp file. The agent read
   it and wrote the handoff with `apply_patch` instead of using
   `cli.js capture --capture-file … --lines …`, which `connector-workflow.md`
   prefers for exactly this case. Faithful both times, but it is the
   model-copies-source pattern that `workiq-capture` removed for WorkIQ.
2. **Generic web tools untested.** Asked for "public web pages", the agent chose
   the Microsoft Learn connector (a compatible exposed source for this topic)
   and never called `web_search`/`web_fetch`. Search over the open web needs a
   topic Learn does not cover.
3. **The default agent is not isolated.** E1 and E2 read the user's own skill
   `~/.agents/skills/microsoft-docs/PORTABILITY.md`. The designed route for
   other connectors is a client profile agent, which was not exercised here
   because it would add a file to the user's agent configuration.
4. **Tool permissions are not a connector boundary.** E2 allowed only `url`,
   yet Microsoft Learn MCP calls ran without a prompt. The plugin's own
   source-selection rules, not `--allow-tool`, kept WorkIQ out of every run.
5. **Judging-script errors (mine).** Two had to be corrected during scoring: an
   admission command missed because of a quote after `cli.js`, and quote
   faithfulness first measured against only part of the connector result
   (7/8, then 5/6, before the full result gave 8/8 and 6/6). Scores above use
   the corrected measurements.

### Follow-ups

- [ ] A `capture`-first rule (or connector-specific capture) for large non-WorkIQ outputs, test-first.
- [ ] An open-web trial on a topic outside Microsoft Learn.
- [ ] A client-profile trial with an explicit Microsoft Learn profile, if the user agrees to add the profile.

## Round 2: fixes and retest

**Fixes (2026-11-20).**
1. Saved connector output: `connector-workflow.md` now states the saved-file
   `capture` route before the staging route and forbids copying a saved result
   into a handoff; packet-transport step 2 says the same (guard HT-07).
2. Web client profile: `examples/marketing-iq-web.agent.md` requests `web` (no
   WorkIQ), treats search results as discovery only, admits bodies from fetched
   pages within one official site path (capture when saved), and loads only the
   Marketing IQ skills (guards WP-01..03).
3. Finding 4 (`--allow-tool` is not a connector boundary) is a property of the
   test harness, not a plugin defect; recorded, not changed.

**Non-Microsoft ground truth.** HubSpot AEO, official product page
`hubspot.com/products/aeo` (the press release returned 403 and is not used):

| ID | Fact | Page text |
| --- | --- | --- |
| H1 | Stage | "BETA" badge; nav "AEO (Beta)"; no "generally available" wording |
| H2 | Audience | "built so any marketer can get started … without needing technical knowledge or AEO expertise"; "Get more from AEO with Marketing Hub Pro and Enterprise." |
| H3 | Price | "$50/month"; "$45/month if you pay annually"; "with no additional HubSpot subscription required"; "Includes 25 prompts" |
| H4 | Engines | "tracks your brand across ChatGPT, Gemini, and Perplexity" |
| H5 | Vendor claim | "We grew leads from AI by 1,850%." (no period or method). Third-party reports of 850 beta customers / 20% more traffic are not on the official page |

**Protocol, frozen 2026-11-20 before running (Claude, unattended, one launch each).**
- **E4** = E1 repeated (Microsoft Learn, default agent) after fix 1. Primary:
  a saved Learn result is admitted with `cli.js capture`, not a hand-staged
  handoff. All E1 criteria re-checked.
- **E5**, public web through the web profile: fresh git-initialised folder
  `C:\work\miq-eval-e5` with the built example copied to
  `.github\agents\marketing-iq-web.agent.md`; `agency copilot --agent
  marketing-iq-web --plugin-dir <plugin>`; `--allow-tool` `shell(node)`, `url`,
  `write(<home>\.copilot\session-state\**)`. Prompt: "Use public web pages as
  my only source, not WorkIQ or my files. You may search the public web for this
  topic. Assess launch readiness of HubSpot AEO and recommend an audience and a
  proposition. Leave the result unsaved."
  - P1 the web profile is selected (`subagent.selected`), tools as declared.
  - S1 retrieval through `web_search`/`web_fetch` only; 0 WorkIQ; no reads of
    personal skills (`~/.agents/skills`).
  - S2 admission through the CLI with adapter `web` (`capture` when saved).
  - S3 every fact quote verbatim in fetched page text (by construction when
    `capture` was used; otherwise checked against the record).
  - G1 beta, not GA. G2 audience consistent with H2. G3/G4 any stated price,
    limit or engine matches H3/H4. G5 the 1,850% figure is omitted or framed
    as HubSpot's own claim; no third-party figures presented as admitted facts.
  - P1b preflight and review run; N1 no `current-request` basis.

**Round 2 results (2026-11-20, unattended, no permission prompts).**

| | E4 Learn repeat (`0eb6a539…`) | E5 web profile, HubSpot AEO (`4fbd0290…`) |
| --- | --- | --- |
| Time / AI units | 3.8 min / 51 | 5.6 min / 88 |
| Agent | default | **`marketing-iq-web` selected, tools exactly as declared** (`web` alias works) |
| S1 connector | Learn only; 0 WorkIQ | **1 `web_search` (discovery) + 2 `web_fetch` of HubSpot's pages; 0 WorkIQ** |
| Isolation | read the personal `microsoft-docs` skill | **no personal-skill reads** |
| S2 admission | `evidence --adapter microsoft-learn` → `ready` | `evidence --adapter web` → `ready`, 2 sources |
| Capture rule | Search output was saved but used only for discovery; the admitted body came from the inline fetch result (1/1), so staging was the allowed route. Capture itself not exercised | No saved output; inline staging allowed |
| S3 quotes | 6/6 | 7/7 |
| Ground truth | preview not GA; partner/enterprise audience; licensing split | **H1** "BETA", "not declaring general availability"; **H2** Marketing Hub Pro/Enterprise users, standalone marketers as alternative; **H3** $50, $45 yearly, no other subscription; **H4** ChatGPT, Gemini, Perplexity; **H5** 1,850% omitted, no third-party figures |
| Review | pass | review 1 failed on an unsupported pricing remark, fixed; review 2 pass |
| N1 | `evidence …; assumption` | `evidence …; assumption` |

Body-origin check across rounds (which result each admitted body came from):
E2 (round 1) copied its body from the **saved** search output by hand, which
is the case fix 1 now forbids. E1, E4 and E5 staged inline fetch results; their
bodies are verbatim sentence by sentence (32/32, 21/21, 12/12 and 22/23) but
join non-adjacent passages **without a gap marker** (the one unmatched E5
"sentence" is such a seam: a testimonial running into an FAQ answer).

**Fix 3 (2026-11-20, not yet live-tested):** hand-staged bodies are one
contiguous passage, or join passages with a line `[...]` exactly as `capture`
does (`connector-workflow.md`, web profile; guard HT-08).

**Verdict after round 2.** Non-WorkIQ online sources work end to end, through
both Microsoft Learn and the open web, on a Microsoft and a non-Microsoft
product, with every ground-truth fact correct, all fact quotes verbatim
(27/27 across E1, E2, E4, E5) and no fabricated or third-party figures. The
client profile is the right route: it selects the intended tools and keeps
personal skills out.

### Follow-ups after round 2

- [x] Saved-output capture rule (HT-07). Live: not contradicted (E4), not yet exercised.
- [x] Open-web trial on a non-Microsoft topic (E5).
- [x] Client-profile trial (E5, web profile in a throwaway workspace).
- [ ] Live check of the `[...]` join rule (HT-08).
- [ ] Structural fix for inline results: a CLI capture that takes bodies from
      the session record by line range for any connector, as `workiq-capture`
      does for WorkIQ, so no body is copied by the model.
