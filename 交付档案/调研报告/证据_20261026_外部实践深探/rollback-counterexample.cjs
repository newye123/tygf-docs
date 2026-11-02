const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const ts=require(path.resolve('worktrees/develop/node_modules/typescript'));
const file=path.resolve('worktrees/develop/src/lib/server/site-settings.ts'),src=fs.readFileSync(file,'utf8');
const start=src.indexOf('export async function rollbackSiteContentRevision('),end=src.indexOf('export async function getSiteContentRevisionContent(',start);
if(start<0||end<0)throw Error('extraction failed');
const fn=src.slice(start,end);const js=ts.transpileModule(fn,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run(current){let active={id:'publication-'+current,revisionId:current};let result;
const tx={siteContentRevision:{findUnique:async()=>({id:'A',status:'frozen'})},siteContentPublication:{findFirst:async()=>active,update:async()=>{},create:async({data})=>{result=data;active={id:'new',revisionId:data.revisionId};}}};
class ContentStudioError extends Error{constructor(code,msg){super(msg);this.code=code;}}
const ctx={exports:{},assertContentStudioMutationAllowed:()=>{},assertContentStudioSchemaAvailable:async()=>{},contentEnvironment:()=> 'isolated-test',verifiedRevisionContent:()=>({}),ContentStudioError,db:{$transaction:async f=>f(tx)},getContentStudioState:async()=>active};
vm.runInNewContext(js,ctx);await ctx.exports.rollbackSiteContentRevision('A','authorized-owner','rollback intended release B');return {operatorExpectedCurrent:'B',actualCurrentBefore:current,currentAfter:active.revisionId,retiredPublication:result.rollbackOfPublicationId};}
(async()=>{const results={scope:'Original rollback function transpiled; in-memory fake database; no real database, no concurrency engine test',sourceSha256:crypto.createHash('sha256').update(src).digest('hex'),cases:[await run('B'),await run('C')]};fs.writeFileSync(path.join(__dirname,'rollback-counterexample.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
