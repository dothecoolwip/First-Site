import time, sys
sys.argv=['x','none']
src = open('run.py').read().split("with sync_playwright() as p:")[0].replace("URL = 'file://' + str(HERE / 'index.html')", "URL = 'http://127.0.0.1:8765/index.html'")
src = src.replace("    if u.startswith('http'):\n        return r.abort()", "    if u.startswith('http') and '127.0.0.1' not in u:\n        return r.abort()")
exec(src)
with sync_playwright() as p:
    b, pg, logs = launch(p, 1280, 720, False)
    pg.goto(URL); time.sleep(3)
    pg.mouse.click(640, 360); pg.evaluate('__ST.AU.init()')
    pg.evaluate("__ST.G.settings.view='tp'; __ST.quickFight(5,'wardens');"); time.sleep(2)
    time.sleep(2); print('audio buffers', pg.evaluate('Object.keys(__ST.AU.buf).length'), pg.evaluate('__ST.AU.ctx ? __ST.AU.ctx.state : "none"'))
    pg.evaluate("__ST.beginFight();"); time.sleep(4)
    pg.evaluate("(()=>{const c=__ST.G; })()")
    pg.screenshot(path=str(OUT/'as-tp.png'))
    pg.evaluate("__ST.G.settings.view='fp'"); time.sleep(3)
    pg.screenshot(path=str(OUT/'as-fp.png'))
    print('\n'.join(l for l in logs if 'GPU stall' not in l and 'ERR_FAILED' not in l)[-1500:])
    b.close()
