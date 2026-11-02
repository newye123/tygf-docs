from __future__ import annotations

import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from run import choose_port


def test_port_picker_falls_forward_when_preferred_port_is_busy():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as blocker:
        blocker.bind(("127.0.0.1", 0))
        preferred = blocker.getsockname()[1]
        if preferred >= 65515:
            return
        selected = choose_port(preferred)
        assert selected > preferred
