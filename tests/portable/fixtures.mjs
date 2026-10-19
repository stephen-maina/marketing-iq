import { spawnSync, spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const cliRelative = join(".github", "skills", "marketing-iq", "scripts", "portable", "cli.js");
export const scope = { productKey: "synthetic-harbor", topicKey: "readiness", audienceKey: "service-owners", geographyKey: "fictional-region" };
export const now = "2026-10-19T12:00:00Z";
export const record = (id = "synthetic-direction", overrides = {}) => ({
    schemaVersion: 1, decisionId: id, version: 1, status: "accepted", scope,
    direction: "SYNTHETIC ONLY: propose a readiness briefing for fictional service owners; clarify prerequisites before choosing a workflow, without launch or publication approval.",
    acceptedAt: "2026-10-19T00:00:00Z", effectiveFrom: "2026-10-19T00:00:00Z",
    effectiveUntil: null, supersedes: [], ...overrides
});
export const publish = value => ({
    schemaVersion: 1, operation: "publish", record: value,
    acceptance: { decisionId: value.decisionId, version: value.version, confirmed: true }
});
export const discover = (overrides = {}) => ({ schemaVersion: 1, operation: "discover", scope, asOf: now, ...overrides });
export const withdraw = value => ({
    schemaVersion: 1, operation: "withdraw", decisionId: value.decisionId, version: value.version,
    acceptance: { decisionId: value.decisionId, version: value.version, confirmed: true }
});
export function run(args, input, cwd = root) {
    const result = spawnSync(process.execPath, [join(cwd, cliRelative), ...args], {
        cwd, input: input === undefined ? undefined : typeof input === "string" || Buffer.isBuffer(input) ? input : JSON.stringify(input),
        encoding: "utf8", timeout: 20000
    });
    if (result.error) throw result.error;
    return { code: result.status, value: JSON.parse(result.stdout || result.stderr) };
}
export function runAsync(args, input) {
    return new Promise((resolveResult, reject) => {
        const child = spawn(process.execPath, [join(root, cliRelative), ...args], { cwd: root });
        let output = "", error = "";
        child.stdout.on("data", bytes => output += bytes);
        child.stderr.on("data", bytes => error += bytes);
        child.on("error", reject);
        child.on("close", code => {
            try { resolveResult({ code, value: JSON.parse(output || error) }); }
            catch (failure) { reject(failure); }
        });
        child.stdin.end(JSON.stringify(input));
    });
}
export function candidate(useCase, admitted, directionStatus = "proposed") {
    const sections = useCase === "launch-decision" ?
        ["product-truth", "planning-fit", "market-evidence", "audience-recommendation", "proposition", "next-evidence"].map(name =>
            ({ name, kind: "assessment", text: "Synthetic proposal only; support sign-off is unknown, not unmet. No launch/publication approval. Prepare an exact record for confirmation before saving.", factIds: ["F1"] })) :
        [
            { name: "direction-basis", kind: "assessment", text: "Synthetic accepted direction proposes a readiness briefing, not a production launch.", factIds: ["F1"] },
            { name: "invitation", kind: "draft-copy", text: "Subject: Fictional Harbor readiness briefing\nFor fictional-region service owners: clarify prerequisites before choosing a workflow. Proposed takeaway: a questions checklist.\nJoin at [date/time] via [registration link]. Internal review draft.", factIds: [] },
            { name: "talk-track", kind: "draft-copy", text: "1. Identify a fictional workflow and its readiness questions.\n2. Discuss the bounded synthetic checklist; support sign-off remains unknown.\n3. Propose a next discovery step using the questions checklist.", factIds: [] },
            { name: "follow-up", kind: "draft-copy", text: "Would a readiness questions checklist help your next fictional Harbor decision? Reply with a non-sensitive question. [sender]", factIds: [] },
            { name: "publication-gaps", kind: "assessment", text: "Fictional fixture only; dates, current product evidence and human publication approval remain unknown.", factIds: [] }
        ];
    return {
        useCase, status: "draft", directionStatus, validationMode: "session-review",
        summary: "Synthetic internal-review fixture, not model-generated or semantically reviewed.",
        sections, facts: [{
            id: "F1", claim: "The synthetic note does not establish support sign-off.",
            sourceId: admitted.sources[0].sourceId, sourceUrl: admitted.sources[0].sourceUrl,
            quote: "Support sign-off is unknown.", versionId: null, locator: null
        }], sources: admitted.sources, proofGaps: admitted.proofGaps,
        rejectedClaims: ["Unknown sign-off is not evidence of approval or failure."],
        executionTrace: `synthetic:true; review:not-run; adapter:${admitted.adapterId}; live-retrieval:not-run`
    };
}
