import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 640, 360, False)
    pg.goto(URL); time.sleep(3)
    print(pg.evaluate("(()=>{try{const c=__ST.weaponIcon('mace'); return 'ok '+c.width}catch(e){return String(e.stack).slice(0,400)}})()"))
    b.close()
