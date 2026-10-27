# Source intake and native preferences

This contract applies to both Launch and Field before source retrieval,
source-link metadata resolution or content discovery. Host tool-schema discovery
and reading plugin instructions are not source retrieval. Preferences guide
interaction; they are not evidence, source access, accepted direction or approval.
Keep the shared output contract and existing budgets unchanged.

## Select the source for this request

Use the current user's instructions first, then choices already confirmed for
this active evaluation. Only then consider eligible preferences actually supplied
by the host's native memory. Do not reconstruct preferences from old conversations,
diagnostics, source captures or a previous assistant recommendation.

| Current state | Required action before retrieving |
| --- | --- |
| The user supplies a source path/URL, maintained source name or connector/MCP choice | Honor that selection. Ask only for a missing material boundary; do not ask them to reconfirm what they just specified. A connector name alone does not authorize unrestricted tenant search. |
| The active evaluation already has a confirmed selection | Retain it through clarifications. Ask only about a material change; keep its denials, consumed attempts and review history. |
| No current selection, but an eligible remembered choice is actually available | Show the remembered connector and any eligible location, identify them as remembered suggestions, and ask whether those are sufficient for this request. Wait for confirmation or replacement. |
| Only part of the needed choice is current | Never silently fill the rest from memory. Offer the remembered missing part for confirmation, or ask for that part only. |
| Multiple, conflicting or stale remembered choices | Ask which applies. Do not select the newest, combine scopes or search all of them. |
| Neither a current selection nor eligible memory is available | Ask which source path/folder/document or connector/MCP server to use. Accept either as a starting point, not a requirement to supply both or exact tool identifiers. |

Use the host's question/confirmation tool when available. Otherwise request the
missing selection in the shared blocked result with empty facts, sections and
sources. Do not invent marketing copy while awaiting input. Ask one focused
question covering the missing source choice, not a setup questionnaire.

A useful confirmation is: "The remembered suggestion is [connector] with
[eligible location, or location not saved]. Is that sufficient for this task,
or should I use a different source?" Never say a location was remembered when
only the connector was supplied. "Use the usual source" without a current
unambiguous selection still requires showing and confirming the actual suggestion.
No response, cancellation or refusal to choose is not confirmation. Do not
retrieve while unresolved; a declined suggestion requires a replacement.

An explicit replacement applies to this task, not automatically to future tasks.
Changing the source does not erase a denial or replenish the active evaluation's
budgets. Apply the shared workflow/scope-transition rules rather than silently
starting a new evaluation.

After intake, inspect actually exposed compatible connector schemas under
`adapters.md`. An explicit current path without a connector can use the ordinary
compatible-connector selection rules; state the selected adapter before retrieval.
A remembered connector cannot be silently selected instead. A named maintained
source can be resolved through the existing mapping; do not require its URL again.
For a topic-only request, propose bounded topic discovery through an exposed
compatible connector and obtain confirmation first. A mapping/default is not
confirmation for a user who supplied neither a source nor a connector.
An arbitrary local path is not automatically supported: the bundled local-file
adapter remains an opt-in synthetic sample, not a production filesystem reader.
Missing/incompatible tools produce the existing setup guidance; confirmation
does not supply tools, authentication or permission to bypass denied access.

## Save only eligible preferences with native memory

The plugin has no preference database or memory service. Use only native memory
operations actually exposed and permitted in this selected host context, following
their current schemas and eligibility/scope rules. Host-supplied recall and the
ability to write new memory are separate capabilities.

When the user explicitly states a durable interaction/tool-use preference:

1. Classify it under the host's rules. Temporary task choices and assistant
   inferences are not preferences to save. Keep optional brief tone, language,
   formatting and other supplied context session-only unless it qualifies as an
   explicitly reusable preference under those rules.
2. Establish scope. If this project versus all the user's projects is ambiguous,
   ask. Do not turn a Marketing IQ feature request into a user-wide preference,
   or store a personal preference as a contributor-wide repository fact.
   If the requested scope is unsupported, leave it unsaved and explain that
   particular limit; do not silently save at a broader scope.
3. Exclude sensitive/personal/confidential/third-party information from every
   memory field, including citations and reasons. Never save credentials, private
   source addresses, identity-bearing paths, source bodies, customer details,
   generated claims or accepted direction as preference memory. A non-sensitive
   connector label or public location is only a candidate, not automatic
   eligibility. Ask for the private location anew rather than encoding it,
   replacing it with a reversible alias or creating a fallback store.
4. Compare with relevant memories actually supplied by the host. Use the native
   duplicate/update/vote mechanism when supported; do not create a duplicate.
   Cite the smallest exact qualifying user statement, not private context.
   A task-specific override is not an instruction to replace a durable preference.
5. Call the permitted native operation only for an eligible, correctly scoped
   preference. Report saved/updated only after an actual successful tool receipt.
   On failure, report unsaved; do not claim future recall or repeatedly retry an
   ambiguous write. A vote/downvote is not proof of permanent deletion.

If memory is disabled, not exposed, or cannot store the requested scope, continue
with session-only intake and disclose the limit when reuse/saving is relevant.
Do not enable memory, edit tool allow-lists, inspect memory/configuration files,
use shell commands or create a JSON file/database as a substitute. Do not invent
a memory search API or `/memory` write command. Absence from supplied context
means "not available here", not proof that the user has no saved preferences.
For Copilot CLI, `/memory` manages status/enablement; user/account controls and
the host's native tools govern persistence. Another host needs its own supported
memory capability; installing this plugin does not supply one.

## Neighboring cases and completion check

Valid: a currently supplied source folder replaces the remembered folder for this
task; preserve an explicitly selected connector and any existing denial.
Invalid: silently retrieve from the remembered folder before asking, or replace
the remembered preference merely because this task used another folder.

Valid: the host supplies a non-sensitive preferred connector; ask to confirm that
connector and request the missing location if the current question cannot bound
discovery. Invalid: say "I remember your folder" or infer a private URL from it.

Before continuing, verify that source intake is resolved by current instructions
or explicit confirmation, and that scope and connector compatibility are separate
observations. Before delivery, distinguish session-only preference, actual native
save receipt, host-supplied recall and current confirmation. None proves the
others. Record only relevant outcomes in existing proof gaps/execution trace;
do not add canonical fields or copy memory content into evidence facts.
