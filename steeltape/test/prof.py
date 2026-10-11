import time, sys, json, collections
sys.argv=['x','none']
exec(open('run.py').read().split("with sync_playwright() as p:")[0])
with sync_playwright() as p:
    b, pg, logs = launch(p, 1280, 720, False)
    pg.goto(URL); time.sleep(3)
    pg.evaluate("__ST.quickFight(5,'wardens'); __ST.beginFight(); __ST.G.renderEvery=1000"); time.sleep(2)
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Profiler.enable'); cdp.send('Profiler.start'); time.sleep(4)
    prof = cdp.send('Profiler.stop')['profile']
    nodes = {n['id']: n for n in prof['nodes']}
    dt = prof['timeDeltas']; samples = prof['samples']
    self_t = collections.Counter()
    for s, d in zip(samples, dt): 
        n = nodes[s]; cf = n['callFrame']; self_t[(cf['functionName'] or '(anon)') + ':' + str(cf['lineNumber'])] += d
    tot = sum(dt)
    for k, v in self_t.most_common(25): print(f'{v/tot*100:5.1f}% {k}')
    b.close()
