# Accepted direction in the existing host

Use the shipped Node decision CLI through the host's execute tool.
It is a local tool, not a model client or MCP service. Do not list models,
provision authentication, or reimplement its storage and lifecycle rules.

## Fixed workspace configuration

Command: `node .github\skills\marketing-iq\scripts\portable\cli.js decisions`.
Requires accessible Node >=22.18.0; no .NET runtime, SDK, TypeScript compiler or
dependency installation is needed by consumers. Compiled JavaScript is shipped.
Store root: `local-data\launch-decisions`, resolved from the workspace.
Read-only Field discovery uses `--read-only`. Do not read the accepted/archive
files directly: the CLI validates acceptance, applicability and lifecycle.
If the executable or tool is unavailable, name the setup gap. Do not silently
build, change the store root, or use old chat instead.
The record format and store directories remain compatible with the C# tool.
Never run C# and Node writers concurrently against one store: their locks do
not interoperate. Node serializes its own readers/writers with a bounded
five-second lock. After a killed Node process, an abandoned lock fails closed
with `LOCK_UNAVAILABLE`; do not automatically remove it. An operator must first
verify no writer is running, then remove only that store's exact lock directory
under the OS temp directory (`marketing-iq-decisions-<sha256>.lock`). Ordinary
workflow runs must not repair locks or rewrite records.
Use ordinary local drive paths on Windows. UNC/device paths, alternate streams
and trailing-dot/space aliases are rejected; the lock is not a distributed
filesystem service or protection against a hostile concurrent filesystem writer.
Session validation JSON files are diagnostic answers, not accepted records.
Never discover direction by scanning those files or copy them into this store.
Exporting an answer does not accept or publish its proposed direction.

Scope keys are lowercase hyphenated business labels, at most 64 characters:
`productKey`, `topicKey`, `audienceKey`, `geographyKey`. Derive them from the
current request, not a previous conversation. Reuse the source registry's
product/topic labels (Microsoft 365 Copilot -> `microsoft-365-copilot`;
government -> `government`). Normalize the named audience/geography the same
way. Ask only for genuinely ambiguous or missing scope; do not assume worldwide
or infer a government cloud. A source folder's location is not audience scope.
Present these keys with the record at acceptance so future requests can match.

Keep source routing and decision scope distinct. A shared Government folder
does not make all government decisions interchangeable. Use the specific current
topic (for example `citizen-services`) rather than flattening it to `government`
to obtain a match. `government-ai` describes an explicitly broad government AI
brief, not an inferred named product. Missing scope stays missing. Do not relabel
or migrate existing accepted records merely to make a lookup succeed.
Keep topic and activity separate: `topicKey` names the business domain or
specific subject (government, healthcare, citizen-services), not the requested
format or stage (briefing, use-case-discovery, production-launch). Use a specific
named subject when supplied, otherwise the explicit domain. Thus an Azure AI
use-case discovery briefing for healthcare operations leads in Europe uses
`azure-ai / healthcare / healthcare-operations-leads / europe`; discovery is
the activity checked against direction, not a substitute topic key.

## Field scope transitions and selective loading

Goal: load only applicable direction, not the decision history or source corpus.
Before each Field turn, compare product, topic, audience, geography AND intended
activity against the active brief:

- Unchanged business scope/direction with only logistics or wording changes:
  continue the same evaluation and selected direction, without redundant
  discovery, resaving or reapproval. Keep its evidence ledger and review history;
  changed copy/logistics gets the shared bounded answer-review cycle.
- Changed scope or intended activity: invalidate any now-inapplicable direction
  before drafting and perform scoped read-only discovery using the changed
  current brief. Preserve unchanged explicitly supplied fields only for a
  clarification. Retain cumulative evidence budgets and denials; review the
  changed answer under the shared answer-cycle rules.
- Explicit new task: derive scope from that task, not unreferenced earlier
  questions. Discover with missing fields left null and ask only for gaps.
  Never load the government record to fill an unrelated or ambiguous request.
- Explicit return to a named earlier task in this conversation: recover only
  that brief's scope and original ledger, re-discover current record applicability,
  and keep evidence/review limitations; do not mix intervening task state.

Send only scope and current UTC time to `discover`. Read only its returned
matching records, not accepted/archive files, all decisions, old answer packs or
transcripts. The CLI validates the bounded store internally; this is not
loading every record into the model context. Do not add a second decision index.
A `selected` result proves scope/lifecycle eligibility, not semantic fit for a
different objective: compare the returned direction to the requested activity.
An internal discovery decision cannot approve a production launch even with
identical scope keys. Expose that conflict; use an explicit current proposal
only after the user chooses it over the conflicting record, or retain the
record's actual direction after that choice. If there is no conflicting record,
an explicit current proposal is sufficient without a redundant choice.
Never imply stored approval for the different objective.

## Discover before blocking Field

Run one read-only discovery at the current UTC time for a new Field evaluation
or a transition requiring rediscovery above, even when no direction was supplied.
Unchanged logistics/wording continuations retain applicable direction without
repeating discovery. Missing scope fields may be null; the CLI reports `needs-context`.
Example for a request that explicitly supplies all four scope values:

```powershell
$request = @{
    schemaVersion = 1
    operation = 'discover'
    scope = @{
        productKey = 'microsoft-365-copilot'
        topicKey = 'government'
        audienceKey = 'government-it-and-transformation-leads'
        geographyKey = 'worldwide'
    }
    asOf = [DateTimeOffset]::UtcNow.ToString('o')
}
$request | ConvertTo-Json -Depth 8 -Compress |
    node .github\skills\marketing-iq\scripts\portable\cli.js decisions --store-root .\local-data\launch-decisions --read-only
```

Interpret the actual response, never an invented acceptance flag:

| CLI result | Field behavior |
| --- | --- |
| `selected` | Check the returned direction fits the current activity, then use `directionStatus: accepted-record`. Identify its ID/version, scope and effective dates in `direction-basis`. No repeated direction, decision ID or re-approval when it fits; a conflicting objective needs the choice described below. |
| `choice-required` | Present all returned alternatives and request a choice; do not choose newest or mutate the store. |
| `needs-context` | Request only `missingFields`, translated into business terms. |
| `not-found` | Explain that no current applicable accepted direction was found; ask for a proposed direction if none was supplied. |
| `invalid`, denied access, missing executable, or failed execution | Report discovery unavailable honestly; do not claim no record exists. |

An explicit current proposed direction still works without an accepted record.
If discovery is unresolved, disclose that gap; it does not automatically prohibit
a user-directed internal draft. If a returned accepted record conflicts with the
current direction, present both and request an explicit choice for this draft.
Selecting a direction for a draft does not authorize replacing stored decisions.
Accepted records establish direction only; retrieve current product evidence
separately. Never use a publish response as the current discovery result.

## From visible save choice to exact confirmation

Goal: make cross-session handoff discoverable without inventing acceptance.
Trigger: a concrete Launch proposal or a current-user save/change request.

The agent owns the bookkeeping. Users should not need to know about Field,
store paths, CLI operations, decision IDs or normalization to save their work.
Offer saving proactively in business language; explain its benefit briefly,
without making understanding the implementation a prerequisite. Derive supported
scope keys from the current business brief using the rules above, and propose
the record ID/version and dates. Ask only for missing business scope or a real
coexistence/replacement choice. Do not ask the user to type machine keys, JSON
or commands. This does not permit guessing unknown scope or omitting the complete
exact-record preview: present its business meaning first, retain all required
values, and obtain informed confirmation before publishing.

When offering, preparing or reporting a successful save, explicitly explain in
both `next-evidence` and the readable closing: saving is direction handoff only,
not product/execution/publication approval or independent review. Preserve any
actual review outcome separately; saving never supplies it.

During preparation, use the existing `direction` text to preserve the chosen
offer, why it serves the attendee, the intended takeaway/next action and material
claim boundaries. Attribute these as accepted marketing choices, not new product
facts. Include that complete text in the exact-record preview; after confirmation,
do not silently enrich or paraphrase it. No schema extension or private source
cache is needed for reasoning reuse.

Connected testing uses the same confirmation boundary as ordinary saving.
Operator scripts, sample confirmations and permission to test do not supply the
current human's exact-record confirmation. State any demo-only scope, validity
and coexistence/replacement effect in the preview. Fresh Field receives the
business task, matching scope and selected source, not the earlier answer,
preferred offer or decision ID. Require an actual scoped discovery response
and current source retrieval before claiming reuse. A same-operator fresh-context
test is not proof of cross-user access; save success alone is not a handoff test.
Keep assessment, human choice/confirmation, publish and fresh Field discovery as
separate stages. In particular, replaying an older confirmed record is not saving
the current recommendation. Run an explicitly authorized replay as its own
operation, not between answer-review attempts; preserve all original values and
report the native result separately. A failed assessment cannot supply acceptance.
If a reviewed answer mentions such an operation, its reviewer must receive the
relevant instruction and actual operation state, not just the marketing brief.

1. For a concrete unaccepted Launch proposal, ask in `next-evidence` and the
   readable closing whether to prepare it for saving, revise it or leave it
   unsaved. Explain that only accepted direction and metadata are saved, so a
   later Field session in this workspace/store can discover them without the
   earlier chat or an ID. Retain material gaps, including any unreviewed revision;
   saving neither resolves those gaps nor grants execution/publication approval.
2. "Yes, save" before a record has been displayed authorizes preparation only.
   Run read-only discovery with the current scope and UTC time, using the same
   CLI/store above. Do not treat unavailable/invalid discovery as an empty store.
   Resolve missing scope or unavailable discovery before proposing a final record.
   For existing applicable records, show returned alternatives and ask whether
   the new direction should coexist or explicitly replace named records unless
   the user already specified that effect. Even one current record does not
   authorize replacement. No newest-record heuristic, silent duplicate or
   automatic supersession. With `not-found`, prepare a no-replacement proposal.
3. Once those choices are resolved, display the complete proposed record:
   exact direction, four scope keys, decision ID/version, status, effective
   period and supersession targets. For `acceptedAt`, explicitly show
   "UTC time of your confirmation, captured once" rather than a preview-time
   timestamp. This disclosed audit-time rule is the sole exception to fixed
   preview values; never send that placeholder to the CLI. Explain the replacement or
   coexistence effect and ask for explicit confirmation of that exact record.
   Put the preview and question in existing `next-evidence.text` and preserve
   them in the readable view; do not create a second top-level answer object.
   Do not loop back to asking merely whether the user wants to save.
4. Only the current user's exact-record confirmation permits the publish below.
   If already supplied for the displayed record/effect, act on it rather than
   demand redundant confirmation. Report the actual result: success establishes
   local handoff only; an error does not establish a saved record or later reuse.
   Do not bypass failure with raw file writes, permissions or another store.

EXCLUDE: praise ("looks useful"), recommendations, source-stated approval, test
permission and generic intent before preview are not exact-record confirmation.
An explicit leave-unsaved/defer choice means acknowledge it, do not immediately
ask again and do not withdraw/delete any existing record. Carry that choice
forward until the user reopens saving. A blocked/no-direction result needs
evidence/setup, not acceptance. Unchanged accepted Field direction needs no
resaving or reapproval; activation copy is not a decision record.

## Publish after confirmation

After confirmation, send a `publish` request to the same CLI without `--read-only`.
Use schemaVersion 1 and a `record` with exactly: `schemaVersion`, `decisionId`,
`version`, `status: accepted`, `scope`, `direction`, `acceptedAt`, `effectiveFrom`,
`effectiveUntil` (null when no end was accepted), and `supersedes` (empty unless
replacement was explicitly confirmed). Include top-level `acceptance` with the
same `decisionId`, `version`, and `confirmed: true`. This boolean records the
actual human action; it does not create or independently authenticate it.
On the first exact confirmation, capture its UTC time once as `acceptedAt`
under the disclosed preview rule; do not change `effectiveFrom`, any other
confirmed value or the chosen effect. Retain the assembled confirmed request
in the current session and replay it unchanged, including `acceptedAt`, on a
retry. Execution time is not a new acceptance. Never regenerate timestamps on
replay. Safely serialize JSON through stdin; never execute direction text or
write records by hand. Preserve CLI replay/errors.

Save only the confirmed final direction and required record metadata, not source
excerpts, entire answers, private briefs or unaccepted copy. Report `published`
or `unchanged` only when the CLI returned it. Publication here means local
handoff, never permission to distribute marketing material.
On success, name the ID/version and explain that a later Field session in this
same workspace/store can discover the accepted direction. Do not claim sharing
with other workspaces/hosts or storage of the entire assessment.

Changes require a newly confirmed version and explicit supersession targets.
Withdrawal requires the user to confirm the exact ID/version and its effect,
then the CLI's `withdraw` operation with matching acceptance. Neither operation
is implied by selecting a different direction for one draft.
