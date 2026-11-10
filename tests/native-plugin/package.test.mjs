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
    // The authored entrypoint stays progressive. The installed copy inlines references (spec §11, R1-a),
    // so its bound is the 256 KiB entrypoint limit checked in the inlining test below.
    const entry = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "SKILL.md"), "utf8");
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

test("installed instructions keep accepted decisions in the consumer working directory", async () => {
    // Contract: the agent says local-data/launch-decisions belongs to the consumer workspace,
    // never the plugin cache. No installed instruction may resolve the store elsewhere.
    const shared = join(plugin, "skills", "marketing-iq");
    const tools = await fs.readFile(join(shared, "references", "decision-tools.md"), "utf8");
    const storeRoot = tools.split("\n").find(line => line.startsWith("Store root:"));
    assert.ok(storeRoot, "decision-tools must state the store root");
    assert.match(storeRoot, /local-data\\launch-decisions/);
    assert.match(storeRoot, /current working directory/);
    for (const file of await fs.readdir(plugin, { recursive: true, withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".md")) continue;
        for (const line of (await fs.readFile(join(file.parentPath, file.name), "utf8")).split("\n")) {
            if (/local-data|Store root/.test(line)) assert.doesNotMatch(line, /resolved from the installed/, line);
        }
    }
    // Neighbouring legitimate rewrites must survive: workflow skills read references from the install.
    for (const name of ["marketing-iq-launch-decision", "marketing-iq-field-activation"]) {
        assert.match(await fs.readFile(join(plugin, "skills", name, "SKILL.md"), "utf8"),
            /references\\[a-z-]+\.md` from the installed skill directory\./);
    }
});

test("installed skills inline every reachable reference because plugin files may be unreadable", async () => {
    // Host evidence (spec §11, S1b/S1c): Copilot CLI 1.0.107 denied view reads under the plugin cache,
    // while the skill tool delivered SKILL.md. Each installed skill must therefore be self-contained.
    const shared = join(plugin, "skills", "marketing-iq");
    for (const name of ["marketing-iq", "marketing-iq-launch-decision", "marketing-iq-field-activation",
        "marketing-iq-campaign-planning"]) {
        const bytes = await fs.readFile(join(plugin, "skills", name, "SKILL.md"));
        assert.ok(bytes.length <= 262144, `${name} exceeds the 256 KiB entrypoint bound`);
        const text = bytes.toString("utf8");
        const [preamble] = text.split("\n# Inlined reference: ");
        assert.match(preamble, /do not use\s+file tools/, `${name} must say references are inlined`);
        assert.match(preamble, /skill tool/, `${name} must load other workflows with the skill tool`);
        const sections = new Set([...text.matchAll(/^# Inlined reference: (\S+)$/gm)].map(match => match[1]));
        for (const match of text.matchAll(/references\\([a-z][a-z-]+\.md)/g)) {
            assert.ok(sections.has(`references\\${match[1]}`), `${name} mentions ${match[0]} without inlining it`);
        }
        if (name !== "marketing-iq") assert.ok(sections.has("<MIQ_SHARED>\\SKILL.md"), `${name} lacks the shared policy`);
        for (const label of sections) {
            if (!label.startsWith("references\\")) continue;
            const original = await fs.readFile(join(shared, "references", label.slice("references\\".length)), "utf8");
            assert.ok(text.includes(original.trimEnd()), `${name}: inlined ${label} differs from the shipped file`);
        }
    }
});

test("evidence hard gate is identical and delivered before the role in every source workflow", async () => {
    // Interactive trial (spec, 2026-11-10): the model loaded the workflow skill first, used provider-side
    // web search and delivered unadmitted claims. The gate must arrive early and say the same thing everywhere.
    // Packaging check only; whether a model obeys it needs the interactive rerun.
    const gate = text => /\n# Evidence hard gate\n[\s\S]*?(?=\n# )/.exec(text)?.[0];
    const canonical = [];
    for (const name of ["marketing-iq", "marketing-iq-launch-decision", "marketing-iq-field-activation"]) {
        const source = (await fs.readFile(join(root, ".github", "skills", name, "SKILL.md"), "utf8")).replaceAll("\r\n", "\n");
        const block = gate(source);
        assert.ok(block, `${name} lacks the evidence hard gate`);
        canonical.push(block);
        const installed = await fs.readFile(join(plugin, "skills", name, "SKILL.md"), "utf8");
        const at = installed.indexOf("\n# Evidence hard gate\n");
        assert.ok(at > 0 && at < installed.indexOf("\n# Role\n"), `${name}: gate must precede the role`);
        // Rerun 2026-11-10: "name both URLs" pushed the model to probe the redirect with provider-side
        // open_page, because the connector capture has no destination URL. Locations come from the connector only.
        for (const rule of [/provider-side web search/, /`ready`/, /blocked/, /redirect/, /actually made/,
            /locations the selected connector itself reports/, /Never open, fetch or search a URL with any\s+other tool/,
            /the\s+requested URL is the source/]) {
            assert.match(block, rule, `${name}: ${rule}`);
        }
    }
    assert.equal(new Set(canonical).size, 1, "the three gate copies must be identical");
});

test("installed agent loads workflows through the skill tool, not plugin file reads", async () => {
    // Spec §11/§6: plugin files can be unreadable; the agent body cannot inline 190 KB (30,000-character
    // agent limit), so the installed agent must load the self-contained skills instead.
    const agent = await fs.readFile(join(plugin, "com.github.copilot", "agents", "marketing-iq.agent.md"), "utf8");
    const [, frontmatter, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(agent);
    assert.ok(JSON.parse(/^tools:\s*(.+)$/m.exec(frontmatter)[1]).includes("skill"), "agent must request the skill tool");
    assert.ok(body.length <= 30000, `agent body is ${body.length} characters`);
    const notice = body.indexOf("## Installed plugin loading");
    assert.ok(notice > 0 && notice < body.indexOf("# Input and workflow selection"), "loading notice must precede routing");
    for (const name of ["marketing-iq-launch-decision", "marketing-iq-field-activation", "marketing-iq-campaign-planning"]) {
        assert.match(body.slice(notice), new RegExp(`\`${name}\``));
    }
    assert.doesNotMatch(body, /Read the files above|Compose by reading/);
    assert.match(body, /Load the selected workflow skill with the skill tool, once/);
});

test("plugin builder fails closed when an installed-path rewrite is missing or ambiguous", async t => {
    const inputs = [...runtimeAssets, "package.json", "docs/integration/MarketingIQ_Plugin.md",
        "tools/MarketingIQ.Portable/plugin.mjs", "tools/MarketingIQ.Portable/assets.mjs"];
    const launch = ".github/skills/marketing-iq-launch-decision/SKILL.md";
    const build = async mutate => {
        const temporary = await fs.mkdtemp(join(tmpdir(), "miq-generator-rewrite-"));
        t.after(() => fs.rm(temporary, { recursive: true, force: true }));
        for (const name of inputs) {
            const target = join(temporary, name);
            await fs.mkdir(dirname(target), { recursive: true });
            await fs.copyFile(join(root, name), target);
        }
        const source = join(temporary, launch);
        await fs.writeFile(source, mutate(await fs.readFile(source, "utf8")));
        const result = spawnSync(process.execPath, [join(temporary, "tools", "MarketingIQ.Portable", "plugin.mjs")],
            { encoding: "utf8", timeout: 20000 });
        const written = await fs.stat(join(temporary, "plugins", "marketing-iq")).then(() => true, () => false);
        return { ...result, written };
    };
    const unchanged = await build(text => text);
    assert.equal(unchanged.status, 0, unchanged.stderr);
    assert.equal(unchanged.written, true);
    for (const [label, mutate] of [
        ["missing", text => text.replace("from the workspace.", "from somewhere else.")],
        ["ambiguous", text => text + "\nAlso read notes from the workspace.\n"]
    ]) {
        const result = await build(mutate);
        assert.notEqual(result.status, 0, `${label} rewrite target must fail the build`);
        assert.match(result.stderr, /rewrite/i, label);
        assert.equal(result.written, false, `${label} rewrite must not leave partial plugin output`);
    }
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
