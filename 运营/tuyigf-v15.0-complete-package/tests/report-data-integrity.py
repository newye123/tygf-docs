from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'reports/execution-report-data.json').read_text(encoding='utf-8'))
assert len(d['replacements']) == 348
assert len(d['deliveries']) == 12
assert all(x['written_planned']=='29 / 29' for x in d['deliveries'])
assert len(d['uncovered']) == 8
assert len(d['layout_review']) == 40
assert len(d['unmatched_rows_preview']) == 200
assert d['derived_summary']['unmatched_rows_reported_total'] == 432
assert len(d['derived_numeric_unit_review']) == 12
assert d['derived_summary']['unchanged_exact_detail_count'] == 79
assert len(d['provenance']) == 12
print('PASS: 348 replacement operations')
print('PASS: 12 languages x 29/29')
print('PASS: 8 uncovered, 40 layout review, 200/432 unmatched preview')
print('PASS: 12 specification review rows')
print('PASS: 79 exact unchanged details vs 83 report aggregate')
print('PASS: 12 provenance records')
