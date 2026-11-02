<script>
(function(){
const format={
 'hero.psd':{label:'主图.psd',DE:{text:'Bereit für jedes Abenteuer.',font:'Inter',size:'32 pt',tracking:'+20',leading:'38 pt',tip:'德语长词请复核换行和行宽'},JA:{text:'次の冒険へ、軽やかに。',font:'Noto Sans JP',size:'28 pt',tracking:'0',leading:'36 pt',tip:'日文禁则与字形需要 Photoshop 复核'},FR:{text:'Prêt pour chaque aventure.',font:'Inter',size:'30 pt',tracking:'+10',leading:'38 pt',tip:'法语译文需检查字体与行宽'}},
 'detail.psb':{label:'详情页.psb',DE:{text:'Leichtes, kompaktes Design.',font:'DIN',size:'22 pt',tracking:'+12',leading:'30 pt',tip:'同一德语版本，详情页使用独立字号'},JA:{text:'軽さと強さを両立。',font:'Noto Sans JP',size:'24 pt',tracking:'0',leading:'34 pt',tip:'同一日语版本，详情页使用独立行距'},FR:{text:'Un design léger et compact.',font:'Arial',size:'22 pt',tracking:'+8',leading:'30 pt',tip:'同一法语版本，详情页指定独立字体'}}
};
let file='hero.psd',lang='DE';
const get=id=>document.getElementById(id);
function render(){if(!get('v10HeroText'))return;const x=format[file][lang];get('v10HeroFileLabel').textContent=format[file].label;get('v10HeroText').textContent=x.text;get('v10HeroFont').textContent=x.font;get('v10HeroSize').textContent=x.size;get('v10HeroTracking').textContent=x.tracking;get('v10HeroLeading').textContent=x.leading;get('v10HeroFoot').textContent=x.tip;
 document.querySelectorAll('[data-v10-file]').forEach(el=>el.classList.toggle('active',el.dataset.v10File===file));document.querySelectorAll('[data-v10-language]').forEach(el=>el.classList.toggle('active',el.dataset.v10Language===lang));
 document.querySelectorAll('[data-v10-matrix]').forEach(el=>el.classList.toggle('active',el.dataset.v10Matrix===file+'|'+lang));
 const r=get('v10MatrixReadout');if(r)r.textContent='已选择 '+format[file].label+' / '+lang+'：'+x.font+'，'+x.size+'，字距 '+x.tracking+'，行距 '+x.leading;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-v10-file]'),l=e.target.closest('[data-v10-language]'),m=e.target.closest('[data-v10-matrix]');if(f){file=f.dataset.v10File;render()}if(l){lang=l.dataset.v10Language;render()}if(m){const parts=m.dataset.v10Matrix.split('|');file=parts[0];lang=parts[1];render()}});
render();
})();
</script>
