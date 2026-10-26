import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runtimeAssets } from "../../tools/MarketingIQ.Portable/assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const plugin = join(root, "plugins", "marketing-iq");

test("native plugin ships only runtime assets and installation-relative instructions", async () => {
    const manifest = JSON.parse(await fs.readFile(join(plugin, "plugin.json"), "utf8"));
    assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    assert.equal(manifest.name, "marketing-iq");
    assert.equal(manifest.version, JSON.parse(await fs.readFile(join(root, "package.json"))).version);
    assert.deepEqual(Object.keys(manifest).sort(), ["$schema", "name", "version", "description", "repository", "keywords"].sort());
    const readme = await fs.readFile(join(plugin, "README.md"), "utf8");
    assert.match(readme, /--agent marketing-iq:marketing-iq/);
    assert.doesNotMatch(readme, /--agent marketing-iq(?:\s|$)/);
    const files = await fs.readdir(plugin, { recursive: true, withFileTypes: true });
    assert.equal(files.filter(file => file.isFile()).length, runtimeAssets.length + 3);
    for (const file of files) {
        assert.equal(file.isSymbolicLink(), false);
        if (!file.isFile()) continue;
        const path = join(file.parentPath, file.name);
        assert.doesNotMatch(path.slice(plugin.length), /node_modules|local-data|\.cs$|\.ts$|\.dll$|\.ps1$|copilot-instructions|use-cases\.json/i);
        if (file.name.endsWith(".md") && file.name !== "README.md") {
            const text = await fs.readFile(path, "utf8");
            assert.doesNotMatch(text, /\.github\\skills\\/);
            if (file.name === "SKILL.md" || file.name.endsWith(".agent.md")) {
                assert.match(text, /<MIQ_SHARED>/);
                assert.match(text, /# Output-format hard gate[\s\S]*# Role[\s\S]*# Final check/);
                assert.match(text, /Installed assets are read-only/);
            }
        }
    }
    const agent = await fs.readFile(join(plugin, "com.github.copilot", "agents", "marketing-iq.agent.md"), "utf8");
    const canonical = await fs.readFile(join(root, ".github", "agents", "marketing-iq.agent.md"), "utf8");
    assert.equal(agent.split("\n")[3].trimEnd(), canonical.split("\n")[3].trimEnd());
    const registry = JSON.parse(await fs.readFile(join(plugin, "skills", "marketing-iq", "references", "sharepoint-source-routes.json")));
    assert.deepEqual(registry.routes, []);
});

test("helpers run after relocation while consumer data stays outside plugin assets", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-native-plugin-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const installed = join(temporary, "installed plugin");
    const workspace = join(temporary, "consumer");
    await fs.cp(plugin, installed, { recursive: true });
    await fs.mkdir(workspace);
    const shared = join(installed, "skills", "marketing-iq");
    const cli = join(shared, "scripts", "portable", "cli.js");
    const run = (args, input) => {
        const result = spawnSync(process.execPath, [cli, ...args], {
            cwd: workspace, input: input === undefined ? undefined : JSON.stringify(input),
            encoding: "utf8", timeout: 20000
        });
        if (result.error) throw result.error;
        assert.equal(result.status, 0, result.stdout + result.stderr);
        return JSON.parse(result.stdout);
    };
    assert.equal(run(["check"]).dotnetRequired, false);
    assert.equal(run(["context", "--use-case", "launch-decision"]).useCase, "launch-decision");
    assert.equal(run(["routes", "--use-case", "launch-decision", "--product-key", "harbor",
        "--topic-key", "readiness", "--evidence-need", "product-truth"]).routeState, "empty-registry");
    assert.equal(run(["local-file", "--file", join(shared, "examples", "synthetic-evidence.json")]).status, "ready");
    const response = run(["decisions", "--store-root", join(workspace, "local-data", "launch-decisions"), "--read-only"], {
        schemaVersion: 1, operation: "discover",
        scope: { productKey: "harbor", topicKey: "readiness", audienceKey: "service-owners", geographyKey: "europe" },
        asOf: "2026-10-19T12:00:00Z"
    });
    assert.equal(response.status, "not-found");
    assert.equal(await fs.stat(join(installed, "local-data")).then(() => true, () => false), false);
});
