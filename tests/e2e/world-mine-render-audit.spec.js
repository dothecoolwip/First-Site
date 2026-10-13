const {test,expect}=require('./fixtures');const fs=require('fs'),path=require('path');const OUT=path.resolve(__dirname,'../../../../audit-world-2026-10-13');
test('diagnose underground fog and recover structural survey',async({game})=>{
 test.setTimeout(600000);await game.noRender();await game.run('(enterTown(),true)');await game.until('TOWN.on && TOWN.mine');await game.frames(4);
 const before=await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far,base:W3.fogBase?.near})');
 await game.run("(TOWN.stalls.find(o=>o.V.key==='mine:enter').open(),true)");
 const entered=await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far,base:W3.fogBase?.near})');await game.frames(6);
 const after=await game.run('({near:W3.scene.fog.near,far:W3.scene.fog.far,base:W3.fogBase?.near})');
 const views=JSON.parse(fs.readFileSync(path.join(OUT,'manifest.json'),'utf8')).views.filter(v=>v.kind==='mine');
 const normal=await game.ev(()=>{const s=window.__ST;s.W3.renderer.render(s.W3.scene,s.W3.camera);return s.W3.renderer.domElement.toDataURL('image/jpeg',.9);});fs.writeFileSync(path.join(OUT,'mine-normal-after-weather.jpg'),Buffer.from(normal.split(',')[1],'base64'));
 for(const v of views){const image=await game.ev(v=>{const s=window.__ST,{TOWN,W3}=s;TOWN.pos={x:v.x,z:v.z};const c=W3.camera;c.up.set(0,1,0);c.aspect=16/9;c.fov=60;c.near=.15;c.far=900;c.updateProjectionMatrix();c.position.set(v.x,-22.9,v.z);c.lookAt(v.x-Math.sin(v.yaw)*12,-23.4,v.z-Math.cos(v.yaw)*12);c.updateMatrixWorld(true);s.realmCull();const near=W3.scene.fog.near;W3.scene.fog.near=9;W3.renderer.render(W3.scene,c);const im=W3.renderer.domElement.toDataURL('image/jpeg',.9);W3.scene.fog.near=near;return im;},v);fs.writeFileSync(path.join(OUT,v.file),Buffer.from(image.split(',')[1],'base64'));}
 fs.writeFileSync(path.join(OUT,'mine-diagnostic.json'),JSON.stringify({before,entered,after,structuralCapture:'Temporarily sets fog.near to intended mine value 9 for each image; restores original immediately. No game source fix.'},null,2));expect(await game.loopErrors()).toEqual([]);
});
