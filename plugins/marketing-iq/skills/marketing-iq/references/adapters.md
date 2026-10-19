# Evidence adapters (hosted release 0.1)

An adapter translates a connector's actual current results into a small evidence
handoff. It does not decide launch readiness, accept direction, approve claims or
grant access. Retrieval/authentication remains in the user's host connector.
Marketing IQ processes the handoff with the same Launch/Field rules regardless
of where a document is stored. Provider identity does not establish business authority.

## Selection and installation

Default: the host's already authenticated WorkIQ tools. Inspect their current
schemas and actual returned identities/excerpts. There is no invented raw WorkIQ
response mapping: the host fills the handoff from what it actually observed.
Keep grounding citation markers separate from source IDs/URLs. Generated
grounding synthesis is not automatically an original document excerpt.

For another connector, the operator installs/configures it through that host's
normal procedure, outside this plugin. The user explicitly selects its adapter
ID, scope and exposed retrieval tool. Use `examples\adapter-template.mjs` as a
normalization example, not an automatically loaded executable. It imports no
SDK and makes no network requests. If the actual response does not expose a
required field, preserve unknown/metadata-only/unavailable or block; never guess.
Explicitly selected Marketing IQ agent allow-lists may not expose that connector.
Instructions cannot change permissions; the workflow must report missing capability.
There is no registry, dynamic code loader, plugin authentication service or
silent fallback. Do not install example code as a tool without operator review.

Run from the workspace:

```powershell
node <MIQ_SHARED>\scripts\portable\cli.js check
node <MIQ_SHARED>\scripts\portable\cli.js evidence --adapter workiq
```

`evidence` reads bounded strict UTF-8 JSON on stdin (256 KiB). Use the host's
safe data-only transport for the exact current result; do not interpolate
source text into a shell command or save enterprise bodies as sample files.
No safe transport means blocked processing, not a fabricated helper pass.

## Closed handoff schema

Root: `schemaVersion: 1`, `adapterId` (lowercase kebab label), `outcome`
(`ok|denied|unavailable|unsupported`), `scope`, `sources`. Non-ok outcomes require
empty sources and block. `scope` has exactly `kind` (`exact|container`) and `url`
(selected HTTPS resource/boundary). Credentials, fragments, unresolved encoded
separators and traversal are not permitted.

Each source has exactly:

| Field | Meaning |
| --- | --- |
| sourceId, sourceUrl | Observed unique identity and unchanged HTTPS resource URL, not a citation marker or invented title link |
| sourceKind | sharepoint, document, email, meeting, seismic or local-file; channel/content kind, not inferred authority |
| evidenceKind | document-excerpt, message-excerpt, transcript-excerpt, meeting-summary, metadata-only or none |
| coverage | partial-body, metadata-only, unavailable or excluded-over-limit |
| retrievedThisSession | A matching result actually observed in this evaluation, not assumed because a file exists |
| body | Original current excerpt text for partial-body; null otherwise; no generated summary promoted to source text |
| versionId, locator | Observed native values, otherwise null |
| restrictions | Exactly access (allowed/denied/unknown), usage (internal-review/prohibited/unknown), sensitivityLabel (observed string or null) |
| provenance | Exactly tool (actual tool name), observedAt (explicit-zone ISO instant), currentResponse (boolean), locationUrl (observed containing location HTTPS URL or null) |

For exact scope, the unchanged source URL must equal the selected URL; resolve
alternate resource URLs through the connector before this handoff. Container
scope compares origin and whole path segments of the observed location. A
SharePoint Doc.aspx GUID alone is NOT folder membership; resolve its parent
through bounded actual metadata calls or leave location unknown and exclude it.
Do not infer a containing folder from title/topic. Identity resolution is the
adapter's responsibility, not permission to expand scope.

Partial bodies require a current matching result and excerpt evidence kind.
Metadata-only requires a current matching result but supplies no factual body.
Unavailable requires `none`, false and null body. Access denied/unknown,
prohibited usage and wrong scope are excluded with explicit reasons. Unknown
usage/sensitivity remains a visible internal-review limitation, not an external
use grant. At most three admissions, 20,000 characters per body and 60,000 total;
over-limit bodies are excluded, never silently truncated. These limits do not
reset on adapter changes. The shared skill retains the retrieval-call ledger.

Output contains canonical source rows, admitted original passages, retained
provenance/restrictions and proof gaps. No admitted body means blocked.
The host must pass ALL of these limitations into the canonical answer/review
context, and use version/locator only from the joined source provenance.
The helper cannot prove that an adapter told the truth, enforce a remote
permission system, or perform the independent semantic review. Current response
flags are assertions to check against actual tool observations.

## Explicit synthetic example

```powershell
node <MIQ_SHARED>\scripts\portable\cli.js local-file --file <MIQ_SHARED>\examples\synthetic-evidence.json
```

This reads only the explicitly named bounded handoff file. It accepts the
`local-file` adapter, `local-file-read` provenance, `local-file` source kind and
fictional `.invalid` URLs. The output always discloses synthetic data, not live
enterprise retrieval or approval. Reading a snapshot now does not make its
claims current enterprise evidence. Never use this mode after a denied connector
request. The sample supports testing instructions/output mechanics only.

## Compatibility boundary

Hosted canonical11 adds `document` and `local-file` source kinds without changing
its eleven fields. Review preflight and diagnostic export accept these values.
Legacy C# ApplicationHost/LocalWorkflow are separate opt-in paths; their contracts
and authenticated integration readiness are unchanged.
