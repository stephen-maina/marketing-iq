import { instant } from "./instant.js";
import { MiqError, keys, label, requireThat, text } from "./json.js";

const sourceKinds = ["sharepoint", "document", "email", "meeting", "seismic", "local-file"];
const excerptKinds = ["document-excerpt", "message-excerpt", "transcript-excerpt"];
const evidenceKinds = [...excerptKinds, "meeting-summary", "metadata-only", "none"];
const coverages = ["partial-body", "metadata-only", "unavailable", "excluded-over-limit"];
interface Source {
    sourceId: string; sourceUrl: string; sourceKind: string; evidenceKind: string;
    coverage: string; retrievedThisSession: boolean;
}
interface Passage { sourceId: string; sourceUrl: string; body: string }

function https(value: unknown): URL {
    const input = text(value, 4096);
    requireThat(/^https:\/\//i.test(input) && !/[\s\\]/.test(input));
    let url: URL;
    try { url = new URL(input); } catch { throw new MiqError("INVALID_REQUEST"); }
    requireThat(url.protocol === "https:" && !url.username && !url.password && !url.hash);
    const originalPath = input.replace(/^https:\/\/[^/?#]+/i, "").split("?")[0]!;
    for (const part of originalPath.split("/")) {
        let decoded: string;
        try { decoded = decodeURIComponent(part); } catch { throw new MiqError("INVALID_REQUEST"); }
        requireThat(!/[%/\\\x00-\x1f\x7f]/.test(decoded) && decoded !== "." && decoded !== "..");
    }
    return url;
}

function segments(url: URL): string[] {
    return url.pathname.split("/").filter(Boolean).map(part => {
        let decoded: string;
        try { decoded = decodeURIComponent(part); } catch { requireThat(false); }
        requireThat(!/[%/\\\x00-\x1f\x7f]/.test(decoded!) && decoded !== "." && decoded !== "..");
        return decoded!;
    });
}

function contains(boundary: URL, location: URL): boolean {
    const prefix = segments(boundary), path = segments(location);
    return boundary.origin === location.origin && prefix.length <= path.length &&
        prefix.every((part, index) => part === path[index]);
}

export function normalizeEvidence(value: unknown, selectedAdapter: string) {
    const raw = keys(value, ["schemaVersion", "adapterId", "outcome", "scope", "sources"]);
    requireThat(raw.schemaVersion === 1 && label(raw.adapterId) === label(selectedAdapter) &&
        typeof raw.outcome === "string" &&
        ["ok", "denied", "unavailable", "unsupported"].includes(raw.outcome) && Array.isArray(raw.sources));
    const scope = keys(raw.scope, ["kind", "url"]);
    requireThat(scope.kind === "exact" || scope.kind === "container");
    const boundary = https(scope.url); segments(boundary);
    requireThat(scope.kind !== "container" || boundary.search === "");
    requireThat(raw.sources.length <= 100);
    const sources: Source[] = [], evidence: Passage[] = [], proofGaps: string[] = [];
    const provenance: Record<string, unknown>[] = [], seen = new Set<string>(), seenUrls = new Set<string>();
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
        const observed = https(sourceUrl); segments(observed);
        requireThat(!seen.has(sourceId) && !seenUrls.has(sourceUrl)); seen.add(sourceId); seenUrls.add(sourceUrl);
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
        const tool = text(origin.tool, 256); instant(origin.observedAt);
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
        } else requireThat(entry.body === null);
        if (coverage === "metadata-only") requireThat(entry.retrievedThisSession === true && origin.currentResponse === true);
        if (coverage === "unavailable") requireThat(evidenceKind === "none" && entry.retrievedThisSession === false);
        const inScope = scope.kind === "exact" ? sourceUrl === scope.url :
            observed.origin === boundary.origin && contains(boundary, location);
        if (!inScope || restrictions.access !== "allowed" || restrictions.usage === "prohibited") {
            proofGaps.push(`${sourceId}: excluded (${!inScope ? "outside selected scope" :
                restrictions.access !== "allowed" ? "access denied or unverified" : "usage prohibited"}).`);
            continue;
        }
        if (coverage === "partial-body" || coverage === "metadata-only") {
            if (admissions >= 3 || typeof entry.body === "string" &&
                (entry.body.length > 20000 || characters + entry.body.length > 60000)) {
                coverage = "excluded-over-limit";
                proofGaps.push(`${sourceId}: excluded over evidence limits; body was not truncated.`);
            } else {
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
        if (coverage !== "partial-body") proofGaps.push(`${sourceId}: ${coverage}; not factual body support.`);
    }
    if (selectedAdapter === "local-file")
        proofGaps.push("Synthetic local-file sample, explicitly selected; not live enterprise retrieval or approval.");
    if (evidence.length === 0) proofGaps.push("No admissible current body evidence.");
    return { schemaVersion: 1, status: evidence.length ? "ready" : "blocked", adapterId: selectedAdapter,
        sources, evidence, provenance, proofGaps };
}
