import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, run, record, publish, discover, withdraw } from "../portable/fixtures.mjs";

const oracle = join(root, "tools", "MarketingIQ.Decisions", "bin", "Debug", "net10.0", "MarketingIQ.Decisions.dll");

test("Node and existing C# executable agree on synthetic precision, lifecycle and wire validation", async t => {
    await fs.access(oracle);
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-parity-test-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const nodeStore = join(temporary, "node"), dotnetStore = join(temporary, "dotnet");
    const compare = (input, readOnly = false) => {
        const raw = typeof input === "string" ? input : JSON.stringify(input);
        const old = spawnSync("dotnet", [oracle, "--store-root", dotnetStore, ...(readOnly ? ["--read-only"] : [])],
            { input: raw, encoding: "utf8", timeout: 20000 });
        if (old.error) throw old.error;
        assert.ok(old.stdout, old.stderr);
        const current = run(["decisions", "--store-root", nodeStore, ...(readOnly ? ["--read-only"] : [])], raw);
        assert.deepEqual(current.value, JSON.parse(old.stdout), raw);
        assert.equal(current.code, old.status);
    };
    compare(discover({ scope: {} }), true); compare(discover(), true);
    compare({ ...publish(record()), acceptance: null });
    for (const fraction of ["1234567", "123456789", "99999999", "00000005", "12345665", "12345675", "1234567890123456"]) {
        const value = record("precision-" + fraction, {
            acceptedAt: `2026-10-19T00:00:00.${fraction}Z`, effectiveFrom: `2026-10-19T00:00:00.${fraction}Z`
        });
        compare(publish(value)); compare(publish(value)); compare(discover());
    }
    compare(JSON.stringify(publish(record())).replace('"version":1', '"version":1.0'));
    compare(publish(record("prior")));
    const next = record("future", { effectiveFrom: "2026-10-20T00:00:00Z", supersedes: [{ decisionId: "prior", version: 1 }] });
    compare(publish(next)); compare(discover()); compare(discover({ asOf: "2026-10-20T00:00:00Z" }));
    compare(withdraw(next)); compare(withdraw(next)); compare(discover());
    compare(publish(next)); compare(publish(record("prior", { direction: "Different content." })));
});
