# Tuyi Workshop V15.0 — Local PSD/PSB Read-only Inspector

Current release: **V15.0 Developer Preview**  
Product: 图译工坊 / Tuyi Workshop  
Build date: 2026-10-31

## Start here

- Windows setup: double-click `install-v15-local-agent.bat` once, then `run-v15-local-agent.bat`.
- Scanner UI: the launcher opens the local URL automatically (default port 8765; if busy, the agent selects the next available loopback port).
- Project home: served at the same local origin as the scanner.
- Full handoff: read `CONTEXT-HANDOFF.md` and `handoff/00-START-HERE.md`.

## V15.0 scope

Real local PSD/PSB file upload and read-only structural scan, text-layer inventory, typography/style-run metadata where available, SQLite scan history, JSON/CSV export and local audit events. The agent uses a separate parser worker process with a timeout and verifies the task-scoped uploaded copy with SHA-256 before and after scanning. The source design file is never opened for writing. No Photoshop connection or text-write operation is present.

## Important limitation

The build environment did not have `psd-tools`, and network package installation was unavailable. The adapter and Windows dependency setup are included, but actual PSD/PSB parser compatibility has not been verified against a real file in this build environment. See `docs/V15.0-IMPLEMENTATION-REPORT.md` and `docs/V15.0-QA-REPORT.md`. Do not treat this developer preview as production-ready until the real 20-file Photoshop comparison gate passes.

## Project contents

- `tuyigf-v15.0-fullsite.html`: V15.0 home page with scanner entry.
- `local-scanner.html`: local read-only scan UI.
- `local-agent/`: FastAPI agent, isolated parser worker, PSD parser adapter, SQLite/JSONL store, Windows scripts and tests.
- `docs/`: adversarial review, implementation, QA, API and schema docs.
- `tests/v15-scanner-browser-smoke.py`: mocked API browser interaction and responsive UI smoke test.
- `previews/`: desktop, result and mobile UI screenshots.
- `handoff/`: project context, decisions, roadmap, file map, session log and resume prompt.
- `reference/`: V13/V14/V14.1 baselines and original report evidence retained from V14.1.

## Quality status

- Python unit/API/worker tests: 31 passed in the build environment.
- Browser UI smoke test: passed with mocked API data; upload progress, result rendering, typography display and mobile layout checked.
- Inline JavaScript syntax and V15 static checks: passed `node --check` and `tests/v15-static-checks.py`.
- Existing V14/V14.1 regression checks: passed.
- Actual PSD/PSB parser run: not verified; `psd-tools` could not be installed in the build environment.
- Windows 10/11 runtime: not verified in this environment.

## Handoff

Start with `CONTEXT-HANDOFF.md`. In a new ChatGPT session, upload the complete ZIP and paste the contents of `handoff/RESUME-PROMPT.md`.
