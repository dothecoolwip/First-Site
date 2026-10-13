// ---------- Little Knights: foam-dummy knockdown, balloon pop, catch the pig, and a sticker book ----------
const KID = { on: false, kind: null, t: 0, score: 0, objs: [], pig: null };
const KID_GAMES = {
  dummies: { name: 'Foam dummy knockdown', icon: '🧸', desc: 'Knock the foam dummies over as many times as you can in a minute. Shove, trip, bonk!' },
  balloons: { name: 'Balloon pop', icon: '🎈', desc: 'Balloons float around the list. Swing at them to pop them. Aim up for the high ones!' },
  pig: { name: 'Catch the pig', icon: '🐷', desc: 'A very fast piggy is loose! Run it down and GRAB it. Then it escapes again…' },
};
const STICKERS = [
  ['unicorn', '🦄', 'Unicorn', 'Play a Youth match'], ['star', '⭐', 'Gold star', 'Win a Youth match'], ['teddy', '🧸', 'Teddy', 'Knock down 5 foam dummies in one game'],
  ['balloon', '🎈', 'Balloon', 'Pop 10 balloons in one game'], ['piggy', '🐷', 'Piggy', 'Catch the pig 3 times in one game'], ['shield', '🛡️', 'Shield', 'A perfect block in the Youth division'],
  ['bullseye', '🎯', 'Bullseye', 'A helmet hit in the Youth division'], ['rainbow', '🌈', 'Rainbow', 'Salute the crowd in the Youth division'], ['lolly', '🍭', 'Lolly', 'Play all three Little Knights games'],
  ['trophy', '🏆', 'Trophy', 'Win the Red Deer Rumble in the Youth division'],
];
function sticker(id) {
  CAREER.stickers = CAREER.stickers || {}; if (CAREER.stickers[id] || G.autopilot || G.attract) return;
  const S = STICKERS.find(s => s[0] === id); if (!S) return;
  CAREER.stickers[id] = Date.now(); saveCareer(); ACHQ.push({ kicker: 'New sticker!', name: `${S[1]} ${S[2]}`, desc: S[3] }); if (!ACHQ.busy) showAch(); AU.boing(0.6);
}
EV_LISTENERS.push((type, d) => {
  if (!CUTE.on) return;
  if (type === 'perfect') sticker('shield');
  if (type === 'hit' && d && d.zone === 'helmet' && !d.blocked) sticker('bullseye');
  if (type === 'salute') sticker('rainbow');
});
function openKids() {
  AU.init(); const played = CAREER.kidsPlayed || {};
  msg('little knights', 'Little Knights games', `<div class="modes">${Object.entries(KID_GAMES).map(([k, g]) => `<button class="mode" data-kid="${k}"><span class="big">${g.icon}</span><b>${g.name}</b><span>${g.desc}</span><span class="muted">${played[k] ? 'Best: ' + played[k] : 'New!'}</span></button>`).join('')}</div>`,
    [['Sticker book', openStickers], ['Back', openModes, true]]);
  $$('#msgPanel [data-kid]').forEach(b => b.onclick = () => { AU.click(); startKid(b.dataset.kid); });
}
function openStickers() {
  const got = CAREER.stickers || {};
  msg('little knights', 'Sticker book', `<p class="muted">${Object.keys(got).length} of ${STICKERS.length} stickers.</p><div class="stickers">${STICKERS.map(([id, e, n, d]) => `<div class="stk${got[id] ? ' on' : ''}"><span class="se">${got[id] ? e : '?'}</span><b>${got[id] ? n : '???'}</b><small>${d}</small></div>`).join('')}</div>`, [['Back', openKids, true]]);
}
function startKid(kind) {
  G.attract = false; G.tourney = null; REP.log = []; endTraining();
  const catWas = G.category; G.category = 'youth';
  setupMatch({ mode: 'train', opp: 'sparring', stage: 'Little Knights', training: true, kids: kind, venue: 'field' });
  G.category = catWas;
  startRound(); beginFight();
  Object.assign(KID, { on: true, kind, t: 60, score: 0, objs: [], pig: null });
  const partners = G.fighters.filter(f => f.team === 1);
  if (kind === 'dummies') partners.forEach((f, i) => { f.ai.mode = 'still'; f.stabMul = 0.55; f.pos = f.home = { x: (i ? 3 : -3), z: 4 }; });
  else partners.forEach(f => { f.out = true; f.model.root.visible = false; });
  if (kind === 'balloons') for (let i = 0; i < 6; i++) spawnBalloon();
  if (kind === 'pig') spawnPig();
  $('#lesson').hidden = false; $('#lSkip').hidden = true; $('#app').classList.add('training'); $('#lExit').onclick = () => endKid(true);
  updateKidCard();
}
function updateKidCard() {
  const g = KID_GAMES[KID.kind]; $('#lNum').textContent = g.icon; $('#lTitle').textContent = g.name; $('#lProg').textContent = `${Math.ceil(KID.t)}s · ${KID.score}`;
  $('#lText').textContent = KID.kind === 'dummies' ? 'Knock the dummies down! They bounce right back up.' : KID.kind === 'balloons' ? 'Swing at the balloons to pop them. Look up for the high ones.' : 'Run up to the piggy and GRAB it!';
}
function spawnBalloon() {
  const col = CUTE_POPS[(Math.random() * CUTE_POPS.length) | 0];
  const b = new THREE.Mesh(geo('kballoon', () => { const s = new THREE.SphereGeometry(0.22, 16, 12); s.scale(1, 1.2, 1); return s; }), cuteMat(col, { roughness: 0.25, emissive: new THREE.Color(col).multiplyScalar(0.15).getHex() }));
  b.position.set(rand(-7, 7), rand(0.7, 1.7), rand(-9, 9)); b.userData = { base: b.position.clone(), ph: rand(0, TAU) }; W3.matchRoot.add(b); KID.objs.push(b);
}
function spawnPig() {
  const g = new THREE.Group(), pink = cuteMat('#ffaec9'), dark = cuteMat('#e07a9e');
  mk(g, geo('pigB', () => new THREE.SphereGeometry(0.32, 16, 12)), pink, 0, 0.35, 0).scale.set(1, 0.85, 1.3);
  mk(g, geo('pigH', () => new THREE.SphereGeometry(0.2, 14, 10)), pink, 0, 0.45, 0.42);
  mk(g, geo('pigS', () => new THREE.CylinderGeometry(0.08, 0.09, 0.08, 12)), dark, 0, 0.42, 0.6).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) { mk(g, geo('pigE', () => new THREE.ConeGeometry(0.06, 0.12, 8)), dark, sx * 0.1, 0.63, 0.4).rotation.z = -sx * 0.5; mk(g, geo('pigEye', () => new THREE.SphereGeometry(0.025, 8, 6)), cuteBasic('#2a1d22'), sx * 0.08, 0.5, 0.58); for (const fz of [-0.25, 0.25]) mk(g, geo('pigL', () => new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8)), pink, sx * 0.17, 0.1, fz); }
  mk(g, geo('pigT', () => new THREE.TorusGeometry(0.05, 0.015, 6, 12, Math.PI * 1.5)), dark, 0, 0.45, -0.42);
  g.position.set(rand(-6, 6), 0, rand(-8, 8)); W3.matchRoot.add(g); KID.pig = { g, vel: { x: 0, z: 0 }, dir: rand(0, TAU), hop: 0 };
}
function updateKids(dt) {
  if (!KID.on || !G.match || !G.match.kids) return;
  if (G.phase !== 'fight' || G.paused) return;
  KID.t -= dt; const p = G.player;
  if (KID.kind === 'balloons') {
    for (const b of KID.objs.slice()) {
      b.position.y = b.userData.base.y + Math.sin(G.realTime * 1.4 + b.userData.ph) * 0.15; b.position.x = b.userData.base.x + Math.sin(G.realTime * 0.6 + b.userData.ph) * 0.4;
      const a = p.action, hs = p.body.h / 1.8;
      if (a && a.kind === 'swing' && a.phase === 'strike' && !a.kidHit) {
        const dx = b.position.x - p.pos.x, dz = b.position.z - p.pos.z, d = Math.hypot(dx, dz), front = Math.cos(angDiff(p.facing, Math.atan2(dx, dz)));
        const aimY = p.body.h * 0.935 + Math.tan(FP.pitch) * d;
        if (d < reachOf(p) + 0.35 && front > 0.5 && Math.abs(aimY - b.position.y) < 0.55 * Math.max(hs, 0.7) + 0.2) { a.kidHit = true; KID.score++; sparks(b.position.clone(), 14, 1.2); AU.noise(0.12, 3000, 0.8, 0.5, 'highpass'); AU.boing(0.5); W3.matchRoot.remove(b); KID.objs.splice(KID.objs.indexOf(b), 1); spawnBalloon(); toast('Pop!', 'good', `${KID.score} popped`); }
      }
    }
  }
  if (KID.kind === 'pig' && KID.pig) {
    const P = KID.pig, g = P.g, dx = g.position.x - p.pos.x, dz = g.position.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
    if (d < 4.5) P.dir = Math.atan2(dx, dz) + Math.sin(G.realTime * 3) * 0.7; else if (Math.random() < dt * 0.8) P.dir += rand(-1.5, 1.5);
    const sp = d < 4.5 ? 3.3 : 1.2; P.vel.x = damp(P.vel.x, Math.sin(P.dir) * sp, 6, dt); P.vel.z = damp(P.vel.z, Math.cos(P.dir) * sp, 6, dt);
    g.position.x = clamp(g.position.x + P.vel.x * dt, -LIST.W / 2 + 0.6, LIST.W / 2 - 0.6); g.position.z = clamp(g.position.z + P.vel.z * dt, -LIST.L / 2 + 0.6, LIST.L / 2 - 0.6);
    if (Math.abs(g.position.x) > LIST.W / 2 - 0.8 || Math.abs(g.position.z) > LIST.L / 2 - 0.8) P.dir += Math.PI * 0.6;
    g.rotation.y = Math.atan2(P.vel.x, P.vel.z); P.hop += dt * 14; g.position.y = Math.abs(Math.sin(P.hop)) * 0.08;
    const a = p.action; if (a && a.kind === 'grab' && d < 1.25 && !a.kidHit) { a.kidHit = true; KID.score++; toast('Gotcha piggy!', 'big', `${KID.score} caught`); AU.boing(0.9); sparks(g.position.clone().setY(0.6), 16, 1.2); g.position.set(rand(-7, 7), 0, rand(-10, 10)); }
  }
  updateKidCard();
  if (KID.t <= 0) endKid(false);
}
EV_LISTENERS.push(type => { if (KID.on && KID.kind === 'dummies' && type === 'takedown') { KID.score++; toast('Bonk! Down it goes', 'good', `${KID.score} down`); } });
function endKid(quit) {
  const kind = KID.kind, score = KID.score; KID.on = false;
  KID.objs.forEach(o => W3.matchRoot.remove(o)); KID.objs = []; if (KID.pig) { W3.matchRoot.remove(KID.pig.g); KID.pig = null; }
  $('#lSkip').hidden = false; $('#lesson').hidden = true; $('#lExit').onclick = lExitDefault; document.getElementById('app').classList.remove('training'); setHud(false); G.phase = 'over';
  if (quit) { openKids(); return; }
  bump('kidsGames');
  const P = CAREER.kidsPlayed = CAREER.kidsPlayed || {}; const best = Math.max(P[kind] || 0, score); P[kind] = best; saveCareer();
  if (kind === 'dummies' && score >= 5) sticker('teddy'); if (kind === 'balloons' && score >= 10) sticker('balloon'); if (kind === 'pig' && score >= 3) sticker('piggy');
  if (P.dummies != null && P.balloons != null && P.pig != null) sticker('lolly');
  msg('little knights', `${KID_GAMES[kind].icon} ${score}!`, `<p>${KID_GAMES[kind].name}: <b>${score}</b>. Best ever: ${best}.</p>`, [['Again!', () => startKid(kind), true], ['Other games', openKids], ['Sticker book', openStickers]]);
}

