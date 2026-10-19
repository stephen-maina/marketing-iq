# Field Activation route

## Required result

Use the common SKILL.md JSON contract. For a draft, use these sections:
`direction-basis` (assessment), `invitation` (draft-copy),
`talk-track` (draft-copy), `follow-up` (draft-copy),
`publication-gaps` (assessment). Write useful actual copy, not empty headings.
Keep all material an internal review draft.
In every draft, the `talk-track` text contains exactly three numbered points, including
post-event briefs. An existing event does not remove this output requirement.
For a completed event, the invitation can propose a future follow-up
conversation; do not invent that future event's date or prior commitments.

## Decision logic

Resolve current direction using `decision-tools.md`. Discover accepted records
before blocking for missing supplied direction; never inherit Launch chat or
cached draft text. One selected applicable record is sufficient and uses
`directionStatus: accepted-record`, with ID/version/scope in direction-basis.
Conflicting alternatives need a user choice without any implicit replacement.
If supplied as proposed, use `directionStatus: proposed`. If the current user
explicitly attests approval, use `user-attested-approved` and do not claim
independent verification. Persist only a particular final direction the user
explicitly confirms, through the decision CLI; never auto-save a draft.

Audience/event details absent from the brief may be marked `[audience]`,
`[date]`, `[time]`, `[registration link]` or `[sender]`; never invent them.
A scheduling follow-up asks about availability/interest. It must not say
"following our discussion", "thanks for attending" or promise agreed next
steps without that history. A true post-event brief may support that wording;
do not forbid it when explicitly evidenced by the user.
Fresh in-scope message/transcript excerpts can also establish narrow history,
with supporting facts in internal analysis. A calendar invitation proves neither
attendance nor what was discussed; generated meeting recaps are not transcripts.
Email approval assertions never replace the current user's explicit direction
or attestation. Keep known audience details; placeholders are for unknowns only.

Do not place customer names, internal WinWire claims/metrics, or quotations in
outward-facing draft-copy. General proposed workshop topics can be offered
without promising product availability, outcomes or approved deployment.
Clearly identify missing external-use permission before publication.
Citation facts stay in the internal analysis, not pasted into customer copy.

Use accepted reasoning to shape the copy rather than copying a slogan. A
takeaway should explain what the attendee will use it for; the CTA should
advance that same purpose. Preserve scope and claim boundaries through the
opening, all three points and follow-up. A proposed output is not a guaranteed
benefit or approved event deliverable, and it needs no particular example name.

## Reusable test request

"Proposed direction, not approved: run a government readiness discovery
conversation. Audience: government IT and transformation leads. No date,
cloud eligibility or previous meeting is established. Draft an invitation,
three talk points and a scheduling follow-up. Do not use internal customer
references or guarantee ROI. List what needs proof before publication."

Expected: useful invitation, three talk points, scheduling follow-up and
publication gaps; explicit proposed direction; no fabricated past event,
customer disclosure, capability guarantee or approval.

## Balanced synthetic cases

No prior event: "Would a short discovery conversation be useful?" is a proposal.
"Thanks for attending our workshop" fabricates attendance and must be removed.

Explicit current user brief: "The workshop happened yesterday; these recipients
attended." A thank-you draft may reflect that user-supplied history. That still
does not authorize internal customer metrics or turn a proposal into an approval.
Supported acknowledgement: "Thank you for attending yesterday's workshop."
Unsupported embellishment: claiming what attendees discussed, agreed or
committed to when the brief supplied attendance alone.

Unknown history: "No previous meeting is established in this brief" does not
support either "thanks for meeting" or "we have never spoken". Keep the copy
neutral: "Would a discovery conversation be useful?" Internal gaps can say
history was not supplied, without claiming that contact never occurred.
If the user explicitly states that this is the first contact, that supplied
history may be acknowledged; do not infer it merely from a scheduling request.

## Final check

For drafts, all five sections present, including three talk points; source claims
trace to facts; current supplied/discovered direction stated; no invented time/history, approval or
disclosure. For blocked responses, sections and facts stay empty.
