import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";
import { runtimeAssets } from "../../tools/MarketingIQ.Portable/assets.mjs";

// Claude Code gap (2026-11-20): the shipped agents listed only Copilot tool names, which Claude Code does not
// resolve. One file serves both hosts: Copilot ignores unrecognized names and treats Claude's Read/Bash/Edit/
// Write/Agent as aliases; Claude ignores Copilot's names as long as some entry resolves. Every grant must
// therefore appear under both hosts' names, or one host would silently get less (or more) than the other.
const claudeNames = {
    read: ["Read"], execute: ["Bash", "PowerShell"], agent: ["Agent"], skill: ["Skill"], edit: ["Edit", "Write"],
    web: ["WebSearch"], "workiq/retrieve": ["mcp__workiq__retrieve"], "workiq/fetch": ["mcp__workiq__fetch"]
};

test("HOST-01 every shipped agent grants the same tools under Copilot and Claude Code names, never WebFetch", async () => {
    const agents = runtimeAssets.filter(path => path.endsWith(".agent.md"));
    assert.equal(agents.length, 4);
    for (const path of agents) {
        const text = await fs.readFile(join(root, ...path.split("/")), "utf8");
        const tools = JSON.parse(/^tools: (\[.*\])$/m.exec(text)[1]);
        const copilot = tools.filter(name => name in claudeNames);
        const expected = [...copilot, ...copilot.flatMap(name => claudeNames[name])].sort();
        assert.deepEqual([...tools].sort(), expected, `${path}: each grant under both names, and nothing else`);
        assert.ok(copilot.includes("read"), path);
        assert.ok(!tools.includes("WebFetch"), `${path}: WebFetch returns a summary, not page text`);
    }
});
