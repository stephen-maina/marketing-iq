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

## October 26, 2026: gap-closure implementation and observations

This follow-up adds bounded file inputs for evidence and decision requests,
`--packet-file` preflight/export, a GitHub Contents response-mapping example,
explicit exposed-connector discovery/setup guidance, and a repository marketplace
catalog. Canonical instructions remain under `.github`; the native plugin is
generated from them. The redistributed source-route registry remains empty.
No tenant, supplied live folder, credential or sharing-link parameter was added
to runtime configuration or committed fixtures.

### Actual CLI check using a user-supplied SharePoint folder

An actual Copilot CLI 1.0.103 model run used the current generated plugin from
a clean consumer directory and the user's approved SharePoint folder scope.
The sharing wrapper was not passed through; its decoded folder location was
identified as a scope, not proof of a working direct URL. The normal MCP
configuration and built-in servers were left enabled. No `--available-tools`
filter was used to manufacture connector absence.

Captured metadata showed four MCP servers loading. That does not prove their
tools were callable from the selected Marketing IQ agent: its native tool
profile remains unchanged. The only observed tool call was `skill`; no source
retrieval, configuration inspection, credential read or installation occurred.
The process exited zero and delivered this connector-only outcome:

> No SharePoint-compatible retrieval tool exposed here.

It reported blocked before retrieval, preserved the supplied scope, and gave
conditional owner steps: add a connector if absent, configure/enable if needed,
authenticate through the normal host flow if required, ensure selected-agent
exposure, then reload if required and reinspect. It explicitly left installation,
authentication, folder permissions and direct-URL reachability unverified.
This demonstrates the missing-exposed-connector branch on a real supplied scope,
**not successful live SharePoint retrieval** or a claim that the user's connector
was uninstalled. The source URL and raw capture are deliberately not reproduced.

### Human-confirmed synthetic decision lifecycle

The user reviewed an exact fictional direction, scope, ID/version, UTC validity,
no-replacement effect and isolated demo-store location. Only after explicit save
confirmation was the request executed. The helper returned `published`. A fresh
helper process, given scope and actual current time rather than the decision ID,
returned `selected`. After a separate explicit withdrawal confirmation the helper
returned `withdrawn`; another fresh process returned `not-found`.

This closes the human-confirmation/helper lifecycle observation. It is not a
fresh model-session Field answer, live product authority, or publication approval.
The demo store and approval artifacts remain outside the Git repository.

### Packaging and transport boundaries

CLI 1.0.103 registered the new local marketplace, browsed Marketing IQ and
installed `marketing-iq@marketing-iq-plugins` with all three skills in an
isolated CLI home. It reported a live local link, not a copied remote artifact.

After implementation revision `9fac098f0873594e987af78a77ec0908acaf0acb`
was pushed, a second isolated CLI home registered the private remote
`stephen-maina/marketing-iq` marketplace, browsed its catalog and installed
`marketing-iq@marketing-iq-plugins`. The CLI reported `source: installed`.
From a clean consumer directory all three Marketing IQ skills had `source:
plugin` and installed-cache paths. The downloaded helper returned `status: ok`;
the downloaded synthetic example returned `ready`, and the new decision
`--input-file` route ran read-only against the withdrawn demo. All 27 installed
files matched the published plugin after exact CRLF-to-LF normalization; this
is not a claim of raw-byte identity. No npm restore or .NET installation was
needed.

A fresh model invocation then used `--agent marketing-iq:marketing-iq` from
that remote-installed copy, with no `--plugin-dir` mount. It exited zero, loaded
the shared skill and read an adapter reference within the installed plugin.
Those were its only observed tool calls. It reported no exposed compatible
SharePoint connector, no retrieval, preserved scope and conditional setup steps,
while leaving installation/authentication/permissions unverified. This isolated
installed-context observation is distinct from the normal-MCP-context run above;
neither is a successful live-content assessment or packet-export demonstration.

The new file-input workflow validates the entire review packet and exports only
its canonical candidate with the existing read-back controls. Mechanical tests
cover bounded strict inputs, exact Field rendering and packet failures; they
do not replace the separate model reviewer. The selected native agent still has
no permitted native data-only file writer. An engineering host's file creation
tool does not prove plugin-actor capability. Consequently dynamic model packet
staging, preflight and export in that selected context remain unverified/blocked;
no tool permissions were broadened to hide the limit.

The concrete GitHub Contents adapter maps a documented response and explicit
observed scope/tool metadata. Its fixture is fictional and tests mapping/admission,
not authentication, live GitHub retrieval or connector installation.

Final integrated validation passed 108 helper/review tests, three native
plugin/marketplace tests and one relocated archive journey, with zero failures
or skips. An independent read-only code review reported no significant defects.
These results do not remove the live-retrieval and native-writer limits above.

## October 27, 2026: live evidence and marketer-adviser observation

This follow-up used actual WorkIQ excerpts within a user-approved SharePoint
folder. No synthetic source demonstration was run for this follow-up. The
scenario was prospectively written by the engineering coordinator, not obtained
from an interviewed marketer: compare an evidence-to-invitation working session
with a general AI-benefits overview for government service delivery leaders
worldwide, explain attendee value and trade-offs, and leave direction unsaved.
The source demo's different comparison, audience and duration did not replace
that brief. Neither scenario nor expected outcome was changed after retrieval.

### Implemented changes

The shared instructions now select evidence by the question it must answer,
distinguish complementary evidence roles, avoid counting equivalent document
copies as independent support, and distinguish secondary quotations and
positioning/demo plans from independently retrieved originals and current
product verification. Launch and Field retain supplied objective, tone, language,
brand and channel constraints without treating those preferences as evidence.
Proposed success signals include a practical way for an owner to observe them
manually, without invented results or a new analytics platform.

The package now also includes the optional read-only
`marketing-iq:marketing-iq-marketer` adviser and its review guide. It assesses
marketing usefulness separately from evidence accuracy and human acceptance;
it cannot retrieve, write, accept direction or send anything. Client-profile
guidance records the observed selected-context limitations and human-operated
setup boundary. No runtime source URL, connector credential, tool-permission
expansion or automatic connector installation was added.

### Measured journey

| Step | Actual observation | Limit |
|---|---|---|
| Live retrieval | Two scoped SharePoint calls returned three admitted distinct works; all had original partial body excerpts. | No full-document coverage, native versions or locators; second call did not supply independent current product verification. |
| Folder membership | Two metadata requests fetched three entities and established both DOCX items' shared parent; the PDF had an in-folder URL. | Conservatively charged four candidate-specific metadata operations; no further source retrieval after the declared budget. |
| Evidence admission | Generated-plugin helper returned `ready` after the coordinator corrected its invalid `partial` enum to the actual `partial-body` contract. | Initial failed invocation is retained; admission is not truth or product-fit verification. |
| Launch draft | Coordinator assembled the canonical/readable pair from the actual admitted excerpts, with four exact cited facts and a conditional offer comparison. | Host-orchestrated engineering scenario, not an autonomous selected-client-profile journey or a human-approved marketing brief. |
| Packaged adviser | Actual CLI invocation with the complete guide and live packet assessed evidence accuracy and marketing usefulness. No material support mismatch was observed; one optional checklist-example enhancement was suggested. | AI advice, not a human marketer interview, measured editing benefit or approval. No tool execution event was observed in this supplied-input run. |
| Mechanical preflight | Generated-plugin packet checker passed with no findings, including the corrected current pair. | Structure, joins and exact strings only. |
| Independent semantic review | First invocation found generic safeguards misclassified as rejected user claims; they were moved to `proofGaps`. A fresh second invocation returned `pass` with no findings. | Two invocations in the same declared cycle, not an unbounded retry-until-pass loop. No human acceptance follows. |
| Diagnostic export | Actual generated-plugin helper exported only the final eleven-field canonical candidate; decoded read-back exactly matched the retained candidate. | No raw evidence packet was exported. Diagnostic retention is not accepted direction or publication permission. |

The provisional recommendation favored an introductory overview with a practical
questions checklist, conditional on the owner wanting introductory discovery.
It explained when invitation drafting would instead be preferable. It retained
the narrower social-services evidence, unknown product fit, partial coverage,
source sensitivity/use restrictions and internal-review-only status. The result
remained `insufficient-evidence`, proposed and intentionally unsaved.

### Preserve the failed adviser-input attempt

The first adviser invocation combined piped packet input with `-p`. Its observed
user message did not contain the packet; the adviser returned `not-assessed`.
Exit zero was not treated as successful review. The corrected invocation supplied
the complete guide and packet through stdin without `-p`:

```powershell
@(
  'Review only the supplied live packet using the supplied guide.'
  Get-Content -LiteralPath <review-guide-path> -Raw -Encoding utf8
  Get-Content -LiteralPath <current-session-packet-path> -Raw -Encoding utf8
) | copilot --plugin-dir <generated-plugin> `
    --agent marketing-iq:marketing-iq-marketer --output-format json
```

Paths in this example are placeholders, not executable sample source data.
The actual Windows invocation used UTF-8 native pipe encoding and captured
stdout/stderr to separate session files. It supplied no model override, broad
permission/trust flags or credential values. Both actual captures were retained;
raw captures and private source identities/passages are not redistributed here.

The engineering host then used the generated helpers with native data-only
session staging:

```text
node <shared>\scripts\Test-ReviewPacket.mjs --packet-file <current-packet>
node <shared>\scripts\Save-ResultArtifact.mjs --directory <session-artifacts> --packet-file <final-packet>
```

File-input support does not create a missing native writer or establish that a
different selected agent can execute these operations.

### Remaining gaps and measured scope

A separate selected WorkIQ client-profile run loaded the shared skill, then
had three required instruction reads denied and made zero WorkIQ calls.
Its connector exposure, safe staging/preflight/export and installed-context live
journey therefore remain blocked or unverified. Parent-host retrieval and the
supplied-input adviser run do not close them. No plugin-owned path defect was
established, and no permissions or configuration were changed to bypass them.
The host/profile owner must resolve approved instruction accessibility and
selected-context capabilities through normal supported setup before that
end-to-end test can proceed.

Human marketer feedback, accepted-direction save and fresh-session Field reuse
were not exercised. A real marketer must still judge whether the proposal helps
their decision and record necessary edits; AI utility assessment cannot supply
that evidence. Current product-owner evidence and activity/review authority also
remain missing for this example. The instruction changes are guidance, not a
new deterministic evidence-quality algorithm or demonstrated reliability rate.

The generated package contained 31 files. Plugin build, the existing focused
static runtime-asset packaging check and whitespace validation passed. These
are engineering checks, not substitutes for the live observations above.
The source-free protocol/receipt and bounded actual captures remain in the
author's session artifacts under `files\marketer-fleet-20261027`; source bodies
and review packets are temporary processing inputs, not committed fixtures.

## October 27, 2026: source intake and optional native preferences

The shared source-intake contract now asks for a missing source/connector,
requires current confirmation of eligible host-recalled suggestions, and honors
a current explicit choice without redundant confirmation. Optional preference
writes use only the selected host's native memory, supported scope and content
rules. No memory service, fallback store or broader tool allow-list was added.
The generated package contains 32 files.

Two prospectively bounded fresh CLI processes selected the generated packaged
agent, using the actual Marketing IQ readiness question and no fabricated source
evidence or injected memories. Each process ran once, with source access and
preference/direction writes explicitly excluded:

| Case | Observed outcome |
| --- | --- |
| No current source/connector | Requested a source folder/document or connector; left readiness and offer comparison unassessed. |
| Actual local repository path explicitly selected with WorkIQ | Retained both selections, reported WorkIQ retrieval not exposed and local-path compatibility unverified; did not substitute filesystem retrieval or another source. |

The host recorded zero source retrieval and memory mutations in both runs.
The missing-choice run also attempted the static helper, which could not execute
without approval, and reported unavailable packet transport/export. Process exit
code zero is not proof of a complete canonical diagnostic or marketing delivery.
These observations establish bounded source-intake behavior, not a reliability
rate or successful live retrieval.

Both processes read the new reference from the same-named canonical workspace
skill. Package checks verified that reference is also shipped unchanged, but
these runs do not establish clean installed-only skill selection. Preserve this
shadowing limit rather than calling them remote-installed demonstrations.

The user explicitly declined user-wide preference storage. The implementation
host exposed only user-scoped native writes, so no preference was saved. Native
write, subsequent automatic recall, confirmation of an actually recalled source
choice, and retrieval after confirmation remain untested. No private source
address or fictional memory was saved to make those checks appear successful.

Build, the focused runtime-asset/reference packaging check and whitespace checks
passed. Raw CLI captures and source-free protocol/artifact/outcome receipts remain
in session storage with the `memory-intake-` prefix; they are not source evidence,
accepted direction or production fixtures.

## October 27, 2026: prioritized improvements, unreleased 0.2.0

The source now includes installed-entrypoint identity checks, progressive shared
references, project brief/feedback templates, research and scoped-edit guidance,
a separate campaign/measurement planning skill, versioned build/release checks
and a five-item pinned optional-extension catalogue. Generated native assets
contain 46 files. No third-party skill was installed and no release was published.

One actual setup-only run from a clean consumer directory selected the
directory-loaded agent and stopped at:

`C:\work\MarketingIQ\artifacts\marketing-iq-repository\plugins\marketing-iq\skills\marketing-iq\SKILL.md`

Classification: **Sandbox policy denial**. The process returned exit code zero;
its answer was a denial, not acceptance. No source retrieval occurred. This
actor/path was not retried or relocated to bypass the denial. The administrator
owns supported remediation; local generator/helper checks do not resolve it.

The observed malformed-metadata diagnostic regression first failed with
`MIQ_INSTRUCTION_UNAVAILABLE` instead of `MIQ_INSTALLATION_INVALID`. The helper
now distinguishes read failure from parse failure. Eleven focused local
installation/package tests then passed, including non-mutating changed/missing/
unknown generated-file cases; generated consistency also passed.
These use real source/package copies with controlled file mutations and test
only deterministic engineering behavior, not live marketing outcomes.

`MarketingIQ_Behavior_Acceptance.json` freezes the evaluator-only obligations for
actual intake, briefs, research, editing, claims, planning, feedback and optional
extensions. Those post-change actor journeys remain blocked, not passed.
The durable programme records the implementation, review and external owners.

The subsequent full local run passed 108 portable/preflight tests, 12 native
plugin tests and one workspace-archive journey; generated consistency and
whitespace checks also passed. Its initial CD-04 failure was a structural test
still reading only the former monolithic entrypoint. The unchanged assertions
now inspect the named connector/preflight references as well, and verify that
the entrypoint references them. This correction is not a live routing result.

An independent read-only complete-diff review included the untracked canonical
assets and corrected structural test, compared the expanded shared contract,
and checked generated logic, public action pins and extension manifests. It
found no significant issues. The preferred custom review profile could not
start because its pinned model was unavailable; the standard code reviewer ran
instead with no model/permission setting change. This engineering review is
not installed-host accessibility, live marketing behavior or human acceptance.
