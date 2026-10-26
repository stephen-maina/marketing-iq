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
        assert.ok((await fs.stat(resolve(target, "com.github.copilot", "agents", "marketing-iq.agent.md"))).isFile());
    }
});
