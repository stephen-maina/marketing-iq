# Decision lifecycle verification

This is a focused engineering/demo handoff, not a live acceptance record.
The CLI contract is in
`.github\skills\marketing-iq\references\decision-tools.md`.

## Measured automated boundary

Starting integration commit: `094d331ac71afbb3ac4621511c24d8766c4504d2`.
On 2026-10-26, the existing TypeScript build and 16 decision tests passed
before changes. Adding four lifecycle characterization tests produced 20
passing tests. No runtime defect was found or runtime behavior changed.
These are characterization tests of existing behavior, not a fabricated
red/green bug fix.

Run from the repository root in PowerShell:

```powershell
$scratch = Join-Path (Get-Location) ('.lifecycle-scratch-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
$oldTemp, $oldTmp = $env:TEMP, $env:TMP
try {
    $env:TEMP = $scratch
    $env:TMP = $scratch
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
    node --test tests\portable\decisions.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Decision tests failed' }
} finally {
    $env:TEMP, $env:TMP = $oldTemp, $oldTmp
    # Tests have stopped; remove only the exact synthetic directory created above.
    Remove-Item -LiteralPath $scratch -Recurse
}
```

The new assertions exercise actual fresh CLI processes and persisted bytes:

| Test | Invariant |
| --- | --- |
| `preparation remains read-only; refused and stale identity confirmations leave no accepted record` | Read-only preparation and denied publication create no store. Missing/refused confirmation and mismatched ID/version fail closed. |
| `synthetic exact replay preserves confirmation time and fresh-process discovery returns the exact saved direction` | Exact replay is unchanged; direction/scope/confirmation time survive fresh-process discovery. Regenerating `acceptedAt` conflicts without mutation. |
| `expired replacement never revives predecessor, and discovery leaves interrupted writes untouched` | Before replacement is effective the predecessor is eligible; replacement is eligible at its start and absent at its exclusive expiry. Expiry does not revive the predecessor. Read-only discovery never repairs recovery files or mutates store bytes. |
| `withdrawal rejects missing, refused and wrong-version confirmation without changing saved direction` | Withdrawal needs its own matching confirmation; denial leaves direction selected and bytes unchanged. Confirmed withdrawal is replay-safe and discovery returns not-found. |

Existing neighboring tests cover alternatives requiring a choice, future
supersession, withdrawal without resurrection, malformed stores, limits,
symlink/junction denial, concurrent publishers and abandoned locks.

The CLI's acceptance boolean records an asserted human action; it does not
authenticate a human, bind an approval to a preview hash, or detect changed
direction text with reused ID/version before the first publish. Therefore
stale *content* confirmation must be rejected by the host's exact-preview
workflow. The tests verify stale/mismatched identity, not a nonexistent
authentication boundary. A read-only CLI operation can take its cooperative
lock outside the decision store; “no write” here means no decision-store
creation, mutation, recovery or withdrawal.

## Smallest actual interactive demonstration

**Not executed by automated tests.** Use the existing host and the shipped
CLI; no service, new authentication, alternate live store or generated plugin
rebuild is needed. Use a new synthetic directory under this repository,
for example `.decision-demo-<new-guid>`, never
`local-data\launch-decisions`. Redirect `TEMP` and `TMP` to a `locks`
subdirectory for this demo, restoring both afterward. Keep all demo artifacts
under the exact new directory and remove only that directory after stopping
its processes. Do not run a second writer or remove an abandoned lock.

1. **Prepare only.** Ask the host to prepare a synthetic readiness-briefing
   direction. The host derives this complete scope:
   `synthetic-harbor / readiness / service-owners / fictional-region`.
   It runs `discover --read-only` against the synthetic store with current UTC
   `asOf`. Require actual `not-found`; an error is not an empty store.
2. **Preview before asking for acceptance.** Display all record values:

   ```text
   schemaVersion: 1
   decisionId: synthetic-lifecycle
   version: 1
   status: accepted
   scope:
     productKey: synthetic-harbor
     topicKey: readiness
     audienceKey: service-owners
     geographyKey: fictional-region
   direction: SYNTHETIC ONLY: propose a readiness briefing for fictional
     service owners; the takeaway is a prerequisites checklist, not launch,
     execution or publication approval.
   acceptedAt: UTC time of your confirmation, captured once
   effectiveFrom: <display a concrete current UTC instant>
   effectiveUntil: <display a concrete UTC instant one hour later>
   supersedes: []
   ```

   Display the full direction as one exact string in the actual JSON preview,
   not the wrapped representation above. Explain that the record is temporary,
   coexists without replacing anything, saves direction/metadata only and grants
   no product, execution, publication or independent-review approval.
   Ask the current human to confirm **this exact record and effect**.
3. **Stop for the human.** Praise, permission to test, an earlier “save it”,
   sample text, an operator script and synthetic fixture acceptance do not
   count. Refusal leaves the store absent; do not ask again until reopened.
   Any changed scope, direction, dates or replacement effect needs a new
   preview and confirmation. Do not run publication until the actual reply.
4. **Save once confirmed.** Capture the human reply's UTC time once as
   `acceptedAt`, preserve every other previewed value, assemble the documented
   `publish` request with matching `{decisionId, version, confirmed: true}`,
   and send it to the same CLI/store. Require actual `published` or `unchanged`.
   Keep the assembled request unchanged for any explicitly authorized replay.
5. **Discover in a fresh process/context.** Give a fresh Field session only
   the synthetic business task, the four scope values and store configuration,
   not the earlier answer or record ID. Run read-only discovery at current UTC
   and inspect actual `selected`, exact direction, scope and effective dates.
   Use a separate Node invocation even for a CLI-only demo. This proves local
   lifecycle eligibility, not fresh product evidence, semantic fit,
   cross-user access, or a reviewed Field answer. A complete Field workflow
   still needs its selected adapter and current evidence.
6. **Withdraw only after a second human confirmation.** Show
   `synthetic-lifecycle` version `1` and explain that it will no longer be
   discoverable, without reviving a predecessor. Obtain confirmation for
   that withdrawal, send the documented `withdraw` request, require
   `withdrawn`, and use another fresh read-only discovery to require
   `not-found`. Expiration is already tested independently and needs no
   wall-clock waiting.

All operations use:

```text
node .github\skills\marketing-iq\scripts\portable\cli.js decisions --store-root <synthetic-store>
```

Add `--read-only` only for discovery. Serialize requests as JSON on stdin
or use `--input-file <absolute-session-request.json>` (bounded to 131072
bytes); never write accepted/archive records directly. The final human confirmation
and connected Field demonstration remain an explicit operator-owned boundary,
not a claim established by these synthetic tests.
