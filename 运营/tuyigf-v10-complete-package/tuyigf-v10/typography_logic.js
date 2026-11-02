/* V10 typography matrix: authentic front-end state and interactions. No Photoshop. */
const TY_FONT_OPTIONS=['保留原稿字体','Inter','Arial','DIN','Noto Sans JP','Noto Sans SC','Noto Sans KR','Source Han Sans','Helvetica Neue'];
const TY_LANG_ORDER=['DE','JA','FR','ES','EN','IT','PL','KO'];
const TY_SAMPLES={DE:'Bereit für jedes Abenteuer.',JA:'次の冒険へ、軽やかに。',FR:'Prêt pour votre prochaine aventure.',ES:'Listo para cada aventura.',EN:'Created for the move.',IT:'Pronto per ogni avventura.',PL:'Gotowy na każdą przygodę.',KO:'다음 모험을 위한 준비.'};
const TY_SAMPLE_DEFAULTS={DE:{family:'Inter',size:'',tracking:'0',leading:'',kerning:'保留原稿'},JA:{family:'Noto Sans JP',size:'',tracking:'0',leading:'',kerning:'保留原稿'},FR:{family:'Inter',size:'',tracking:'0',leading:'',kerning:'保留原稿'},ES:{family:'Inter',size:'',tracking:'0',leading:'',kerning:'保留原稿'},EN:{family:'保留原稿字体',size:'',tracking:'0',leading:'',kerning:'保留原稿'},IT:{family:'Inter',size:'',tracking:'0',leading:'',kerning:'保留原稿'},PL:{family:'Inter',size:'',tracking:'0',leading:'',kerning:'保留原稿'},KO:{family:'Noto Sans KR',size:'',tracking:'0',leading:'',kerning:'保留原稿'}};
const TY_SAMPLE_OVERRIDES={
 'P-NOVA::nova_launch.psd::DE':{family:'Inter',size:'32',tracking:'20',leading:'38',kerning:'度量标准'},
 'P-NOVA::nova_launch.psd::JA':{family:'Noto Sans JP',size:'28',tracking:'0',leading:'36',kerning:'视觉'},
 'P-NOVA::nova_a_plus.psb::DE':{family:'DIN',size:'22',tracking:'12',leading:'30',kerning:'度量标准'},
 'P-NOVA::nova_a_plus.psb::JA':{family:'Noto Sans JP',size:'24',tracking:'0',leading:'34',kerning:'视觉'},
 'P-NOVA::nova_a_plus.psb::FR':{family:'Arial',size:'22',tracking:'8',leading:'30',kerning:'保留原稿'}
};
function tyEnsure(){if(!wbState.typography || typeof wbState.typography!=='object')wbState.typography={defaults:wbClone(TY_SAMPLE_DEFAULTS),overrides:wbClone(TY_SAMPLE_OVERRIDES)};if(!wbState.typography.defaults)wbState.typography.defaults=wbClone(TY_SAMPLE_DEFAULTS);if(!wbState.typography.overrides)wbState.typography.overrides={};}
tyEnsure();
wbUI.tyProject='P-NOVA';wbUI.tyFile='nova_launch.psd';wbUI.tyLang='DE';wbUI.tyScope='file';wbUI.wizardTyLang='DE';
function tyKey(pid,file,lang){return [pid,file,lang].join('::')}
function tyDefault(lang){tyEnsure();return Object.assign({family:'保留原稿字体',size:'',tracking:'0',leading:'',kerning:'保留原稿'},wbState.typography.defaults[lang]||{})}
function tyEffective(pid,file,lang){const key=tyKey(pid,file,lang);const override=wbState.typography.overrides[key];return {style:override?Object.assign({},tyDefault(lang),override):tyDefault(lang),overridden:!!override,key}}
function tyValidNumber(value,min,max){if(String(value).trim()==='')return true;const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max}
function tyFontChoices(current){const fonts=[...new Set([...TY_FONT_OPTIONS,String(current||'')].filter(Boolean))];return fonts.map(font=>`<option value="${wbEsc(font)}" ${current===font?'selected':''}>${wbEsc(font)}</option>`).join('')}
function tyFormFields(style,prefix='ty'){
 return `<div class="wb-ty-controls">
 <label class="span-2">字体 / Font family <select id="${prefix}Family">${tyFontChoices(style.family)}</select></label>
 <label>字号 / Font size (pt)<input type="number" id="${prefix}Size" min="1" max="500" step="0.5" value="${wbEsc(style.size)}" placeholder="保留原稿"></label>
 <label>行距 / Leading (pt)<input type="number" id="${prefix}Leading" min="1" max="1200" step="0.5" value="${wbEsc(style.leading)}" placeholder="保留原稿"></label>
 <label>字距 / Tracking (1/1000 em)<input type="number" id="${prefix}Tracking" min="-500" max="1000" step="1" value="${wbEsc(style.tracking)}"></label>
 <label>自动字距 / Kerning<select id="${prefix}Kerning">${['保留原稿','度量标准','视觉'].map(a=>`<option ${style.kerning===a?'selected':''}>${a}</option>`).join('')}</select></label>
 </div>`}
function tyReadFields(prefix='ty'){
 const pick=name=>document.getElementById(prefix+name)?.value??'';
 const style={family:pick('Family'),size:pick('Size').trim(),tracking:pick('Tracking').trim()||'0',leading:pick('Leading').trim(),kerning:pick('Kerning')};
 if(!tyValidNumber(style.size,1,500)||!tyValidNumber(style.leading,1,1200)||!tyValidNumber(style.tracking,-500,1000)){wbToast('参数超出演示范围：字号 1–500pt，行距 1–1200pt，字距 -500–1000');return null}
 return style
}
function tyProjectRef(){return wbProject(wbUI.tyProject)||wbState.projects[0]}
function tyNormalizeSelection(){let p=tyProjectRef();if(!p)return null;if(!p.files.includes(wbUI.tyFile))wbUI.tyFile=p.files[0]||'';if(!wbUI.tyLang)wbUI.tyLang='DE';return p}
function wbTypography(){tyEnsure();const p=tyNormalizeSelection();if(!p)return wbMissing('找不到排版项目');const langs=[...new Set([...p.langs,...['DE','JA','FR','ES']])].filter(x=>TY_LANG_ORDER.includes(x)).slice(0,8);const eff=tyEffective(p.id,wbUI.tyFile,wbUI.tyLang);const displayed=wbUI.tyScope==='language'?tyDefault(wbUI.tyLang):eff.style;
 const mtx=`<div class="wb-ty-matrix-scroll"><div class="wb-ty-matrix"><div class="wb-ty-matrix-grid" style="--ty-lang-count:${langs.length}"><div class="head">文件 / 语言</div>${langs.map(l=>`<div class="head">${l} · ${wbEsc(WB_LANGS[l]||l)}</div>`).join('')}${p.files.map(file=>`<div class="row-name">${wbEsc(file)}</div>${langs.map(l=>{const s=tyEffective(p.id,file,l);return `<button type="button" data-ty-cell="${wbEsc(file)}" data-ty-lang="${l}" class="${file===wbUI.tyFile&&l===wbUI.tyLang?'active':''}"><b>${wbEsc(s.style.family)}</b><small>${s.style.size?s.style.size+'pt':'原字号'} · 字距 ${wbEsc(s.style.tracking)}</small><i>${s.overridden?'单文件覆盖':'继承语言默认'}</i></button>`}).join('')}`).join('')}</div></div></div>`;
 return `${wbHeading('TYPOGRAPHY / FILE × LANGUAGE','字体与排版设置','为项目中每份 PSD 的每个目标语言分别指定字符参数。浏览器本地可保存、比较与覆盖；真实 Photoshop 字体检测和文件修改尚未接入。',`<button class="wb-btn" type="button" data-ty-action="download">${wbIcon('download')} 导出模拟规则 JSON</button>`)}
 <div class="wb-ty-intro"><div class="wb-ty-hero"><h2>同一种语言，也可以让每份 PSD 使用不同字体。</h2><p>先为语言设置默认规则，再按需要覆盖指定文件。矩阵标注“继承”或“覆盖”，执行前可以看到具体会采用哪一组参数。原稿参数若未指定则保留。</p></div><div class="wb-ty-stamp"><small>当前配置维度</small><b>PSD × 语言</b><span>字体 / 字号 / 字距 / 行距 / 自动字距</span></div></div>
 <div class="wb-ty-workspace"><div class="wb-card"><div class="wb-card-title"><h3>文件与语言矩阵</h3><span class="wb-pill pending">模拟项目数据</span></div><div class="wb-ty-pick"><label class="wb-form-field"><span class="wb-label">项目</span><select id="tyProject" class="wb-select">${wbState.projects.map(x=>`<option value="${wbEsc(x.id)}" ${x.id===p.id?'selected':''}>${wbEsc(x.name)}</option>`).join('')}</select></label><label class="wb-form-field"><span class="wb-label">文件</span><select id="tyFile" class="wb-select">${p.files.map(f=>`<option value="${wbEsc(f)}" ${f===wbUI.tyFile?'selected':''}>${wbEsc(f)}</option>`).join('')}</select></label></div>
 ${mtx}
 <div class="wb-ty-editor-note">语言默认规则可复用，单文件覆盖优先。当前可在同一个项目的两份 PSD 中为 DE 配置不同字体和字号，再切换回来验证保存结果。</div>
 <div class="wb-ty-sample"><small>样本文字实时预览 · 浏览器字体可能回退</small><strong id="tySampleText">${wbEsc(TY_SAMPLES[wbUI.tyLang]||TY_SAMPLES.DE)}</strong><span id="tySampleNote">${wbEsc(wbUI.tyFile)} / ${wbEsc(wbUI.tyLang)} / ${eff.overridden?'单文件覆盖':'继承语言默认'}</span></div>
 </div><div class="wb-card"><div class="wb-card-title"><h3>选中对象的字符样式</h3><span class="wb-pill ${eff.overridden?'done':'pending'}">${eff.overridden?'已覆盖':'默认继承'}</span></div><div class="wb-stack"><div class="wb-stat-inline"><span class="wb-stat-sentence">文件</span><b>${wbEsc(wbUI.tyFile||'未选择')}</b></div><div class="wb-stat-inline"><span class="wb-stat-sentence">语言</span><b>${wbEsc(wbUI.tyLang)} / ${wbEsc(WB_LANGS[wbUI.tyLang]||'')}</b></div></div><div class="wb-ty-scope"><button type="button" data-ty-scope="file" class="${wbUI.tyScope==='file'?'active':''}">只改这份 PSD</button><button type="button" data-ty-scope="language" class="${wbUI.tyScope==='language'?'active':''}">修改语言默认</button></div>${tyFormFields(displayed,'ty')}
 <div class="wb-ty-editor-note">${wbUI.tyScope==='file'?'保存后只影响当前文件的当前语言；其他 PSD 保留自己的设置。':'保存语言默认值后，仅未单独覆盖的文件会继承新设置。'} 实际本机字体需要 Photoshop 确认，当前选项为演示候选。</div>
 <div class="wb-ty-actions"><button class="wb-btn primary" data-ty-action="save">保存当前规则</button><button class="wb-btn" data-ty-action="reset">恢复语言默认</button></div>
 <div class="wb-divider"></div><div class="wb-stat-sentence">重要：前端文字预览无法判定最终视觉。日文禁则、字体缺字、溢出、智能对象与颜色位置仍需真实文件检测及人工复核。</div></div></div>`
}
function wbTyWizard(){tyEnsure();const p=wbProject(wbUI.wizardProject)||wbState.projects[0],file=wbUI.wizardFile;const langs=wbUI.wizardLangs.filter(l=>TY_LANG_ORDER.includes(l));if(!langs.includes(wbUI.wizardTyLang))wbUI.wizardTyLang=langs[0]||'DE';const lang=wbUI.wizardTyLang,eff=tyEffective(p.id,file,lang);
 return `<div class="wb-card"><div class="wb-card-title"><h3>本批次的字体和字符参数</h3><span class="wb-pill pending">前端规则演示</span></div><p class="wb-stat-sentence">当前任务文件：${wbEsc(file)}。请选择每个目标语言，保存当前文件的独立设置。若你需要管理整个项目的所有文件，可打开字体矩阵。</p><div class="wb-tabs" style="margin:14px 0 15px;flex-wrap:wrap">${langs.map(l=>`<button data-ty-wizard-lang="${l}" class="wb-tab ${lang===l?'active':''}">${l} · ${wbEsc(WB_LANGS[l])}</button>`).join('')}</div>
 ${tyFormFields(eff.style,'tyw')}
 <div class="wb-ty-actions"><button class="wb-btn accent" data-ty-action="wizard-save">保存 ${wbEsc(lang)} 的设置</button><button class="wb-btn" data-wb-to="typography">打开完整文件矩阵 ${wbIcon('arrow')}</button></div>
 <div class="wb-ty-editor-note">未保存的语言沿用默认规则。浏览器中保存的字体名称只用于模拟，不表示当前电脑或 Photoshop 已安装。</div><div class="wb-ty-matrix-scroll"><div class="wb-ty-matrix" style="margin-top:8px"><div class="wb-ty-matrix-grid" style="--ty-lang-count:${Math.max(1,langs.length)}"><div class="head">当前文件</div>${langs.map(l=>`<div class="head">${l}</div>`).join('')}<div class="row-name">${wbEsc(file)}</div>${langs.map(l=>{const x=tyEffective(p.id,file,l);return `<button type="button" data-ty-wizard-lang="${l}"><b>${wbEsc(x.style.family)}</b><small>${x.style.size?x.style.size+'pt':'原字号'}</small><i>${x.overridden?'已覆盖':'继承'}</i></button>`}).join('')}</div></div></div></div>`;
}
function tyTaskSnapshot(task){
 const snap=task.styleSnapshot;if(!snap||!Object.keys(snap).length)return `<div class="wb-card" style="margin-top:17px"><div class="wb-card-title"><h3>字符参数配置</h3><span class="wb-pill pending">历史模拟任务无快照</span></div><p class="wb-stat-sentence">当前示例批次创建时未记录文件 × 语言字体快照。可以进入字体矩阵查看当前的本地预设，但它不代表历史任务实际采用的参数。</p><div style="margin-top:12px"><button class="wb-btn" data-wb-to="typography">打开字体与排版设置</button></div></div>`;
 return `<div class="wb-card" style="margin-top:17px"><div class="wb-card-title"><h3>本批次字体规则快照（模拟）</h3><span class="wb-pill pending">创建任务时冻结的参数</span></div><div class="wb-table-scroll"><table class="wb-table"><thead><tr><th>语言</th><th>指定字体</th><th>字号</th><th>字距</th><th>行距</th><th>自动字距</th></tr></thead><tbody>${Object.entries(snap).map(([l,x])=>`<tr><td><b>${wbEsc(l)}</b></td><td>${wbEsc(x.family)}</td><td>${wbEsc(x.size?x.size+' pt':'保留原稿')}</td><td>${wbEsc(x.tracking)}</td><td>${wbEsc(x.leading?x.leading+' pt':'保留原稿')}</td><td>${wbEsc(x.kerning)}</td></tr>`).join('')}</tbody></table></div><div class="wb-rule-box" style="margin-top:12px">快照记录浏览器中确认的意图。文字读回、最终字体渲染与 PSD 保存状态均未执行。</div></div>`;
}
function tyApplyPreview(prefix='ty'){const sample=document.getElementById('tySampleText');if(!sample||prefix!=='ty')return;const family=document.getElementById('tyFamily')?.value||'保留原稿字体',size=Number(document.getElementById('tySize')?.value||26),tracking=Number(document.getElementById('tyTracking')?.value||0),leading=Number(document.getElementById('tyLeading')?.value||0);sample.style.fontFamily=family==='保留原稿字体'?'system-ui,sans-serif':`"${family.replaceAll('"','')}",system-ui,sans-serif`;sample.style.fontSize=Math.min(36,Math.max(16,size))+'px';sample.style.letterSpacing=(tracking/1000)+'em';sample.style.lineHeight=leading&&size?String(leading/size):'1.25'}
function tySaveNow(scope='file',prefix='ty'){
 const style=tyReadFields(prefix);if(!style)return false;
 tyEnsure();let p,file,lang;
 if(prefix==='tyw'){p=wbUI.wizardProject;file=wbUI.wizardFile;lang=wbUI.wizardTyLang;scope='file'}else{p=wbUI.tyProject;file=wbUI.tyFile;lang=wbUI.tyLang;scope=wbUI.tyScope}
 if(scope==='language')wbState.typography.defaults[lang]=style;else wbState.typography.overrides[tyKey(p,file,lang)]=style;
 wbLog('保存字体规则',p+'/'+file+'/'+lang,scope==='language'?'设置语言默认规则':'设置单文件语言覆盖');wbSave();wbToast('排版规则已保存到本地演示，未修改 Photoshop 文件');wbRerender();return true
}
function tyResetNow(){const k=tyKey(wbUI.tyProject,wbUI.tyFile,wbUI.tyLang);delete wbState.typography.overrides[k];wbLog('恢复语言默认',k,'清除单文件覆盖规则');wbSave();wbRerender();wbToast('当前文件已恢复继承语言默认')}
function tyExport(){tyEnsure();downloadText('tuyigf-V10-SIMULATED-typography.json',JSON.stringify({disclaimer:'SIMULATION ONLY. No Photoshop font scan or PSD modification.',exportedAt:new Date().toISOString(),projects:wbState.projects.map(p=>({id:p.id,name:p.name,files:p.files})),typography:wbState.typography},null,2),'application/json;charset=utf-8');wbToast('浏览器模拟规则 JSON 已下载')}
/* Independent event delegation. Keeps V9 task, project and QA interactions unchanged. */
document.addEventListener('click',e=>{
 const matrix=e.target.closest('[data-ty-cell]');if(matrix){wbUI.tyFile=matrix.dataset.tyCell;wbUI.tyLang=matrix.dataset.tyLang;wbUI.tyScope='file';wbRerender();return}
 const scope=e.target.closest('[data-ty-scope]');if(scope){wbUI.tyScope=scope.dataset.tyScope;wbRerender();return}
 const wizardLang=e.target.closest('[data-ty-wizard-lang]');if(wizardLang){wbUI.wizardTyLang=wizardLang.dataset.tyWizardLang;wbRerender();return}
 const action=e.target.closest('[data-ty-action]');if(action){const a=action.dataset.tyAction;if(a==='save')tySaveNow('file','ty');if(a==='wizard-save')tySaveNow('file','tyw');if(a==='reset')tyResetNow();if(a==='download')tyExport();return}
});
document.addEventListener('change',e=>{if(e.target.id==='tyProject'){wbUI.tyProject=e.target.value;wbUI.tyFile=wbProject(wbUI.tyProject)?.files[0]||'';wbRerender()}if(e.target.id==='tyFile'){wbUI.tyFile=e.target.value;wbRerender()}if(['tyFamily','tySize','tyTracking','tyLeading'].includes(e.target.id))tyApplyPreview()});
document.addEventListener('input',e=>{if(['tyFamily','tySize','tyTracking','tyLeading'].includes(e.target.id))tyApplyPreview()});
