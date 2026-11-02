# V13 QA Report

## Static checks
- HTML document generated as a single-file prototype.
- Six inline JavaScript blocks extracted and passed `node --check` after the V13 changes.
- Six supplied workbench screenshots are embedded as data URIs in the HTML.
- The app task wizard was reduced to four steps: Prepare, Smart Detection, Design Review, Generate Delivery.
- CSV/TSV/TXT text import was added to the screenshot-faithful single-file workflow; Excel remains filename-only in this browser prototype.
- A drag-and-drop target was added for translation text files.
- The full workbench retains project, files, tasks, typography, quality, delivery, history, billing, team, settings and help routes.

## Browser check limitation
A headless Chromium dump attempt timed out in this execution environment. Therefore no claim of full end-to-end browser automation is made. The HTML should be opened and manually tested in a normal browser before deployment.

## Known limitations
- PSD/PSB file selection records the filename only; no binary parsing is performed.
- Photoshop and local-helper connection are not implemented in the browser prototype.
- Typography font names are demonstration choices; actual installed-font enumeration and Photoshop glyph coverage are not available.
- LocalStorage is used for simulated settings and workbench state. It is not a production persistence or security mechanism.
- The official pilot form, authentication, billing and credits are not connected.
- Sample tasks and sample quality states are illustrative, not operational performance claims.

## Manual acceptance checklist
1. Open the homepage and navigate to all public sections.
2. Open `#/studio/single`, select a PSD filename, import a CSV or TSV, and inspect the parsed row count in Smart Detection.
3. Open the typography drawer, switch file and language, change font/size/leading/tracking, save, close and reopen the drawer.
4. Switch to `#/studio/batch`, select different file rows and confirm typography rules remain scoped to the selected file and language.
5. Open `#/app/tasks/new` and complete the four-step wizard.
6. Open `#/app/typography`, modify a file-specific override and confirm the matrix shows inherited vs overridden state.
7. Open `#/app/quality`, approve or skip a sample issue and confirm the local history changes.
8. Open a delivery detail and export the simulated report. Confirm the report clearly says no real PSD/JPG was produced.
9. Test at desktop, tablet and mobile widths. Mobile should focus on status and review rather than Photoshop execution.
