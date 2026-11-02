
(function(){
 const menu=document.querySelector('[data-menu-toggle]'),nav=document.querySelector('[data-nav-links]');
 if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));}
 document.querySelectorAll('[data-faq-button]').forEach(b=>b.addEventListener('click',()=>{const item=b.closest('.faq-item'),open=item.classList.toggle('open');b.setAttribute('aria-expanded',String(open));const s=b.querySelector('.symbol');if(s)s.textContent=open?'−':'+';}));
 const toast=document.getElementById('toast');function notice(t){if(!toast)return;toast.textContent=t;toast.classList.add('show');window.setTimeout(()=>toast.classList.remove('show'),4200);}
 document.querySelectorAll('[data-prototype-form]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();notice(f.dataset.notice||'静态原型：数据未发送。正式上线前需要接入真实后端。');}));
 document.querySelectorAll('[data-demo-step]').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.demoStep;document.querySelectorAll('[data-demo-step]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-demo-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.demoPanel!==t));document.querySelectorAll('[data-progress-step]').forEach((x,i)=>x.classList.toggle('active',i<=['input','review','run','report'].indexOf(t)));}));
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{const f=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-status-row]').forEach(r=>r.classList.toggle('hidden',f==='attention'&&r.dataset.statusRow==='ok'));}));
 document.querySelectorAll('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById(b.dataset.togglePassword);if(i){i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'显示':'隐藏';}}));
 document.querySelectorAll('[data-prototype-action]').forEach(b=>b.addEventListener('click',()=>notice(b.dataset.prototypeAction)));
})();
