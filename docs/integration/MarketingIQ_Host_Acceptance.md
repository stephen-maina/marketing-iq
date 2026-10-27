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

## Maintainer testing agents

The repository includes two maintainer-only profiles in `.github\agents`:

| Profile | Purpose | Requested tools |
| --- | --- | --- |
| `marketing-iq-test-coordinator` | Freeze a real input, preserve actor/budgets, prepare the operator's next run and request independent assessment after capture. | `read`, `agent` |
| `marketing-iq-test-evaluator` | Compare supplied exact output/events with withheld B01-B09 expectations; separate structure, semantics, routing and human utility. | `read` |
| `marketing-iq-marketer` | Existing AI adviser for practical usefulness of the real brief/copy and original passages. Not human acceptance. | `read` |

Start a fresh CLI session at the repository root and use `/agent` to check
whether the two new profiles are actually discovered before selecting the
coordinator. They are not included in native or portable runtime packages.
Discovery and invocation must be observed; adding a file does not reload an
already-running host. Missing discovery is a setup gap, not permission to
substitute another profile.

Keep this maintainer session separate from the clean consumer session where
the installed marketing actor runs. The coordinator does not execute that actor
or become its parent: it gives the operator the next bounded input. After the
operator captures the result, it can invoke the named evaluator in a fresh
context and optionally the existing marketer adviser. These post-run reports do
not replace the workflow's pre-delivery independent review.

Keep three records separate: frozen evaluator expectations, factual run capture,
and later assessment. Never give `MarketingIQ_Behavior_Acceptance.json`, test
reports or other case outputs to the marketing actor. The operator supplies only
permitted exact input/output and host events, plus original admitted passages
when needed, through an approved data-only channel. Do not put private bodies in
shell arguments, arbitrary files or source control. These profiles cannot create
a safe capture channel or persist a run record themselves.

The current recorded denial is enough for the coordinator to report blocked
without dispatching anything. Profile/packaging tests establish separation and
declared tool scope only. Fresh-host discovery, actual invocation and full-flow
acceptance remain separate observations, not inferred passes.

## Resolving the recorded instruction-read denial

Observed on October 27, 2026:

```text
C:\work\MarketingIQ\artifacts\marketing-iq-repository\plugins\marketing-iq\skills\marketing-iq\SKILL.md
Sandbox policy denial
```

The process exited zero, but this answer did not pass setup. No source retrieval
occurred. This is the reported error classification, not an established root
cause or a claim that the current engineering shell is sandboxed.

1. Have the CLI administrator investigate the **affected selected-agent
   session**, not a successful parent session. Current CLI help exposes `/cwd`,
   `/list-dirs`, `/agent`, `/skills`, `/instructions` and `/diagnose`. Use the
   read-only views to establish the consumer directory, actual discovered
   origin, selected profile and effective path/approval state. Use `/diagnose`
   to investigate the specific failed read. Do not toggle instructions or
   change permissions just to make the check pass.
2. Determine the actual cause from that session's supported diagnostics:
   installation/discovery mismatch, approval handling, managed policy or host
   defect are possibilities, not findings. Repair only an established supported
   setup defect within existing authorized access; otherwise escalate the
   precise failure to the CLI/policy owner. Do not disable safeguards, widen
   tool lists, grant blanket filesystem access or relocate the denied file.
3. Return a nonsecret receipt: CLI version, selected agent/origin, exact path,
   error classification, identified cause, authorized remediation and time.
   Keep raw logs, configuration, credentials and private source content out of
   agent context. Do not automatically collect or upload debug logs.
4. Only after supported remediation is confirmed, freeze a new configuration
   identity and run the setup-only protocol **once** with the intended actor.
   Retain the original failed observation. If denied again, stop at that exact
   boundary and return it to the administrator; do not keep retrying.
5. After successful instruction reads and observed tool exposure, proceed to
   the actual authorized source request, safe packet processing, exact-result
   review/delivery and real marketer feedback. WorkIQ being operational in a
   different context does not establish any of these selected-host boundaries.

Command names above were checked against installed CLI 1.0.103 help. They are
diagnostic entry points, not an instruction to modify settings or an assurance
that every host exposes identical subcommands. No administrator remediation or
post-denial selected-host run was performed as part of authoring these profiles.
