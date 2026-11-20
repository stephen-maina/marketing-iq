import { createHash } from "node:crypto";
import { captureHandoff, lineIndex } from "./evidence.js";
import { MiqError, label, requireThat, text } from "./json.js";
const maxBytes = 4194304, maxRedirects = 5;
const readable = ["text/html", "application/xhtml+xml", "text/plain"];
// Public https pages only: no credentials, IP literals, localhost or single-label/.local intranet names.
function publicHttps(value) {
    const input = text(value, 4096);
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw new MiqError("INVALID_REQUEST");
    }
    const host = url.hostname.toLowerCase();
    requireThat(url.protocol === "https:" && !url.username && !url.password && !host.startsWith("[") &&
        !/^\d+(\.\d+){3}$/.test(host) && host.includes(".") && !/(^|\.)(localhost|local|internal)$/.test(host));
    url.hash = "";
    return url;
}
async function boundedBody(response) {
    const declared = Number(response.headers.get("content-length"));
    requireThat(!(declared > maxBytes), "SOURCE_TOO_LARGE");
    const reader = response.body?.getReader();
    const chunks = [];
    let length = 0;
    while (reader) {
        const { done, value } = await reader.read();
        if (done)
            break;
        length += value.length;
        if (length > maxBytes) {
            await reader.cancel();
            throw new MiqError("SOURCE_TOO_LARGE");
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
export async function fetchPage(value, fetcher = fetch) {
    let url = publicHttps(value);
    for (let hop = 0;; hop++) {
        let response;
        try {
            response = await fetcher(url.href, { redirect: "manual", signal: AbortSignal.timeout(20000),
                headers: { accept: "text/html, application/xhtml+xml, text/plain;q=0.9", "user-agent": "marketing-iq-web-capture" } });
        }
        catch (error) {
            if (error instanceof MiqError)
                throw error;
            throw new MiqError("FETCH_FAILED");
        }
        const location = response.headers.get("location");
        if ([301, 302, 303, 307, 308].includes(response.status) && location) {
            requireThat(hop < maxRedirects, "FETCH_FAILED");
            let next;
            try {
                next = new URL(location, url).href;
            }
            catch {
                throw new MiqError("FETCH_FAILED");
            }
            url = publicHttps(next);
            continue;
        }
        requireThat(response.status === 200, "FETCH_FAILED");
        const [mediaType = "", ...parameters] = (response.headers.get("content-type") ?? "").split(";").map(part => part.trim());
        requireThat(readable.includes(mediaType.toLowerCase()), "UNSUPPORTED_CONTENT");
        const bytes = await boundedBody(response);
        const charset = parameters.find(part => /^charset=/i.test(part))?.slice(8).replace(/"/g, "") || "utf-8";
        let decoded;
        try {
            decoded = new TextDecoder(charset).decode(bytes);
        }
        catch {
            decoded = new TextDecoder().decode(bytes);
        }
        const content = pageText(decoded, mediaType.toLowerCase());
        requireThat(content.trim().length > 0, "UNSUPPORTED_CONTENT");
        return { finalUrl: url.href, text: content, sha256: createHash("sha256").update(content).digest("hex"), observedMs: Date.now() };
    }
}
const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", mdash: "—",
    ndash: "–", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", copy: "©", reg: "®", trade: "™",
    pound: "£", euro: "€", middot: "·", bull: "•" };
const decode = (value) => value.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (whole, name) => {
    if (name[0] !== "#")
        return named[name.toLowerCase()] ?? whole;
    const point = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : whole;
});
const dropped = "script|style|noscript|template|svg|head|iframe|canvas|object";
const blocks = "p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|section|article|header|footer|nav|main|aside|" +
    "blockquote|pre|hr|dd|dt|dl|figure|figcaption|form|address|details|summary|caption";
// One fixed, documented conversion: HTML comments and non-content elements are removed, source whitespace
// (line breaks included) collapses to one space, block elements become line breaks, remaining tags are removed, entities are decoded once, whitespace is collapsed per
// line and blank lines are dropped, so each block is one line. Plain text keeps single blank lines.
export function pageText(source, mediaType) {
    let content = source.replace(/\r\n?/g, "\n");
    const html = mediaType !== "text/plain";
    if (html) {
        content = content.replace(/<!--[\s\S]*?-->/g, "")
            .replace(new RegExp(`<(${dropped})\\b[\\s\\S]*?<\\/\\1\\s*>`, "gi"), " ")
            // Source line breaks are whitespace in HTML; only block elements start a new line (so <pre> is flattened).
            .replace(/\s+/g, " ")
            .replace(new RegExp(`<\\/?(?:${blocks})\\b[^>]*>`, "gi"), "\n")
            .replace(/<[^>]*>/g, "");
        content = decode(content);
    }
    const lines = content.split("\n").map(line => line.replace(/[ \t\f\v ]+/g, " ").trim());
    return lines.filter((line, index) => line || !html && index > 0 && lines[index - 1]).join("\n").trim();
}
export const webIndex = (page) => ({ status: "ok", tool: "web-capture", sourceUrl: page.finalUrl,
    observedAt: new Date(page.observedMs).toISOString(), sha256: page.sha256, lines: lineIndex(page.text) });
export function webHandoff(page, nowMs, sha256, options) {
    requireThat(!["workiq", "local-file"].includes(label(options.adapter)) && /^[0-9a-f]{64}$/.test(sha256));
    requireThat(page.sha256 === sha256, "SOURCE_CHANGED");
    const handoff = captureHandoff(page.text, page.observedMs, nowMs, { ...options, sourceUrl: page.finalUrl, tool: "web-capture" });
    const gap = `${page.finalUrl}: body is lines ${options.lines} of the page text web-capture fetched (sha256 ${sha256}), ` +
        "converted from HTML by a fixed rule (layout, images and script-rendered content are not represented); " +
        "the selection is the caller's, not an independent review.";
    return { handoff, gap };
}
