const MapCore = globalThis.MapCore;
const MAP_WORLD = { data: WORLD_MAP_DATA, objects: new Map(), baseline: null, surfaces: [], captured: false, anchors:new Map() };
function worldMapReset() {for(const [key,at]of MAP_WORLD.anchors){STALL_AT[key]=at.slice();if(VENDOR_BY[key]?.at)VENDOR_BY[key].at=at.slice();}MAP_WORLD.objects.clear();MAP_WORLD.baseline=null;MAP_WORLD.surfaces=[];MAP_WORLD.captured=false;TOWN.mapRoadMeshes=[];TOWN.mapRoads=[];}
function mapAssetKeys() {
  const keys=new Set(['map-bridge']);
  for(const source of [PACK_GEO,DECOR_GEO,REALM_GEO,CASTLE_GEO,KENNEY_GEO])for(const key of Object.keys(source))if(/tent|bench|table|house|building|rack|lamp|barrel|crate|tree|fence|cart|bridge/i.test(key)&&!/wall|gate|tower|castle|stairs|ramp/i.test(key))keys.add(key);
  for(const s of TOWN.stalls)if(s.g&&s.g.children.length&&!s.station&&!s.player&&!s.squireNPC)keys.add('vendor:'+s.V.key);
  return keys;
}
function mapTransform(g) { return { x:g.position.x,z:g.position.z,y:g.position.y-gy(g.position.x,g.position.z),ry:g.rotation.y,scale:g.scale.x }; }
function worldMapRoads() {
  const hill=ROADS.filter(r=>/^(street|yard|ramp|t[234])/.test(r.name));
  ROADS.splice(0,ROADS.length,...MAP_WORLD.data.roads.map(r=>({...r,pts:r.pts.map(p=>p.slice())})),...hill.filter(r=>!MAP_WORLD.data.roads.some(q=>q.name===r.name)));
  ROADNET.nodes=[];ROADNET.adj=[];
}
function mapBridge(R,p) {
  const g=new THREE.Group();g.position.set(p.x,gy(p.x,p.z)+(p.y||0),p.z);g.rotation.y=p.ry;g.scale.setScalar(p.scale);g.userData.assetKey='map-bridge';R.add(g);
  const m=tmat('#7c6042');mk(g,new THREE.BoxGeometry(4,.25,10),m,0,.35,0);
  for(const sx of [-1,1]){mk(g,new THREE.BoxGeometry(.15,.15,10),m,sx*1.9,1.3,0);for(const z of [-4,0,4])mk(g,new THREE.BoxGeometry(.15,1.1,.15),m,sx*1.9,.8,z);}return g;
}
function mapObjectBounds(g) {g.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(g);}
function worldMapCapture() {
  MAP_WORLD.objects.clear();const assets=mapAssetKeys(),vendors=new Set();
  for(const s of TOWN.stalls)if(assets.has('vendor:'+s.V.key)) {const id='vendor:'+s.V.key;vendors.add(s.g);if(!MAP_WORLD.anchors.has(s.V.key))MAP_WORLD.anchors.set(s.V.key,[s.x,s.z]);MAP_WORLD.objects.set(id,{id,asset:id,g:s.g,stall:s,base:{...mapTransform(s.g),ax:s.ax,az:s.az},collision:'solid'});}
  const counts=new Map();TOWN.root.traverse(g=>{
    const key=g.userData.assetKey;if(!key||!assets.has(key)||tierOf(g.position.x,g.position.z))return;for(let a=g.parent;a;a=a.parent)if(vendors.has(a))return;
    const b=mapTransform(g),stem=key+'@'+b.x.toFixed(2)+','+b.z.toFixed(2),n=counts.get(stem)||0;counts.set(stem,n+1);
    const id=stem+':'+n;MAP_WORLD.objects.set(id,{id,asset:key,g,base:b,collision:'solid'});
  });
  const bounds=[...MAP_WORLD.objects.values()].map(v=>({...v,bounds:mapObjectBounds(v.g)}));
  const owner=o=>{let best=null,distance=Infinity;for(const v of bounds){const b=v.bounds,dx=Math.max(b.min.x-o.x,0,o.x-b.max.x),dz=Math.max(b.min.z-o.z,0,o.z-b.max.z),d=dx*dx+dz*dz;if(d<.01&&Math.hypot(o.x-v.base.x,o.z-v.base.z)<distance){best=v.id;distance=Math.hypot(o.x-v.base.x,o.z-v.base.z);}}return best;};
  MAP_WORLD.baseline={circles:TOWN.obst.map(o=>({...o,owner:owner(o)})),shapes:GAMEPLAY.shapes.map(o=>({x:o.x,z:o.z,hx:o.hx,hz:o.hz,yaw:o.yaw,height:o.height,owner:owner(o)}))};
  const owned=new Set([...MAP_WORLD.baseline.circles,...MAP_WORLD.baseline.shapes].map(o=>o.owner));for(const v of MAP_WORLD.objects.values()){v.originalCollision=owned.has(v.id)?'solid':'none';v.collision=v.originalCollision;}
  MAP_WORLD.captured=true;
}
function worldMapSnapshot() {
  return {version:1,roads:ROADS.map((r,i)=>({id:r.id||'road:'+r.name+':'+i,name:r.name,pts:r.pts.map(p=>p.slice()),w:r.w,surface:r.surface||'earth',collision:'none',smooth:r.smooth!==false,navOnly:!!r.navOnly})),props:[...MAP_WORLD.objects.values()].map(o=>({id:o.id,asset:o.asset,...mapTransform(o.g),collision:o.collision,removed:!o.g.parent}))};
}
function mapMoveFootprint(o,record) {
  const v=MAP_WORLD.objects.get(o.owner);if(!v||!record)return {...o};const b=v.base,k=record.scale/b.scale,a=record.ry-b.ry,c=Math.cos(a),s=Math.sin(a),x=(o.x-b.x)*k,z=(o.z-b.z)*k;
  return {...o,x:record.x+x*c+z*s,z:record.z-x*s+z*c,r:o.r*k,hx:o.hx*k,hz:o.hz*k,yaw:(o.yaw||0)+a};
}
function worldMapApply(data=MAP_WORLD.data) {
  if(!MAP_WORLD.captured)worldMapCapture();const valid=MapCore.validate(data,mapAssetKeys()),records=new Map(valid.props.map(p=>[p.id,p]));
  for(const p of valid.props){const v=MAP_WORLD.objects.get(p.id);if(v&&v.asset!==p.asset)throw Error('Placement asset identity cannot change.');}
  MAP_WORLD.data=valid;MAP_WORLD.surfaces=[];
  for(const v of MAP_WORLD.objects.values())if(!records.has(v.id)){if(v.added)v.g.removeFromParent();else records.set(v.id,{id:v.id,asset:v.asset,...v.base,collision:v.originalCollision});}
  for(const p of records.values()){let v=MAP_WORLD.objects.get(p.id);if(!v){if(p.asset.startsWith('vendor:'))throw Error('Unknown vendor anchor '+p.id);const g=p.asset==='map-bridge'?mapBridge(TOWN.root,p):kpiece(TOWN.root,p.asset,p.x,gy(p.x,p.z),p.z,p.ry,p.scale);if(!g)throw Error('Missing asset '+p.asset);v={id:p.id,asset:p.asset,g,base:{...p},collision:p.collision,added:true};MAP_WORLD.objects.set(p.id,v);}
    const g=v.g;if(p.removed){g.removeFromParent();continue;}if(!g.parent)TOWN.root.add(g);g.position.set(p.x,gy(p.x,p.z)+(p.y||0),p.z);g.rotation.y=p.ry;g.scale.setScalar(p.scale);v.collision=p.collision;g.userData.collision=p.collision;
    if(v.stall){const s=v.stall,b=v.base,a=p.ry-b.ry,c=Math.cos(a),sn=Math.sin(a),dx=b.ax-b.x,dz=b.az-b.z;s.x=p.x;s.z=p.z;STALL_AT[s.V.key]=[p.x,p.z];if(s.V.at)s.V.at=[p.x,p.z];s.ax=p.x+dx*c+dz*sn;s.az=p.z-dx*sn+dz*c;s.ry=p.ry;if(s.label&&!g.getObjectById(s.label.id))s.label.position.set(p.x,s.label.position.y,p.z);}
    if(p.collision==='surface'){if(p.asset!=='map-bridge')throw Error('Walkable surface currently requires the registered bridge prefab.');MAP_WORLD.surfaces.push({x:p.x,z:p.z,ry:p.ry,hx:2*p.scale,hz:5*p.scale,y:g.position.y+.475*p.scale});}
  }
  TOWN.obst=MAP_WORLD.baseline.circles.filter(o=>{const p=records.get(o.owner);return !p||(!p.removed&&p.collision==='solid');}).map(o=>mapMoveFootprint(o,records.get(o.owner)));
  GAMEPLAY.shapes=[];GAMEPLAY.shapeGrid.clear();
  for(const o of MAP_WORLD.baseline.shapes){const p=records.get(o.owner);if(p&&(p.removed||p.collision!=='solid'))continue;const q=mapMoveFootprint(o,p);gameplayShape(q.x,q.z,q.hx,q.hz,q.yaw,q.height);}
  for(const [id,v] of MAP_WORLD.objects){const p=records.get(id);if(!p||p.removed)continue;if((v.added||v.originalCollision==='none')&&p.collision==='solid')gameplayPropFootprint(v.g,/open/i.test(p.asset));if(p.collision==='surface')for(const sx of [-1,1]){const dx=sx*1.9*p.scale;gameplayShape(p.x+dx*Math.cos(p.ry),p.z-dx*Math.sin(p.ry),.12*p.scale,5*p.scale,p.ry,1.3*p.scale);}}
  navBuild();ROADNET.nodes=[];ROADNET.adj=[];if(TOWN.pos)navPushOut(TOWN.pos);for(const n of FOLK.people){navPushOut(n);n.route=null;}
  return valid;
}
function worldMapSurfaceAt(x,z) {
  for(const p of MAP_WORLD.surfaces){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.ry),s=Math.sin(p.ry);if(Math.abs(dx*c-dz*s)<p.hx&&Math.abs(dx*s+dz*c)<p.hz)return p.y;}return null;
}
function worldMapRebuildRoads() {
  for(const m of TOWN.mapRoadMeshes||[]) {m.removeFromParent();m.geometry.dispose();}TOWN.mapRoadMeshes=[];TOWN.mapRoads=[];worldMapRoads();
  for(const r of ROADS)if(!r.navOnly)realmRoad(TOWN.root,roadPath(r),r.w,r.surface);
  worldMapJunctions(TOWN.root);
}
function worldMapJunctions(root) {
  const nodes=new Map();for(const e of MapCore.network(ROADS.filter(r=>!r.navOnly)))for(const p of [e.a,e.b]){const key=p.map(n=>n.toFixed(3)).join(',');let n=nodes.get(key);if(!n)nodes.set(key,n={x:p[0],z:p[1],edges:0,w:0});n.edges++;n.w=Math.max(n.w,e.road.w);}
  const material=TMAT.mapJunction||(TMAT.mapJunction=lmat({color:'#91876d',roughness:1,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));
  for(const n of nodes.values())if(n.edges>=3){const g=new THREE.CircleGeometry(n.w*.48,20),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=n.x+p.getX(i),z=n.z+p.getY(i);p.setXYZ(i,x,gy(x,z)+.049,z);}g.computeVertexNormals();const m=mk(root,g,material,0,0,0,false);m.userData.collision='none';TOWN.mapRoadMeshes.push(m);}
}
