# Resume Prompt — Tuyi Workshop V15.0

Upload the complete Tuyi Workshop V15.0 ZIP to the new conversation, then paste:

> Continue the Tuyi Workshop project from the uploaded V15.0 package. First read `CONTEXT-HANDOFF.md`, then `handoff/00-START-HERE.md`, `handoff/DECISIONS-AND-CONSTRAINTS.md`, `handoff/CURRENT-STATE-AND-ROADMAP.md`, `docs/V15.0-ADVERSARIAL-REVIEW.md`, `docs/V15.0-SCAN-SCHEMA.md`, `docs/V15.0-API.md` and `docs/V15.0-QA-REPORT.md`. Treat the package as the source of truth. Do not assume missing context from previous chats.
>
> Current state: V15.0 read-only local PSD/PSB scanner is implemented as a developer preview. Backend/API/worker tests pass (31). Browser UI smoke passes with mocked API data and tests upload progress, mixed style-run display, task-copy SHA-256 disclosure and mobile layout. The build environment lacked `psd-tools` and could not access package network, so actual PSD/PSB parsing and Windows execution remain unverified. Do not claim production readiness.
>
> Technical follow-up completed: parser now prefers psd-tools `typesetting` and `font_names`, maps raw FontSet indexes as fallback, preserves per-run records where available, validates the full PSD header, runs the parser in a separate process with timeout and structural limits, caps worker JSON output, verifies task-copy SHA-256 before/after scanning, and blocks deletion of active scans.
>
> Immediate next step: validate V15.0 on Windows. Install Python 3.11+, run `install-v15-local-agent.bat`, then `run-v15-local-agent.bat`. Scan a small real PSD and PSB, compare extracted layer counts/text/font/bbox/text type/visibility/lock data against Photoshop, and record findings in `docs/V15.0-QA-REPORT.md`. Then build a 20-file compatibility corpus. Do not implement Photoshop write before the read-only parser passes.
>
> Preserve original V13/V14/V14.1 files. Every future delivery must include a full ZIP, updated handoff docs, changelog, implementation report and QA report. Keep the product boundary: approved translations only, local PSD/PSB workflow, no automatic translation or autonomous redesign.
