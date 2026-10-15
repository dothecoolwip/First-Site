export function createCrownService(repo,Core,randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]) {
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 const failure=(message,status=409)=>{const e=new Error(message);e.status=status;throw e;};
 const publicAttempt=a=>({id:a.id,seat:a.seat,seq:a.seq,status:a.status,state:a.state,challenger:a.challenger,defender:a.defender,expires:a.expires_at,result:a.result});
 return async(uid,body)=>{
  if(!uid)failure('Sign in before challenging.',401);
  if(!body||typeof body!=='object')failure('Invalid request.',400);
  if(body.action==='begin'||body.action==='challenge'){
   if(!['king','queen'].includes(body.seat)||!uuid(body.key))failure('Invalid crown or request key.',400);
   const old=await repo.byKey(uid,body.key);if(old){if(old.seat!==body.seat)failure('Request key belongs to a different crown.');if(old.status==='active'&&Date.parse(old.expires_at)<Date.now())failure('Attempt expired; start a new challenge.');return publicAttempt(old);}
   const fighter=await repo.fighter(uid);if(!fighter||fighter.gender!==(body.seat==='king'?'male':'female'))failure('Link an eligible fighter before challenging.',403);
   const throne=await repo.throne(body.seat);if(!throne?.holder_uid||throne.holder_uid===uid)failure('You cannot challenge your own crown.');
   const challenger=await repo.snapshot(uid,fighter.display_name,body.seat);
   challenger.fighter=fighter.id;
   if(!challenger.royal)failure('Earn the Royal writ before challenging.',403);
   const defender=await repo.snapshot(throne.holder_uid,throne.holder_name,body.seat),seed=randomSeed(),state=Core.create(seed,challenger.loadout,defender.loadout);
   const attempt=await repo.begin({uid,key:body.key,seat:body.seat,throne,seed,version:Core.VERSION,challenger,defender,state});return publicAttempt(attempt);
  }
  if(!uuid(body.id))failure('Invalid encounter ID.',400);
  const attempt=await repo.attempt(uid,body.id);if(!attempt)failure('Not your crown attempt.',403);
  if(body.action==='status')return publicAttempt(attempt);
  if(body.action==='abandon'){await repo.release(uid,body.id,true);return {abandoned:true};}
  if(body.action==='heartbeat'){if(attempt.status!=='active'||Date.parse(attempt.expires_at)<Date.now())failure('Attempt expired; start again.');await repo.release(uid,body.id,false);return {alive:true};}
  if(body.action==='input'){
   if(attempt.sim_version!==Core.VERSION)failure('This encounter uses a different simulation version.');
   if(!Number.isInteger(body.seq)||body.seq<1)failure('Invalid input sequence.',400);
   if(!Array.isArray(body.inputs)||!body.inputs.length||body.inputs.length>60)failure('Send 1–60 input ticks.',400);
   let inputs;try{inputs=body.inputs.map(Core.input);}catch(e){failure(e.message,400);}const text=JSON.stringify(inputs),hash=await repo.hash(text),prior=await repo.chunk(body.id,body.seq);
   if(prior){if(prior.input_hash!==hash)failure('Conflicting input retry.');return {seq:body.seq,state:prior.state};}
   if(attempt.status!=='active'||Date.parse(attempt.expires_at)<Date.now())failure('Attempt expired; start a new challenge.');
   if(body.seq!==attempt.seq+1)failure('Out-of-order crown input.');
   let state;try{state=Core.batch(attempt.state,inputs);}catch(e){failure(e.message,400);}return repo.accept(uid,body.id,body.seq,hash,inputs,state);
  }
  if(body.action==='finish'){if(!attempt.result&&attempt.state.done&&attempt.state.winner===0){const f=await repo.fighter(uid);if(!f||f.id!==attempt.challenger.fighter||f.gender!==(attempt.seat==='king'?'male':'female'))failure('Challenger is no longer eligible.',403);}return repo.finish(uid,body.id);}
  failure('Unknown action.',400);
 };
}

export function createRepository(admin,Core) {
 const one=async(table,columns,filters)=>{let q=admin.from(table).select(columns);for(const [key,value]of Object.entries(filters))q=q.eq(key,value);const r=await q.limit(1).maybeSingle();if(r.error)throw r.error;return r.data;};
 const rpc=async(name,args)=>{const r=await admin.rpc(name,args);if(r.error)throw Object.assign(Error(r.error.message),{status:409});return r.data;};
 const safeLook=(v,seat)=>{const look={g:seat==='queen'?'female':'male'};for(const k of ['b','t','s','hc','ec'])if(typeof v[k]==='string'&&/^#[0-9a-f]{6}$/i.test(v[k]))look[k]=v[k];for(const k of ['h','f','c','n','o','ha','be','e','w'])if(typeof v[k]==='string'&&/^[\w|-]{1,50}$/.test(v[k]))look[k]=v[k];if(seat==='queen')look.be='none';look.sh={};for(const k of ['height','mass','muscle','shoulders','waist','hips','arms','legs','face','jaw','eyes','nose','mouth','bust','breast','butt'])if(Number.isFinite(v.sh?.[k]))look.sh[k]=Math.max(0,Math.min(100,v.sh[k]));return look;};
 const repo={
  byKey:(uid,key)=>one('steeltape_crown_attempts','*',{challenger_uid:uid,request_key:key}),attempt:(uid,id)=>one('steeltape_crown_attempts','*',{challenger_uid:uid,id}),chunk:(id,seq)=>one('steeltape_crown_inputs','input_hash,state',{attempt_id:id,seq}),throne:seat=>one('steeltape_throne','*',{seat}),
  fighter:async uid=>{const link=await one('fighter_accounts','fighter_id',{user_id:uid});if(!link)return null;const roster=await admin.functions.invoke('steeltape-roster');if(roster.error||roster.data?.scope!=='hacsa'||!roster.data.fighters?.some(f=>f.id===link.fighter_id))return null;return one('fighter_directory','id,gender,display_name',{id:link.fighter_id});},
  snapshot:async(uid,name,seat)=>{
   const save=await one('steeltape_cloud_saves','snapshot,updated_at',{user_id:uid}),last=await one('steeltape_character_looks','look,updated_at',{uid}),s=save?.snapshot||{},career=s['st-career']||{},worn=career.shop?.look||{},loadout=s['st-loadout']||{},club=career.club||{};
   const look={b:worn.body||club.tabard,t:worn.trim||club.trim,h:worn.hat,f:worn.foot,c:worn.cape,n:worn.hand,o:worn.outfit,s:worn.skin,hc:worn.hairColor,ha:worn.hair,be:worn.beard,ec:worn.eyes,sh:worn.shape||{},e:loadout.helm,w:loadout.weapon};
   const latest=last&&(!save||Date.parse(last.updated_at)>=Date.parse(save.updated_at))?last.look:look;
   return {uid,name:String(name||'The ruler').slice(0,80),look:safeLook(latest||look,seat),loadout:Core.normalizeLoadout({...loadout,heightValue:latest?.sh?.height??loadout.heightValue,massValue:latest?.sh?.mass??loadout.massValue,...(latest?.w?{weapon:latest.w}:{}),...(latest?.e?{helm:latest.e}:{})}),royal:!!career.writs?.royal};
  },
  begin:a=>rpc('steeltape_crown_begin',{p_uid:a.uid,p_key:a.key,p_seat:a.seat,p_holder:a.throne.holder_uid,p_since:a.throne.since,p_seed:a.seed,p_version:a.version,p_challenger:a.challenger,p_defender:a.defender,p_state:a.state}),
  accept:(uid,id,seq,hash,inputs,state)=>rpc('steeltape_crown_accept',{p_uid:uid,p_id:id,p_seq:seq,p_hash:hash,p_inputs:inputs,p_state:state}),finish:(uid,id)=>rpc('steeltape_crown_finish',{p_uid:uid,p_id:id}),release:(uid,id,abandon)=>rpc('steeltape_crown_release',{p_uid:uid,p_id:id,p_abandon:abandon}),
  hash:async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join(''),
  seats:async()=>{const r=await admin.from('steeltape_throne').select('seat,holder_name,holder_uid,holder_fighter,since');if(r.error)throw r.error;const seats={};for(const row of r.data||[]){const snap=await repo.snapshot(row.holder_uid,row.holder_name,row.seat);seats[row.seat]={name:row.holder_name,uid:row.holder_uid,fighter:row.holder_fighter,since:row.since,look:snap.look,loadout:snap.loadout};}return seats;}
 };return repo;
}
