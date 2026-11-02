# V14 QA Report

## Static checks

- HTML parsing and duplicate-ID checks.
- Internal route and embedded screenshot checks.
- Inline JavaScript syntax checks with Node.js.
- Local CSV/TSV/TXT parser regression tests.
- Presence of workflow gates, issue filters, output-language selection and batch review state.

## Browser smoke tests: passed

Executed with headless Chromium at desktop and mobile viewport sizes.

- Open `#/studio/single` and verify that future stages are locked.
- Select a PSD filename, load sample translations, record the filename and advance.
- Run table checks, switch target languages and filter rows with review signals.
- Review the sample risk panel and advance to delivery scope.
- Select output languages and generate a simulated report.
- Open the typography drawer, edit basic and advanced settings, save, reopen and confirm the stored values.
- Verify unsaved-change confirmation when closing the drawer.
- Open `#/studio/batch`, run the simulated check, review the matrix, mark review complete and advance.
- Test desktop and mobile viewport widths.
- Verify the issue filter with a four-row CSV containing a duplicate source, unchanged translation and missing numeric token.
- Verify both single-file and batch simulated report downloads.
- Confirm no browser page errors or console errors during the smoke run.

## Test results

- Static HTML checks: passed.
- Inline JavaScript syntax checks: passed for all entry points.
- CSV/TSV parser regression tests: passed.
- Single-file workflow gates, including explicit file selection: passed.
- Batch workflow gates: passed.
- Typography drawer save and discard flow: passed.
- Issue counts and issue-only filtering: passed.
- Mobile drawer rendering: passed.
- All five HTML entry points: passed.

## Important evidence boundary

All browser checks validate the prototype interaction only. They do not prove PSD parsing, Photoshop connectivity, font availability, text-layer matching, file writes, save/reopen integrity or visual correctness.

## Known limitations retained

- PSD/PSB selection records the filename only.
- The browser does not parse Excel binary files; CSV/TSV/TXT are supported for local text parsing.
- Photoshop and the local helper are not connected.
- Font names are demonstration choices; actual installed-font enumeration and glyph coverage are unavailable.
- Browser preview cannot prove Photoshop rendering.
- localStorage is prototype persistence, not production persistence or a security mechanism.
- Pricing, authentication, billing, pilot application and real output are not connected.
