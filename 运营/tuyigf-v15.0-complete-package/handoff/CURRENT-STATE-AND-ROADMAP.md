# Current State and Roadmap

## Current release

Tuyi Workshop V15.0 Developer Preview. This is a V15.0 implementation follow-up, not a new major version.

## Implemented

- FastAPI local agent, loopback binding, random session token, Host/Origin checks.
- PSD/PSB upload through browser file picker/drag-drop; no arbitrary local-path scan endpoint.
- Full Photoshop header validation and upload-size limit.
- SHA-256 of uploaded task copy before and after parsing; completion is rejected if the task copy changes.
- Separate parser worker process, configurable timeout, `psd-tools` structural limits and 512 MiB worker-result cap.
- Read-only `psd-tools>=1.23` adapter and recursive layer-tree traversal.
- Text, path, bbox, transform, point/paragraph text type, own/effective visibility, opacity and lock state where available.
- Typography extraction through `typesetting`, `font_names` and raw FontSet fallback; per-run style records preserved where exposed.
- Confidence, parser notes, unknown/null semantics and unsupported flags.
- SQLite job/layer store with foreign-key enforcement and JSONL event log.
- Search/filter/pagination and JSON/CSV export.
- Active task deletion guard; completed/failed task deletion removes task copy.
- Actual upload byte-progress UI, task-copy hash disclosure, typography and mixed-run display.
- Windows install/run batch scripts, desktop/mobile previews and complete handoff docs.

## Not implemented

- Real translation import and mapping.
- Windows/Photoshop font enumeration.
- Photoshop UXP/JSX adapter.
- Text write, save/reopen verification, image export.
- Visual review workflow.
- Signed installer.

## Not verified

- Actual psd-tools scan against a real PSD/PSB: parser dependency was unavailable in the build environment.
- Windows 10/11 runtime.
- Large PSB performance and memory behavior.
- Photoshop render equivalence and font installation availability.

## QA snapshot

- Python backend/API/worker tests: 31 passed.
- Chromium scanner UI smoke: passed with mocked API data, including upload progress, mixed style-run display and 390 px mobile overflow check.
- Inline scanner JavaScript syntax: passed.
- Real parser/Windows compatibility: pending.

## Roadmap

### P0 — Windows V15.0 validation

Install dependencies, run real PSD/PSB scans, compare at least 20 representative documents with Photoshop, measure parser accuracy and large-file behavior. Include CJK, mixed fonts, nested groups, hidden/locked layers, point/paragraph text, vertical/warped text, missing fonts and PSB.

### V15.1 — Translation import and mapping

CSV/TSV/XLSX import, deterministic matching, ambiguous candidate queue and human confirmation.

### V15.2 — Single-object Photoshop write

Write one confirmed text layer into a work copy, read back, save, reopen and generate preview. Preserve source hash.

### V15.3 — Multilingual batch

File × language matrix, pause/resume, idempotent retry and per-output reports.

### V15.4 — Production hardening

Windows installer/signing, compatibility matrix, memory controls, recovery, permissions and uninstall.
