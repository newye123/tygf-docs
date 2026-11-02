# V13 QA Report

## Static checks completed
- HTML document parsed successfully.
- 14 public page shells detected.
- 16 unique internal hash routes detected.
- No duplicate HTML element IDs detected.
- Six supplied workbench screenshots are embedded as data URIs.
- The app task wizard uses four steps: Prepare, Smart Detection, Design Review, Generate Delivery.
- CSV/TSV/TXT text import is supported in the browser prototype; Excel remains filename-only in this browser-only build.
- The single-file workbench includes local text parsing, duplicate-source checks, empty-cell checks and a drag-and-drop target.
- Batch workbench has four stages, a file queue and a clickable file x language typography matrix.
- The typography drawer scopes settings to the selected file and language and saves them in browser localStorage.
- The full SaaS workspace retains project, files, tasks, typography, quality, delivery, history, billing, team, settings and help routes.
- No external JavaScript or CSS dependencies are required.

## Code checks completed
- Six inline JavaScript blocks passed `node --check`.
- `tests/parser-tests.js` passed quoted CSV parsing, comma/tab delimiter detection, duplicate source detection and empty translation-cell detection.
- `tests/static_checks.py` passed HTML parsing, duplicate-ID, route, embedded-screenshot, workflow and dependency checks.

## Browser test limitation
A headless Chromium dump attempt timed out in this execution environment. Therefore no claim of full browser end-to-end automation is made. Open the HTML in a normal browser and complete the manual acceptance checklist before deployment.

## Known limitations
- PSD/PSB selection records the filename only; no binary parsing is performed.
- Photoshop and local-helper connection are not implemented in the browser prototype.
- Typography font names are demonstration choices; actual installed-font enumeration and Photoshop glyph coverage are not available.
- Browser typography preview may fall back to a system font and cannot prove Photoshop rendering.
- LocalStorage is used for simulated settings and workbench state. It is not production persistence or a security mechanism.
- The official pilot form, authentication, billing and credits are not connected.
- Sample tasks and sample quality states are illustrative, not operational performance claims.

## Manual acceptance checklist
1. Open the homepage and navigate to all public sections.
2. Open `#/studio/single`, choose a PSD filename, import a CSV or TSV, and inspect parsed row count in Smart Detection.
3. Open the typography drawer, switch file and language, change font/size/leading/tracking, save, close and reopen the drawer.
4. Switch to `#/studio/batch`, advance through all four batch stages, select a file-language matrix cell and save a distinct typography override.
5. Open `#/app/tasks/new` and complete the four-step wizard.
6. Open `#/app/typography`, modify a file-specific override and confirm the matrix shows inherited vs overridden state.
7. Open `#/app/quality`, approve or skip a sample issue and confirm the local history changes.
8. Open a delivery detail and export the simulated report. Confirm the report clearly says no real PSD/JPG was produced.
9. Test desktop, tablet and mobile widths. Mobile should focus on status and review rather than Photoshop execution.
