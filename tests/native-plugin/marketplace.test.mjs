import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("marketplace resolves its advertised plugin within this repository", async () => {
    const catalog = JSON.parse(await fs.readFile(resolve(root, ".github", "plugin", "marketplace.json"), "utf8"));
    assert.equal(catalog.name, "marketing-iq-plugins");
    assert.equal(catalog.plugins.length, 1);
    for (const entry of catalog.plugins) {
        assert.equal(typeof entry.source, "string");
        assert.equal(isAbsolute(entry.source), false);
        const target = resolve(root, entry.source);
        const path = relative(root, target);
        assert.ok(path && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
        const manifest = JSON.parse(await fs.readFile(resolve(target, "plugin.json"), "utf8"));
        assert.equal(entry.name, manifest.name);
        assert.equal(entry.description, manifest.description);
        assert.ok((await fs.stat(resolve(target, "skills", "marketing-iq", "SKILL.md"))).isFile());
        assert.ok((await fs.stat(resolve(target, "agents", "marketing-iq.agent.md"))).isFile());
        // agency resolves plugin:agent only under agents/; Copilot reads it there too (probe 2026-11-20).
        // One location only, so no host lists the agent twice.
        assert.equal(await fs.stat(resolve(target, "com.github.copilot")).then(() => true, () => false), false);
    }
});

// Claude Code reads manifests only under .claude-plugin/ (`claude plugin validate`, CLI 2.1.126,
// 2026-11-20: "No manifest found … Expected .claude-plugin/plugin.json"). Copilot keeps the root files.
test("Claude Code finds a marketplace and manifest that agree with the Copilot ones", async () => {
    const read = async (...parts) => JSON.parse(await fs.readFile(resolve(root, ...parts), "utf8"));
    const github = await read(".github", "plugin", "marketplace.json");
    const claude = await read(".claude-plugin", "marketplace.json");
    assert.deepEqual(claude, github, "one catalog, published at both hosts' locations");
    for (const entry of claude.plugins) {
        const target = resolve(root, entry.source);
        const copilot = await read(target, "plugin.json");
        const manifest = await read(target, ".claude-plugin", "plugin.json");
        assert.equal(manifest.$schema, undefined);
        for (const key of ["name", "version", "description", "repository"]) assert.equal(manifest[key], copilot[key], key);
        assert.deepEqual(manifest.keywords, copilot.keywords);
        assert.equal(manifest.author?.name, claude.owner.name);
    }
});
