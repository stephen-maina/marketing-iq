// Negative-control harness for the History check (Goldfish). It builds prompts from the SHIPPED
// Goldfish rules block plus synthetic inputs, so a carry-over is guaranteed to exist in C1.
// Synthetic data only; no real sources or user history.
// Usage: node tests/live/goldfish-control.mjs write <outDir>   -> one <case>.prompt.txt per case
//        node tests/live/goldfish-control.mjs score <outDir>   -> scores <case>.r<N>.txt replies
import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const shippedPath = join(here, "..", "..", "plugins", "marketing-iq", "skills", "marketing-iq", "references", "independent-review.md");

export function goldfishBlock(referenceText) {
    const section = referenceText.split("### Goldfish rules (verbatim)")[1];
    if (!section) throw new Error("Goldfish rules block not found");
    return section.split("```text")[1].split("```")[0].trim();
}

const request = "Assess launch readiness for the fictional Harbor transit-data project and recommend an audience and a proposition. Leave the result unsaved.";
const evidence = [
    "F1 (synthetic-doc-1): \"Transit operations leaders need one shared view of service disruptions.\"",
    "F2 (synthetic-doc-2): \"City IT teams are the integration owners for operational data.\""
].join("\n");

function candidate(audienceText, propositionText, directionStatus = "proposed") {
    return JSON.stringify({
        useCase: "launch-decision", status: "draft", directionStatus, validationMode: "session-review",
        summary: "Insufficient evidence for launch readiness; a proposed audience and proposition follow.",
        sections: [
            { name: "product-truth", kind: "assessment", text: "No capability or test evidence was admitted.", factIds: [] },
            { name: "audience-recommendation", kind: "assessment", text: audienceText, factIds: ["F1", "F2"] },
            { name: "proposition", kind: "assessment", text: propositionText, factIds: ["F1"] }
        ],
        facts: [
            { id: "F1", claim: "Transit operations leaders need one shared view of service disruptions.", sourceId: "synthetic-doc-1" },
            { id: "F2", claim: "City IT teams are the integration owners for operational data.", sourceId: "synthetic-doc-2" }
        ]
    }, null, 2);
}

const cases = [
    { id: "C1-mislabelled-carry-over", expect: "flags", candidate: candidate(
        "Run an Urban Ops Bootcamp in-person event series for university facilities managers.\nBasis: current-request",
        "Hands-on bootcamp: map one disruption workflow end to end.\nBasis: current-request") },
    { id: "C2-clean", expect: "pass", candidate: candidate(
        "Propose transit operations leaders, with city IT teams as integration owners.\nBasis: evidence F1, F2",
        "One shared view of service disruptions, framed as a problem to test, not a promised outcome.\nBasis: evidence F1") },
    { id: "C3-history-basis", expect: "flags", candidate: candidate(
        "Propose transit operations leaders, with city IT teams as integration owners.\nBasis: accepted-record",
        "One shared view of service disruptions.\nBasis: evidence F1", "accepted-record") },
    // Trial A2 shape: the request asks for an audience but names none; the label still claims it.
    { id: "C4-asked-not-named", expect: "flags", candidate: candidate(
        "Propose transit operations leaders, with city IT teams as integration owners.\nBasis: current-request; evidence F1, F2",
        "One shared view of service disruptions, framed as a problem to test, not a promised outcome.\nBasis: evidence F1") }
];

export function buildCases(referenceText) {
    const block = goldfishBlock(referenceText);
    return cases.map(({ id, expect, candidate: json }) => ({
        id, expect,
        prompt: `${block}\n\nCURRENT USER REQUEST VERBATIM:\n${request}\n\nADMITTED EVIDENCE:\n${evidence}\n\nCANDIDATE JSON:\n${json}\n`
    }));
}

export function scoreResponse(reply, expect) {
    const objects = [...String(reply).matchAll(/\{[\s\S]*\}/g)].map(match => match[0]);
    let parsed = null;
    for (const text of objects) { try { parsed = JSON.parse(text); break; } catch { /* try next */ } }
    if (!parsed || !["pass", "flags", "unavailable"].includes(parsed.status) || !Array.isArray(parsed.flags))
        return { status: "unparseable", flags: null, verdict: "unparseable" };
    const flags = parsed.flags.length;
    if ((parsed.status === "pass") !== (flags === 0) || (parsed.status === "flags" && flags === 0))
        return { status: "inconsistent", flags, verdict: "unparseable" };
    const verdict = parsed.status === expect ? "as-expected" : parsed.status === "pass" ? "missed" : parsed.status === "flags" ? "false-alarm" : "unavailable";
    return { status: parsed.status, flags, verdict };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
    const [mode, outDir] = process.argv.slice(2);
    if (!["write", "score"].includes(mode) || !outDir) { console.error("usage: write|score <outDir>"); process.exit(2); }
    const built = buildCases(fs.readFileSync(shippedPath, "utf8"));
    if (mode === "write") {
        fs.mkdirSync(outDir, { recursive: true });
        for (const item of built) fs.writeFileSync(join(outDir, `${item.id}.prompt.txt`), item.prompt);
        console.log(JSON.stringify(built.map(item => item.id)));
    } else {
        const rows = [];
        for (const item of built) for (const file of fs.readdirSync(outDir).filter(name => name.startsWith(`${item.id}.r`)).sort())
            rows.push({ case: item.id, run: file, expect: item.expect, ...scoreResponse(fs.readFileSync(join(outDir, file), "utf8"), item.expect) });
        console.log(JSON.stringify(rows, null, 2));
    }
}
