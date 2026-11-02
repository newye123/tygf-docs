
(() => {
"use strict";
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escapeHtml = str => String(str ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const normalize = s => String(s ?? "").trim().replace(/\s+/g," ").toLowerCase();
let toastTimer;
function toast(msg){const el=$("#toast"); if(!el)return;el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3100)}
function downloadText(name,content,mime="text/plain;charset=utf-8"){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
async function copyText(text){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);toast("已经复制到剪贴板");return}}
  catch(e){}
  const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.left="-9999px";document.body.append(ta);ta.select();
  try{document.execCommand("copy");toast("已经复制到剪贴板")}catch(e){toast("无法自动复制，请手动选择内容")}
  ta.remove()
}
const allowedPages=["home","product","demo","cases","security","pricing","guides","article","faq","pilot"];
function route(){
  const hash=decodeURIComponent((location.hash||"#/home").replace(/^#\/?/,""));
  const parts=hash.split("/").filter(Boolean);
  const page=allowedPages.includes(parts[0])?parts[0]:"home";
  $$(".page").forEach(x=>x.classList.toggle("is-active",x.dataset.page===page));
  $$("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===page));
  const nav=$("#siteNav");nav.classList.remove("open");
  $("#menuToggle")?.setAttribute("aria-expanded","false");
  if(page==="article")renderArticle(parts[1]||"table");
  if(page==="demo"){setDemoStage(demo.step);renderDemo()}
  document.title=page==="home"?"图译工坊 · 一套 PSD，多语言批量处理":({product:"产品能力",demo:"交互演示",cases:"PSD Stress Test",security:"数据与隐私",pricing:"计费说明",guides:"设计指南",article:"设计指南",faq:"常见问题",pilot:"真实项目试跑"}[page]||"图译工坊")+" | 图译工坊";
  window.scrollTo({top:0,behavior:"instant"})
}
window.addEventListener("hashchange",route);
$("#menuToggle")?.addEventListener("click",()=>{const open=$("#siteNav").classList.toggle("open");$("#menuToggle").setAttribute("aria-expanded",String(open))});
const homeLang={
 EN:{title:"Ready for the outdoors.",cta:"Shop now →",a:"原稿基准内容",b:"字体与行宽基线",c:"视觉终检仍需人工"},
 DE:{title:"Bereit für jedes neue Abenteuer.",cta:"Jetzt kaufen →",a:"德语文字变长",b:"复核字宽、折行与空间",c:"确认按钮与主标题边距"},
 FR:{title:"Prêt pour toutes vos aventures.",cta:"Découvrir →",a:"法语译文长度变化",b:"复核字重、词间距",c:"检查对齐与整体层级"},
 JA:{title:"どんな冒険にも、軽やかに。",cta:"詳しく見る →",a:"日语字符与排版规则",b:"检查日文字体与禁则",c:"核对字号及视觉层级"},
 ES:{title:"Listo para cada aventura.",cta:"Comprar ahora →",a:"西语标题与按钮变化",b:"检查按钮文案宽度",c:"检查位置和对齐"}
};
function setHomeLang(lang){
 const data=homeLang[lang]||homeLang.EN;
 $("#homeSampleTitle").textContent=data.title;$("#homeSampleCTA").textContent=data.cta;
 $("#homeIssue1").textContent=data.a;$("#homeIssue2").textContent=data.b;$("#homeIssue3").textContent=data.c;
 $$("[data-hlang]").forEach(el=>el.classList.toggle("active",el.dataset.hlang===lang))
}
$$("[data-hlang]").forEach(el=>el.addEventListener("click",()=>setHomeLang(el.dataset.hlang)));
const flowSteps=[
 {pill:"STEP 01",eyebrow:"INPUT REVIEW",title:"先准备素材，再开始处理。",desc:"选择本机设计稿与已有译文，阅读文字图层信息，检查目标语言列是否与任务一致。",rows:[["product_launch.psd","本机设计稿"],["translations.csv","已有译文表"],["DE · FR · JA · ES","目标语种"]]},
 {pill:"STEP 02",eyebrow:"MATCH & REVIEW",title:"模糊对象先留给你决定。",desc:"逐项对账，把缺译文、同文多译、无法编辑和可能影响版式的内容单独分类。",rows:[["Hero / Title","可匹配"],["CTA / Shop now","存在多个候选"],["Badge / Rasterized","不可可靠写入"]]},
 {pill:"STEP 03",eyebrow:"LOCAL EXECUTION",title:"明确项进入本机执行队列。",desc:"本地助手驱动 Photoshop 写入已确认的目标内容，并依据正式产品工作流读取检查结果。",rows:[["Windows Helper","本机运行"],["Photoshop","文字图层处理"],["Read-back","检查文字一致性"]]},
 {pill:"STEP 04",eyebrow:"DELIVERY & TRACE",title:"把结果和例外一起交付。",desc:"区分已经执行、未处理、失败以及需要设计师视觉确认的对象。输出与报告共同构成可追溯交付。",rows:[["localized_DE.psd","正式任务输出示意"],["preview_DE.jpg","逐语言视觉预览"],["review-report.html","异常与处理记录"]]}
];
function setFlow(index){
 const x=flowSteps[index]||flowSteps[0];
 $("#flowPill").textContent=x.pill;$("#flowEyebrow").textContent=x.eyebrow;$("#flowTitle").textContent=x.title;$("#flowDesc").textContent=x.desc;
 $("#flowRows").innerHTML=x.rows.map(([a,b])=>`<div class="workflow-visual-row"><span>${escapeHtml(a)}</span><span>${escapeHtml(b)}</span></div>`).join("");
 $$("[data-flow]").forEach(btn=>btn.classList.toggle("active",Number(btn.dataset.flow)===index));
}
$$("[data-flow]").forEach(btn=>btn.addEventListener("click",()=>setFlow(Number(btn.dataset.flow))));
const SAMPLE_CSV=[
 'source,DE,FR,JA,ES',
 '"Ready for the outdoors","Bereit für jedes neue Abenteuer","Prêt pour toutes vos aventures","どんな冒険にも、軽やかに","Listo para cada aventura"',
 '"Shop now","Jetzt kaufen","Acheter","今すぐ購入","Comprar ahora"',
 '"Lightweight design","Leichtes und besonders kompaktes Design","Conception légère","軽量設計","Diseño ligero"',
 '"Free shipping","Kostenloser Versand","Livraison offerte","送料無料","Envío gratis"',
 '"Shop now","Hier bestellen","Commander","購入する","Compra ahora"',
 '"Limited offer","Nur kurze Zeit","Offre limitée","期間限定","Oferta limitada"',
 '"Warranty information","","Informations de garantie","保証情報","Información de garantía"'
].join("\n");
const LAYERS=[
 {path:"Hero / Headline",source:"Ready for the outdoors",editable:true},
 {path:"Hero / CTA",source:"Shop now",editable:true},
 {path:"Feature / Description",source:"Lightweight design",editable:true},
 {path:"Feature / Shipping",source:"Free shipping",editable:true},
 {path:"Footer / CTA",source:"Shop now",editable:true},
 {path:"Badge / Rasterized",source:"Limited offer",editable:false},
 {path:"Footer / Legal",source:"Warranty information",editable:true}
];
const LANGUAGE_NAME={DE:"German",FR:"French",JA:"Japanese",ES:"Spanish"};
const articleMap={
 table:{title:"怎么准备适合 PSD 批量改语言的译文表？",subtitle:"对象、原文和语言列的组织方式，决定后续匹配的确定性。",html:`<h2>一行代表一个可核对对象</h2><p>先把要处理的设计稿中的可编辑文字对象整理出来。理想情况下，译文表同时记录对象标识、所在页面、原文以及每个目标语言的译文。若同一文字层原本包含多行，通常让这个对象继续占据一行表格，以免误拆成多个目标。</p><h2>重复原文要带上下文</h2><p>例如“Shop now”可能同时出现在首屏按钮和页脚按钮。即使原文相同，也应明确对应图层路径及版面角色。同文多译时，先由人工确认每一处的译文，避免进行全局猜测。</p><h2>导入前建议检查</h2><ul><li>每个目标语言列使用稳定的语言代码，如 DE、FR、JA、ES。</li><li>确认空白单元格是否有意保留原文。</li><li>技术型号、商标和尺寸单位需要统一规则。</li><li>保留原始译文版本，方便后续审计和回退。</li></ul><p>在交互演示中可以使用样例 CSV 测试重复原文与空译文的提示逻辑。</p>`},
 typography:{title:"为什么写入一致，版式还需要单独复核？",subtitle:"字符、字体与版面约束共同决定最终的视觉结果。",html:`<h2>文字长度只是初步信号</h2><p>德语复合词和法语表达可能增加文字占用空间。相同的字符数量，在不同字体、字重和字号下也会产生不同宽度。仅凭字符串长度无法准确预测 Photoshop 中的溢出。</p><h2>语言的排版规则存在差异</h2><p>日语禁则、标点悬挂、连续英文与全角字符混排，以及阿拉伯文从右向左的书写方向，都会对排版造成影响。应使用与正式任务一致的字体、语言设置和 Photoshop 版本进行复核。</p><h2>最小视觉检查清单</h2><ul><li>字符是否出现缺字形、替代字体或错误编码。</li><li>标题、按钮、正文的断行是否符合设计意图。</li><li>文字是否挤压其他元素或遮挡产品画面。</li><li>最终导出的图片与可编辑源文件是否一致。</li></ul><p>如无法在当前系统中自动验证某项视觉约束，应将其保留为明确的人工检查事项。</p>`},
 qa:{title:"多语言 PSD 交付前的最小检查清单",subtitle:"把“看着成功”转变成能够定位和复现的交付状态。",html:`<h2>先核对内容</h2><p>检查每一条译文是否对应到正确的设计对象。重复原文、未匹配项、手动跳过项和已确认例外需要分别记录。逐层文字读回能帮助发现写入层面的失败。</p><h2>再核对文件</h2><p>保存完成后检查目标文件是否存在、是否可在 Photoshop 中重新打开、各目标语言的文件名是否符合交付约定。不要将模拟的文件状态当成真实校验。</p><h2>最后完成视觉终检</h2><p>设计师逐语言检查字号、字体、行距、对齐、边距、遮挡和整体画面。将无法处理的对象与可能影响交付的异常明确记录在报告中。</p><ul><li>文字核对：内容正确。</li><li>文件核对：可打开、可编辑、命名完整。</li><li>视觉核对：版式符合本项目要求。</li></ul><p>对于正式对外交付，三层检查都应通过，或明确列出尚未解决的限制。</p>`}
};
function renderArticle(id){
 const a=articleMap[id]||articleMap.table;
 $("#articleHeading").textContent=a.title;$("#articleSubtitle").textContent=a.subtitle;$("#articleContent").innerHTML=a.html;
}
// CSV / TSV parser with quoted cell support and CRLF support.
function parseDelimited(text){
 const raw=String(text).replace(/^\uFEFF/,"");
 const firstLine=raw.split(/\r?\n/,1)[0]||"";
 const delimiter=(firstLine.match(/\t/g)||[]).length>(firstLine.match(/,/g)||[]).length?"\t":",";
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<raw.length;i++){
   const ch=raw[i],next=raw[i+1];
   if(ch==='"'&&quoted&&next==='"'){cell+='"';i++}
   else if(ch==='"'){quoted=!quoted}
   else if(ch===delimiter&&!quoted){row.push(cell);cell=""}
   else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&next==="\n")i++;row.push(cell);cell="";if(row.some(v=>v!==""))rows.push(row);row=[]}
   else cell+=ch;
 }
 if(quoted)throw new Error("CSV 引号未闭合，请检查输入表");
 row.push(cell);if(row.some(v=>v!==""))rows.push(row);
 if(!rows.length)throw new Error("译文表为空");
 const heads=rows[0].map(x=>x.trim());
 const sourceIndex=heads.findIndex(x=>["source","original","source text","原文","源文","原始文本"].includes(x.trim().toLowerCase()));
 if(sourceIndex<0)throw new Error('缺少原文列，请将首列表头命名为 "source"');
 const data=rows.slice(1).map((r,i)=>{const obj={_row:i+2,source:(r[sourceIndex]||"").trim()};heads.forEach((h,j)=>obj[h.toUpperCase()]=(r[j]||"").trim());return obj}).filter(r=>r.source);
 if(!data.length)throw new Error("没有有效译文行");
 return {heads:heads.map(h=>h.toUpperCase()),rows:data,delimiter}
}
const demo={
 step:0,lang:"DE",sourceText:SAMPLE_CSV,parsed:null,file:"nova_product_launch.psd",selected:0,overrides:{},ran:false,running:false
};
$("#demoCsvText").value=SAMPLE_CSV;
function getRows(){
 const parsed=demo.parsed||parseDelimited(demo.sourceText),lang=demo.lang,results=[];
 for(const layer of LAYERS){
   const found=parsed.rows.filter(r=>normalize(r.source)===normalize(layer.source));
   const options=[...new Set(found.map(r=>r[lang]||r[(lang==="JA"?"JP":lang)]||"").map(x=>x.trim()).filter(Boolean))];
   const allFound=found.length>0;
   const value=options[0]||"";
   const override=demo.overrides[`${lang}:${layer.path}`];
   let type,label,used=value;
   if(override?.action==="skip"){type="skipped";label="保留原文";used=""}
   else if(override?.action==="use"){type="confirmed";label="人工已确认";used=override.value}
   else if(!layer.editable){type="blocked";label="不可编辑";used=value}
   else if(!allFound){type="missing";label="未匹配"}
   else if(options.length===0){type="missing";label="译文为空"}
   else if(options.length>1){type="ambiguous";label="多个候选"}
   else if(value.length>23&&value.length>layer.source.length*1.25){type="risk";label="检查版式"}
   else{type="ready";label="可进入执行"}
   results.push({...layer,options,value:used,type,label});
 }
 return results;
}
function statusClass(type){return ({ready:"ok",confirmed:"info",risk:"warn",ambiguous:"warn",missing:"bad",blocked:"bad",skipped:"info"}[type]||"info")}
function countStats(rows){
 let ready=rows.filter(x=>["ready","confirmed"].includes(x.type)).length;
 let needs=rows.filter(x=>["ambiguous","missing","risk"].includes(x.type)).length;
 let stops=rows.filter(x=>["blocked","skipped"].includes(x.type)).length;
 return {ready,needs,stops,total:rows.length}
}
function renderStats(id,rows){
 const t=countStats(rows);
 $(id).innerHTML=`<div class="demo-stat"><b>${t.total}</b>对象总数</div><div class="demo-stat"><b>${t.ready}</b>可进入模拟执行</div><div class="demo-stat"><b>${t.needs}</b>需要人工检查</div><div class="demo-stat"><b>${t.stops}</b>停止 / 跳过</div>`;
}
function displayValue(row){return row.options.length?row.options.join("  /  "):"—"}
function renderRows(rows){
 $("#demoResultRows").innerHTML=rows.map((r,i)=>`<tr data-row="${i}" class="${demo.selected===i?"selected":""}"><td><strong>${escapeHtml(r.path)}</strong></td><td>${escapeHtml(r.source)}</td><td>${escapeHtml(displayValue(r))}</td><td><span class="state ${statusClass(r.type)}">${escapeHtml(r.label)}</span></td></tr>`).join("");
 $("#reviewRows").innerHTML=rows.map((r,i)=>`<tr data-row="${i}" class="${demo.selected===i?"selected":""}"><td><strong>${escapeHtml(r.path)}</strong></td><td>${escapeHtml(displayValue(r))}</td><td><span class="state ${statusClass(r.type)}">${escapeHtml(r.label)}</span></td></tr>`).join("");
 renderStats("#demoStats",rows);renderStats("#demoStatsReview",rows);renderStats("#demoStatsDelivery",rows);
}
function renderReview(rows){
 const row=rows[demo.selected];
 if(!row){$("#reviewDetail").innerHTML='<h4>请选择一行</h4>';return}
 const choices=row.options.length
  ?`<label class="field-label" for="reviewCandidates" style="margin-top:14px">选择候选译文</label><select id="reviewCandidates" class="review-choice">${row.options.map(x=>`<option value="${escapeHtml(x)}" ${row.value===x?"selected":""}>${escapeHtml(x)}</option>`).join("")}</select>`
  :`<p class="muted micro">没有可用译文候选。可以选择保留原文。</p>`;
 const actions=`<div class="review-actions">
   <button class="btn btn-primary btn-sm btn-block" type="button" id="approveRowBtn" ${(!row.options.length||!row.editable)?"disabled":""}>人工确认选中译文</button>
   <button class="btn btn-outline btn-sm btn-block" type="button" id="skipRowBtn">保留原文 / 跳过</button>
   <button class="btn btn-ghost btn-sm btn-block" type="button" id="resetRowBtn">恢复原始状态</button></div>`;
 $("#reviewDetail").innerHTML=`<h4>${escapeHtml(row.path)}</h4><span class="state ${statusClass(row.type)}">${escapeHtml(row.label)}</span>
 <div class="review-meta">ORIGINAL TEXT</div><div>${escapeHtml(row.source)}</div>
 <div class="review-meta">TARGET / ${escapeHtml(demo.lang)}</div>${choices}
 <div class="review-meta">ISSUE CONTEXT</div><div>${escapeHtml(
 row.type==="ambiguous"?"同一原文存在多个候选译文，需按对象身份判断。":
 row.type==="blocked"?"该样例文字对象被标记为栅格化，不可模拟自动写入。":
 row.type==="missing"?"当前语种未找到可用译文，不能自动填补。":
 row.type==="risk"?"文案长度变化可能影响版面。此处仅为启发式风险提示。":
 row.type==="skipped"?"用户已选择保留原文，当前对象不参与模拟写入。":
 row.type==="confirmed"?"已记录你的候选选择，仍需在真实项目中检查最终版面。":"译文匹配明确，可以进入模拟执行。")}</div>${actions}`;
}
function setDemoStage(step){
 demo.step=Math.max(0,Math.min(3,Number(step)||0));
 $$(".demo-stage").forEach(x=>x.classList.toggle("active",Number(x.dataset.stage)===demo.step));
 $$("[data-dstep]").forEach(btn=>btn.classList.toggle("active",Number(btn.dataset.dstep)===demo.step));
 if(demo.step>=1&&!demo.parsed){
   try{demo.parsed=parseDelimited($("#demoCsvText").value)}catch(e){demo.step=0;$$(".demo-stage").forEach(x=>x.classList.toggle("active",Number(x.dataset.stage)===0));toast(e.message);return}
 }
 renderDemo()
}
function renderDemo(){
 const rows=getRows(),home=homeLang[demo.lang]||homeLang.DE;
 $("#demoFileName").textContent=demo.file;
 $("#demoPreviewTitle").textContent=home.title;
 $("#demoPreviewCTA").textContent=home.cta;
 $("#demoLanguage").value=demo.lang;
 $("#langTag1").textContent=`${demo.lang} / ${LANGUAGE_NAME[demo.lang]}`;
 renderRows(rows);renderReview(rows);
}
function inspectInput(){
 demo.sourceText=$("#demoCsvText").value;
 try{
   demo.parsed=parseDelimited(demo.sourceText);
   if(!demo.parsed.heads.includes(demo.lang)&&(demo.lang!=="JA"||!demo.parsed.heads.includes("JP")))
      throw new Error(`译文表没有 ${demo.lang} 语言列，请检查表头`);
   demo.overrides={};demo.ran=false;demo.selected=0;$("#downloadReportBtn").disabled=true;
   setDemoStage(1);
   toast(`已在浏览器内读取 ${demo.parsed.rows.length} 行译文，正在展示模拟匹配结果`);
 }catch(e){toast(e.message);$("#demoCsvText").focus()}
}
$("#inspectBtn").addEventListener("click",inspectInput);
$("#resetSampleBtn").addEventListener("click",()=>{$("#demoCsvText").value=SAMPLE_CSV;demo.sourceText=SAMPLE_CSV;demo.parsed=null;demo.overrides={};demo.ran=false;toast("已恢复演示样例")});
$("#demoLanguage").addEventListener("change",e=>{
 demo.lang=e.target.value;
 demo.ran=false;$("#downloadReportBtn").disabled=true;
 if(demo.parsed&&!demo.parsed.heads.includes(demo.lang)&&!(demo.lang==="JA"&&demo.parsed.heads.includes("JP"))){toast(`当前表中没有 ${demo.lang} 列，可以返回第一步修改表头`)}
 renderDemo()
});
$("#mockPsdFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;demo.file=f.name;$("#demoFileName").textContent=f.name;toast("只读取文件名；未打开或解析 PSD 内容")});
$("#csvFileInput").addEventListener("change",async e=>{
 const f=e.target.files?.[0];if(!f)return;
 if(f.size>5*1024*1024){toast("演示表最大 5MB，请使用较小的 CSV / TSV");e.target.value="";return}
 if(!/\.(csv|tsv|txt)$/i.test(f.name)){toast("演示版支持 CSV / TSV / TXT 文本文件");return}
 try{const txt=await f.text();$("#demoCsvText").value=txt;demo.sourceText=txt;demo.parsed=null;demo.ran=false;toast(`已在浏览器内导入 ${f.name}`)}catch(err){toast("读取失败，请确认文件编码")}
});
$("#downloadSampleCsvBtn").addEventListener("click",()=>downloadText("tuyigf-demo-translations.csv","\uFEFF"+SAMPLE_CSV,"text/csv;charset=utf-8"));
document.addEventListener("click",e=>{
 const step=e.target.closest("[data-dstep]");
 if(step&&step.closest(".demo-app")){const target=Number(step.dataset.dstep);if(target>0&&demo.step===0){inspectInput();if(demo.step!==1)return;if(target!==1)setDemoStage(target)}else{setDemoStage(target)}return}
 const row=e.target.closest("[data-row]");
 if(row){demo.selected=Number(row.dataset.row);renderDemo();return}
 if(e.target.closest("#approveRowBtn")){
    const r=getRows()[demo.selected];if(!r?.editable||!r.options.length)return;
    const value=$("#reviewCandidates")?.value||r.options[0];
    demo.overrides[`${demo.lang}:${r.path}`]={action:"use",value};demo.ran=false;$("#downloadReportBtn").disabled=true;renderDemo();toast("已记录人工选择，最终版面仍需真实 Photoshop 核对");
 }else if(e.target.closest("#skipRowBtn")){
    const r=getRows()[demo.selected];if(!r)return;
    demo.overrides[`${demo.lang}:${r.path}`]={action:"skip"};demo.ran=false;$("#downloadReportBtn").disabled=true;renderDemo();toast("对象已标记保留原文，模拟执行将跳过");
 }else if(e.target.closest("#resetRowBtn")){
    const r=getRows()[demo.selected];if(!r)return;
    delete demo.overrides[`${demo.lang}:${r.path}`];demo.ran=false;$("#downloadReportBtn").disabled=true;renderDemo();toast("已恢复默认检测状态");
 }
});
$("#simulateRunBtn").addEventListener("click",()=>{
 if(demo.running)return;
 demo.running=true;demo.ran=false;$("#downloadReportBtn").disabled=true;$("#simulateRunBtn").disabled=true;
 const rows=getRows();const stats=countStats(rows);
 $("#demoProgress").style.width="0%";let count=0;
 const messages=[
  "初始化：浏览器演示模式，无 Photoshop 连接。",
  "读取预置的虚构文字图层...",
  `解析译文表：${demo.parsed?.rows.length||0} 行，目标语种 ${demo.lang}。`,
  `图层对账：${stats.total} 个样例对象。`,
  `可模拟处理 ${stats.ready} 项，待复核 ${stats.needs} 项，停止或跳过 ${stats.stops} 项。`,
  "模拟运行完成：记录演示状态，未修改 PSD/PSB。",
  "提醒：真实任务需要由 Photoshop 写入、回读、保存与人工终检。"
 ];
 $("#demoLog").textContent="";
 const timer=setInterval(()=>{
    $("#demoLog").textContent+=messages[count]+"\n";
    count++;
    $("#demoProgress").style.width=Math.round(count/messages.length*100)+"%";
    if(count>=messages.length){clearInterval(timer);demo.running=false;demo.ran=true;$("#simulateRunBtn").disabled=false;$("#downloadReportBtn").disabled=false;toast("演示执行结束，可以下载标记为模拟的报告")}
 },350);
});
function buildDemoReport(){
 const rows=getRows(),status=countStats(rows),stamp=new Date().toISOString();
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>图译工坊 · 模拟审查报告</title><style>body{font:15px/1.7 system-ui,"Microsoft YaHei",sans-serif;max-width:900px;margin:45px auto;padding:0 25px;color:#1a3556}h1{font-size:27px}b{color:#153b75}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #dae4ef;padding:9px;font-size:12px;text-align:left}th{background:#edf4ff}.note{background:#fff0db;padding:14px;border-radius:9px;color:#8b5d17}footer{margin-top:35px;color:#789}</style></head><body><h1>图译工坊 | 互动演示报告</h1><p class="note"><b>SIMULATED ONLY</b>：本报告由前端原型在浏览器生成。未连接 Photoshop、未扫描真实 PSD、未进行真实写入、回读或保存验证。不能作为实际处理质量证明。</p><p>项目文件名：${escapeHtml(demo.file)}<br>语言：${escapeHtml(demo.lang)}<br>生成时间：${escapeHtml(stamp)}<br>可进入模拟处理：${status.ready} 项；需复核：${status.needs} 项；停止或跳过：${status.stops} 项。</p><table><thead><tr><th>样例对象</th><th>原文</th><th>演示译文</th><th>模拟状态</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.path)}</td><td>${escapeHtml(r.source)}</td><td>${escapeHtml(r.value||"")}</td><td>${escapeHtml(r.label)}</td></tr>`).join("")}</tbody></table><footer>图译工坊 2026 V7 概念原型 · 正式产品信息请查看 https://tuyigf.com</footer></body></html>`
}
$("#downloadReportBtn").addEventListener("click",()=>{if(!demo.ran)return;downloadText(`tuyigf-demo-report-${demo.lang.toLowerCase()}.html`,buildDemoReport(),"text/html;charset=utf-8");toast("演示报告已开始下载")});
$("#downloadTestChecklist").addEventListener("click",()=>{
 const csv="\uFEFF测试编号,测试类别,文件数,文字图层数,语种数,Windows版本,Photoshop版本,助手版本,准备时间分钟,确认时间分钟,执行干预分钟,视觉终检分钟,返工分钟,失败与限制说明,最终视觉审核结果\n";
 downloadText("tuyigf-stress-test-checklist.csv",csv,"text/csv;charset=utf-8");toast("测试表模板已开始下载");
});
$("#pilotForm").addEventListener("submit",e=>{
 e.preventDefault();
 if(!e.currentTarget.reportValidity())return;
 const material=$$('input[name="material"]:checked').map(el=>el.value).join("、")||"未填写";
 const fields=[["称呼",$("#pilotName").value],["邮箱",$("#pilotEmail").value],["角色",$("#pilotRole").value],["使用频率",$("#pilotFreq").value],["常处理的物料",material],["PSD/PSB 数量",$("#pilotPsd").value],["目标语言数",$("#pilotLang").value],["痛点与当前处理方式",$("#pilotPain").value]];
 const summary=fields.map(([name,v])=>name+"："+v).join("\n");
 $("#pilotSummaryText").textContent=summary;
 $("#pilotSummary").classList.add("active");
 $("#pilotSummary").scrollIntoView({behavior:"smooth",block:"center"});
 toast("仅生成本地摘要，未提交任何数据");
});
$("#copyPilotSummary").addEventListener("click",()=>copyText($("#pilotSummaryText").textContent));
$$("[data-article]").forEach(b=>b.addEventListener("click",()=>location.hash="#/article/"+b.dataset.article));
// Storyboard modal. It is an illustrative motion sequence, not actual engine recording.
const story=[
 ["STEP 01 / 04","把已有译文导入工作台","将整理好的译文表与本机 PSD 任务关联，明确目标语言范围。"],
 ["STEP 02 / 04","让有歧义的对象停下来","重复原文、空译文与不可编辑对象集中形成复核列表。"],
 ["STEP 03 / 04","确定内容进入本机执行","通过正式产品的本地助手与 Photoshop 处理文字层；本动画不执行真实写入。"],
 ["STEP 04 / 04","让每次交付有记录可查","分开记录文字内容、文件状态和人工视觉终检结果。"]
];
let storyIndex=0,storyTimer=null;
function updateStory(){const s=story[storyIndex];$("#storyStage").textContent=s[0];$("#storyHeadline").textContent=s[1];$("#storyDescription").textContent=s[2];$("#storyProgress").style.width=((storyIndex+1)/story.length*100)+"%"}
function openStory(){storyIndex=0;updateStory();$("#storyModal").showModal();clearInterval(storyTimer);storyTimer=setInterval(()=>{storyIndex=(storyIndex+1)%story.length;updateStory()},4500)}
function closeStory(){clearInterval(storyTimer);if($("#storyModal").open)$("#storyModal").close()}
$("#closeStoryBtn").addEventListener("click",closeStory);
$("#storyNextBtn").addEventListener("click",()=>{storyIndex=(storyIndex+1)%story.length;updateStory()});
$("#storyPrevBtn").addEventListener("click",()=>{storyIndex=(storyIndex-1+story.length)%story.length;updateStory()});
$("#storyModal").addEventListener("close",()=>clearInterval(storyTimer));
$("#storyModal").addEventListener("click",e=>{if(e.target===$("#storyModal"))closeStory()});
document.addEventListener("click",e=>{if(e.target.closest("[data-open-story]"))openStory()});
const storyLink=document.createElement("button");
storyLink.type="button";storyLink.className="btn btn-ghost btn-sm";storyLink.style.cssText="color:#aad0ff;margin-top:12px;padding-left:0";
storyLink.textContent="▶ 观看 4 步流程动画（模拟）";storyLink.dataset.openStory="1";
$(".hero-copy .hero-conditions")?.after(storyLink);
// Initialize
try{demo.parsed=parseDelimited(SAMPLE_CSV)}catch(e){demo.parsed={heads:[],rows:[]}}
route();setFlow(0);setHomeLang("EN");renderDemo();
})();
