// Verifies measured time rather than browser-tab age, offline queue and account attribution.
const vm=require('node:vm'), fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../src/js/13l_feedback.js'),'utf8');
let now=0,hidden=false,online=true,uid='user-one',sent=[],ok=true;
const ls=new Map(),ss=new Map(),listeners={},timers=[];
const storage=m=>({get length(){return m.size},key:i=>[...m.keys()][i]||null,
 getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
const user=()=>uid?{id:uid}:null;
const ctx={BOS_URL:'https://example.supabase.co',BOS:{get user(){return user()},sb:{auth:{getSession:async()=>({data:{session:{access_token:'signed-jwt'}}})}}},
 localStorage:storage(ls),sessionStorage:storage(ss),performance:{now:()=>now},crypto:{randomUUID:()=> '11111111-2222-4333-8444-555555555555'},
 navigator:{get onLine(){return online}},window:{innerWidth:1000,innerHeight:600,addEventListener:(k,cb)=>{listeners[k]=cb}},
 document:{get hidden(){return hidden},addEventListener:(k,cb)=>{listeners[k]=cb}},location:{protocol:'https:',hash:''},
 G:{autoflow:false},CAREER:{level:5,stats:{matches:8}},myName:()=> 'Fighter',
 fetch:async(url,opts)=>{const body=JSON.parse(opts.body);sent.push({body,auth:opts.headers.Authorization});return{ok,status:ok?200:503}},
 setInterval:(cb,ms)=>{timers.push({cb,ms});return timers.length},console:{warn(){}},IS_TOUCH:false};
vm.createContext(ctx);vm.runInContext(source,ctx);
const call=(func,...params)=>vm.runInContext(func,ctx)(...params);
const getEntries=()=>[...ls.entries()].filter(([k])=>k.startsWith('steeltape-active-time-v1:user-one:'));
async function test(){
 now=5000;call('eventPlayTick');
 now=10000;call('eventPlayTick');
 assert.equal(Math.floor(getEntries()[0]&&JSON.parse(getEntries()[0][1]).seconds),10);
 await call('eventPlaySync');
 assert.equal(sent.length,1);assert.equal(sent[0].body.kind,'playtime');
 assert.equal(sent[0].body.data.seconds,10);assert.equal(sent[0].auth,'Bearer signed-jwt');
 await call('eventPlaySync');assert.equal(sent.length,1,'acked counters are not resent');
 hidden=true;now=70000;call('eventPlayTick');
 assert.equal(Math.floor(JSON.parse(getEntries()[0][1]).seconds),10,'background not counted');
 hidden=false;listeners.visibilitychange();now=75000;call('eventPlayTick');
 assert.equal(Math.floor(JSON.parse(getEntries()[0][1]).seconds),15);
 online=false;now=80000;call('eventPlayTick');await call('eventPlaySync');
 assert.equal(sent.length,1,'nothing transmitted offline');
 online=true;await call('eventPlaySync');assert.equal(sent.length,2);
 assert.equal(sent[1].body.data.seconds,20,'offline play restored in cumulative report');
 ok=false;now=85000;call('eventPlayTick');await call('eventPlaySync');
 assert.equal(getEntries().length,1);const sBefore=JSON.parse(getEntries()[0][1]);
 assert(sBefore.acked<sBefore.seconds,'failed send remains queued');
 ok=true;await call('eventPlaySync');
 assert.equal(JSON.parse(getEntries()[0][1]).acked,25,'retry acknowledged');
 uid=null;now=90000;call('eventPlayTick');
 assert.equal(Math.floor(JSON.parse(getEntries()[0][1]).seconds),25,'signed-out play not attributed');
 uid='user-two';now=95000;call('eventPlayTick');await call('eventPlaySync');
 assert.equal(sent.at(-1).body.data.seconds,5);
 assert(sent.at(-1).body.data.session==='11111111-2222-4333-8444-555555555555');
 assert([...ls.keys()].some(k=>k.startsWith('steeltape-active-time-v1:user-two:')));
 console.log('PASS: active visible time, idle/background exclusion, authenticated owner, offline replay, idempotent ack, retry, separate accounts');
}
test().catch(e=>{console.error(e.stack);process.exitCode=1});