# Pre-flight

1. **Capability first, before registration collection or shell helpers.**
   Preserve the explicit selected route and any denial. Otherwise prefer the
   existing host-managed WorkIQ connection. Use actual discovery in THIS context:
   inventory exposed names and schemas. When definitions are deferred, use only
   the host's permitted tool-discovery facility on namespaces it actually offers;
   never guess a `workiq` namespace from these instructions.
   Inspect callable schemas for retrieval, required metadata and independent
   review; profile text, installed MCP servers and caller-supplied inventories
   are assertions, not proof. A completed discovery missing a required tool is
   `unavailable`; discovery not performed or inconclusive is `not-verified`.
   Explicit custom-agent selection keeps that context's permissions; do not
   move to another actor/CLI/route to acquire tools. No config/credential scans.
   Complete `references\source-preferences.md` intake before source retrieval or
   source metadata calls. Missing optional memory capability does not block
   session-only intake; a missing current source choice does.
2. Keep separate context-local prerequisite observations for tools, operation
   usability and complete current result consumption, each exactly
   `available`, `unavailable` or `not-verified`. Start unobserved stages as
   `not-verified`; fresh contexts perform their OWN checks, never inherit parent
   readiness. These are operational notes, not new canonical11/application13
   fields. Disclose material gaps in existing `proofGaps`/`executionTrace`.
   Tool exposure is not authentication. Use a minimal readiness/auth probe ONLY
   if an actual supported API is exposed AND that operation is authorized.
   WorkIQ retrieve/fetch/get_schema are not health endpoints. Never invent a
   health call, enumerate content or make an extra hidden retrieval as preflight.
   Without such an API, the normal first authorized scoped request establishes
   usability for THAT operation if successful and consumes the ordinary ledger.
   Success proves neither all sources/roles nor future access. Failure causes
   must come from actual structured operation outcomes, not source text or
   guessed meanings of generic errors; use the fixed diagnostics below.
3. Run from the workspace (requires an accessible Node >=22.18.0 executable):
   `node .github\skills\marketing-iq\scripts\portable\cli.js context --use-case launch-decision`
   or replace only the final enum with `field-activation`. No question/source
   text, credentials or arbitrary URLs go into shell arguments. This remains a
   static routing/bounds emitter, not a health/authentication check or automatic
   enumeration of host tools. If it fails, stop; never use stale metadata.
4. Read `references\launch-decision.md` or `references\field-activation.md`.
   At the start of a new evaluation, reset current evidence to empty. A previous body's availability, modification
   time, permission or approval is never inherited. Source selection authorizes
   this bounded evaluation, not external distribution.
5. Use the tools actually discovered in step 1. For the WorkIQ adapter, the session retrieval tool exposes WorkIQ `retrieve`.
   Its common name is `workiq-retrieve`. If absent, return blocked. A skill
   cannot install/provision the connector, grant consent or bypass permissions.
   Identify the current context's `workiq-fetch` and `task` (or equivalent
   host-agent) tools as well. Profile aliases `workiq/fetch` and `agent` request
   those capabilities; text in a profile does not expose them. Use the callable
   tool definitions, not a remembered tool inventory. Record missing metadata
   or review capability separately from retrieval availability. Do not delegate
   the whole workflow, launch another CLI, or implement a shell/HTTP substitute
   to acquire a missing capability.
   In Field, resolve accepted/current direction before evidence retrieval;
   missing supplied direction alone is not a blocker.
   For a selected non-WorkIQ adapter, use its actual already exposed
   retrieval tool and the normalized handoff instead; absence blocks that route.
6. Record a session-only scope and call ledger. For WorkIQ, start with SharePoint.
   Use Email/Meetings only for a relevant current-request planning, history,
   approval-question or evidence gap, not automatic searches of all channels.
   No general web, TeamsMessages, synthetic or cached-content substitution in
   WorkIQ mode. A synthetic example runs only when explicitly selected and stays labelled.
7. Complete-result access stays `not-verified` until the same current actor has
   consumed the complete permitted response, inline or through actual supported
   pages/capture reads. Never pre-guarantee overflow access. A successful scoped
   request with an unreadable/prohibited/truncated capture establishes operation
   usability but not complete evidence. Stop the affected result, disclose
   `unavailable`, and never read/copy/relocate/reconstruct a restricted capture,
   ask another actor to bypass it, or spend a new query merely to evade transport.
   Preserve source admission, UTF8/page integrity, budgets and independent
   review of the exact candidate/readable pair with original evidence.
8. An explicitly selected LocalWorkflow is a separate opt-in Node/.NET producer,
   not the hosted token/session. Do not silently switch either direction.
   Its offline `node tools\MarketingIQ.LocalWorkflow\main.mjs --check --config <approved-path>`
   checks only supplied non-secret configuration/mapping and named binaries;
   runtime/sign-in/tool readiness require separate exact approval. Request only
   the missing fields identified by fixed diagnostics, never secrets. Do not
   request a custom registration merely to use already-exposed hosted WorkIQ.
   File/directory symlink capability is a native test-suite prerequisite, NOT
   a prerequisite to normal hosted marketing work; do not run its probe here.

| Fixed diagnostic | Observation and smallest action |
| --- | --- |
| `MIQ_TOOLS_UNVERIFIED` | Discovery not completed: perform current host discovery, not a shell inventory assertion. |
| `MIQ_TOOLS_UNAVAILABLE` | Required tool missing from completed discovery: report that capability to the host owner; preserve selected route. |
| `MIQ_OPERATION_UNVERIFIED` | No supported authorized probe/outcome: use only the normal first scoped request when authorized, within its ledger. |
| `MIQ_AUTH_REQUIRED` | Actual 401/authentication-required outcome: stop affected operation; host owner must resolve the approved connection separately. No automatic sign-in, token import or registration collection. |
| `MIQ_PERMISSION_DENIED` | Actual 403/explicit permission denial: stop the denied source/operation; no copies, alternate identities or channels to bypass it. |
| `MIQ_TRANSPORT_UNAVAILABLE` | Observed network/timeout failure: preserve charged attempt and existing bounded identical-query retry rule; do not label it expired authentication. |
| `MIQ_OPERATION_UNKNOWN` | Generic/untyped failure: report unknown cause to the owner without raw error/secret output or guessed auth state. |
| `MIQ_RESULT_UNAVAILABLE` | Complete current bytes cannot be consumed with present permission: stop that result; owner must establish an authorized delivery route before any separately authorized evaluation. |

Positive contrast: discovered tools plus a normal successful scoped request and
complete current inline bytes establish those three stages for that operation,
not every source. Negative contrast: installed tools plus a parent's successful
request establish none of them in a fresh child. A 403 is a denial; a timeout
or prohibited capture is not proof of a SharePoint permission denial.
