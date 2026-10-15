/* Shared authoring geometry. No DOM, game state, or player storage. */
(function(root) {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const modes = ['none', 'solid', 'surface'];
  const pieces = {
    straight: [[[-5,0],[5,0]]], curve: [[[-5,0],[-3,0],[0,3],[0,5]]],
    tee: [[[-5,0],[0,0],[5,0]],[[0,0],[0,5]]], cross: [[[-5,0],[0,0],[5,0]],[[0,-5],[0,0],[0,5]]], end: [[[-5,0],[0,0]]]
  };
  function validate(map, assets) {
    if (!map || map.version !== 1 || !Array.isArray(map.roads) || !Array.isArray(map.props)) throw Error('Expected a version 1 world map.');
    if (map.roads.length > 2000 || map.props.length > 10000) throw Error('Map exceeds the editor limits.');
    const ids = new Set();
    let totalPoints=0;
    const id = x => { if (typeof x !== 'string' || !/^[\w:.,@-]{1,160}$/.test(x) || ids.has(x)) throw Error('Invalid or duplicate placement ID.'); ids.add(x); };
    for (const r of map.roads) {
      id(r.id); if (!finite(r.w) || r.w < .5 || r.w > 30 || !Array.isArray(r.pts) || r.pts.length < 2 || r.pts.length > 2000 || !r.pts.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))) throw Error('Invalid road '+r.id);
      if (!r.pts.every(p=>p.every(n=>Math.abs(n)<=2000))) throw Error('Road outside map bounds: '+r.id);
      totalPoints+=r.pts.length;if(totalPoints>6000)throw Error('Map exceeds 6,000 road control points.');
      if(r.path!==undefined)throw Error('Road samples are generated from control points, not imported caches.');
      if (r.collision !== 'none' || !['earth','cobble','gravel'].includes(r.surface)) throw Error('Roads need a supported surface and No collision. Use a bridge prop for raised support.');
    }
    for (const p of map.props) {
      id(p.id); if (typeof p.asset !== 'string' || (assets && !assets.has(p.asset)) || !modes.includes(p.collision)) throw Error('Unknown asset or collision mode: '+p.id);
      if (![p.x,p.z,p.y??0,p.ry,p.scale].every(finite) || Math.abs(p.x)>2000 || Math.abs(p.z)>2000 || Math.abs(p.y??0)>100 || p.scale < .1 || p.scale > 10) throw Error('Invalid transform: '+p.id);
      if(p.collision==='surface'&&p.asset!=='map-bridge')throw Error('Select the registered walkable bridge prefab for deck support.');
      if(p.id.startsWith('vendor:')&&p.asset!==p.id)throw Error('Vendor assembly identity cannot change.');
      if (p.asset.startsWith('vendor:') && p.removed) throw Error('A linked vendor assembly cannot be deleted.');
    }
    return JSON.parse(JSON.stringify(map));
  }
  function sample(r) {
    const pts=r.pts;
    if (r.smooth===false || /^(street|yard|ramp|t[234])/.test(r.name||'') || pts.length<3) return pts.map(p=>p.slice());
    const out=[pts[0].slice()];
    for(let i=1;i<pts.length-1;i++) {
      const a=pts[i-1],b=pts[i],c=pts[i+1],la=Math.hypot(b[0]-a[0],b[1]-a[1]),lb=Math.hypot(c[0]-b[0],c[1]-b[1]);
      if(la<.01||lb<.01){out.push(b.slice());continue;}
      const reach=Math.min(/^(country|ridge|riverford|lakeside|northern)/.test(r.name||'')?13:6,la*.22,lb*.22),p=[b[0]-(b[0]-a[0])/la*reach,b[1]-(b[1]-a[1])/la*reach],q=[b[0]+(c[0]-b[0])/lb*reach,b[1]+(c[1]-b[1])/lb*reach];
      out.push(p);for(const t of [.25,.5,.75]){const u=1-t;out.push([u*u*p[0]+2*u*t*b[0]+t*t*q[0],u*u*p[1]+2*u*t*b[1]+t*t*q[1]]);}out.push(q);
    }out.push(pts[pts.length-1].slice());return out;
  }
  function piece(type,x,z,ry=0,scale=1) {
    if(!pieces[type])throw Error('Unknown road piece.');
    const c=Math.cos(ry),s=Math.sin(ry);return pieces[type].map(line=>line.map(([px,pz])=>[x+(px*c+pz*s)*scale,z+(-px*s+pz*c)*scale]));
  }
  function snap(p,roads,grid=1,ignore) {
    let result=grid?[Math.round(p[0]/grid)*grid,Math.round(p[1]/grid)*grid]:p.slice(),best=1;
    for(const r of roads)if(r.id!==ignore)for(const q of [r.pts[0],r.pts[r.pts.length-1]]){const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<best){best=d;result=q.slice();}}
    return result;
  }
  function ribbon(pts,w,height) {
    const position=[],uv=[],index=[];let distance=0;
    for(let i=0;i<pts.length-1;i++) {
      const a=pts[i],b=pts[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;const n=Math.max(1,Math.ceil(len/2.5));
      for(let j=i?1:0;j<=n;j++) {
        const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,prev=pts[Math.max(0,i-(j===0?1:0))],next=pts[Math.min(pts.length-1,i+(j===n?2:1))],dx=next[0]-prev[0],dz=next[1]-prev[1],d=Math.hypot(dx,dz)||1;
        for(const side of [-1,1]){const px=x+dz/d*side*w/2,pz=z-dx/d*side*w/2;position.push(px,height(px,pz)+.048,pz);uv.push(side<0?0:1,(distance+t*len)/7);}
        if(position.length>6){const k=position.length/3-4;index.push(k,k+2,k+1,k+1,k+2,k+3);}
      }distance+=len;
    }return {position,uv,index};
  }
  function routeProblems(roads,blocked) {
    const problems=[];for(const r of roads){const pts=sample(r);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));for(let j=0;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;if(blocked(x,z,.42)){problems.push({id:r.id,x,z});break;}}}}return problems;
  }
  // Split crossings once; the renderer, minimap and route graph use the same sampled paths.
  function network(roads) {
    const segments=[];
    for(const r of roads){const pts=sample(r);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];segments.push({a,b,cuts:[0,1],road:r,minx:Math.min(a[0],b[0]),maxx:Math.max(a[0],b[0]),minz:Math.min(a[1],b[1]),maxz:Math.max(a[1],b[1])});}}segments.sort((a,b)=>a.minx-b.minx);
    for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
      if(segments[j].minx>segments[i].maxx+1e-8)break;if(segments[j].minz>segments[i].maxz+1e-8||segments[j].maxz<segments[i].minz-1e-8)continue;
      const a=segments[i],b=segments[j],dx=a.b[0]-a.a[0],dz=a.b[1]-a.a[1],ex=b.b[0]-b.a[0],ez=b.b[1]-b.a[1],det=dx*ez-dz*ex;
      if(Math.abs(det)<1e-8){const project=(s,p)=>{const x=s.b[0]-s.a[0],z=s.b[1]-s.a[1],d=x*x+z*z;if(!d)return;const t=((p[0]-s.a[0])*x+(p[1]-s.a[1])*z)/d;if(t>=0&&t<=1&&Math.hypot(s.a[0]+x*t-p[0],s.a[1]+z*t-p[1])<1e-7)s.cuts.push(t);};project(a,b.a);project(a,b.b);project(b,a.a);project(b,a.b);continue;}const x=b.a[0]-a.a[0],z=b.a[1]-a.a[1],t=(x*ez-z*ex)/det,u=(x*dz-z*dx)/det;
      if(t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8){a.cuts.push(Math.max(0,Math.min(1,t)));b.cuts.push(Math.max(0,Math.min(1,u)));}
    }
    return segments.flatMap(s=>{const cuts=[...new Set(s.cuts)].sort((a,b)=>a-b),point=t=>[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t],out=[];for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>1e-8)out.push({a:point(cuts[i-1]),b:point(cuts[i]),road:s.road});return out;});
  }
  const api={validate,sample,piece,snap,ribbon,routeProblems,network,pieces};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MapCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
