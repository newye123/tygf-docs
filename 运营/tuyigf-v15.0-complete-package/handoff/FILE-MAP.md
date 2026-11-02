# File Map — V15.0

## Entry points

- `README.md`: project overview and quick start.
- `CONTEXT-HANDOFF.md`: full context recovery document.
- `tuyigf-v15.0-fullsite.html`: V15.0 home page with scanner entry.
- `local-scanner.html`: read-only PSD/PSB scanner UI.
- `install-v15-local-agent.bat`: Windows dependency installation entry.
- `run-v15-local-agent.bat`: Windows Local Agent startup entry.

## Local Agent

- `local-agent/app/main.py`: FastAPI routes, auth/security middleware, task orchestration and isolated worker supervisor.
- `local-agent/app/scanner.py`: PSD/PSB header validation, psd-tools adapter, text/font/style-run extraction and scan schema creation.
- `local-agent/app/store.py`: SQLite scan/layer store and JSONL events.
- `local-agent/scan_worker.py`: isolated parser worker entry point.
- `local-agent/requirements.txt`: runtime dependencies; psd-tools minimum is 1.23 for ParseLimits.
- `local-agent/run.py`: Uvicorn startup and browser launch.
- `local-agent/install-windows.bat`, `run-windows.bat`: local agent setup/start.
- `local-agent/tests/`: parser helper, API, security and worker tests.
- `local-agent/data/`: local runtime database, task copies and event log. Runtime data should not be included in release ZIP.

## Tests

- `tests/v15-scanner-browser-smoke.py`: mocked API browser interaction, upload progress, result rendering and mobile layout smoke test.
- `tests/v15-static-checks.py`: scanner HTML/JS, local API integration hooks and read-only parser boundary static checks.
- `tests/`: historical V13/V14/V14.1 checks and assets.

## Documentation

- `docs/V15.0-ADVERSARIAL-REVIEW.md`: threat and failure-mode review.
- `docs/V15.0-IMPLEMENTATION-REPORT.md`: implementation scope and limitations.
- `docs/V15.0-QA-REPORT.md`: test results and unverified items.
- `docs/V15.0-SCAN-SCHEMA.md`: scan data fields and confidence semantics.
- `docs/V15.0-API.md`: local API reference.
- `docs/V15.0-DELIVERY-MANIFEST.md`: package contents, exclusions, verification snapshot and re-entry steps.
- `docs/V15.0-LOCAL-PRODUCTION-ENGINE-PLAN.md`: V15 roadmap and architecture plan.
- `docs/REPORT-UX-SPEC.md`, `REPORT-DATA-DICTIONARY.md`, `UIUX-DESIGN-SYSTEM.md`: V14.1 report and UI rules.

## Previews

- `previews/v15-scanner-desktop.png`
- `previews/v15-scanner-result.png`
- `previews/v15-scanner-mobile.png`

## Historical baselines and evidence

- `reference/tuyigf-v13-complete-package.zip`
- `reference/tuyigf-v14-complete-package.zip`
- `reference/tuyigf-v14.1-report-ux-complete.zip`
- `reference/original-execution-report.html`
- `reference/tuyigf-v15-engineering-blueprint.zip`
- V13/V14/V14.1 HTML and screenshots retained in the root, `assets/`, `previews/` and `reference/`.
