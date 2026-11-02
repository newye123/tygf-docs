# Session Log

## 2026-10-31 — V15.0 Local PSD/PSB Scanner

User asked to develop the previously proposed V15.0 PSD/PSB read-only scanning milestone using adversarial review.

Decisions:
- Start from the V14.1 complete package and preserve all baselines.
- Build a Windows-first FastAPI local agent bound to 127.0.0.1.
- Use browser file selection and upload instead of exposing arbitrary local filesystem paths.
- Use psd-tools as the read-only PSD/PSB parser adapter.
- Include SHA-256, SQLite records, JSONL audit log, JSON/CSV export, task deletion and UI.
- No Photoshop connection or write capability in V15.0.
- Keep complete context handoff docs inside every ZIP.

Initial implementation:
- Added local scanner UI and integrated scanner entry into V15.0 home page.
- Added FastAPI app, scanner adapter, SQLite/JSONL store, Windows scripts and API docs.
- Added adversarial review and scan schema docs.
- Initial backend/API tests and mocked browser smoke passed.
- Actual PSD parsing was not verified because psd-tools could not be installed in the build environment.

Follow-up adversarial development:
- Corrected typography extraction to prefer documented TypeLayer `typesetting` and `font_names` APIs.
- Added raw FontSet index mapping fallback so numeric font references are not mistaken for font names.
- Preserved per-character style-run metadata where available; summary typography fields explicitly identify first-run scope.
- Added text type, effective visibility, opacity, all font names and style-run records to the scan schema and CSV export.
- Strengthened 26-byte PSD/PSB header validation.
- Pinned `psd-tools>=1.23,<2` to require structural ParseLimits.
- Added isolated parser worker process, configurable timeout, structural read/object/nesting limits and a 512 MiB worker-result cap.
- Added task-copy SHA-256 pre/post verification; a changed task copy cannot be marked completed.
- Blocked deletion of queued/scanning tasks and enabled SQLite foreign-key enforcement.
- Updated scanner UI with upload byte progress, task-copy integrity language, typography/style-run detail and mobile verification.

Latest verification:
- Python backend/API/worker tests: 31 passed.
- Browser smoke: passed with mocked API data; desktop and mobile, upload progress, result display and no JS errors.
- Inline JavaScript `node --check`: passed.
- Actual PSD/PSB parsing and Windows runtime remain unverified.

Next action: install on Windows, scan real PSD/PSB files, compare parser output with Photoshop, and complete the 20-file compatibility corpus before V15.1 mapping.
