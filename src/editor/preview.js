// This code is included only in the separate local editor preview document.
if(location.protocol!=='file:'&&!['localhost','127.0.0.1'].includes(location.hostname)&&window.__MAP_WORKSHOP_AUTHORIZED__!==true){document.body.textContent='Owner sign-in required through /admin.html.';throw Error('Owner verification required');}
onbAccountGate=()=>false;bosBoot=()=>Promise.resolve();initLobby=()=>Promise.resolve();boardsStartHeartbeat=()=>{};rosterLoad=()=>Promise.resolve();
const previewFetch=window.fetch.bind(window);window.fetch=(url,opts)=>/supabase\.co|room\.api/i.test(String(url))?Promise.resolve(new Response('{}',{status:503})):previewFetch(url,opts);
const previewCells=realmCells;
realmCells=()=>{worldMapCapture();for(const o of MAP_WORLD.objects.values())o.g.userData.nomerge=true;previewCells();};
const mapCamera={x:0,z:35,zoom:150,ground:false};
function previewCamera() {
  const c=W3.camera,y=gy(mapCamera.x,mapCamera.z);c.far=5000;c.near=.1;c.updateProjectionMatrix();
  if(mapCamera.ground){c.up.set(0,1,0);c.position.set(mapCamera.x+mapCamera.zoom*.3,y+Math.max(3,mapCamera.zoom*.15),mapCamera.z+mapCamera.zoom*.3);c.lookAt(mapCamera.x,y+1,mapCamera.z);}
  else{c.up.set(0,0,-1);c.position.set(mapCamera.x,y+mapCamera.zoom,mapCamera.z+.001);c.lookAt(mapCamera.x,y,mapCamera.z);}c.updateMatrixWorld();
  W3.scene.fog=null;if(TOWN.cells)for(const cell of TOWN.cells)cell.g.visible=Math.hypot(cell.x-mapCamera.x,cell.z-mapCamera.z)<mapCamera.zoom*1.1+85;
}
const previewWait=setInterval(()=>{
  if(!window.__ST||!UAL.ready||!G.screen)return;
  clearInterval(previewWait);CAREER.onboard='done';enterTown();
  const townWait=setInterval(()=>{if(!TOWN.root||TOWN.stalls.length<20)return;clearInterval(townWait);TOWN.busy=true;G.paused=true;if(!MAP_WORLD.captured)worldMapCapture();if(MAP_WORLD.data.props.length)worldMapApply();
    for(const o of MAP_WORLD.objects.values())o.g.userData.mapEditorID=o.id;
    updateCamera=previewCamera;for(const id of ['townHud','townPrompt','townWp','townMini','msgScr','title']){const el=document.getElementById(id);if(el)el.hidden=true;}
    const api={
      snapshot:worldMapSnapshot,assets:()=>[...mapAssetKeys()].sort(),camera:p=>{Object.assign(mapCamera,p);previewCamera();},
      apply:data=>{worldMapApply(data);worldMapRebuildRoads();for(const o of MAP_WORLD.objects.values())o.g.userData.mapEditorID=o.id;previewCamera();},
      warnings:data=>MapCore.routeProblems(data.roads,(x,z,r)=>navBlocked(x,z,r)),
      obstacles:()=>({circles:TOWN.obst.map(p=>({x:p.x,z:p.z,r:p.r})),shapes:GAMEPLAY.shapes.map(p=>({x:p.x,z:p.z,hx:p.hx,hz:p.hz,ry:p.yaw}))}),
      project:(x,z)=>{const p=new THREE.Vector3(x,gy(x,z)+.2,z).project(W3.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},
      hit:(x,y)=>{const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),W3.camera);let id=null;for(const hit of ray.intersectObject(TOWN.root,true)){for(let g=hit.object;g;g=g.parent)if(g.userData.mapEditorID){id=g.userData.mapEditorID;break;}if(id)break;}const hit=ray.intersectObject(TOWN.terrain,false)[0];return hit?{x:hit.point.x,z:hit.point.z,id}:null;},
      walk:async(x,z)=>{gameplayRapierBuild(GAMEPLAY.generation);TOWN.busy=false;G.paused=false;TOWN.pos={x:mapCamera.x,z:mapCamera.z};navPushOut(TOWN.pos);setWaypoint(x,z,'Editor walk test');TRAVEL.auto=true;const end=performance.now()+90000;while(TOWN.wp&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,250));const result={arrived:Math.hypot(TOWN.pos.x-x,TOWN.pos.z-z)<2,position:{...TOWN.pos}};clearWaypoint();TOWN.busy=true;G.paused=true;return result;}
    };window.MapPreview=api;parent.postMessage({type:'map-editor-ready'},location.origin==='null'?'*':location.origin);
  },200);
},200);
