#!/usr/bin/env node
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { executeDecision } from "./decisions.js";
import { captureHandoff, normalizeEvidence } from "./evidence.js";
import { context, routes } from "./routes.js";
import { MiqError, ioCode, readBoundedFile, readJsonFile, requireThat, stdin, strictJson, utf8 } from "./json.js";

const command = process.argv[2];
try {
    const metadata = strictJson(await fs.readFile(new URL("./package.json", import.meta.url))) as { version?: unknown };
    const version = metadata.version;
    requireThat(typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version));
    const help = `Marketing IQ ${version} (Node >=22.18.0)\n` +
        "context --use-case launch-decision|field-activation\n" +
        "routes --use-case <workflow> --product-key <label> --topic-key <label> --evidence-need <lane>\n" +
        "evidence --adapter <adapter-id> [--input-file <absolute-data.json>] (otherwise JSON on stdin)\n" +
        "capture --adapter <id> --capture-file <absolute-host-capture> --lines <a-b[,c-d]> --source-url <https> " +
        "--scope-url <https> --scope-kind exact|container --tool <name> [--source-kind <kind>]\n" +
        "local-file --file <explicit-synthetic-envelope.json>\n" +
        "decisions --store-root <path> [--read-only] [--input-file <absolute-data.json>] (otherwise JSON on stdin)\n" +
        "check | --version | --help\n";
    const [major, minor, patch] = process.versions.node.split(".").map(Number);
    requireThat(major! > 22 || major === 22 && (minor! > 18 || minor === 18 && patch! >= 0), "NODE_VERSION_UNSUPPORTED");
    const args = new Map<string, string | boolean>();
    for (let index = 3; index < process.argv.length; index++) {
        const name = process.argv[index]!;
        requireThat(name.startsWith("--") && !args.has(name));
        if (name === "--read-only") args.set(name, true);
        else {
            const value = process.argv[++index];
            requireThat(value && !value.startsWith("--")); args.set(name, value);
        }
    }
    const options = (required: string[], optional: string[] = []) => {
        requireThat(required.every(name => typeof args.get(name) === "string") &&
            [...args.keys()].every(name => [...required, ...optional].includes(name)));
    };
    const arg = (name: string) => { const value = args.get(name); requireThat(typeof value === "string"); return value; };
    let result: unknown;
    switch (command) {
        case "--help": options([]); process.stdout.write(help); break;
        case "--version": options([]); console.log(version); break;
        case "check":
            options([]);
            result = { status: "ok", version, node: process.versions.node, dotnetRequired: false,
                typescriptRequired: false, authentication: "not-verified", hostDiscovery: "not-verified" }; break;
        case "context": options(["--use-case"]); result = context(arg("--use-case")); break;
        case "routes": {
            options(["--use-case", "--product-key", "--topic-key", "--evidence-need"]);
            const path = fileURLToPath(new URL("../../references/sharepoint-source-routes.json", import.meta.url));
            const file = await fs.open(path, "r");
            let bytes: Buffer;
            try { requireThat((await file.stat()).size <= 131072); bytes = await file.readFile(); }
            finally { await file.close(); }
            result = routes(strictJson(bytes), arg("--use-case"), arg("--product-key"), arg("--topic-key"), arg("--evidence-need")); break;
        }
        case "evidence":
            options(["--adapter"], ["--input-file"]);
            result = normalizeEvidence(args.has("--input-file") ? await readJsonFile(arg("--input-file")) :
                strictJson(await stdin(262144), 262144), arg("--adapter")); break;
        case "capture": {
            options(["--adapter", "--capture-file", "--lines", "--source-url", "--scope-url", "--scope-kind", "--tool"],
                ["--source-kind"]);
            const capture = await readBoundedFile(arg("--capture-file"), 2097152);
            const admitted = normalizeEvidence(captureHandoff(utf8(capture.bytes), capture.modifiedMs, Date.now(), {
                adapter: arg("--adapter"), lines: arg("--lines"), sourceUrl: arg("--source-url"),
                scopeUrl: arg("--scope-url"), scopeKind: arg("--scope-kind"), tool: arg("--tool"),
                // WorkIQ admits only sharepoint/email/meeting bodies; an https capture is a SharePoint
                // document unless the caller names email or meeting explicitly.
                sourceKind: args.has("--source-kind") ? arg("--source-kind") :
                    arg("--adapter") === "workiq" ? "sharepoint" : "document"
            }), arg("--adapter"));
            admitted.proofGaps.push(`${arg("--source-url")}: body is line ranges ${arg("--lines")} of a host-captured ` +
                "tool result selected by the caller; the selection is not an independent review.");
            result = admitted; break;
        }
        case "local-file": {
            options(["--file"]);
            const file = await fs.open(arg("--file"), "r");
            let bytes: Buffer;
            try { requireThat((await file.stat()).size <= 262144); bytes = await file.readFile(); }
            finally { await file.close(); }
            result = normalizeEvidence(strictJson(bytes, 262144), "local-file"); break;
        }
        case "decisions":
            options(["--store-root"], ["--read-only", "--input-file"]);
            result = await executeDecision(args.has("--input-file") ? await readJsonFile(arg("--input-file"), 131072) :
                strictJson(await stdin()), arg("--store-root"), args.has("--read-only"));
            if (["invalid", "approval-required"].includes((result as { status: string }).status)) process.exitCode = 1;
            break;
        default: throw new MiqError("INVALID_REQUEST");
    }
    if (result !== undefined) console.log(JSON.stringify(result));
} catch (error) {
    const code = error instanceof MiqError ? error.code : ioCode(error) ? "IO_ERROR" : "INTERNAL_ERROR";
    if (command === "decisions") console.log(JSON.stringify({
        schemaVersion: 1, status: "invalid", decisions: [], missingFields: [], diagnostics: [code]
    }));
    else console.error(JSON.stringify({ status: "invalid", diagnostics: [code] }));
    process.exitCode = 1;
}
