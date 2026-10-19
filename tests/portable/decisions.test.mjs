import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scope, now, record, publish, discover, withdraw, run, runAsync } from "./fixtures.mjs";

async function setup(t) {
    const temporary = await fs.mkdtemp(join(tmpdir(), "miq-decisions-test-"));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const store = join(temporary, "store");
    const call = (request, readOnly = false) => run(["decisions", "--store-root", store, ...(readOnly ? ["--read-only"] : [])], request);
    return { temporary, store, call };
}
const codes = result => result.value.diagnostics;

test("confirmation, exact identity and read-only gate precede writes", async t => {
    const { store, call } = await setup(t), request = publish(record());
    for (const value of [undefined, null, { ...request.acceptance, confirmed: false }]) {
        const input = { ...request, acceptance: value };
        assert.deepEqual(codes(call(input)), ["APPROVAL_REQUIRED"]);
        assert.equal(await fs.stat(store).then(() => true, () => false), false);
    }
    assert.deepEqual(codes(call({ ...request, acceptance: { ...request.acceptance, version: 2 } })), ["INVALID_REQUEST"]);
    assert.deepEqual(codes(call(request, true)), ["READ_ONLY"]);
    assert.equal(call(request).value.status, "published");
    assert.equal(call(request).value.status, "unchanged");
    assert.deepEqual(codes(call(publish(record(undefined, { direction: "Changed synthetic choice." })))), ["VERSION_CONFLICT"]);
});

test("fresh-process discovery and partial scope never infer context or create missing store", async t => {
    const { store, call } = await setup(t);
    assert.equal(call(discover(), true).value.status, "not-found");
    assert.equal(call(discover({ scope: {} }), true).value.status, "needs-context");
    assert.equal(await fs.stat(store).then(() => true, () => false), false);
    assert.equal(call(publish(record())).value.status, "published");
    assert.equal(call(discover(), true).value.status, "selected");
    assert.deepEqual(call(discover({ scope: { ...scope, audienceKey: "other" } }), true).value.decisions, []);
    assert.deepEqual(call(discover({ scope: { productKey: scope.productKey } })).value.missingFields,
        ["topicKey", "audienceKey", "geographyKey"]);
});

test("future supersession preserves predecessor until effective, then withdrawal never resurrects it", async t => {
    const { call } = await setup(t), prior = record("prior");
    const next = record("next", { effectiveFrom: "2026-10-20T00:00:00Z", supersedes: [{ decisionId: "prior", version: 1 }] });
    call(publish(prior)); assert.equal(call(publish(next)).value.status, "published");
    assert.equal(call(discover()).value.decisions[0].decisionId, "prior");
    assert.equal(call(discover({ asOf: "2026-10-20T00:00:00Z" })).value.decisions[0].decisionId, "next");
    assert.equal(call(withdraw(next)).value.status, "withdrawn");
    assert.equal(call(withdraw(next)).value.status, "withdrawn");
    assert.equal(call(discover()).value.status, "not-found");
    assert.equal(call(publish(next)).value.status, "unchanged");
    assert.equal(call(discover()).value.status, "not-found");
});

test("coexisting alternatives are returned sorted, never newest-picked", async t => {
    const { call } = await setup(t);
    call(publish(record("z-option"))); call(publish(record("a-option")));
    const result = call(discover()).value;
    assert.equal(result.status, "choice-required");
    assert.deepEqual(result.decisions.map(item => item.decisionId), ["a-option", "z-option"]);
});

test("100ns effective boundaries and UTC-equivalent replay are preserved", async t => {
    const { call } = await setup(t), value = record("precision", {
        effectiveFrom: "2026-10-19T00:00:00.0000001Z",
        effectiveUntil: "2026-10-19T00:00:00.0000003Z"
    });
    call(publish(value));
    assert.equal(call(discover({ asOf: "2026-10-19T00:00:00Z" })).value.status, "not-found");
    assert.equal(call(discover({ asOf: "2026-10-19T00:00:00.0000002Z" })).value.status, "selected");
    assert.equal(call(discover({ asOf: value.effectiveUntil })).value.status, "not-found");
    const equivalent = { ...value, effectiveFrom: "2026-10-19T01:00:00.0000001+01:00" };
    assert.equal(call(publish(equivalent)).value.status, "unchanged");
    assert.deepEqual(codes(call(publish({ ...value, effectiveFrom: "2026-10-19T00:00:00.0000002Z" }))), ["VERSION_CONFLICT"]);
});

test("long timestamp fractions round at 100ns precision, including ties and second rollover", async t => {
    const { call } = await setup(t);
    for (const [fraction, expected] of [
        ["123456789", "00.1234568"], ["00000005", "00.0000001"],
        ["12345665", "00.1234567"], ["99999999", "01"]
    ]) {
        const result = call(publish(record("rounded-" + fraction, { acceptedAt: `2026-10-19T00:00:00.${fraction}Z` }))).value;
        assert.equal(result.status, "published");
        assert.equal(result.decisions[0].acceptedAt, `2026-10-19T00:00:${expected}+00:00`);
    }
});

test("strict wire rejects duplicates, malformed UTF8, unknown fields, lexical non-integers and excessive input", async t => {
    const { call } = await setup(t);
    const valid = JSON.stringify(discover());
    for (const raw of [
        valid.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1'),
        valid.replace('"schemaVersion":1', '"schemaVersion":1,"schema\\u0056ersion":1'),
        valid.replace('"schemaVersion":1', '"schemaVersion":1.0'),
        valid.replace('"schemaVersion":1', '"schemaVersion":1e0'),
        valid.replace('"operation"', '"extra":true,"operation"'),
        valid + " trailing", "\uFEFF" + valid, '{"a":' + "[".repeat(34) + "0" + "]".repeat(34) + "}",
        Buffer.from([0xff]), " ".repeat(131073), valid.replace('"asOf":"2026-10-19T12:00:00Z"', '"asOf":"2026-02-30T12:00:00Z"')
    ]) assert.deepEqual(codes(call(raw)), ["INVALID_REQUEST"]);
});

test("invalid dates, scope labels, intervals and supersession cannot mutate store", async t => {
    const { call } = await setup(t);
    for (const overrides of [
        { decisionId: "../escape" }, { version: 2147483648 }, { acceptedAt: "2026-10-19T00:00:00" },
        { acceptedAt: "2026-10-19T00:00:60Z" }, { acceptedAt: "2026-10-19T00:00:00+14:01" },
        { effectiveUntil: "2026-10-19T00:00:00Z" }, { scope: { ...scope, geographyKey: null } },
        { acceptance: { confirmed: true } }
    ]) assert.deepEqual(codes(call(publish(record(undefined, overrides)))), ["INVALID_REQUEST"]);
    assert.deepEqual(codes(call(publish(record("replacement", { supersedes: [{ decisionId: "missing", version: 1 }] })))), ["SUPERSESSION_INVALID"]);
    call(publish(record("other-scope", { scope: { ...scope, topicKey: "different" } })));
    assert.deepEqual(codes(call(publish(record("replacement", { supersedes: [{ decisionId: "other-scope", version: 1 }] })))), ["SUPERSESSION_INVALID"]);
});

test("all records and tombstones are validated before selecting even unrelated direction", async t => {
    const { store, call } = await setup(t);
    call(publish(record()));
    const path = join(store, "accepted", "corrupt.v1.json");
    await fs.writeFile(path, "{}");
    assert.deepEqual(codes(call(discover())), ["STORE_INVALID"]);
    await fs.unlink(path);
    await fs.mkdir(join(store, ".withdrawn"));
    await fs.writeFile(join(store, ".withdrawn", "missing.v1"), "");
    assert.deepEqual(codes(call(discover())), ["STORE_INVALID"]);
});

test("dangling/cyclic supersession, filename mismatches and duplicate identities fail closed", async t => {
    for (const mode of ["dangling", "cycle", "filename", "duplicate"]) {
        const { store, call } = await setup(t);
        call(publish(record("first"))); call(publish(record("second")));
        const firstPath = join(store, "accepted", "first.v1.json"), first = JSON.parse(await fs.readFile(firstPath));
        if (mode === "filename") first.decisionId = "not-first";
        if (mode === "dangling") first.supersedes = [{ decisionId: "missing", version: 1 }];
        if (mode === "cycle") {
            first.supersedes = [{ decisionId: "second", version: 1 }];
            const secondPath = join(store, "accepted", "second.v1.json"), second = JSON.parse(await fs.readFile(secondPath));
            second.supersedes = [{ decisionId: "first", version: 1 }];
            await fs.writeFile(secondPath, JSON.stringify(second));
        }
        if (mode === "duplicate") await fs.copyFile(firstPath, join(store, "archive", "first.v1.json"));
        await fs.writeFile(firstPath, JSON.stringify(first));
        assert.deepEqual(codes(call(discover())), ["STORE_INVALID"], mode);
    }
});

test("interrupted supersession and withdrawal are recovered by exact replay", async t => {
    const { store, call } = await setup(t), prior = record("prior"), successor = record("successor", {
        supersedes: [{ decisionId: "prior", version: 1 }]
    });
    call(publish(prior)); call(publish(successor));
    await fs.rename(join(store, "archive", "prior.v1.json"), join(store, "accepted", "prior.v1.json"));
    const temporary = join(store, "accepted", ".publish-" + "a".repeat(32) + ".tmp");
    await fs.writeFile(temporary, "incomplete write");
    assert.equal(call(publish(successor)).value.status, "unchanged");
    assert.equal(await fs.stat(temporary).then(() => true, () => false), false);
    await fs.mkdir(join(store, ".withdrawn"));
    await fs.writeFile(join(store, ".withdrawn", "successor.v1"), "");
    assert.equal(call(withdraw(successor)).value.status, "withdrawn");
    assert.equal(call(discover()).value.status, "not-found");
});

test("concurrent Node publishers serialize to one publish and exact replays", async t => {
    const { store, call } = await setup(t);
    const results = await Promise.all(Array.from({ length: 8 }, () => runAsync(["decisions", "--store-root", store], publish(record()))));
    assert.equal(results.filter(result => result.value.status === "published").length, 1);
    assert.equal(results.filter(result => result.value.status === "unchanged").length, 7);
    assert.equal(call(discover()).value.status, "selected");
});

test("record, store, count and recovery-file bounds are enforced", async t => {
    const { store, call } = await setup(t);
    call(publish(record()));
    const accepted = join(store, "accepted");
    const stored = JSON.parse(await fs.readFile(join(accepted, "synthetic-direction.v1.json")));
    for (let index = 0; index < 100; index++) {
        const value = { ...stored, decisionId: `item-${index}`, acceptance: { decisionId: `item-${index}`, version: 1, confirmed: true } };
        await fs.writeFile(join(accepted, `item-${index}.v1.json`), JSON.stringify(value));
    }
    assert.deepEqual(codes(call(discover())), ["STORE_LIMIT_EXCEEDED"]);
    for (let index = 0; index < 100; index++) await fs.unlink(join(accepted, `item-${index}.v1.json`));
    await fs.writeFile(join(accepted, "oversize.v1.json"), " ".repeat(131073));
    assert.deepEqual(codes(call(discover())), ["STORE_LIMIT_EXCEEDED"]);
    await fs.unlink(join(accepted, "oversize.v1.json"));
    for (let index = 0; index < 9; index++) {
        const decisionId = `large-${index}`;
        const value = { ...stored, decisionId, direction: "x".repeat(125000), acceptance: { decisionId, version: 1, confirmed: true } };
        const bytes = JSON.stringify(value);
        assert.ok(Buffer.byteLength(bytes) < 131072);
        await fs.writeFile(join(accepted, `${decisionId}.v1.json`), bytes);
    }
    assert.deepEqual(codes(call(discover())), ["STORE_LIMIT_EXCEEDED"]);
    for (let index = 0; index < 9; index++) await fs.unlink(join(accepted, `large-${index}.v1.json`));
    for (let index = 0; index < 101; index++)
        await fs.writeFile(join(accepted, `.publish-${index.toString(16).padStart(32, "0")}.tmp`), "");
    assert.deepEqual(codes(call(discover())), ["STORE_LIMIT_EXCEEDED"]);
});

test("Windows store path aliases and device/network paths cannot split the cooperative lock", { skip: process.platform !== "win32" }, async t => {
    const { store } = await setup(t);
    for (const path of [store + ".", store + " ", store + ":alternate", "\\\\server\\share\\store", join(store, "nul")])
        assert.deepEqual(codes(run(["decisions", "--store-root", path], discover())), ["INVALID_REQUEST"]);
});

test("symlink/junction roots and ancestors are not followed", async t => {
    const { temporary, call } = await setup(t);
    call(publish(record()));
    const target = join(temporary, "target"), alias = join(temporary, "alias");
    await fs.mkdir(target);
    await fs.symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
    const result = run(["decisions", "--store-root", join(alias, "missing"), "--read-only"], discover());
    assert.deepEqual(codes(result), ["STORE_INVALID"]);
    assert.deepEqual(await fs.readdir(target), []);
});

test("abandoned lock fails closed without stealing or changing records", async t => {
    const { store, call } = await setup(t);
    call(publish(record()));
    const normalized = process.platform === "win32" ? store.toUpperCase() : store;
    const lock = join(tmpdir(), `marketing-iq-decisions-${createHash("sha256").update(normalized).digest("hex")}.lock`);
    await fs.mkdir(lock); await fs.writeFile(join(lock, "owner.json"), '{"pid":0}');
    t.after(() => fs.rm(lock, { recursive: true, force: true }));
    assert.deepEqual(codes(call(discover())), ["LOCK_UNAVAILABLE"]);
    assert.equal(JSON.parse(await fs.readFile(join(lock, "owner.json"))).pid, 0);
});
