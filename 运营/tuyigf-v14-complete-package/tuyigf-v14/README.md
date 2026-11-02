# Tuyi Workshop V14

This package contains the V14 full-site HTML prototype and focused entry points for the single-file workbench, batch workbench, typography drawer and SaaS overview.

## Open

Open `tuyigf-v14-fullsite.html` in a modern desktop browser. The prototype is self-contained and has no external JavaScript or CSS dependencies.

## Main routes

- `#/home`: public homepage
- `#/studio/single`: single-design workflow
- `#/studio/batch`: batch workbench
- `#/studio/type`: typography drawer
- `#/app/overview`: simulated SaaS workspace

## V14 changes

- Reworked the single-file stepper so future stages remain locked until the current stage's prerequisite is completed.
- Added language-aware translation checks for empty cells, unchanged source strings, duplicate source groups and numeric text that needs review.
- Aggregated risk signals instead of repeating identical warning chips in every cell.
- Added a review boundary panel that separates table parsing, PSD layer matching, Photoshop readiness and final visual approval.
- Added selectable output languages and a clearer task-scope summary. The prototype no longer presents a fixed credit estimate as a live quote.
- Simplified the typography drawer into basic and advanced settings, clarified field labels and added unsaved-change confirmation.
- Improved batch-stage gating, queue hierarchy and responsive spacing.

## Simulation boundary

The browser prototype can read CSV/TSV/TXT text locally, save simulated typography settings in browser localStorage, record issue-review decisions and export a clearly labeled simulated HTML report. It does not parse PSD/PSB layers, connect to Photoshop or a local helper, enumerate installed fonts, write PSD files, save or reopen real design files, create genuine JPG deliverables, charge credits or submit real applications.

## Validation

See `V14-QA-REPORT.md` for static checks, parser tests, browser smoke tests and known limitations.

## Visual previews

See the `previews/` folder for the V14 preparation screen, typography drawer, issue audit, delivery screen, batch screen and mobile drawer.

## Test commands

- `python tests/static_checks.py`
- `node tests/parser-tests.js`
- Optional browser tests, with Playwright and Chromium installed: `python tests/browser-smoke-v14.py`, `python tests/issue-audit-v14.py` and `python tests/entrypoints-smoke-v14.py`.
