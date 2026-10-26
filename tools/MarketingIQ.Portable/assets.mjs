// Canonical runtime inputs shared by the workspace and native-plugin builders.
export const runtimeAssets = [
    ".github/agents/marketing-iq.agent.md",
    ".github/skills/marketing-iq/SKILL.md",
    ".github/skills/marketing-iq-launch-decision/SKILL.md",
    ".github/skills/marketing-iq-field-activation/SKILL.md",
    ...["adapters.md", "decision-tools.md", "launch-decision.md", "field-activation.md",
        "review-preflight.md", "result-artifacts.md", "packet-transport.md"].map(name => `.github/skills/marketing-iq/references/${name}`),
    ...["Test-ReviewPacket.mjs", "Save-ResultArtifact.mjs"].map(name => `.github/skills/marketing-iq/scripts/${name}`),
    ...["cli.js", "decisions.js", "evidence.js", "instant.js", "json.js", "routes.js", "package.json"]
        .map(name => `.github/skills/marketing-iq/scripts/portable/${name}`),
    ...["adapter-template.mjs", "synthetic-evidence.json", "github-contents-adapter.mjs",
        "github-contents.synthetic.json"].map(name => `.github/skills/marketing-iq/examples/${name}`)
];
