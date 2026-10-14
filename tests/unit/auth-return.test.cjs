const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/js/13i_buhurtos.js'),'utf8');
const onboard=fs.readFileSync(path.join(__dirname,'../../src/js/13k_onboard.js'),'utf8');
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function env(url='https://game.example/play?keep=1',opts={}){
 const location=new URL(url),sessionStorage=opts.storage||storage(),calls={clients:0,sets:0,codes:0,users:0,inside:0,resumes:0,teams:0,fighters:0,titles:0},localStorage=opts.localStorage||storage();
 let callback,inCallback=false,session=opts.session||null,config;
 const emit=(evt,s)=>{inCallback=true;callback?.(evt,s);inCallback=false;};
 const check=()=>{if(inCallback)calls.inside++;};
 const user={id:'u1',email:'fighter@example.com'};
 const auth={onAuthStateChange:f=>{callback=f;return{};},getSession:async()=>{check();if(opts.hang)return new Promise(()=>{});return{data:{session:session||JSON.parse(localStorage.getItem('buhurt-game-buhurtos')||'null')},error:null};},getUser:async()=>{check();calls.users++;return {data:{user},error:null};},
 setSession:async tokens=>{check();calls.sets++;session={...tokens,user};localStorage.setItem('buhurt-game-buhurtos',JSON.stringify(session));emit('SIGNED_IN',session);return{data:{session},error:null};},
 exchangeCodeForSession:async()=>{check();calls.codes++;session={user};emit('SIGNED_IN',session);return{data:{session},error:opts.codeError?{message:'expired code'}:null};},
 signInWithOAuth:async request=>{calls.oauth=request;return{error:opts.oauthError?{message:'provider disabled'}:null};}};
 const q={select:()=>q,eq:()=>q,limit:()=>q,maybeSingle:async()=>{check();return{data:null,error:null};}};
 const career={onboard:opts.stage||'create',teamPicked:!!opts.teamPicked,name:'Saved fighter',purse:1250,stats:{matches:4},club:{bos:'saved-team'},look:{hair:'long'},bag:{iron:8}};
 const elements={startup:{hidden:false},startupStatus:{},bosStatus:{}};
 const context={URL,URLSearchParams,AbortController,Promise,Date,console,location,sessionStorage,localStorage,history:{state:{keep:true},replaceState:(_s,_t,u)=>{location.href=u;}},
 setTimeout:(f,ms)=>setTimeout(f,ms>=12000?30:ms),clearTimeout,fetch:async()=>({}),navigator:{onLine:true},window:{supabase:{createClient:(_url,_key,c)=>{calls.clients++;config=c;return{auth,from:()=>q};}}},
 CAREER:career,G:{screen:'title'},CLOUD:{ready:true,offline:false,applying:false},CREATOR_IDENTITY:{proofs:{}},store:{get:()=>career},
 $:s=>elements[s.slice(1)]||null,creatorReset(){},creatorIssue(){},creatorRefreshCharacters(){},testAdminRefresh(){},saveCareer(){},lobbySet(){},myName:()=>career.name,myProfile:()=>({}),NET:{},ONL:{},
 cloudOnAuth:async()=>{},cloudIsOffline:()=>false,escTxt:s=>String(s).replaceAll('<','&lt;'),msg:(_tag,title,body,actions)=>{context.dialog={title,body,actions};},toTitle:()=>{calls.titles++;},skillsState(){},rosterLoad(){},
 };
 vm.createContext(context);vm.runInContext(source+'\n'+onboard+'\ncreatorTeam=()=>{COUNTS.teams++;};creatorFighter=()=>{COUNTS.fighters++;};',Object.assign(context,{COUNTS:calls}));
 return{ctx:context,calls,auth,career,sessionStorage,localStorage,location,emit,config:()=>config,run:(s)=>vm.runInContext(s,context)};
}
const settle=()=>new Promise(r=>setTimeout(r,5));
test('implicit callback is consumed once; SDK auto-detection disabled; unrelated URL survives',async()=>{
 const e=env('https://game.example/play?keep=1#access_token=fake&refresh_token=fake2&expires_in=3600');e.run('onbSaveAuthReturn()');
 await Promise.all([e.run('bosBoot()'),e.run('bosBoot()')]);await settle();
 assert.equal(e.calls.sets,1);assert.equal(e.calls.users,1);assert.equal(e.calls.clients,1);assert.equal(e.calls.inside,0);assert.equal(e.calls.teams,1);assert.equal(e.run('ONB.startup'),false);
 assert.equal(e.location.href,'https://game.example/play?keep=1');assert.equal(e.config().auth.detectSessionInUrl,false);assert.equal(e.config().auth.flowType,'implicit');
 assert.equal(e.career.purse,1250);assert.equal(e.career.club.bos,'saved-team');assert.deepEqual(e.career.bag,{iron:8});
});
test('concurrent client requests construct one client and callbacks do no SDK work',async()=>{
 const e=env();await Promise.all([e.run('bosClient()'),e.run('bosClient()')]);e.emit('SIGNED_IN',{user:{id:'u1',email:'a@b'}});e.emit('SIGNED_IN',{user:{id:'u1',email:'a@b'}});await settle();
 assert.equal(e.calls.clients,1);assert.equal(e.calls.users,1);assert.equal(e.calls.inside,0);
});
test('PKCE code is exchanged once and cannot be replayed on retry',async()=>{const e=env('https://game.example/?keep=1&code=single-use#map');await Promise.all([e.run('bosBoot()'),e.run('bosBoot()')]);assert.equal(e.calls.codes,1);assert.equal(e.location.search,'?keep=1');assert.equal(e.location.hash,'#map');});
test('OAuth cancellation removes only callback data and gives retry/back',async()=>{const e=env('https://game.example/?keep=1#error=access_denied&error_description=Cancelled');await e.run('bosBoot()');assert.equal(e.calls.clients,0);assert.match(e.ctx.dialog.body,/Cancelled/);assert.deepEqual(Array.from(e.ctx.dialog.actions,a=>a[0]),['Retry','Back to sign-in']);assert.equal(e.run('ONB.startup'),false);assert.equal(e.location.search,'?keep=1');assert.equal(e.location.hash,'');});
test('slow SDK session lookup gives recovery rather than eternal splash',async()=>{const e=env(undefined,{hang:true});await e.run('bosBoot(true)');assert.match(e.ctx.dialog.body,/timed out/);assert.equal(e.run('BOS.booting'),false);assert.equal(e.run('BOS.recovering'),true);});
test('provider returned error is shown for both Google and Discord and intent saved',async()=>{for(const provider of ['google','discord']){const e=env(undefined,{oauthError:true});e.ctx.say=t=>e.ctx.message=t;await e.run(`bosOAuth('${provider}',say)`);assert.match(e.ctx.message,/provider disabled/);assert.equal(e.calls.oauth.provider,provider);assert.equal(e.calls.oauth.options.redirectTo,'https://game.example/play');assert.equal(e.run('onbReadAuthReturn().step'),'team');}});
test('refresh uses persisted session, does not process OAuth again or change saved appearance',async()=>{const e=env(undefined,{session:{user:{id:'u1'}},teamPicked:true});e.sessionStorage.setItem('buhurt-game-buhurtos','saved');e.run('onbSaveAuthReturn()');await e.run('bosBoot()');assert.equal(e.calls.sets,0);assert.equal(e.calls.fighters,1);assert.equal(e.career.look.hair,'long');assert.equal(e.run('onbReadAuthReturn()'),null);});
test('old tab session migrates to persistent storage without replacing a current account',async()=>{
 const local=storage(),tab=storage();tab.setItem('buhurt-game-buhurtos',JSON.stringify({user:{id:'u1'}}));
 const e=env(undefined,{localStorage:local,storage:tab,teamPicked:true});await e.run('bosBoot()');
 assert.equal(e.config().auth.storage,local);assert.equal(JSON.parse(local.getItem('buhurt-game-buhurtos')).user.id,'u1');
 const newer=JSON.stringify({user:{id:'u2'}});local.setItem('buhurt-game-buhurtos',newer);e.run('bosMigrateSession()');assert.equal(local.getItem('buhurt-game-buhurtos'),newer);
});
test('persistent session is restored after a new tab and browser process',async()=>{
 const local=storage();local.setItem('buhurt-game-buhurtos',JSON.stringify({user:{id:'u1'}}));
 const e=env(undefined,{localStorage:local,stage:'done',teamPicked:true});await e.run('bosBoot()');
 assert.equal(e.run('BOS.user.id'),'u1');assert.equal(e.calls.titles,1);assert.equal(e.config().auth.storage,local);
});
test('completed account return enters game and does not reset onboarding or team',async()=>{const e=env(undefined,{session:{user:{id:'u1'}},stage:'done',teamPicked:true});e.run('onbSaveAuthReturn()');await e.run('bosBoot()');assert.equal(e.ctx.G.hub,true);assert.equal(e.calls.titles,1);assert.equal(e.calls.teams,0);assert.equal(e.career.onboard,'done');assert.equal(e.career.teamPicked,true);});
test('failed code exchange is recoverable and does not load profile',async()=>{const e=env('https://game.example/?code=expired',{codeError:true});await e.run('bosBoot()');await settle();assert.match(e.ctx.dialog.body,/expired code/);assert.equal(e.calls.users,0);assert.equal(e.location.search,'');});

test('a timed-out session can retry once the connection recovers without duplicate transition',async()=>{
 const options={hang:true,session:{user:{id:'u1'}}};const e=env(undefined,options);e.run('onbSaveAuthReturn()');
 await e.run('bosBoot(true)');assert.equal(e.run('BOS.recovering'),true);
 options.hang=false;e.ctx.dialog.actions[0][1]();await e.run('BOS.bootPromise');await settle();
 assert.equal(e.run('BOS.recovering'),false);assert.equal(e.calls.teams,1);assert.equal(e.run('ONB.startup'),false);assert.equal(e.calls.clients,1);
});

