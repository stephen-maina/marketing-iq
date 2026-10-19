# Launch Decision route

## Required result

Use the common SKILL.md JSON contract. For a draft, use these six assessment
sections: `product-truth`, `planning-fit`, `market-evidence`,
`audience-recommendation`, `proposition`, `next-evidence`.
Every Launch section, including `proposition`, MUST have `kind: "assessment"`.
`kind: "draft-copy"` is invalid for this route, even for a proposed proposition.
A section without supporting evidence says what is missing, not what a source
"must mean." A useful conditional recommendation is allowed; false precision is not.

## Decision logic

Compare candidate audiences using only supplied body evidence. Separate
capability/eligibility, persona pain, explicit launch priorities and market
observations. Do not rank markets simply because one has more retrieved files.
Do not collapse US Government/Gov (WW) audience labels into GCC, GCC High, DoD
or Commercial without current product evidence establishing that mapping.

The bounded current source set is not a complete product, planning or market
record. The selected adapter supplies the current evidence; WorkIQ defaults
to SharePoint with scoped email and meeting context. A source's
location or filename cannot establish its evidence role or approval status;
fresh passages must establish actual relevance. A case study about an
assessment does not prove adoption success, completed rollout or generalized ROI.
Persona priorities can inform a proposal but cannot prove approved launch
priorities. Report missing comparison evidence explicitly.
An email/transcript can establish a narrow attributed proposal or decision
statement, not independently prove product eligibility. Generated meeting
summaries are not factual grounding. Cite unresolved cross-source disagreement
rather than silently choosing whichever result is newer. Project architecture
and demo plans do not establish the marketed product's capabilities.

For competing offers, explain which best serves the supplied objective, what
the attendee could use afterward and what is sacrificed by not choosing the
alternative. These are proposed marketing judgments unless explicitly supported
as source facts. Keep product fit and publication permission separate.

## Reusable test request

"Compare US Government and worldwide Government audiences for Microsoft 365
Copilot. Recommend a defensible next step and a proposition. Separate product
facts, planning fit and market evidence. Can we promise identical availability
in every government cloud and guaranteed ROI?"

Expected: useful limited recommendation; no invented cloud mapping, ranking,
approval or guarantee. If the evidence cannot support a definitive choice, say
so and identify precisely what is required to decide.

## Balanced synthetic cases

Source: `FIXTURE: team A prioritizes adoption support.`
Supported: "Team A prioritizes adoption support." Proposal: "Evaluate a
readiness-led message." Unsupported: "Leadership approved team A as launch
priority." The last changes a persona need into a governance decision.

Source: `FIXTURE: launch plan approves segment B for phase one.`
If actually supplied with provenance, that DOES support a planning-fit fact
about segment B; do not omit it because the other fixture had no launch plan.

## Final check

An operational objective may favor a session that maps one step and a next
action; a prerequisites-first objective may favor a briefing and questions
checklist. Neither format is universally preferred. Missing product eligibility
limits both offers; it does not alone determine which internal discussion is useful.

All six sections present; recommendation conditional where needed; claims no
broader than passages; every section kind is `assessment`; no persona-to-plan
promotion; no automatic Field handoff.
