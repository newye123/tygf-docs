# TUYI WORKSHOP V13 - Full Product, Website, UX and Delivery Plan

## 1. Product definition

Tuyi Workshop is a production workflow for teams that already have approved translations and need to place them into editable Photoshop PSD/PSB text layers. It coordinates source files, translation sheets, text-object matching, per-file/per-language typography rules, exception review, local Photoshop execution, and delivery verification.

It is not a machine-translation product. It does not promise fully automatic visual design. It should not claim a delivery is visually correct only because a text value was written and read back successfully.

## 2. Core user outcome

The user wants to turn an existing design master and approved translations into editable language variants with less repetitive work and a clear record of what changed and what still needs review.

The product promise is built from four outcomes:
- Match approved translations to the intended text objects.
- Apply typography settings independently for each PSD and target language.
- Make content, matching, font and layout exceptions visible before execution.
- Verify writes and saved outputs, then preserve the remaining human visual review as a separate state.

## 3. Primary users and use cases

### Primary segment
Cross-border e-commerce visual teams producing Amazon A+, product detail pages, feature graphics, campaign visuals and launch assets in multiple languages.

### Secondary segment
Design agencies and localization vendors delivering editable source files for multiple clients.

### Required user prerequisites
- Approved translations already exist.
- Editable PSD or PSB source files are available.
- The execution workstation is Windows with a supported Photoshop version and the local helper installed.
- The user can review uncertain matches and final visual output.

## 4. Website information architecture

The marketing website and the signed-in workbench are separate experiences. They share brand tokens and component behavior, but not the same information architecture.

### Public website routes
1. Home: explain the problem, product input/output, core capabilities and primary CTA.
2. How it works: four-step workflow with real product screenshots and operation clips.
3. Typography: language defaults, PSD-specific overrides, font, weight, size, leading, tracking, kerning and baseline settings.
4. Product capabilities: matching, language batches, file handling, review and output.
5. Batch workflow: SKU/file queue, shared translation sheets and file-by-language execution units.
6. Matching: source text, layer path, candidate translation, duplicate and missing-object handling.
7. Quality review: content risks, typography risks, layout risks, execution failures and final visual review.
8. Case studies: authorized, anonymized, reproducible PSD test cases with sample size and limitations.
9. Compatibility: Windows, Photoshop versions, PSD/PSB scope, fonts and known limitations.
10. Security: distinguish PSD/PSB files, image outputs, text-layer content, translation data, path strings, task state and third-party model processing.
11. Pricing: explain the current official credit rules and link to the live quote before execution. Do not invent prices.
12. Download: local helper, version notes, installation, compatibility and troubleshooting.
13. Guides: spreadsheet format, typography, matching, QA, batch use and delivery.
14. FAQ, pilot application, login, access and contact support.

### Public website conversion sequence
Problem recognition -> product understanding -> four-step demonstration -> typography differentiation -> batch workflow -> evidence and limitations -> security and compatibility -> pilot application.

## 5. Workbench information architecture

The workbench has a shared application shell and two production modes.

### Shared navigation
- Overview
- Projects
- Design files
- Batch tasks
- Typography
- Quality review
- Delivery center
- History
- Usage and billing
- Team
- Environment and preferences
- Help

### Single-design workflow
The product's real single-file flow remains four steps:
1. Prepare materials: choose PSD/PSB for read-only local scan; import or paste approved translations; download sample sheets; open typography drawer.
2. Smart detection: inspect empty cells, duplicate source strings, source-equals-translation cases, missing columns and other table-level warnings. Do not imply table parsing equals PSD matching.
3. Design review: reconcile translation rows with actual text objects; review content risks, typography risks, layout risks and Photoshop readiness. Keep the typography drawer accessible without making it a separate workflow step.
4. Generate delivery: confirm languages, output names, destination and official quote; execute locally; record per-language status; retry failed language units; verify saved outputs; provide an HTML report.

### Batch-design workflow
- Left pane: SKU and PSD/PSB file queue with search and per-file state.
- Main pane: selected file, translation-sheet binding, scan summary, object mapping and exceptions.
- Typography drawer: file x language override.
- Batch matrix: one row per file and one column per language, with each cell representing an output variant.
- Delivery: per-file/per-language progress, pause/stop, failed-unit retry, preserved successful outputs and batch report.

## 6. Typography rule model

The intended configuration hierarchy is:
1. Source typography: preserve original values when no override exists.
2. Language default: reusable defaults for a language.
3. PSD x language override: highest-priority file-specific rule.
4. Task snapshot: freeze the effective values at task creation or confirmation.

The first release should support language defaults and PSD-specific overrides. Per-text-layer overrides can be considered later because they add significant complexity.

Typography fields:
- Font family and PostScript name where available.
- Font style/weight.
- Font size.
- Leading.
- Tracking.
- Kerning mode.
- Baseline shift.
- Optional bold/italic/underline if the real engine supports them.

The local helper must provide actual installed fonts and character coverage. A browser font list is not evidence of Photoshop font availability. The UI must show missing-font and unsupported-glyph states. The task snapshot must preserve the exact effective settings.

## 7. Quality model and state semantics

Never collapse all checks into one green success badge.

### Separate quality dimensions
- Mapping: matched, ambiguous, missing, ignored, preserved source.
- Content: empty translation, source-equals-target, number/unit/model/identifier consistency, possible omission.
- Typography: font available, glyph coverage, style available, parameter applied.
- Layout: line-count change, width risk, overflow, text frame behavior, visual overlap.
- Execution: write attempted, write read-back, save completed, reopen verified.
- Visual review: pending, approved, rejected, waived with reason.

### Important reporting rule
A different line count is a layout-change signal, not proof of missing content. A write/read-back pass proves text-value consistency, not visual correctness. The report must state which evidence exists and which checks were not run.

### Count definitions
- Unique text objects: unique source text-layer objects in the source file.
- Planned write operations: matched objects multiplied by target language variants.
- Completed writes: successful object-language writes.
- Unmatched translation rows: table rows without an object in the current file; may be normal when a shared sheet is used.
- Uncovered design objects: source objects without a corresponding translation row.
- Layout warnings: measured or heuristic layout signals; do not label as clipping unless clipping is actually detected.

## 8. Data model

Core entities:
- Project
- DesignFile
- TranslationSheet
- TargetLanguage
- TextObject
- TranslationBinding
- TypographyRule
- Task
- OutputVariant
- QualityIssue
- ExecutionEvent
- DeliveryEvidence

Relationships:
- A project contains many design files and translation sheets.
- A design file may bind to one or more translation sheets.
- A design file contains text objects.
- A translation binding maps one text object to one target-language value.
- A typography rule is scoped to language default or design-file x language.
- A task freezes the relevant bindings and typography rules.
- An output variant is one design file x one language.
- Quality issues and execution events attach to the specific object, language, file or output variant.

## 9. Design system

Use the visual language from the supplied real workbench screenshots:
- White primary canvas.
- Light neutral secondary surfaces.
- Charcoal primary action and active workflow step.
- Restrained teal for execution and positive action.
- Fine neutral borders and low-elevation shadows.
- Amber for review-needed states.
- Red for blocked or failed states.
- Grey for untouched or informational states.

Component families:
- Global shell and responsive navigation.
- Four-step single-file stepper.
- Batch queue and batch matrix.
- File picker and translation import/drop zone.
- Language selector and data table.
- Typography drawer.
- Issue detail pane.
- Preflight environment cards.
- Execution progress and retry controls.
- Delivery evidence and report table.
- Toast, confirmation dialog, empty state and error state.

## 10. Responsive behavior

- Large desktop: full workbench, sidebar, main workspace and contextual right drawer.
- Standard desktop: collapsible sidebar; drawer overlays rather than compressing the main task area.
- Tablet: single-column task layout, compact navigation, object-list mode instead of wide language matrix.
- Mobile: project status, issue review, history and reports. Photoshop execution is unavailable on mobile and must not be presented as an actionable control.

Do not shrink a 12-language matrix to fit a phone. Switch to a single-language object list.

## 11. Simulation boundaries in the V13 HTML

The HTML prototype can:
- Navigate public pages and workbench routes.
- Record file names without opening PSD/PSB data.
- Read CSV/TSV/TXT locally in the browser and inspect table headers, empty cells and duplicate source strings.
- Save simulated typography settings in localStorage.
- Demonstrate language defaults and PSD-specific overrides.
- Create simulated tasks and task snapshots.
- Record manual issue decisions.
- Generate a clearly labeled simulated HTML report.

The HTML prototype cannot:
- Parse PSD/PSB layers.
- Connect to Photoshop or the local helper.
- Enumerate actual installed fonts.
- Confirm glyph coverage in Photoshop.
- Write text into PSD/PSB.
- Save or reopen real design files.
- Produce genuine PSD/JPG deliverables.
- Charge credits, authenticate users or submit a real pilot application.

## 12. Implementation sequence

### Phase 0: freeze product rules
- Confirm entity relationships and count definitions.
- Confirm four-step workflow.
- Confirm typography inheritance and override precedence.
- Confirm status model and evidence requirements.

### Phase 1: design system
- Establish tokens, typography, spacing, borders and elevation.
- Standardize buttons, fields, tables, drawers, dialogs and states.
- Define desktop/tablet/mobile breakpoints.

### Phase 2: core workbench
- Single-file four-step workflow.
- Batch file queue and file-language matrix.
- Typography drawer and matrix.
- Translation mapping and object-level review.
- Quality review and delivery evidence.

### Phase 3: execution integration
- Local helper connection and environment checks.
- Real PSD scan and object identity.
- Actual font enumeration and glyph coverage.
- Write/read-back/save/reopen evidence.
- Per-language retry and safe resume.

### Phase 4: marketing site
- Replace conceptual mockups with the supplied real UI screenshots and authorized operation recordings.
- Publish the four-step flow, typography differentiation, batch workflow, evidence, compatibility and security pages.
- Connect real pilot forms only after server-side submission is available.

### Phase 5: validation and launch
- Run representative PSD/PSB test suite.
- Run 12-language and multiple-file stress tests.
- Test long translations, CJK, diacritics, numeric fields, missing fonts, unsupported glyphs and interruptions.
- Test keyboard access, responsive behavior and data privacy.
- Release only claims supported by reproducible evidence.

## 13. Acceptance criteria

1. Changing Japanese typography for one PSD does not affect another PSD.
2. Language defaults are inherited only when no file override exists.
3. A task snapshot remains unchanged after future defaults are edited.
4. CSV/TSV/TXT import reports headers, row count, empty translations and duplicate source strings.
5. Excel import is clearly distinguished from text formats in the browser-only prototype.
6. The 12-language review can switch between summary, single-language list and matrix.
7. A line-count change is not automatically labeled content loss.
8. Number, model, unit and identifier risks are separately reviewable.
9. A batch output is tracked per design-file x language unit.
10. Failed units can be retried without overwriting successful units.
11. Text write/read-back, save/reopen and visual review are distinct states.
12. Mobile layouts do not expose unavailable Photoshop execution actions.
13. Every simulated status is labeled as simulated and never presented as production evidence.

## 14. V13 deliverables

- tuyigf-v13-fullsite.html: single-file public website and simulated workbench.
- V13-IMPLEMENTATION-PLAN.md: this implementation specification.
- V13-QA-REPORT.md: static validation and known limitations.
- source screenshots: six embedded, privacy-reviewed workbench screenshots extracted from the V12 source.
- V13-PACKAGE.zip: complete portable package.
