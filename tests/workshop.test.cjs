const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const {createHandler,COOKIE}=require('../src/server/map-workshop.js');
const owner={id:'8c40a519-d188-4779-ab4c-88ef4b939e07',email:'garrettrobson95@gmail.com',email_confirmed_at:'2026-10-01',is_anonymous:false};
test('protected workshop verifies owner identity, confirmation, session expiry, revocation and every payload',async t=>{
 let time=Date.now(),revoked=false,calls=0;
 const users={owner,other:{...owner,id:'other',email:'other@example.com'},unconfirmed:{...owner,email_confirmed_at:null},anonymous:{...owner,is_anonymous:true},spoof:{id:'other',email:'other@example.com',user_metadata:{...owner}}};
 const handler=createHandler({key:'ab'.repeat(32),now:()=>time,assetsRoot:path.join(__dirname,'../dist/api/workshop-assets'),origin:'https://workshop.test',fetch:async(url,options)=>{calls++;const u=!revoked&&users[options.headers.Authorization.slice(7)];return new Response(JSON.stringify(u||{}),{status:u?200:401});}});
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 const get=(asset,cookie)=>fetch(base+'/?asset='+encodeURIComponent(asset),{headers:cookie?{cookie}:undefined});
 const login=(token,origin='https://workshop.test')=>fetch(base+'/?asset=session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}});
 assert.equal((await get('index.html')).status,401);assert.equal((await get('preview-part-00.bin')).status,401);assert.equal(calls,0);
 for(const token of ['other','unconfirmed','anonymous','spoof'])assert.equal((await login(token)).status,403,token);
 assert.equal((await login('invalid')).status,401);assert.equal((await login('owner','https://evil.test')).status,403);
 const r=await login('owner');assert.equal(r.status,200);const set=r.headers.get('set-cookie');assert.match(set,/HttpOnly; Secure; SameSite=Strict/);assert.ok(!set.includes('owner'));const cookie=set.split(';')[0];assert.ok(cookie.startsWith(COOKIE+'='));
 const html=await get('index.html',cookie);assert.equal(html.status,200);assert.match(await html.text(),/__MAP_WORKSHOP_AUTHORIZED__/);assert.match(html.headers.get('cache-control'),/no-store/);
 for(const asset of ['editor.js','preview.html','preview-loader.js','preview-part-00.bin','world-map.json'])assert.equal((await get(asset,cookie)).status,200,asset);
 assert.equal((await get('../index.html',cookie)).status,400);assert.equal((await get('manifest.json',cookie)).status,404);
 assert.equal((await get('index.html',cookie+'x')).status,401);
 revoked=true;assert.equal((await get('preview-part-00.bin',cookie)).status,401);revoked=false;
 time+=901000;assert.equal((await get('index.html',cookie)).status,401);
});
test('public build contains no owner workshop in the offline cache and hosted chunks fit function responses',()=>{
 const fs=require('node:fs'),root=path.join(__dirname,'../dist'),assets=path.join(root,'api/workshop-assets');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(sw,/map-editor/);assert.match(sw,/api\\\/map-workshop/);
 const manifest=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json')));for(const name of manifest.files)assert.ok(fs.statSync(path.join(assets,name+'.asset')).size<4400000,name);
 const preview=fs.readFileSync(path.join(assets,'preview.html.asset'),'utf8');assert.ok(!preview.includes('update_prompt.js'));assert.ok(preview.includes('preview-loader.js'));
});
