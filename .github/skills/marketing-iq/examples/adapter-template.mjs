// Map only observed connector fields here; this example performs no retrieval.
export function handoff({ adapterId, scope, outcome, observedSources }) {
    return { schemaVersion: 1, adapterId, outcome, scope, sources: observedSources };
}

// Each observedSources entry must satisfy references/adapters.md. Unknown
// identity/body/membership cannot be reconstructed from a title or generated recap.
// Send the handoff to `cli.js evidence --adapter <adapterId>` through safe stdin.
