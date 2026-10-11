import time, sys
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 1280, 720)
    t=time.time(); pg.goto(URL); print('goto', round(time.time()-t,1), flush=True)
    time.sleep(3)
    t=time.time(); print(pg.evaluate('__ST.G.screen'), round(time.time()-t,1), flush=True)
    t=time.time(); pg.click('#btnRumble', timeout=15000); print('click', round(time.time()-t,1), flush=True)
    time.sleep(1)
    t=time.time(); print(pg.evaluate('__ST.G.screen+"|"+__ST.G.phase'), round(time.time()-t,1), flush=True)
    t=time.time(); pg.screenshot(path='/tmp/x.png'); print('shot', round(time.time()-t,1), flush=True)
    print('\n'.join(logs[-10:]))
    b.close()
