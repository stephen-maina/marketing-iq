import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strictJson } from "./portable/json.js";

const required = [
    "skills/marketing-iq/SKILL.md",
    "skills/marketing-iq-launch-decision/SKILL.md",
    "skills/marketing-iq-field-activation/SKILL.md",
    "com.github.copilot/agents/marketing-iq.agent.md"
];
const allowed = new Set([...required, "skills/marketing-iq-campaign-planning/SKILL.md"]);
let currentPath;
let diagnostic = "MIQ_INSTALLATION_INVALID";
try {
    if (process.argv.length !== 2) throw new Error();
    const pluginRoot = await fs.realpath(resolve(dirname(fileURLToPath(import.meta.url)), "../../.."));
    const read = async name => {
        currentPath = name;
        diagnostic = "MIQ_INSTRUCTION_UNAVAILABLE";
        let path = pluginRoot;
        for (const part of name.split("/")) {
            path = join(path, part);
            if ((await fs.lstat(path)).isSymbolicLink()) throw new Error();
        }
        const file = await fs.open(path, "r");
        try {
            const stat = await file.stat();
            if (!stat.isFile() || stat.size > 262144) throw new Error();
            const bytes = await file.readFile();
            if (bytes.length > 262144) throw new Error();
            return bytes;
        } finally {
            await file.close();
        }
    };
    const readMetadata = async name => {
        const bytes = await read(name);
        diagnostic = "MIQ_INSTALLATION_INVALID";
        return strictJson(bytes, 262144);
    };
    const manifest = await readMetadata("plugin.json");
    const identity = await readMetadata("installation.json");
    diagnostic = "MIQ_INSTALLATION_INVALID";
    currentPath = undefined;
    if (manifest.name !== "marketing-iq" || typeof manifest.version !== "string" ||
        identity.schemaVersion !== 1 || identity.version !== manifest.version ||
        !Array.isArray(identity.entrypoints) ||
        identity.entrypoints.length < required.length || identity.entrypoints.length > allowed.size) throw new Error();
    const names = identity.entrypoints.map(entry => entry?.path);
    if (new Set(names).size !== names.length || required.some(name => !names.includes(name)) ||
        identity.entrypoints.some(entry => !allowed.has(entry.path) ||
            typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256))) throw new Error();
    const entrypoints = [];
    for (const entry of identity.entrypoints) {
        const sha256 = createHash("sha256").update(await read(entry.path)).digest("hex");
        diagnostic = "MIQ_INSTALLATION_MISMATCH";
        if (sha256 !== entry.sha256) throw new Error();
        entrypoints.push({ path: entry.path, sha256 });
    }
    console.log(JSON.stringify({
        status: "verified", pluginRoot, version: manifest.version, entrypoints,
        scope: "installed-entrypoint-bytes-only",
        hostDiscovery: "not-verified", toolExposure: "not-verified",
        authentication: "not-verified", completeResultAccess: "not-verified",
        publisherAuthenticity: "not-verified"
    }));
} catch {
    console.log(JSON.stringify({ status: "blocked", diagnostic,
        ...(currentPath ? { path: currentPath } : {}) }));
    process.exitCode = 1;
}
