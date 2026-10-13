const {test,expect}=require('./fixtures');
const fs=require('fs'),path=require('path');
const OUT=path.resolve(__dirname,'../../../../audit-world-2026-10-13');
test('confirm lake collision and recapture underground survey',async({game})=>{
 test.setTimeout(600000);await game.noRender();await game.run('(enterTown(),true)');await game.until('TOWN.on && TOWN.mine');
 const collision=await game.ev(()=>{const s=window.__ST;return ['s:boat','a:beach:1:-9','a:beach:1:0'].map(key=>{const o=s.TOWN.stalls.find(o=>o.V.key===key),ax=o.ax??o.x,az=o.az??o.z,reach=o.reach||2.8;let retained=0,total=0,min=Infinity;for(let dx=-reach;dx<=reach;dx+=.4)for(let dz=-reach;dz<=reach;dz+=.4){if(Math.hypot(dx,dz)>=reach-.1)continue;s.TOWN.pos={x:ax+dx,z:az+dz};for(let i=0;i<8;i++)s.townCollide();const d=Math.hypot(s.TOWN.pos.x-ax,s.TOWN.pos.z-az);min=Math.min(min,d);total++;if(d<reach)retained++;}return{key,name:o.V.name,x:ax,z:az,reach,total,retained,minDistance:min};});});
 fs.writeFileSync(path.join(OUT,'collision-confirmation.json'),JSON.stringify(collision,null,2));
 const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8')),states=[];
 for(const v of manifest.views.filter(v=>v.kind==='mine')){
 const r=await game.ev(v=>{const s=window.__ST,{TOWN,W3}=s;if(!TOWN.mineOn)TOWN.stalls.find(o=>o.V.key==='mine:enter').open();TOWN.pos={x:v.x,z:v.z};const c=W3.camera;c.up.set(0,1,0);c.aspect=4/3;c.fov=60;c.near=.15;c.far=900;c.updateProjectionMatrix();c.position.set(v.x,-22.9,v.z);c.lookAt(v.x-Math.sin(v.yaw)*12,-23.4,v.z-Math.cos(v.yaw)*12);c.updateMatrixWorld(true);s.realmCull();W3.renderer.render(W3.scene,c);const parents=[];for(let o=TOWN.mine;o;o=o.parent)parents.push({type:o.type,visible:o.visible,cell:o.userData.cell});return{image:W3.renderer.domElement.toDataURL('image/jpeg',.9),mineOn:TOWN.mineOn,parents,rootVisible:TOWN.root.visible,camera:c.position.toArray()};},v);
 fs.writeFileSync(path.join(OUT,v.file),Buffer.from(r.image.split(',')[1],'base64'));delete r.image;states.push({id:v.id,...r});
 }
 fs.writeFileSync(path.join(OUT,'mine-capture-state.json'),JSON.stringify(states,null,2));expect(await game.loopErrors()).toEqual([]);
});
