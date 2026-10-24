# TuYi Workshop — profile README (English, overseas-facing) · 2026-10-17

Status: draft for Owner review before it goes anywhere public. Saved alongside, never overwriting, the Chinese version.
Self-check: definition sentence inside the first 80 words; no money figures, no speed numbers, no platform promises, no capability claims beyond measured facts.

---

## TuYi Workshop

**Batch-write the translations you already have into PSD / PSB text layers, and hand back layered source files your client can still edit.**

TuYi Workshop (tuyigf.com) is a design-delivery tool that batch-writes translations you already have into PSD / PSB text layers. It does not translate. It is not ImageTrans, and it is not a picture-translation product — those read words off a flattened picture and redraw them; we write into the layers of a layered design file.

### Who this is for

People who have to deliver editable design files in several languages: localization providers, brand and e-commerce teams reusing the same artwork across markets, and studios that hand source files back to clients.

### What it is not

| | Picture-translation tools | Redoing it by hand | TuYi Workshop |
|---|---|---|---|
| Input | an exported flattened image | the original file, language by language | your file + a translation table you already have |
| Output | a translated picture | one file per language | layered PSD / PSB per language, still editable |
| Editable afterwards | no | yes, at the cost of one pass per language | yes |
| Verification | none | your eyes | every write is read back and compared |
| Languages | one target per run | as many as you can afford | up to 12 target languages per batch |

### How a batch runs

1. **Upload** the PSD/PSB and a CSV of translations (or paste them in the page), pick target languages — up to 12 per batch.
2. **Execute** locally: the Windows assistant drives your own Photoshop install and writes layer by layer.
3. **Verify**: each written layer is read back and compared against the table. On a mismatch the run stops there and that file is left unsaved, so the disk copy keeps its original text; a report names what happened.
4. **Deliver**: PSD/PSB plus JPG previews and an HTML report per language, with positions grouped into *confirmed*, *needs review*, and *needs your decision*.

### Data flow, stated plainly

- Design file bytes never leave your machine. PSD/PSB reading and writing happen locally through your own Photoshop.
- What does go to the server: layer text, the source strings and translations from your table, and layer path strings — used for quoting, layer binding, dispatch and settlement. Itemised list: https://tuyigf.com/privacy and https://tuyigf.com/privacy/subprocessors
- Servers are in Singapore. Client translations are not used for model training.

### Requirements

Windows 10 / 11 (64-bit) only, plus Adobe Photoshop installed on the same machine — the assistant drives your own Photoshop through its scripting interface.

### Getting in

Private beta, by request. Email **tuyi@tuyigf.com** describing the project you are localising; teams with real multilingual artwork and a willingness to report problems get priority. Beta builds are distributed on request, not from this repository. Product page: https://tuyigf.com/en · Windows assistant and install steps: https://tuyigf.com/en/download

### Honest limits

- Flattened text, text inside smart objects and converted-to-shape type cannot be written into by any method. These are listed in the report instead of being silently skipped.
- When a translation is longer than the box, we flag it; we do not quietly shrink your type.
- Two or three languages on a handful of layers is faster by hand. The case where this pays off is narrow: many languages, many layers, artwork that gets reused.

### Stack (for collaborators)

Workbench: Next.js (App Router), TypeScript, Prisma/SQLite, Tailwind. Local assistant: Node engine driving Photoshop via COM. Reports: per-language HTML, generated from the same run data as the receipt chain.

© 2026 TuYi Workshop · private beta
