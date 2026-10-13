const { test, expect } = require('./fixtures');
const fs=require('fs'), path=require('path');
const OUT=path.resolve(__dirname,'../../../../audit-world-2026-10-13');
test('systematic world coverage and location inventory',async({game,page})=>{
 test.setTimeout(1800000);fs.mkdirSync(path.join(OUT,'views'),{recursive:true});
 await game.noRender();await game.run('(enterTown(),true)');await game.until('TOWN.on && TOWN.cells');
 await page.setViewportSize({width:720,height:540});
 await game.run('(G.renderEvery=1e9,W3.renderer.setPixelRatio(1),W3.renderer.setSize(720,540),true)');
 const inventory=await game.ev(()=>{const s=window.__ST,assets=[];s.TOWN.root.updateMatrixWorld(true);s.TOWN.root.traverse(o=>{if(o.userData.assetKey){const p=new s.THREE.Vector3().setFromMatrixPosition(o.matrixWorld);assets.push({key:o.userData.assetKey,x:p.x,y:p.y,z:p.z});}});return {districts:s.DISTRICTS,arenas:s.ARENAS.map(({key,name,x,z,entry,indoor})=>({key,name,x,z,entry,indoor})),vendors:s.VENDORS.map(({key,name,at,role})=>({key,name,at,role})),stations:s.STATIONS.map(({key,name,at,role})=>({key,name,at,role})),stalls:s.TOWN.stalls.map(o=>({key:o.V?.key,name:o.V?.name,role:o.V?.role,x:o.x,z:o.z,ax:o.ax,az:o.az,mine:!!o.mine,approachBlocked:!!s.navBlocked(o.ax??o.x,o.az??o.z,.42),hasAction:typeof o.open==='function'})),assets,cellCount:s.TOWN.cells.length};});
 fs.writeFileSync(path.join(OUT,'inventory.json'),JSON.stringify(inventory,null,2));
 const views=[],directions=['N','NE','E','SE','S','SW','W','NW'];
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const id='R'+String(row+1).padStart(2,'0')+'C'+String(col+1).padStart(2,'0'),x=-620+(col+.5)*155,z=-640+(row+.5)*160;
  views.push({id:id+'-overhead',cell:id,x,z,kind:'overhead'});
  if(Math.hypot(x/620,z/640)<1)directions.forEach((d,i)=>views.push({id:id+'-'+d,cell:id,x,z,kind:'ground',yaw:i*Math.PI/4}));
 }
 const points=[...inventory.arenas.map(a=>({key:'arena-'+a.key,name:a.name,at:a.entry||[a.x,a.z]})),...inventory.stalls.filter(v=>!v.mine&&!v.key?.startsWith('n:')).map(v=>({...v,key:'interaction-'+v.key,at:[v.x,v.z]})),...inventory.stations.map(v=>({...v,key:'station-'+v.key}))].filter(p=>p.at);
 for(const p of points)for(let i=0;i<4;i++)views.push({id:p.key+'-'+directions[i*2],name:p.name,x:p.at[0],z:p.at[1],kind:'detail',yaw:i*Math.PI/2});
 for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let d=0;d<4;d++)views.push({id:'mine-R'+r+'C'+c+'-'+directions[d*2],kind:'mine',x:-278+c*15,z:-68+r*15,yaw:d*Math.PI/2});
 for(const v of views)v.id=v.id.replace(/[^a-zA-Z0-9_-]/g,'_');
 let previous=[];try{previous=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8')).views;}catch{}
 const prior=new Map(previous.map(v=>[v.id,v]));
 let count=0;const records=[];
 for(const v of views){const dest=path.join(OUT,'views',v.id+'.jpg');if(fs.existsSync(dest)){records.push(prior.get(v.id)||{...v,file:'views/'+v.id+'.jpg'});count++;continue;}const r=await game.ev(v=>{const s=window.__ST,{TOWN,W3,THREE}=s,c=W3.camera;if(v.kind==='mine'&&!TOWN.mineOn)TOWN.stalls.find(o=>o.V.key==='mine:enter').open();TOWN.pos={x:v.x,z:v.z};c.up.set(0,1,0);c.aspect=720/540;c.fov=60;c.near=.15;c.far=900;c.updateProjectionMatrix();const h=v.kind==='mine'?-25:s.gy(v.x,v.z);if(v.kind==='overhead'){c.up.set(0,0,-1);c.position.set(v.x,h+155,v.z);c.lookAt(v.x,h,v.z);}else{const d=v.kind==='detail'?7:0;c.position.set(v.x+Math.sin(v.yaw)*d,(v.kind==='mine'?-25:s.gy(v.x+Math.sin(v.yaw)*d,v.z+Math.cos(v.yaw)*d))+2.1,v.z+Math.cos(v.yaw)*d);c.lookAt(v.x-Math.sin(v.yaw)*12,h+1.6,v.z-Math.cos(v.yaw)*12);}c.updateMatrixWorld(true);s.realmCull();W3.renderer.render(W3.scene,c);return {terrainY:h,visibleCells:TOWN.cells.filter(c=>c.g.visible).length,image:W3.renderer.domElement.toDataURL('image/jpeg',.86)};},v);fs.writeFileSync(dest,Buffer.from(r.image.split(',')[1],'base64'));records.push({...v,terrainY:r.terrainY,visibleCells:r.visibleCells,file:'views/'+v.id+'.jpg'});if(++count%16===0){fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({complete:false,planned:views.length,views:records},null,2));console.log('WORLD '+count+'/'+views.length);}}
 fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({complete:true,planned:views.length,bounds:{x:[-620,620],z:[-640,640]},views:records},null,2));expect(await game.loopErrors()).toEqual([]);
});
