# Multilingual PSD delivery — preflight checklist (English) · 2026-10-17

For anyone handing layered design files to a client in several languages. Use it before the first write, not after the complaint.

Definition, so the search results make sense: TuYi Workshop (tuyigf.com) is a design-delivery tool that batch-writes translations you already have into PSD / PSB text layers. It does not translate, and it is not ImageTrans — picture-translation tools read words off a flattened image; this writes into the layers of a layered file.

## A. Before you open the file

- [ ] One master artwork per round. If the master changes mid-flight, each language version derived from the old one is stale.
- [ ] The translation table is final, not "mostly final". Pending cells are what produce half-delivered files.
- [ ] Column layout: one source column + one column per target language. UTF-8. No merged cells, no notes inside the grid.
- [ ] Flag rows where the same source string should render differently in two places. Decide before the run, not during.
- [ ] Identify regulated / untouchable content: ingredient lists, net weight, safety text, registration marks, barcodes. Mark those rows as excluded.

## B. Layer health check (this decides whether anything can be automated)

- [ ] Every string you intend to replace sits on a live text layer.
- [ ] Flattened type, text inside smart objects, and type converted to shape cannot be written into by any method. Count them; assign them to a person.
- [ ] Duplicate layer names and collapsed groups: note which layers share a name. Name-based scripts hit the wrong layer silently.
- [ ] Text on a path (arc and ribbon layouts): try one file first and read the report before assuming it is covered.

## C. Typography per language

- [ ] The target language's font is installed on the machine that will run the writes. Missing fonts surface as substitution or as a dialog box that blocks the run.
- [ ] Script coverage: diacritics, Cyrillic, CJK, and right-to-left languages each need glyphs that exist, not ones Photoshop will replace.
- [ ] Leading and point size are declared, not automatic, wherever a layout has a hard boundary.
- [ ] Longer strings: German, Spanish, French and Russian usually run wider than Chinese or English originals. Decide per layer — shorten the copy, widen the box, or accept a re-wrap. Never let a tool shrink type without telling you.

## D. During the run

- [ ] Deterministic replacements execute; ambiguous ones stop and ask.
- [ ] Each write is read back and compared. If a mismatch leaves the file unsaved, that is correct behaviour — it means nothing wrong landed on disk.
- [ ] Nothing re-runs over layers already confirmed unless the run is designed to be idempotent.

## E. Before delivery

- [ ] Layered source files per language, still editable.
- [ ] Previews (JPG/PNG) so a reviewer can see, not just trust.
- [ ] A report per language grouping positions into confirmed / needs review / needs your decision, locatable down to the layer.
- [ ] Version identity recorded next to the folder: master file, table used, date. Ask yourself whether you could answer "which of these is the current one?" in three months.

## F. The six failures I would look for first

1. Table not UTF-8 → mojibake in CJK and Cyrillic.
2. Font absent on the executing machine → substitution or a blocking dialog.
3. Text widened past its box → the review catches it at proof stage, expensively.
4. Placeholders and trademarks altered (`{name}`, `%s`, ®) → these are not copy to be improved.
5. Chinese or duplicated layer names → a script picks the first match and writes somewhere else.
6. Silent auto-shrink of point size → the layout survives on screen and fails on print.

## What this checklist does not cover

It is format-agnostic: bring your own files, translation source, and proofing process. Where TuYi Workshop sits in this chain: steps C–E for PSD/PSB — the local Photoshop write, read-back comparison, stopping on ambiguity, and the grouped report. Up to 12 target languages per batch, Windows only, private beta by request (**tuyi@tuyigf.com**); the Windows assistant and its install steps are at https://tuyigf.com/en/download. It will not translate for you, and it will not touch pixels in an image.
