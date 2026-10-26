# Marketing IQ plugin

Marketing IQ helps you assess launch readiness, choose an audience/proposition,
and draft an invitation, exactly three talk points and a follow-up. It produces
evidence-qualified **internal review drafts**, not publication approval.

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

The repository supplies `.github\plugin\marketplace.json`. Its local-path
registration, catalog discovery and marketplace-name installation were exercised
with Copilot CLI 1.0.103 in an isolated CLI home. The CLI reported a live local
link, not a remote download. Access to this private repository is still required
for remote registration; that path must be verified separately.

The earlier direct repository install
(`copilot plugin install stephen-maina/marketing-iq:plugins/marketing-iq`)
was exercised with CLI 1.0.98, which warned that direct installs were deprecated.
Prefer the marketplace path or the clone-and-load alternative below.

Start the last command in the workspace where you want to keep your decisions,
not the installed plugin directory. In an interactive session, `/agent` lets
you check/select the Marketing IQ agent; `/skills list` shows its three skills.
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
`copilot plugin update marketing-iq`; a locally installed copy must be installed
again after rebuilding. `--plugin-dir` loads its directory without installing.
A marketplace catalog is supplied; no MCP server, sign-in service or background
daemon is added.
The plugin agent is namespaced as `marketing-iq:marketing-iq`; the bare
`marketing-iq` name is for the workspace agent, not this native installation.

## Give it a source and a task

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
npm test
npm run test:plugin
```

`npm run build:plugin` compiles the existing Node helpers and generates only
allowlisted native components, rewrites asset-path notation for installation,
and substitutes an empty source registry. It leaves decision stores relative
to the consumer workspace. Run the existing alternative workspace archive
checks with `npm run test:package`.

Developer tests check deterministic helper/package behavior; they are distinct
from fresh-model demonstrations. The optional C# parity suite needs the legacy
executable and is not a consumer or ordinary Node test prerequisite. This
private repository grants no additional redistribution rights.
