const {test,expect}=require('./fixtures');
const base=require('playwright/test');
const path=require('path');
const fs=require('fs');

base.test('map workshop retains editable assets, road pieces, vendor anchors, undo and import safety',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 await page.goto('http://127.0.0.1:8848/map-editor/');
 await page.waitForFunction(()=>document.querySelector('#world').contentWindow.MapPreview,{timeout:120000});
 const baseline=await page.evaluate(()=>{const a=document.querySelector('#world').contentWindow.MapPreview;return {props:a.snapshot().props.length,roads:a.snapshot().roads.length,assets:a.assets().length};});
 expect(baseline.props).toBeGreaterThan(100);expect(baseline.roads).toBeGreaterThan(20);
 await page.locator('#piece').selectOption('cross');await page.locator('[data-tool="piece"]').click();
 const canvas=page.locator('#handles'),box=await canvas.boundingBox();await canvas.click({position:{x:box.width*.7,y:box.height*.7}});
 await expect(page.locator('#status')).toContainText('saved');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-tape-map-editor-v1')).roads.length)).toBe(baseline.roads+2);
 await page.locator('#undo').click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('steel-tape-map-editor-v1')).roads.length)).toBe(baseline.roads);
 await page.locator('#redo').click();
 const changed=await page.evaluate(()=>{const a=document.querySelector('#world').contentWindow.MapPreview,d=a.snapshot(),v=d.props.find(p=>p.id==='vendor:barber');if(!v)throw Error('No barber assembly');v.x+=12;v.z+=8;v.ry+=.3;a.apply(d);const t=document.querySelector('#world').contentWindow.__ST.TOWN.stalls.find(s=>s.V.key==='barber');return {x:t.x,z:t.z,ax:t.ax,az:t.az,px:v.x,pz:v.z,props:a.snapshot().props.length};});
 expect(changed.x).toBe(changed.px);expect(changed.z).toBe(changed.pz);expect(Math.hypot(changed.x-changed.ax,changed.z-changed.az)).toBeLessThan(10);
 const collision=await page.evaluate(()=>{const frame=document.querySelector('#world').contentWindow,a=frame.MapPreview,s=frame.__ST,d=a.snapshot(),asset=a.assets().find(k=>/bench/i.test(k)&&!k.startsWith('vendor:'));let point;for(let x=90;x<160&&!point;x+=5)for(let z=100;z<160;z+=5)if(!s.navBlocked(x,z,3)){point={x,z};break;}if(!point)throw Error('No fixture clearing');const prop={id:'prop:collision-fixture',asset,...point,y:0,ry:0,scale:1,collision:'solid'};d.props.push(prop);a.apply(d);const solid=s.navBlocked(point.x,point.z,.1);prop.collision='none';a.apply(d);const none=s.navBlocked(point.x,point.z,.1);d.props.push({id:'prop:bridge-fixture',asset:'map-bridge',x:222,z:40,y:1,ry:0,scale:1,collision:'surface'});a.apply(d);return {solid,none,deck:s.gy(222,40),waterCentre:s.navBlocked(222,40,.1),rail:s.navBlocked(223.9,40,.1)};});
 expect(collision.solid).toBe(true);expect(collision.none).toBe(false);expect(collision.waterCentre).toBe(false);expect(collision.rail).toBe(true);expect(collision.deck).toBeGreaterThan(1);
 const before=await page.evaluate(()=>localStorage.getItem('steel-tape-map-editor-v1'));
 await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"roads":[],"props":[{"id":"evil","asset":"unknown","collision":"none"}]}')});
 await expect(page.locator('#status')).toContainText('Import rejected');expect(await page.evaluate(()=>localStorage.getItem('steel-tape-map-editor-v1'))).toBe(before);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('st-')))).toEqual([]);
 await page.screenshot({path:path.join(__dirname,'../map-workshop.png'),fullPage:true});expect(errors).toEqual([]);
});

test('a complete verified crown win reviews crooked scores and retries its verdict without duplicate rewards',async({game,page})=>{
 const Core=require('../../supabase/functions/steeltape-throne/crown-core.js'),{policy}=require('../calibrate.cjs');
 let all,s,seed;for(seed=1;seed<=200;seed++){all=[];s=Core.create(seed,{weapon:'sword'},{weapon:'sword'});while(!s.done){const v=policy(s);all.push(v);Core.step(s,v);}if(s.winner===0)break;}expect(s.winner).toBe(0);
 let server,failed=false,finishes=0;const id='00000000-0000-4000-8000-000000000006';const snapshot={name:'Offline King',look:{g:'male',b:'#6b2988',t:'#ffcc33'},loadout:Core.normalizeLoadout({weapon:'sword'}),royal:true};
 await page.route('**/functions/v1/steeltape-throne',async r=>{const b=r.request().postDataJSON();let json;if(b.action==='begin'){server=Core.create(seed,snapshot.loadout,snapshot.loadout);json={id,status:'active',state:server,challenger:{...snapshot,name:'Challenger'},defender:snapshot};}else if(b.action==='input'){server=Core.batch(server,b.inputs);json={seq:b.seq,state:server};}else if(b.action==='finish'){finishes++;if(!failed){failed=true;return r.fulfill({status:503,json:{error:'Fixture delayed verdict'}});}expect(server.done).toBe(true);expect(server.winner).toBe(0);json={claimed:true,seat:'king',reward:5000};}else json={};return r.fulfill({json});});
 await game.noRender();await game.run("(BOS.user={id:'fixture'}, BOS.sb={auth:{getSession:async()=>({data:{session:null}})}}, true)");await game.run("(async()=>{await crownBegin('king');G.paused=true;})()");expect(await game.run('CROWN.state.tick')).toBe(0);
 const money=await game.run('CAREER.purse');
 await game.ev(async inputs=>{const t=window.__ST;t.G.paused=true;for(let i=0;i<inputs.length;i+=60){const chunk=inputs.slice(i,i+60);for(const v of chunk){t.CrownCore.step(t.CROWN.state,v);t.CROWN.queue.push(v);}t.CROWN.checks.set(t.CROWN.state.tick,t.crownFingerprint(t.CROWN.state));await t.crownFlush();}},all);
 await expect(page.locator('#msgScr')).toContainText('Verdict awaiting confirmation');expect(finishes).toBe(1);
 await page.getByRole('button',{name:'Check verdict',exact:true}).click();await expect(page.locator('#msgScr')).toContainText('crown is yours');
 expect(await game.run('CAREER.purse')).toBe(money+5000);await game.run(`crownFinish('${id}')`);expect(await game.run('CAREER.purse')).toBe(money+5000);expect(await game.run('CAREER.throneAttempts["'+id+'"]')).toBe('won');
 // The deliberate 503 above is an expected fixture response, not a JavaScript failure.
 game.errors=game.errors.filter(e=>!e.includes('[console] Failed to load resource: the server responded with a status of 503'));
});

test('crown NPC fights replay inputs, show holder appearance and interrupt safely @touch',async({game,page})=>{
 let state,seq=0,calls=[];
 const Core=require('../../supabase/functions/steeltape-throne/crown-core.js');
 const uid='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
 const look={g:'male',b:'#336699',t:'#ffeebb',hc:'#333333',be:'full',sh:{height:75}};
 const snapshot={uid,name:'Offline King',look,loadout:Core.normalizeLoadout({weapon:'mace',helm:'pigface',heightValue:75}),royal:true};
 await page.route('**/functions/v1/steeltape-throne',async r=>{const b=r.request().postDataJSON();if(!b)return r.fulfill({json:{seats:{}}});calls.push(b.action);let result;
 if(b.action==='begin'){state=Core.create(35,{weapon:'sword'},snapshot.loadout);result={id,seq,status:'active',state,challenger:{...snapshot,name:'Challenger',loadout:Core.normalizeLoadout({weapon:'sword'})},defender:snapshot};}
 else if(b.action==='input'){state=Core.batch(state,b.inputs);seq=b.seq;result={state,seq};}else result={abandoned:true};await r.fulfill({json:result});});
 await game.noRender();await game.run(`(BOS.user={id:'${uid}'}, BOS.sb={auth:{getSession:async()=>({data:{session:null}})}}, true)`);
 await game.run("crownBegin('king')");await game.until('CROWN.active && G.match.crownNPC');
 expect(await game.run("G.fighters.find(f=>!f.isPlayer).name")).toBe('Offline King');expect(await game.run("G.fighters.find(f=>!f.isPlayer).weapon.key || G.fighters.find(f=>!f.isPlayer).spec.weapon")).toBe('mace');
 await page.locator('#crownControls [data-zone="head"]').click();await page.getByRole('button',{name:'Strike',exact:true}).click();await game.until('CROWN.seq >= 2');
 expect(calls.filter(x=>x==='input').length).toBeGreaterThanOrEqual(2);expect(await game.run('CROWN.active')).toBe(true);
 expect(await game.run('G.fighters.every(f=>Number.isFinite(f.model.root.position.x) && Number.isFinite(f.pos.z))')).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await game.until('!CROWN.active');expect(await page.locator('#msgScr').innerText()).toMatch(/interrupted/i);expect(calls).toContain('abandon');
});
