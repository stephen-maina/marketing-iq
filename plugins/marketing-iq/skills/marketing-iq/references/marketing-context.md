# Optional project marketing brief

Goal: reuse explicit project context without repeatedly interviewing the user
or mistaking remembered context for current evidence.
Trigger: a user supplies a marketing brief, asks to maintain one, or asks to
reuse a known project-owned brief. It is optional, never an intake prerequisite.

## Four different kinds of context

| Kind | What it can establish | What it cannot establish |
| --- | --- | --- |
| Current user input / project brief | Stated objective, audience hypothesis, voice, constraints and choices | Verified capabilities, customer demand, source authority or publication permission |
| Native preference memory | An explicitly eligible preference at an approved supported scope | A current source selection without confirmation, evidence or approval |
| Current admitted evidence | Narrow sourced claims under the shared gates | Acceptance of this run or rights to publish |
| Accepted direction | The particular accepted choice, version and business scope | Current product truth, all future activities or publication approval |

1. Prefer the current explicit brief. Only read a known user-selected project
   brief path with this actor's normal read permission. Do not scan home folders,
   connector settings, old chats or other projects to find one. An optional
   brief that is missing can stay absent; a denied path must not be reconstructed.
2. Use `examples\marketing-brief.template.json` as the versioned shape when the
   user wants a reusable brief. Capture only relevant supplied information;
   leave unknowns empty. `schemaVersion` versions this shape; `revision`
   versions the user's particular brief. `state: proposed` is the default.
   A confirmed revision records only user-confirmed project context, not a
   verified evidence pack. A template is not populated customer research.
3. Show a short delta before creating/revising: exact destination, previous and
   proposed revision, changed fields and overwrite effect. Obtain confirmation
   of that exact change. Preserve unrelated fields and the user's wording.
   A conflict/newer revision requires rereading and a new preview; never merge
   competing audience choices or voice rules silently. Mark stale facts as
   hypotheses/questions; do not refresh them by changing a date.
4. Save only with an actually exposed permitted native data-only writer and
   an approved project scope. Do not acquire a writer, execute shell text to
   persist a private brief, edit installed assets, or substitute user-wide
   memory. Without that boundary provide a session-only proposal and explicitly
   say unsaved. Readback must match the approved revision before claiming save.
   If a writer cannot preserve an existing concurrent revision, do not overwrite.
5. Current user input overrides conflicting brief context for this evaluation;
   explain a material conflict without automatically updating the stored brief.
   Brief source/connector suggestions still follow `source-preferences.md`:
   confirm before reuse unless the user currently selected them. The brief's
   existence grants no new retrieval scope, budget, authority or source access.
6. Load only fields applicable to the current activity. Do not turn an old
   objective into Field direction: use decision-tools for current acceptance.
   Brand terms/voice do not authorize unsupported claims. Do not repeat questions
   already answered in the current brief.

## Learning from actual use

When feedback is supplied or a retrospective requested, use
`examples\marketing-feedback.template.json` to propose a small attributed record:
the exact result revision, observed edit/reason, decision it helped, and any
actual outcome with observation window and denominator. Keep `not-observed`
when no outcome exists. An AI adviser's recommendation is not human feedback.
Do not invent a participant, response, baseline, hours saved or conversion.

Separate a one-off correction from a reusable preference. Ask before promoting
the latter into the project brief, preview its scope/revision, and apply the
same save boundary. Never learn product claims or customer identifiers into
memory. Native memory, if explicitly requested, follows source-preferences and
its actual supported scope; the project brief is not a fallback memory store.
Keep sensitive sources, private quotes, personal contact details and customer
metrics out of these reusable records.

Positive: a confirmed project preference for concise language can shape copy.
Negative: a confirmed brief saying "buyers love it" remains a stakeholder
hypothesis without current admissible research. Neither case changes approval.

## Final check

Context, evidence, preference and accepted direction remain distinct. No
automatic persistence, source expansion, invented feedback or repeated intake.
Report actual save/readback status, not a proposed operation as completed.
