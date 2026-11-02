from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn

AGENT_DIR = Path(__file__).resolve().parent
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))


def choose_port(preferred: int) -> int:
    for port in range(preferred, min(preferred + 20, 65536)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("No available loopback port found in the configured range.")


def open_browser():
    time.sleep(1.4)
    port = int(os.environ.get("TUYI_PORT", "8765"))
    webbrowser.open(f"http://127.0.0.1:{port}/scanner")


if __name__ == "__main__":
    if sys.version_info < (3, 11):
        raise SystemExit("Python 3.11 or newer is required.")
    preferred = int(os.environ.get("TUYI_PORT", "8765"))
    actual_port = choose_port(preferred)
    os.environ["TUYI_PORT"] = str(actual_port)
    if actual_port != preferred:
        print(f"Port {preferred} is busy. Using 127.0.0.1:{actual_port} instead.")
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=actual_port, reload=False, access_log=False)
