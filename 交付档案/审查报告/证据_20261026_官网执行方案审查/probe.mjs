import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const plan=fs.readFileSync('C:/Users/ivan/Downloads/tuyigf_execution_plan_20261026.md','utf8');
const script=plan.match(/```javascript\s*([\s\S]*?)```/)[1];
const base=process.argv[2];
fs.writeFileSync(path.join(base,'adversarial-verify.mjs'),script);
const required=[...script.match(/const requiredFiles = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
const root=path.join(base,'empty-product');
for(const f of required){fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),f.endsWith('guest-trial-contract.ts')?'// allowThirdPartyAi: false\n':'');}
const run=()=>{let code=0,logs=[];try{vm.runInNewContext(script.replace(/^import .*;\r?\n/gm,''),{fs,path,process:{cwd:()=>root,exit:n=>{code=n;throw Error('EXIT')}},console:{log:x=>logs.push(x),error:x=>logs.push(x)}});}catch(e){if(e.message!=='EXIT')throw e;}return {code,logs};};
const a=run();
fs.writeFileSync(path.join(root,'public','broken.txt'),'撑版');const b=run();
fs.writeFileSync(path.join(root,'public','broken.txt'),'');const c=run();
const results={fixture:root,requiredFiles:required.length,emptyProduct:a,knownForbiddenWord:b,restored:c,method:'Original script except two imports evaluated with Node vm; filesystem real, cwd/exit/output captured; no product code or API exists'};
fs.writeFileSync(path.join(base,'evidence.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
