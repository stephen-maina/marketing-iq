import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { instant } from "./instant.js";
import { MiqError, ioCode, keys, label, object, positiveInt, requireThat, strictJson, text } from "./json.js";

const scopeKeys = ["productKey", "topicKey", "audienceKey", "geographyKey"] as const;
type Scope = Record<typeof scopeKeys[number], string | null>;
interface Reference { decisionId: string; version: number }
interface Acceptance extends Reference { confirmed: boolean }
export interface Decision extends Reference {
    schemaVersion: 1; status: "accepted"; scope: Scope; direction: string;
    acceptedAt: string; effectiveFrom: string; effectiveUntil: string | null;
    supersedes: Reference[]; acceptance: Acceptance | null;
}
interface Stored { decision: Decision; location: "accepted" | "archive"; path: string }
interface Snapshot { records: Stored[]; identities: Map<string, Stored>; withdrawn: Set<string>; recovery: string[]; bytes: number }
export interface DecisionResponse {
    schemaVersion: 1; status: string; decisions: Decision[]; missingFields: string[]; diagnostics: string[];
}
const identity = (value: Reference) => `${value.decisionId}.v${value.version}`;
const compare = (a: Reference, b: Reference) =>
    a.decisionId < b.decisionId ? -1 : a.decisionId > b.decisionId ? 1 : a.version - b.version;
const scopeEqual = (a: Scope, b: Scope) => scopeKeys.every(key => a[key] === b[key]);
const response = (status: string, decisions: Decision[] = [], missingFields: string[] = [], diagnostics: string[] = []): DecisionResponse =>
    ({ schemaVersion: 1, status, decisions, missingFields, diagnostics });

function scope(value: unknown, partial: boolean): Scope {
    const raw = keys(value, partial ? [] : scopeKeys, partial ? scopeKeys : []);
    return Object.fromEntries(scopeKeys.map(key =>
        [key, partial && raw[key] == null ? null : label(raw[key])])) as Scope;
}

function reference(value: unknown): Reference {
    const raw = keys(value, ["decisionId", "version"]);
    return { decisionId: label(raw.decisionId), version: positiveInt(raw.version) };
}

function acceptance(value: unknown, ref: Reference): Acceptance {
    if (value == null) throw new MiqError("APPROVAL_REQUIRED");
    const raw = keys(value, ["decisionId", "version", "confirmed"]);
    const result = { decisionId: label(raw.decisionId), version: positiveInt(raw.version), confirmed: raw.confirmed };
    requireThat(typeof result.confirmed === "boolean" && identity(result) === identity(ref));
    requireThat(result.confirmed, "APPROVAL_REQUIRED");
    return { ...result, confirmed: result.confirmed };
}

export function parseDecision(value: unknown, stored = false): Decision {
    const fields = ["schemaVersion", "decisionId", "version", "status", "scope", "direction",
        "acceptedAt", "effectiveFrom", "effectiveUntil", "supersedes"];
    const raw = keys(value, stored ? [...fields, "acceptance"] : fields);
    requireThat(raw.schemaVersion === 1 && raw.status === "accepted" && Array.isArray(raw.supersedes));
    const ref = { decisionId: label(raw.decisionId), version: positiveInt(raw.version) };
    const effectiveFrom = instant(raw.effectiveFrom), until = raw.effectiveUntil === null ? null : instant(raw.effectiveUntil);
    requireThat(until === null || until.ticks > effectiveFrom.ticks);
    const supersedes = raw.supersedes.map(reference).sort(compare);
    requireThat(new Set(supersedes.map(identity)).size === supersedes.length);
    return {
        schemaVersion: 1, ...ref, status: "accepted", scope: scope(raw.scope, false),
        direction: text(raw.direction), acceptedAt: instant(raw.acceptedAt).utc,
        effectiveFrom: effectiveFrom.utc, effectiveUntil: until?.utc ?? null,
        supersedes, acceptance: stored ? acceptance(raw.acceptance, ref) : null
    };
}

async function stat(path: string) {
    try { return await fs.lstat(path); }
    catch (error) { if (ioCode(error) === "ENOENT") return null; throw error; }
}

async function safe(path: string): Promise<void> {
    for (let current = path;; current = dirname(current)) {
        const info = await stat(current);
        requireThat(!info?.isSymbolicLink(), "STORE_INVALID");
        if (dirname(current) === current) return;
    }
}

function acyclic(decisions: Decision[], code: string): void {
    const graph = new Map(decisions.map(d => [identity(d), d.supersedes.map(identity)]));
    const visiting = new Set<string>(), visited = new Set<string>();
    const visit = (id: string): void => {
        if (visited.has(id)) return;
        requireThat(!visiting.has(id), code); visiting.add(id);
        for (const target of graph.get(id) ?? []) visit(target);
        visiting.delete(id); visited.add(id);
    };
    for (const id of graph.keys()) visit(id);
}

async function snapshot(root: string): Promise<Snapshot> {
    const result: Snapshot = { records: [], identities: new Map(), withdrawn: new Set(), recovery: [], bytes: 0 };
    await safe(root);
    const rootStat = await stat(root);
    requireThat(!rootStat || rootStat.isDirectory(), "STORE_INVALID");
    if (!rootStat) return result;
    for (const location of ["accepted", "archive", ".withdrawn"] as const) {
        const directory = join(root, location);
        await safe(directory);
        const info = await stat(directory);
        requireThat(!info || info.isDirectory(), "STORE_INVALID");
        if (!info) continue;
        for (const name of await fs.readdir(directory)) {
            const path = join(directory, name);
            await safe(path);
            const file = await fs.lstat(path);
            requireThat(file.isFile(), "STORE_INVALID");
            if (location === ".withdrawn") {
                requireThat(/^[a-z0-9]+(?:-[a-z0-9]+)*\.v[1-9][0-9]*$/.test(name) &&
                    file.size === 0 && !result.withdrawn.has(name), "STORE_INVALID");
                result.withdrawn.add(name);
                requireThat(result.withdrawn.size <= 100, "STORE_LIMIT_EXCEEDED");
                continue;
            }
            if (/^\.publish-[0-9a-f]{32}\.tmp$/.test(name)) {
                result.recovery.push(path);
                requireThat(result.recovery.length <= 100 && file.size <= 131072, "STORE_LIMIT_EXCEEDED");
                continue;
            }
            requireThat(/^[a-z0-9]+(?:-[a-z0-9]+)*\.v[1-9][0-9]*\.json$/.test(name), "STORE_INVALID");
            result.bytes += file.size;
            requireThat(file.size <= 131072 && result.bytes <= 1048576 && result.records.length < 100, "STORE_LIMIT_EXCEEDED");
            let decision: Decision;
            try { decision = parseDecision(strictJson(await fs.readFile(path)), true); }
            catch (error) {
                if (error instanceof MiqError) throw new MiqError("STORE_INVALID");
                throw error;
            }
            requireThat(name === identity(decision) + ".json" && !result.identities.has(identity(decision)), "STORE_INVALID");
            const record = { decision, location, path };
            result.identities.set(identity(decision), record); result.records.push(record);
        }
    }
    const superseded = new Set<string>();
    for (const { decision } of result.records) for (const target of decision.supersedes) {
        const existing = result.identities.get(identity(target));
        requireThat(existing && scopeEqual(decision.scope, existing.decision.scope) &&
            identity(decision) !== identity(target), "STORE_INVALID");
        superseded.add(identity(target));
    }
    for (const id of result.withdrawn) requireThat(result.identities.has(id), "STORE_INVALID");
    for (const record of result.records) requireThat(record.location !== "archive" ||
        superseded.has(identity(record.decision)) || result.withdrawn.has(identity(record.decision)), "STORE_INVALID");
    acyclic(result.records.map(record => record.decision), "STORE_INVALID");
    return result;
}

async function atomic(destination: string, bytes: Buffer): Promise<void> {
    const temporary = join(dirname(destination), `.publish-${randomUUID().replaceAll("-", "")}.tmp`);
    const file = await fs.open(temporary, "wx", 0o600);
    try {
        await file.writeFile(bytes); await file.sync(); await file.close();
        await fs.link(temporary, destination);
    } finally {
        await file.close();
        await fs.unlink(temporary);
    }
}

async function move(record: Stored, root: string): Promise<void> {
    if (record.location === "archive") return;
    const destination = join(root, "archive", identity(record.decision) + ".json");
    requireThat(!await stat(destination), "STORE_INVALID");
    await fs.rename(record.path, destination);
}

async function locked<T>(root: string, action: () => Promise<T>): Promise<T> {
    // One cooperative lock per normalized store. Never steal an abandoned writer's lock.
    const normalized = process.platform === "win32" ? root.toUpperCase() : root;
    const digest = createHash("sha256").update(normalized).digest("hex");
    const lock = join(tmpdir(), `marketing-iq-decisions-${digest}.lock`);
    const deadline = Date.now() + 5000;
    for (;;) {
        try { await fs.mkdir(lock, { mode: 0o700 }); break; }
        catch (error) {
            if (ioCode(error) !== "EEXIST") throw error;
            requireThat(Date.now() < deadline, "LOCK_UNAVAILABLE");
            await delay(25);
        }
    }
    let owner: Awaited<ReturnType<typeof fs.open>> | undefined;
    try {
        owner = await fs.open(join(lock, "owner.json"), "wx", 0o600);
        await owner.writeFile(JSON.stringify({ pid: process.pid }));
        return await action();
    } finally {
        if (owner) {
            await owner.close();
            await fs.unlink(join(lock, "owner.json"));
        }
        await fs.rmdir(lock);
    }
}

export async function executeDecision(input: unknown, storeRoot: string, readOnly = false): Promise<DecisionResponse> {
    try {
        requireThat(typeof storeRoot === "string" && storeRoot.trim() !== "" && !storeRoot.startsWith("--"));
        const root = resolve(storeRoot);
        requireThat(isAbsolute(root) && dirname(root) !== root);
        if (process.platform === "win32") {
            requireThat(/^[a-z]:\\/i.test(root) && !root.slice(2).includes(":"));
            requireThat(root.slice(3).split("\\").every(part =>
                !/[. ]$|[<>"|?*\x00-\x1f]/.test(part) &&
                !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
        }
        const raw = object(input);
        requireThat(raw.schemaVersion === 1);
        let proposed: Decision | undefined, withdraw: Reference | undefined, selectedScope: Scope | undefined, asOf: bigint | undefined;
        if (raw.operation === "discover") {
            keys(raw, ["schemaVersion", "operation", "scope", "asOf"]);
            selectedScope = scope(raw.scope, true); asOf = instant(raw.asOf).ticks;
            const missing = scopeKeys.filter(key => selectedScope![key] === null);
            if (missing.length) return response("needs-context", [], missing);
            await safe(root);
            if (!await stat(root)) return response("not-found");
        } else if (raw.operation === "publish") {
            keys(raw, ["schemaVersion", "operation", "record"], ["acceptance"]);
            proposed = parseDecision(raw.record);
            proposed.acceptance = acceptance(raw.acceptance, proposed);
        } else if (raw.operation === "withdraw") {
            keys(raw, ["schemaVersion", "operation", "decisionId", "version"], ["acceptance"]);
            withdraw = { decisionId: label(raw.decisionId), version: positiveInt(raw.version) };
            acceptance(raw.acceptance, withdraw);
        } else throw new MiqError("INVALID_REQUEST");
        requireThat(!readOnly || raw.operation === "discover", "READ_ONLY");
        return await locked(root, async () => {
            const store = await snapshot(root);
            if (selectedScope && asOf !== undefined) {
                const suppressed = new Set(store.records.filter(({ decision }) =>
                    store.withdrawn.has(identity(decision)) ||
                    instant(decision.acceptedAt).ticks <= asOf! && instant(decision.effectiveFrom).ticks <= asOf!)
                    .flatMap(({ decision }) => decision.supersedes.map(identity)));
                const decisions = store.records.map(record => record.decision).filter(decision =>
                    !store.withdrawn.has(identity(decision)) && !suppressed.has(identity(decision)) &&
                    scopeEqual(selectedScope!, decision.scope) && instant(decision.acceptedAt).ticks <= asOf! &&
                    instant(decision.effectiveFrom).ticks <= asOf! &&
                    (decision.effectiveUntil === null || asOf! < instant(decision.effectiveUntil).ticks)).sort(compare);
                return response(decisions.length === 0 ? "not-found" : decisions.length === 1 ? "selected" : "choice-required", decisions);
            }
            if (proposed) {
                const existing = store.identities.get(identity(proposed));
                if (existing) {
                    requireThat(JSON.stringify(existing.decision) === JSON.stringify(proposed), "VERSION_CONFLICT");
                    if (existing.location === "accepted" && !store.withdrawn.has(identity(proposed))) {
                        for (const path of store.recovery) await fs.unlink(path);
                        await fs.mkdir(join(root, "archive"), { recursive: true });
                        for (const target of proposed.supersedes) await move(store.identities.get(identity(target))!, root);
                    }
                    return response("unchanged", [proposed]);
                }
                for (const target of proposed.supersedes) {
                    const prior = store.identities.get(identity(target));
                    requireThat(prior && identity(target) !== identity(proposed) &&
                        scopeEqual(prior.decision.scope, proposed.scope), "SUPERSESSION_INVALID");
                }
                acyclic([...store.records.map(record => record.decision), proposed], "SUPERSESSION_INVALID");
                const bytes = Buffer.from(JSON.stringify(proposed));
                requireThat(bytes.length <= 131072 && store.bytes + bytes.length <= 1048576 &&
                    store.records.length < 100, "STORE_LIMIT_EXCEEDED");
                for (const path of store.recovery) await fs.unlink(path);
                await safe(root);
                await fs.mkdir(join(root, "accepted"), { recursive: true });
                await fs.mkdir(join(root, "archive"), { recursive: true });
                await safe(join(root, "accepted")); await safe(join(root, "archive"));
                await atomic(join(root, "accepted", identity(proposed) + ".json"), bytes);
                for (const target of proposed.supersedes) await move(store.identities.get(identity(target))!, root);
                return response("published", [proposed]);
            }
            requireThat(withdraw);
            const record = store.identities.get(identity(withdraw));
            if (!record) return response("not-found");
            if (!store.withdrawn.has(identity(withdraw))) {
                for (const path of store.recovery) await fs.unlink(path);
                await fs.mkdir(join(root, ".withdrawn"), { recursive: true });
                await safe(join(root, ".withdrawn"));
                const marker = await fs.open(join(root, ".withdrawn", identity(withdraw)), "wx", 0o600);
                try { await marker.sync(); } finally { await marker.close(); }
            }
            await fs.mkdir(join(root, "archive"), { recursive: true });
            await safe(join(root, "archive"));
            await move(record, root);
            return response("withdrawn", [record.decision]);
        });
    } catch (error) {
        if (error instanceof MiqError) return response(error.code === "APPROVAL_REQUIRED" ? "approval-required" : "invalid", [], [], [error.code]);
        if (ioCode(error)) return response("invalid", [], [], ["IO_ERROR"]);
        throw error;
    }
}
