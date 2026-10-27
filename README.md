# Marketing IQ

A GitHub Copilot CLI plugin for marketers working on launch decisions, audience
and positioning choices, event communications and campaign plans. Bring your
brief and an approved source; Marketing IQ helps distinguish supported claims
from missing evidence and produces **drafts for internal review**.

| Your task | What Marketing IQ produces |
| --- | --- |
| Assess launch readiness or compare audiences/propositions | An evidence-qualified recommendation, trade-offs and gaps |
| Prepare event communications | An invitation, exactly three talk points and a follow-up |
| Plan a campaign, event sequence or measurement approach | A planning proposal based on your supplied brief, with unknowns left explicit |

**Pilot status:** version 0.2.0 is available in source, without a tagged release.
Installation and helper checks are not proof of a complete live marketer journey.
Connector access, safe evidence handling and reviewed delivery must be established
in your selected host. Actual marketer acceptance remains pending.

## 1. Before you install

You need:

- GitHub Copilot access and a signed-in Copilot CLI that supports Agent Plugins
  1.0. The documented marketplace commands were exercised with CLI 1.0.103.
- Node.js **22.18.0 or later**, available in the same terminal as Copilot.
- For evidence-backed tasks, an approved compatible connector and permission to
  read your chosen sources. WorkIQ is the default, but is not included.

Check the executables:

```powershell
copilot --version
node --version
```

Consumers do **not** need npm installation, a TypeScript compiler or a .NET
SDK/runtime. The JavaScript helpers are already included. Repository access,
Copilot access and permission to read company data are separate.

## 2. Install the plugin

Run these commands in your terminal:

```powershell
copilot plugin marketplace add stephen-maina/marketing-iq
copilot plugin install marketing-iq@marketing-iq-plugins
copilot plugin list --json
```

Review any normal installation prompts. The last command should list
`marketing-iq`; it confirms installation, not connector access.
You do not need to clone the repository or copy its `.github` directory.

Open the folder where you want to work on your campaign, then start a new session:

```powershell
copilot --agent marketing-iq:marketing-iq
```

Use `/agent` to check the selection and `/skills list` to inspect the discovered
skills. The plugin ships four: `marketing-iq`, `marketing-iq-launch-decision`,
`marketing-iq-field-activation` and `marketing-iq-campaign-planning`.
The namespaced agent above selects the plugin; bare `marketing-iq` selects a
workspace agent. If multiple copies exist, check their reported origins rather
than assuming the installed copy is active.

## 3. Choose your source

For launch and communications tasks, name your connector and an approved folder,
document or other bounded source in the request. If you omit them, the agent asks
for what it needs. Do not paste credentials or sharing tokens.

**WorkIQ:** your administrator must configure and authenticate a compatible
WorkIQ connector and expose it to the selected agent. `/mcp` lets you inspect
connector setup; a listed server does not prove that this agent can retrieve
your documents. There is no bundled tenant, SharePoint folder or company data.

**Other connectors:** clients can supply their own reviewed adapter and agent
profile. A connector retrieves the data; an adapter maps the actual response
into Marketing IQ's evidence contract. Merely naming an MCP server or copying
a profile does not make an incompatible response usable.

Administrators can use the [client-profile guide](.github/skills/marketing-iq/references/client-profiles.md),
the [WorkIQ profile template](.github/skills/marketing-iq/examples/marketing-iq-workiq.agent.md)
and the [adapter contract and examples](.github/skills/marketing-iq/references/adapters.md).
The WorkIQ template targets the hosted retrieve/fetch contract, not every WorkIQ
distribution. Marketers do not need to write a profile for every task.

## 4. Give it a brief

Replace the bracketed placeholders below with your own approved context. These
are prompt templates, not product evidence or claims of successful execution.

### Assess a launch or compare approaches

> Using WorkIQ and only [approved source folder], assess [product/topic]
> readiness for [audience] in [geography]. Compare a readiness briefing with a
> product demo. Our objective is [objective], and attendees should leave able
> to [desired action]. Explain the recommendation, trade-offs and missing
> evidence. Leave the result unsaved.

Review the recommendation and gaps. If you want to retain the direction, request
a save. The agent must preview the exact record, scope and replacement effect
and obtain confirmation before writing. Where the host supports the operation,
accepted records live in your working folder's `local-data\launch-decisions`,
not the plugin cache.

### Draft an invitation, talk points and follow-up

> Using WorkIQ and only [approved source folder], draft an invitation, exactly
> three talk points and a follow-up for [topic], [audience] and [geography].
> Use this current proposal: [format, objective and desired attendee action].
> Keep the tone [tone] and invitation under [word limit]. Leave unknown event
> details as placeholders and do not send anything.

You can instead request an applicable accepted direction in a fresh session in
the same working folder. The agent checks saved records; it does not assume that
an earlier chat is accepted direction. Both routes still require admitted evidence.

### Plan a campaign without retrieving sources

> Using only this brief, propose a campaign plan for [topic] aimed at [audience].
> Our objective is [objective], the desired action is [action], the available
> channels are [channels], and our constraints are [timing/resources].
> Include before/during/after activities, deliverables and a measurement plan.
> Treat this as planning context, not verified product facts. Leave unknown
> baselines, targets and results unknown.

This separate planning route does not need a connector for a user-brief-only
proposal. It does not verify readiness or replace the evidence-backed invitation
workflow. Ask for one main deliverable at a time; mixed requests prioritize Launch,
then Field communications, then planning.

## 5. Review and refine

Give concrete feedback: which decision the draft helped, what wording needed
editing and whether the proposed next action fits your audience. Ask for focused
edits rather than supplying unsupported claims.

Launch and Field results require independent model review, which is **not**
human acceptance or permission to publish. The plugin does not send invitations,
publish content, grant source permissions or invent evidence.

Preferences are optional and host-dependent. If a permitted remembered choice
is available, the agent confirms it before reusing it for retrieval. Where native
memory or the requested scope is unavailable, choices remain session-only.
Private source addresses and accepted direction are not preference memory.

## Updates and troubleshooting

To update the installed marketplace plugin, then start a fresh session:

```powershell
copilot plugin update marketing-iq@marketing-iq-plugins
copilot --agent marketing-iq:marketing-iq
```

| What you see | What to do |
| --- | --- |
| `copilot` or `node` is not found | Install the required executable through your approved setup process and reopen the terminal. |
| Plugin or skills are missing | Check `copilot plugin list --json`, restart and inspect the selected agent and skill origins. |
| Connector tools are unavailable or incompatible | Ask your administrator to check the selected profile's actual tools and response contract; plugin installation does not configure them. |
| An instruction read or source operation is denied | Stop that operation and report its nonsecret path/scope and error classification to the administrator. Do not bypass the denial. |
| Evidence transport, review or saving is unavailable | Treat the reported host capability gap as unresolved. Do not put source bodies into shell commands or manufacture evidence files. |

The packaged agent does not request a native data-only file writer or memory
writer. File-input helpers alone cannot supply those capabilities. The historical
installed-agent denial describes one configuration, not proof that every current
installation fails. See the [host acceptance guide](docs/integration/MarketingIQ_Host_Acceptance.md)
for setup checks and a real-input pilot.

## More information

- [Detailed installation, setup and usage guide](docs/integration/MarketingIQ_Plugin.md),
  including clone-and-load and client-owned profiles.
- [Optional marketing extensions](.github/skills/marketing-iq/references/optional-extensions.md):
  a curated catalogue and reviewed installation handoff for selected
  `coreyhaines31/marketingskills` skills. They are not bundled or automatically
  installed; runtime compatibility is unverified.
- [Demonstrations and evidence limits](docs/integration/MarketingIQ_Plugin_Demonstration.md).
- [Change history](CHANGELOG.md).

## For developers

Canonical instructions are in `.github\skills` and `.github\agents`.
`plugins\marketing-iq` is generated; do not edit it directly.

```powershell
npm ci --ignore-scripts
npm run check:generated
npm test
npm run test:plugin
npm run test:package
```

After canonical changes, run `npm run build:plugin` and commit the matching
generated assets. Developer checks are separate from real marketer acceptance.
See the detailed guide for release preparation. No open-source license is
currently included.
