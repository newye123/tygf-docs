# Tuyi Workshop V15 — Local Production Engine Plan

## Purpose

Move the V14 browser prototype toward a real, auditable desktop production workflow. V15 should not be presented as complete until it can read real PSD/PSB files, map approved translations to editable text layers, execute writes through Photoshop, reopen saved outputs, and produce evidence-backed reports.

## Product boundary

Tuyi Workshop is a localization production tool. It does not translate content or autonomously redesign layouts. Approved translation data is placed into existing editable design files under explicit typography rules. Human visual approval remains a separate required state.

## Recommended architecture

1. Web UI: retain the V14 workflow and add explicit Local Agent connection status.
2. Local Agent: Python + FastAPI bound to 127.0.0.1 only; no public network listener by default.
3. PSD inspection: `psd-tools` for read-only structural inspection and text metadata where available.
4. Photoshop execution adapter: UXP or JSX according to supported Photoshop versions and required APIs. Do not assume a third-party PSD parser can safely write every Photoshop text feature.
5. Storage: SQLite for projects, tasks, mappings and execution events; JSONL append-only audit log for each task.
6. Output: work-copy PSD/PSB, JPG/PNG previews, hashes, reopen verification and human review record.

## Security and file safety

- Bind the local service to loopback only.
- Require a per-session random token for UI-to-agent requests; validate Origin and reject cross-origin requests.
- Never overwrite the original PSD/PSB. Create a task-scoped working copy.
- Restrict file access to user-selected files and an explicitly selected output directory.
- Record SHA-256 for source, working copy and each output.
- Do not upload PSD content to a remote model by default.
- Do not claim a file is valid solely because a write API returned success.

## Core workflow

### A. Read-only scan

Input: user-selected PSD/PSB.

Output per text layer:
- stable task-local object ID
- layer name and full group path
- text content
- visibility and lock state
- bounding box and transform metadata when available
- font family/PostScript name, style, size, leading, tracking when available
- parser confidence and unsupported-feature flags

The scan must report unsupported or unavailable metadata explicitly. It must never infer a missing value as a fact.

### B. Translation import

First release supports CSV, TSV and XLSX. Required fields should be configurable, with a recommended schema:
- `source_id` (optional but preferred)
- `layer_path` (optional)
- `source_text`
- one column per target language, using stable language codes

Import validation:
- duplicate IDs
- duplicate source strings
- empty targets
- missing language columns
- leading/trailing whitespace
- line breaks and special characters
- numbers, units, URLs, model names and placeholders

### C. Matching engine

Use deterministic matching before fuzzy matching. Suggested priority:
1. Explicit `source_id` to stable object ID mapping.
2. Exact layer path plus exact source text.
3. Exact source text with unique candidate.
4. Normalized source text with unique candidate.
5. Fuzzy candidates shown for human confirmation only.

Never auto-write a fuzzy match when multiple candidates exist.

Suggested confidence bands (calibrate on a real labeled corpus before release):
- 0.98–1.00: eligible for auto-match if unique and conflict-free.
- 0.85–0.979: human confirmation.
- below 0.85: unresolved.

Confidence is not a correctness guarantee. Store match method, candidate set and evidence.

### D. Typography preflight

- Enumerate installed fonts through the local operating system and Photoshop environment where possible.
- Match by PostScript name where available, not display family name alone.
- Check target glyph coverage before writing.
- Resolve typography by precedence: source style -> language default -> file-language override -> task snapshot.
- Freeze the effective typography values when a task is approved.
- Flag overflow and line-count changes as review signals, not proof of clipping or translation error.

### E. Photoshop execution

- Create a working copy before any mutation.
- Execute one text object at a time with idempotent operation IDs.
- Write text and supported typography properties through Photoshop.
- Read the text back and compare with the intended Unicode string.
- Save to a task output path; never save over source.
- Reopen the saved file and verify expected document and text-layer state.
- Generate a rendered preview for human visual review.

### F. Delivery and evidence

Each file-language output must have independent state:
`queued -> preflight_passed -> writing -> write_verified -> saved -> reopen_verified -> visual_review_pending -> approved/rejected`.

Failure states include `blocked`, `write_failed`, `readback_failed`, `save_failed`, `reopen_failed` and `cancelled`.

Report counts must distinguish planned objects, matched objects, ambiguous matches, unmatched rows, uncovered text layers, attempted writes, verified writes, saved outputs, reopen-verified outputs and human-approved outputs.

## API outline

- `GET /health`: agent version, Photoshop connection and capability summary.
- `POST /scan`: scan a user-selected PSD/PSB and return a scan job ID.
- `GET /scan/{job_id}`: scan status and text-layer inventory.
- `POST /translations/validate`: validate CSV/TSV/XLSX import.
- `POST /mapping/propose`: deterministic matching and candidate generation.
- `POST /mapping/confirm`: persist user-confirmed mappings.
- `POST /preflight`: font, glyph, content and layout-risk checks.
- `POST /tasks`: freeze task snapshot and create working copies.
- `POST /tasks/{task_id}/execute`: start execution after explicit confirmation.
- `POST /tasks/{task_id}/pause` and `/resume`: safe task control.
- `GET /tasks/{task_id}/events`: append-only execution events.
- `GET /tasks/{task_id}/report`: evidence-backed report.

All endpoints must validate task ownership within the local session and reject paths outside approved locations.

## Delivery phases

### V15.0 — Read-only local scan
- Local Agent install/start/stop.
- Agent health and Photoshop capability check.
- Select PSD/PSB, scan text layers, export inventory JSON/CSV.
- No write capability in this milestone.

Acceptance: scan at least 20 representative PSDs; compare layer count, text content and metadata against Photoshop manually; document unsupported features.

### V15.1 — Translation mapping
- CSV/TSV/XLSX import.
- Stable object IDs and mapping UI.
- Exact and normalized matching.
- Ambiguity and missing-object review queue.

Acceptance: no fuzzy match is silently auto-written; every mapping is explainable and reversible before task creation.

### V15.2 — One-object Photoshop write
- Connect Photoshop adapter.
- Write one confirmed text layer into a working copy.
- Read back, save, reopen and compare.

Acceptance: original source hash remains unchanged; Unicode readback matches exactly; output reopens; preview is generated; manual visual review is recorded separately.

### V15.3 — Multi-language and batch
- Language defaults and file-language overrides.
- File x language output matrix.
- Pause/resume and retry failed units.
- Per-output logs and reports.

Acceptance: one failed language does not invalidate successful outputs; retries are idempotent; interrupted jobs resume without duplicate writes.

### V15.4 — Production hardening
- Large-file and long-task tests.
- Recovery and disk-space checks.
- Permission and local API security tests.
- Windows/Photoshop version compatibility matrix.
- Signed installer and upgrade/uninstall path.

## Required test corpus

Include representative PSD/PSB files with:
- simple point text and paragraph text
- multiple text runs with mixed fonts and styles
- CJK, Latin diacritics, Polish characters and Korean
- vertical text, rotated text and transformed groups
- hidden and locked layers
- duplicate source strings in different groups
- smart objects and rasterized text
- missing fonts and unsupported glyphs
- long translations and line-break changes
- large files and interrupted save operations

## Release gates

Do not claim production readiness until:
1. Source file hash is unchanged after every run.
2. Every write is traceable to a confirmed mapping and frozen typography snapshot.
3. Readback and reopen verification pass independently.
4. Failed outputs can be retried without damaging successful outputs.
5. Reports separate machine-verifiable evidence from human visual approval.
6. No unsupported Photoshop feature is silently flattened or discarded.
