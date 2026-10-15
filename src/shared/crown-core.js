/* Crown-only deterministic combat. Identical fixed ticks on client and verifier. */
(function(root){
  'use strict';
  const VERSION='crooked-crown-1',HZ=60,ROUND=60*HZ,MAX=360*HZ;
  const tuning={recovery:1.25,guardRecovery:35,feints:.3,counterChance:.45};
  const zones=['head','body','low'],points={head:3,body:2,low:1},clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const weapons={sword:{reach:1.5,wind:29,recovery:25},falchion:{reach:1.4,wind:27,recovery:24},axe:{reach:1.35,wind:31,recovery:28},mace:{reach:1.3,wind:27,recovery:26},longsword:{reach:1.9,wind:34,recovery:29},longaxe:{reach:2,wind:39,recovery:34},polearm:{reach:2.2,wind:42,recovery:36},spear:{reach:2.1,wind:33,recovery:31}};
  function random(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  function normalizeLoadout(value={}) {return {weapon:Object.hasOwn(weapons,value.weapon)?value.weapon:'sword',shield:typeof value.shield==='string'?value.shield:null,helm:typeof value.helm==='string'?value.helm:'pigface',height:clamp(Number.isFinite(Number(value.heightValue??value.height))?Number(value.heightValue??value.height):50,0,100),mass:clamp(Number.isFinite(Number(value.massValue??value.mass))?Number(value.massValue??value.mass):50,0,100)};}
  function actor(loadout,z){const lo=normalizeLoadout(loadout);return {x:0,z,face:z>0?Math.PI:0,gas:1,weapon:lo.weapon,loadout:lo,action:null,cooldown:0,disarmed:0,down:0,guard:'',points:0,display:0,fouls:0,vel:{x:0,z:0}};}
  function create(seed,challenger,defender){if(!Number.isInteger(seed))throw Error('Invalid encounter seed.');return {version:VERSION,seed,rng:seed>>>0,tick:0,round:1,clock:ROUND,wins:[0,0],rounds:[],fighters:[actor(challenger,2),actor(defender,-2)],events:[],serial:0,lastZone:'body',cheatAt:8*HZ,biasAt:13*HZ,pause:0,done:false,winner:null};}
  function event(s,type,data={}){const e={id:++s.serial,tick:s.tick,round:s.round,type,...data};s.events.push(e);return e;}
  function input(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid crown input.');const out={mx:Number(value.mx||0),mz:Number(value.mz||0),face:Number(value.face||0),attack:value.attack||'',guard:value.guard||'',disarm:!!value.disarm,yield:!!value.yield};
    if(![out.mx,out.mz,out.face].every(Number.isFinite)||Math.abs(out.mx)>1||Math.abs(out.mz)>1||Math.abs(out.face)>Math.PI*4||(!zones.includes(out.attack)&&out.attack!=='')||(!zones.includes(out.guard)&&out.guard!==''))throw Error('Invalid crown input range.');return out;}
  function score(s,who,amount,reason){const a=s.fighters[who];a.points+=amount;a.display+=amount;event(s,'score',{who,amount,reason,actual:a.points,display:a.display});}
  function foul(s,who,reason){event(s,'foul',{who,reason,overlooked:who===1});if(who===1){event(s,'marshal',{text:'A royal exemption. Clearly written in invisible ink.'});return;}const a=s.fighters[0];a.fouls++;score(s,1,2,'challenger foul');event(s,'card',{who,card:a.fouls===1?'warning':a.fouls===2?'yellow':'red'});if(a.fouls>=3){s.wins[1]=2;s.winner=1;s.done=true;event(s,'disqualification',{who});}}
  function attack(s,who,zone,illegal=false){const a=s.fighters[who],w=weapons[a.weapon];if(a.action||a.cooldown||a.disarmed||a.down||a.gas<.18)return;a.gas-=.17;const wind=who===1?clamp(Math.round(w.wind*.82),24,27):w.wind;a.action={zone,age:0,wind,recovery:who===1?Math.round(25*tuning.recovery):w.recovery,illegal,feint:who===1&&random(s)<tuning.feints,guardAt:wind+tuning.guardRecovery+(who===1?Math.floor(random(s)*9)-4:0)};event(s,'windup',{who,zone,illegal});}
  function move(a,mx,mz){const d=Math.max(1,Math.hypot(mx,mz)),speed=(a.down?0:a.disarmed?2.5:2.1)*(a.gas<.2?.6:1);a.vel.x=mx/d*speed;a.vel.z=mz/d*speed;a.x=clamp(a.x+a.vel.x/HZ,-9.5,9.5);a.z=clamp(a.z+a.vel.z/HZ,-14.5,14.5);}
  function brain(s){const a=s.fighters[1],p=s.fighters[0],dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz)||1;let movement=d>weapons[a.weapon].reach*.8?1:d<1.05?-.6:0;
    if(p.action){const start=s.tick-p.action.age;if(a.observedAttack!==start){a.observedAttack=start;a.counterWait=random(s)<tuning.counterChance;}}else{a.observedAttack=null;a.counterWait=false;}
    if(a.action?.feint&&a.action.age===12){const zone=a.action.zone;a.action.zone=zones[(zones.indexOf(zone)+1+Math.floor(random(s)*2))%3];event(s,'feint',{who:1,zone:a.action.zone,text:'Watch the royal wrist — a late feint!'});}
    if(a.action)movement*=.3;move(a,dx/d*movement,dz/d*movement);if(!a.action||a.action.age<8)a.face=Math.atan2(dx,dz);a.guard=(!a.action||a.action.age>a.action.guardAt)&&p.action&&p.action.age>10?p.action.zone:'';
    if(d<weapons[a.weapon].reach+.2&&!a.action&&!a.cooldown&&(!a.counterWait||!p.action||p.action.age>=p.action.wind+8)){const zone=random(s)<.55?s.lastZone:zones[Math.floor(random(s)*3)];attack(s,1,zone);}
    if(s.tick>=s.cheatAt){s.cheatAt=s.tick+(12+Math.floor(random(s)*9))*HZ;const trick=Math.floor(random(s)*3);a.gas=1;event(s,'cheat-cue',{trick,text:['The ruler reaches for a suspicious pouch.','The royal physician waves a very large towel.','The ruler announces a perfectly legal second sword.'][trick]});a.cheat={trick,at:s.tick+36};}
    if(a.cheat&&s.tick>=a.cheat.at){const trick=a.cheat.trick;delete a.cheat;foul(s,1,['pocket sand','illegal trip','strike against a disarmed opponent'][trick]);if(d<2.2){if(trick===0)p.disarmed=90;else if(trick===1){p.down=75;score(s,1,2,'royal trip');}else attack(s,1,'body',true);}event(s,'cheat',{trick,who:1});}
  }
  function contact(s,who,a){const self=s.fighters[who],target=s.fighters[1-who],dx=target.x-self.x,dz=target.z-self.z,d=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(angle-self.face),Math.cos(angle-self.face));
    if(d>weapons[self.weapon].reach||Math.abs(diff)>1.1){event(s,'miss',{who});return;}
    if(target.disarmed||target.down){foul(s,who,target.disarmed?'strike on a disarmed duelist':'strike on a grounded fighter');if(who===0)return;}
    if(target.guard===a.zone&&!target.down&&!target.disarmed&&target.gas>.1&&!a.illegal){target.gas=Math.max(0,target.gas-.06);event(s,'block',{who:1-who,zone:a.zone});return;}
    score(s,who,points[a.zone],a.zone+' strike');target.gas=Math.max(0,target.gas-.07);target.z=clamp(target.z+Math.cos(angle)*.13,-14.5,14.5);target.x=clamp(target.x+Math.sin(angle)*.13,-9.5,9.5);
  }
  function roundEnd(s){const [a,b]=s.fighters;let winner=a.points>b.points?0:b.points>a.points?1:-1;
    if(winner<0&&s.clock>-30*HZ)return;
    if(winner>=0)s.wins[winner]++;const actual=[a.points,b.points],display=[a.display,b.display],provisional=display[0]>display[1]?0:1;
    s.rounds.push({round:s.round,actual,display,winner,provisional});event(s,'review',{actual,display,winner,provisional,text:provisional!==winner?'The royal abacus has been replaced. Corrected score follows.':'The review confirms the scoring record.'});
    if(s.wins.some(n=>n>=2)||s.round>=5){s.done=true;s.winner=s.wins[0]>s.wins[1]?0:s.wins[1]>s.wins[0]?1:null;event(s,'final',{winner:s.winner,wins:s.wins.slice()});return;}
    s.round++;s.clock=ROUND;s.pause=3*HZ;for(let i=0;i<2;i++){const old=s.fighters[i],next=actor(old.loadout,i===0?2:-2);next.fouls=old.fouls;s.fighters[i]=next;}
  }
  function step(s,value){if(s.version!==VERSION)throw Error('Unsupported crown simulation.');if(s.done)return s;const v=input(value);s.tick++;if(s.tick>MAX){s.done=true;s.winner=null;event(s,'expired-fight');return s;}if(s.pause){s.pause--;return s;}s.clock--;
    const p=s.fighters[0];if(v.guard&&p.action&&p.action.age<p.action.wind)p.action=null;p.guard=p.action&&p.action.age<p.action.wind+8?'':v.guard;p.face=v.face;if(v.yield){s.done=true;s.winner=1;event(s,'yield',{who:0});return s;}move(p,v.mx,v.mz);
    if(v.attack&&!v.guard){s.lastZone=v.attack;attack(s,0,v.attack);}if(v.disarm&&!p.cooldown&&!p.down){p.cooldown=70;p.gas=Math.max(0,p.gas-.2);const a=s.fighters[1];if(Math.hypot(a.x-p.x,a.z-p.z)<1.15&&random(s)<.3){a.disarmed=120;score(s,0,2,'disarm');event(s,'disarm',{who:1});}}
    brain(s);const [left,right]=s.fighters,dx=right.x-left.x,dz=right.z-left.z,d=Math.hypot(dx,dz)||1;if(d<.65){const k=(.65-d)/2;left.x-=dx/d*k;left.z-=dz/d*k;right.x+=dx/d*k;right.z+=dz/d*k;}
    for(let i=0;i<2;i++){const a=s.fighters[i];a.gas=Math.min(1,a.gas+(i===1?.3:.25)/HZ);a.cooldown=Math.max(0,a.cooldown-1);a.disarmed=Math.max(0,a.disarmed-1);a.down=Math.max(0,a.down-1);if(a.down||a.disarmed)a.action=null;if(a.action){const act=a.action;act.age++;if(act.age===act.wind)contact(s,i,act);if(act.age>act.wind+8+act.recovery){a.action=null;a.cooldown=5;}}}
    if(s.tick>=s.biasAt){s.biasAt=s.tick+(14+Math.floor(random(s)*10))*HZ;s.fighters[1].display+=2;event(s,'biased-call',{who:1,amount:2,text:'Two points for royal posture. An ancient rule, apparently.'});}
    if(s.clock<=0&&(!s.fighters.some(a=>a.action)||s.clock< -30*HZ))roundEnd(s);return s;
  }
  function batch(state,values){if(!Array.isArray(values)||!values.length||values.length>60)throw Error('Expected 1–60 ordered input ticks.');const s=JSON.parse(JSON.stringify(state));s.events=[];for(const v of values){if(s.done)throw Error('Input after fight completion.');step(s,v);}return s;}
  const api={VERSION,HZ,ROUND,MAX,create,step,batch,input,normalizeLoadout,weapons,zones,points,foul,tuning};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrownCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
