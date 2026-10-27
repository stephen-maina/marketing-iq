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

test("maintainer acceptance agents and evaluator oracles stay outside runtime packages", async () => {
    // Packaging/profile checks only; these do not execute an agent.
    for (const [name, tools] of [
        ["marketing-iq-test-coordinator", ["read", "agent"]],
        ["marketing-iq-test-evaluator", ["read"]]
    ]) {
        const path = `.github/agents/${name}.agent.md`;
        const profile = await fs.readFile(join(root, path), "utf8");
        assert.deepEqual(JSON.parse(/^tools:\s*(.+)$/m.exec(profile)[1]), tools);
        assert.equal(runtimeAssets.includes(path), false);
        assert.equal(await fs.stat(join(plugin, "com.github.copilot", "agents", `${name}.agent.md`))
            .then(() => true, () => false), false);
        assert.match(profile, /# Output-format hard gate[\s\S]*# Role[\s\S]*# Final check/);
    }
    for (const path of runtimeAssets) {
        assert.doesNotMatch(path, /test-coordinator|test-evaluator|Behavior_Acceptance|Improvement_Programme/);
        if (!path.endsWith(".md")) continue;
        const text = await fs.readFile(join(root, path), "utf8");
        assert.doesNotMatch(text, /marketing-iq-test-(?:coordinator|evaluator)|MarketingIQ_Behavior_Acceptance/);
    }
});

test("runtime package, CLI and plugin report the same release version", async () => {
    const { version } = JSON.parse(await fs.readFile(join(root, "package.json")));
    const portable = join(plugin, "skills", "marketing-iq", "scripts", "portable");
    assert.equal(JSON.parse(await fs.readFile(join(portable, "package.json"))).version, version);
    const result = spawnSync(process.execPath, [join(portable, "cli.js"), "--version"],
        { encoding: "utf8", timeout: 20000 });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), version);
});

test("check mode detects drift without repairing or deleting consumer content", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-generator-check-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const inputs = [...runtimeAssets, "package.json", "docs/integration/MarketingIQ_Plugin.md",
        "tools/MarketingIQ.Portable/plugin.mjs", "tools/MarketingIQ.Portable/assets.mjs"];
    for (const name of inputs) {
        const target = join(temporary, name);
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.copyFile(join(root, name), target);
    }
    const invoke = args => spawnSync(process.execPath,
        [join(temporary, "tools", "MarketingIQ.Portable", "plugin.mjs"), ...args],
        { encoding: "utf8", timeout: 20000 });
    assert.equal(invoke([]).status, 0);
    assert.equal(invoke(["--check"]).status, 0);
    const generated = join(temporary, "plugins", "marketing-iq");
    const readme = join(generated, "README.md");
    await fs.writeFile(readme, "consumer change");
    assert.equal(invoke(["--check"]).status, 1);
    assert.equal(await fs.readFile(readme, "utf8"), "consumer change");
    assert.equal(invoke([]).status, 0);
    await fs.unlink(readme);
    assert.equal(invoke(["--check"]).status, 1);
    assert.equal(await fs.stat(readme).then(() => true, () => false), false);
    assert.equal(invoke([]).status, 0);
    const extra = join(generated, "client-note.txt");
    await fs.writeFile(extra, "preserve me");
    assert.equal(invoke(["--check"]).status, 1);
    assert.equal(invoke([]).status, 1);
    assert.equal(await fs.readFile(extra, "utf8"), "preserve me");
});

test("runtime check rejects changed, missing and unknown files without mutation", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-runtime-check-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    for (const name of [...runtimeAssets, "package.json", "docs/integration/MarketingIQ_Plugin.md"]) {
        const target = join(temporary, name);
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.copyFile(join(root, name), target);
    }
    await fs.cp(join(root, "tools", "MarketingIQ.Portable"),
        join(temporary, "tools", "MarketingIQ.Portable"), { recursive: true });
    await fs.symlink(join(root, "node_modules"), join(temporary, "node_modules"), "junction");
    const run = (name, args = []) => spawnSync(process.execPath,
        [join(temporary, "tools", "MarketingIQ.Portable", name), ...args],
        { encoding: "utf8", timeout: 60000 });
    assert.equal(run("plugin.mjs").status, 0);
    const valid = run("build.mjs", ["--check"]);
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    const runtime = join(temporary, ".github", "skills", "marketing-iq", "scripts", "portable");
    const cli = join(runtime, "cli.js");
    const original = await fs.readFile(cli);
    await fs.appendFile(cli, "\n// drift canary\n");
    assert.equal(run("build.mjs", ["--check"]).status, 1);
    assert.match(await fs.readFile(cli, "utf8"), /drift canary/);
    await fs.unlink(cli);
    assert.equal(run("build.mjs", ["--check"]).status, 1);
    assert.equal(await fs.stat(cli).then(() => true, () => false), false);
    await fs.writeFile(cli, original);
    const unknown = join(runtime, "consumer-note.txt");
    await fs.writeFile(unknown, "preserve me");
    assert.equal(run("build.mjs", ["--check"]).status, 1);
    assert.equal(await fs.readFile(unknown, "utf8"), "preserve me");
});

test("progressive entrypoint stays bounded and every shipped reference resolves", async () => {
    const shared = join(plugin, "skills", "marketing-iq");
    const entry = await fs.readFile(join(shared, "SKILL.md"), "utf8");
    assert.ok(entry.split("\n").length < 500, "shared entrypoint should not inline the whole workflow");
    for (const file of await fs.readdir(plugin, { recursive: true, withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".md") || file.name === "README.md") continue;
        const text = await fs.readFile(join(file.parentPath, file.name), "utf8");
        for (const match of text.matchAll(/references\\([a-z][a-z-]+\.md)/g)) {
            assert.ok((await fs.stat(join(shared, "references", match[1]))).isFile(), match[0]);
        }
    }
});

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
    assert.equal(files.filter(file => file.isFile()).length, runtimeAssets.length + 4);
    for (const file of files) {
        assert.equal(file.isSymbolicLink(), false);
        if (!file.isFile()) continue;
        const path = join(file.parentPath, file.name);
        assert.doesNotMatch(path.slice(plugin.length), /node_modules|local-data|\.cs$|\.ts$|\.dll$|\.ps1$|copilot-instructions|use-cases\.json/i);
        if (file.name.endsWith(".md") && file.name !== "README.md") {
            const text = await fs.readFile(path, "utf8");
            assert.doesNotMatch(text, /\.github\\skills\\/);
            if (file.name === "SKILL.md" || file.name.endsWith(".agent.md")) {
                assert.match(text, /# Output-format hard gate[\s\S]*# Role[\s\S]*# Final check/);
                if (file.name === "SKILL.md" || path.includes(join("com.github.copilot", "agents"))) {
                    assert.match(text, /<MIQ_SHARED>/);
                    assert.match(text, /Installed assets are read-only/);
                }
            }
        }
    }
    const agent = await fs.readFile(join(plugin, "com.github.copilot", "agents", "marketing-iq.agent.md"), "utf8");
    const canonical = await fs.readFile(join(root, ".github", "agents", "marketing-iq.agent.md"), "utf8");
    assert.equal(agent.split("\n")[3].trimEnd(), canonical.split("\n")[3].trimEnd());
    const shared = join(plugin, "skills", "marketing-iq");
    const intake = await fs.readFile(join(shared, "references", "source-preferences.md"), "utf8");
    assert.equal(intake, (await fs.readFile(join(root, ".github", "skills", "marketing-iq",
        "references", "source-preferences.md"), "utf8")).replaceAll("\r\n", "\n"));
    for (const entry of ["SKILL.md", join("examples", "marketing-iq-workiq.agent.md")]) {
        assert.match(await fs.readFile(join(shared, entry), "utf8"), /references\\source-preferences\.md/);
    }
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

test("client WorkIQ example is copyable after relocation and rebuild preserves the client's independent copy", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-client-profile-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const installed = join(temporary, "installed plugin");
    const agents = join(temporary, "consumer", ".github", "agents");
    await fs.cp(plugin, installed, { recursive: true });
    await fs.mkdir(agents, { recursive: true });
    const example = join(installed, "skills", "marketing-iq", "examples", "marketing-iq-workiq.agent.md");
    const destination = join(agents, "marketing-iq-workiq.agent.md");
    await fs.copyFile(example, destination, fs.constants.COPYFILE_EXCL);
    const profile = await fs.readFile(destination, "utf8");
    assert.doesNotMatch(profile, /generated native-plugin component, not a consumer-workspace file/);
    assert.match(profile, /name: marketing-iq-workiq/);
    assert.deepEqual(JSON.parse(/^tools:\s*(.+)$/m.exec(profile)[1]),
        ["read", "execute", "agent", "workiq/retrieve", "workiq/fetch"]);
    assert.match(profile, /host's discovered installed plugin skill/);
    assert.match(profile, /Do not invoke the packaged Marketing IQ agent/);
    assert.match(profile, /Renaming a tool cannot supply missing source/);
    assert.match(profile, /empty facts\s+and sections/);
    assert.doesNotMatch(profile, /\.github\\skills\\|C:\\work\\|https:\/\/.*sharepoint/i);
    const guide = await fs.readFile(join(installed, "skills", "marketing-iq", "references", "client-profiles.md"), "utf8");
    assert.match(guide, /Profile already exists; review it instead of overwriting/);
    assert.match(guide, /same agent ID/);
    await assert.rejects(fs.copyFile(example, destination, fs.constants.COPYFILE_EXCL), { code: "EEXIST" });
    const customized = profile.replace("name: marketing-iq-workiq", "name: marketing-iq-workiq-client");
    await fs.writeFile(destination, customized);
    const rebuilt = spawnSync(process.execPath, [join(root, "tools", "MarketingIQ.Portable", "plugin.mjs")], {
        cwd: root, encoding: "utf8", timeout: 20000
    });
    assert.equal(rebuilt.status, 0, rebuilt.stdout + rebuilt.stderr);
    await fs.cp(plugin, installed, { recursive: true });
    assert.equal(await fs.readFile(destination, "utf8"), customized);
    assert.equal(await fs.readFile(example, "utf8"), profile);
    assert.equal(await fs.stat(join(installed, "com.github.copilot", "agents", "marketing-iq-workiq.agent.md"))
        .then(() => true, () => false), false, "example must not auto-install as an active plugin agent");
});
