from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys,traceback
F=Path('/mnt/data/tuyigf-complete-v10.html')
P=Path('/mnt/data/tuyigf-v10')
routes=['home','how','typography','solutions','product','demo','cases','security','pricing','guides','article/table','faq','pilot','login','signup','access','app/overview','app/projects','app/projects/P-NOVA','app/files','app/tasks','app/tasks/new','app/tasks/B-1029','app/typography','app/quality','app/quality/Q-201','app/deliveries','app/deliveries/B-1029','app/history','app/billing','app/team','app/settings','app/help']
errors=[];console=[];checks=[];screenshots=[];route_results=[]
def check(name,fn):
 try: fn();checks.append({'test':name,'result':'pass'})
 except Exception as e:checks.append({'test':name,'result':'fail','error':str(e)})
def goto(page,path):
 page.evaluate('(path)=>{location.hash="#/"+path}',path)
 page.wait_for_timeout(105)

def click(page,selector):page.locator(selector).first.click(timeout=6000);page.wait_for_timeout(100)

def assert_contains(page,selector,string):
 text=page.locator(selector).first.text_content() or ''
 assert string in text,f'expected {string!r} in {text[:200]!r}'
def assert_contains_file(path,string):
 assert string in Path(path).read_text(encoding='utf-8')
def assert_json(path):
 x=json.loads(Path(path).read_text());assert 'typography' in x and 'overrides' in x['typography']


with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,accept_downloads=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console.append(m.text) if m.type=='error' else None)
 page.set_content(F.read_text(encoding='utf-8'),wait_until='load')
 page.wait_for_timeout(300)
 for path in routes:
  goto(page,path)
  root=path.split('/')[0]
  if root=='app':ok=page.locator('#appShell:visible').count()==1 and page.locator('.wb-sidebar:visible').count()==1
  elif root in ['login','signup','access']:ok=page.locator('#authShell:visible').count()==1
  else:ok=page.locator(f'main[data-page="{root}"]:visible').count()==1
  overflow=page.evaluate('document.documentElement.scrollWidth-window.innerWidth')
  heading=page.locator('h1:visible').first.text_content() if page.locator('h1:visible').count() else ''
  route_results.append({'route':path,'ok':ok,'overflow':overflow,'heading':heading[:60]})
  if path=='home':page.screenshot(path=str(P/'v10-home-desktop.png'))
  if path=='app/overview':page.screenshot(path=str(P/'v10-workspace-desktop.png'))
  if path=='app/typography':page.screenshot(path=str(P/'v10-typography-desktop.png'))
  if path=='app/tasks/new':page.screenshot(path=str(P/'v10-wizard-desktop.png'))
  if path=='app/quality/Q-201':page.screenshot(path=str(P/'v10-review-desktop.png'))
 goto(page,'home')
 check('hero switches file and language',lambda:(click(page,'[data-v10-file="detail.psb"]'),click(page,'[data-v10-language="JA"]'),assert_contains(page,'#v10HeroFont','Noto Sans JP'),assert_contains(page,'#v10HeroSize','24 pt')))
 check('matrix switch updates hero',lambda:(click(page,'[data-v10-matrix="hero.psd|DE"]'),assert_contains(page,'#v10HeroSize','32 pt')))
 goto(page,'app/typography')
 # current file from P-NOVA main, DE
 check('font matrix initially populated',lambda:assert_contains(page,'.wb-ty-matrix-grid','nova_a_plus.psb'))
 def save_main():
  page.locator('#tyFamily').select_option(label='Arial');page.locator('#tySize').fill('35');page.locator('#tyTracking').fill('18');page.locator('#tyLeading').fill('42');click(page,'[data-ty-action="save"]');assert_contains(page,'.wb-ty-matrix-grid','Arial')
 check('per-file save',save_main)
 def select_other():
  page.locator('#tyFile').select_option(label='nova_a_plus.psb');page.wait_for_timeout(100)
  assert page.locator('#tyFamily').input_value()=='DIN',page.locator('#tyFamily').input_value()
  assert page.locator('#tySize').input_value()=='22',page.locator('#tySize').input_value()
 check('other PSD retains different DE font',select_other)
 def return_main():
  page.locator('#tyFile').select_option(label='nova_launch.psd');page.wait_for_timeout(100)
  assert page.locator('#tyFamily').input_value()=='Arial',page.locator('#tyFamily').input_value()
  assert page.locator('#tySize').input_value()=='35',page.locator('#tySize').input_value()
 check('return to original PSD retains style',return_main)
 def save_jp():
  click(page,'[data-ty-cell="nova_launch.psd"][data-ty-lang="JA"]')
  assert page.locator('#tyFamily').input_value()=='Noto Sans JP'
  page.locator('#tyLeading').fill('40');click(page,'[data-ty-action="save"]')
  assert page.locator('#tyLeading').input_value()=='40'
 check('JA independently editable',save_jp)
 def reset_jp():
  click(page,'[data-ty-action="reset"]')
  assert page.locator('#tyLeading').input_value()==''
 check('reset to language default',reset_jp)
 def default_preserved_override():
  click(page,'[data-ty-cell="nova_launch.psd"][data-ty-lang="DE"]')
  click(page,'[data-ty-scope="language"]')
  page.locator('#tyFamily').select_option(label='Noto Sans SC');click(page,'[data-ty-action="save"]')
  click(page,'[data-ty-cell="nova_a_plus.psb"][data-ty-lang="DE"]')
  assert page.locator('#tyFamily').input_value()=='DIN',page.locator('#tyFamily').input_value()
  click(page,'[data-ty-cell="nova_launch.psd"][data-ty-lang="DE"]')
  assert page.locator('#tyFamily').input_value()=='Arial',page.locator('#tyFamily').input_value()
 check('language default does not override specific PSDs',default_preserved_override)
 with page.expect_download() as d:click(page,'[data-ty-action="download"]')
 d.value.save_as(P/'sample-typography-export.json')
 check('typography JSON download',lambda:assert_json(P/'sample-typography-export.json'))
 goto(page,'app/tasks/new')
 def wizard_flow():
  click(page,'[data-wb-action="wizard-next"]')
  assert page.get_by_text('导入已有译文',exact=False).count()>0
  click(page,'[data-wb-action="wizard-next"]')
  assert page.get_by_text('译文结构与风险检查',exact=False).count()>0
  click(page,'[data-wb-action="wizard-next"]')
  assert page.get_by_text('本批次的字体和字符参数',exact=False).count()>0
  page.locator('#tywFamily').select_option(label='Arial')
  page.locator('#tywSize').fill('29')
  click(page,'[data-ty-action="wizard-save"]')
  assert page.locator('#tywSize').input_value()=='29'
  click(page,'[data-wb-action="wizard-next"]')
  assert page.get_by_text('提交前的设置摘要',exact=False).count()>0
  assert page.get_by_text('Arial · 29pt',exact=False).count()>0
  click(page,'[data-wb-action="wizard-create"]')
  assert 'tasks/' in page.evaluate('location.hash'),page.evaluate('location.hash')
 check('new batch 5-step flow with typography',wizard_flow)
 goto(page,'app/quality/Q-201')
 check('issue approval continues to work',lambda:(click(page,'[data-wb-action="approve-issue"]'),assert_contains(page,'#wbContent','已确认')))
 goto(page,'app/deliveries/B-1029')
 with page.expect_download() as d:click(page,'[data-wb-action="download-report"]')
 d.value.save_as(P/'sample-report.html')
 check('delivery report contains simulation disclaimer',lambda:assert_contains_file(P/'sample-report.html','非真实生产报告'))
 # mobile content & overflow
 m=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
 m.on('pageerror',lambda e:errors.append('mobile:'+str(e)))
 m.set_content(F.read_text(encoding='utf-8'),wait_until='load');m.wait_for_timeout(200)
 mobiles=[]
 for path,screenshot in [('home','v10-home-mobile.png'),('how','v10-how-mobile.png'),('typography','v10-typography-marketing-mobile.png'),('app/overview','v10-workspace-mobile.png'),('app/typography','v10-typography-mobile.png'),('app/tasks/new','v10-wizard-mobile.png')]:
  goto(m,path)
  overflow=m.evaluate('document.documentElement.scrollWidth-window.innerWidth')
  mobiles.append({'route':path,'overflow':overflow})
  m.screenshot(path=str(P/screenshot))
 try:
  goto(m,'app/typography')
  click(m,'#wbMobileMenu')
  assert m.locator('.wb-shell.wb-menu-open').count()==1
  checks.append({'test':'mobile navigation','result':'pass'})
 except Exception as e:checks.append({'test':'mobile navigation','result':'fail','error':str(e)})
 b.close()
res={'routes':route_results,'interactions':checks,'pageerrors':errors,'consoleErrors':console,'mobile':mobiles}
(P/'qa-results.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
print(json.dumps({'routes':len(routes),'route_failures':[x for x in route_results if not x['ok']],'desktop_overflow':[x for x in route_results if x['overflow']>4],'mobile_overflow':[x for x in mobiles if x['overflow']>4],'interaction_failures':[x for x in checks if x['result']!='pass'],'js_errors':errors,'console_errors':console[:8]},ensure_ascii=False,indent=2))

def_exists=None
