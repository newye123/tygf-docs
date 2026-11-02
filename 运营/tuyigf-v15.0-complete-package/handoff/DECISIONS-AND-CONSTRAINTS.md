# Decisions and Constraints

## Product scope

- Product name: 图译工坊 / Tuyi Workshop.
- Target: place approved multilingual translations into editable PSD/PSB text layers.
- Unit of work: design file × target language × text object.
- The product does not translate and does not autonomously redesign layouts.

## V15.0 scope lock

- Read-only PSD/PSB scan only.
- Browser uploads only the file explicitly selected by the user.
- No arbitrary local filesystem path scan endpoint.
- No Photoshop connection, write, save, flatten or export operation.
- No translation-table import or mapping yet.
- Default parser runs in a separate process with a timeout. This is not a full OS memory sandbox.

## Data semantics

- `object_id` is task-local and deterministic, not a permanent Photoshop layer ID.
- `layer_id` is recorded only when the parser exposes it.
- Null means unknown/unavailable; empty text means known empty content.
- `visible` is the layer's own visibility; `effective_visible` includes parent-group visibility where exposed.
- `font_names` preserves all PostScript names reported by the parser.
- `style_runs` preserves per-run text and typography data where the typesetting API exposes it. Summary font fields describe the first run; mixed-run layers remain partial.
- `task_copy_integrity_verified` confirms that the uploaded task copy's SHA-256 did not change during parsing. It is not a claim that the agent opened the original filesystem path.
- Parser confidence is a metadata completeness signal, not a correctness guarantee.
- Layer count and text-layer count are separate metrics.

## Security

- Local Agent binds to 127.0.0.1 only.
- Random per-process bearer token; Host and Origin validation.
- No remote model upload.
- User-selected upload is stored in a task-scoped local directory.
- Original PSD/PSB is never opened for writing.
- PSD header validation, upload limit, parser structural limits, worker timeout and worker-result cap are enforced.
- SHA-256 and append-only task events are recorded.
- Active scan deletion is blocked.

## Future write milestones

- Always create a task-scoped work copy.
- Never overwrite the original master.
- Require confirmed mappings and frozen typography settings.
- Verify readback, save and reopen independently.
- Human visual approval remains separate from machine validation.

## Delivery

Every release ZIP must contain README, CONTEXT-HANDOFF.md, handoff docs, changelog, implementation report and QA report. Keep V13/V14/V14.1 baselines.
