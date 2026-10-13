// Seeded policy benchmark. Human/device acceptance remains a separate measurement.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
const output = path.resolve(process.argv[2] || 'difficulty-outcomes.json');
const rows = [];
(async () => {
  const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage();
    await page.route('**/*',r=>r.request().url().startsWith('http') ? r.abort() : r.continue());
    await page.addInitScript(()=>{
      window.__steeltapeTest=true; localStorage.clear(); localStorage.setItem('st-career',JSON.stringify({onboard:'done'}));
      let st; Object.defineProperty(window,'__ST',{configurable:true,get:()=>st,set:v=>{st=v;if(v?.G)v.G.renderEvery=1e9;}});
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'index.html')).href);
    await page.waitForFunction(()=>window.__ST?.G.screen==='title',null,{timeout:90000});
    for (const level of [1,25,50,75,80,90,100]) for (const mode of [1,5,12]) {
      const row = await page.evaluate(async ({level,mode})=>{
        const st=window.__ST, seed=1700+level*100+mode; let state=seed;
        const random=Math.random; Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
        st.CAREER.level=level; st.CAREER.xp=0; st.CAREER.skills={'steel.heavy':3};
        if(level>=25) Object.assign(st.CAREER.skills,{'lungs.breath':3,'iron.rooted':3,'grapple.ankle':3,'steel.recover':3});
        for(const k in st.CAREER.upgrades)st.CAREER.upgrades[k]=Math.min(10,Math.floor(level/10));
        st.G.autoflow=true;st.G.autopilot=false;st.G.paused=false;st.quickFight(mode,'wardens');
        const p=st.G.player; p.vin={mx:0,mz:0,yaw:0,pitch:0,cancel:0,sp:0,gd:0,br:0,sw:0,sh:0,arc:'R2L',e:{trip:0,shove:0,grab:0,tackle:0}};
        st.G.paused=true;
        let time=0;const seenErrors=st.G.stats.errors.length;
        for(let step=0;step<54000 && st.G.phase!=='over';step++){
          if(step%60===0){const savedState=state;await new Promise(resolve=>setTimeout(resolve,0));state=savedState;}
          // This policy declines emergency bench work: use the game's existing repair-timeout outcome.
          if(st.G.repairStop){st.G.repairStop=false;st.G.phase='fight';st.endRound('repair');}
          const target=st.G.fighters.filter(f=>f.team!==p.team&&!f.out&&['standing','posting'].includes(f.state)).sort((a,b)=>Math.hypot(a.pos.x-p.pos.x,a.pos.z-p.pos.z)-Math.hypot(b.pos.x-p.pos.x,b.pos.z-p.pos.z))[0];
          if(target){
            const dx=target.pos.x-p.pos.x,dz=target.pos.z-p.pos.z,d=Math.hypot(dx,dz)||1;
            p.vin.mx=d>1.1?dx/d:0;p.vin.mz=d>1.1?dz/d:0;p.vin.yaw=Math.atan2(dx,dz);p.vin.sp=d>3;
            p.vin.gd=target.action?.phase==='windup'?1:0;
            if(step%45===0 && d<2){p.vin.sw++;p.vin.sh=true;}
            if(step%45===20)p.vin.sh=false;
            if(step%90===0 && d<1.3)p.vin.e.shove++;
            if(step%90===30 && d<1.3)p.vin.e.trip++;
          }else{p.vin.mx=p.vin.mz=0;}
          st.G.paused=false;st.simStep(1/60);st.G.paused=true;time+=1/60;
          if(st.G.stats.errors.length>seenErrors)break;
        }
        const match=st.G.match;st.G.paused=true;Math.random=random;
        return {seed,level,mode,completed:st.G.phase==='over',phase:st.G.phase,screen:st.G.screen,repairStop:!!st.G.repairStop,pendingTimers:st.G.timers.length,simulatedSeconds:Math.round(time),wins:match.wins.slice(),metrics:match.metrics,defence:match.defence||{},activeFightTime:match.activeFightTime||0,errors:st.G.stats.errors.slice(seenErrors)};
      },{level,mode});
      rows.push(row);fs.writeFileSync(output,JSON.stringify({method:'one deterministic equipped policy seed per tier/mode; declines emergency repairs using the existing timeout outcome; not human target acceptance',rows},null,2));
      console.log(`${level} ${mode}v${mode}: ${row.phase}, ${row.wins.join('-')}, ${row.simulatedSeconds}s`);
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
