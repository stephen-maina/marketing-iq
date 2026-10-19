import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as checker from "../../.github/skills/marketing-iq/scripts/Test-ReviewPacket.mjs";
const { validateReviewPacket } = checker;

const here = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(here, "..", "..", ".github", "skills", "marketing-iq", "scripts", "Test-ReviewPacket.mjs");
const writerPath = join(dirname(scriptPath), "Save-ResultArtifact.mjs");
const runtimeRoot = mkdtempSync(join(here, "miq-hosted-preflight-"));
const sideEffectMarker = join(runtimeRoot, "should-not-exist.txt");
after(() => rmSync(runtimeRoot, { recursive: true, force: true }));

function makeRuntimeDirectory(t, label) {
    mkdirSync(runtimeRoot, { recursive: true });
    const directory = join(runtimeRoot, `${label}-${randomUUID()}`);
    mkdirSync(directory, { recursive: true });
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    return directory;
}

function sha256(value) {
    return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function makeSource(sourceId, sourceUrl, body, sourceKind = "sharepoint") {
    return {
        source: {
            sourceId,
            sourceUrl,
            sourceKind,
            evidenceKind: "document-excerpt",
            coverage: "partial-body",
            retrievedThisSession: true,
        },
        evidence: {
            sourceId,
            sourceUrl,
            body,
        },
    };
}

const launchSource1 = makeSource(
    "launch-doc-1",
    "https://example.invalid/launch-doc-1",
    "Launch plan excerpt. Team A prioritizes adoption support. The passage is bounded and does not promise identical availability in every government cloud.",
);
const launchSource2 = makeSource(
    "launch-doc-2",
    "https://example.invalid/launch-doc-2",
    "Planning note. Segment B is approved for phase one. The same note says market proof remains incomplete and requires more evidence.",
);

function makeLaunchPacket() {
    return {
        candidate: {
            useCase: "launch-decision",
            status: "draft",
            directionStatus: "proposed",
            validationMode: "session-review",
            summary: "Government IT and transformation leads are the narrower next step because the bounded excerpts support adoption support and a phase-one segment, not universal cloud parity.",
            sections: [
                { name: "product-truth", kind: "assessment", text: "The bounded excerpts support adoption-support positioning, not identical availability in every government cloud.", factIds: ["F1"] },
                { name: "planning-fit", kind: "assessment", text: "A phase-one segment is approved, which supports a conditional plan rather than a blanket launch promise.", factIds: ["F2"] },
                { name: "market-evidence", kind: "assessment", text: "Market proof remains incomplete in the supplied excerpts, so the recommendation stays conditional.", factIds: ["F2"] },
                { name: "audience-recommendation", kind: "assessment", text: "A defensible next step is a government readiness discussion for IT and transformation leads.", factIds: ["F1", "F2"] },
                { name: "proposition", kind: "assessment", text: "Position the conversation around readiness and adoption support rather than parity claims or guaranteed ROI.", factIds: ["F1"] },
                { name: "next-evidence", kind: "assessment", text: "Before saving a direction, confirm cloud-specific availability and stronger market proof.", factIds: ["F1", "F2"] },
            ],
            facts: [
                {
                    id: "F1",
                    claim: "Team A prioritizes adoption support.",
                    sourceId: launchSource1.source.sourceId,
                    sourceUrl: launchSource1.source.sourceUrl,
                    quote: "Team A prioritizes adoption support.",
                    versionId: null,
                    locator: null,
                },
                {
                    id: "F2",
                    claim: "Segment B is approved for phase one.",
                    sourceId: launchSource2.source.sourceId,
                    sourceUrl: launchSource2.source.sourceUrl,
                    quote: "Segment B is approved for phase one.",
                    versionId: null,
                    locator: null,
                },
            ],
            sources: [launchSource1.source, launchSource2.source],
            proofGaps: ["The current excerpts do not prove identical availability in every government cloud or guaranteed ROI."],
            rejectedClaims: ["Identical availability in every government cloud is unsupported by the current excerpts."],
            executionTrace: "mode:m365; context:ok; calls:sharepoint=2,email=0,meeting=0,total=2; retrieval:partial; identity:session-review; support:session-review; restrictions:reviewed; direction:proposed; review:pending",
        },
        presentationMode: "readable-json",
        readableView: [
            "Decision: keep this as a conditional government readiness discussion rather than a parity promise.",
            "",
            "What the current excerpts support: adoption support is explicitly prioritized [F1](https://example.invalid/launch-doc-1), and one segment is approved for phase one [F2](https://example.invalid/launch-doc-2).",
            "",
            "Coverage limit: these are bounded excerpts, so they do not establish identical availability in every government cloud or guaranteed ROI.",
            "",
            "Next evidence question: before saving a direction, do we have current cloud-specific availability proof and stronger market evidence?",
        ].join("\n"),
        evidence: [launchSource1.evidence, launchSource2.evidence],
        context: {
            brief: "Compare US Government and worldwide Government audiences for Microsoft 365 Copilot. Recommend a defensible next step and a proposition.",
            direction: "Proposed direction from the current brief; no accepted record is being reused.",
            operationState: "No write executed; any direction save remains a separately authorized operation.",
        },
    };
}

const fieldSource1 = makeSource(
    "field-doc-1",
    "https://example.invalid/field-doc-1",
    "Direction note. Run a government readiness discovery conversation. It remains a proposed direction and does not authorize publication.",
);
const fieldSource2 = makeSource(
    "field-doc-2",
    "https://example.invalid/field-doc-2",
    "Audience note. Government IT and transformation leads are the intended audience. No previous meeting, date, or registration link is established in this brief.",
);

function makeFieldPacket() {
    const invitation = "Hello [audience],\n\nWould a short discovery conversation on Microsoft 365 Copilot government readiness be useful for your team?\n\nBest,\n[sender]";
    const talkTrack = [
        "1. Map the current readiness questions your team is trying to answer.",
        "2. Separate what the current evidence supports from what still needs proof before publication or rollout claims.",
        "3. Identify the next follow-up material that would help your team evaluate readiness after the discussion.",
    ].join("\n");
    const followUp = "If a short discovery conversation would be useful, please share a time that works for your team.";
    return {
        candidate: {
            useCase: "field-activation",
            status: "draft",
            directionStatus: "proposed",
            validationMode: "session-review",
            summary: "Draft internal Field copy is ready for a government readiness discovery conversation, with missing logistics and publication proof still disclosed.",
            sections: [
                { name: "direction-basis", kind: "assessment", text: "The current brief supports a proposed government readiness discovery conversation for government IT and transformation leads.", factIds: ["F1", "F2"] },
                { name: "invitation", kind: "draft-copy", text: invitation, factIds: ["F1", "F2"] },
                { name: "talk-track", kind: "draft-copy", text: talkTrack, factIds: ["F1", "F2"] },
                { name: "follow-up", kind: "draft-copy", text: followUp, factIds: ["F2"] },
                { name: "publication-gaps", kind: "assessment", text: "Date, registration details, and publication permission still need proof before external use.", factIds: ["F1", "F2"] },
            ],
            facts: [
                {
                    id: "F1",
                    claim: "Run a government readiness discovery conversation.",
                    sourceId: fieldSource1.source.sourceId,
                    sourceUrl: fieldSource1.source.sourceUrl,
                    quote: "Run a government readiness discovery conversation.",
                    versionId: null,
                    locator: null,
                },
                {
                    id: "F2",
                    claim: "Government IT and transformation leads are the intended audience.",
                    sourceId: fieldSource2.source.sourceId,
                    sourceUrl: fieldSource2.source.sourceUrl,
                    quote: "Government IT and transformation leads are the intended audience.",
                    versionId: null,
                    locator: null,
                },
            ],
            sources: [fieldSource1.source, fieldSource2.source],
            proofGaps: ["No date, time, registration link, or publication approval is established in the supplied brief."],
            rejectedClaims: ["The current evidence does not prove a prior meeting, attendance, or guaranteed ROI."],
            executionTrace: "mode:m365; context:ok; calls:sharepoint=2,email=0,meeting=0,total=2; retrieval:partial; identity:session-review; support:session-review; restrictions:reviewed; direction:proposed; review:pending",
        },
        presentationMode: "readable-json",
        readableView: [
            "Direction status: proposed government readiness discovery conversation for government IT and transformation leads.",
            "",
            "Invitation",
            invitation,
            "",
            "Talk track",
            talkTrack,
            "",
            "Follow-up",
            followUp,
            "",
            "Support and gaps: the direction is supported by the current brief [F1](https://example.invalid/field-doc-1) and the audience note [F2](https://example.invalid/field-doc-2). Coverage limit: these are bounded excerpts, so logistics and publication permission still need proof.",
        ].join("\n"),
        evidence: [fieldSource1.evidence, fieldSource2.evidence],
        context: {
            brief: "Proposed direction, not approved: run a government readiness discovery conversation. Audience: government IT and transformation leads.",
            direction: "Proposed direction from the current brief; no saved direction record is being consumed.",
            operationState: "No write executed; any follow-on save remains a separately authorized operation.",
        },
    };
}

function makeBlockedPacket() {
    return {
        candidate: {
            useCase: "field-activation",
            status: "blocked",
            directionStatus: "not-supplied",
            validationMode: "session-review",
            summary: "Field drafting is blocked because no current direction was supplied or discovered.",
            sections: [],
            facts: [],
            sources: [],
            proofGaps: ["A current direction is required before invitation or follow-up copy can be drafted."],
            rejectedClaims: [],
            executionTrace: "mode:m365; context:blocked; calls:sharepoint=0,email=0,meeting=0,total=0; retrieval:none; identity:session-review; support:session-review; restrictions:reviewed; direction:not-supplied; review:not-run",
        },
        presentationMode: "json-only",
        readableView: null,
        evidence: [],
        context: {
            brief: "Draft an invitation and follow-up with no current direction supplied.",
            direction: "No direction supplied or discovered in the current review context.",
            operationState: "No write executed; no separately authorized save state exists.",
        },
    };
}

function runCli(input, extraArgs = []) {
    return spawnSync(process.execPath, [scriptPath, ...extraArgs], {
        input,
        encoding: "utf8",
        timeout: 5000,
        maxBuffer: 1024 * 1024,
    });
}

function makeReadAgentContent(statusLabel, turns) {
    const header = `Agent is ${statusLabel}.`;
    const body = turns.map((turn, index) => `[Turn ${index}]\n${turn}`).join("\n\n");
    return `${header}\n\n${body}`;
}

function readJson(result) {
    assert.equal(result.error, undefined);
    assert.notEqual(result.stdout.trim(), "");
    return JSON.parse(result.stdout);
}

function assertFailingResult(value, pathFragment, reasonFragment) {
    assert.equal(value.status, "fail");
    assert.ok(Array.isArray(value.findings));
    assert.ok(
        value.findings.some(item =>
            item.path.includes(pathFragment) && item.reason.includes(reasonFragment)),
        JSON.stringify(value),
    );
}

test("validateReviewPacket passes a Launch review packet", () => {
    const result = validateReviewPacket(makeLaunchPacket());
    assert.deepEqual(result, { status: "pass", findings: [] });
});

test("RR2-F01 documented Windows pipe preserves non-ASCII quote distinctions", {
    skip: process.platform !== "win32",
}, t => {
    const directory = makeRuntimeDirectory(t, "utf8-pipe");
    const path = join(directory, "packet.json");
    const guide = readFileSync(join(dirname(scriptPath), "..", "references", "review-preflight.md"), "utf8");
    const requiredPrelude = "$OutputEncoding = [System.Text.UTF8Encoding]::new($false)";
    const prelude = guide.includes(requiredPrelude) ? requiredPrelude : "";
    const readEncoding = guide.includes("Get-Content -Raw -Encoding utf8 review-packet.json") ? "-Encoding utf8" : "";
    const packet = clone(makeLaunchPacket());
    packet.candidate.facts[0].quote = "Le caf\u00e9 ouvre.";
    const command = `${prelude}; Get-Content -Raw ${readEncoding} '${path.replaceAll("'", "''")}' | & '${process.execPath.replaceAll("'", "''")}' '${scriptPath.replaceAll("'", "''")}'; exit $LASTEXITCODE`;
    for (const [body, expected] of [["Le caf\u00e8 ouvre.", "fail"], ["Le caf\u00e9 ouvre.", "pass"]]) {
        packet.evidence[0].body = body;
        writeFileSync(path, JSON.stringify(packet), "utf8");
        const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
            encoding: "utf8", timeout: 15000, maxBuffer: 1024 * 1024,
        });
        assert.equal(result.stderr, "");
        assert.equal(readJson(result).status, expected);
        assert.equal(result.status, expected === "pass" ? 0 : 1);
    }
    assert.equal(prelude, requiredPrelude);
    assert.equal(readEncoding, "-Encoding utf8");
});

test("validateReviewPacket passes a Field review packet with verbatim readable copy", () => {
    const packet = makeFieldPacket();
    const result = validateReviewPacket(packet);
    assert.deepEqual(result, { status: "pass", findings: [] });
    assert.ok(packet.readableView.includes(packet.candidate.sections[1].text));
    assert.ok(packet.readableView.includes(packet.candidate.sections[2].text));
    assert.ok(packet.readableView.includes(packet.candidate.sections[3].text));
    assert.equal(packet.candidate.sections[1].text.includes("[F1]"), false);
    assert.equal(packet.candidate.sections[2].text.includes("[F1]"), false);
    assert.equal(packet.candidate.sections[3].text.includes("[F1]"), false);
});

test("validateReviewPacket passes a blocked json-only packet", () => {
    const result = validateReviewPacket(makeBlockedPacket());
    assert.deepEqual(result, { status: "pass", findings: [] });
});

test("validateReviewPacket rejects malformed packet shapes and extra canonical fields", () => {
    assertFailingResult(validateReviewPacket(null), "$", "packet must be an object");

    const packet = makeLaunchPacket();
    packet.candidate.extraField = true;
    assertFailingResult(validateReviewPacket(packet), "candidate", "canonical shared-answer fields");
});

test("validateReviewPacket rejects bad fact joins and cross-source quote mismatches", () => {
    const packet = makeLaunchPacket();
    packet.candidate.facts[0].sourceUrl = launchSource2.source.sourceUrl;
    assertFailingResult(validateReviewPacket(packet), "candidate.facts[0]", "exactly match");

    const packet2 = makeLaunchPacket();
    packet2.candidate.facts[0].quote = "Segment B is approved for phase one.";
    assertFailingResult(validateReviewPacket(packet2), "candidate.facts[0].quote", "exactly in matching evidence");
});

test("RR-F03 omitted facts do not require redundant links in a concise readable view", () => {
    const packet = makeLaunchPacket();
    packet.readableView = "Internal proposal, grounded in the stated adoption priority [F1](https://example.invalid/launch-doc-1). Remaining gaps need review.";
    assert.equal(validateReviewPacket(packet).status, "pass");
    packet.readableView = "Internal proposal [F1](https://example.invalid/launch-doc-1 \"brief\").";
    assert.equal(validateReviewPacket(packet).status, "pass");
});

test("RR-F03 citation completeness and claim support remain semantic checks", () => {
    const packet = makeLaunchPacket();
    packet.readableView = "This proposal needs independent review.";
    packet.candidate.facts[0].claim = "Unsupported additional promise.";
    assert.equal(validateReviewPacket(packet).status, "pass");
});

test("RR-F03 RR-F05 wrong links fail without echoing private identity", () => {
    const packet = clone(makeLaunchPacket());
    packet.candidate.facts[0].sourceUrl = "https://example.invalid/PRIVATE-MARKER";
    packet.candidate.sources[0].sourceUrl = packet.candidate.facts[0].sourceUrl;
    packet.evidence[0].sourceUrl = packet.candidate.facts[0].sourceUrl;
    const result = validateReviewPacket(packet);
    assert.equal(result.status, "fail");
    assert.equal(JSON.stringify(result).includes("PRIVATE-MARKER"), false);
    packet.readableView = "[F999](https://example.invalid/PRIVATE-MARKER)";
    assert.equal(validateReviewPacket(packet).status, "fail");
});

test("validateReviewPacket rejects changed Field copy and wrong talk-track count", () => {
    const changedCopy = makeFieldPacket();
    changedCopy.readableView = changedCopy.readableView.replace("Would a short discovery conversation", "Would a brief discovery conversation");
    assertFailingResult(validateReviewPacket(changedCopy), "candidate.sections[1].text", "verbatim");

    const wrongCount = makeFieldPacket();
    wrongCount.candidate.sections[2].text = [
        "1. First point.",
        "2. Second point.",
    ].join("\n");
    wrongCount.readableView = wrongCount.readableView.replace(
        makeFieldPacket().candidate.sections[2].text,
        wrongCount.candidate.sections[2].text,
    );
    assertFailingResult(validateReviewPacket(wrongCount), "candidate.sections[2].text", "exactly three numbered items");
});

test("validateReviewPacket rejects evidence and context bounds", () => {
    const packet = makeLaunchPacket();
    packet.evidence = [
        ...packet.evidence,
        makeSource("launch-doc-3", "https://example.invalid/launch-doc-3", "Third bounded body.").evidence,
        makeSource("launch-doc-4", "https://example.invalid/launch-doc-4", "Fourth bounded body.").evidence,
    ];
    assertFailingResult(validateReviewPacket(packet), "evidence", "at most 3");

    const packet2 = makeLaunchPacket();
    packet2.context.operationState = "";
    assertFailingResult(validateReviewPacket(packet2), "context.operationState", "non-empty string");
});

test("validateReviewPacket treats hostile strings as inert data with no side effects", () => {
    writeFileSync(sideEffectMarker, "writable control");
    assert.equal(readFileSync(sideEffectMarker, "utf8"), "writable control");
    rmSync(sideEffectMarker, { force: true });
    const packet = makeLaunchPacket();
    packet.evidence[0].body = [
        `Team A prioritizes adoption support. require('node:fs').writeFileSync(${JSON.stringify(sideEffectMarker)}, 'pwned');`,
        `$(New-Item -ItemType File -Path ${sideEffectMarker})`,
    ].join("\n");
    const result = validateReviewPacket(packet);
    assert.equal(result.status, "pass");
    assert.equal(existsSync(sideEffectMarker), false);

    const second = validateReviewPacket(packet);
    assert.equal(second.status, "pass");
    assert.equal(existsSync(sideEffectMarker), false);
});

for (const [name, mutate] of [
    ["null sections", p => { p.candidate.sections = null; }],
    ["null facts", p => { p.candidate.facts = null; }],
    ["unknown role", p => { p.candidate.useCase = "unknown"; }],
    ["prototype role", p => { p.candidate.useCase = "constructor"; }],
    ["object role", p => { p.candidate.useCase = { toString: null }; }],
    ["missing sections", p => { delete p.candidate.sections; }],
    ["null section", p => { p.candidate.sections[0] = null; }],
    ["short Field", p => { p.candidate.useCase = "field-activation"; p.candidate.sections = []; }],
    ["non-string body", p => { p.evidence[0].body = 5; }],
    ["wrong validation mode", p => { p.candidate.validationMode = "automated"; }],
]) {
    test(`RR-F01 RR-F02 structured rejection: ${name}`, () => {
        const packet = clone(makeLaunchPacket());
        mutate(packet);
        assert.equal(validateReviewPacket(packet).status, "fail");
        const result = runCli(JSON.stringify(packet));
        assert.equal(result.status, 1);
        assert.equal(result.stderr, "");
        assert.equal(readJson(result).status, "fail");
    });
}

test("RR-F04 context is typed data, not a keyword password", () => {
    const packet = makeLaunchPacket();
    packet.context.direction = "None established in this session.";
    packet.context.operationState = "Nothing was saved; no record was created.";
    assert.equal(validateReviewPacket(packet).status, "pass");
});

test("RR-F08 RR-F09 semantic numbering and section sets preserve valid neighbors", () => {
    const packet = makeFieldPacket();
    const original = packet.candidate.sections[2].text;
    const changed = original.replace(/^([123])\./gm, "$1)");
    packet.candidate.sections[2].text = changed;
    packet.readableView = packet.readableView.replace(original, changed);
    packet.candidate.sections.reverse();
    assert.equal(validateReviewPacket(packet).status, "pass");
    packet.candidate.sections[0].name = "invitation";
    assert.equal(validateReviewPacket(packet).status, "fail");
});

test("RR-F10 caps admitted sources and json-only excludes readable copy", () => {
    const packet = makeLaunchPacket();
    packet.candidate.sources = [...packet.candidate.sources,
        makeSource("third", "https://example.invalid/3", "third").source,
        makeSource("fourth", "https://example.invalid/4", "fourth").source];
    assert.equal(validateReviewPacket(packet).status, "fail");
    const blocked = makeBlockedPacket();
    blocked.readableView = "Unexpected copy";
    assert.equal(validateReviewPacket(blocked).status, "fail");
});

test("RR-F06 RR-F07 native turns support Windows lines and follow-up response envelopes", t => {
    const directory = makeRuntimeDirectory(t, "turn-neighbors");
    const path = join(directory, "events.jsonl");
    const packet = JSON.stringify(makeLaunchPacket());
    for (const content of [
        `Agent is idle.\r\n\r\n[Turn 0]\r\n${packet}`,
        `Agent is idle.\n\n[Turn 0]\n${packet}\n[Turn 1]\n${packet}`,
        `Agent is idle.\n\n[Turn 0]\n[Message]\nReview once.\n\n[Response]\n${packet}`,
    ]) {
        writeFileSync(path, [
            JSON.stringify({ type: "tool.execution_start", data: { toolCallId: "selected", toolName: "read_agent" } }),
            JSON.stringify({ type: "tool.execution_complete", data: { toolCallId: "selected", success: true, result: { content } } }),
        ].join("\n"));
        const result = runCli("", ["--events", path, "--call", "selected", "--turn", "0"]);
        assert.equal(result.status, 0, result.stdout);
        assert.equal(result.stderr, "");
        assert.equal(readJson(result).status, "pass");
    }
});

test("RR-F11 oversized native lines fail with fixed diagnostics", t => {
    const directory = makeRuntimeDirectory(t, "oversize");
    const path = join(directory, "events.jsonl");
    writeFileSync(path, JSON.stringify({ padding: "x".repeat(8 * 1024 * 1024 + 1) }));
    const result = runCli("", ["--events", path, "--call", "selected"]);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(readJson(result).findings[0].reason, /size bound/);
});

test("CLI stdin returns pass for a valid packet and never echoes the packet", () => {
    const packet = makeFieldPacket();
    const raw = JSON.stringify(packet);
    const result = runCli(raw);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const parsed = readJson(result);
    assert.deepEqual(parsed, { status: "pass", findings: [] });
    assert.equal(result.stdout.includes(packet.candidate.summary), false);
});

test("CLI stdin rejects empty stdin and invalid arguments explicitly", () => {
    const noInput = runCli("");
    assert.notEqual(noInput.status, 0);
    assertFailingResult(readJson(noInput), "input", "No stdin packet was supplied");

    const invalidArgs = runCli("", ["--packet", "fixture.json"]);
    assert.notEqual(invalidArgs.status, 0);
    assertFailingResult(readJson(invalidArgs), "input.cli", "Invalid arguments");
});

test("CLI native route requires an absolute events.jsonl path", () => {
    const result = runCli("", ["--events", "events.jsonl", "--call", "call-selected"]);
    assert.notEqual(result.status, 0);
    assertFailingResult(readJson(result), "input.events", "must be absolute");
});

test("CLI native events route selects the exact successful tool completion", t => {
    const directory = makeRuntimeDirectory(t, "native-pass");
    const eventsPath = join(directory, "events.jsonl");
    const selectedPacket = JSON.stringify(makeLaunchPacket());
    const otherPacket = JSON.stringify(makeBlockedPacket());
    writeFileSync(eventsPath, [
        JSON.stringify({
            id: "evt-1",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-other",
                success: true,
                result: { content: otherPacket },
            },
        }),
        JSON.stringify({
            id: "evt-2",
            timestamp: "2026-09-20T10:01:00.000Z",
            parentId: "evt-1",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: selectedPacket },
            },
        }),
    ].join("\n"));

    const result = runCli("", ["--events", eventsPath, "--call", "call-selected"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(result), { status: "pass", findings: [] });
    assert.equal(result.stdout.includes(otherPacket), false);
});

test("CLI native read_agent route extracts one exact turn from idle/completed content", t => {
    const directory = makeRuntimeDirectory(t, "native-read-agent-pass");
    const eventsPath = join(directory, "events.jsonl");
    const turnZero = JSON.stringify(makeBlockedPacket());
    const turnOnePacket = makeFieldPacket();
    turnOnePacket.candidate.sections[4].text = `Date, registration details, and publication permission still need proof before external use. The literal string [Turn 2] is inert inside JSON text.`;
    turnOnePacket.readableView = turnOnePacket.readableView.replace(
        "Date, registration details, and publication permission still need proof before external use.",
        turnOnePacket.candidate.sections[4].text,
    );
    const turnOne = JSON.stringify(turnOnePacket);
    writeFileSync(eventsPath, [
        JSON.stringify({
            id: "evt-start",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: {
                toolCallId: "call-read-agent",
                toolName: "read_agent",
            },
        }),
        JSON.stringify({
            id: "evt-complete",
            timestamp: "2026-09-20T10:00:05.000Z",
            parentId: "evt-start",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-read-agent",
                success: true,
                result: {
                    content: makeReadAgentContent("idle and waiting for messages", [turnZero, turnOne]),
                    detailedContent: "unused",
                },
            },
        }),
    ].join("\n"));

    const result = runCli("", ["--events", eventsPath, "--call", "call-read-agent", "--turn", "1"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(result), { status: "pass", findings: [] });
});

test("CLI native route rejects missing, duplicate, failed, and malformed selected captures", t => {
    const root = makeRuntimeDirectory(t, "native-fail");
    const validPacket = JSON.stringify(makeLaunchPacket());

    const missingDirectory = join(root, "missing");
    mkdirSync(missingDirectory, { recursive: true });
    const missingPath = join(missingDirectory, "events.jsonl");
    writeFileSync(missingPath, JSON.stringify({
        id: "evt-a",
        timestamp: "2026-09-20T10:00:00.000Z",
        parentId: null,
        type: "tool.execution_complete",
        data: { toolCallId: "call-other", success: true, result: { content: validPacket } },
    }));
    const missing = runCli("", ["--events", missingPath, "--call", "call-selected"]);
    assert.notEqual(missing.status, 0);
    assertFailingResult(readJson(missing), "input.events", "No matching tool.execution_complete event");

    const duplicateDirectory = join(root, "duplicate");
    mkdirSync(duplicateDirectory, { recursive: true });
    const duplicatePath = join(duplicateDirectory, "events.jsonl");
    writeFileSync(duplicatePath, [
        JSON.stringify({
            id: "evt-b",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_complete",
            data: { toolCallId: "call-selected", success: true, result: { content: validPacket } },
        }),
        JSON.stringify({
            id: "evt-c",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-b",
            type: "tool.execution_complete",
            data: { toolCallId: "call-selected", success: true, result: { content: validPacket } },
        }),
    ].join("\n"));
    const duplicate = runCli("", ["--events", duplicatePath, "--call", "call-selected"]);
    assert.notEqual(duplicate.status, 0);
    assertFailingResult(readJson(duplicate), "input.events", "Multiple matching tool.execution_complete events");

    const failedDirectory = join(root, "failed");
    mkdirSync(failedDirectory, { recursive: true });
    const failedPath = join(failedDirectory, "events.jsonl");
    writeFileSync(failedPath, JSON.stringify({
        id: "evt-d",
        timestamp: "2026-09-20T10:00:02.000Z",
        parentId: null,
        type: "tool.execution_complete",
        data: { toolCallId: "call-selected", success: false, result: { content: validPacket } },
    }));
    const failed = runCli("", ["--events", failedPath, "--call", "call-selected"]);
    assert.notEqual(failed.status, 0);
    assertFailingResult(readJson(failed), "input.events", "selected tool execution did not succeed");

    const malformedDirectory = join(root, "malformed");
    mkdirSync(malformedDirectory, { recursive: true });
    const malformedPath = join(malformedDirectory, "events.jsonl");
    writeFileSync(malformedPath, JSON.stringify({
        id: "evt-e",
        timestamp: "2026-09-20T10:00:03.000Z",
        parentId: null,
        type: "tool.execution_complete",
        data: { toolCallId: "call-selected", success: true, result: { content: "{not-json" } },
    }));
    const malformed = runCli("", ["--events", malformedPath, "--call", "call-selected"]);
    assert.notEqual(malformed.status, 0);
    assertFailingResult(readJson(malformed), "input.events[evt-e]", "Selected tool result content was not valid JSON");
});

test("CLI native read_agent route rejects wrong tool, running header, missing or duplicate turns, and malformed turn JSON", t => {
    const root = makeRuntimeDirectory(t, "native-read-agent-fail");
    const validPacket = JSON.stringify(makeLaunchPacket());

    const wrongToolDirectory = join(root, "wrong-tool");
    mkdirSync(wrongToolDirectory, { recursive: true });
    const wrongToolPath = join(wrongToolDirectory, "events.jsonl");
    writeFileSync(wrongToolPath, [
        JSON.stringify({
            id: "evt-start-a",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "task" },
        }),
        JSON.stringify({
            id: "evt-complete-a",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-a",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: makeReadAgentContent("idle and waiting for messages", [validPacket]) },
            },
        }),
    ].join("\n"));
    const wrongTool = runCli("", ["--events", wrongToolPath, "--call", "call-selected", "--turn", "0"]);
    assert.notEqual(wrongTool.status, 0);
    assertFailingResult(readJson(wrongTool), "input.events", "matching tool.execution_start");

    const runningDirectory = join(root, "running");
    mkdirSync(runningDirectory, { recursive: true });
    const runningPath = join(runningDirectory, "events.jsonl");
    writeFileSync(runningPath, [
        JSON.stringify({
            id: "evt-start-b",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "read_agent" },
        }),
        JSON.stringify({
            id: "evt-complete-b",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-b",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: "Agent is running.\n\n[Turn 0]\n" + validPacket },
            },
        }),
    ].join("\n"));
    const running = runCli("", ["--events", runningPath, "--call", "call-selected", "--turn", "0"]);
    assert.notEqual(running.status, 0);
    assertFailingResult(readJson(running), "input.events[evt-complete-b]", "idle or completed");

    const missingTurnDirectory = join(root, "missing-turn");
    mkdirSync(missingTurnDirectory, { recursive: true });
    const missingTurnPath = join(missingTurnDirectory, "events.jsonl");
    writeFileSync(missingTurnPath, [
        JSON.stringify({
            id: "evt-start-c",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "read_agent" },
        }),
        JSON.stringify({
            id: "evt-complete-c",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-c",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: makeReadAgentContent("completed successfully", [validPacket]) },
            },
        }),
    ].join("\n"));
    const missingTurn = runCli("", ["--events", missingTurnPath, "--call", "call-selected", "--turn", "1"]);
    assert.notEqual(missingTurn.status, 0);
    assertFailingResult(readJson(missingTurn), "input.events[evt-complete-c]", "No exact [Turn 1] block");

    const duplicateTurnDirectory = join(root, "duplicate-turn");
    mkdirSync(duplicateTurnDirectory, { recursive: true });
    const duplicateTurnPath = join(duplicateTurnDirectory, "events.jsonl");
    writeFileSync(duplicateTurnPath, [
        JSON.stringify({
            id: "evt-start-d",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "read_agent" },
        }),
        JSON.stringify({
            id: "evt-complete-d",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-d",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: "Agent is idle and waiting for messages.\n\n[Turn 0]\n" + validPacket + "\n\n[Turn 0]\n" + validPacket },
            },
        }),
    ].join("\n"));
    const duplicateTurn = runCli("", ["--events", duplicateTurnPath, "--call", "call-selected", "--turn", "0"]);
    assert.notEqual(duplicateTurn.status, 0);
    assertFailingResult(readJson(duplicateTurn), "input.events[evt-complete-d]", "Multiple exact [Turn 0] blocks");

    const malformedTurnDirectory = join(root, "malformed-turn");
    mkdirSync(malformedTurnDirectory, { recursive: true });
    const malformedTurnPath = join(malformedTurnDirectory, "events.jsonl");
    writeFileSync(malformedTurnPath, [
        JSON.stringify({
            id: "evt-start-e",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "read_agent" },
        }),
        JSON.stringify({
            id: "evt-complete-e",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-e",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: { content: "Agent is idle and waiting for messages.\n\n[Turn 0]\n{not-json" },
            },
        }),
    ].join("\n"));
    const malformedTurn = runCli("", ["--events", malformedTurnPath, "--call", "call-selected", "--turn", "0"]);
    assert.notEqual(malformedTurn.status, 0);
    assertFailingResult(readJson(malformedTurn), "input.events[evt-complete-e].turn[0]", "was not valid JSON");
});

test("CLI native read_agent route fails closed on truncated overflow previews", t => {
    const directory = makeRuntimeDirectory(t, "native-read-agent-overflow");
    const eventsPath = join(directory, "events.jsonl");
    const previewPacket = JSON.stringify(makeLaunchPacket());
    writeFileSync(eventsPath, [
        JSON.stringify({
            id: "evt-start-overflow",
            timestamp: "2026-09-20T10:00:00.000Z",
            parentId: null,
            type: "tool.execution_start",
            data: { toolCallId: "call-selected", toolName: "read_agent" },
        }),
        JSON.stringify({
            id: "evt-complete-overflow",
            timestamp: "2026-09-20T10:00:01.000Z",
            parentId: "evt-start-overflow",
            type: "tool.execution_complete",
            data: {
                toolCallId: "call-selected",
                success: true,
                result: {
                    content: [
                        "Output too large to display inline. Saved to: C:\\host-temp\\capture.txt",
                        "",
                        "Preview:",
                        "Agent is idle and waiting for messages.",
                        "",
                        "[Turn 0]",
                        previewPacket.slice(0, 80),
                    ].join("\n"),
                },
            },
        }),
    ].join("\n"));

    const result = runCli("", ["--events", eventsPath, "--call", "call-selected", "--turn", "0"]);
    assert.notEqual(result.status, 0);
    assertFailingResult(readJson(result), "input.events[evt-complete-overflow]", "truncated host preview");
});

test("CLI native route uses only the selected event and keeps hostile packet data inert", t => {
    rmSync(sideEffectMarker, { force: true });
    const directory = makeRuntimeDirectory(t, "native-hostile");
    const eventsPath = join(directory, "events.jsonl");
    const hostile = makeLaunchPacket();
    hostile.evidence[0].body = `Team A prioritizes adoption support. require('node:fs').writeFileSync(${JSON.stringify(sideEffectMarker)}, 'x');`;
    const hostileRaw = JSON.stringify(hostile);
    writeFileSync(eventsPath, JSON.stringify({
        id: "evt-z",
        timestamp: "2026-09-20T10:00:03.000Z",
        parentId: null,
        type: "tool.execution_complete",
        data: { toolCallId: "call-selected", success: true, result: { content: hostileRaw } },
    }));

    const result = runCli("", ["--events", eventsPath, "--call", "call-selected"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJson(result), { status: "pass", findings: [] });
    assert.equal(existsSync(sideEffectMarker), false);
});

for (const mode of ["readable-json", "readable-artifact"]) {
    test(`${mode} requires real readable copy and identical Field draft text`, () => {
        const packet = makeFieldPacket();
        packet.presentationMode = mode;
        assert.equal(validateReviewPacket(packet).status, "pass");
        packet.readableView = null;
        assertFailingResult(validateReviewPacket(packet), "readableView", "non-empty");
        packet.readableView = makeFieldPacket().readableView.replace("Would a short", "Would a brief");
        assertFailingResult(validateReviewPacket(packet), "candidate.sections[1].text", "verbatim");
        const launch = makeLaunchPacket();
        launch.presentationMode = mode;
        assert.equal(validateReviewPacket(launch).status, "pass");
    });
}

test("json-only draft still omits readable view but requires real evidence", () => {
    const packet = makeFieldPacket();
    packet.presentationMode = "json-only";
    packet.readableView = null;
    assert.equal(validateReviewPacket(packet).status, "pass");
    packet.evidence = [];
    assertFailingResult(validateReviewPacket(packet), "candidate.facts[0]", "evidence entry");
});

test("structural-only validation checks joins, not evidence occurrence or trace review claims", () => {
    const packet = makeLaunchPacket();
    packet.candidate.facts[0].quote = "Not in the supplied body.";
    packet.candidate.executionTrace = "review:pass";
    assert.deepEqual(checker.validateCandidateStructure(packet.candidate), { status: "pass", findings: [] });
    assertFailingResult(validateReviewPacket(packet), "candidate.facts[0].quote", "exactly in matching evidence");
    packet.candidate.facts[0].sourceUrl = "https://example.invalid/mismatch";
    assert.equal(checker.validateCandidateStructure(packet.candidate).status, "fail");
});

function runWriter(input, directory, extraArgs = []) {
    return spawnSync(process.execPath, [writerPath, "--directory", directory, ...extraArgs], {
        input, encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024,
    });
}

function assertWriterFailure(result, code) {
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.deepEqual(JSON.parse(result.stderr), { kind: "diagnostic-result-error", code });
    assert.equal(result.stderr.includes("PRIVATE-MARKER"), false);
}

test("artifact CLI saves exact canonical UTF-8 bytes, only canonical fields, and a hash receipt", t => {
    const directory = makeRuntimeDirectory(t, "artifact-roundtrip");
    for (const packet of [makeLaunchPacket(), makeFieldPacket(), makeBlockedPacket()]) {
        const candidate = packet.candidate;
        candidate.summary = "Caf\u00e9 \u2014 \u653f\u5e9c \ud83c\udf0d PRIVATE-MARKER";
        candidate.executionTrace = "review:not-run";
        const result = runWriter(JSON.stringify(candidate), directory);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stderr, "");
        const receipt = readJson(result);
        assert.deepEqual(Object.keys(receipt).sort(), ["kind", "path", "sha256"]);
        assert.equal(receipt.kind, "diagnostic-result");
        assert.equal(dirname(receipt.path), directory);
        assert.match(basename(receipt.path), new RegExp(`^marketing-iq-${candidate.useCase}-[0-9a-f-]{36}\\.json$`));
        const bytes = readFileSync(receipt.path);
        assert.deepEqual(bytes, Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`, "utf8"));
        assert.deepEqual(JSON.parse(bytes.toString("utf8")), candidate);
        assert.equal(Object.keys(JSON.parse(bytes)).length, 11);
        assert.equal(receipt.sha256, sha256(bytes));
        assert.equal(result.stdout.includes("PRIVATE-MARKER"), false);
        assert.equal(lstatSync(receipt.path).isFile(), true);
        if (process.platform !== "win32") assert.equal(lstatSync(receipt.path).mode & 0o777, 0o600);
    }
});

for (const [label, mutate] of [
    ["review packet wrapper", () => makeLaunchPacket()],
    ["extra field", c => ({ ...c, evidence: "PRIVATE-MARKER" })],
    ["wrong section type", c => { c.sections[0].kind = "draft-copy"; return c; }],
    ["invalid fact join", c => { c.facts[0].sourceId = "PRIVATE-MARKER"; return c; }],
    ["invalid section join", c => { c.sections[0].factIds = ["F999"]; return c; }],
    ["null sections", c => { c.sections = null; return c; }],
    ["path-shaped useCase", c => { c.useCase = "..\\PRIVATE-MARKER"; return c; }],
    ["null candidate", () => null],
]) {
    test(`artifact CLI rejects ${label} without writing or echoing input`, t => {
        const directory = makeRuntimeDirectory(t, "artifact-invalid");
        assertWriterFailure(runWriter(JSON.stringify(mutate(clone(makeLaunchPacket().candidate))), directory), "invalid-candidate");
        assert.deepEqual(readdirSync(directory), []);
    });
}

test("artifact CLI rejects malformed, empty, oversized and invalid UTF-8 input", t => {
    const directory = makeRuntimeDirectory(t, "artifact-input");
    for (const [input, code] of [
        ['{"PRIVATE-MARKER":', "invalid-json"],
        ["", "invalid-json"],
        [Buffer.alloc(262145, 0x78), "input-too-large"],
        [Buffer.from([0x22, 0xc3, 0x28, 0x22]), "invalid-utf8"],
    ]) {
        assertWriterFailure(runWriter(input, directory), code);
        assert.deepEqual(readdirSync(directory), []);
    }
    const raw = JSON.stringify(makeBlockedPacket().candidate);
    const padded = raw + " ".repeat(262144 - Buffer.byteLength(raw));
    assert.equal(runWriter(padded, directory).status, 0);
});

test("artifact CLI permits inert path-shaped content but generates unique filenames and preserves existing files", t => {
    const directory = makeRuntimeDirectory(t, "artifact-unique");
    const candidate = clone(makeLaunchPacket().candidate);
    candidate.summary = "..\\PRIVATE-MARKER\\outside.json $(Remove-Item *)";
    candidate.sources[0].sourceId = "..\\PRIVATE-MARKER";
    candidate.facts[0].sourceId = candidate.sources[0].sourceId;
    const existing = join(directory, "existing.json");
    writeFileSync(existing, "unchanged");
    const one = readJson(runWriter(JSON.stringify(candidate), directory));
    const two = readJson(runWriter(JSON.stringify(candidate), directory));
    assert.notEqual(one.path, two.path);
    assert.equal(basename(one.path).includes("PRIVATE-MARKER"), false);
    assert.deepEqual(readFileSync(one.path), readFileSync(two.path));
    assert.equal(readFileSync(existing, "utf8"), "unchanged");
    assert.equal(readdirSync(directory).length, 3);
});

test("artifact CLI rejects unsafe destinations and caller filenames without side effects", t => {
    const directory = makeRuntimeDirectory(t, "artifact-destination");
    const raw = JSON.stringify(makeBlockedPacket().candidate);
    const file = join(directory, "not-directory");
    writeFileSync(file, "unchanged");
    for (const path of ["relative", join(directory, "missing"), file]) {
        assertWriterFailure(runWriter(raw, path), "unsafe-directory");
    }
    for (const name of ["launch-decisions", "accepted", "archive", "knowledge"]) {
        const path = join(directory, name);
        mkdirSync(path);
        assertWriterFailure(runWriter(raw, path), "unsafe-directory");
        assert.deepEqual(readdirSync(path), []);
    }
    assertWriterFailure(runWriter(raw, directory, ["--filename", "PRIVATE-MARKER.json"]), "invalid-arguments");
    assert.equal(existsSync(join(directory, "missing")), false);
    assert.equal(readFileSync(file, "utf8"), "unchanged");
    if (process.platform === "win32") {
        for (const path of ["\\root-relative", "\\\\?\\C:\\PRIVATE-MARKER", `${directory}:stream`, `${directory}.`]) {
            assertWriterFailure(runWriter(raw, path), "unsafe-directory");
        }
    }
});

test("artifact CLI rejects symlink or junction destinations and ancestors without outside writes", t => {
    const directory = makeRuntimeDirectory(t, "artifact-links");
    const outside = join(directory, "outside");
    const nested = join(outside, "nested");
    mkdirSync(nested, { recursive: true });
    const link = join(directory, "link");
    try {
        symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
        if (["EPERM", "ENOSYS", "ENOTSUP"].includes(error.code)) {
            t.skip(`Directory links unavailable: ${error.code}`);
            return;
        }
        throw error;
    }
    const raw = JSON.stringify(makeBlockedPacket().candidate);
    for (const path of [link, join(link, "nested")]) assertWriterFailure(runWriter(raw, path), "unsafe-directory");
    assert.deepEqual(readdirSync(outside), ["nested"]);
    assert.deepEqual(readdirSync(nested), []);
});

test("artifact exclusive create collision never overwrites or deletes the existing file", async t => {
    const { saveResultArtifact } = await import("../../.github/skills/marketing-iq/scripts/Save-ResultArtifact.mjs");
    const directory = makeRuntimeDirectory(t, "artifact-collision");
    const uuid = "11111111-1111-4111-8111-111111111111";
    const path = join(directory, `marketing-iq-field-activation-${uuid}.json`);
    writeFileSync(path, "unchanged");
    t.mock.method(crypto, "randomUUID", () => uuid);
    await assert.rejects(saveResultArtifact([Buffer.from(JSON.stringify(makeBlockedPacket().candidate))], directory),
        error => error.code === "save-failed");
    assert.equal(readFileSync(path, "utf8"), "unchanged");
});

for (const failure of ["write", "sync", "close", "verify", "cleanup"]) {
    test(`artifact ${failure} failure has no receipt and cleans only its own file or reports cleanup failure`, async t => {
        const { saveResultArtifact } = await import("../../.github/skills/marketing-iq/scripts/Save-ResultArtifact.mjs");
        const directory = makeRuntimeDirectory(t, "artifact-failure");
        const existing = join(directory, "existing.json");
        writeFileSync(existing, "unchanged");
        const originalOpen = fs.open;
        t.mock.method(fs, "open", async (...args) => {
            const handle = await originalOpen(...args);
            if (args[1] === "wx") {
                if (failure === "write" || failure === "cleanup") t.mock.method(handle, "writeFile", async () => { throw new Error("PRIVATE-MARKER"); });
                if (failure === "sync") t.mock.method(handle, "sync", async () => { throw new Error("PRIVATE-MARKER"); });
                if (failure === "close") {
                    const close = handle.close.bind(handle);
                    t.mock.method(handle, "close", async () => { await close(); throw new Error("PRIVATE-MARKER"); });
                }
            } else if (failure === "verify") {
                t.mock.method(handle, "read", async () => ({ bytesRead: 0 }));
            }
            return handle;
        });
        if (failure === "cleanup") t.mock.method(fs, "unlink", async () => { throw new Error("PRIVATE-MARKER"); });
        await assert.rejects(saveResultArtifact([Buffer.from(JSON.stringify(makeBlockedPacket().candidate))], directory),
            error => error.code === (failure === "cleanup" ? "cleanup-failed" : "save-failed") && !error.message.includes("PRIVATE-MARKER"));
        assert.equal(readFileSync(existing, "utf8"), "unchanged");
        assert.equal(readdirSync(directory).length, failure === "cleanup" ? 2 : 1);
    });
}

test("artifact input stream errors are sanitized and never create output", async t => {
    const { saveResultArtifact } = await import("../../.github/skills/marketing-iq/scripts/Save-ResultArtifact.mjs");
    const directory = makeRuntimeDirectory(t, "artifact-stream");
    async function* failingInput() {
        yield Buffer.from("{");
        throw new Error("PRIVATE-MARKER");
    }
    await assert.rejects(saveResultArtifact(failingInput(), directory),
        error => error.code === "input-unavailable" && !error.message.includes("PRIVATE-MARKER"));
    assert.deepEqual(readdirSync(directory), []);
});

test("artifact cleanup refuses to delete a different file substituted after creation", async t => {
    const { saveResultArtifact } = await import("../../.github/skills/marketing-iq/scripts/Save-ResultArtifact.mjs");
    const directory = makeRuntimeDirectory(t, "artifact-replaced");
    const replacement = join(directory, "replacement");
    writeFileSync(replacement, "not owned by this invocation");
    const originalOpen = fs.open;
    let createdPath;
    t.mock.method(fs, "open", async (...args) => {
        const handle = await originalOpen(...args);
        if (args[1] === "wx") {
            createdPath = args[0];
            const close = handle.close.bind(handle);
            let replaced = false;
            t.mock.method(handle, "close", async () => {
                await close();
                if (!replaced) {
                    replaced = true;
                    await fs.unlink(createdPath);
                    await fs.rename(replacement, createdPath);
                }
                throw new Error("PRIVATE-MARKER");
            });
        }
        return handle;
    });
    await assert.rejects(saveResultArtifact([Buffer.from(JSON.stringify(makeBlockedPacket().candidate))], directory),
        error => error.code === "cleanup-failed");
    assert.equal(readFileSync(createdPath, "utf8"), "not owned by this invocation");
});
