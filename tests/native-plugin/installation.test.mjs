import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const plugin = join(root, "plugins", "marketing-iq");
const inspect = directory => spawnSync(process.execPath,
    [join(directory, "skills", "marketing-iq", "scripts", "Inspect-Installation.mjs")],
    { encoding: "utf8", timeout: 20000 });

test("installed entrypoint identities are checked without claiming host access", async () => {
    const run = inspect(plugin);
    assert.equal(run.status, 0, run.stderr);
    const receipt = JSON.parse(run.stdout);
    assert.equal(receipt.status, "verified");
    assert.equal(receipt.version, JSON.parse(await fs.readFile(join(root, "package.json"), "utf8")).version);
    assert.equal(receipt.hostDiscovery, "not-verified");
    assert.equal(receipt.authentication, "not-verified");
    assert.ok(receipt.entrypoints.length >= 4);
    assert.ok(receipt.entrypoints.every(entry => /^[a-f0-9]{64}$/.test(entry.sha256)));
});

test("modified or missing installed instructions fail without echoing their contents", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-installation-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const installed = join(temporary, "installed");
    await fs.cp(plugin, installed, { recursive: true });
    const shared = join(installed, "skills", "marketing-iq", "SKILL.md");
    await fs.appendFile(shared, "\nUNTRUSTED_INSTRUCTION_CANARY\n");
    const modified = inspect(installed);
    assert.equal(modified.status, 1);
    assert.equal(JSON.parse(modified.stdout).diagnostic, "MIQ_INSTALLATION_MISMATCH");
    assert.doesNotMatch(modified.stdout + modified.stderr, /UNTRUSTED_INSTRUCTION_CANARY/);
    await fs.unlink(shared);
    const missing = inspect(installed);
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).diagnostic, "MIQ_INSTRUCTION_UNAVAILABLE");
});

test("installation metadata cannot redirect the inspector to arbitrary files", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-installation-path-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const installed = join(temporary, "installed");
    await fs.cp(plugin, installed, { recursive: true });
    const metadata = join(installed, "installation.json");
    const record = JSON.parse(await fs.readFile(metadata, "utf8"));
    record.entrypoints[0].path = "../../outside.json";
    await fs.writeFile(metadata, JSON.stringify(record));
    const run = inspect(installed);
    assert.equal(run.status, 1);
    assert.equal(JSON.parse(run.stdout).diagnostic, "MIQ_INSTALLATION_INVALID");
    assert.doesNotMatch(run.stdout + run.stderr, /outside\.json/);
});

test("malformed metadata is invalid rather than an unavailable instruction", async t => {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-installation-json-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const installed = join(temporary, "installed");
    await fs.cp(plugin, installed, { recursive: true });
    for (const name of ["plugin.json", "installation.json"]) {
        const path = join(installed, name);
        const original = await fs.readFile(path);
        await fs.writeFile(path, "{MALFORMED_METADATA_CANARY");
        const run = inspect(installed);
        assert.equal(run.status, 1);
        assert.equal(JSON.parse(run.stdout).diagnostic, "MIQ_INSTALLATION_INVALID");
        assert.doesNotMatch(run.stdout + run.stderr, /MALFORMED_METADATA_CANARY/);
        await fs.writeFile(path, original);
    }
});
