# Review preflight checker

Read this guide **before** dispatching a live coordinator-owned review run. Live
actors need the packet shape, safe transport options, and failure boundaries up
front; this checker does not invent them after the fact.

`scripts\Test-ReviewPacket.mjs` is a **mechanical-only** validator for the
review-owning context. It checks structure, exact joins, quote occurrence,
presentation-mode fidelity, and inert handling of hostile strings. It does **not**
approve claims, infer audience equivalence, validate authentication, or prove
source truth.

## Scope and safety boundary

- Input is a **data-only REVIEW PACKET**, not the final shared-answer schema.
- The checker does **not** retrieve, execute commands, write packets, save
  directions, or launch review.
- Ordinary runtime use must **not** copy live source bodies or draft text into a
  shell literal. A new session input file is permitted only through the bounded
  native data-only writer procedure in `packet-transport.md`, when that tool is
  actually exposed and source restrictions permit the staging.
- If a producing task already emitted the packet in a native host capture, an
  explicit review-owning coordinator may consume that exact native packet through
  `--events ... --call ...`.
- A permitted current session file may instead use `--packet-file` below.
  A filename flag supplies no missing write permission or capability.
- Without safe transport, keep the existing session-only preparation checks
  and disclose that no deterministic preflight was run. This checker does not
  create a new capability or bypass.
- Stdin must preserve UTF-8 characters end to end. Prefer `pwsh` (PowerShell 7+);
  explicitly set the native pipe's `$OutputEncoding` to UTF-8 in the same process
  and read UTF-8 host captures with `-Encoding utf8`, as shown below. Windows
  PowerShell 5.1's default ASCII pipe can collapse different characters into `?`.
  A known lossy or unverified encoding path is `preflight:not-run:no-safe-transport`,
  never a deterministic pass. Node cannot recover characters lost upstream.

## Retained outcome and disclosure

Before independent review, put an unavailable/not-run deterministic outcome and
its specific reason in a standalone canonical `proofGaps` entry, plain readable
disclosure when applicable, and the corresponding `executionTrace` token.
For example, an unverified UTF-8 path retains that specific reason even though
its trace token is `preflight:not-run:no-safe-transport`. A trace or reviewer-only
context is not a substitute for user-facing disclosure.

Keep this state separate from the mutable independent-review pending/outcome
spans described in the shared skill's retained-pair procedure. Semantic PASS
does not remove a mechanical gap; reviewer unavailability is a different gap.
Clarification, successful direction saving and canonical diagnostic export
retain the unresolved reason. Missing transport alone does not turn supported
content into a failed assessment or reverse a successful save.

Balanced outcomes: NOT RUN plus semantic PASS retains both outcomes, with the
mechanical reason visible; a current-pair mechanical PASS plus semantic PASS
has no invented not-run warning. Only an actual applicable mechanical result
can supersede that limitation, before review of the resulting pair. Neither an
older pair's PASS nor an export receipt establishes the new pair's preflight.

## REVIEW PACKET shape

This is a schematic illustration, not a runnable fixture: the real candidate must
include the complete role section set and quotes present in its evidence. Executable
synthetic examples live in `tests\hosted-preflight\review-packet.test.mjs`.

```json
{
  "candidate": {
    "useCase": "launch-decision",
    "status": "draft",
    "directionStatus": "proposed",
    "validationMode": "session-review",
    "summary": "Concise evidence-qualified outcome.",
    "sections": [
      {
        "name": "product-truth",
        "kind": "assessment",
        "text": "Internal analysis.",
        "factIds": ["F1"]
      }
    ],
    "facts": [
      {
        "id": "F1",
        "claim": "One narrow source-supported claim.",
        "sourceId": "source-1",
        "sourceUrl": "https://example.invalid/source-1",
        "quote": "Exact short excerpt.",
        "versionId": null,
        "locator": null
      }
    ],
    "sources": [
      {
        "sourceId": "source-1",
        "sourceUrl": "https://example.invalid/source-1",
        "sourceKind": "sharepoint",
        "evidenceKind": "document-excerpt",
        "coverage": "partial-body",
        "retrievedThisSession": true
      }
    ],
    "proofGaps": ["Named missing evidence or limits."],
    "rejectedClaims": ["Unsupported assertion and reason."],
    "executionTrace": "mode:m365; ..."
  },
  "presentationMode": "readable-artifact",
  "readableView": "Readable rendering derived from the candidate, or null in json-only mode.",
  "evidence": [
    {
      "sourceId": "source-1",
      "sourceUrl": "https://example.invalid/source-1",
      "body": "Bounded excerpt body."
    }
  ],
  "context": {
    "brief": "Complete current brief string.",
    "direction": "Direction provenance or explicit no-direction statement.",
    "operationState": "No accepted-direction write; final canonical-only diagnostic export follows review."
  }
}
```

## What it checks

1. **Packet shape:** all required fields, correct types, no additional canonical
   fields, valid enums, and null-safe handling of malformed objects/primitives.
2. **Role sections:** the six Launch or five Field sections, each required name
   exactly once with its specified kind; no extra section-order rule. Blocked candidates must keep
   `sections` and `facts` empty.
3. **Facts and sources:** `F1`, `F2`, ... in output order; exact source joins by
   `sourceId` and `sourceUrl`; unique source IDs; facts may cite only fresh
   `partial-body` excerpt sources.
4. **Quote mechanics:** non-blank quotes, at most 35 whitespace-delimited words,
   and exact occurrence inside the matching `evidence.body`.
5. **Readable view mechanics:** `json-only` requires `readableView: null`;
   `readable-artifact` (default) and explicit legacy `readable-json` both require
   a non-empty readable string. The checker validates the pair; it does not
   create the result file or require JSON in the marketer-facing answer.
   Present inline fact links must use an existing fact ID and its exact
   URL; ordinary single/double-quoted Markdown titles are allowed. Omitted facts
   do not require redundant links. Citation completeness, reference-style links
   and claim-to-link association remain independent semantic-review duties. For Field
   drafts, invitation, talk-track, and follow-up must appear verbatim, and the
   talk-track must contain exactly three numbered items (1, 2, 3 with a period or
   closing parenthesis delimiter). Those links
   belong in the surrounding support/gaps explanation, **not** inside outward-
   facing Field copy.
6. **Review context:** `brief`, `direction`, and `operationState` must be typed,
   non-empty strings. Independent review, not keyword matching, determines
   whether the complete brief, direction provenance and actual operation state
   were supplied.
7. **Evidence bounds:** at most three evidence entries, each body at most 20,000
   characters and at most 60,000 combined. At most three candidate source rows
   may be admitted (partial-body or metadata-only); unavailable/excluded rows
   do not consume this admitted-source ceiling.

## What it does not check

- No semantic claim approval.
- No inference that a readable paragraph is fully supported because it sits near
  a fact link.
- No claim-to-link meaning reconstruction or guarantee that all rendered claims
  carry citations. A mechanical pass never substitutes for the semantic reviewer.
- No authenticated-source validation.
- No installed final-output hook or delivery interception.
- Legacy stdin/events modes do not detect duplicate JSON keys. The new file
  mode uses the strict portable parser and rejects duplicate/escaped-alias keys.

## CLI

### Native data-only session file (no shell body transport)

Follow `packet-transport.md` to create/read back the exact current REVIEW PACKET
with an actually exposed native file tool. Then pass only its observed path:

```powershell
node <MIQ_SHARED>\scripts\Test-ReviewPacket.mjs --packet-file <absolute-session-packet.json>
```

This reads a bounded, regular UTF-8 JSON file directly. Relative paths, final
symlinks/hardlinks, empty/oversized files, invalid UTF-8 and duplicate JSON keys
fail with fixed non-sensitive diagnostics. Input is never evaluated, repaired or
echoed. No file is created by the checker. Review still receives the retained
pair and original passages inline, not a path to recover them later.

### 1. Safe stdin packet

Pass the full REVIEW PACKET JSON on stdin. This file example is for an existing
synthetic fixture only; live stdin uses an already-retained host capture. For
permitted native-tool staging, use `--packet-file` instead:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding utf8 review-packet.json | node <MIQ_SHARED>\scripts\Test-ReviewPacket.mjs
```

The command prints only:

```json
{"status":"pass","findings":[]}
```

or:

```json
{"status":"fail","findings":[{"path":"candidate.facts[0].quote","reason":"..."}]}
```

It exits `0` on pass and non-zero on fail or invalid input. Diagnostics are fixed
and non-sensitive: the checker does not echo the packet back to stdout.

### 2. Native host capture

Use this only when a producing task already emitted the packet in the session's
native `events.jsonl`:

```powershell
node <MIQ_SHARED>\scripts\Test-ReviewPacket.mjs `
  --events C:\Users\<user>\.copilot\session-state\<session>\events.jsonl `
  --call call_abc123
```

Rules:

- `--events` must be an **absolute** path to an existing native `events.jsonl`.
- `--call` must name **one exact** `tool.execution_complete` event.
- The selected event must have `success: true`.
- The checker uses only `data.result.content` from that exact event and parses the
  **entire** content as the REVIEW PACKET JSON.
- It never scans other assistant responses for a “good enough” packet.
- Missing, duplicate, failed, or malformed selected events fail explicitly.
- Packet stdin/selected JSON is capped at 262,144 UTF-8 bytes. Native JSONL lines
  are streamed with an 8 MiB per-line ceiling plus one bounded stream chunk.
  These are transport limits, not the admitted-evidence character limits. An
  oversized unrelated line fails this transport explicitly rather than being
  skipped; use an observed exact host capture through safe stdin instead.

This mode is for sync-style producers whose exact packet is already the whole
`data.result.content` string.

### 3. Native `read_agent` turn capture

Use this when the producing actor returned the packet through a native
`read_agent` completion instead of a one-shot sync tool result:

```powershell
node <MIQ_SHARED>\scripts\Test-ReviewPacket.mjs `
  --events C:\Users\<user>\.copilot\session-state\<session>\events.jsonl `
  --call call_abc123 `
  --turn 0
```

Rules:

- `--events` and `--call` follow the same exact-event rules as native host
  capture.
- `--turn` must be a nonnegative integer.
- The selected completion must have **exactly one** matching
  `tool.execution_start` event with `toolName: "read_agent"`.
- The selected completion must still have `success: true`.
- `data.result.content` must begin with an **idle** or **completed** host header,
  not a running header.
- The checker extracts only one exact block whose header line is `[Turn N]`,
  taking everything until the next exact turn-header line or end-of-content.
- It then parses that extracted block as the entire REVIEW PACKET JSON.
- LF and CRLF are supported, without assuming blank separators between turns.
  A follow-up block starting `[Message]` must have one exact `[Response]`
  boundary; only the response is parsed. Ambiguous boundaries fail.
- It does **not** search generically for braces, packets, or fallback JSON inside
  other text.
- If inline `data.result.content` is an overflow preview such as `Output too
  large ... Saved to: ...`, `--turn` fails closed. The checker does **not**
  follow that path automatically.

This is the intended safe transport for real multi-turn producer flows:
producer returns an initial packet, the coordinator runs the mechanical gate,
then performs the explicit one-review handoff. Actors make corrections only
between reviews and return the corrected packet to the mechanical gate. At most
two semantic review attempts remain a separate workflow limit; this checker does
not expand that allowance.

### 4. Safe overflow capture -> stdin

When a native `read_agent` completion overflows inline limits, use the observed
host capture path **outside** `--events` mode, extract the exact turn payload as
data, and pipe that payload to stdin. Do not pass the truncated preview back to
`--turn`, and do not create a new saved packet file.

PowerShell shape:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$capturePath = 'C:\observed\host-capture.txt'
$capture = Get-Content -Raw -Encoding utf8 $capturePath
$payload = <extract the exact [Turn N] payload from the observed host capture as data>
$payload | node <MIQ_SHARED>\scripts\Test-ReviewPacket.mjs
```

The important boundary is the same as ordinary stdin mode:

- the checker receives only the exact packet JSON payload on stdin
- no executable source literal is populated with real passages
- no new packet file is created just to run the checker
- exact native call IDs and capture file hashes may still be retained separately

## Operational limitation

If a mechanical finding contradicts the governing skill contract, preserve the
failure and adjudicate it before changing a valid candidate. A checker defect is
not a reason to rewrite valid copy or claim a pass: correct the checker with a
synthetic regression and rerun the same candidate, or disclose the unavailable
mechanical gate. This does not reset any retrieval or semantic-review allowance.

This tool is for a **review-owning coordinator** that already has safe packet
transport. The native-tool staging exception never authorizes shell body
interpolation, missing tool permissions or unrestricted evidence persistence.
If neither a permitted native writer nor an existing exact capture/stdin path
exists, keep the manual/session checks and disclose the actual not-run reason.
