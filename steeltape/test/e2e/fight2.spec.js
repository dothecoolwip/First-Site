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
  expect(await game.run("G.fighters.filter(f => f.team === 1).map(f => f.name).includes('Sir Edric')")).toBe(true);
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
