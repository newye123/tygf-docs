from pathlib import Path
from bs4 import BeautifulSoup
import json,re
root=Path(__file__).resolve().parents[1]
src=root/'reference/original-execution-report.html'
soup=BeautifulSoup(src.read_text(encoding='utf-8'),'html.parser')
def norm(x): return re.sub(r'\s+',' ',x.get_text(' ',strip=True))
def section_for(phrase):
    h=next((h for h in soup.find_all(['h2','h3']) if phrase in h.get_text(' ',strip=True)),None)
    return h.find_parent(class_='section') if h else None
def table_rows(section, index=0):
    if not section:return []
    ts=section.select('table')
    if index>=len(ts): return []
    out=[]
    for tr in ts[index].select('tbody tr'):
        out.append([c.get_text('\n',strip=True) for c in tr.select('td')])
    return out
# Source header and summary cards
head=soup.select_one('.head')
header=norm(head) if head else ''
cards=[]
for c in soup.select('.card'):
    num=c.select_one('.num'); label=c.select_one('.label')
    cards.append({'value':num.get_text(strip=True) if num else '', 'label':label.get_text(' ',strip=True) if label else ''})
# top lead/next action
hero=section_for('处理结果：')
hero_text=norm(hero) if hero else ''
# tables
uncovered=table_rows(section_for('未覆盖（不在译文表）'))
unmatched=table_rows(section_for('表格侧未命中（行）'))
unchanged=table_rows(section_for('疑似未翻译（译文与原文相同）'))
deliveries=table_rows(section_for('语言交付'))
completeness=table_rows(section_for('交付完整性对照'))
outputs=table_rows(section_for('输出文件'))
layout=table_rows(section_for('版式需复核'))
# replacement details
rep_section=section_for('替换明细')
rep_tables=rep_section.select('table') if rep_section else []
replacements=[]
if rep_tables:
    for tr in rep_tables[-1].select('tbody tr'):
        c=[td.get_text('\n',strip=True) for td in tr.select('td')]
        if len(c)>=7:
            replacements.append({'status':c[0],'language':c[1],'layer_id':c[2],'source':c[3],'target':c[4],'translation_status':c[5],'readback':c[6]})
# Provenance records
prov_section=section_for('溯源信息')
provenance=[]
if prov_section:
    for rec in prov_section.select('.evidence-record'):
        title=rec.select_one('.evidence-title strong')
        vals={}
        for tr in rec.select('table tr'):
            cells=tr.find_all(['th','td'])
            if len(cells)>=2: vals[cells[0].get_text(' ',strip=True)]=cells[1].get_text(' ',strip=True)
        review=rec.select_one('.review-summary')
        provenance.append({'language':title.get_text(strip=True) if title else '', 'fields':vals, 'review_summary':review.get_text(' ',strip=True) if review else ''})
# Counts derived from replacement detail
from collections import Counter
same=[r for r in replacements if re.sub(r'\s+',' ',r['source']).strip()==re.sub(r'\s+',' ',r['target']).strip()]
num_missing=[]
for r in replacements:
    # Compare numeric/unit expressions conservatively: source has number+unit, target lacks the source unit token
    src=r['source']; tgt=r['target']
    if '2.8oz' in src and not re.search(r'2[.,]8\s*(?:oz|ounce)',tgt,re.I):
        num_missing.append({'language':r['language'],'layer_id':r['layer_id'],'source':src,'target':tgt,'signal':'Source contains 2.8oz; target text does not retain an oz value'})
# output
obj={
 'meta':{'title':'图译工坊执行报告','source_file':'(B级)Amazon-5857-主副图-8-祝叶子','updated_at':'2026-10-31 08:24:46','report_status':'已生成，需复查','source_filename':'图译工坊执行报告.html'},
 'source_summary':{'header':header,'hero_text':hero_text,'cards':cards},
 'derived_summary':{
  'write_operations':len(replacements),
  'languages':len(deliveries),
  'unique_text_objects_reported':37,
  'mapped_unique_objects_inferred':29,
  'uncovered_unique_objects':len(uncovered),
  'unchanged_exact_detail_count':len(same),
  'unchanged_exact_by_language':dict(Counter(r['language'] for r in same)),
  'numeric_unit_review_count':len(num_missing),
  'unmatched_rows_previewed_in_source_html':len(unmatched),
  'unmatched_rows_reported_total':432,
  'layout_review_count':len(layout)
 },
 'uncovered': [{'layer_path':r[0] if len(r)>0 else '', 'source_preview':r[1] if len(r)>1 else '', 'affected_languages':r[2] if len(r)>2 else ''} for r in uncovered],
 'unmatched_rows_preview': [{'language':r[0] if len(r)>0 else '', 'source_row_number':r[1] if len(r)>1 else '', 'source_preview':r[2] if len(r)>2 else ''} for r in unmatched],
 'unchanged_summary': [{'language':r[0] if len(r)>0 else '', 'reported_count':int(r[1]) if len(r)>1 and r[1].isdigit() else None, 'language_total':int(r[2]) if len(r)>2 and r[2].isdigit() else None} for r in unchanged],
 'deliveries': [{'language':r[0] if len(r)>0 else '', 'written_planned':r[1] if len(r)>1 else '', 'status':r[2] if len(r)>2 else '', 'design_file':r[3] if len(r)>3 else '', 'preview_link':r[4] if len(r)>4 else '', 'verification':r[5] if len(r)>5 else ''} for r in deliveries],
 'completeness': [{'language':r[0] if len(r)>0 else '', 'expected':r[1] if len(r)>1 else '', 'received':r[2] if len(r)>2 else '', 'status':r[3] if len(r)>3 else ''} for r in completeness],
 'outputs': [{'language':r[0] if len(r)>0 else '', 'type':r[1] if len(r)>1 else '', 'filename':r[2] if len(r)>2 else '', 'status':r[3] if len(r)>3 else ''} for r in outputs],
 'layout_review': [{'case':r[0] if len(r)>0 else '', 'language':r[1] if len(r)>1 else '', 'layer':r[2] if len(r)>2 else '', 'source':r[3] if len(r)>3 else '', 'target':r[4] if len(r)>4 else '', 'line_status':r[5] if len(r)>5 else ''} for r in layout],
 'replacements':replacements,
 'provenance':provenance,
 'derived_numeric_unit_review':num_missing,
 'data_quality_notes':[
  '报告汇总卡片的“已替换文字层 348”应按 12 种语言 × 29 次/语言解释为写入操作数，不应解释为唯一图层数。',
  '报告汇总显示疑似未翻译 83 条；逐条替换明细中严格原文等于译文的记录为 79 条。日语汇总为 6 条，但逐条明细只核对出 2 条。',
  '报告显示 8 个未覆盖文字对象，同时“未纳入替换”为 0，两个字段的统计口径没有解释。',
  '报告显示表格侧未命中 432 行，但当前 HTML 仅展示 200 条预览记录，且行号均为“—”。',
  '40 条版式复核均标为“比原稿宽”，行数状态均为“行数不变”；不能仅凭此认定发生溢出。',
  '替换明细中图层 6350 的 12 个语言目标值均未保留原文中的 2.8oz 数值，需确认是否允许只保留克数。',
  '“问题与待处理”写明本地回执未记录未验证对象，不应覆盖或抵消其它待复核问题。'
 ]
}
out=root/'reports/execution-report-data.json'
out.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
print('saved',out,'replacements',len(replacements),'unmatched preview',len(unmatched),'layout',len(layout),'uncovered',len(uncovered),'provenance',len(provenance),'numeric',len(num_missing),'same',len(same))
