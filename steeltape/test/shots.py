# usage: python3 shots.py SIZES SCREENS TAG   e.g. shots.py phone,desk title,modes v1
import time, sys, pathlib
sizes = sys.argv[1].split(','); screens = sys.argv[2].split(','); tag = sys.argv[3] if len(sys.argv) > 3 else 'v'
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
UI = OUT / 'ui'; UI.mkdir(exist_ok=True)
SZ = {'phone': (844, 390, True), 'desk': (1280, 720, False), 'port': (390, 844, True), 'pad': (1280, 720, False)}
def sim(pg, sec, cap=30):
    t = pg.evaluate("__ST.G.simTime"); t0 = time.time()
    while pg.evaluate("__ST.G.simTime") < t + sec and time.time() - t0 < cap: time.sleep(0.05)
FIGHT = "__ST.endTraining(); __ST.G.paused=false; __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.G.fast=true;"
S = {
  'title': ("__ST.toTitle()", 1.5),
  'modes': ("__ST.openModes()", 0.6),
  'ladder': ("__ST.openLadder()", 0.6),
  'career': ("__ST.openCareer()", 0.8),
  'settings': ("__ST.G.backTo='title'; __ST.showScreen('settings')", 0.5),
  'howto': ("document.querySelector('#btnHow').click()", 0.5),
  'credits': ("document.querySelector('#btnCredits').click()", 0.5),
  'tactics': ("__ST.endTraining(); __ST.quickFight(5,'wardens')", 1.5),
  'fight': (FIGHT, 'fight'),
  'fighttp': ("__ST.setView('tp')", 1.5),
  'fightfp': ("__ST.setView('fp')", 1.0),
  'train': ("__ST.G.paused=false; __ST.startTraining()", 2.5),
  'pause': ("__ST.togglePause(true)", 0.6),
  'sheet': ("__ST.endTraining(); __ST.G.paused=false; __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.G.match.results.push({round:1,winner:0,a:4,b:1,time:63,reason:'3:1'}); __ST.G.match.wins[0]=1; __ST.G.phase='fight'; __ST.afterRound()", 1.0),
  'repair': ("__ST.openRepair(45, ()=>{}); __ST.selectPiece('armL'); __ST.selectTape('black')", 1.0),
  'matchend': ("__ST.G.match.wins=[2,1]; __ST.G.match.results.push({round:2,winner:1,a:1,b:4,time:80,reason:'3:1'},{round:3,winner:0,a:5,b:1,time:41,reason:'3:1'}); __ST.matchEnd()", 1.0),
  'forge': ("__ST.openCareer(); document.querySelector('#careerTabs [data-tab=forge]').click()", 0.6),
  'ach': ("document.querySelector('#careerTabs [data-tab=ach]').click()", 0.5),
  'record': ("document.querySelector('#careerTabs [data-tab=record]').click()", 0.5),
  'weapon': ("__ST.endTraining(); __ST.quickFight(5,'wardens'); document.querySelector('#tacTabs [data-tab=weapon]').click()", 1.5),
  'body': ("document.querySelector('#tacTabs [data-tab=body]').click()", 0.5),
  'squad': ("document.querySelector('#tacTabs [data-tab=squad]').click()", 0.5),
  'fphockey': ("__ST.endTraining(); __ST.G.loadout.wset='special'; __ST.G.loadout.weapon='x_hockey'; __ST.quickFight(1,'wardens'); __ST.setView('fp'); __ST.beginFight()", 4),
  'fpstop': ("__ST.G.loadout.weapon='x_stop'; __ST.quickFight(1,'wardens'); __ST.beginFight()", 4),
  'fppan': ("__ST.G.loadout.weapon='x_pan'; __ST.quickFight(1,'wardens'); __ST.beginFight()", 4),
  'fpclay': ("__ST.G.loadout.wset='fantasy'; __ST.G.loadout.weapon='f_claymore'; __ST.quickFight(1,'wardens'); __ST.beginFight()", 4),
  'fpmaul': ("__ST.G.loadout.weapon='f_maul'; __ST.quickFight(1,'wardens'); __ST.beginFight()", 4),
  'cine': ("__ST.G.loadout.wset='hist'; __ST.G.loadout.weapon='mace'; __ST.quickFight(1,'wardens'); __ST.setView('fp'); __ST.beginFight(); __ST.G.phase='fight'; (()=>{const o=__ST.G.fighters.find(f=>f.team===1); o.pos={x:0.8,z:9}; __ST.startCine(o, 30);})()", 2.5),
  'vfield': ("__ST.G.quickVenue='field'; __ST.endTraining(); __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'vcastle': ("__ST.G.quickVenue='castle'; __ST.quickFight(5,'rabble'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'vcastlefp': ("__ST.setView('fp')", 1.2),
  'skills': ("(()=>{const C=__ST.CAREER; C.skills={'steel.heavy':3,'steel.recover':1,'steel.windup':1,'grapple.ankle':2,'iron.rooted':1,'show.purse':1}; C.sp=4; C.level=6; C.xp=230;})(); __ST.openCareer('skills')", 0.8),
  'youthtac': ("__ST.endTraining(); __ST.G.category='youth'; __ST.quickFight(5,'wardens')", 1.5),
  'youth': ("__ST.G.paused=false; __ST.beginFight(); __ST.setView('tp'); __ST.G.fast=true", 'fight'),
  'youthfp': ("__ST.setView('fp')", 1.2),
  'youthhit': ("(()=>{const G=__ST.G; const o=G.fighters.find(f=>f.team===1&&!f.out); __ST.sparks(new __ST.THREE.Vector3(G.player.pos.x, 1.0, G.player.pos.z-1.2), 14, 1.2); __ST.toast('Hit','good','');})()", 0.4),
  'duel': ("__ST.G.category='men'; __ST.G.paused=false; __ST.quickFight(1,'wardens'); __ST.beginFight(); __ST.setView('fp'); __ST.G.fast=true", 'fight'),
  'tired': ("(()=>{const p=__ST.G.player; p.fatigue=0.82; p.gas=0.12;})()", 2.0),
  'tiredtp': ("__ST.setView('tp'); (()=>{const p=__ST.G.player; p.fatigue=0.82; p.gas=0.12;})()", 2.0),
  'daily': ("__ST.toTitle(); document.querySelector('#btnDaily').click()", 0.8),
  'run': ("document.querySelector('#btnRun').click()", 0.6),
  'dailyfight': ("document.querySelector('#btnRun').blur(); [...document.querySelectorAll('#msgPanel button')].find(b=>b.textContent.includes('New run')).click()", 2.0),
  'photo': ("__ST.G.category='men'; __ST.G.quickVenue='field'; __ST.G.paused=false; __ST.quickFight(3,'wardens'); __ST.beginFight(); __ST.G.fast=true", 'fight'),
  'photo2': ("__ST.togglePause(true); document.querySelector('#btnPhoto').click(); document.querySelector('#photoFrameBtn').click()", 1.5),
  'youth2': ("document.querySelector('#photoExit').click(); __ST.togglePause(false); __ST.G.category='youth'; __ST.G.quickVenue='arena'; __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.setView('tp'); __ST.G.fast=true", 'fight'),
  'youth2fp': ("__ST.setView('fp')", 1.5),
  'ual': ("__ST.G.category='men'; __ST.G.quickVenue='arena'; __ST.G.paused=false; __ST.quickFight(3,'wardens'); __ST.beginFight()", 'fight'),
  'ual2': ("(()=>{__ST.togglePause(true); document.querySelector('#btnPhoto').click(); const m=__ST.G.marshals[0]; __ST.PHOTO.target.set(m.pos.x,1.1,m.pos.z); __ST.PHOTO.dist=3.2; __ST.PHOTO.yaw=m.facing; __ST.PHOTO.pitch=0.15; return __ST.UAL.ready + ' ' + __ST.UAL.failed})()", 1.5),
  'ual3': ("(()=>{__ST.G.marshals.forEach(m=>m.flagUp=1); __ST.G.paused=false; setTimeout(()=>{__ST.G.paused=true;},600);})()", 2.0),
  'fall': ("(()=>{const G=__ST.G; const o=G.fighters.find(f=>f.team===1&&f.state==='standing'); o.lean={x:0.6,z:0.1}; o.leanV={x:3,z:0}; return o.name})()", 0.25),
  'fall2': ("1", 0.5),
  'women': ("__ST.G.category='women'; __ST.G.quickVenue='field'; __ST.G.paused=false; __ST.quickFight(3,'wardens'); __ST.beginFight()", 'fight'),
  'women2': ("(()=>{__ST.togglePause(true); document.querySelector('#btnPhoto').click(); const f=__ST.G.fighters.find(f=>f.team===1); __ST.PHOTO.target.set(f.pos.x,1.0,f.pos.z); __ST.PHOTO.dist=2.6; __ST.PHOTO.yaw=f.facing+2.4; __ST.PHOTO.pitch=0.12;})()", 1.5),
  'women3': ("(()=>{const f=__ST.G.fighters.find(f=>f.team===1); __ST.PHOTO.yaw=f.facing+0.3;})()", 1.0),
  'dueltac': ("document.querySelector('#photoExit').click(); __ST.togglePause(false); __ST.G.category='men'; __ST.G.loadout.wset='hist'; __ST.G.loadout.weapon='polearm'; __ST.quickFight(1,'wardens')", 1.5),
  'rain': ("__ST.G.category='men'; __ST.G.quickVenue='field'; __ST.G.quickWeather='rain'; __ST.G.paused=false; __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'replay': ("(()=>{__ST.togglePause(true); document.querySelector('#btnReplay').click();})()", 2.0),
  'snow': ("document.querySelector('#photoExit').click(); __ST.togglePause(false); __ST.G.quickVenue='castle'; __ST.G.quickWeather='snow'; __ST.quickFight(3,'rabble'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'modes2': ("__ST.G.quickWeather='clear'; __ST.openModes()", 0.8),
  'split': ("__ST.G.category='men'; __ST.G.quickVenue='field'; __ST.G.quickWeather='clear'; __ST.G.paused=false; __ST.startVersus(); __ST.G.fast=true", 'fight'),
  'vfair': ("__ST.G.category='men'; __ST.G.quickWeather=undefined; __ST.G.quickVenue='fair'; __ST.G.paused=false; __ST.quickFight(3,'wardens'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'vrink': ("__ST.G.quickVenue='rink'; __ST.quickFight(3,'wardens'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'vstadium': ("__ST.G.quickVenue='stadium'; __ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.setView('tp')", 'fight'),
  'intro': ("__ST.G.quickVenue='arena'; __ST.quickFight(5,'wardens'); __ST.beginFight()", 0.8),
  'kids': ("__ST.startKid('pig'); __ST.setView('tp')", 3),
  'kitcheck': ("__ST.startTourney(); __ST.kitCheck()", 1.0),
}
with sync_playwright() as p:
    for sz in sizes:
        w, h, touch = SZ[sz]
        b, pg, logs = launch(p, w, h, touch)
        pg.goto(URL); time.sleep(3); pg.evaluate("__ST.G.renderEvery=2; __ST.G.settings.gfx='high'")
        if sz == 'pad': pg.evaluate("__ST.setMode('pad')")
        for sc in screens:
            js, wait = S[sc]
            try:
                pg.evaluate(js)
                if wait == 'fight':
                    t0 = time.time()
                    while pg.evaluate("__ST.G.phase") != 'fight' and time.time() - t0 < 20: time.sleep(0.05)
                    sim(pg, 5); pg.evaluate("__ST.G.fast=false"); time.sleep(1.2)
                else: time.sleep(wait)
                if sz == 'pad': pg.evaluate("__ST.setMode('pad'); __ST.focusFirst()")
                pg.screenshot(path=str(UI / f'{tag}-{sz}-{sc}.png'))
            except Exception as e: print('ERR', sz, sc, e)
        errs = pg.evaluate("JSON.stringify(__ST.G.stats.errors.slice(0,3))")
        if errs != '[]': print(sz, 'errors', errs)
        print(sz, '\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l and 'Failed to load' not in l)[-800:])
        b.close()
print('done')
