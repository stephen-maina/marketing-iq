// Evaluation 2026-11-20 (findings 2 and 3): non-WorkIQ connectors are meant to come through a
// client-owned profile, and the default agent is not isolated from personal skills. The web example
// is the reviewed starting point for public-web sources. Structural checks only; model use is live.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";

const examples = join(root, ".github", "skills", "marketing-iq", "examples");
const web = await fs.readFile(join(examples, "marketing-iq-web.agent.md"), "utf8");
const workiq = await fs.readFile(join(examples, "marketing-iq-workiq.agent.md"), "utf8");
const assets = await fs.readFile(join(root, "tools", "MarketingIQ.Portable", "assets.mjs"), "utf8");
const flat = text => text.replace(/\s+/g, " ");

test("WP-01 the web profile requests web tools and no WorkIQ, and ships with the plugin", () => {
    assert.match(web, /^name: marketing-iq-web$/m);
    assert.deepEqual(JSON.parse(/^tools:\s*(.+)$/m.exec(web)[1]), ["read", "execute", "agent", "skill", "edit", "web"]);
    assert.doesNotMatch(web, /workiq\//);
    assert.match(assets, /"marketing-iq-web\.agent\.md"/);
});

test("WP-02 search results are discovery only; bodies come from fetched pages through the CLI", () => {
    const text = flat(web);
    assert.match(text, /`web_search` results are generated summaries: use them only to find pages, never as evidence/);
    assert.match(text, /Admit bodies only from `web_fetch` of the page itself/);
    assert.match(text, /saved a fetched page to a file, use `cli\.js capture --adapter web --capture-file/);
    assert.match(text, /Admit a page returned inline from this session's record: `cli\.js events-capture/);
    assert.match(text, /Never copy page text into a handoff in Copilot CLI/);
    assert.match(text, /scope is one official site path/);
});

test("WP-03 the web profile keeps the WorkIQ example's shared-skill and safety rules", () => {
    for (const rule of [/host's discovered installed plugin skill/, /Do not invoke the packaged Marketing IQ agent/,
        /empty facts\s+and sections/, /Renaming a tool cannot supply missing source/, /references\\source-preferences\.md/,
        /Load only the Marketing IQ skills/]) {
        assert.match(web, rule, String(rule));
    }
    assert.doesNotMatch(web, /\.github\\skills\\|C:\\work\\/);
    assert.match(workiq, /host's discovered installed plugin skill/, "control: the WorkIQ example has the same rule");
});
