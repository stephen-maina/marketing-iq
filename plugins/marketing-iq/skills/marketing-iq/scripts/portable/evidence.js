import { instant } from "./instant.js";
import { MiqError, keys, label, requireThat, text } from "./json.js";
const sourceKinds = ["sharepoint", "document", "email", "meeting", "seismic", "local-file"];
const excerptKinds = ["document-excerpt", "message-excerpt", "transcript-excerpt"];
const evidenceKinds = [...excerptKinds, "meeting-summary", "metadata-only", "none"];
const coverages = ["partial-body", "metadata-only", "unavailable", "excluded-over-limit"];
function https(value) {
    const input = text(value, 4096);
    requireThat(/^https:\/\//i.test(input) && !/[\s\\]/.test(input));
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw new MiqError("INVALID_REQUEST");
    }
    requireThat(url.protocol === "https:" && !url.username && !url.password && !url.hash);
    const originalPath = input.replace(/^https:\/\/[^/?#]+/i, "").split("?")[0];
    for (const part of originalPath.split("/")) {
        let decoded;
        try {
            decoded = decodeURIComponent(part);
        }
        catch {
            throw new MiqError("INVALID_REQUEST");
        }
        requireThat(!/[%/\\\x00-\x1f\x7f]/.test(decoded) && decoded !== "." && decoded !== "..");
    }
    return url;
}
function segments(url) {
    return url.pathname.split("/").filter(Boolean).map(part => {
        let decoded;
        try {
            decoded = decodeURIComponent(part);
        }
        catch {
            requireThat(false);
        }
        requireThat(!/[%/\\\x00-\x1f\x7f]/.test(decoded) && decoded !== "." && decoded !== "..");
        return decoded;
    });
}
function contains(boundary, location) {
    const prefix = segments(boundary), path = segments(location);
    return boundary.origin === location.origin && prefix.length <= path.length &&
        prefix.every((part, index) => part === path[index]);
}
export function normalizeEvidence(value, selectedAdapter) {
    const raw = keys(value, ["schemaVersion", "adapterId", "outcome", "scope", "sources"]);
    requireThat(raw.schemaVersion === 1 && label(raw.adapterId) === label(selectedAdapter) &&
        typeof raw.outcome === "string" &&
        ["ok", "denied", "unavailable", "unsupported"].includes(raw.outcome) && Array.isArray(raw.sources));
    const scope = keys(raw.scope, ["kind", "url"]);
    requireThat(scope.kind === "exact" || scope.kind === "container");
    const boundary = https(scope.url);
    segments(boundary);
    requireThat(scope.kind !== "container" || boundary.search === "");
    requireThat(raw.sources.length <= 100);
    const sources = [], evidence = [], proofGaps = [];
    const provenance = [], seen = new Set(), seenUrls = new Set();
    if (raw.outcome !== "ok") {
        requireThat(raw.sources.length === 0);
        return { schemaVersion: 1, status: "blocked", adapterId: selectedAdapter, sources, evidence,
            provenance, proofGaps: [`Adapter outcome: ${raw.outcome}; no fallback or access inference.`] };
    }
    let characters = 0, admissions = 0;
    for (const item of raw.sources) {
        const entry = keys(item, ["sourceId", "sourceUrl", "sourceKind", "evidenceKind", "coverage",
            "retrievedThisSession", "body", "versionId", "locator", "restrictions", "provenance"]);
        const sourceId = text(entry.sourceId, 4096), sourceUrl = text(entry.sourceUrl, 4096);
        const observed = https(sourceUrl);
        segments(observed);
        requireThat(!seen.has(sourceId) && !seenUrls.has(sourceUrl));
        seen.add(sourceId);
        seenUrls.add(sourceUrl);
        requireThat(typeof entry.sourceKind === "string" && sourceKinds.includes(entry.sourceKind) &&
            typeof entry.evidenceKind === "string" && evidenceKinds.includes(entry.evidenceKind) &&
            typeof entry.coverage === "string" && coverages.includes(entry.coverage) &&
            typeof entry.retrievedThisSession === "boolean");
        requireThat(entry.versionId === null || typeof entry.versionId === "string");
        requireThat(entry.locator === null || typeof entry.locator === "string");
        const restrictions = keys(entry.restrictions, ["access", "usage", "sensitivityLabel"]);
        requireThat(typeof restrictions.access === "string" && ["allowed", "denied", "unknown"].includes(restrictions.access) &&
            typeof restrictions.usage === "string" && ["internal-review", "prohibited", "unknown"].includes(restrictions.usage) &&
            (restrictions.sensitivityLabel === null || typeof restrictions.sensitivityLabel === "string"));
        const origin = keys(entry.provenance, ["tool", "observedAt", "currentResponse", "locationUrl"]);
        const tool = text(origin.tool, 256);
        instant(origin.observedAt);
        requireThat(typeof origin.currentResponse === "boolean");
        const location = origin.locationUrl === null ? observed : https(origin.locationUrl);
        if (selectedAdapter === "workiq") {
            requireThat(["workiq-retrieve", "workiq/retrieve"].includes(tool) &&
                ["sharepoint", "email", "meeting"].includes(entry.sourceKind));
        }
        if (selectedAdapter === "local-file") {
            requireThat(origin.tool === "local-file-read" && entry.sourceKind === "local-file" &&
                observed.hostname.endsWith(".invalid"));
        }
        let coverage = entry.coverage;
        const evidenceKind = entry.evidenceKind;
        if (coverage === "partial-body") {
            requireThat(excerptKinds.includes(evidenceKind) && entry.retrievedThisSession === true &&
                origin.currentResponse === true);
            text(entry.body, 262144);
        }
        else
            requireThat(entry.body === null);
        if (coverage === "metadata-only")
            requireThat(entry.retrievedThisSession === true && origin.currentResponse === true);
        if (coverage === "unavailable")
            requireThat(evidenceKind === "none" && entry.retrievedThisSession === false);
        const inScope = scope.kind === "exact" ? sourceUrl === scope.url :
            observed.origin === boundary.origin && contains(boundary, location);
        if (!inScope || restrictions.access !== "allowed" || restrictions.usage === "prohibited") {
            proofGaps.push(`${sourceId}: excluded (${!inScope ? "outside selected scope" :
                restrictions.access !== "allowed" ? "access denied or unverified" : "usage prohibited"}).`);
            continue;
        }
        // The CLI never sees the membership metadata behind locationUrl, so containment that rests on it
        // is a caller statement. Admit it, but keep that limit visible to review and the reader.
        if (scope.kind === "container" && origin.locationUrl !== null && !contains(boundary, observed))
            proofGaps.push(`${sourceId}: in scope only through caller-stated location ${location.href}; ` +
                "membership metadata was not verified by this check.");
        if (coverage === "partial-body" || coverage === "metadata-only") {
            if (admissions >= 3 || typeof entry.body === "string" &&
                (entry.body.length > 20000 || characters + entry.body.length > 60000)) {
                coverage = "excluded-over-limit";
                proofGaps.push(`${sourceId}: excluded over evidence limits; body was not truncated.`);
            }
            else {
                admissions++;
                if (typeof entry.body === "string") {
                    characters += entry.body.length;
                    evidence.push({ sourceId, sourceUrl, body: entry.body });
                }
            }
        }
        sources.push({ sourceId, sourceUrl, sourceKind: entry.sourceKind, evidenceKind, coverage,
            retrievedThisSession: entry.retrievedThisSession });
        provenance.push({ sourceId, versionId: entry.versionId, locator: entry.locator, restrictions, ...origin });
        if (restrictions.usage === "unknown" || restrictions.sensitivityLabel === null)
            proofGaps.push(`${sourceId}: use restrictions or sensitivity are not fully established; internal review only.`);
        if (restrictions.sensitivityLabel !== null)
            proofGaps.push(`${sourceId}: observed sensitivity label: ${restrictions.sensitivityLabel}.`);
        if (coverage !== "partial-body")
            proofGaps.push(`${sourceId}: ${coverage}; not factual body support.`);
    }
    if (selectedAdapter === "local-file")
        proofGaps.push("Synthetic local-file sample, explicitly selected; not live enterprise retrieval or approval.");
    if (evidence.length === 0)
        proofGaps.push("No admissible current body evidence.");
    return { schemaVersion: 1, status: evidence.length ? "ready" : "blocked", adapterId: selectedAdapter,
        sources, evidence, provenance, proofGaps };
}
// R3: build the normal handoff from a host-captured connector result selected by line range,
// so source text is never rebuilt by the model in a script or a written file.
export const captureSeparator = "\n[...]\n";
export const captureMaxAgeMs = 6 * 3600 * 1000;
export function captureHandoff(source, modifiedMs, nowMs, options) {
    requireThat(label(options.adapter) !== "local-file");
    requireThat(modifiedMs <= nowMs + 300000 && nowMs - modifiedMs <= captureMaxAgeMs, "CAPTURE_STALE");
    const all = source.split(/\r?\n/);
    const parts = text(options.lines, 512).split(",");
    requireThat(parts.length <= 20);
    let previous = 0;
    const ranges = parts.map(part => {
        const match = /^([1-9]\d{0,6})-([1-9]\d{0,6})$/.exec(part);
        requireThat(match);
        const first = Number(match[1]), last = Number(match[2]);
        // Ascending, non-overlapping and non-adjacent: adjacent ranges must be one range,
        // otherwise the separator would claim a gap that does not exist.
        requireThat(first <= last && last <= all.length && (previous === 0 ? first >= 1 : first >= previous + 2));
        previous = last;
        return all.slice(first - 1, last).join("\n");
    });
    for (const range of ranges)
        requireThat(range.trim().length > 0);
    return {
        schemaVersion: 1, adapterId: options.adapter, outcome: "ok",
        scope: { kind: options.scopeKind, url: options.scopeUrl },
        sources: [{
                sourceId: options.sourceUrl, sourceUrl: options.sourceUrl, sourceKind: options.sourceKind,
                evidenceKind: "document-excerpt", coverage: "partial-body", retrievedThisSession: true,
                body: ranges.join(captureSeparator), versionId: null, locator: null,
                restrictions: { access: "allowed", usage: "unknown", sensitivityLabel: null },
                provenance: { tool: options.tool, observedAt: new Date(modifiedMs).toISOString(), currentResponse: true, locationUrl: null }
            }]
    };
}
// Trials A3/A4: admit WorkIQ hits straight from the host's own events.jsonl record of a
// workiq-retrieve call, so no model-written script rebuilds source text. The scope is the call's
// own single items_by_url folder: a retrieval bounded only by query text cannot be admitted.
const workiqResults = "application/vnd.ms-workiq.retrieval";
const snippetMarker = "- **snippet:** ";
function selections(select) {
    const parts = text(select, 2048).split("+");
    requireThat(parts.length >= 1 && parts.length <= 10);
    const seen = new Set();
    return parts.map(part => {
        const match = /^([A-Za-z0-9_-]{1,128}):((?:0|[1-9]\d{0,2})(?:,(?:0|[1-9]\d{0,2}))*)$/.exec(part);
        requireThat(match && !seen.has(match[1]));
        seen.add(match[1]);
        const indices = match[2].split(",").map(Number);
        requireThat(indices.every((value, index) => index === 0 || value > indices[index - 1]));
        return { callId: match[1], indices };
    });
}
function hostEvents(source) {
    const lines = source.split("\n");
    // A live log's last line may still be mid-write; only newline-terminated lines are complete.
    if (!source.endsWith("\n"))
        lines.pop();
    const events = [];
    for (const line of lines) {
        const trimmed = line.replace(/\r$/, "");
        if (!trimmed.trim())
            continue;
        let value;
        try {
            value = JSON.parse(trimmed);
        }
        catch {
            throw new MiqError("CAPTURE_UNAVAILABLE");
        }
        requireThat(value !== null && typeof value === "object" && !Array.isArray(value), "CAPTURE_UNAVAILABLE");
        events.push(value);
    }
    return events;
}
const field = (value, name) => value !== null && typeof value === "object" && !Array.isArray(value) ? value[name] : undefined;
// One successful call in the record: exactly one start and one completion for the id.
function completedCall(events, callId) {
    const mine = events.filter(event => field(field(event, "data"), "toolCallId") === callId);
    const starts = mine.filter(event => event.type === "tool.execution_start");
    const completes = mine.filter(event => event.type === "tool.execution_complete");
    requireThat(starts.length === 1 && completes.length === 1 &&
        field(completes[0].data, "success") === true, "CAPTURE_UNAVAILABLE");
    return { start: starts[0], complete: completes[0] };
}
export function workiqEventsHandoff(source, nowMs, select) {
    const chosen = selections(select);
    const events = hostEvents(source);
    let scope;
    const sources = [], ids = new Set(), urls = new Set(), gaps = [];
    for (const { callId, indices } of chosen) {
        const call = completedCall(events, callId);
        const starts = [call.start], completes = [call.complete];
        requireThat(field(starts[0].data, "toolName") === "workiq-retrieve", "CAPTURE_UNAVAILABLE");
        const capabilities = field(field(starts[0].data, "arguments"), "capabilities");
        const bounds = (Array.isArray(capabilities) ? capabilities : []).flatMap(capability => {
            const items = field(capability, "items_by_url");
            return Array.isArray(items) ? items.map(item => field(item, "url")) : [];
        });
        requireThat(bounds.length === 1 && typeof bounds[0] === "string", "RETRIEVAL_NOT_BOUNDED");
        requireThat(scope === undefined || scope === bounds[0], "SCOPE_MISMATCH");
        scope = bounds[0];
        const observedAt = text(completes[0].timestamp, 64);
        const observedMs = Date.parse(observedAt);
        instant(observedAt);
        requireThat(Number.isFinite(observedMs) && observedMs <= nowMs + 300000 && nowMs - observedMs <= captureMaxAgeMs, "CAPTURE_STALE");
        const result = field(completes[0].data, "result");
        let payload = field(result, "structuredContent");
        if (field(payload, workiqResults) === undefined) {
            try {
                payload = JSON.parse(text(field(result, "content"), 16777216));
            }
            catch {
                throw new MiqError("CAPTURE_UNAVAILABLE");
            }
        }
        const hits = field(field(payload, workiqResults), "results");
        requireThat(Array.isArray(hits), "CAPTURE_UNAVAILABLE");
        for (const index of indices) {
            requireThat(index < hits.length);
            const hit = hits[index];
            const markdown = field(hit, "markdown");
            const parts = typeof markdown === "string" ? markdown.split(snippetMarker) : [];
            requireThat(parts.length === 2 && parts[1].trim().length > 0, "SNIPPET_UNAVAILABLE");
            const sourceId = text(field(hit, "resourceId") ?? field(hit, "id"), 4096);
            const sourceUrl = text(field(hit, "webUrl"), 4096);
            requireThat(!ids.has(sourceId) && !urls.has(sourceUrl), "DUPLICATE_SOURCE");
            ids.add(sourceId);
            urls.add(sourceUrl);
            const labelName = field(field(hit, "sensitivityLabel"), "displayName");
            sources.push({
                sourceId, sourceUrl, sourceKind: "sharepoint", evidenceKind: "document-excerpt", coverage: "partial-body",
                retrievedThisSession: true, body: parts[1], versionId: null, locator: null,
                restrictions: { access: field(hit, "contentProtection") === "allowed" ? "allowed" : "unknown",
                    usage: "unknown", sensitivityLabel: typeof labelName === "string" ? labelName : null },
                provenance: { tool: "workiq-retrieve", observedAt, currentResponse: true, locationUrl: scope }
            });
        }
        gaps.push(`Excerpts are results ${indices.join(",")} of workiq-retrieve call ${callId}, selected by the caller; ` +
            "the selection is not an independent review.");
    }
    return { handoff: { schemaVersion: 1, adapterId: "workiq", outcome: "ok", scope: { kind: "container", url: scope }, sources },
        gaps };
}
// Evaluation E1/E5: admit line ranges of any connector's inline result straight from the host's
// own events.jsonl, so the model never copies a body. Source URL, tool and time come from the
// record; a call without exactly one https URL argument (a search) is not a body source.
const savedPointer = /^Output too large to read at once/;
function inlineResult(source, nowMs, callId) {
    requireThat(/^[A-Za-z0-9_-]{1,128}$/.test(callId));
    const { start, complete } = completedCall(hostEvents(source), callId);
    const tool = text(field(start.data, "toolName"), 256);
    const urls = [];
    JSON.stringify(field(start.data, "arguments") ?? null, (_key, value) => {
        if (typeof value === "string" && /^[a-z][a-z0-9+.-]*:\/\//i.test(value))
            urls.push(value);
        return value;
    });
    const url = field(field(start.data, "arguments"), "url");
    requireThat(urls.length === 1 && typeof url === "string" && url === urls[0] && /^https:\/\//i.test(url), "SOURCE_UNIDENTIFIED");
    const content = field(field(complete.data, "result"), "content");
    requireThat(typeof content === "string" && content.trim().length > 0, "CAPTURE_UNAVAILABLE");
    requireThat(!savedPointer.test(content), "RESULT_SAVED_TO_FILE");
    const observedAt = text(complete.timestamp, 64);
    instant(observedAt);
    const observedMs = Date.parse(observedAt);
    requireThat(Number.isFinite(observedMs), "CAPTURE_UNAVAILABLE");
    return { tool, sourceUrl: url, observedAt, observedMs, content: text(content, 2097152) };
}
export function eventsCaptureHandoff(source, nowMs, callId, options) {
    requireThat(!["workiq", "local-file"].includes(label(options.adapter)));
    const call = inlineResult(source, nowMs, callId);
    const handoff = captureHandoff(call.content, call.observedMs, nowMs, { ...options, sourceUrl: call.sourceUrl, tool: call.tool });
    const gap = `${call.sourceUrl}: body is lines ${options.lines} of ${call.tool} call ${callId}, selected by the caller; ` +
        "the selection is not an independent review.";
    return { handoff, gap };
}
// Inline results carry no line numbers; the index lets the caller choose ranges without a second copy.
export function eventsCaptureIndex(source, nowMs, callId) {
    const call = inlineResult(source, nowMs, callId);
    const lines = call.content.split(/\r?\n/).flatMap((line, index) => line.trim() ?
        [{ n: index + 1, start: line.length > 80 ? `${line.slice(0, 80)}…` : line }] : []);
    return { status: "ok", tool: call.tool, sourceUrl: call.sourceUrl, observedAt: call.observedAt, lines };
}
