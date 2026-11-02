from pathlib import Path
import re
root=Path('/mnt/data/tuyigf-v10')
s=Path('/mnt/data/tuyigf-full-product-v9.html').read_text(encoding='utf-8')
home=(root/'home_v10.html').read_text(encoding='utf-8')
extra=(root/'extra_pages.html').read_text(encoding='utf-8')
css=(root/'v10.css').read_text(encoding='utf-8')
ty=(root/'typography_logic.js').read_text(encoding='utf-8')
wizard=(root/'wizard_v10.js').read_text(encoding='utf-8')
marketing=(root/'home_interactions.js').read_text(encoding='utf-8')

# Replace the complete home rather than piling new cards on V9's six-screen layout.
s,n=re.subn(r'<main class="page is-active" data-page="home" id="pageHome">.*?</main>',home,s,flags=re.S)
assert n==1,n
s=s.replace('<!-- 产品能力 -->',extra+'\n<!-- 产品能力 -->',1)
nav='''<nav class="site-nav" id="siteNav" aria-label="主导航">
      <a href="#/how" data-nav="how">怎么使用</a>
      <a href="#/typography" data-nav="typography">字体与排版</a>
      <a href="#/product" data-nav="product">产品能力</a>
      <a href="#/solutions" data-nav="solutions">适用场景</a>
      <a href="#/cases" data-nav="cases">真实实测</a>
      <a href="#/faq" data-nav="faq">常见问题</a>
      <a href="#/app/overview" data-nav="app" class="wb-navbar-preview-pill">模拟工作台 ↗</a>
    </nav>'''
s,n=re.subn(r'<nav class="site-nav" id="siteNav".*?</nav>',nav,s,count=1,flags=re.S)
assert n==1
s=s.replace('TUYI LAB · 2026 CONCEPT V9','TUYI LAB · 2026 CONCEPT V10').replace('完整营销站 + SaaS 工作台 · 演示任务和报告均为模拟 · 未接入真实 Photoshop','全站 UI/UX + 独立字体管理工作台 · 所有操作均为模拟 · 未接入真实 Photoshop')
s=s.replace('const allowedPages=["home","product","demo","cases","security","pricing","guides","article","faq","pilot"];', 'const allowedPages=["home","how","typography","solutions","product","demo","cases","security","pricing","guides","article","faq","pilot"];')
s=s.replace('page==="home"?"图译工坊 · 一套 PSD，多语言批量处理 · V9":','page==="home"?"图译工坊 · 多语言 PSD 批量改稿与独立字体配置 · V10":')
s=s.replace('({product:"产品能力",demo:', '({how:"怎么使用",typography:"字体与排版",solutions:"适用场景",product:"产品能力",demo:')
s=s.replace('route();setFlow(0);setHomeLang("EN");renderDemo();','route();renderDemo();')
s=s.replace('storyLink.textContent="▶ 观看 4 步流程动画（模拟）";', 'storyLink.textContent="▶ 观看 4 步流程动画（模拟）";')
# Embed new typography feature inside the legacy product capability detail page.
feature='''<div class="v10-callout" style="margin-bottom:26px"><h3>重点能力：每一份 PSD × 每一个目标语言，独立指定字体与字符参数</h3><p>可设字体、字号、字距、行距与自动字距方式。语言默认预设与单文件覆盖层级清楚，最终视觉仍由设计师检查。下面可直接进入可交互字体矩阵。</p><div class="v10-section-action" style="justify-content:flex-start"><a class="btn btn-primary" href="#/typography">查看规则与示例 ↗</a><a class="btn btn-outline" href="#/app/typography">打开模拟配置工作台 ↗</a></div></div>'''
start=s.index('<main class="page" data-page="product">')
pos=s.index('<div class="stack-cards">',start)
s=s[:pos]+feature+'\n    '+s[pos:]
s=s.replace('版面与字体细节</h3><p>译文长度、换行结构、目标语言字形与特殊字符可能影响视觉，需人工确认。','独立字符参数与视觉检查</h3><p>可以逐语言、逐文件指定字体和字符参数；译文长度、字形及最终换行仍需人工检查。')
# Workbench navigation for true file-by-language typography editor.
s=s.replace("['tasks','批处理任务','stack'],['quality','质量检查','shield']", "['tasks','批处理任务','stack'],['typography','字体与排版','settings'],['quality','质量检查','shield']")
s=s.replace("tasks:'批处理任务',quality:'质量检查'", "tasks:'批处理任务',typography:'字体与排版',quality:'质量检查'")
s=s.replace("const WB_STORE='tuyigf-v9-workbench-demo'", "const WB_STORE='tuyigf-v10-workbench-demo'")
s=s.replace("if(section==='tasks')return detail==='new'?wbWizard():detail?wbTaskDetail(detail):wbTasks();", "if(section==='tasks')return detail==='new'?wbWizard():detail?wbTaskDetail(detail):wbTasks();\n if(section==='typography')return wbTypography();")
assert 'function wbPage(path)' in s
s=s.replace('function wbPage(path)', ty+'\nfunction wbPage(path)',1)
start=s.index('function wbWizard(){')
end=s.index('function wbOverlay(){',start)
s=s[:start]+wizard+'\n'+s[end:]
s=s.replace("wbUI.wizard=Math.min(3,wbUI.wizard+1);wbRerender();break;","wbUI.wizard=Math.min(4,wbUI.wizard+1);wbRerender();break;")
# The task detail preserves a readable snapshot of the typography intent.
s=s.replace('</div>${main}`}', '</div>${main}${tyTaskSnapshot(t)}`}', 1)
s=s.replace('<h2>核验状态</h2><p>真实文件产生：否', '<h2>字符参数快照（仅前端模拟）</h2><pre>${wbEsc(JSON.stringify(t.styleSnapshot||{},null,2))}</pre><h2>核验状态</h2><p>真实文件产生：否')
# Include task-snapshot for inspection in the final confirmation and future reporting.
s=s.replace("note:'仅记录样例 CSV 与未验证任务范围',logs:['新建本地模拟批次。尚未运行 Photoshop。']", "note:'仅记录样例 CSV、字体规则与未验证任务范围',styleSnapshot:Object.fromEntries(wbUI.wizardLangs.map(l=>[l,tyEffective(p.id,wbUI.wizardFile,l).style])),logs:['新建本地模拟批次。字体规则已记录，但尚未运行 Photoshop。']")
s=s.replace("<div class=\"wb-card-title\"><h3>排版相关偏好（本地模拟）</h3>","<div class=\"wb-card-title\"><h3>通用排版偏好（本地模拟）</h3>")
s=s.replace("更改不会影响真实图层或正式账户偏好。</div></div></div>","更改不会影响真实图层或正式账户偏好。请在文件 × 语言矩阵设置本次任务的具体字体与字符参数。</div><div style=\"margin-top:13px\"><a href=\"#/app/typography\" class=\"wb-btn primary\">打开字体与排版矩阵</a></div></div></div>")
s=s.replace(' V9 · 交互原型',' V10 · 交互原型').replace('V9-SIMULATED','V10-SIMULATED').replace('V9-demo','V10-demo').replace('V9 概念原型','V10 概念原型')
# Marketing interactions must load after the V9 JavaScript (which now only owns the legacy demo and subpages).
s=s.replace('</style>',css+'\n@media(max-width:980px){#wbWizardLayout{grid-template-columns:1fr!important}}\n@media(max-width:720px){.palette-switcher{display:none}}\n@media(max-width:480px){.v10-hero h1{font-size:35px}}\n</style>',1)
i=s.rfind('</body></html>')
assert i>0
s=s[:i]+marketing+'\n'+s[i:]
s=s.replace('<title>图译工坊 · 一套 PSD，多语言批量处理 · V9</title>','<title>图译工坊 · 多语言 PSD 批量改稿与独立字体配置 · V10</title>')
s=s.replace('将已确认的多语言译文批量写入 Photoshop PSD/PSB 文字图层。逐项审查匹配与异常，交付可复核。','将已有译文匹配到 Photoshop PSD/PSB 文字图层，按文件和语言独立指定字体、字号、字距与行距，执行批处理与交付复核。')
assert '独立字体配置' in s and 'wbTypography()' in s and 'wbTyWizard()' in s and 'data-page="typography"' in s
output=root/'tuyigf-complete-v10.html'
output.write_text(s,encoding='utf-8')
Path('/mnt/data/tuyigf-complete-v10.html').write_text(s,encoding='utf-8')
print('BUILT',output, 'bytes',len(s.encode('utf-8')),'marketing',len(re.findall(r'<main class="page',s)))
