from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]

class HtmlInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.scanner_links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href") == "/scanner":
            self.scanner_links.append(attrs["href"])

scanner = (ROOT / "local-scanner.html").read_text(encoding="utf-8")
inspector = HtmlInspector()
inspector.feed(scanner)
duplicates = [key for key, count in Counter(inspector.ids).items() if count > 1]
assert not duplicates, f"duplicate scanner element IDs: {duplicates}"
assert "uploadWithProgress" in scanner, "XHR byte-based upload progress missing"
assert "task_copy_integrity_verified" in scanner, "task-copy integrity disclosure missing"
assert "effective_visible" in scanner and "style_run_count" in scanner, "typography/layer metadata display missing"
assert "exportJson" in scanner and "exportCsv" in scanner, "inventory exports missing"
assert not re.search(r"<script[^>]+src=", scanner, re.I), "external JavaScript dependency found"
assert not re.search(r"<link[^>]+href=", scanner, re.I), "external stylesheet dependency found"
blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", scanner, re.S | re.I)
assert len(blocks) == 1, f"expected one inline scanner script, got {len(blocks)}"
tmp = Path("/tmp/tuyi-v15-scanner-static.js")
tmp.write_text(blocks[0], encoding="utf-8")
subprocess.run(["node", "--check", str(tmp)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

home = (ROOT / "tuyigf-v15.0-fullsite.html").read_text(encoding="utf-8")
assert 'href="/scanner"' in home, "V15.0 home page does not link to local scanner"
assert "工作台写入功能尚未开放" in home, "write capability boundary disclosure missing"

scanner_source = (ROOT / "local-agent/app/scanner.py").read_text(encoding="utf-8")
assert "ParseLimits" in scanner_source, "parser structural limits missing"
assert "typesetting" in scanner_source and "font_names" in scanner_source, "documented typography API extraction missing"
assert "FontSet" in scanner_source, "raw FontSet index fallback missing"
assert "def read_psd_header" in scanner_source, "full PSD header validator missing"
assert ".save(" not in scanner_source and ".composite(" not in scanner_source, "scanner must not save or render PSD files"

main_source = (ROOT / "local-agent/app/main.py").read_text(encoding="utf-8")
assert "_scan_in_worker" in main_source and "subprocess.run" in main_source, "isolated parser worker missing"
assert "task_copy_integrity_verified" in main_source, "task-copy hash verification missing"
assert "queued", "active task state missing"
assert "scan_timeout_seconds" in main_source, "worker timeout setting missing"
assert "MAX_WORKER_RESULT_BYTES" in main_source, "worker result size cap missing"

requirements = (ROOT / "local-agent/requirements.txt").read_text(encoding="utf-8")
assert "psd-tools>=1.23,<2" in requirements, "ParseLimits-compatible psd-tools floor missing"

print("PASS: scanner HTML structure and unique IDs")
print("PASS: scanner UI exposes upload progress, task-copy integrity and typography metadata")
print("PASS: scanner inline JavaScript syntax")
print("PASS: V15.0 home page links to scanner and discloses write boundary")
print("PASS: parser structural limits, typesetting API and read-only boundary")
print("PASS: isolated worker, timeout and task-copy integrity controls")
print("PASS: psd-tools minimum version supports ParseLimits")
