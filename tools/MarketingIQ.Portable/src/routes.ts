import { keys, label, positiveInt, requireThat, text } from "./json.js";

const workflows = ["launch-decision", "field-activation"];
const lanes = ["product-truth", "planning", "market-evidence", "event-history"];
const labels = (value: unknown, allowed?: string[]): string[] => {
    requireThat(Array.isArray(value) && value.length > 0 && value.length <= 8);
    const result = value.map(label);
    requireThat(new Set(result).size === result.length && (!allowed || result.every(item => allowed.includes(item))));
    return result;
};

export function context(useCase: string) {
    requireThat(workflows.includes(useCase));
    return { schemaVersion: 3, useCase, roleReference: `references/${useCase}.md`,
        directionStatus: "not-supplied", downloadAuthorized: false, retrievalTool: "workiq-retrieve",
        defaultAdapter: "workiq", contentHandling: "session-only", retrievalRequests: [],
        retrievalChannels: [
            { sourceKind: "sharepoint", capabilities: [{ name: "OneDriveAndSharePoint" }], strategy: "grounding" },
            { sourceKind: "email", capabilities: [{ name: "Email" }], strategy: "grounding" },
            { sourceKind: "meeting", capabilities: [{ name: "Meetings" }], strategy: "grounding" }
        ],
        limits: { maxSources: 3, maxCharactersPerSource: 20000, maxTotalCharacters: 60000, maxCalls: 6, maxCallsPerChannel: 2 }
    };
}

export function routes(input: unknown, useCase: string, productKey: string, topicKey: string, evidenceNeed: string) {
    requireThat(workflows.includes(useCase) && lanes.includes(evidenceNeed));
    label(productKey); label(topicKey);
    const registry = keys(input, ["schemaVersion", "revision", "routes"]);
    requireThat(registry.schemaVersion === 1 && Array.isArray(registry.routes) && registry.routes.length <= 100);
    label(registry.revision);
    const ids = new Set<string>();
    const validated = registry.routes.map(value => {
        const raw = keys(value, ["id", "locationKind", "siteUrl", "workflows", "productKeys", "topicKeys",
            "evidenceNeeds", "priority", "ordinal", "provenance", "review"],
            ["folderUrl"]);
        const id = label(raw.id);
        requireThat(!ids.has(id)); ids.add(id);
        requireThat(raw.locationKind === "site" || raw.locationKind === "folder");
        const siteUrl = text(raw.siteUrl, 2048);
        requireThat(/^https:\/\/(?:[a-z0-9-]+\.sharepoint\.com\/(?:sites|teams)|[a-z0-9-]+-my\.sharepoint\.com\/personal)\/[A-Za-z0-9_-]+$/.test(siteUrl));
        let folderUrl: string | undefined;
        if (raw.locationKind === "folder") {
            folderUrl = text(raw.folderUrl, 2048);
            requireThat(folderUrl.startsWith(siteUrl + "/") && !/[\s?#\\]/.test(folderUrl));
            for (const segment of folderUrl.slice(siteUrl.length + 1).split("/")) {
                let decoded: string;
                try { decoded = decodeURIComponent(segment); } catch { requireThat(false); }
                requireThat(decoded!.trim() && ![".", ".."].includes(decoded!) && !/[%/\\?#\x00-\x1f\x7f]/.test(decoded!));
            }
        } else requireThat(!Object.hasOwn(raw, "folderUrl"));
        const provenance = keys(raw.provenance, ["kind", "reference"]);
        requireThat(typeof provenance.kind === "string" && ["owner-known-task", "maintainer-fixture"].includes(provenance.kind)); label(provenance.reference);
        const review = keys(raw.review, ["lastReviewedDate", "status"]), date = text(review.lastReviewedDate, 10);
        requireThat(/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "0001-01-01" && Number.isFinite(Date.parse(date)) &&
            new Date(date).toISOString().slice(0, 10) === date &&
            typeof review.status === "string" && ["active", "provisional", "needs-review", "retired"].includes(review.status));
        const priority = positiveInt(raw.priority), ordinal = positiveInt(raw.ordinal);
        requireThat(priority <= 1000 && ordinal <= 1000);
        return { id, locationKind: raw.locationKind, siteUrl, ...(folderUrl ? { folderUrl } : {}),
            workflows: labels(raw.workflows, workflows), productKeys: labels(raw.productKeys), topicKeys: labels(raw.topicKeys),
            evidenceNeeds: labels(raw.evidenceNeeds, lanes), priority, ordinal, provenance, review,
            currentCoverage: "not-retrieved", directionStatus: "not-supplied", downloadAuthorized: false, authorityStatus: "not-authority" };
    });
    const matches = validated.filter(route => route.workflows.includes(useCase) && route.productKeys.includes(productKey) &&
        route.topicKeys.includes(topicKey) && route.evidenceNeeds.includes(evidenceNeed));
    const eligible = matches.filter(route => route.review.status === "active" || route.review.status === "provisional")
        .sort((a, b) => a.priority - b.priority || a.ordinal - b.ordinal || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const routeState = eligible.length ? "eligible" : !validated.length ? "empty-registry" :
        matches.some(route => route.review.status === "needs-review") ? "needs-review-only" :
        matches.some(route => route.review.status === "retired") ? "retired-only" : "no-match";
    return { schemaVersion: 1, registryRevision: registry.revision, status: eligible.length ? "candidate-routes" : "no-route",
        routeState, useCase, productKey, topicKey, evidenceNeed, rankingBasis: "maintained-priority-ordinal-stable-id",
        totalMatches: eligible.length, omittedCount: Math.max(0, eligible.length - 3), candidates: eligible.slice(0, 3),
        limits: { maxCandidates: 3, maxSourceAdmissions: 3, maxCallsPerChannel: 2, cumulative: true } };
}
