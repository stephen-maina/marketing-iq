# Installed-host acceptance

## What is being checked

Run in a clean consumer directory with no Marketing IQ workspace skills or
agents. Keep the intended plugin at its original installed/discovered path.
Do not relocate denied instructions, change tools, disable instructions/trust
controls, or copy connector configuration to make a check pass.

The following are separate observations:

| Boundary | Evidence required |
| --- | --- |
| Files | `Inspect-Installation.mjs` verifies the generated entrypoint digests and version. It reads only fixed plugin metadata/entrypoints; it does not inspect host settings. |
| Selection | Host-reported agent ID and actual skill paths identify the intended installed copy, not a same-named workspace/personal copy. |
| Instructions | This selected actor successfully reads the applicable instructions. A file digest from another actor is insufficient. |
| Tools | This selected actor discovers the actual callable schemas. Profile names are requests, not exposure. |
| Retrieval | The normal first authorized scoped source request succeeds; no invented health call. |
| Processing | Complete current permitted bytes enter the actual admission and review path. |
| Delivery | Exact reviewed output and an actual export receipt where supported. |
| Utility | An actual marketer evaluates that particular result. |

Hashes identify bytes, not a trusted publisher, host loading or permissions.
The inspector is not a sandbox against concurrent filesystem modification.

## Setup-only protocol

Before any change, freeze a setup-only input and one attempt per configuration.
Record the CLI version, plugin version/digests, consumer directory, selected
agent and start/end times. Keep expected outcomes separate from raw results.

From the consumer directory:

```powershell
copilot --plugin-dir "<actual-plugin-path>" --agent marketing-iq:marketing-iq --output-format json -p "Check setup only. Use the intended installed Marketing IQ instructions. Report the actual selected skill origin and callable tools; distinguish discovery from authentication. Do not retrieve source data, read configuration or credentials, write memory, save direction, or install anything. If an instruction read is denied, stop and report only its exact path and error classification."
```

No permission/trust flags are part of this protocol. A prompt-mode denial or
approval requirement is an observed blocker, not a reason to add bypass flags.
After a denial, the administrator owns supported remediation of that exact
path. Do not retry an unchanged denied boundary or count another actor's success.
`--plugin-dir` proves a directory-loaded run, not marketplace installation.
Use the installed namespaced agent without that option for a separate
marketplace-installed check.

Where the normal host permits helper execution:

```powershell
node "<discovered-shared-skill>\scripts\Inspect-Installation.mjs"
```

The helper is for native plugin layouts, not canonical workspace copies.
Compare its entrypoint identities with host-observed read paths. Do not turn
`hostDiscovery: not-verified` into a pass just because its process exits zero.

## Real workflow protocol

After setup succeeds, obtain the actual task, source scope and current connector
choice. Do not invent customer evidence, source locations, memories or approvals.
Use one declared Launch journey and, only when requested, a separately scoped
Field journey. Capture raw output and host tool events before evaluation.
Join tool claims to actual calls; preserve unsuccessful attempts.

Record structure, semantics, routing, delivery and marketer utility separately.
For point edits, compare the current version and revised result; unrelated text
must remain unchanged unless a coupled factual correction is required. For
campaign planning, check the separate planning contract rather than pretending
it is a canonical11 answer.

Use `references\marketer-review.md` and the shipped feedback template. Leave
human acceptance and campaign outcomes unassessed until actual feedback exists.
Do not create a global preference to test repository-only memory.

## Ownership of blockers

Missing exposure, instruction permission or safe native transport belongs to
the client/host administrator. The plugin explains the exact missing capability;
it does not grant itself that capability. Authenticated operation failure needs
the normal host authentication process, never agent-visible credentials.
Unavailable host boundaries stay release limitations even when code checks pass.
