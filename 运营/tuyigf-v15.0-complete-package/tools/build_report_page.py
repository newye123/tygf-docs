from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
template=(root/'reports/report-template.html').read_text(encoding='utf-8')
data=json.dumps(json.loads((root/'reports/execution-report-data.json').read_text(encoding='utf-8')),ensure_ascii=False,separators=(',',':'))
data=data.replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
html=template.replace('__DATA__',data)
(root/'execution-report-redesign.html').write_text(html,encoding='utf-8')
print('built execution-report-redesign.html',len(html),'chars')
