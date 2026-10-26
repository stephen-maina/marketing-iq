import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeAssets } from "./assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = join(root, "plugins", "marketing-iq");
const { version } = JSON.parse(await fs.readFile(join(root, "package.json"), "utf8"));
const installedPaths = `
## Installed component paths

This is a generated native-plugin component, not a consumer-workspace file.
Use the host's discovered skill location (or load the plugin's marketing-iq
skill to obtain its reported base directory). Do not search credentials/config
or assume that the consumer has a .github folder.
\`<MIQ_SHARED>\` means the absolute base directory of this plugin's marketing-iq
skill. When a workflow skill is loaded first, its sibling marketing-iq directory
is that base. \`<MIQ_LAUNCH>\` and \`<MIQ_FIELD>\` mean its sibling
marketing-iq-launch-decision and marketing-iq-field-activation directories.
Resolve these notation placeholders before reading files or executing commands;
they are not environment variables or literal shell arguments. Quote absolute
paths and use the current OS path separator. Bare references, scripts and
examples paths are relative to \`<MIQ_SHARED>\`.
Installed assets are read-only. Keep the working directory at the consumer's
workspace: local-data/launch-decisions belongs there, never in the plugin cache.
If the installed location cannot be established, report that setup gap rather
than guessing a cache path. All other evidence, review and permission rules apply.
`;

const files = new Map();
for (const source of runtimeAssets) {
    const sourcePath = join(root, ...source.split("/"));
    const info = await fs.lstat(sourcePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Not a regular plugin input: ${source}`);
    const target = source.startsWith(".github/agents/")
        ? source.replace(".github/agents/", "com.github.copilot/agents/")
        : source.replace(".github/skills/", "skills/");
    let bytes = await fs.readFile(sourcePath);
    if (source.endsWith(".md")) {
        let text = bytes.toString("utf8").replaceAll("\r\n", "\n");
        for (const [name, notation] of [
            ["marketing-iq-launch-decision", "<MIQ_LAUNCH>"],
            ["marketing-iq-field-activation", "<MIQ_FIELD>"],
            ["marketing-iq", "<MIQ_SHARED>"]
        ]) text = text.replaceAll(`.github\\skills\\${name}\\`, `${notation}\\`);
        text = text.replace("workspace-local entrypoint", "plugin entrypoint")
            .replace("Read the files above relative to this workspace, once each.",
                "Read the files above from their installed component locations, once each.")
            .replace("and the helper's metadata. Select workspace", "and the helper's metadata. Select installed")
            .replace("from the workspace.", "from the installed skill directory.");
        if (source.endsWith("SKILL.md") || source.startsWith(".github/agents/")) {
            if (!text.includes("\n# Role\n")) throw new Error(`Missing role insertion point: ${source}`);
            text = text.replace("\n# Role\n", `\n# Role\n${installedPaths}\n`);
        }
        bytes = Buffer.from(text);
    }
    files.set(target, bytes);
}
files.set("skills/marketing-iq/references/sharepoint-source-routes.json",
    Buffer.from(JSON.stringify({ schemaVersion: 1, revision: "portable-v1", routes: [] }, null, 2) + "\n"));
files.set("README.md", await fs.readFile(join(root, "docs", "integration", "MarketingIQ_Plugin.md")));
files.set("plugin.json", Buffer.from(JSON.stringify({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "marketing-iq", version,
    description: "Evidence-led Launch decisions and Field activation using your existing host connector.",
    repository: "https://github.com/stephen-maina/marketing-iq",
    keywords: ["marketing", "launch-decision", "field-activation", "evidence"]
}, null, 2) + "\n"));

// Update only known generated files; never remove or traverse user-added content.
for (const directory of [join(root, "plugins"), output]) {
    await fs.mkdir(directory, { recursive: true });
    if (!(await fs.lstat(directory)).isDirectory()) throw new Error(`Not a regular directory: ${directory}`);
}
for (const entry of await fs.readdir(output, { recursive: true, withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in plugin output: ${path}`);
    if (entry.isFile()) {
        const relative = path.slice(output.length + 1).replaceAll("\\", "/");
        if (!files.has(relative)) throw new Error(`Unrecognized plugin output; preserve and inspect: ${relative}`);
    } else if (!entry.isDirectory()) throw new Error(`Not a regular plugin output: ${path}`);
}
for (const [name, bytes] of files) {
    const target = join(output, ...name.split("/"));
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
}
console.log(JSON.stringify({ plugin: output, version, files: [...files.keys()] }));
