# Session validation files

## Purpose and boundary

The default user-facing mode is `readable-artifact`: marketers receive the
recommendation or activation copy, its evidence and material limits, and the
agent's natural next question. The complete canonical JSON is a separate
diagnostic artifact for inspection and agent coordination, not inline content.
The canonical eleven-field answer schema and independent review rules do not
change. Explicit machine/JSON-only contracts still receive raw JSON; explicit
inline-JSON requests may use legacy `readable-json`.

Keep two operations distinct:

- **Export result:** retain the exact final canonical answer, including its
  short cited quotes, in this host session's artifact directory. It may be
  proposed or blocked. It does not accept direction, save an event or grant
  publication permission.
- **Save direction:** the agent offers this proactively when it has a usable
  Launch proposal, explains that later sessions can use the choice, prepares
  the record, and obtains human confirmation under `decision-tools.md`.
  Only that confirmed record goes to the accepted-decision store.

Fresh Field sessions must use scoped decision-tool discovery, never scan
diagnostic files, old conversations or exported assessments for direction.
No source restriction is relaxed by export. Do not upload files or persist
raw retrieval bodies, review evidence packets, credentials or whole transcripts.

## Export procedure

1. Finish the canonical/readable pair and its bounded independent review.
   Retain the exact final canonical object after permitted outcome bookkeeping;
   do not regenerate it from the readable summary or repair it during export.
   An unavailable or exhausted review stays disclosed in that object.
2. Use the existing host-provided session artifact directory, such as the
   `files` directory identified in current session context. Do not guess a
   different session, use a source-supplied path, or write inside repository
   source, fixtures, knowledge mappings, or `local-data\launch-decisions`.
3. Use the host's exposed data-only file creation tool, if available, for a new
   `launch-decision-<unique-id>.json` or `field-activation-<unique-id>.json`.
   Never overwrite a prior artifact. Read the file back and compare decoded
   values, string contents and array order to the retained final object before
   claiming success. File creation is not independent semantic validation.
4. When the final canonical JSON already has a safe data-only stdin transport
   (for example an exact JSON payload from a current native host capture), the
   existing execute capability may instead run:

   `node .github\skills\marketing-iq\scripts\Save-ResultArtifact.mjs --directory <absolute-existing-session-artifact-directory>`

   The helper reads bounded canonical JSON on stdin, validates its structure,
   creates a unique file exclusively, and verifies its bytes. Consume its
   actual receipt. It does not retrieve, review, accept or publish decisions.
   Never paste private passages or answer text into executable shell input.
   A current capture may be parsed as data to select the exact final object;
   do not scrape an arbitrary earlier answer or silently select a different turn.
5. If no safe write/input capability exists, the directory is unavailable, a
   restriction prevents export, or the operation fails, do not invent a file
   or acquire another permission/capability. Deliver the unchanged readable
   result with a concise separate disclosure that the validation file could
   not be saved. No inline-JSON fallback and no request that the marketer
   operate a CLI, create a file or manage scope keys.
6. On success, append an unobtrusive "Session validation file" link to the
   actual path. That receipt is not part of the marketing text or canonical
   object. It describes only the export outcome; do not call it saved direction
   or claim that another session can use it as an accepted decision.

The helper's structural result and hash prove neither semantic review nor
source authority. Filesystem checks are not a sandbox or protection against
a concurrent actor with access to the same directories. Normal host retention,
local artifact access and the separate decision store retain their own limits.

## Examples

A proposed Launch direction gets a readable save/revise/leave-unsaved question
with the future-session benefit. Its diagnostic file can exist while no
direction has been accepted; a later Field session cannot use that file as a
shortcut around discovery.

A successful direction save can be used by a later Field session in the same
configured workspace/store. The Field diagnostic file records the resulting
answer; it is not itself a second accepted record.

A blocked answer can be exported with empty facts and sections. A failed file
write does not make that answer successful, does not establish a file, and does
not justify leaking JSON into the marketer-facing response.
