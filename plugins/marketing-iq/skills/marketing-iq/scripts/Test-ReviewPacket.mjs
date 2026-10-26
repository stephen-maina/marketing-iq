import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonFile } from "./portable/json.js";

const MAX_STDIN_BYTES = 262144;
const MAX_SELECTED_PACKET_BYTES = 262144;
const MAX_EVENT_LINE_BYTES = 8 * 1024 * 1024;
const MAX_EVIDENCE_SOURCES = 3;
const MAX_EVIDENCE_BODY_CHARS = 20000;
const MAX_EVIDENCE_TOTAL_CHARS = 60000;
const CANDIDATE_KEYS = [
    "useCase",
    "status",
    "directionStatus",
    "validationMode",
    "summary",
    "sections",
    "facts",
    "sources",
    "proofGaps",
    "rejectedClaims",
    "executionTrace",
];
const SECTION_KEYS = ["name", "kind", "text", "factIds"];
const FACT_KEYS = ["id", "claim", "sourceId", "sourceUrl", "quote", "versionId", "locator"];
const SOURCE_KEYS = ["sourceId", "sourceUrl", "sourceKind", "evidenceKind", "coverage", "retrievedThisSession"];
const EVIDENCE_KEYS = ["sourceId", "sourceUrl", "body"];
const CONTEXT_KEYS = ["brief", "direction", "operationState"];
const PACKET_KEYS = ["candidate", "presentationMode", "readableView", "evidence", "context"];

const SECTION_RULES = {
    "launch-decision": [
        ["product-truth", "assessment"],
        ["planning-fit", "assessment"],
        ["market-evidence", "assessment"],
        ["audience-recommendation", "assessment"],
        ["proposition", "assessment"],
        ["next-evidence", "assessment"],
    ],
    "field-activation": [
        ["direction-basis", "assessment"],
        ["invitation", "draft-copy"],
        ["talk-track", "draft-copy"],
        ["follow-up", "draft-copy"],
        ["publication-gaps", "assessment"],
    ],
};

const ENUMS = {
    useCase: new Set(["launch-decision", "field-activation"]),
    status: new Set(["draft", "blocked"]),
    directionStatus: new Set(["not-supplied", "proposed", "user-attested-approved", "accepted-record"]),
    presentationMode: new Set(["readable-json", "readable-artifact", "json-only"]),
    kind: new Set(["assessment", "draft-copy"]),
    coverage: new Set(["partial-body", "metadata-only", "unavailable", "excluded-over-limit"]),
    sourceKind: new Set(["sharepoint", "document", "email", "meeting", "seismic", "local-file"]),
    evidenceKind: new Set(["document-excerpt", "message-excerpt", "transcript-excerpt", "meeting-summary", "metadata-only", "none"]),
};

const EXCERPT_KINDS = new Set(["document-excerpt", "message-excerpt", "transcript-excerpt"]);

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function exactKeys(value, expectedKeys) {
    if (!isPlainObject(value)) return false;
    const actual = Object.keys(value).sort();
    const expected = [...expectedKeys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function wordCount(value) {
    return value.trim().split(/\s+/u).length;
}

function countTalkTrackItems(text) {
    const numbers = [];
    for (const line of text.split(/\r?\n/u)) {
        const match = line.match(/^\s*(\d+)[.)]\s+\S/u);
        if (match) numbers.push(Number.parseInt(match[1], 10));
    }
    return numbers;
}

function makeResult() {
    return { status: "pass", findings: [] };
}

function pushFinding(result, path, reason) {
    result.status = "fail";
    result.findings.push({ path, reason });
}

function validateEnum(result, path, value, values, label) {
    if (!values.has(value)) {
        pushFinding(result, path, `${label} must be one of: ${[...values].join(", ")}`);
        return false;
    }
    return true;
}

function validateStringArray(result, path, value) {
    if (!Array.isArray(value)) {
        pushFinding(result, path, "must be an array of strings");
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        if (!isNonEmptyString(entry)) {
            pushFinding(result, `${path}[${index}]`, "must be a non-empty string");
            ok = false;
        }
    });
    return ok;
}

function validateSectionNamesAndKinds(result, candidate) {
    if (!Array.isArray(candidate.sections) || !Array.isArray(candidate.facts)) return;
    if (candidate.status === "blocked") {
        if (candidate.sections.length !== 0) {
            pushFinding(result, "candidate.sections", "blocked candidates must have empty sections");
        }
        if (candidate.facts.length !== 0) {
            pushFinding(result, "candidate.facts", "blocked candidates must have empty facts");
        }
        return;
    }

    if (!ENUMS.useCase.has(candidate.useCase)) return;
    const rules = SECTION_RULES[candidate.useCase];
    if (candidate.sections.length !== rules.length) {
        pushFinding(result, "candidate.sections", `draft ${candidate.useCase} candidates must contain exactly ${rules.length} sections`);
        return;
    }

    rules.forEach(([name, kind]) => {
        const matches = candidate.sections.filter(section => isPlainObject(section) && section.name === name);
        if (matches.length !== 1) {
            pushFinding(result, "candidate.sections", `must contain exactly one "${name}" section`);
            return;
        }
        const index = candidate.sections.indexOf(matches[0]);
        if (matches[0].kind !== kind) {
            pushFinding(result, `candidate.sections[${index}].kind`, `must be "${kind}"`);
        }
    });

    if (candidate.useCase === "field-activation") {
        const index = candidate.sections.findIndex(section => isPlainObject(section) && section.name === "talk-track");
        const talkTrack = candidate.sections[index]?.text;
        if (typeof talkTrack === "string") {
            const numbers = countTalkTrackItems(talkTrack);
            const valid = numbers.length === 3 && numbers[0] === 1 && numbers[1] === 2 && numbers[2] === 3;
            if (!valid) {
                pushFinding(result, `candidate.sections[${index}].text`, "Field talk-track must contain exactly three numbered items");
            }
        }
    }
}

function locateReadableCopyRanges(readableView, candidate) {
    const ranges = [];
    if (candidate.useCase !== "field-activation" || candidate.status !== "draft" || !Array.isArray(candidate.sections)) return ranges;

    for (const [index, section] of candidate.sections.entries()) {
        if (!isPlainObject(section) || section.kind !== "draft-copy" || !isNonEmptyString(section.text)) continue;
        let start = readableView.indexOf(section.text);
        while (start !== -1) {
            ranges.push({ start, end: start + section.text.length, path: `candidate.sections[${index}].text` });
            start = readableView.indexOf(section.text, start + section.text.length);
        }
    }
    return ranges;
}

function validateReadableView(result, packet, candidate, facts) {
    if (packet.presentationMode === "json-only") {
        if (packet.readableView !== null) {
            pushFinding(result, "readableView", "json-only packets must set readableView to null");
        }
        return;
    }

    if (!isNonEmptyString(packet.readableView)) {
        pushFinding(result, "readableView", "readable packets must provide a non-empty readableView string");
        return;
    }

    const readableView = packet.readableView;
    const copyRanges = locateReadableCopyRanges(readableView, candidate);

    if (candidate.useCase === "field-activation" && candidate.status === "draft" && Array.isArray(candidate.sections)) {
        for (const [index, section] of candidate.sections.entries()) {
            if (!isPlainObject(section) || section.kind !== "draft-copy" || !isNonEmptyString(section.text)) continue;
            if (!readableView.includes(section.text)) {
                pushFinding(result, `candidate.sections[${index}].text`, "Field draft-copy must be reproduced verbatim in readableView");
            }
        }
    }

    // Citation completeness is semantic; only validate inline citations actually present.
    for (const match of readableView.matchAll(/\[(F\d+)\]\(/gu)) {
        const fact = facts.find(item => item.id === match[1]);
        const tail = readableView.slice(match.index + match[0].length);
        const url = fact?.sourceUrl;
        let remainder = null;
        if (typeof url === "string" && tail.startsWith(`<${url}>`)) remainder = tail.slice(url.length + 2);
        else if (typeof url === "string" && tail.startsWith(url)) remainder = tail.slice(url.length);
        if (remainder === null || !/^(?:[ \t]+(?:"[^"\r\n]*"|'[^'\r\n]*'))?[ \t]*\)/u.test(remainder)) {
            pushFinding(result, "readableView", "Inline fact citation must reference an existing fact and its exact source URL");
        }
        if (copyRanges.some(range => match.index >= range.start && match.index < range.end)) {
            pushFinding(result, "readableView", "Inline fact citations must stay outside verbatim Field copy");
        }
    }
}

function validateSources(result, candidate) {
    const sourceMap = new Map();
    if (!Array.isArray(candidate.sources)) {
        pushFinding(result, "candidate.sources", "must be an array");
        return sourceMap;
    }
    if (candidate.sources.filter(source => isPlainObject(source) &&
        (source.coverage === "partial-body" || source.coverage === "metadata-only")).length > MAX_EVIDENCE_SOURCES) {
        pushFinding(result, "candidate.sources", "must contain at most 3 admitted sources");
    }

    candidate.sources.forEach((source, index) => {
        const path = `candidate.sources[${index}]`;
        if (!exactKeys(source, SOURCE_KEYS)) {
            pushFinding(result, path, "must contain only canonical source fields");
            return;
        }
        if (!isNonEmptyString(source.sourceId)) {
            pushFinding(result, `${path}.sourceId`, "must be a non-empty string");
        }
        if (!isNonEmptyString(source.sourceUrl)) {
            pushFinding(result, `${path}.sourceUrl`, "must be a non-empty string");
        }
        validateEnum(result, `${path}.sourceKind`, source.sourceKind, ENUMS.sourceKind, "sourceKind");
        validateEnum(result, `${path}.coverage`, source.coverage, ENUMS.coverage, "coverage");
        validateEnum(result, `${path}.evidenceKind`, source.evidenceKind, ENUMS.evidenceKind, "evidenceKind");
        if (typeof source.retrievedThisSession !== "boolean") {
            pushFinding(result, `${path}.retrievedThisSession`, "must be a boolean");
        }

        if (source.coverage === "partial-body" && !EXCERPT_KINDS.has(source.evidenceKind)) {
            pushFinding(result, path, "partial-body sources must use a fresh excerpt evidenceKind");
        }
        if (source.coverage === "unavailable" && source.evidenceKind !== "none") {
            pushFinding(result, path, "unavailable sources must use evidenceKind none");
        }

        const existing = sourceMap.get(source.sourceId);
        if (existing) {
            pushFinding(result, `${path}.sourceId`, "sourceId values must be unique");
            return;
        }
        sourceMap.set(source.sourceId, source);
    });

    return sourceMap;
}

function validateEvidence(result, evidence) {
    const evidenceMap = new Map();
    if (!Array.isArray(evidence)) {
        pushFinding(result, "evidence", "must be an array");
        return evidenceMap;
    }
    if (evidence.length > MAX_EVIDENCE_SOURCES) {
        pushFinding(result, "evidence", `must contain at most ${MAX_EVIDENCE_SOURCES} sources`);
    }

    let totalChars = 0;
    evidence.forEach((item, index) => {
        const path = `evidence[${index}]`;
        if (!exactKeys(item, EVIDENCE_KEYS)) {
            pushFinding(result, path, "must contain only sourceId, sourceUrl, and body");
            return;
        }
        if (!isNonEmptyString(item.sourceId)) {
            pushFinding(result, `${path}.sourceId`, "must be a non-empty string");
        }
        if (!isNonEmptyString(item.sourceUrl)) {
            pushFinding(result, `${path}.sourceUrl`, "must be a non-empty string");
        }
        if (!isNonEmptyString(item.body)) {
            pushFinding(result, `${path}.body`, "must be a non-empty string");
        } else {
            if (item.body.length > MAX_EVIDENCE_BODY_CHARS) {
                pushFinding(result, `${path}.body`, `must be at most ${MAX_EVIDENCE_BODY_CHARS} characters`);
            }
            totalChars += item.body.length;
        }

        if (evidenceMap.has(item.sourceId)) {
            pushFinding(result, `${path}.sourceId`, "evidence sourceId values must be unique");
            return;
        }
        evidenceMap.set(item.sourceId, item);
    });

    if (totalChars > MAX_EVIDENCE_TOTAL_CHARS) {
        pushFinding(result, "evidence", `combined evidence bodies must be at most ${MAX_EVIDENCE_TOTAL_CHARS} characters`);
    }

    return evidenceMap;
}

function validateFacts(result, candidate, sourceMap, evidenceMap) {
    const factMap = new Map();
    if (!Array.isArray(candidate.facts)) {
        pushFinding(result, "candidate.facts", "must be an array");
        return factMap;
    }

    candidate.facts.forEach((fact, index) => {
        const path = `candidate.facts[${index}]`;
        if (!exactKeys(fact, FACT_KEYS)) {
            pushFinding(result, path, "must contain only canonical fact fields");
            return;
        }
        const expectedId = `F${index + 1}`;
        if (fact.id !== expectedId) {
            pushFinding(result, `${path}.id`, `must be sequential in output order starting at ${expectedId}`);
        }
        if (!isNonEmptyString(fact.claim)) {
            pushFinding(result, `${path}.claim`, "must be a non-empty string");
        }
        if (!isNonEmptyString(fact.sourceId)) {
            pushFinding(result, `${path}.sourceId`, "must be a non-empty string");
        }
        if (!isNonEmptyString(fact.sourceUrl)) {
            pushFinding(result, `${path}.sourceUrl`, "must be a non-empty string");
        }
        if (!isNonEmptyString(fact.quote)) {
            pushFinding(result, `${path}.quote`, "must be a non-empty string");
        } else if (wordCount(fact.quote) > 35) {
            pushFinding(result, `${path}.quote`, "must be 35 whitespace-delimited words or fewer");
        }
        if (!(fact.versionId === null || typeof fact.versionId === "string")) {
            pushFinding(result, `${path}.versionId`, "must be a string or null");
        }
        if (!(fact.locator === null || typeof fact.locator === "string")) {
            pushFinding(result, `${path}.locator`, "must be a string or null");
        }

        if (factMap.has(fact.id)) {
            pushFinding(result, `${path}.id`, "fact ids must be unique");
        }
        factMap.set(fact.id, fact);

        const source = sourceMap.get(fact.sourceId);
        if (!source) {
            pushFinding(result, path, "fact sourceId must exactly match a candidate source");
            return;
        }
        if (source.sourceUrl !== fact.sourceUrl) {
            pushFinding(result, path, "fact sourceId and sourceUrl must exactly match the joined candidate source");
        }
        if (source.coverage !== "partial-body" || source.retrievedThisSession !== true || !EXCERPT_KINDS.has(source.evidenceKind)) {
            pushFinding(result, path, "facts may cite only fresh partial-body excerpt sources");
        }

        // Only the explicitly structural export path omits evidence occurrence checks.
        if (evidenceMap === null) return;
        const evidence = evidenceMap.get(fact.sourceId);
        if (!evidence) {
            pushFinding(result, path, "fact sourceId must exactly match an evidence entry");
            return;
        }
        if (evidence.sourceUrl !== fact.sourceUrl) {
            pushFinding(result, path, "fact sourceId and sourceUrl must exactly match the joined evidence entry");
        }
        if (typeof fact.quote === "string" && typeof evidence.body === "string" && !evidence.body.includes(fact.quote)) {
            pushFinding(result, `${path}.quote`, "must occur exactly in matching evidence for the cited identity");
        }
    });

    return factMap;
}

function validateSections(result, candidate, factMap) {
    if (!Array.isArray(candidate.sections)) {
        pushFinding(result, "candidate.sections", "must be an array");
        return;
    }

    candidate.sections.forEach((section, index) => {
        const path = `candidate.sections[${index}]`;
        if (!exactKeys(section, SECTION_KEYS)) {
            pushFinding(result, path, "must contain only canonical section fields");
            return;
        }
        if (!isNonEmptyString(section.name)) {
            pushFinding(result, `${path}.name`, "must be a non-empty string");
        }
        validateEnum(result, `${path}.kind`, section.kind, ENUMS.kind, "kind");
        if (!isNonEmptyString(section.text)) {
            pushFinding(result, `${path}.text`, "must be a non-empty string");
        }
        if (!Array.isArray(section.factIds)) {
            pushFinding(result, `${path}.factIds`, "must be an array of fact ids");
            return;
        }
        const seen = new Set();
        section.factIds.forEach((factId, factIndex) => {
            if (!isNonEmptyString(factId)) {
                pushFinding(result, `${path}.factIds[${factIndex}]`, "must be a non-empty string");
                return;
            }
            if (seen.has(factId)) {
                pushFinding(result, `${path}.factIds[${factIndex}]`, "fact ids must not repeat within a section");
            }
            seen.add(factId);
            if (!factMap.has(factId)) {
                pushFinding(result, `${path}.factIds[${factIndex}]`, "must reference an existing fact");
            }
        });
    });
}

function validateCandidate(result, candidate, evidenceMap) {
    if (!exactKeys(candidate, CANDIDATE_KEYS)) {
        pushFinding(result, "candidate", "candidate must contain only canonical shared-answer fields");
        return { factMap: new Map(), sourceMap: new Map() };
    }

    validateEnum(result, "candidate.useCase", candidate.useCase, ENUMS.useCase, "useCase");
    validateEnum(result, "candidate.status", candidate.status, ENUMS.status, "status");
    validateEnum(result, "candidate.directionStatus", candidate.directionStatus, ENUMS.directionStatus, "directionStatus");
    if (candidate.validationMode !== "session-review") {
        pushFinding(result, "candidate.validationMode", "must be session-review");
    }
    if (!isNonEmptyString(candidate.summary)) {
        pushFinding(result, "candidate.summary", "must be a non-empty string");
    }
    validateStringArray(result, "candidate.proofGaps", candidate.proofGaps);
    validateStringArray(result, "candidate.rejectedClaims", candidate.rejectedClaims);
    if (!isNonEmptyString(candidate.executionTrace)) {
        pushFinding(result, "candidate.executionTrace", "must be a non-empty string");
    }

    const sourceMap = validateSources(result, candidate);
    validateSectionNamesAndKinds(result, candidate);
    const factMap = validateFacts(result, candidate, sourceMap, evidenceMap);
    validateSections(result, candidate, factMap);
    return { factMap, sourceMap };
}

function validateContext(result, context) {
    if (!exactKeys(context, CONTEXT_KEYS)) {
        pushFinding(result, "context", "context must contain only brief, direction, and operationState");
        return;
    }
    if (!isNonEmptyString(context.brief)) {
        pushFinding(result, "context.brief", "must be a non-empty string");
    }
    if (!isNonEmptyString(context.direction)) {
        pushFinding(result, "context.direction", "must be a non-empty string");
    }
    if (!isNonEmptyString(context.operationState)) {
        pushFinding(result, "context.operationState", "must be a non-empty string");
    }
}

// A structural pass is not quote occurrence, independent review, or acceptance.
export function validateCandidateStructure(candidate) {
    const result = makeResult();
    validateCandidate(result, candidate, null);
    return result;
}

export function validateReviewPacket(packet) {
    const result = makeResult();

    if (!isPlainObject(packet)) {
        pushFinding(result, "$", "packet must be an object");
        return result;
    }
    if (!exactKeys(packet, PACKET_KEYS)) {
        pushFinding(result, "$", "packet must contain only candidate, presentationMode, readableView, evidence, and context");
        return result;
    }

    validateEnum(result, "presentationMode", packet.presentationMode, ENUMS.presentationMode, "presentationMode");
    const evidenceMap = validateEvidence(result, packet.evidence);

    if (!isPlainObject(packet.candidate)) {
        pushFinding(result, "candidate", "candidate must be an object");
    }
    if (!isPlainObject(packet.context)) {
        pushFinding(result, "context", "context must be an object");
    }

    const factMap = isPlainObject(packet.candidate)
        ? validateCandidate(result, packet.candidate, evidenceMap).factMap
        : new Map();
    if (isPlainObject(packet.context)) {
        validateContext(result, packet.context);
    }
    if (isPlainObject(packet.candidate)) {
        validateReadableView(result, packet, packet.candidate, [...factMap.values()]);
    }

    return result;
}

async function readBoundedStdin() {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > MAX_STDIN_BYTES) {
            return { error: { status: "fail", findings: [{ path: "input", reason: "Stdin packet exceeded the supported size bound" }] } };
        }
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw.trim().length === 0) {
        return { error: { status: "fail", findings: [{ path: "input", reason: "No stdin packet was supplied" }] } };
    }
    return { raw };
}

function validateCliArgs(args) {
    if (args.length === 0) return { mode: "stdin" };
    if (args.length === 2 && args[0] === "--packet-file")
        return { mode: "file", packetPath: args[1] };
    if (args.length === 4 && args[0] === "--events" && args[2] === "--call") {
        return { mode: "events", eventsPath: args[1], callId: args[3] };
    }
    if (args.length === 6 && args[0] === "--events" && args[2] === "--call" && args[4] === "--turn") {
        if (!/^(0|[1-9]\d*)$/u.test(args[5])) {
            return { error: { status: "fail", findings: [{ path: "input.cli", reason: "The --turn value must be a nonnegative integer" }] } };
        }
        return { mode: "events", eventsPath: args[1], callId: args[3], turn: Number.parseInt(args[5], 10) };
    }
    return { error: { status: "fail", findings: [{ path: "input.cli", reason: "Invalid arguments; use stdin, --packet-file <absolute-data.json>, --events <absolute events.jsonl> --call <toolCallId>, or add --turn <nonnegative integer> to events mode" }] } };
}

async function parsePacketJson(raw, pathPrefix) {
    if (Buffer.byteLength(raw, "utf8") > MAX_SELECTED_PACKET_BYTES) {
        return { status: "fail", findings: [{ path: pathPrefix, reason: "Selected packet exceeded the supported size bound" }] };
    }
    let packet;
    try {
        packet = JSON.parse(raw);
    } catch {
        return { status: "fail", findings: [{ path: pathPrefix, reason: "Selected tool result content was not valid JSON" }] };
    }
    return validateReviewPacket(packet);
}

function extractTurnPacketFromReadAgentContent(content, pathPrefix, turn) {
    if (/^Output too large\b[^\n]*Saved to:/u.test(content)) {
        return {
            status: "fail",
            findings: [{
                path: pathPrefix,
                reason: "Selected read_agent content was a truncated host preview; use the observed host capture path and pipe the exact turn payload to stdin",
            }],
        };
    }
    if (content.startsWith("Agent is running")) {
        return { status: "fail", findings: [{ path: pathPrefix, reason: "Selected read_agent content must use an idle or completed header, not a running header" }] };
    }
    const headerMatch = content.match(/^Agent is (idle|completed)\b[^\n]*\r?\n\r?\n/u);
    if (!headerMatch) {
        return { status: "fail", findings: [{ path: pathPrefix, reason: "Selected read_agent content must begin with an idle or completed host header" }] };
    }

    const turnHeaders = [];
    const turnPattern = /^\[Turn (\d+)\]\r?$/gmu;
    let match;
    while ((match = turnPattern.exec(content)) !== null) {
        turnHeaders.push({
            number: Number.parseInt(match[1], 10),
            index: match.index,
            header: match[0],
        });
    }

    const selectedTurns = turnHeaders.filter(item => item.number === turn);
    if (selectedTurns.length === 0) {
        return { status: "fail", findings: [{ path: pathPrefix, reason: `No exact [Turn ${turn}] block was found in the selected read_agent content` }] };
    }
    if (selectedTurns.length > 1) {
        return { status: "fail", findings: [{ path: pathPrefix, reason: `Multiple exact [Turn ${turn}] blocks were found in the selected read_agent content` }] };
    }

    const selected = selectedTurns[0];
    const allIndex = turnHeaders.findIndex(item => item.index === selected.index);
    const start = selected.index + selected.header.length;
    const end = allIndex + 1 < turnHeaders.length ? turnHeaders[allIndex + 1].index : content.length;
    let turnBody = content.slice(start, end).trim();
    if (/^\[Message\]\r?\n/u.test(turnBody)) {
        const responses = [...turnBody.matchAll(/^\[Response\]\r?$/gmu)];
        if (responses.length !== 1) {
            return { status: "fail", findings: [{ path: pathPrefix, reason: "Follow-up turn must contain exactly one response boundary" }] };
        }
        const response = responses[0];
        turnBody = turnBody.slice(response.index + response[0].length).trim();
    }
    return parsePacketJson(turnBody, `${pathPrefix}.turn[${turn}]`);
}

class EventLineLimitError extends Error {}

async function* boundedEventLines(stream) {
    let pending = "";
    for await (const chunk of stream) {
        pending += chunk;
        let end;
        while ((end = pending.indexOf("\n")) !== -1) {
            const line = pending.slice(0, end);
            if (Buffer.byteLength(line, "utf8") > MAX_EVENT_LINE_BYTES) throw new EventLineLimitError();
            yield line;
            pending = pending.slice(end + 1);
        }
        if (Buffer.byteLength(pending, "utf8") > MAX_EVENT_LINE_BYTES) throw new EventLineLimitError();
    }
    if (pending.length) yield pending;
}

async function readPacketFromEvents(eventsPath, callId, turn) {
    if (!isNonEmptyString(callId)) {
        return { status: "fail", findings: [{ path: "input.cli", reason: "The --call value must be a non-empty toolCallId" }] };
    }
    if (!isAbsolute(eventsPath)) {
        return { status: "fail", findings: [{ path: "input.events", reason: "The --events path must be absolute" }] };
    }
    if (basename(eventsPath).toLowerCase() !== "events.jsonl") {
        return { status: "fail", findings: [{ path: "input.events", reason: "The --events path must target a native events.jsonl file" }] };
    }

    try {
        await access(eventsPath, constants.R_OK);
    } catch {
        return { status: "fail", findings: [{ path: "input.events", reason: "The native events file was unavailable" }] };
    }

    const stream = createReadStream(eventsPath, { encoding: "utf8" });
    let matchCount = 0;
    let selectedEvent = null;
    let selectedMetadata = null;
    let matchingStartCount = 0;
    let matchingReadAgentStartCount = 0;
    let lineNumber = 0;

    try {
        for await (const line of boundedEventLines(stream)) {
            lineNumber += 1;
            if (line.trim().length === 0) continue;
            let event;
            try {
                event = JSON.parse(line);
            } catch {
                return { status: "fail", findings: [{ path: `input.events[line ${lineNumber}]`, reason: "The native events file contained malformed JSONL" }] };
            }
            if (event?.data?.toolCallId !== callId) continue;
            if (event?.type === "tool.execution_start") {
                matchingStartCount += 1;
                if (event?.data?.toolName === "read_agent") {
                    matchingReadAgentStartCount += 1;
                }
                continue;
            }
            if (event?.type === "tool.execution_complete") {
                matchCount += 1;
                selectedEvent = event;
                selectedMetadata = event?.id ?? `line ${lineNumber}`;
                if (matchCount > 1) {
                    return { status: "fail", findings: [{ path: "input.events", reason: "Multiple matching tool.execution_complete events were found for the selected callId" }] };
                }
            }
        }
    } catch (error) {
        if (error instanceof EventLineLimitError) {
            return { status: "fail", findings: [{ path: "input.events", reason: "Native event line exceeded the supported size bound" }] };
        }
        return { status: "fail", findings: [{ path: "input.events", reason: "The native events file could not be read safely" }] };
    } finally {
        stream.destroy();
    }

    if (matchCount === 0 || selectedEvent === null) {
        return { status: "fail", findings: [{ path: "input.events", reason: "No matching tool.execution_complete event was found for the selected callId" }] };
    }
    if (selectedEvent?.data?.success !== true) {
        return { status: "fail", findings: [{ path: "input.events", reason: "The selected tool execution did not succeed" }] };
    }
    const content = selectedEvent?.data?.result?.content;
    if (typeof content !== "string") {
        return { status: "fail", findings: [{ path: `input.events[${selectedMetadata}].data.result.content`, reason: "The selected tool result did not contain a string content payload" }] };
    }
    if (turn !== undefined) {
        if (matchingStartCount !== 1 || matchingReadAgentStartCount !== 1) {
            return { status: "fail", findings: [{ path: "input.events", reason: "Selected --turn extraction requires exactly one matching tool.execution_start with toolName read_agent" }] };
        }
        return extractTurnPacketFromReadAgentContent(content, `input.events[${selectedMetadata}]`, turn);
    }
    return parsePacketJson(content, `input.events[${selectedMetadata}]`);
}

async function runCli() {
    const args = validateCliArgs(process.argv.slice(2));
    if (args.error) return args.error;

    if (args.mode === "events") {
        return readPacketFromEvents(args.eventsPath, args.callId, args.turn);
    }
    if (args.mode === "file") {
        try { return validateReviewPacket(await readJsonFile(args.packetPath, MAX_SELECTED_PACKET_BYTES)); }
        catch {
            return { status: "fail", findings: [{ path: "input.file", reason: "Packet file was unavailable, unsafe, oversized, or not strict UTF-8 JSON" }] };
        }
    }

    const stdin = await readBoundedStdin();
    if (stdin.error) return stdin.error;
    return parsePacketJson(stdin.raw, "input");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const result = await runCli();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "pass" ? 0 : 1;
}
