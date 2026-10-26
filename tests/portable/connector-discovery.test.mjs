// Structural instruction regression only; live model routing needs a separately captured CLI evaluation.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join } from "node:path";
import { root } from "./fixtures.mjs";

const agent = await fs.readFile(join(root, ".github", "agents", "marketing-iq.agent.md"), "utf8");
const adapters = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "references", "adapters.md"), "utf8");
const shared = await fs.readFile(join(root, ".github", "skills", "marketing-iq", "SKILL.md"), "utf8");

test("CD-01 instructions discover exposed compatible tools before choosing a provider", () => {
    assert.match(agent, /# Connector selection/);
    assert.match(agent, /actual exposed tool names and schemas/);
    assert.match(agent, /explicit connector choice/);
    assert.match(agent, /exactly one compatible connector/);
    assert.doesNotMatch(agent, /api_tool\.list_resources.*(?:on|`)\s*workiq/);
});

test("CD-02 arbitrary user scope and missing-connector setup have explicit branches", () => {
    assert.match(agent, /arbitrary user-supplied SharePoint/);
    assert.match(agent, /install\/add/);
    assert.match(agent, /authenticate only/);
    assert.match(agent, /exposed\s+to the selected agent/);
    assert.match(agent, /Restart\/reload.*reinspect/s);
    assert.match(adapters, /user-supplied scope does not need a maintained route/);
    assert.match(adapters, /not exposed.*not installed/is);
    assert.match(adapters, /No connector available/);
});

test("CD-03 discovery preserves denial and the narrow explicit-agent tool profile", () => {
    const tools = JSON.parse(/^tools:\s*(.+)$/m.exec(agent)[1]);
    assert.deepEqual(tools, ["read", "execute", "agent", "workiq/retrieve", "workiq/fetch"]);
    assert.match(agent, /never switch providers after denial/);
    assert.match(agent, /Do not read connector configuration or credentials/);
    assert.match(agent, /Do not broaden this allow-list/);
    assert.match(agent, /GitHub-only.*SharePoint/s);
});

test("CD-04 shared selection and preflight agree with provider-neutral entrypoint routing", () => {
    assert.ok(/actually exposed tool names and callable schemas/.test(shared), "inspect exposed names and schemas");
    assert.ok(/unique exposed compatible connector/.test(shared), "select only an unambiguous compatible alternative");
    assert.ok(/arbitrary explicit source scope/.test(shared), "retain arbitrary explicit source scope");
    assert.match(shared, /For a selected non-WorkIQ adapter/);
    assert.doesNotMatch(shared, /api_tool\.list_resources.*on `workiq`/);
    assert.match(shared, /without inferring that a connector is uninstalled or unauthenticated/);
    assert.match(shared, /add\/install only if absent/);
    assert.match(shared, /configure\/enable only if needed, authenticate only when required/);
    assert.match(shared, /Restart\/reload only if the host requires it, then reinspect actual callable tools/);
    assert.match(shared, /conditional owner steps, not a claim that every step is necessary/);
});
