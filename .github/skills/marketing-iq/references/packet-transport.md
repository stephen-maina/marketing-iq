# Data-only session transport

## Capability boundary

Use an existing safe stdin/native capture when it already supplies the exact
current JSON. Otherwise, an **actually exposed, permitted native file create/edit
tool** may stage the bounded JSON as data in the current host-provided session
artifact directory. This is an explicit session-transport exception, not general
permission to copy sources, persist evidence packs or write executable files.
Source restrictions must permit this session-local processing. Do not stage
credentials, excluded content, whole connector responses or transcripts.

A helper accepting a filename does not create a file-writing capability. A
profile exposing only read, execute and agent tools may lack the native writer.
In that context use an existing exact capture, or report
`preflight:not-run:no-safe-transport` and the specific missing capability under
`review-preflight.md`. Diagnostic export has its separate delivery-gap rule.
Do not broaden permissions, launch a different actor, enable approve-all/trust
bypass or ask the marketer to operate a CLI.

Never populate shell literals, here-strings, environment variables, `node -e`,
Python/PowerShell code or command arguments with source or candidate bodies.
Commands below contain only helper names, fixed flags and host-observed paths.
The native writer receives path and UTF-8 content through its data fields (or
the host's data-only patch tool), not executable shell input. Inspect the actual
callable schema; do not invent a `create` tool because these instructions name it.

## Minimal workflow

1. Verify the current session directory and native writer. Choose a new unique
   `.json` filename there, never a source-supplied path or a prior artifact.
   Use the native tool to create only the normalized evidence handoff, current
   review packet, or final canonical object needed by the next operation.
   Do not overwrite a prior reviewed pair. Read back complete bytes and compare
   decoded values, exact strings and array order with the retained input.
2. Evidence admission accepts the existing closed adapter handoff, not a raw
   connector response:

   ```powershell
   node .github\skills\marketing-iq\scripts\portable\cli.js evidence --adapter <selected-id> --input-file <absolute-session-handoff.json>
   ```

   Keep returned restrictions, gaps, original admitted passages and cumulative
   retrieval limits. This transport does not retrieve/authenticate or authorize
   an adapter. The `decisions` command also accepts `--input-file` for its
   unchanged request schema; mutations still require exact human confirmation.
3. Retain the exact candidate/readable pair and original admitted passages in
   the review-packet shape from `review-preflight.md`. Stage that one packet:

   ```powershell
   node .github\skills\marketing-iq\scripts\Test-ReviewPacket.mjs --packet-file <absolute-session-packet.json>
   ```

   File mode reads at most 262,144 UTF-8 bytes, rejects duplicate keys (including
   escaped aliases), invalid UTF-8, non-files and final-component links, and
   returns fixed diagnostics without echoing content. Identity checks reduce
   mistakes; they are not a sandbox or protection against a concurrent actor.
   No encoding-sensitive native shell pipe is needed.
4. Perform the unchanged independent review with the exact pair and original
   admitted passages **inline**, not just the file path. Mechanical success is
   not semantic approval. Apply only the governing retained-pair bookkeeping;
   a substantive correction needs its own preflight and remaining review slot.
5. For export, stage the exact final canonical object, or a final packet whose
   `candidate` and `readableView` are exactly the final retained pair after
   permitted review bookkeeping:

   ```powershell
   node .github\skills\marketing-iq\scripts\Save-ResultArtifact.mjs --directory <absolute-existing-session-files> --candidate-file <absolute-session-final-candidate.json>
   ```

   Alternatively avoid a second candidate copy:

   ```powershell
   node .github\skills\marketing-iq\scripts\Save-ResultArtifact.mjs --directory <absolute-existing-session-files> --packet-file <absolute-session-final-packet.json>
   ```

   Packet export validates the **whole** packet before selecting `candidate`;
   malformed evidence or a changed Field rendering cannot be hidden by selection.
   Only canonical fields are exported; no evidence/context wrapper is retained
   in the diagnostic result. The existing exclusive-create, byte read-back and
   actual receipt rules remain mandatory. Export does not prove review took place.
6. Transport inputs are not diagnostic results, accepted direction or future
   evidence. Remove only the known staging files using an existing permitted
   native file tool when no longer needed. Never delete a pre-existing capture
   or exported result. If removal is unavailable, disclose the retained session
   transport; do not promise zero host retention or silently store it elsewhere.

## Balanced cases

Supported: a host exposes a permitted data-only writer and a current session
directory. It creates a bounded UTF-8 packet, reads it back, preflights via
`--packet-file`, independently reviews the same pair, then exports only the final
canonical object with a verified receipt.

Unsupported: the selected Marketing IQ profile exposes read/execute/agent but
no native writer, and no exact current capture is usable. Adding `--packet-file`
does not fix that host capability. Preserve the specific not-run/export gaps;
do not use `Set-Content`, shell heredocs or broader permissions to manufacture
success.
