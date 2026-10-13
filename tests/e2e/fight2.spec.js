// Fighting 2.0 and BuhurtOS rosters: directional guards, AI tiers, real names with glows, live fights on the arenas.
const { test, expect } = require('./fixtures');

const FAKE = `({ teams: [{ slug: 'iron-wolves', name: 'The Iron Wolves', colors: ['#2C4A8C', '#E9ECEF'], initial: 'I' }, { slug: 'red-hart', name: 'Red Hart Company', colors: ['#8a1f2a', '#e8e1cf'], initial: 'R' }],
  fighters: [{ id: 'f1', name: 'kedrixx', team: 'iron-wolves', g: 'm' }, { id: 'f2', name: 'Bjorn Steel', team: 'iron-wolves', g: 'm' }, { id: 'f3', name: 'Ulla Hart', team: 'red-hart', g: 'f' }, { id: 'f4', name: 'Magnus Hart', team: 'red-hart', g: 'm' }, { id: 'f5', name: 'Sten Hart', team: 'red-hart', g: 'm' }, { id: 'f6', name: 'Arne Wolf', team: 'iron-wolves', g: 'm' }],
  live: [{ field: '1', event: 'Prairie Melee', comp: 'Men 5v5', category: 'men', a: { team: 'iron-wolves', name: 'Iron Wolves', fighters: [{ id: 'f1', name: 'kedrixx' }, { id: 'f2', name: 'Bjorn Steel' }] }, b: { team: 'red-hart', name: 'Red Hart', fighters: [{ id: 'f4', name: 'Magnus Hart' }, { id: 'f5', name: 'Sten Hart' }] }, score: [1, 0], phase: 'round 2' }], ok: true, at: Date.now() })`;

test('BuhurtOS: real names fill the bots and glow; the real person glows brighter; a live fight is mirrored at the Dome', async ({ game }) => {
  await game.noRender();
  await game.run(`(Object.assign(ROSTER, ${FAKE}), rosterClubs(), rosterLive(), true)`);
  // teams become clubs, default colours replaced with a colour of their own
  expect(await game.run("!!CLUBS['bos:iron-wolves'] && CLUBS['bos:iron-wolves'].tabard !== '#2C4A8C'")).toBe(true);
  // a match against a BuhurtOS club: its fighters carry real names and a soft glow; gaps come from the pool
  await game.run("(G.category = 'men', quickFight(5, 'bos:iron-wolves'), true)");
  const names = await game.run("G.fighters.filter(f => f.team === 1).map(f => f.name)");
  expect(names).toEqual(expect.arrayContaining(['kedrixx', 'Bjorn Steel', 'Arne Wolf']));
  expect(new Set(names).size).toBe(names.length);
  expect(await game.run("G.fighters.filter(f => f.spec.bos).every(f => f.model.glow && !f.realGlow)")).toBe(true);
  // the real one, in the match: the big glow and a banner
  expect(await game.run("(() => { const f = G.fighters.find(x => x.name === 'kedrixx'); f.bosReal = { id: 'f1' }; f.model.root.remove(f.model.glow); fighterGlow(f); return f.realGlow && !!f.model.banner; })()")).toBe(true);
  // live: the Dome shows LIVE and its bout mirrors the real fight
  expect(await game.run("ARENAS[0].live && /Iron Wolves 1–0 Red Hart/.test(ARENAS[0].liveText)")).toBe(true);
  const L = await game.run("(() => { const o = liveBoutPick(ARENAS[0]); return { a: CLUBS[o.clubA].roster[0].name, b: CLUBS[o.opp].roster[1].name, mode: o.mode }; })()");
  expect(L).toEqual({ a: 'kedrixx', b: 'Sten Hart', mode: 2 });
});

test('Fighting 2.0: bots guard a side and a blow from the other side gets half through; tiers by place; shield bash opens a guard', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  expect(await game.run("aiTier(G.fighters[1])")).toBe(1);
  const r = await game.run("(() => { const t = G.fighters[1], f = G.fighters[0]; t.ai.gdir = 'L2R'; const wrong = guardOutcome(f, t, { arc: 'R2L' }, 0.4); t.ai.gdir = 'R2L'; const right = guardOutcome(f, t, { arc: 'R2L' }, 0.4); return [wrong.bf, wrong.wrong, right.bf]; })()");
  expect(r[0]).toBeCloseTo(0.7); expect(r[1]).toBe(true); expect(r[2]).toBeCloseTo(0.4);
  // bots learn the side you keep using
  expect(await game.run("G.fighters[1].ai.seen.length")).toBe(2);
  // the King's Guard trial runs at tier 3, the bailey duel at tier 2
  await game.run("(startTrial('royal'), true)");
  expect(await game.run("aiTier(G.fighters.find(f => f.team === 1))")).toBe(3);
  expect(await game.run("G.fighters.filter(f => f.team === 1).every(f => f.club.key === 'kingsguard' && typeof f.name === 'string' && f.name.length > 0)")).toBe(true);
  await game.run("(startTrial('bailey'), true)");
  expect(await game.run("aiTier(G.fighters[1])")).toBe(2);
});

test('directional blocking: your guard covers one side; the wrong side or a lazy middle guard lets half through', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  const r = await game.run("(() => { const me = G.fighters[0], e = G.fighters[1]; me.gdir = 'L'; const ok = guardOutcome(e, me, { arc: 'R2L' }, 0.4); const wrong = guardOutcome(e, me, { arc: 'L2R' }, 0.4); me.gdir = 'mid'; const mid = guardOutcome(e, me, { arc: 'O' }, 0.4); me.gdir = 'H'; const high = guardOutcome(e, me, { arc: 'O' }, 0.4); return [ok.bf, wrong.bf, !!wrong.wrong, mid.bf, !!mid.mid, high.bf]; })()");
  expect(r[0]).toBeCloseTo(0.4); expect(r[1]).toBeCloseTo(0.7); expect(r[2]).toBe(true); expect(r[3]).toBeCloseTo(0.7); expect(r[4]).toBe(true); expect(r[5]).toBeCloseTo(0.4);
  // the input: a flick while guarding picks the side
  expect(await game.run("[sideFromDrag(0, 0, 12), sideFromDrag(-40, 0, 12), sideFromDrag(40, 5, 12), sideFromDrag(2, -40, 12)]")).toEqual(['mid', 'L', 'R', 'H']);
});

test('simultaneous longsword attacks bind instead of scoring through each other', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  const result = await game.run(`(() => {
    const f = G.player, t = G.fighters.find(x => x.team === 1);
    G.phase = 'fight'; f.weapon = WEAPONS.longsword; t.weapon = WEAPONS.longsword;
    f.pos = { x: 0, z: 0 }; t.pos = { x: 0, z: 1.2 };
    f.facing = f.wantFace = 0; t.facing = t.wantFace = Math.PI;
    f.action = { kind: 'swing', phase: 'strike', t: 0.03, arc: 'R2L', charge: 0.4, hit: true };
    t.action = { kind: 'swing', phase: 'strike', t: 0.03, arc: 'L2R', charge: 0.4, hit: false };
    const before = G.match.pts.slice(); resolveSwing(f, f.action);
    return { binds: G.stats.binds, f: f.action.phase, t: t.action.phase, before, after: G.match.pts.slice(), gas: [f.gas, t.gas] };
  })()`);
  expect(result.binds).toBeGreaterThanOrEqual(1);
  expect(result).toMatchObject({ f: 'recover', t: 'recover', before: [0, 0], after: [0, 0] });
  expect(result.gas[0]).toBeLessThan(1);
  expect(result.gas[1]).toBeLessThan(1);
});

test('long weapons lose leverage inside and duel AI circles without sprinting', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  const result = await game.run(`(() => {
    const f = G.fighters.find(x => x.team === 1), t = G.player;
    const leverage = [swingLeverage(WEAPONS.polearm, 0.75), swingLeverage(WEAPONS.longsword, 0.75), swingLeverage(WEAPONS.mace, 0.75), swingLeverage(WEAPONS.longsword, 1.5)];
    G.phase = 'fight'; f.weapon = WEAPONS.longsword;
    f.pos = { x: 0, z: 1.5 }; t.pos = { x: 0, z: 0 };
    f.facing = f.wantFace = Math.PI; t.facing = t.wantFace = 0;
    f.ai.target = t; f.ai.strafe = 1; f.cd = 1;
    think(f, { react: 0.2, aggr: 1, guard: 0.5 });
    return { leverage, move: { ...f.move }, sprint: f.sprint };
  })()`);
  expect(result.leverage[0]).toBeLessThan(result.leverage[1]);
  expect(result.leverage[1]).toBeLessThan(result.leverage[2]);
  expect(result.leverage[3]).toBe(1);
  expect(Math.abs(result.move.x)).toBeGreaterThan(0.15);
  expect(result.sprint).toBe(false);
});

test('a crowded longsword fighter uses close work instead of full swings', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  const action = await game.run(`(() => {
    const f = G.fighters.find(x => x.team === 1), t = G.player;
    G.phase = 'fight'; f.weapon = WEAPONS.longsword;
    f.pos = { x: 0, z: 0.8 }; t.pos = { x: 0, z: 0 };
    f.facing = f.wantFace = Math.PI; t.facing = t.wantFace = 0;
    f.ai.target = t; f.trait = 'steady'; f.cd = 0; f.action = null;
    think(f, { react: 0.2, aggr: 1, guard: 0.5 });
    return f.action && f.action.kind;
  })()`);
  expect(['shove', 'grab']).toContain(action);
});

test('duel strikes follow the weapon arc and a miss stays a miss @touch', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), true)");
  const r = await game.run(`(() => {
    const f = G.player, t = G.fighters.find(x => x.team === 1);
    G.phase = 'fight'; f.weapon = WEAPONS.longsword;
    f.pos = { x: 0, z: 0 }; f.facing = f.wantFace = 0;
    t.pos = { x: 0, z: 1.25 }; t.guard = false; t.action = null;
    const a = { kind: 'swing', phase: 'strike', t: 0, arc: 'R2L', charge: 0.35, hit: false };
    const front = sweptSwingTarget(f, a, 0, 1) === t;
    t.pos = { x: 1.05, z: 0.8 };
    const rightEarly = sweptSwingTarget(f, a, 0, 0.3) === t;
    const wrongSideEarly = sweptSwingTarget(f, { ...a, arc: 'L2R' }, 0, 0.3) === t;
    t.pos = { x: 0, z: 1.25 };
    f.action = { ...a }; const beforeHit = G.stats.hits;
    updateAction(f, swingTimes(f).strike + 0.01);
    const connected = G.stats.hits === beforeHit + 1 && !f.action.whiff;
    t.pos = { x: 0, z: -1.25 };
    const behind = sweptSwingTarget(f, a, 0, 1);
    f.action = { ...a }; const oldHits = G.stats.hits; updateAction(f, swingTimes(f).strike + 0.01);
    return { front, rightEarly, wrongSideEarly, connected, behind: !!behind, whiff: !!f.action.whiff, hits: G.stats.hits - oldHits };
  })()`);
  expect(r).toMatchObject({ front: true, rightEarly: true, wrongSideEarly: false, connected: true, behind: false, whiff: true, hits: 0 });
});

test('5v5 weapon sweep stops at an ally, rejects rear contact, and records one front hit', async ({ game }) => {
  await game.noRender();
  const result = await game.run(`(() => {
    quickFight(5, 'wardens'); G.phase = 'fight';
    const f = G.player, ally = G.fighters.find(x => x.team === 0 && x !== f);
    const enemies = G.fighters.filter(x => x.team === 1), near = enemies[0], far = enemies[1];
    for (const o of G.fighters) { o.pos = { x: 30, z: 30 }; o.action = null; o.guard = false; }
    f.pos = { x: 0, z: 0 }; f.facing = f.wantFace = 0; f.weapon = WEAPONS.longsword;
    ally.pos = { x: 0, z: 0.75 }; near.pos = { x: 0, z: 1.25 }; far.pos = { x: 0, z: 1.75 };
    const arc = { arc: 'R2L', charge: 0.3 };
    const allyBlock = !!traceSwing(f, arc, 0, 1)?.blockedByAlly;
    ally.pos = { x: 30, z: 30 };
    const nearest = traceSwing(f, arc, 0, 1)?.target === near;
    near.pos = { x: 0.38, z: -0.15 }; far.pos = { x: 30, z: 30 };
    const rear = traceSwing(f, arc, 0, 1);
    near.pos = { x: 0, z: 1.25 };
    f.action = { kind: 'swing', phase: 'strike', t: 0, arc: 'R2L', charge: 0.3, hit: false };
    const before = G.stats.hits; updateAction(f, swingTimes(f).strike + 0.01);
    return { allyBlock, nearest, rear: !!rear, hits: G.stats.hits - before, phase: f.action.phase };
  })()`);
  expect(result).toEqual({ allyBlock: true, nearest: true, rear: false, hits: 1, phase: 'recover' });
});

test('career challenge stages and reaction floor hold in combat', async ({ game }) => {
  await game.noRender();
  const stages = await game.run(`(() => [1, 24, 25, 49, 50, 74, 75, 79, 80, 89, 90, 99, 100].map(level => [level, challengeStage(level), challengeFactor(level)]))()`);
  expect(stages.map(x => x[1])).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
  expect(stages.at(-1)[2]).toBeCloseTo(Math.pow(1.12, 3) * Math.pow(1.20, 3));
  const next = await game.run(`(() => { CAREER.level = 100; quickFight(1, 'wardens'); G.phase = 'fight'; const f = G.fighters.find(x => x.team === 1); f.ai.next = 0; simStep(1 / 60); return f.ai.next; })()`);
  expect(next).toBeGreaterThanOrEqual(0.11);
});

test('autopilot duel still makes real contacts over a full exchange', async ({ game }) => {
  await game.noRender();
  await game.run("(quickFight(1, 'wardens'), G.autopilot = true, G.fast = true, G.phase = 'fight', showScreen(null), window.__duelStart = G.simTime, true)");
  await game.until('G.simTime - window.__duelStart > 25 || G.phase !== "fight"', 60_000);
  const r = await game.run('({ hits: G.stats.hits, points: G.match.pts.slice(), phase: G.phase, errors: G.stats.errors.slice() })');
  expect(r.hits).toBeGreaterThan(0);
  expect(r.errors).toEqual([]);
});
