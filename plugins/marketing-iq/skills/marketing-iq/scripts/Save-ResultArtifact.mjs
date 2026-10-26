import crypto from "node:crypto";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { validateCandidateStructure, validateReviewPacket } from "./Test-ReviewPacket.mjs";
import { readJsonFile } from "./portable/json.js";

const MAX_INPUT_BYTES = 262144;
const RESERVED_DIRECTORIES = new Set(["launch-decisions", "accepted", "archive", "knowledge"]);

class ArtifactError extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

async function readCandidate(input) {
    const chunks = [];
    let size = 0;
    try {
        for await (const chunk of input) {
            if (!(chunk instanceof Uint8Array)) throw new ArtifactError("invalid-utf8");
            size += chunk.byteLength;
            if (size > MAX_INPUT_BYTES) throw new ArtifactError("input-too-large");
            chunks.push(chunk);
        }
    } catch (error) {
        throw error instanceof ArtifactError ? error : new ArtifactError("input-unavailable");
    }
    let raw;
    try {
        raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    } catch {
        throw new ArtifactError("invalid-utf8");
    }
    let candidate;
    try {
        candidate = JSON.parse(raw);
    } catch {
        throw new ArtifactError("invalid-json");
    }
    if (validateCandidateStructure(candidate).status !== "pass") throw new ArtifactError("invalid-candidate");
    return candidate;
}

async function inspectDirectory(directory) {
    try {
        if (typeof directory !== "string" || !isAbsolute(directory)) throw new Error();
        // Avoid drive-relative, device/UNC, alternate-stream and normalized alias paths on Windows.
        if (process.platform === "win32" &&
            (!/^[a-z]:[\\/]/iu.test(directory) || directory.slice(2).includes(":"))) throw new Error();
        const parts = directory.slice(parse(directory).root.length).split(/[\\/]/u);
        if (parts.some(part => part === "." || part === ".." || /[. ]$/u.test(part) ||
            RESERVED_DIRECTORIES.has(part.toLowerCase()))) throw new Error();
        const paths = [];
        let current = resolve(directory);
        for (;;) {
            paths.unshift(current);
            const parent = dirname(current);
            if (parent === current) break;
            current = parent;
        }
        const snapshots = [];
        for (const path of paths) {
            const stat = await fs.lstat(path);
            if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error();
            snapshots.push({ path, dev: stat.dev, ino: stat.ino });
        }
        return snapshots;
    } catch {
        throw new ArtifactError("unsafe-directory");
    }
}

function sameIdentity(left, right) {
    return left.dev === right.dev && left.ino === right.ino;
}

async function recheckDirectory(directory, original) {
    const current = await inspectDirectory(directory);
    if (current.length !== original.length || current.some((stat, index) =>
        stat.path !== original[index].path || !sameIdentity(stat, original[index]))) {
        throw new ArtifactError("unsafe-directory");
    }
}

async function verifyBytes(handle, expected, identity) {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || !sameIdentity(stat, identity) || stat.size !== expected.length) {
        throw new ArtifactError("save-failed");
    }
    const actual = Buffer.alloc(expected.length + 1);
    let total = 0;
    while (total < actual.length) {
        const { bytesRead } = await handle.read(actual, total, actual.length - total, total);
        if (bytesRead === 0) break;
        total += bytesRead;
    }
    if (total !== expected.length || !actual.subarray(0, total).equals(expected)) {
        throw new ArtifactError("save-failed");
    }
}

// The caller must supply the existing host session artifact directory. Node cannot
// authenticate its ownership or detect every OS reparse type. These lstat/identity
// checks reduce mistakes; path-based I/O still has races, not OS isolation.
export async function saveResultArtifact(input, directory) {
    const candidate = await readCandidate(input);
    const originalDirectory = await inspectDirectory(directory);
    const path = join(resolve(directory), `marketing-iq-${candidate.useCase}-${crypto.randomUUID()}.json`);
    const bytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`, "utf8");
    let created = false;
    let identity = null;
    let handle = null;
    let failed = false;
    try {
        handle = await fs.open(path, "wx", 0o600);
        created = true;
        identity = await handle.stat();
        if (!identity.isFile() || identity.nlink !== 1) throw new ArtifactError("save-failed");
        await handle.writeFile(bytes);
        await handle.sync();
        await handle.close();
        handle = null;
        await recheckDirectory(directory, originalDirectory);
        handle = await fs.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        await verifyBytes(handle, bytes, identity);
        const visible = await fs.lstat(path);
        if (!visible.isFile() || visible.isSymbolicLink() || !sameIdentity(visible, identity)) {
            throw new ArtifactError("save-failed");
        }
        await recheckDirectory(directory, originalDirectory);
    } catch {
        failed = true;
    } finally {
        if (handle !== null) {
            try {
                await handle.close();
            } catch {
                failed = true;
            }
        }
    }
    if (failed) {
        if (created) {
            try {
                // Never remove a pre-existing/replaced path or traverse changed ancestors.
                await recheckDirectory(directory, originalDirectory);
                const visible = await fs.lstat(path);
                if (identity === null || !visible.isFile() || visible.isSymbolicLink() ||
                    !sameIdentity(visible, identity)) throw new Error();
                await fs.unlink(path);
            } catch {
                throw new ArtifactError("cleanup-failed");
            }
        }
        throw new ArtifactError("save-failed");
    }
    return { path, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), kind: "diagnostic-result" };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    try {
        const args = process.argv.slice(2);
        if (![2, 4].includes(args.length) || args[0] !== "--directory" ||
            args.length === 4 && !["--candidate-file", "--packet-file"].includes(args[2]))
            throw new ArtifactError("invalid-arguments");
        let input = process.stdin;
        if (args.length === 4) {
            let value;
            try { value = await readJsonFile(args[3], MAX_INPUT_BYTES); }
            catch { throw new ArtifactError("invalid-input-file"); }
            if (args[2] === "--packet-file") {
                if (validateReviewPacket(value).status !== "pass") throw new ArtifactError("invalid-packet");
                value = value.candidate;
            }
            input = Readable.from([Buffer.from(JSON.stringify(value), "utf8")]);
        }
        const receipt = await saveResultArtifact(input, args[1]);
        process.stdout.write(`${JSON.stringify(receipt)}\n`);
    } catch (error) {
        const code = error instanceof ArtifactError ? error.code : "export-failed";
        process.stderr.write(`${JSON.stringify({ kind: "diagnostic-result-error", code })}\n`);
        process.exitCode = 1;
    }
}
