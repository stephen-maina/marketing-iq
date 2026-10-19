export class MiqError extends Error {
    constructor(public readonly code: string) { super(code); }
}

export function requireThat(value: unknown, code = "INVALID_REQUEST"): asserts value {
    if (!value) throw new MiqError(code);
}

export function object(value: unknown): Record<string, unknown> {
    requireThat(value !== null && typeof value === "object" && !Array.isArray(value));
    return value as Record<string, unknown>;
}

export function keys(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
    const result = object(value);
    requireThat(required.every(key => Object.hasOwn(result, key)) &&
        Object.keys(result).every(key => required.includes(key) || optional.includes(key)));
    return result;
}

export function text(value: unknown, maximum = 131072): string {
    requireThat(typeof value === "string" && value.trim().length > 0 && value.length <= maximum);
    requireThat(Buffer.from(value).toString("utf8") === value);
    return value;
}

export function label(value: unknown): string {
    const result = text(value, 64);
    requireThat(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result));
    return result;
}

export function positiveInt(value: unknown): number {
    requireThat(typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647);
    return value;
}

// Validate the wire before JSON.parse can discard duplicate or escaped-alias keys.
export function strictJson(bytes: Uint8Array, maximum = 131072): unknown {
    requireThat(bytes.length > 0 && bytes.length <= maximum);
    let source: string;
    try { source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
    catch { throw new MiqError("INVALID_REQUEST"); }
    let at = 0;
    const white = () => { while (at < source.length && /[ \t\r\n]/.test(source[at]!)) at++; };
    const string = (): string => {
        const start = at++;
        for (; at < source.length; at++) {
            if (source[at] === "\\") { at++; continue; }
            if (source[at] === '"') {
                let value: unknown;
                try { value = JSON.parse(source.slice(start, ++at)); }
                catch { throw new MiqError("INVALID_REQUEST"); }
                requireThat(typeof value === "string" && Buffer.from(value).toString("utf8") === value);
                return value;
            }
        }
        throw new MiqError("INVALID_REQUEST");
    };
    const visit = (depth: number, property?: string): void => {
        requireThat(depth <= 32);
        white();
        if (source[at] === '"') { string(); return; }
        if (source[at] === "{") {
            at++; white();
            const seen = new Set<string>();
            if (source[at] === "}") { at++; return; }
            for (;;) {
                requireThat(source[at] === '"');
                const key = string();
                requireThat(!seen.has(key)); seen.add(key); white();
                requireThat(source[at++] === ":"); visit(depth + 1, key); white();
                const separator = source[at++];
                if (separator === "}") return;
                requireThat(separator === ","); white();
            }
        }
        if (source[at] === "[") {
            at++; white();
            if (source[at] === "]") { at++; return; }
            for (;;) {
                visit(depth + 1); white();
                const separator = source[at++];
                if (separator === "]") return;
                requireThat(separator === ",");
            }
        }
        const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(at));
        requireThat(match);
        if (["schemaVersion", "version", "priority", "ordinal"].includes(property ?? "") && /^[0-9-]/.test(match[0]))
            requireThat(/^(?:0|[1-9]\d*)$/.test(match[0]));
        at += match[0].length;
    };
    visit(0); white(); requireThat(at === source.length);
    try { return JSON.parse(source); }
    catch { throw new MiqError("INVALID_REQUEST"); }
}

export async function stdin(maximum = 131072): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of process.stdin) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += bytes.length;
        requireThat(length <= maximum);
        chunks.push(bytes);
    }
    requireThat(length > 0);
    return Buffer.concat(chunks);
}

export function ioCode(error: unknown): string | undefined {
    return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}
