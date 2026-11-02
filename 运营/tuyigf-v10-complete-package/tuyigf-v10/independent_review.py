from pathlib import Path
from bs4 import BeautifulSoup
from collections import Counter
import json,re
P=Path('/mnt/data/tuyigf-v10');s=(P/'tuyigf-complete-v10.html').read_text();doc=BeautifulSoup(s,'html.parser')
pages=[x.get('data-page') for x in doc.select('main.page[data-page]')]
ids=[x.get('id') for x in doc.select('[id]')]
duplicates={k:v for k,v in Counter(ids).items() if v>1}
hash_urls=[x.get('href') for x in doc.select('[href^="#/"]')]
marketing={'home','how','typography','solutions','product','demo','cases','security','pricing','guides','article','faq','pilot','login','signup','access'}
app={'overview','projects','files','tasks','typography','quality','deliveries','history','billing','team','settings','help'}
bad=[]
for href in hash_urls:
 p=href[2:].split('/');root=p[0]
 if root=='app':
  if len(p)>1 and p[1] not in app:bad.append(href)
 elif root not in marketing:bad.append(href)
externaljs=[el.get('src') for el in doc.select('script[src]')]
externalcss=[el.get('href') for el in doc.select('link[rel="stylesheet"]')]
styles=doc.select('style')
reports={
 'marketing_pages':len(pages),'marketing_page_names':pages,
 'duplicate_ids':duplicates,
 'broken_internal_hrefs':bad,
 'external_script_dependencies':externaljs,
 'external_stylesheet_dependencies':externalcss,
 'js_scripts':len(doc.select('script')),
 'self_contained':not externaljs and not externalcss,
 'font_matrix_routes':{'marketing':'typography' in pages,'workbench':'typography' in s[s.index('function wbPage'):s.index('function wbRoute')]},
 'typography_references':s.count('字体')+s.count('字距')+s.count('行距'),
 'explicit_demo_markers':s.count('模拟')+s.count('演示'),
 'fake_performance_claims_found':list(re.findall(r'(?:提升|节省|准确率)[^。\n]{0,20}\d+%',s))[:10]
}
(P/'independent-review.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
print(json.dumps(reports,ensure_ascii=False,indent=2))
