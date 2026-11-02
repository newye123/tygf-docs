from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path

from app.scanner import scan_psd_file


def main() -> int:
    if len(sys.argv) != 4:
        return 64
    source = Path(sys.argv[1])
    source_hash = sys.argv[2]
    result_path = Path(sys.argv[3])
    try:
        summary, layers = scan_psd_file(source, source_hash=source_hash)
        payload = {"summary": summary, "layers": layers}
        result_path.write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False), encoding="utf-8")
        return 0
    except Exception as exc:
        payload = {"error": f"{type(exc).__name__}: {exc}"}
        try:
            result_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
