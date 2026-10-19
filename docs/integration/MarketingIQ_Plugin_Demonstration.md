# Marketing IQ plugin: actual-agent demonstration

Measured on October 19, 2026. These are fresh Copilot agent runs, not unit-test
substitutes. The bounded sample demonstrates useful synthetic drafts and an
honest missing-connector block. It does **not** establish complete end-to-end
operation: deterministic answer-packet preflight and diagnostic export were
unavailable in the exercised tool context.

## Artifact and protocol

The initial published revision is
`25d7dbd893f2435c362749ce20191de33aba8c1d` in the private
`stephen-maina/marketing-iq` repository. The follow-up containing this report
changes documentation, not workflow instructions or helper behavior.

The exact user messages are retained in `tests\native-plugin\scenarios.json`.
The assistant-authored evaluator criteria in `tests\native-plugin\oracle.json`
were withheld from the driver and the agents under test. They are evaluation
criteria, not independently verified business truth.

Each protocol ran the same three messages once, in separate new CLI processes
and clean consumer working directories outside the source workspace. Each case
had a 600-second timeout. The driver captured stdout, stderr, native session
events, tool inputs/outcomes and the final response before adjudication.

Copilot CLI was 1.0.98; Node was 22.18.0. No model override was supplied. Session
start metadata named `gpt-6-astra`; actual assistant and reviewer tool events
named `gpt-6.1-sol`. These observations are not a model-selection guarantee.

Relevant invocation flags, with paths resolved for each case:

```text
--plugin-dir <generated-plugin>
--agent marketing-iq:marketing-iq
--no-custom-instructions
--no-auto-update
--disable-builtin-mcps
--no-ask-user
--output-format json
--log-dir <case-logs>
--add-dir <generated-plugin>
--add-dir <case-workspace>
--available-tools view glob rg powershell task skill read_agent
--allow-tool shell(node:*)
-p <exact-frozen-message>
```

`COPILOT_ALLOW_ALL=false` and `COPILOT_AUTO_UPDATE=false` were process-scoped.
Node execution permission is not a shell sandbox. No live connector, human
acceptance, permission expansion or account/configuration change was part of
the model-run protocol. Existing globally installed plugins were not removed:
these runs were not hermetic. The unavailable-connector run recorded an
unrelated installed Azure-plugin hook timeout; it still produced a final answer.

## Preserve the failed baseline

The first protocol used the bare `--agent marketing-iq` name. All three
processes exited 1 before workflow execution:

```text
No such agent: marketing-iq, available: marketing-iq:marketing-iq,
```

This was an invocation/documentation defect, not a semantic workflow result.
A regression assertion was observed failing, the documented agent name was
corrected, and the generated package checks passed. A separately versioned v2
protocol changed only that argument and the capture/consumer directories.
The original captures were retained; no scenario wording or business
instructions were changed to obtain a better result.

## Corrected actual-agent outcomes

All three v2 processes exited 0, produced a final response, had empty stderr and
did not time out. Exit success alone is not the evaluation result.

| User scenario | Observed useful behavior | Important limit |
|---|---|---|
| Synthetic Launch readiness | Read installed shared/Launch instructions, ran context and bundled local-file admission, compared briefing with demo, provisionally preferred a readiness briefing, and distinguished unknown sign-off from a failed gate. | Fictional excerpt only; no enterprise readiness or audience-demand validation. |
| Synthetic Field activation from a proposal | Read installed shared/Field instructions, admitted the example, produced an invitation, exactly three talk points and neutral follow-up, and retained undecided logistics as placeholders. | Read-only accepted-direction discovery was denied because an interactive approval response was unavailable. The explicit current proposal supplied direction; absence of records was not asserted. |
| Explicit unavailable connector | Reported the missing exposed `unavailable-demo-connector/retrieve` capability and blocked assessment without fallback or invented source material. | Authentication and source permissions were never exercised; tool absence is not an authentication denial. |

Each run actually invoked one separate reviewer with the canonical candidate,
readable answer, current brief and evidence/operation context. The synthetic
packets included the complete original admitted passage. Each reviewer returned
`{"status":"pass","findings":[]}`. This is observed model review, not a
deterministic check, human sign-off or proof of future model compliance.

Post-run inspection of the captured review packets found:

| Observable gate | Launch | Field | Unavailable connector |
|---|---|---|---|
| Generated plugin instructions loaded | Observed | Observed | Observed |
| Required canonical top-level fields | 11 | 11 | 11 |
| Required canonical sections | Six Launch sections | Five Field sections | Empty, blocked |
| Source-grounded facts | Three exact quotes from admitted body | Three exact quotes from admitted body | Zero facts/sources |
| Separate reviewer execution | One, returned pass | One, returned pass | One, returned pass |
| Authority boundary | Proposed and unsaved | Proposed and unaccepted | No direction saved |
| Deterministic packet preflight | Not run, disclosed | Not run, disclosed | Not run, disclosed |
| Diagnostic export/read-back | Not run, disclosed | Not run, disclosed | Not run, disclosed |

The Field packet's invitation, talk-track and follow-up text each occurred
verbatim in its delivered answer; the talk-track contained three numbered
points. The unavailable packet had empty sections, facts and sources. These
were checks of captured reviewer inputs, **not** exported final canonical
artifacts. No artifact export helper call was observed in any case.

The agents disclosed the absence of a safe data-only transport/file-creation
capability rather than embedding candidate/source text into shell commands.
Read-only discovery's approval failure likewise remains a measured limitation;
the test did not retry it with broader permissions.

## Representative delivered output

All text in this section is from the synthetic demonstrations. It is internal
review material, not live Harbor product truth or publication approval.

The Launch answer opened:

> Synthetic / internal review only. Recommend a readiness briefing for service
> owners in Europe, provisionally; Harbor's internal-preview readiness is
> insufficient-evidence, not a demonstrated failed gate.

It offered a documentation-review evidence checklist, an open-questions log and
a proposed next-step plan as briefing takeaways. It acknowledged the loss of
hands-on product understanding and made a demo conditional on suitable product
evidence and a verified scenario.

The Field answer delivered this invitation:

```text
Subject: Proposed Harbor readiness briefing for service owners in Europe

Would a focused review of documentation questions and support-sign-off unknowns help you plan what to clarify next?

We propose a Harbor readiness briefing for service owners in Europe. The discussion would help shape a working list of documentation-review questions and identify what needs clarification about support sign-off, so you can decide which questions to take forward. This is a readiness discussion, not an announcement of an approved launch.

Date: [date]
Delivery link: [delivery link]
Registration link: [registration link]

Interested in this proposed briefing? Reply to express interest while scheduling and registration details remain undecided.
```

Its three delivered talk points were:

```text
1. Identify documentation-review questions: Which documentation would you need to examine, and what questions would help you assess its relevance to your service? Propose a working questions list, not a claim that review is complete.
2. Clarify support-sign-off unknowns: What needs to be established about applicable sign-off needs, evidence and decision authority? Separate unanswered questions from confirmed requirements; unknown does not mean failed or approved.
3. Choose a bounded next step: Prioritize the questions to clarify and propose who could help answer them. Use that list to plan further review, without treating the briefing as launch authorization.
```

Its neutral follow-up asked whether the proposed briefing would be useful and
which question the reader wanted to explore. It did not invent attendance or
prior contact. The final answer explicitly said the proposal was unsaved and
unaccepted, and disclosed the discovery, preflight and export limitations.

The unavailable-connector answer reported `MIQ_TOOLS_UNAVAILABLE`, named the
exact missing tool and retained the requested scope. It expressly distinguished
tool availability from untested authentication/source permissions.

## Remote installation: separate observation

The published private repository was installed with:

```powershell
copilot plugin install stephen-maina/marketing-iq:plugins/marketing-iq
```

Installation used a new isolated `COPILOT_HOME` and process-scoped existing
owner credentials. The normal user's plugin inventory was unchanged. From a
clean consumer directory outside the source workspace, fresh discovery selected
all three skills with `source: plugin` from the installed cache. Running
discovery inside the source workspace instead selected its project copies:
installation alone is not proof of the selected source.

The downloaded helper's `check` returned `status: ok`, with no .NET or
TypeScript requirement. Its bundled `local-file` example returned `ready`.
No npm restore was needed for these consumer operations. Model invocations
above used `--plugin-dir`; a model invocation from the remote-installed cache
was not separately exercised.

The installed tree and published plugin each contained 24 files. SHA-256
comparison initially found 6 byte-identical files and 18 differences. Exact
UTF-8 text comparison after replacing CRLF with LF matched all 24: Git's
observed `core.autocrlf=true` checkout setting explained the differences.
The initial raw-byte mismatch did **not** establish content corruption; no
byte-identity claim is made. Downloaded helper execution is separate behavioral
evidence, not a proof of every runtime path.

CLI 1.0.98 warned that direct repository installs are deprecated in favor of
marketplace installs in a future release. This repository currently has no
marketplace. The documented clone-and-`--plugin-dir` path is an alternative;
future CLI support has not been established.

## Evidence retention and remaining boundaries

Baseline session IDs:
`8d48166c-600b-4d70-849f-02095c78c124`,
`a3f3bee4-dddb-4e7b-b545-7ec98b1a0d9e`,
`08ad3a54-944e-4435-8ab5-49d5c381c0da`.

V2 session IDs, in table order:
`61faf896-ec2d-4ef1-8957-3127d1d906fa`,
`8177cdeb-5fe2-439c-bd67-03b0dd92fc85`,
`0b57aa37-8142-4442-bda6-84c958c952b4`.

Raw captures remain in the author's session artifacts under `files\plugin-demo`
and `files\plugin-demo-v2`, not in this repository. They include inherited host
metadata and are deliberately not redistributed. Scenario/oracle definitions
and this measured report are committed; private source mappings, credentials,
decision stores and unredacted logs are excluded.

Still unverified: live WorkIQ or custom-connector retrieval, denied-access and
restricted-source live behavior, safe canonical export/read-back in a capable
host, human-confirmed save/withdraw and fresh-session accepted-direction use,
other CLIs/operating systems, and repeat-run reliability. One run per scenario
cannot measure a success rate or establish production readiness.

Separately, the scoped development checks passed 91 tests before initial
publication. Those deterministic checks complement, but do not replace, the
actual-agent observations above.
