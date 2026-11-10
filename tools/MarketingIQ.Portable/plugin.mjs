import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeAssets } from "./assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const check = process.argv[2] === "--check";
if (process.argv.length !== (check ? 3 : 2)) throw new Error("Expected no arguments or --check.");
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
\`<MIQ_PLANNING>\` means sibling marketing-iq-campaign-planning.
Resolve these notation placeholders before reading files or executing commands;
they are not environment variables or literal shell arguments. Quote absolute
paths and use the current OS path separator. Bare references, scripts and
examples paths are relative to \`<MIQ_SHARED>\`.
Installed assets are read-only. Keep the working directory at the consumer's
workspace: local-data/launch-decisions belongs there, never in the plugin cache.
If the installed location cannot be established, report that setup gap rather
than guessing a cache path. All other evidence, review and permission rules apply.
`;

// Exact workspace-to-installed wording rewrites, scoped per file. Each target must occur
// exactly once: a missing or repeated target fails before any output is written, instead
// of silently shipping workspace wording or rewriting an unrelated sentence.
const installedRewrites = new Map([
    [".github/agents/marketing-iq.agent.md", [
        ["workspace-local entrypoint", "plugin entrypoint"],
        ["Read the files above relative to this workspace, once each.",
            "Load the selected workflow skill with the skill tool, once; it carries these files inline."],
        ["Compose by reading, not recursively invoking agents/skills.",
            "Compose by loading that one workflow skill, not by reading plugin files or invoking other agents."]]],
    [".github/skills/marketing-iq/SKILL.md", [
        ["and the helper's metadata. Select workspace", "and the helper's metadata. Select installed"]]],
    [".github/skills/marketing-iq-launch-decision/SKILL.md", [
        ["from the workspace.", "from the installed skill directory."]]],
    [".github/skills/marketing-iq-field-activation/SKILL.md", [
        ["from the workspace.", "from the installed skill directory."]]]
]);
for (const source of installedRewrites.keys())
    if (!runtimeAssets.includes(source)) throw new Error(`Installed-path rewrite names a non-runtime file: ${source}`);

// The agent body cannot inline the 190 KB contracts (30,000-character agent limit), and plugin
// files may be unreadable (spec §11), so the installed agent loads the self-contained skills.
const agentLoading = `
## Installed plugin loading

Plugin files may be unreadable in this host, so do not read them. Load
instructions with the skill tool instead, once per evaluation:
\`marketing-iq-launch-decision\` for Launch, \`marketing-iq-field-activation\`
for Field, \`marketing-iq-campaign-planning\` for planning-only work, and
\`marketing-iq\` for setup, intake or extension questions. Each skill carries the
shared policy and every reference inline. Wherever this profile says to read
the shared skill, a reference or a workflow SKILL.md, load the matching skill
instead. Scripts remain files run through execute.
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
            ["marketing-iq-campaign-planning", "<MIQ_PLANNING>"],
            ["marketing-iq", "<MIQ_SHARED>"]
        ]) text = text.replaceAll(`.github\\skills\\${name}\\`, `${notation}\\`);
        for (const [from, to] of installedRewrites.get(source) ?? []) {
            const count = text.split(from).length - 1;
            if (count !== 1) throw new Error(`Installed-path rewrite expected once, found ${count}: ${source}: ${from}`);
            text = text.replace(from, () => to);
        }
        if (source.endsWith("SKILL.md") || source.startsWith(".github/agents/")) {
            if (!text.includes("\n# Role\n")) throw new Error(`Missing role insertion point: ${source}`);
            const loading = source === ".github/agents/marketing-iq.agent.md" ? agentLoading : "";
            text = text.replace("\n# Role\n", () => `\n# Role\n${installedPaths}${loading}\n`);
        }
        bytes = Buffer.from(text);
    }
    files.set(target, bytes);
}
// R1-a (docs/integration/MarketingIQ_Source_Resolution_Spec.md §11): Copilot CLI 1.0.107 denied
// file reads under the plugin cache while its skill tool delivered SKILL.md. Each installed skill
// therefore carries every reference it can reach. Canonical sources stay split for workspace use.
const sharedSkill = "skills/marketing-iq/SKILL.md";
const mentionedReferences = text => [...text.matchAll(/references\\([a-z][a-z-]+\.md)/g)]
    .map(match => `skills/marketing-iq/references/${match[1]}`);
const inlineNotice = `
## Inlined references (installed plugin)

The host may deny file reads inside the plugin directory. Every \`references\\*.md\`
file reachable from this skill, and the shared \`<MIQ_SHARED>\\SKILL.md\` policy, is
included below under "# Inlined reference:" headings. When an instruction says to
read one of them, use its inlined section; do not use file tools for it. Load a
different workflow with the skill tool by name (marketing-iq-launch-decision,
marketing-iq-field-activation or marketing-iq-campaign-planning) instead of
reading its SKILL.md. Scripts and examples remain files run through execute.
`;
const inlinedSkills = new Map();
for (const skill of [...files.keys()].filter(name => name.endsWith("/SKILL.md"))) {
    const own = files.get(skill).toString("utf8");
    const queue = [...(skill !== sharedSkill && own.includes("<MIQ_SHARED>\\SKILL.md") ? [sharedSkill] : []),
        ...mentionedReferences(own)];
    const included = [];
    while (queue.length) {
        const name = queue.shift();
        if (name === skill || included.includes(name)) continue;
        if (!files.has(name)) throw new Error(`Inlined reference is not a runtime file: ${name}`);
        included.push(name);
        queue.push(...mentionedReferences(files.get(name).toString("utf8")));
    }
    if (own.split("\n# Role\n").length !== 2) throw new Error(`Inline notice needs one role heading: ${skill}`);
    let text = own.replace("\n# Role\n", () => `\n# Role\n${inlineNotice}`);
    for (const name of included) {
        const label = name === sharedSkill ? "<MIQ_SHARED>\\SKILL.md" : `references\\${name.split("/").pop()}`;
        const content = files.get(name).toString("utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
        text += `\n\n---\n\n# Inlined reference: ${label}\n\n${content}\n`;
    }
    inlinedSkills.set(skill, Buffer.from(text));
}
for (const [skill, bytes] of inlinedSkills) files.set(skill, bytes);
files.set("skills/marketing-iq/references/sharepoint-source-routes.json",
    Buffer.from(JSON.stringify({ schemaVersion: 1, revision: "portable-v1", routes: [] }, null, 2) + "\n"));
files.set("README.md", Buffer.from((await fs.readFile(
    join(root, "docs", "integration", "MarketingIQ_Plugin.md"), "utf8")).replaceAll("\r\n", "\n")));
files.set("plugin.json", Buffer.from(JSON.stringify({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "marketing-iq", version,
    description: "Evidence-led Launch decisions and Field activation using your existing host connector.",
    repository: "https://github.com/stephen-maina/marketing-iq",
    keywords: ["marketing", "launch-decision", "field-activation", "evidence"]
}, null, 2) + "\n"));
files.set("installation.json", Buffer.from(JSON.stringify({
    schemaVersion: 1, version,
    entrypoints: [...files].filter(([name]) => name.endsWith("/SKILL.md") ||
        name === "com.github.copilot/agents/marketing-iq.agent.md")
        .map(([path, bytes]) => ({ path, sha256: createHash("sha256").update(bytes).digest("hex") }))
}, null, 2) + "\n"));

// Update only known generated files; never remove or traverse user-added content.
for (const directory of [join(root, "plugins"), output]) {
    if (!check) await fs.mkdir(directory, { recursive: true });
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
    if (check) {
        if (!(await fs.readFile(target)).equals(bytes)) throw new Error(`Generated plugin drift: ${name}`);
    } else {
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.writeFile(target, bytes);
    }
}
console.log(JSON.stringify({ plugin: output, version, mode: check ? "check" : "build", files: [...files.keys()] }));
