# Marketing IQ portable hosted workspace 0.2

For native Copilot plugin installation, use `MarketingIQ_Plugin.md` in this
directory. The archive workflow below remains a separate workspace-bundle option.

Marketing IQ helps a marketer assess a Launch decision and draft a Field
invitation, exactly three talk points and follow-up. The AI work stays in the
existing host. The shipped Node helpers validate evidence handoffs, provide
static routing metadata, preserve confirmed direction and check/export results.
They are not a new AI application, connector authentication service or publisher.

## Prerequisites and installation

Consumers need an accessible **Node >=22.18.0** executable and an AI host that
supports the included agent/skills, safe data-only helper input, a writable
session artifact directory and a separate independent-review tool. For live
evidence, that context needs an already installed/authenticated connector
(WorkIQ by default), permission to the selected sources and complete-result
access. Node being internal to a host is NOT proof that the `node` command exists.

No .NET runtime/SDK, TypeScript compiler, npm install or developer dependency is
needed to run the bundle. A connector's own prerequisites remain its operator's
responsibility; this bundle does not install or authenticate one.

The current 0.2.0 source is unreleased. After an authorized release, extract
`marketing-iq-workspace-0.2.0.tgz` into a **new empty directory** using
your archive tool (the archive has a `package` top-level directory). Open that
`package` directory as the workspace. Do not extract over an existing workspace
or replace user settings. Existing workspaces must explicitly merge the
allowlisted files after inspecting conflicts. The archive's SHA-256 receipt is
adjacent to it; it proves bytes, not trust in the author.

Canonical instructions live in `.github\skills` and `.github\agents`; ordinary
workspace routing is `.github\copilot-instructions.md`. Intended mapping:
GitHub Copilot workspace skills/custom agent. This is a workspace bundle, not
a registered `/plugin install` package, global user install, or a claim that
Claude/another host loads `.github` automatically. Other hosts need their native
mapping and a separate discovery/invocation check; do not overwrite their settings.

In the new workspace:

```powershell
node .github\skills\marketing-iq\scripts\portable\cli.js check
node .github\skills\marketing-iq\scripts\portable\cli.js context --use-case launch-decision
```

`check` confirms the local executable version, not host discovery or authentication.
In a fresh host context, separately inspect its skill/agent listing, select this
version and exercise it. File/archive presence, host listing and successful
invocation are different observations. Missing capabilities stay explicit;
do not launch another actor or change permissions to evade a selected context.

## Evidence inputs

Read `.github\skills\marketing-iq\references\adapters.md`.
Default WorkIQ uses existing host tools with scoped SharePoint documents and
relevant Email/Meetings. Another user can install their own host connector,
explicitly select an adapter ID and normalize observed results to the closed
handoff contract. `examples\adapter-template.mjs` is the minimal no-SDK mapping
example; no code registry or arbitrary module execution is involved.

```powershell
node .github\skills\marketing-iq\scripts\portable\cli.js local-file --file .github\skills\marketing-iq\examples\synthetic-evidence.json
```

This sample is fictional and opt-in only. It cannot demonstrate live
authentication, source currency, product truth or semantic review. Never use
it as fallback for a denied connector. Provider-neutral processing preserves
scope, exact quotes, original excerpts, restrictions, unknowns and cumulative
source/call limits. A model/adapter's field assertions must still be checked
against actual tool observations.

The packaged SharePoint route registry is intentionally empty: this workspace's
private tenant mappings are not redistributed. Supply an explicit source URL
or maintain your own route entries using the existing closed registry format.
No private sources, decisions, captures, machine hooks or credentials are bundled.

## Optional context, planning and extensions

The shared instructions load detailed connector/evidence/presentation/review
procedures only on their stated branches. Optional project briefs, customer
research, focused edits and feedback have their own shared references/templates.
A brief is user context, not admitted evidence, accepted direction or a memory
fallback. A native data-only writer and specific approval are required to save;
otherwise the result stays unsaved.

`marketing-iq-campaign-planning` is a separate six-section Markdown workflow
using the current user brief, without retrieval or automatic export. Its event/
channel/measurement proposals are not readiness verdicts or observed performance.
Mixed requests select Launch first, then Field, then planning and disclose what
is deferred. Existing Launch/Field schemas are unchanged.

The optional extension catalogue records pinned full skill trees and integration
cautions. No third-party skill, executable or connector is installed by the
bundle. See `references\optional-extensions.md` before any scoped installation.

## Launch to fresh-session Field

1. In the host, supply a Launch brief and explicit source scope/adapter. For
   example, select the synthetic fixture and ask for Harbor's internal-preview
   assessment. Keep every synthetic claim labelled; this is not a live evaluation.
2. Review the proposed audience, proposition and limitations. Save intent only
   starts preparation. The assistant previews the exact record, four scope keys,
   timestamps, version and supersession effect. Only your confirmation of that
   final record authorizes publication to the local **decision store**, not
   external marketing publication.
3. The assistant sends the closed publish request on safe stdin to
   `node .github\skills\marketing-iq\scripts\portable\cli.js decisions --store-root local-data\launch-decisions`.
   Accepted direction is separate from canonical diagnostic answers and source bodies.
4. Open an independent host session in the same workspace. Give a current Field
   brief with the same product/topic/audience/geography and source scope, not
   old chat or a decision ID. The assistant performs scoped read-only discovery
   with `decisions --store-root local-data\launch-decisions --read-only`.
   It compares the selected record to the current intended activity, retrieves
   current evidence, then drafts an invitation, exactly three points and follow-up.

No record means a current proposal is needed; ambiguous scope requests only the
missing keys. Multiple current alternatives require a choice. A matching record
is not proof of product eligibility or permission to publish.

Decisions retain the C# record schema and lifecycle: exact replay is unchanged,
changed content under an existing identity conflicts, future successors do not
hide current direction early, withdrawal does not resurrect superseded direction,
and corrupt stores fail closed. Do not run C# and Node writers against one store
concurrently: their locks are different. An interrupted Node lock is not
automatically stolen. See `references\decision-tools.md` for operator recovery.
Store safety assumes cooperative same-user processes, not a hostile concurrent
filesystem writer or a distributed/network-filesystem lock service.
Windows stores must use ordinary local drive paths, not UNC/device paths,
alternate streams or trailing-dot/space aliases that could split lock identity.

Review packet checks are mechanical, not independent semantic review.
`Test-ReviewPacket.mjs` and `Save-ResultArtifact.mjs` are shipped with their
references. A fresh separate reviewer must inspect the exact answer/readable
pair, original admitted passages and restrictions under the shared instructions.
The CLI cannot simulate that by printing "pass".

## Developer build and verification

In the source workspace only: `npm ci --ignore-scripts`,
`npm run check:generated`, `npm test`, then
`npm run package`. TypeScript builds into the shipped `scripts\portable` folder;
runtime imports are Node built-ins only. `package-lock.json` pins build dependencies.
The package builder uses an explicit allowlist and emits an archive and SHA-256.
Root package version is the source for generated runtime/plugin metadata.
Check mode builds into a temporary directory and never repairs drift; tests
regenerate artifacts, so check committed output before running them.
`npm run test:package` builds the archive, extracts it into a fresh temporary
directory and runs the synthetic helper journey from the relocated files.
Optional developer-only `npm run test:parity` compares synthetic lifecycle and
timestamp results against the existing built C# decision executable. That
comparison needs its .NET runtime/build artifact; consumers and the ordinary
Node/package checks do not.

The C# ApplicationHost and optional Node/.NET LocalWorkflow remain legacy,
separate paths with their existing unresolved integration gates. They are not
required for this supported hosted journey and were not rewritten.

Synthetic process-level verification is not proof of fresh-host skill discovery,
actual model review, authenticated live retrieval or publication approval.
