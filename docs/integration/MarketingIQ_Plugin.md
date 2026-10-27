# Marketing IQ plugin

Marketing IQ helps you assess launch readiness, choose an audience/proposition,
and draft an invitation, exactly three talk points and a follow-up. It produces
evidence-qualified **internal review drafts**, not publication approval.
The 0.2.0 source also adds a separate campaign/event/measurement planning
companion, optional project briefs and a curated extension catalogue.
This version is unreleased; installed copies do not change when source is edited.

## Install and start

Requirements: GitHub Copilot CLI with Agent Plugins 1.0 support, an accessible
Node >=22.18.0 executable, and access to this private repository. Running the
plugin needs no npm install, TypeScript compiler or .NET runtime/SDK.
Your GitHub account must separately have access to the repository and Copilot.

```powershell
copilot plugin marketplace add stephen-maina/marketing-iq
copilot plugin install marketing-iq@marketing-iq-plugins
copilot plugin list --json
copilot --agent marketing-iq:marketing-iq
```

The repository supplies `.github\plugin\marketplace.json`. Both local-path and
private remote registration, catalog discovery and marketplace-name installation
were exercised with Copilot CLI 1.0.103 in isolated CLI homes. Local registration
produced a live link; remote registration produced an installed copy. The three
skills then shipped were discovered from that installed cache, and downloaded helpers ran
without npm restore. Access to this private repository is still required.
An invocation from the remote-installed copy also produced the expected
missing-exposed-connector guidance; it did not retrieve live SharePoint content.

The earlier direct repository install
(`copilot plugin install stephen-maina/marketing-iq:plugins/marketing-iq`)
was exercised with CLI 1.0.98, which warned that direct installs were deprecated.
Prefer the marketplace path or the clone-and-load alternative below.

Start the last command in the workspace where you want to keep your decisions,
not the installed plugin directory. In an interactive session, `/agent` lets
you check/select the Marketing IQ agent; `/skills list` shows discovered skills.
The current source ships four: shared, Launch, Field and campaign planning.
Restart an existing session after installation. Check the selected component's
location if a workspace or personal copy has the same name; installation alone
does not prove which copy a session selected.

Alternatively, clone and load the ready-to-run plugin:

```powershell
gh repo clone stephen-maina/marketing-iq
copilot --plugin-dir .\marketing-iq\plugins\marketing-iq --agent marketing-iq:marketing-iq
```

Run that command from your own working folder, adjusting the plugin directory
to the clone's actual location. Compiled JavaScript is committed for consumers.
Updating an installed plugin uses
`copilot plugin update marketing-iq@marketing-iq-plugins`; this fetches and
installs an update, so run it only for the intended approved source. A locally installed copy must be installed
again after rebuilding. `--plugin-dir` loads its directory without installing.
A marketplace catalog is supplied; no MCP server, sign-in service or background
daemon is added.
The plugin agent is namespaced as `marketing-iq:marketing-iq`; the bare
`marketing-iq` name is for the workspace agent, not this native installation.

For setup-only inspection, read the discovered installed instructions first.
The optional `Inspect-Installation.mjs` in the shared skill's scripts directory
checks the fixed installed entrypoints against `installation.json`. It reports
version and hashes, not publisher authenticity, discovery, tool exposure,
authentication or live source access. It is not a workaround for a denied read.
On October 27, 2026 a clean-consumer selected-agent setup run stopped at the
generated shared SKILL.md with **Sandbox policy denial**. The CLI administrator
must resolve that exact denied path through supported setup before repeating
the selected-host journey. See `MarketingIQ_Host_Acceptance.md` in the source
repository for the protocol and exact observation.

## Give it a source and a task

For client-owned connector configuration, see the installed shared skill's
`references\client-profiles.md`. We maintain the template; client administrators
review and own their local profile, connector setup and access. The included
`examples\marketing-iq-workiq.agent.md` can be copied to the client's
`.github\agents` and selected as `marketing-iq-workiq`; it reuses the installed
skills without invoking the packaged agent. It targets the existing hosted
WorkIQ retrieve/fetch contract, not every WorkIQ distribution. Profile discovery
alone does not prove compatible tools or live access.
Updating the plugin does not update this independent client copy. Review/merge
the new example's routing and contracts into a customized profile; do not
overwrite its approved tools or replace it automatically.

There is no hidden tenant or source folder. Supply the source location in your
message, together with the task:

> Using WorkIQ, assess Harbor's internal-preview readiness for service owners
> in Europe. Use only this source folder: https://your-tenant.example/sites/Harbor/Planning.
> Compare a readiness briefing with a product demo.

WorkIQ must already be installed, authenticated and exposed in that selected
agent context. A URL establishes scope, not access or authority. The default
uses scoped SharePoint documents, with relevant Email/Meetings context only when
needed. Packaged source routes are intentionally empty; private mappings are
not redistributed. Ordinary users can supply a URL without editing any files.

Before selecting a route, the agent inspects the tool names and schemas actually
exposed by its host. WorkIQ is a preference, not a hardcoded tenant or proof of
availability. Without an explicit connector choice, a unique exposed compatible
connector can be selected; ambiguous choices require clarification. No compatible
exposed tool produces setup guidance, not a claim that a server is uninstalled.
Use your host's normal connector setup and authentication, ensure the selected
agent can access it, then start a fresh session and retry the same source scope.
This does not authorize a provider switch after a selected route fails or denies
access.

For another connector, install/configure it using your host's normal procedure,
then explicitly name the adapter ID, exposed retrieval tool and source scope.
The connector retrieves; an adapter maps its **actual observed** results to the
closed handoff in `skills\marketing-iq\references\adapters.md`. Marketing IQ
admits the evidence, reasons over it, and requests a separate model review.
`examples\adapter-template.mjs` is a no-network mapping example, not a connector
installer or executable registry. The selected Copilot agent's allow-list may
not expose your custom connector: report that gap, or have the operator provide
an explicitly reviewed host-native configuration. Never bypass a denial.

For a concrete alternative, `examples\github-contents-adapter.mjs` maps a
documented GitHub Contents API file response plus an explicit tool/scope
observation to the same handoff. Its companion fixture is visibly synthetic.
See `references\adapters.md` for the input contract and stdin invocation. This
example does not install a GitHub connector or establish live retrieval.

To try the fictional included example instead of connecting enterprise data:

> Explicitly use the bundled synthetic local-file example, not WorkIQ or live
> sources. Assess Harbor readiness for service owners in Europe and propose a
> readiness briefing. Keep the result labelled synthetic and leave it unsaved.

The agent resolves the example and helpers from the installed skill's location.
You do not need to copy `.github` into your workspace. The local-file example is
synthetic only, not general ingestion of arbitrary production files.

## Interaction and saved direction

### Source intake and optional preferences

If you have not chosen a source or connector for the current task, Marketing IQ
asks which folder/document/path or connector/MCP server to use. You need not
supply both or know exact tool names. A location still needs a compatible exposed
connector; naming a connector alone does not authorize an unrestricted search.
For a topic-only request, the plugin offers bounded discovery for confirmation.

When the host actually supplies an eligible remembered selection, the plugin
shows it and asks whether it is sufficient for this request before retrieving.
A current explicit choice takes precedence without a redundant confirmation.
Clarifications retain the active task's confirmed choices and consumed budgets.

Explicit reusable preferences may be saved using the CLI's native memory tools
only when those tools, the requested scope and the content are permitted. The
plugin asks whether an ambiguous preference is project-specific or user-wide;
it never silently broadens the scope. Private source addresses, credentials,
identity-bearing paths, source evidence and accepted direction are not stored
as preference memory. A safe connector preference does not remember its folder.

Copilot CLI's `/memory` command manages memory status/enablement; it is not a
plugin write API. If native writing is unavailable, disabled or cannot support
the requested scope, Marketing IQ reports that limitation and uses session-only
choices. The packaged agent and example WorkIQ profile do not request a native
memory writer. The plugin does not change permissions, enable memory, install a
memory service or maintain a fallback preference file.

A save receipt, later host-supplied recall and confirmation for today's task are
three separate observations. Saving never proves future automatic recall.
See the shared `references\source-preferences.md` for the complete contract and
GitHub's [Copilot Memory documentation](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory)
for current host behavior and account controls.

### Accepted direction

For Launch, review the recommendation and evidence gaps. Choosing "save" starts
preparation, not a write. The agent shows the exact direction, scope, validity,
ID/version and replacement effect; only your confirmation permits saving.
Records live in your working folder's `local-data\launch-decisions`, not the
plugin cache. Source bodies and whole assessments are not saved there.

In a fresh session in the same workspace, ask for an invitation using your
accepted direction and give the product, topic, audience, geography and current
source. The agent discovers an applicable record through the decision helper;
it does not scan previous conversations. A current proposal also works without
a saved record. Unknown event logistics become placeholders. No direction or
no admitted evidence produces an explicit blocker, not invented copy.

Readable answers and session-local canonical diagnostic JSON are separate from
saved direction. Diagnostics, when the host supports their safe creation, do
not approve or accept anything. Independent model review is likewise not
product, execution or publication approval.

## Brief context and marketer feedback

You can add your objective, desired attendee takeaway/next action, tone, language,
brand terms and channel/length constraints to the same brief. These are optional
instructions, not product evidence; unknown details need not trigger a long form.
The workflow targets decision-relevant evidence questions, separates planning
and positioning from product proof, and does not count equivalent DOCX/PDF copies
as independent corroboration. Three admitted sources remain the limit.

An optional user-selected project brief uses the installed shared skill's
`examples\marketing-brief.template.json` and `references\marketing-context.md`.
Its schema version and user revision are different; confirmation makes it
project context, not product truth or accepted direction. Preview the exact
destination, revision and delta before any permitted native data-only save.
Without that writer, leave the brief unsaved; do not create a shell-based
fallback or treat it as CLI memory.

Customer research distinguishes independent participants/accounts from document
counts and preserves contradictory signals. Focused edits retain unaffected
wording and the user's voice. Unsupported claims get the strongest supported
alternative plus the precise missing proof, not invented guarantees.

The plugin also supplies `marketing-iq:marketing-iq-marketer`, a read-only AI
domain adviser. A coordinator supplies the actual brief, exact proposed/delivered
copy and original admitted passages inline, following the shared skill's
`references\marketer-review.md`. The adviser reports evidence accuracy and
marketing usefulness separately and suggests impact-ranked changes. It cannot
retrieve, save, send or approve, and it does not replace independent semantic
review. Suggested edits require the normal review before delivery.

Actual marketer feedback still matters: record what decision the result helped,
what needed editing and what response would show the CTA worked. A manually
observed response is different from a proposed measure; AI review is not human
acceptance, demonstrated time savings or campaign success.
`examples\marketing-feedback.template.json` separates proposed measures from
actual feedback/results. It is a blank template, not a success report or an
automatic memory write. Promote a lesson only after verifying its scope and
reviewing the relevant regression.

## Campaign and measurement planning

Ask for a campaign, event sequence, channel deliverables or measurement plan
using your current brief. The planning companion produces a six-section
**internal planning proposal**, not a Launch readiness decision, Field
canonical result or publication approval. It does not retrieve sources or
automatically save/export. Missing event details and measurement values remain
unknown; proposed targets are not actual outcomes.

For a mixed request, Launch readiness takes precedence, then Field copy, then
planning. Deferred deliverables are stated rather than silently dropped.
Evidence-backed claims or accepted-record discovery use the existing Launch/
Field workflow separately. Planning has no JSON-only contract.

## Optional extensions

The shared skill's `references\optional-extensions.json` lists five optional
upstream choices: copywriting, customer-research, events, analytics and
ab-testing. Each records its purpose, immutable revision, complete skill assets,
operational requirements and adaptation cautions.

They are **not bundled or installed**, and runtime compatibility is unverified.
`references\optional-extensions.md` explains exact-scope approval, complete-tree
inspection, license/notices, project-scoped installation, shadowing checks and
separate real-task acceptance. A referenced tool or MCP server is not provided
by copying a skill. Do not bulk-install the collection or use extensions to
override Marketing IQ's evidence, output, review or approval contracts.

## Safe packet files

Hosts with an already permitted native data-only file writer can stage a review
packet in session storage, read it back, then use these file inputs:

```powershell
node "<shared-skill>\scripts\Test-ReviewPacket.mjs" --packet-file "<absolute-packet.json>"
node "<shared-skill>\scripts\Save-ResultArtifact.mjs" --directory "<session-files>" --packet-file "<absolute-final-reviewed-packet.json>"
```

The export validates the whole packet and writes only its canonical candidate;
it does not replace the separate semantic reviewer. See
`references\packet-transport.md` for staging, exact review pairing and read-back.
Do not embed source or draft bodies into shell commands to manufacture stdin.
The selected native Marketing IQ agent's current tool profile has no native file
writer. File-input support does not remove that host capability limit, and the
plugin does not broaden permissions to hide it.

## Hosts and limits

This distribution uses Agent Plugins 1.0: portable `skills` and a Copilot-specific
agent in `com.github.copilot\agents`. Copilot CLI is the exercised host.
Another Agent Plugins-compatible host may load the skills, but its tool mapping,
safe input transport, separate reviewer and invocation must be verified there.
Do not assume another CLI loads the Copilot-specific agent.

The plugin does not install/authenticate connectors, grant access, guarantee
model compliance, send invitations or publish marketing material. It cannot
turn synthetic evidence into live product truth. See
`docs\integration\MarketingIQ_Plugin_Demonstration.md` in the source repository
for actual model-run results and remaining gaps. Remote installation, clean
consumer skill discovery and downloaded Node helper execution were exercised
separately; these do not establish live connector access or model compliance.

## Development

Canonical instructions remain in `.github\skills` and `.github\agents`.
`plugins\marketing-iq` is generated: do not edit those copies directly.

```powershell
npm ci --ignore-scripts
npm run check:generated
npm test
npm run test:plugin
npm run test:package
```

`npm run build:plugin` compiles the existing Node helpers and generates only
allowlisted native components, rewrites asset-path notation for installation,
and substitutes an empty source registry. It leaves decision stores relative
to the consumer workspace. Run the existing alternative workspace archive
checks with `npm run test:package`.

`npm run build` generates runtime JavaScript and version metadata from the root
package version. `npm run check:generated` compiles in a temporary directory and
compares the runtime and native plugin without repairing drift. Run it before
tests, since their build steps regenerate outputs. Canonical edits require
`npm run build:plugin`; commit the matching generated assets with those edits.

The Windows/Linux validation workflow pins its Node/actions versions and runs
the local suites. The release workflow requires a tag matching the package
version, packages the workspace/native plugin with SHA-256 receipts and creates
a draft prerelease for human review. It does not approve a final release or
prove live host operation. Neither workflow has been remotely exercised for
this unreleased change. Update `CHANGELOG.md`, review generated drift, validate
and obtain publication approval before pushing a release tag.

Developer tests check deterministic helper/package behavior; they are distinct
from fresh-model demonstrations. The optional C# parity suite needs the legacy
executable and is not a consumer or ordinary Node test prerequisite. This
private repository grants no additional redistribution rights.
