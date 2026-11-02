from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import re, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'tuyigf-v14-fullsite.html'
s = HTML.read_text(encoding='utf-8')

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.pages = []
        self.routes = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if 'id' in d:
            self.ids.append(d['id'])
        if tag == 'main' and 'data-page' in d:
            self.pages.append(d['data-page'])
        if tag == 'a' and d.get('href', '').startswith('#/'):
            self.routes.append(d['href'])

ins = Inspector()
ins.feed(s)
duplicates = [k for k, v in Counter(ins.ids).items() if v > 1]
assert not duplicates, f'duplicate ids: {duplicates[:20]}'
assert len(ins.pages) >= 12, f'expected 12+ public pages, got {len(ins.pages)}'
assert s.count('data:image/webp;base64,') >= 6, 'six screenshot references should be embedded'
assert 'function wbWizard(){' in s and '04' in s and '设计稿校对' in s, 'four-step app wizard missing'
assert 'function parseStudioDelimited' in s, 'local delimited text parser missing'
assert 'studioLoadTranslationFile' in s, 'local translation file reader missing'
assert 'batch-cell' in s and 'batch-next' in s, 'batch file-language matrix interactions missing'
assert 'Photoshop' in s and '不会扫描或写入 PSD' in s, 'simulation boundary disclosure missing'
assert 'function canAdvanceSingle()' in s and 'advanceHint()' in s, 'single workflow gates missing'
assert 'fileSelected' in s and 'sample-file' in s, 'design file selection gate missing'
assert 'v14-summary-grid' in s and 'v14OnlyIssues' in s, 'issue summary and filter missing'
assert 'function selectedOutputCodes()' in s and 'toggle-output-lang' in s, 'output language selection missing'
assert 'batchDetected' in s and 'batchConfirmed' in s and 'batchReport' in s, 'batch workflow gates/report state missing'
assert 'tuyigf-v14-visual-prototype' in s, 'V14 storage namespace missing'
assert not re.search(r'<script[^>]+src=', s, re.I), 'external JS dependency found'
assert not re.search(r'<link[^>]+href=', s, re.I), 'external stylesheet dependency found'

blocks = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', s, re.S | re.I)
for i, block in enumerate(blocks):
    tmp = ROOT / f'.check-script-{i}.js'
    tmp.write_text(block, encoding='utf-8')
    subprocess.run(['node', '--check', str(tmp)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tmp.unlink()

print('PASS: HTML parse')
print('PASS: unique element IDs')
print(f'PASS: {len(ins.pages)} public page shells')
print(f'PASS: {len(set(ins.routes))} internal route links')
print('PASS: six embedded workbench screenshots')
print('PASS: four-step app wizard and batch file-language interactions')
print('PASS: local CSV/TSV/TXT parser and file reader')
print(f'PASS: {len(blocks)} inline JavaScript blocks pass node --check')
print('PASS: no external JS/CSS dependencies')
