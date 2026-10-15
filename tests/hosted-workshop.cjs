const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {createHandler}=require('../src/server/map-workshop.js');
(async()=>{
 const root=path.join(__dirname,'../dist'),origin='https://workshop.test';
 const owner={id:'8c40a519-d188-4779-ab4c-88ef4b939e07',email:'garrettrobson95@gmail.com',email_confirmed_at:'2026-10-01',is_anonymous:false};
 const handler=createHandler({origin,key:'cd'.repeat(32),assetsRoot:path.join(root,'api/workshop-assets'),fetch:async(u,o)=>new Response(JSON.stringify(owner),{status:o.headers.Authorization==='Bearer owner-fixture'?200:401})});
 const server=http.createServer(async(req,res)=>{const u=new URL(req.url,origin);if(u.pathname.startsWith('/map-editor/')||u.pathname==='/api/map-workshop'){req.query={asset:u.pathname.startsWith('/map-editor/')?u.pathname.slice(12):u.searchParams.get('asset')};return handler(req,res);}if(u.pathname==='/bootstrap'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Fixture</title>');return;}try{const p=path.resolve(root,'.'+u.pathname);if(!p.startsWith(root+path.sep))throw Error();const bytes=await fs.readFile(p);res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});const context=await browser.newContext({viewport:{width:1400,height:850}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();const headers={...r.request().headers(),host:'workshop.test'};delete headers['content-length'];const response=await fetch('http://127.0.0.1:'+server.address().port+u.pathname+u.search,{method:r.request().method(),headers,body:r.request().postDataBuffer()||undefined});await r.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  await page.goto(origin+'/bootstrap');assert.equal(await page.evaluate(async()=>{const r=await fetch('/map-editor/');return r.status;}),401);
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/map-workshop?asset=session',{method:'POST',headers:{Authorization:'Bearer owner-fixture'}});return r.status;}),200);
  await page.goto(origin+'/map-editor/');try{await page.waitForFunction(()=>document.querySelector('#world')?.contentWindow.MapPreview,null,{timeout:120000});}catch(e){console.log('Preview errors:',errors);console.log(await page.locator('#world').evaluate(el=>({url:el.contentWindow.location.href,text:el.contentDocument.body.innerText.slice(-500)})));throw e;}
  const baseline=await page.evaluate(()=>document.querySelector('#world').contentWindow.MapPreview.snapshot().roads.length);assert.ok(baseline>20);
  await page.selectOption('#piece','cross');await page.click('[data-tool="piece"]');const box=await page.locator('#handles').boundingBox();await page.locator('#handles').click({position:{x:box.width*.7,y:box.height*.7}});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-tape-map-editor-v1')).roads.length),baseline+2);await page.click('#undo');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-tape-map-editor-v1')).roads.length),baseline);
  const download=page.waitForEvent('download');await page.click('#export');assert.equal((await download).suggestedFilename(),'world-map.json');
  await page.screenshot({path:path.join(__dirname,'hosted-workshop.png'),fullPage:true});assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(async()=>{await fetch('/api/map-workshop?asset=session',{method:'DELETE'});return (await fetch('/map-editor/preview-part-00.bin')).status;}),401);
  console.log('PASS: protected hosted preview, chunk loader, real terrain, road placement, undo, export, sign-out denial');
  for(const [name,user] of [['anonymous',null],['non-owner',{...owner,id:'other',email:'other@example.com'}],['unconfirmed',{...owner,email_confirmed_at:null}],['metadata-spoof',{id:'other',email:'other@example.com',user_metadata:owner}],['owner',owner]]){
   const p=await context.newPage();await p.addInitScript(u=>{window.fixtureUser=u;},user);
   await p.route('**/supabase.min.js',r=>r.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:window.fixtureUser?{access_token:'owner-fixture'}:null}}),getUser:async()=>({data:{user:window.fixtureUser}}),onAuthStateChange:()=>{},signOut:async()=>({})},from:()=>{const q={select:()=>q,order:()=>q,range:async()=>({data:[]})};return q;}})};`}));
   await p.route('**/functions/v1/steeltape-admin',r=>r.fulfill({json:{email:owner.email,days:{},stats:{},players:[],reports:[],modes:{},throne:[]}}));
   await p.goto(origin+'/admin.html');if(name==='owner'){await p.locator('#workshop').waitFor({state:'visible'});await p.waitForFunction(()=>document.querySelector('#workshopStatus').textContent.includes('verified'));assert.equal(await p.locator('#workshopLink').getAttribute('href'),'/map-editor/');}else{await p.waitForFunction(()=>!document.querySelector('#login').hidden);assert.equal(await p.locator('#app').isVisible(),false);assert.equal(await p.locator('#workshopLink').isVisible(),false);}
   await p.close();
  }
  console.log('PASS: admin UI owner, anonymous, non-owner, unconfirmed and metadata-spoof authorization');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
