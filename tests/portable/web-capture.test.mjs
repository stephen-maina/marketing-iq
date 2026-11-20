import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { cliRelative, root, run } from "./fixtures.mjs";
import { fetchPage, pageText, webHandoff, webIndex } from "../../.github/skills/marketing-iq/scripts/portable/web.js";
import { normalizeEvidence } from "../../.github/skills/marketing-iq/scripts/portable/evidence.js";

// Claude Code gap (2026-11-20): Claude's WebFetch returns a model-written summary, so web pages had no
// verbatim route there. web-capture fetches the page in node, converts it to text by a fixed rule and
// admits only the caller's line ranges. A sha256 from the index call must match the admission fetch, so
// a page that changed between the two calls is refused rather than admitted under the wrong lines.
const page = "https://vendor.example.invalid/products/widget";
const scope = "https://vendor.example.invalid/products";
const html = `<!doctype html><html><head><title>T</title><style>p{color:red}</style><script>var x = "<p>no</p>";</script></head>
<body><nav>Home | Products</nav><!-- hidden --><h1>Widget</h1><p>FIXTURE: Widget is   in <b>beta</b>.</p>
<p>Costs &pound;5 &amp; up &mdash; see &lt;b&gt; &#8220;terms&#x201D;.</p><noscript>enable js</noscript><ul><li>One</li><li>Two</li></ul></body></html>`;
const respond = (body, { status = 200, type = "text/html; charset=utf-8", headers = {} } = {}) =>
    new Response(body, { status, headers: { "content-type": type, ...headers } });
const sha = value => createHash("sha256").update(value).digest("hex");
const code = expected => error => { assert.equal(error.code, expected); return true; };

test("WEB-01 HTML becomes text by a fixed rule: no scripts, styles or head; blocks become lines; entities decoded once", () => {
    assert.equal(pageText(html, "text/html"),
        "Home | Products\nWidget\nFIXTURE: Widget is in beta.\nCosts £5 & up — see <b> “terms”.\nOne\nTwo");
    assert.equal(pageText("<p>A paragraph wrapped\n   across source\r\nlines.</p><p>Next</p>", "text/html"),
        "A paragraph wrapped across source lines.\nNext", "source line breaks are spaces, as a browser shows them");
    assert.equal(pageText("a\r\n\r\n\r\n  b  \n", "text/plain"), "a\n\nb");
});

test("WEB-02 fetchPage follows only https redirects, records the final URL and refuses what it cannot read", async () => {
    const calls = [];
    const fetcher = async (url, init) => {
        calls.push([url, init.redirect]);
        return url === page ? respond(null, { status: 301, headers: { location: "/products/widget-v2" } }) : respond(html);
    };
    const fetched = await fetchPage(page, fetcher);
    assert.deepEqual(calls, [[page, "manual"], ["https://vendor.example.invalid/products/widget-v2", "manual"]]);
    assert.equal(fetched.finalUrl, "https://vendor.example.invalid/products/widget-v2");
    assert.equal(fetched.sha256, sha(fetched.text));
    const once = body => async () => body;
    await assert.rejects(fetchPage(page, once(respond(null, { status: 302, headers: { location: "http://vendor.example.invalid/x" } }))),
        code("INVALID_REQUEST"), "downgrade");
    await assert.rejects(fetchPage(page, async url => respond(null, { status: 302, headers: { location: `${url}x` } })),
        code("FETCH_FAILED"), "redirect loop");
    await assert.rejects(fetchPage(page, once(respond("gone", { status: 404 }))), code("FETCH_FAILED"), "404");
    await assert.rejects(fetchPage(page, once(respond("%PDF", { type: "application/pdf" }))), code("UNSUPPORTED_CONTENT"));
    await assert.rejects(fetchPage(page, once(respond("x".repeat(4194305)))), code("SOURCE_TOO_LARGE"));
    await assert.rejects(fetchPage(page, async () => { throw new TypeError("network"); }), code("FETCH_FAILED"));
    for (const url of ["http://vendor.example.invalid/", "https://127.0.0.1/", "https://[::1]/", "https://localhost/",
        "https://intranet/", "https://printer.local/", "https://user:pw@vendor.example.invalid/"])
        await assert.rejects(fetchPage(url, async () => assert.fail(`fetched ${url}`)), code("INVALID_REQUEST"), url);
});

test("WEB-03 the index and the admission agree by hash; a changed page is refused, an off-scope redirect excluded", async () => {
    const fetched = await fetchPage(page, async () => respond(html));
    const index = webIndex(fetched);
    assert.deepEqual(index.lines.map(line => line.n), [1, 2, 3, 4, 5, 6]);
    assert.equal(index.tool, "web-capture");
    const options = { adapter: "web", lines: "3-3,5-5", scopeUrl: scope, scopeKind: "container", sourceKind: "document" };
    const { handoff, gap } = webHandoff(fetched, Date.now(), index.sha256, options);
    const admitted = normalizeEvidence(handoff, "web");
    assert.equal(admitted.status, "ready");
    assert.deepEqual(admitted.evidence, [{ sourceId: page, sourceUrl: page, body: "FIXTURE: Widget is in beta.\n[...]\nOne" }]);
    assert.equal(admitted.provenance[0].tool, "web-capture");
    assert.match(gap, new RegExp(`lines 3-3,5-5 of the page text web-capture fetched \\(sha256 ${index.sha256}\\)`));
    assert.throws(() => webHandoff(fetched, Date.now(), sha("other"), options), code("SOURCE_CHANGED"));
    const moved = await fetchPage(page, async url => url === page ?
        respond(null, { status: 302, headers: { location: "https://elsewhere.example.invalid/p" } }) : respond(html));
    assert.equal(normalizeEvidence(webHandoff(moved, Date.now(), moved.sha256, options).handoff, "web").status, "blocked");
    assert.throws(() => webHandoff(fetched, Date.now(), index.sha256, { ...options, adapter: "workiq" }), code("INVALID_REQUEST"));
});

test("WEB-04 the CLI refuses unsafe or malformed requests before any network call", () => {
    for (const args of [["--url", "http://vendor.example.invalid/", "--index"], ["--url", "https://localhost/", "--index"],
        ["--adapter", "web", "--url", page, "--sha256", "abc", "--lines", "1-1", "--scope-url", scope, "--scope-kind", "container"]]) {
        const result = run(["web-capture", ...args]);
        assert.equal(result.code, 1, args.join(" "));
        assert.deepEqual(result.value, { status: "invalid", diagnostics: ["INVALID_REQUEST"] }, args.join(" "));
    }
    const help = spawnSync(process.execPath, [join(root, cliRelative), "web-capture", "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /web-capture --url <https> --index\n/);
    assert.match(help.stdout, /web-capture --adapter <id> --url <https> --sha256 <hex> --lines '<a-b\[,c-d\]>'/);
});
