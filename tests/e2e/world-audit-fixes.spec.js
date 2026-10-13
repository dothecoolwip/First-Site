const {test,expect}=require('./fixtures');
const fs=require('fs'),path=require('path');
const OUT=path.resolve(__dirname,'../../../../audit-world-2026-10-13/fixes');

test('lake shore interactions are reachable while players and NPCs stay out of water @touch',async({game,page})=>{
 await game.noRender();await page.locator('#btnFight').click();await game.until('TOWN.on && TOWN.stalls.length > 100');
 const results=await game.ev(()=>{const s=window.__ST;return ['s:boat','a:beach:1:-9','a:beach:1:0'].map(key=>{
  const o=s.TOWN.stalls.find(o=>o.V.key===key),ax=o.ax??o.x,az=o.az??o.z,reach=o.reach||2.8;let point=null,best=Infinity;
  for(let dx=-reach;dx<=reach;dx+=.2)for(let dz=-reach;dz<=reach;dz+=.2){const d=Math.hypot(dx,dz);if(d>=reach-.15||s.navBlocked(ax+dx,az+dz,.42))continue;s.TOWN.pos={x:ax+dx,z:az+dz};for(let i=0;i<4;i++)s.townCollide();if(Math.hypot(s.TOWN.pos.x-ax,s.TOWN.pos.z-az)<reach-.1&&d<best){best=d;point={...s.TOWN.pos};}}
  if(!point)return{key,point};const route=s.realmPath(150,120,point.x,point.z);let blocked=0,prev=[150,120];for(const next of route){const n=Math.max(1,Math.ceil(Math.hypot(next[0]-prev[0],next[1]-prev[1])*2));for(let i=1;i<=n;i++){const x=prev[0]+(next[0]-prev[0])*i/n,z=prev[1]+(next[1]-prev[1])*i/n;if(s.navBlocked(x,z,.42))blocked++;}prev=next;}
  return{key,point,route:route.length,blocked};
 });});
 for(const r of results){expect(r.point,JSON.stringify(results)).toBeTruthy();expect(r.route).toBeGreaterThan(1);expect(r.blocked,JSON.stringify(results)).toBe(0);}
 const water=await game.ev(()=>{const s=window.__ST;let blocked=0;for(let i=0;i<72;i++){const a=i*Math.PI/36;if(s.navBlocked(222+Math.cos(a)*56*.97,40+Math.sin(a)*82*.97,.42))blocked++;}s.TOWN.pos={x:222,z:40};s.townCollide();const player={...s.TOWN.pos},npc={x:222,z:40};s.navPushOut(npc);return{blocked,player,npc};});
 expect(water.blocked).toBe(72);for(const p of [water.player,water.npc])expect(Math.hypot((p.x-222)/56,(p.z-40)/82)).toBeGreaterThanOrEqual(1);
 for(const r of results){await game.run(`(TOWN.spec=null,TOWN.pos=${JSON.stringify(r.point)},true)`);await game.until(`TOWN.near?.V.key===${JSON.stringify(r.key)}`);await expect(page.locator('#townPrompt')).toBeVisible();await page.locator('#townPrompt').click();if(r.key==='s:boat')expect(await game.run("!!CAREER.found['boat']")).toBe(true);else{expect(await game.run('!!TOWN.spec')).toBe(true);await game.run('(stopSpectating(),true)');}}
 fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'lake-checks.json'),JSON.stringify({results,water},null,2));
});

test('boards have readable fronts and opaque timber backs @touch',async({game,page},info)=>{
 await game.noRender();await page.locator('#btnFight').click();await game.until('TOWN.on && BOARDS.faces.online');
 const checks=await game.ev(()=>{const s=window.__ST;return s.TOWN.stalls.filter(o=>o.V.key.startsWith('scoreboard:')).map(o=>({key:o.V.key,front:o.g.getObjectByName('scoreboardFace')?.material.side,back:!!o.g.getObjectByName('scoreboardBacking')}));});
 expect(checks).toHaveLength(2);for(const c of checks){expect(c.front).toBe(0);expect(c.back).toBe(true);}
 fs.mkdirSync(OUT,{recursive:true});
 for(const side of [1,-1]){const data=await game.ev(side=>{const s=window.__ST,o=s.TOWN.stalls.find(o=>o.V.key==='scoreboard:leaderboard'),c=s.W3.camera,center=new s.THREE.Vector3(0,3.1,.19);o.g.updateMatrixWorld(true);o.g.localToWorld(center);const eye=o.g.localToWorld(new s.THREE.Vector3(0,3.1,side*8));c.position.copy(eye);c.up.set(0,1,0);c.lookAt(center);c.updateMatrixWorld(true);s.realmCull();s.W3.renderer.render(s.W3.scene,c);return s.W3.renderer.domElement.toDataURL('image/png');},side);fs.writeFileSync(path.join(OUT,`board-${side===1?'front':'back'}-${info.project.name}.png`),Buffer.from(data.split(',')[1],'base64'));}
});

test('weather changes preserve underground fog and restore the surface on exit @touch',async({game,page},info)=>{
 await game.noRender();await page.locator('#btnFight').click();await game.until('TOWN.on && TOWN.mine');await game.run("(setWeather('clear'),true)");
 const surface=await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far})');await game.run("(TOWN.stalls.find(o=>o.V.key==='mine:enter').open(),true)");
 for(const weather of ['rain','snow','clear']){await game.run(`(setWeather('${weather}'),true)`);await game.frames(3);expect(await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far,sun:W3.sun.intensity,weatherVisible:!!WX.obj?.visible})')).toEqual({near:9,far:65,sun:.12,weatherVisible:false});}
 await game.run('(TOWN.pos={x:-249,z:-51},TOWN.yaw=.45,TOWN.cam=null,updateTownCamera(1),true)');const image=await game.ev(()=>{const s=window.__ST;s.W3.renderer.render(s.W3.scene,s.W3.camera);return s.W3.renderer.domElement.toDataURL('image/png');});fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,`mine-weather-${info.project.name}.png`),Buffer.from(image.split(',')[1],'base64'));
 await game.run("(TOWN.stalls.find(o=>o.V.key==='mine:exit').open(),true)");expect(await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far})')).toEqual(surface);
 await game.run("(TOWN.stalls.find(o=>o.V.key==='mine:enter').open(),setWeather('rain'),TOWN.stalls.find(o=>o.V.key==='mine:exit').open(),true)");
 expect(await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far,visible:WX.obj.visible})')).toEqual({near:25,far:surface.far,visible:true});
});
