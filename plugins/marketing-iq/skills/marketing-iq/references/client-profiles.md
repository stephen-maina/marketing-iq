# Client-owned connector profiles

Marketing IQ supplies the shared Launch/Field workflows, evidence contract and
Node helpers. A client profile is a small host-native agent file that requests
the client's approved connector tools and loads those shared workflows. It is
not a connector, authentication client or a separately required plugin.

## Ownership

| Component | Maintainer |
| --- | --- |
| Marketing IQ plugin, shared rules, example profiles and guide | Marketing IQ maintainers |
| Client profile, exact approved tool names and local customizations | Client administrator/developer |
| Connector registration, authentication, consent and source access | Client's host/tenant administrators |
| Task, source boundary and confirmation of a particular saved direction | End user |

We provide a starting profile and can assist onboarding; we do not need to
publish a new plugin for every client. Client IT can provision one reviewed
profile for its users; each marketer need not write YAML. The client must not
put credentials, sharing tokens or private source mappings in a redistributed
profile. Supply source locations in the current request instead.

## WorkIQ example and compatibility boundary

`examples\marketing-iq-workiq.agent.md` is the canonical copyable example,
shipped inside the shared skill. It uses the existing hosted WorkIQ contract:

```yaml
tools: ["read", "execute", "agent", "workiq/retrieve", "workiq/fetch"]
```

These are this project's existing profile aliases, not a promise that every
WorkIQ installation exposes them. The host may display the connector tools as
`workiq-retrieve` and `workiq-fetch`. Inspect the actual names AND schemas in
the selected context. The shared WorkIQ workflow expects scoped grounding
retrieval, channel capabilities, observed source identities/original passages,
and documented metadata fetch operations when required.

An answer-only WorkIQ operation or differently shaped connector is not made
compatible by renaming the frontmatter entries. If those contracts differ,
review the actual response against `references\adapters.md`; a compatible
provider-neutral mapping or workflow integration is additional work, not
implemented by this profile. Never invent missing provenance.

The example retains the existing narrow tool request; it does not add a wildcard,
install WorkIQ, alter MCP configuration, grant consent or broaden permissions.
The host's ordinary approvals still apply. `execute` is not a sandbox; the
profile restricts its use by instruction to existing supported helpers.

## Install the client-owned copy in Copilot CLI

First install Marketing IQ using the main plugin guide. Separately, the client
administrator configures an approved compatible WorkIQ connector through the
host's normal process. Use `/mcp` to inspect the host's connector setup; do not
send configuration files or credentials to the agent.

Find the example through the discovered installed `marketing-iq` skill location,
or use the source clone's
`<MIQ_SHARED>\examples\marketing-iq-workiq.agent.md`.
Do not guess an installed-cache path. Review its contents and actual connector
tool schemas before placing it in the client workspace.

From the client's working folder, copy it without overwriting an existing file
(replace the example source path with the path you actually found):

```powershell
$source = 'C:\path\to\shared-skill\examples\marketing-iq-workiq.agent.md'
$destination = '.github\agents\marketing-iq-workiq.agent.md'
if (Test-Path -LiteralPath $destination) { throw 'Profile already exists; review it instead of overwriting.' }
New-Item -ItemType Directory -Path '.github\agents' -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $destination
copilot --agent marketing-iq-workiq
```

Restart an already running CLI after adding the file. Use `/agent` to check/select
`marketing-iq-workiq` and `/skills list` to inspect skill discovery. The profile
must load the intended plugin's shared and selected workflow skills, not
same-named workspace/personal copies. Its invocation is **not**
`marketing-iq:marketing-iq`, which selects the packaged agent instead.

Copilot also supports user profiles in `~\.copilot\agents`; choose either
project or user scope deliberately. A personal file with the same agent ID
takes precedence over a project file. The filename determines the ID; changing
only `name` does not resolve that collision. The example ID
`marketing-iq-workiq` differs from the packaged `marketing-iq` agent.
No profile is automatically installed into a user's home or workspace by this
plugin. These instructions target Copilot CLI, not every agent host.

## Use and diagnose

Example request (the URL is a placeholder; provide your real approved boundary):

> Using WorkIQ, assess Harbor readiness for service owners in Europe. Use only
> https://your-tenant.example/sites/Harbor/Planning. Compare a readiness briefing
> with a product demo. Leave any recommendation unsaved.

| Observation | Meaning and next action |
| --- | --- |
| Profile not listed | Check file location/ID, collisions and restart; connector access is not yet tested. |
| Shared skill not found | Check plugin installation/discovery; do not copy workflow logic into the profile or guess paths. |
| Retrieval tool not exposed | Report the missing capability. Administrator checks the actual tool name, host registration and reviewed profile exposure; do not assume installation/authentication is missing. |
| Tool exposed but schema incompatible | Stop; inspect the real schema and adapter requirements. A tool-name change alone is insufficient. |
| Actual authentication-required response | Stop that operation; use the normal human-operated host authentication flow. |
| Actual permission denial | Stop the denied operation; do not search another provider or copy to bypass it. |
| Scoped retrieval succeeds | Access is observed for that operation only; source identity, scope, original body, admission and separate review still need checking. |
| Safe packet writer/export unavailable | Disclose the transport/delivery gap; this profile does not add that capability. |

For a different connector, the client creates a differently named copy with
only reviewed actual tools and updates its connector-specific selection and
schema checks. Keep the shared skill composition and all evidence/denial/review
rules. Replacing WorkIQ tool names without adjusting those connector-specific
instructions is not a working adapter. No generator, registry or self-updating
permission mechanism is supplied.

## Updates and validation

The installed example is maintained by us; the copy outside the plugin cache is
client-owned. Plugin updates replace packaged assets, not that independent copy.
Review changes to the example and shared contract before merging them into a
customized profile. Do not edit installed cache files or blindly recopy over
client changes. Recheck profile discovery, selected skill origin and actual
connector schemas after host/connector/plugin updates.

Profile presence and package tests prove only artifact properties. Fresh-context
discovery/invocation, missing-connector behavior and successful live retrieval
are separate checks. Before production use, exercise an approved scoped source
with a compatible connector, verify current in-scope passages and source
identity, then complete admission and independent review. Do not treat a blocked
demonstration or a synthetic fixture as successful SharePoint retrieval.

### Observed checks: October 26, 2026

Copilot CLI 1.0.103 invoked a project-local copy of `marketing-iq-workiq`
in a fresh consumer folder with the generated plugin loaded by `--plugin-dir`.
The host recorded a successful `marketing-iq` skill load and a final blocked
Launch object with empty facts/sections/sources. No retrieval was invoked and
no recommendation was saved. The response reported WorkIQ tools not exposed;
this does not diagnose installation, authentication or source permissions.

Three attempts to read required installed adapter/workflow instructions were
denied by that CLI context's readable-path boundary. The separate reviewer
returned unavailable, not pass. No permissions were changed or alternate
retrieval route used. Thus profile invocation/shared-skill loading were
observed, but complete workflow loading, independent-review success and live
WorkIQ retrieval remain unverified. This was a local generated-plugin check,
not a remote-installed client-profile demonstration.
The run used the initial generated example with the builder's installed-path
header. A subsequent packaging-only correction removed that misleading
read-only-component header from copyable profiles; the profile body is
unchanged. The final header-free artifact passed the package checks but was
not rerun through the model.

Four native-plugin checks and one relocated workspace-package journey passed,
including copying the profile, refusing overwrite and preserving a customized
independent client copy when packaged assets were rebuilt/replaced. These are
artifact/helper checks, not evidence of live connector access.

## Host references

- [Copilot CLI custom agents](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli)
- [Copilot custom-agent configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Copilot CLI MCP configuration](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- [Microsoft Work IQ](https://github.com/microsoft/work-iq) (inspect the selected distribution; its tools may differ)
