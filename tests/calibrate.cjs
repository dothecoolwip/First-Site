const Core=require('../supabase/functions/steeltape-throne/crown-core.js'),fs=require('fs');
const observations=new WeakMap();
function policy(s,kind='skilled') {
 const p=s.fighters[0],a=s.fighters[1],dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,dz)||1,v={mx:0,mz:0,face:Math.atan2(dx,dz),attack:'',guard:''};
 let seen=observations.get(s);if(!seen){seen={start:-1,zone:'',target:'',at:0};observations.set(s,seen);}const start=a.action?s.tick-a.action.age:-1;
 if(a.action&&start!==seen.start){seen={start,zone:a.action.zone,target:a.action.zone,at:s.tick};observations.set(s,seen);}else if(a.action&&a.action.zone!==seen.target){seen.target=a.action.zone;seen.at=s.tick;}if(s.tick-seen.at>=14)seen.zone=seen.target;
 const danger=a.action&&a.action.age>=14&&a.action.age<a.action.wind+9;
 if(kind==='passive')return v;
 if(danger){v.guard=seen.zone;if(d<1.5){v.mx=-dx/d;v.mz=-dz/d;}}
 else if(d>Core.weapons[p.weapon].reach*.8){v.mx=dx/d;v.mz=dz/d;}
 if(!danger&&!p.down&&!a.down&&!p.disarmed&&!a.disarmed&&!p.action&&!p.cooldown&&d<Core.weapons[p.weapon].reach){v.attack=Core.zones[(Math.floor(s.tick/91)+s.seed)%3];}
 return v;
}
function run(seed,kind='skilled',weapon='sword') {const s=Core.create(seed,{weapon},{weapon:'sword'});while(!s.done)Core.step(s,policy(s,kind));return {winner:s.winner,ticks:s.tick,wins:s.wins,events:s.events};}
if(require.main===module){const count=Number(process.argv[2]||1000),begin=performance.now();let wins=0,draws=0,ticks=0;for(let seed=1;seed<=count;seed++){const r=run(seed);wins+=r.winner===0;draws+=r.winner==null;ticks+=r.ticks;}const p=wins/count,z=1.96,den=1+z*z/count,centre=(p+z*z/(2*count))/den,half=z*Math.sqrt(p*(1-p)/count+z*z/(4*count*count))/den;const result={simulation:Core.VERSION,policy:'skilled: reacts to visible windup after 14 ticks, changes attack zone, retreats to evade',count,wins,draws,winRate:p,confidence95:[centre-half,centre+half],meanFightSeconds:ticks/count/60,elapsedMs:performance.now()-begin};fs.writeFileSync(__dirname+'/calibration.json',JSON.stringify(result,null,2));console.log(result);}
module.exports={policy,run};
