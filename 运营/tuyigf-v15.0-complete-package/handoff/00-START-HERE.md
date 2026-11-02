# Start Here — Tuyi Workshop V15.0

If you are a new developer or a new ChatGPT session, read these files in order:

1. `../CONTEXT-HANDOFF.md` — full product history, current state, report facts, V15.0 boundaries and roadmap.
2. `DECISIONS-AND-CONSTRAINTS.md` — product, data, safety and delivery rules.
3. `CURRENT-STATE-AND-ROADMAP.md` — what is implemented, what is unverified and next actions.
4. `FILE-MAP.md` — source tree and important files.
5. `SESSION-LOG.md` — decisions made during the V15.0 build and follow-up.
6. `RESUME-PROMPT.md` — paste into a new ChatGPT conversation after uploading the complete ZIP.

## Current truth

V15.0 includes a local read-only PSD/PSB scanner, isolated parser worker, typography metadata extraction and a browser UI. Backend/API/worker tests currently pass (31); the browser smoke test passes with mocked API data. The build environment could not install `psd-tools`, so actual PSD/PSB parsing and Windows runtime have not been verified. Do not claim production readiness. The immediate next task is to install on Windows, scan real files, and compare extracted metadata with Photoshop.
