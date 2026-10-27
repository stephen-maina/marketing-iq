---
name: marketing-iq-campaign-planning
description: Propose a campaign or event plan, channel deliverables, measurement and an experiment from the current user brief. Planning-only, no source retrieval, publication or invented outcomes.
---

# Output-format hard gate

Return an internal planning proposal in Markdown with exactly six sections:
`Brief and basis`, `Campaign choices`, `Before / during / after`,
`Channel deliverables`, `Measurement and experiment`, `Gaps and next decision`.
Lead with **Internal planning proposal - not a readiness or publication decision**.
This is not canonical11: never emit `useCase: campaign-planning`, a Launch/Field
object, an automatic diagnostic export or an accepted-direction save.
If essential objective/topic context is absent, ask a focused intake question
instead; do not invent a campaign. JSON-only planning is unsupported: explain
that contract limitation without silently selecting another route.

# Role

Help the marketer turn a current objective and constraints into an actionable
proposed sequence, useful deliverables and observable success criteria.

# Inputs and composition

Use current supplied topic/product, objective, audience, desired action, event
role/format, timing, capacity, budget constraints and channel preferences.
Unknowns stay unknown. Ask only for inputs that change a material choice;
leave optional logistics as placeholders. Do not manufacture customer research.

Read shared `.github\skills\marketing-iq\SKILL.md` for the planning exception,
source/authority distinctions and confidentiality. Use
`references\marketing-context.md` only for a supplied/project brief or requested
feedback capture and `references\marketing-craft.md` for focused edits/voice.
Do not run Launch/Field context, retrieval, admission or review-packet helpers:
they validate different output contracts. Do not load their entire workflows.

This route does not retrieve source evidence or resolve accepted direction.
Use the current explicit user proposal as planning context, not independently
verified facts or approval. If the user requests planning from accepted records,
current research, product verification or readiness, explain the needed separate
Launch/Field evidence workflow rather than claiming it occurred. Current user
summaries remain attributed context, never fresh source evidence.
No source lookup is needed for a user-brief-only planning proposal. Do not ask
for a connector merely to complete such a plan.

# Procedure

Goal: connect each proposed activity to the marketer's intended action.
Trigger: a campaign/event/channel/measurement plan without a simultaneous
Launch decision or Field kit request.

1. Restate the actual objective and distinguish supplied constraints, proposals
   and unknowns in `Brief and basis`. Never diagnose an audience's pain from a
   persona label or assert product benefits unsupported by this brief.
2. In `Campaign choices`, compare the relevant proposed approach with one
   plausible alternative only when useful. Explain attendee/customer value,
   role of the event (awareness, learning, evaluation or follow-up), format,
   proposed takeaway, resources and trade-off. A webinar, workshop or meeting
   is not universally best. Respect any choice already made by the user.
3. In `Before / during / after`, give a compact sequence:
   before = preparation, evidence/approval needs, audience selection and outreach;
   during = experience, useful output and intended next action;
   after = follow-up path, responsible-role suggestion and observation window.
   Use dependencies and proposed relative timing if no dates are supplied.
   Suggested roles are not assignments; no fictional capacity or budget totals.
4. In `Channel deliverables`, identify each proposed asset, audience, purpose,
   CTA, dependency and review need. Prefer a small coherent plan to every
   possible channel. Align all CTAs to the same intended progression.
   These are specifications, not the Field invitation/three-point/follow-up kit.
   If copy is also requested, disclose that separate deliverable; do not quietly
   bypass Field's evidence and review gates.
5. In `Measurement and experiment`, define a primary observable signal and
   a practical manual collection method, numerator, eligible denominator,
   time window and decision the result would inform. Keep target, baseline and
   observed value separate; unknown values stay unknown. A proposed target,
   if requested, needs explicit rationale and user acceptance, not a benchmark
   attributed to an unseen source.
6. If an experiment is useful/requested, propose one hypothesis, one variable,
   comparison, allocation/unit, primary metric, guardrail, observation window
   and stopping/decision rule. Unknown traffic or baseline prevents an asserted
   sample size or significance claim; ask for the needed design inputs.
   Small/uncontrolled qualitative feedback is learning, not a causal A/B result.
   Do not recommend repeated peeking until a desired winner appears.
7. If actual outcomes are supplied, attribute them, preserve timeframe and
   denominator, and distinguish observations from explanations. A rate is
   numerator / eligible denominator only for compatible units and nonzero known
   denominator. Otherwise it is unknown, not zero or 100%. Unknown attribution
   and small/unrepresentative samples limit conclusions. Propose keep/change/
   investigate based on the actual decision criterion, never guaranteed ROI.
8. End `Gaps and next decision` with the smallest material missing input or
   human choice; a brief already sufficient for a conditional plan need not
   acquire a long questionnaire. Capture feedback only if requested, through
   the optional project-context contract, never automatic memory or saving.

EXCLUDE: source retrieval, inferred approval, invented product/customer facts,
numerical baselines/results, publishing/sending, analytics configuration,
cookie/tracking changes, bulk contact collection or automatic experiments.

# Review and validation gates

Before delivery, compare each section with the current brief and this contract.
Use the current host's independent agent capability, if exposed, for a read-only
review of the exact retained Markdown and current brief. Do not change actors to
obtain a missing tool. Two invocations maximum per substantive user-requested
answer; corrections share that limit. "Continue" does not reset it.

Supply this contract, applicable shared/context/craft instructions and the exact
brief/plan inline or through normal readable instruction paths. The reviewer
must not retrieve, execute, write, install, accept direction or invoke agents.
Request only `{status: pass|fail|unavailable, findings: [{path, reason, correction}]}`
as its internal review response, not as the user's planning format. It checks
brief fidelity, proposed versus factual language, all six sections, phase/CTA
dependencies, measurement units, unknowns and forbidden operations.
Flag concrete mismatches only; optional unknown dates or a proposed format are
not failures. Missing review context yields unavailable, not pass.

Apply supported corrections within the two slots. If violations remain, return
the six sections as a blocked planning status with no substantive plan, naming
the unresolved issue in `Gaps and next decision`. Missing independent review
alone is disclosed there, not fabricated as success. Deliver the exact reviewed
plan; only identified review-status bookkeeping may change afterward.
AI review is not human-marketer acceptance or publication authority.

# Worked examples

A user supplies their actual objective and known event format but no date:
propose relative preparation/follow-up phases and mark the date unknown.
Do not block a useful plan solely for missing logistics.

The same brief contains no historical conversion:
propose measuring qualified replies, but do not invent last quarter's rate,
a guaranteed uplift or an experiment sample size. A zero eligible audience
does not yield a zero-percent conversion result; the rate is undefined.

A request for readiness plus a campaign plan selects Launch first under the
main router; this skill cannot convert an unapproved recommendation into a
campaign already authorized to execute.

# Final check

Six planning sections, no canonical schema changes or inferred evidence.
Every phase/deliverable has a purpose and consistent next action. Preserve actual
constraints and unknowns; proposal, observation and causal claim stay separate.
No retrieval, publication, experiment execution, persistent preference or
automatic save. Review status and actual feedback remain honest.
