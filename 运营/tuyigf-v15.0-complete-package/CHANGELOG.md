# Changelog

## V14.1 · 2026-10-31

- Added the standalone execution report center based on the uploaded 2026-10-31 report.
- Added overview, review queue, language/file delivery, replacement detail and provenance sections.
- Added search, language filtering, pagination, CSV/JSON export and print-to-PDF.
- Added second-pass report audit: 83 aggregate vs 79 exact unchanged rows; 12 layer-6350 `2.8oz` retention checks; 432 unmatched total vs 200 visible preview rows.
- Corrected stale report metrics in the website case-study section.
- Added report center entry points to the website header, home CTA and workspace sidebar.
- Added complete handoff documentation and a copy-paste resume prompt.
- Preserved V14 and V13 baseline assets.
- Kept V15 local production engine as a plan; no Photoshop production capability is claimed.

## V14 · 2026-10-31

- Added single and batch workflow gates, issue aggregation, typography drawer improvements and simulation boundaries.
- See `V14-OPTIMIZATION-REPORT.md` and `V14-QA-REPORT.md`.

## V15.0 — Local PSD/PSB Read-only Inspector (2026-10-31)

- Added Windows-first FastAPI Local Agent bound to 127.0.0.1.
- Added per-process bearer token, Host/Origin validation and no-arbitrary-path upload model.
- Added PSD/PSB upload, file size/header checks, SHA-256 and task-scoped source copies.
- Added read-only psd-tools adapter for recursive text-layer inventory and available typography/layout metadata.
- Added SQLite scan history, JSONL audit events, search, filtering, pagination, JSON/CSV export and task deletion.
- Added local scanner UI, V15.0 home entry and Windows setup/start batch files.
- Added adversarial review, API/schema/QA docs and complete context handoff updates.
- Validation: 19 automated tests passed; Chromium UI smoke passed with mocked API data.
- Limitation: psd-tools was unavailable in the build environment; actual PSD/PSB parsing and Windows execution remain unverified.

## V15.0 implementation follow-up — 2026-10-31

- Corrected font extraction to prefer documented psd-tools `TypeLayer.typesetting` and `font_names` APIs, with raw EngineData / FontSet index mapping as fallback.
- Added per-character style-run records where available, text type, effective visibility, opacity and complete font-name lists to scan records and CSV export.
- Expanded Photoshop header validation to the full 26-byte header, including reserved bytes, channel count, dimensions, depth and color-mode code.
- Updated runtime dependency floor to `psd-tools>=1.23,<2` to use structural `ParseLimits`.
- Isolated the default parser in a separate worker process; added timeout, structural limits and a 512 MiB result JSON cap.
- Added pre/post SHA-256 verification for the uploaded task copy; changed copies fail closed.
- Blocked deletion of active scans and enabled SQLite foreign-key enforcement.
- Improved scanner UI with byte-based upload progress, task-copy integrity disclosure, mixed style-run details and effective visibility/opacity.
- Added worker/API adversarial tests and browser smoke test; latest verification: 31 Python tests passed, browser smoke passed, inline JavaScript syntax passed.
- Actual PSD/PSB parsing and Windows runtime remain unverified because the build environment lacks psd-tools and cannot install it from the package index.
