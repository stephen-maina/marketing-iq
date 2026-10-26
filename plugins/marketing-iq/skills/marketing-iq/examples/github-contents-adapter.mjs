// Pure normalization example: no retrieval, credentials, connector install or tool registration.
import { pathToFileURL } from "node:url";
import { normalizeEvidence } from "../scripts/portable/evidence.js";
import { instant } from "../scripts/portable/instant.js";
import { keys, object, requireThat, stdin, strictJson, text } from "../scripts/portable/json.js";

export const adapterId = "github-contents";

export function githubContentsHandoff(value) {
    const input = keys(value, ["scope", "observation", "response"]);
    const scope = keys(input.scope, ["kind", "url"]);
    requireThat(scope.kind === "exact");
    const observation = keys(input.observation, ["tool", "observedAt", "currentResponse", "outcome"]);
    text(observation.tool, 256);
    instant(observation.observedAt);
    requireThat(typeof observation.currentResponse === "boolean" &&
        ["ok", "denied", "unavailable", "unsupported"].includes(observation.outcome));
    const handoff = { schemaVersion: 1, adapterId, outcome: observation.outcome, scope, sources: [] };
    if (observation.outcome !== "ok") {
        requireThat(input.response === null);
    } else {
        requireThat(observation.currentResponse === true);
        const response = object(input.response);
        requireThat(response.type === "file" &&
            !Object.hasOwn(response, "submodule_git_url") && !Object.hasOwn(response, "target"));
        const sourceId = text(response.url, 4096), sourceUrl = text(response.html_url, 4096);
        const path = text(response.path, 4096), versionId = text(response.sha, 64);
        requireThat(/^[a-f0-9]{40}$/.test(versionId));
        // These API fields are native identities, not URLs constructed from the request.
        const api = new URL(sourceId), html = new URL(sourceUrl);
        requireThat(api.origin === "https://api.github.com" && html.origin === "https://github.com" &&
            !api.username && !api.password && !api.hash &&
            [...api.searchParams.keys()].every(key => key === "ref") && api.searchParams.getAll("ref").length <= 1 &&
            !html.username && !html.password && !html.search && !html.hash);
        const apiParts = api.pathname.split("/").map(decodeURIComponent);
        const htmlParts = html.pathname.split("/").map(decodeURIComponent);
        const pathParts = path.split("/");
        requireThat(pathParts.every(part => part && part !== "." && part !== ".." && !/[\\%\x00-\x1f\x7f]/.test(part)) &&
            apiParts[1] === "repos" && apiParts[4] === "contents" &&
            apiParts.slice(5).join("/") === path && htmlParts[3] === "blob" &&
            apiParts[2] === htmlParts[1] && apiParts[3] === htmlParts[2] &&
            htmlParts.length >= 5 + pathParts.length &&
            htmlParts.slice(-pathParts.length).join("/") === path);
        let body = null;
        if (response.encoding === "base64") {
            requireThat(typeof response.content === "string");
            const encoded = response.content.replace(/\n/g, "");
            requireThat(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded));
            const bytes = Buffer.from(encoded, "base64");
            requireThat(bytes.toString("base64") === encoded && bytes.length === response.size);
            body = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
            requireThat(!body.includes("\u0000"));
            if (!body.trim()) body = null;
        } else {
            requireThat(response.encoding === "none" && response.content === "");
            requireThat(Number.isSafeInteger(response.size) && response.size >= 0);
        }
        handoff.sources.push({
            sourceId, sourceUrl, sourceKind: "document",
            evidenceKind: body === null ? "metadata-only" : "document-excerpt",
            coverage: body === null ? "metadata-only" : "partial-body",
            retrievedThisSession: true, body, versionId, locator: path,
            restrictions: { access: "allowed", usage: "unknown", sensitivityLabel: null },
            provenance: {
                tool: observation.tool, observedAt: observation.observedAt,
                currentResponse: observation.currentResponse, locationUrl: null
            }
        });
    }
    // Keep all admission decisions (including out-of-scope and over-limit exclusion) in the existing validator.
    normalizeEvidence(handoff, adapterId);
    return handoff;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const handoff = githubContentsHandoff(strictJson(await stdin(262144), 262144));
        process.stdout.write(JSON.stringify(handoff) + "\n");
    } catch {
        process.stderr.write('{"code":"INVALID_ADAPTER_INPUT"}\n');
        process.exitCode = 1;
    }
}
