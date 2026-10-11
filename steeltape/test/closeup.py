import time, sys
sys.argv=['x','none']
src = open('run.py').read().split("with sync_playwright() as p:")[0].replace("URL = 'file://' + str(HERE / 'index.html')", "URL = 'http://127.0.0.1:8765/index.html'")
src = src.replace("    if u.startswith('http'):\n        return r.abort()", "    if u.startswith('http') and '127.0.0.1' not in u:\n        return r.abort()")
exec(src)
JS = """(()=>{
const c=document.createElement('canvas'); c.width=1000; c.height=560; c.style.cssText='position:fixed;left:0;top:0;z-index:9999;width:1000px;height:560px;background:#222';
document.body.appendChild(c);
const r=new THREE.WebGLRenderer({canvas:c, antialias:true}); r.outputEncoding=THREE.sRGBEncoding; r.toneMapping=THREE.ACESFilmicToneMapping;
const s=new THREE.Scene(); s.background=new THREE.Color('#3a4248'); s.environment=__ST.W3.scene.environment;
s.add(new THREE.HemisphereLight('#fff','#444',0.8)); const d=new THREE.DirectionalLight('#fff',1.4); d.position.set(1,2,3); s.add(d);
const cl=__ST.CLUBS.reavers, cb=__ST.CLUBS.wardens;
const sh=__ST.buildShield('heater', cl); sh.position.set(-0.55,0,0); s.add(sh);
const sh2=__ST.buildShield('heater', cb); sh2.position.set(-0.0,0,0); sh2.rotation.y=0.5; s.add(sh2);
const keys=['sword','longsword','mace','axe','falchion'];
keys.forEach((k,i)=>{ const w=__ST.buildWeapon(k, cl); w.position.set(0.45+i*0.17,-0.45,0); w.rotation.y=0.6; s.add(w); });
const cam=new THREE.PerspectiveCamera(35, 1000/560, 0.05, 50); cam.position.set(0.3,0.15,2.1); cam.lookAt(0.3,0,0);
r.render(s,cam);
})()"""
with sync_playwright() as p:
    b, pg, logs = launch(p, 1000, 560, False)
    pg.goto(URL); time.sleep(3)
    pg.evaluate(JS); time.sleep(1)
    pg.screenshot(path=str(OUT/'closeup.png'))
    print('\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-800:])
    b.close()
