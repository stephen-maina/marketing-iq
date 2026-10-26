# Evidence adapters (hosted release 0.1)

An adapter translates a connector's actual current results into a small evidence
handoff. It does not decide launch readiness, accept direction, approve claims or
grant access. Retrieval/authentication remains in the user's host connector.
Marketing IQ processes the handoff with the same Launch/Field rules regardless
of where a document is stored. Provider identity does not establish business authority.

## Selection and installation

Default preference: the host's already authenticated, actually exposed WorkIQ
tools when compatible with the user's scope. Inspect actual callable tool names
and schemas before selecting a provider; use permitted discovery only for
namespaces the host actually offers. A frontmatter tool request or installed
server is not an exposure/authentication receipt. There is no invented raw WorkIQ
response mapping: the host fills the handoff from what it actually observed.
Keep grounding citation markers separate from source IDs/URLs. Generated
grounding synthesis is not automatically an original document excerpt.

Respect an explicit connector choice and retained route. Without either, prefer
compatible exposed WorkIQ; otherwise select one uniquely compatible exposed
connector with a valid handoff, stating the actual tool/adapter before retrieval.
If the choice is ambiguous, ask the user; never infer a schema from its provider
name. A user-supplied scope does not need a maintained route: arbitrary SharePoint
tenant/site/folder/document URLs remain the user's boundary, not a reason to
substitute a default site. A GitHub-only connector does not serve SharePoint.
No provider switch is allowed after denial or a selected-route failure.

For another connector, the operator installs/configures it through that host's
normal procedure, outside this plugin. Retain its selected adapter ID, scope and
actual exposed retrieval tool. Use `examples\adapter-template.mjs` as a
normalization example, not an automatically loaded executable. It imports no
SDK and makes no network requests. If the actual response does not expose a
required field, preserve unknown/metadata-only/unavailable or block; never guess.
Explicitly selected Marketing IQ agent allow-lists may not expose that connector.
Instructions cannot change permissions; the workflow must report missing capability.
There is no registry, dynamic code loader, plugin authentication service or
silent fallback. Do not install example code as a tool without operator review.

**No connector available:** return a blocked result without source facts.
Explain the conditional setup layers: install/add a scope-compatible connector
if absent; configure/enable it if necessary; authenticate through the host's
normal flow only when required; ensure its retrieval/required metadata tools
are exposed to the selected agent. Restart/reload if required by that host, then
reinspect actual tools in the selected context and retry. Do not assume every
step is needed. "Not exposed" is not "not installed", permission
denied or a diagnosis of expired authentication. Incomplete discovery remains
not-verified. Do not inspect configuration/credentials, provision services,
expand tool permissions, launch another actor or use web/shell retrieval as a
substitute. This plugin does not install a connector.

The canonical Marketing IQ agent requests only `read`, `execute`, `agent`,
`workiq/retrieve` and `workiq/fetch`. It does not request arbitrary custom MCP
tools; an alternative available elsewhere in the CLI can remain unavailable in
that explicitly selected agent. Report the context-local limit. Only a separate
operator-reviewed configuration change could expose another connector; do not
perform one during the marketing workflow. Ordinary workspace composition uses
its current host context and does not inherit that profile merely by reading it.

Run from the workspace:

```powershell
node <MIQ_SHARED>\scripts\portable\cli.js check
node <MIQ_SHARED>\scripts\portable\cli.js evidence --adapter workiq
```

`evidence` reads bounded strict UTF-8 JSON on stdin (256 KiB). Use the host's
safe data-only transport for the exact current result; do not interpolate
source text into a shell command or save enterprise bodies as sample files.
No safe transport means blocked processing, not a fabricated helper pass.

## Concrete alternative: GitHub Contents response

`examples\github-contents-adapter.mjs` maps the documented **GitHub REST Get
repository content** single-file response, not arbitrary GitHub MCP output.
It is a reviewed, dependency-free example executable/import, not a connector,
network client or dynamically registered plugin tool. It imports the existing
portable validation modules. Installing Marketing IQ does **not** install,
authenticate or expose a GitHub connector. The operator must separately provide
an already permitted host retrieval operation that returns this API response.
If none exists, report unavailable/unsupported; do not acquire credentials or
change an agent allow-list.

Verified primary schema:
[GitHub Get repository content](https://docs.github.com/en/rest/repos/contents#get-repository-content).
The successful API response supplies `url`, `html_url`, `sha`, `path`, `type`,
`size`, `encoding` and `content`. In contrast, GitHub MCP `get_file_contents`
can return downloaded text/embedded resources rather than that REST object;
the observed download did not supply a reliable HTTPS resource identity.
Do not reconstruct a missing `html_url` from the tool arguments, `repo://` URI,
title or SHA. This example deliberately requires the documented REST shape.
No MCP tool is installed or promised by this example.

### Operator selection and observation envelope

Explicitly select adapter `github-contents`, **one exact GitHub HTTPS file URL**
and the host's actual existing retrieval tool. Container discovery, GitHub
Enterprise origins, directory arrays, symlinks/submodules and generated summaries
are outside this example. Keep the usual cumulative retrieval/source budgets.
The connector operation is:

```text
GET /repos/{owner}/{repo}/contents/{path}?ref={selected-ref}
Accept: application/vnd.github+json
```

Use the configured connector's real schema to supply these parameters. This is
an API contract, not permission to issue an authenticated shell request.
Take the unchanged `html_url` from the current result and compare it with the
user's exact selected scope. A different returned URL is excluded by existing
admission; it does not silently replace the user's selection.

Supply strict UTF-8 JSON on stdin (maximum 256 KiB) with exactly `scope`,
`observation` and `response`:

* `scope`: `{ "kind": "exact", "url": "<user-selected HTTPS file URL>" }`.
* `observation`: exactly `tool` (actual producer tool name), `observedAt`
  (host-recorded explicit-zone instant), `currentResponse` (observed in this
  evaluation), and `outcome` (`ok|denied|unavailable|unsupported`).
  These are host observation assertions, **not fields claimed to exist in the
  API response**. Never manufacture a current observation from a saved file.
* `response`: unchanged successful single-file API JSON for `ok`; `null` for
  every other outcome. Classify failures from actual host observations, without
  copying raw error bodies/headers. An ambiguous 404 is not proof of empty
  scope or permission denial; keep it unavailable unless the connector
  explicitly establishes denial. Missing capability is unsupported/unavailable,
  never `ok` with invented content.

Mapping: `url` → `sourceId`, unchanged `html_url` → `sourceUrl`, `sha` →
`versionId` (blob identity, **not commit identity**), `path` → `locator`.
The adapter checks repository/path consistency between returned native fields.
Base64 `content` is strictly decoded as original UTF-8 text and checked against
`size`; it is not summarized or truncated. Empty/whitespace text and
`encoding: "none", content: ""` yield metadata-only, hence no factual body.
Other encodings or malformed responses reject with `INVALID_ADAPTER_INPUT`.
Over-limit bodies retain the existing exclusion decision. A successful read
establishes observed read access only: usage remains `unknown`, sensitivity is
`null`, source kind is `document`, and containing location is `null`, not an
invented folder. No source authority, publication permission, full-scope
completeness or authenticity is established by this mapping.

### Exact invocation and synthetic rehearsal

The host sends the observation envelope through its permitted **data-only**
stdin transport to:

```powershell
node <MIQ_SHARED>\examples\github-contents-adapter.mjs
```

Then sends its JSON stdout, unchanged, through safe stdin to:

```powershell
node <MIQ_SHARED>\scripts\portable\cli.js evidence --adapter github-contents
```

Or import `githubContentsHandoff(envelope)` from that example and pass its
returned object to the existing evidence helper. Invalid adapter input exits
nonzero with a fixed error code; never replace it with an empty successful
handoff. Retain the admission helper's full output, exclusions and proof gaps.
No safe host transport means blocked processing, not permission to persist
enterprise bodies or place them in shell literals/environment variables.

The following **synthetic-only** rehearsal may read the bundled fixture:

```powershell
Get-Content -Raw <MIQ_SHARED>\examples\github-contents.synthetic.json |
    node <MIQ_SHARED>\examples\github-contents-adapter.mjs |
    node <MIQ_SHARED>\scripts\portable\cli.js evidence --adapter github-contents
```

That fixture is a visibly fabricated captured-response-shaped object, **not an
actual captured connector response**. Repository, text, SHA, tool name and
observation are fictional. Its simulated current flags test the mapping only.
`ready` means mechanical admission of synthetic text; it proves neither live
retrieval nor authentication, current enterprise evidence, semantic review or
approval. Preserve this disclosure in any demonstration. Never feed this
fixture into an actual Launch/Field assessment, or use it after denied access.
No live connector integration was exercised by these tests.

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
