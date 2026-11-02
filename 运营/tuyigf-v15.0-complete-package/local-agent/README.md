# Tuyi Workshop V15.0 Local Agent

Windows-first local PSD/PSB read-only inspector. It is intentionally limited to file inspection and inventory export. Photoshop connection and all write operations are disabled.

## Quick start (Windows 10/11)

1. Install Python 3.11+ and ensure the Python Launcher (`py`) is available.
2. Double-click `install-v15-local-agent.bat` in the project root. This creates `local-agent/.venv` and installs dependencies.
3. Double-click `run-v15-local-agent.bat` in the project root.
4. The browser opens `http://127.0.0.1:8765/scanner` (or the next available loopback port if 8765 is busy).
5. Choose a PSD or PSB file, run the scan, then export JSON or CSV.

The first installation requires network access to download Python packages. The included project ZIP does not vendor Python wheels.

## What V15.0 reads

- PSD / PSB canvas width, height, color mode, depth, and channel count where available.
- Layer tree, group path, layer name and parser layer ID where available.
- Editable text-layer content and point/paragraph text type where exposed.
- Layer visibility and effective visibility through parent groups where exposed.
- Lock state, opacity, bounding box and transform metadata where exposed.
- Font family/PostScript names, style, size, leading and tracking where exposed.
- Character style-run records through the psd-tools typesetting API where available.
- Parser confidence, missing metadata notes and unsupported-feature flags.

Unknown values remain `null` / “unknown”. They are never inferred. Summary font fields describe the first style run; `font_names` and `style_runs` preserve the other character styles when the parser exposes them.

## Security and file handling

- The server binds to `127.0.0.1` only.
- API requests use a random per-process bearer token and same-origin checks.
- The browser uploads only the file the user explicitly selected. The agent has no arbitrary-path scan endpoint.
- The uploaded task copy is stored under `local-agent/data/scans/<scan-id>/` for the scan record.
- The default parser runs in a separate worker process with a 20-minute timeout. The timeout is configurable with `TUYI_SCAN_TIMEOUT_SECONDS` (minimum 30 seconds).
- The parser uses psd-tools structural limits and the worker output is capped at 512 MiB.
- SHA-256 is calculated before and after parsing. The task is marked complete only if the task-scoped copy remains byte-identical. This verifies the uploaded task copy; the agent does not open the original filesystem path.
- Deleting a queued or scanning task is blocked. Delete completed/failed tasks when you no longer want their source copy retained.
- No PSD content is sent to a remote model or service.

## Important parser boundary

The scanner uses `psd-tools>=1.23`. PSD/PSB text metadata support depends on document features and parser version. Some Photoshop text features, linked smart objects, variable fonts, vertical/warped text and effects may not be fully represented. A successful structural scan is not proof that the document will render identically in Photoshop.

V15.0 does not connect to Photoshop. It does not write text, change fonts, save PSD/PSB, export JPG/PNG or approve layout. Those capabilities are later milestones and require separate release gates.

## Development tests

```powershell
cd local-agent
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m pytest -q
```

The test suite includes parser-adapter unit tests with controlled fake layer objects and API/security/worker tests. The browser UI smoke test is run from the project root:

```powershell
python tests\v15-scanner-browser-smoke.py
```

These tests do not replace a real Photoshop-generated PSD/PSB compatibility corpus. Before production use, validate at least 20 representative files against Photoshop manually.
