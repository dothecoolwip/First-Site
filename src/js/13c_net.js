// ---------- two players: local versus on one screen, and online duels through the page's room ----------

// Both use the same "virtual input" (VIN): movement, guard/brace/sprint, a swing counter with hold and arc, and action counters.

function newVin() { return { mx: 0, mz: 0, yaw: null, pitch: 0, cancel: 0, sp: 0, gd: 0, br: 0, sw: 0, sh: 0, arc: 'auto', e: { trip: 0, shove: 0, grab: 0, tackle: 0 } }; }

function vinAct(f, k, opp) {

  if (k === 'tackle') { if (f.weapon && !f.clinch) startAction(f, 'tackle', { target: opp }); return; }

  if (f.clinch) { startAction(f, k === 'trip' ? 'throw' : k === 'grab' ? 'disarm' : 'shove'); return; }

  if (!f.weapon && k === 'shove') return;

  startAction(f, k, { target: opp });

}

const NET_PROTOCOL = 3;

function validatedVin(raw, previous) {

  if (!raw || typeof raw !== 'object') return null;

  const counter = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;

  if (![raw.mx, raw.mz].every(Number.isFinite) || !counter(raw.sw) || !raw.e || !['trip', 'shove', 'grab', 'tackle'].every(k => counter(raw.e[k]))) return null;

  if (raw.yaw != null && !Number.isFinite(raw.yaw)) return null;

  if (raw.pitch != null && !Number.isFinite(raw.pitch)) return null;

  if (!['auto', 'R2L', 'L2R', 'O'].includes(raw.arc || 'auto') || ![0, 1, 2, 3, 4].includes(raw.gd || 0)) return null;

  const cancel = raw.cancel || 0; if (!counter(cancel)) return null;

  if (!counter(raw.orderSeq || 0) || (raw.order != null && !ORDERS[raw.order])) return null;

  if (previous && (raw.sw < previous.sw || raw.sw - previous.sw > 1 || cancel < previous.cancel || cancel - previous.cancel > 1 || Object.keys(previous.e).some(k => raw.e[k] < previous.e[k] || raw.e[k] - previous.e[k] > 1))) return null;

  const scale = Math.max(1, Math.hypot(raw.mx, raw.mz));

  return { ...raw, mx: raw.mx / scale, mz: raw.mz / scale, pitch: clamp(raw.pitch || 0, -0.75, 0.55), yaw: raw.yaw == null ? null : angDiff(0, raw.yaw), sw: raw.sw, cancel, sp: !!raw.sp, br: !!raw.br, sh: !!raw.sh, e: { ...raw.e } };

}

function neutralVin(V) { return { ...V, mx: 0, mz: 0, sp: false, gd: 0, br: false, sh: false, e: { ...V.e } }; }

function vinControl(f, V, dt) {

  if (V.expired || V.menuNeutral) { f.move = { x: 0, z: 0 }; f.guard = f.brace = f.sprint = false; if (f.action?.held) f.action.cancel = true; if (f.vinSeen) f.vinSeen.held = false; return; }

  V = validatedVin(V); if (!V) { f.move = { x: 0, z: 0 }; f.guard = f.brace = f.sprint = false; if (f.action?.held) f.action.cancel = true; return; }

  const S = f.vinSeen || (f.vinSeen = { sw: V.sw, cancel: 0, held: false, e: { ...V.e } });

  if (V.order && V.orderSeq > (S.orderSeq || 0)) { S.orderSeq = V.orderSeq; if (!NET.on || onlineCaptain(f.team)?.uid === f.netUid) setOrder(V.order, f); }

  f.aimPitch = Number.isFinite(V.pitch) ? clamp(V.pitch, -0.75, 0.55) : 0;

  if (V.cancel && V.cancel !== S.cancel) { S.cancel = V.cancel; S.held = false; if (f.action && f.action.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true; }

  if (f.state !== 'standing' || G.phase !== 'fight') { f.move = { x: 0, z: 0 }; S.sw = V.sw; S.e = { ...V.e }; S.held = false; return; }

  f.move = { x: V.mx || 0, z: V.mz || 0 }; f.sprint = !!V.sp; f.guard = !!V.gd; f.gdir = V.gd ? ({ 2: 'L', 3: 'R', 4: 'H' }[V.gd] || 'mid') : null; f.brace = !!V.br && !V.gd;

  let opp = null, bd = 1e9; for (const o of G.fighters) if (o.team !== f.team && isUp(o)) { const d = dist2(o.pos, f.pos); if (d < bd) { bd = d; opp = o; } }

  f.softTarget = opp;

  f.wantFace = V.yaw != null ? V.yaw : opp ? angTo(f.pos, opp.pos) : vlen(f.move) > 0.2 ? Math.atan2(f.move.x, f.move.z) : f.wantFace;

  if (f.clinch) f.wantFace = angTo(f.pos, (f.clinch.a === f ? f.clinch.b : f.clinch.a).pos);

  if (f.guard && f.action && f.action.kind === 'swing' && f.action.phase === 'windup') f.action.cancel = true;

  if (V.sw !== S.sw) { S.sw = V.sw; S.held = true; if (f.clinch) startAction(f, 'knee'); else if (f.weapon) startAction(f, 'swing', { held: true, arc: 'R2L', target: opp }); }

  const a = f.action;

  if (S.held && !V.sh) {

    S.held = false;

    if (a && a.kind === 'swing' && a.held) { let arc = V.arc || 'auto'; if (arc === 'auto') { f.swingSide *= -1; arc = f.swingSide > 0 ? 'R2L' : 'L2R'; } a.arc = arc; a.held = false; a.wind = swingTimes(f).wind + 0.0001; }

  } else if (S.held && a && a.kind === 'swing' && a.held && V.arc && V.arc !== 'auto') a.arc = V.arc;

  for (const k of ['trip', 'shove', 'grab', 'tackle']) { const c = V.e[k] || 0; if (c !== (S.e[k] || 0)) { S.e[k] = c; vinAct(f, k, opp); } }

}



// ---- local versus: two controllers, or keyboard (player 1) and a controller (player 2), one shared broadcast camera ----

const VS = { on: false, prev: [[], [], [], []], vins: [newVin(), newVin()], humans: [], kind: 'duel' };

function camRel(x, y, cam) { const d = new THREE.Vector3(); (cam || W3.camera).getWorldDirection(d); d.y = 0; d.normalize(); return { x: d.x * y - d.z * x, z: d.z * y + d.x * x }; }

function padVin(gp, V, slot) {

  const b = gp.buttons.map(x => x.pressed || x.value > 0.5), pv = VS.prev[slot], pressed = i => b[i] && !pv[i];

  const dz = (x, y) => { const m = Math.hypot(x, y); return m < 0.18 ? [0, 0] : [x, y]; };

  const [lx, ly] = dz(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = dz(gp.axes[2] || 0, gp.axes[3] || 0);

  const mv = camRel(lx, -ly, vsCam(slot)); V.mx = mv.x; V.mz = mv.z; V.sp = ly < -0.85 ? 1 : 0; const miss = gp.missing || [], noTrig = miss.includes(6) || miss.includes(7);

  V.gd = b[6] || (noTrig && b[4]) ? (rx > 0.45 ? 3 : rx < -0.45 ? 2 : ry < -0.5 ? 4 : (V.gd || 1)) : 0; V.br = b[0] ? 1 : 0;

  const rt = Math.max(gp.buttons[7] ? gp.buttons[7].value : 0, noTrig && b[5] ? 1 : 0);

  if (rt > 0.5 && !V.sh) { V.sw++; V.sh = 1; }

  if (V.sh) V.arc = rx > 0.45 ? 'R2L' : rx < -0.45 ? 'L2R' : ry < -0.5 ? 'O' : V.arc;

  if (rt < 0.25 && V.sh) V.sh = 0;

  if (pressed(1)) V.e.trip++; if (pressed(2)) V.e.shove++; if (noTrig ? pressed(miss.includes(11) ? 15 : 11) : (pressed(4) || pressed(5))) V.e.grab++; if (pressed(3)) V.e.tackle++;

  // Start on any pad pauses through readInput, which listens to every controller in use

  VS.prev[slot] = b;

}

function keyVin(V) {

  const k = IN.keys; let x = 0, y = 0;

  if (k.KeyW) y += 1; if (k.KeyS) y -= 1; if (k.KeyA) x -= 1; if (k.KeyD) x += 1;

  const mv = camRel(x, y, vsCam(0)), l = Math.hypot(mv.x, mv.z) || 1; V.mx = mv.x / Math.max(1, l); V.mz = mv.z / Math.max(1, l);

  V.sp = k.ShiftLeft ? 1 : 0; V.gd = k.KeyK ? (k.KeyA ? 2 : k.KeyD ? 3 : k.KeyW ? 4 : (V.gd || 1)) : 0; V.br = k.Space ? 1 : 0;

  if (k.KeyJ && !V.sh) { V.sw++; V.sh = 1; V.arc = 'auto'; } if (V.sh && k.KeyJ) V.arc = k.KeyA ? 'L2R' : k.KeyD ? 'R2L' : k.KeyW ? 'O' : V.arc;

  if (!k.KeyJ && V.sh) V.sh = 0;

  const once = (code, key) => { if (k[code] && !VS['k' + code]) V.e[key]++; VS['k' + code] = !!k[code]; };

  once('KeyL', 'trip'); once('KeyI', 'shove'); once('KeyU', 'grab'); once('KeyO', 'tackle');

}

function readVersus() {

  if (activeLayer()) { VS.vins.forEach(V => { if (!V.menuNeutral) Object.assign(V, neutralVin(V)); V.menuNeutral = true; }); return; }

  VS.vins.forEach(V => V.menuNeutral = false);

  const pads = seatPads();

  const n = VS.vins.length, useKb = pads.length < n; // not enough controllers: player 1 takes the keyboard

  for (let i = 0; i < n; i++) { const gp = pads[useKb ? i - 1 : i]; if (useKb && i === 0) keyVin(VS.vins[0]); else if (gp) padVin(gp, VS.vins[i], i); }

}

// local play: 2 to 4 people on one screen. kind: 'duel' (1v1), 'coop' (you two against bots), 'tag' (2v2, four players)

const LOCAL_KINDS = {

  duel: { name: 'Versus duel', players: 2, mode: 1, desc: 'One on one, open weapons, profight scoring.' },

  coop2: { name: 'Co-op 2v2', players: 2, mode: 2, desc: 'You two against a pair of bots.' },

  coop3: { name: 'Co-op 3v3', players: 2, mode: 3, desc: 'You two and a bot teammate against three bots.' },

  coop5: { name: 'Co-op 5v5', players: 2, mode: 5, desc: 'You two lead a full squad of bots.' },

  tag: { name: '2v2, four players', players: 4, mode: 2, desc: 'Two teams of two humans. Needs four controllers (or three and the keyboard).' },

};

const LOCAL_EXTRA = [['ffa2', '2P', 'Free-for-all', 'Two of you and four bots, everyone against everyone.'], ['ffa4', '4P', 'Free-for-all, four players', 'Four of you and two bots. Last one standing.'], ['bracket', '4-8', 'Friends\u2019 bracket', 'Type 4 or 8 names, duel it out, crown a champion.']];

function startVersus(kind) {

  kind = LOCAL_KINDS[kind] ? kind : (VS.kind || 'duel'); VS.kind = kind; const K = LOCAL_KINDS[kind];

  AU.init(); G.attract = false; G.tourney = null; REP.log = []; endTraining();

  const qm = {}; for (const k of (G.quickMods || store.get('quickMods', []))) qm[k] = true;

  setupMatch({ mod: qm, mode: K.mode, opp: 'wardens', stage: K.name, venue: G.quickVenue || W3.venue || 'arena', versus: true, pro: K.mode === 1, local: kind });

  VS.on = true; VS.vins = Array.from({ length: K.players }, newVin); VS.prev = [[], [], [], []]; SPLIT.init = [false, false, false, false];

  document.body.classList.toggle('split', SPLIT.on); document.body.classList.toggle('split4', SPLIT.on && K.players > 2); $('#splitLabels').innerHTML = '';

  const t0 = G.fighters.filter(f => f.team === 0), t1 = G.fighters.filter(f => f.team === 1);

  const humans = kind === 'tag' ? [t0[0], t1[0], t0[1], t1[1]] : kind === 'duel' ? [t0[0], t1[0]] : [t0[0], t0[1]];

  G.fighters.forEach(f => { f.isPlayer = false; delete f.combatProfile; }); G.player = null;

  humans.forEach((f, i) => { f.squireRecruited = squireActive(squireTeam(f.club)); f.ai.role = null; f.combatProfile = careerCombatProfile(); f.weapon = profileWeapon(f.spec.weapon, f.combatProfile); f.vin = VS.vins[i]; f.name = VS.names && VS.names[i] || 'Player ' + (i + 1); f.pslot = i; applyPick(f, i); f.weapon = profileWeapon(f.spec.weapon, f.combatProfile); recalcBody(f); });

  VS.humans = humans;

  if (VS.names) { $('#sbA').textContent = VS.names[0].slice(0, 4).toUpperCase(); $('#sbB').textContent = (VS.names[1] || 'P2').slice(0, 4).toUpperCase(); startRound(); beginFight(); return; }

  $('#sbA').textContent = kind === 'duel' ? 'P1' : kind === 'tag' ? 'P1·3' : 'YOU'; $('#sbB').textContent = kind === 'duel' ? 'P2' : kind === 'tag' ? 'P2·4' : CLUBS.wardens.short;

  startRound(); beginFight();

}

function openVersus() {

  const pads = padCount();

  const cards = Object.entries(LOCAL_KINDS).map(([k, K]) => `<button class="mode" data-local="${k}"><span class="big num">${K.players}P</span><b>${K.name}</b><span>${K.desc}</span></button>`).join('') + LOCAL_EXTRA.map(([k, n, t, d]) => `<button class="mode" data-local="${k}"><span class="big num">${n}</span><b>${t}</b><span>${d}</span></button>`).join('');

  msg('local play', 'Couch play', `<p>Plug a laptop into the TV (or cast your phone), connect controllers, pick a mode.</p>

    <div class="modes">${cards}</div>

    <div class="setrow"><span>View</span><div class="seg small" id="splitSeg"><button data-s="1" aria-pressed="${SPLIT.on}">Split screen</button><button data-s="0" aria-pressed="${!SPLIT.on}">Shared camera</button></div></div>

    <div class="ctrlgrid"><b>Controllers</b><span>Left stick moves, RT/ZR swings (right stick picks the arc), LT/ZL guards, bottom button braces, right button trips, left button shoves, top button tackles, a bumper grabs. Xbox, PlayStation and Switch Pro Controllers all work.</span>

    <b>Keyboard</b><span>With one controller short, player 1 plays on the keyboard: WASD move, hold J to swing (A, D or W picks the arc), K guard, Space brace, L trip, I shove, U grab, O tackle, Shift run.</span></div>

    <p class="muted">${pads ? pads + ' controller' + (pads > 1 ? 's' : '') + ' connected.' : 'No controller found yet: press a button on it.'}</p>`,

    [['Back', openModes, true]]);

  $$('#msgPanel [data-local]').forEach(b => b.onclick = () => { AU.click(); const k = b.dataset.local; if (k === 'bracket') return openBracket(); if (k.startsWith('ffa')) { const hu = k === 'ffa4' ? 4 : 2; return openPicks(hu, () => startFFA(6, hu)); } openPicks(LOCAL_KINDS[k].players, () => startVersus(k)); });

  $$('#splitSeg button').forEach(b => b.onclick = () => { SPLIT.on = b.dataset.s === '1'; store.set('split', SPLIT.on); $$('#splitSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); AU.click(); });

}



// ---- online duel: host runs the fight, the guest sends inputs; both share state through room presence ----

const NET = { on: false, role: null, room: null, code: '', vin: newVin(), remote: null, seq: 0, ev: [], lastEv: 0, sendT: 0, snap: null, peer: null };

function netEvent(...e) { if (NET.on && NET.role === 'host') { NET.ev.push([++NET.seq, ...e]); if (NET.ev.length > 10) NET.ev.shift(); } }

// Claude's room when the game runs on claude.ai and this viewer may use it; otherwise peer-to-peer

async function getRoom() { let r = null; try { r = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { r = null; } return r || p2pRoom(); }

function myLoadout() { const L = G.loadout, w = loadoutWeapon(); return { squireRecruited: squireActive(), protocol: NET_PROTOCOL, combatProfile: careerCombatProfile(), creatorProof: creatorProof('combat'), helm: L.helm, weapon: w.key, base: w.base || null, shield: w.hands === 2 ? null : (L.shield === 'none' ? null : L.shield), height: L.height, build: L.build, heightValue: L.heightValue, massValue: L.massValue, gender: L.gender, sh: typeof lookLite === 'function' ? lookLite().sh : null, name: CAREER.name || 'Rival', bf: BOS.info && rosterEligible(BOS.info.fighter) ? BOS.info.fighter : null }; }

function applyLo(f, lo, cat) {

  if (!lo) return; f.squireRecruited = lo.squireRecruited === true; const wk = WEAPONS[lo.weapon] && lo.weapon !== 'custom' ? lo.weapon : (WEAPONS[lo.base] ? lo.base : 'sword'); f.spec = { ...f.spec, helm: lo.helm, weapon: wk, shield: lo.shield }; f.combatProfile = validateCombatProfile(lo.combatProfile); f.weapon = profileWeapon(wk, f.combatProfile); f.shield = lo.shield ? SHIELDS[lo.shield] : null;

  f.body = makeBody(cat, f.spec.arch, 'net' + lo.name, { height: lo.height, build: lo.build, heightValue: lo.heightValue, massValue: lo.massValue, gender: lo.gender }); f.appearance = { sh: lo.sh }; f.name = String(lo.name || 'Rival').slice(0, 20); f.bosReal = rosterEligible(lo.bf) ? { id: lo.bf } : null; f.creatorProof = lo.creatorProof || null; f.creatorVerified = false; resetFighterForRound(f);

}

async function openOnline() { return openOnlineHub(); }

const ST_CODE = ['standing', 'posting', 'falling', 'grounded', 'rising', 'kneeling'], AK = [null, 'swing', 'shove', 'trip', 'grab', 'knee', 'throw', 'disarm', 'tackle'], PH = ['windup', 'strike', 'recover', 'lunge'], ARC = ['R2L', 'L2R', 'O'];

const q = v => Math.round(v * 1000) / 1000;

function packF(f) { const a = f.action; return [q(f.pos.x), q(f.pos.z), q(f.facing), ST_CODE.indexOf(f.state), q(f.lean.x), q(f.lean.z), a ? AK.indexOf(a.kind) : 0, a ? PH.indexOf(a.phase) : 0, a ? ARC.indexOf(a.arc) : 0, a ? q(a.charge || 0) : 0, q(f.gas), q(f.fatigue || 0), q(f.groundPos.x), q(f.groundPos.z), q(f.fallDir.x), q(f.fallDir.z), q(f.fallT), q(f.gt || 0), (f.guard ? 1 : 0) | (f.brace ? 2 : 0) | (f.sprint ? 4 : 0) | (f.touched ? 8 : 0) | (f.weapon ? 16 : 0) | (f.out ? 32 : 0), q(f.vel.x), q(f.vel.z), q(f.bell), f.groundStyle === 'fall' ? 0 : f.groundStyle === 'kneel' ? 1 : 2, q(f.riseT || 0), a ? q(a.t || 0) : 0, f.gdir || null, q(f.aimPitch || 0), a ? a.id || 0 : 0, f.weapon ? f.weapon.key : null, f.shield ? f.shield.key : null]; }

function unpackF(f, s, dt) {

  if (s.length >= 30) { const wk = WEAPONS[s[28]] ? s[28] : null, sk = SHIELDS[s[29]] ? s[29] : null; if ((f.weapon?.key || null) !== wk || (f.shield?.key || null) !== sk) { f.weapon = wk ? profileWeapon(wk, combatProfile(f)) : null; f.shield = sk ? SHIELDS[sk] : null; setWeaponModel(f); setShieldModel(f); recalcBody(f); } }

  f.pos.x = damp(f.pos.x, s[0], 18, dt); f.pos.z = damp(f.pos.z, s[1], 18, dt); if (Math.hypot(f.pos.x - s[0], f.pos.z - s[1]) > 1.5) { f.pos.x = s[0]; f.pos.z = s[1]; }

  if (!f.isPlayer || !isCtl()) f.facing = s[2]; else f.facing = s[2];

  const st = ST_CODE[s[3]] || 'standing'; if (st === 'falling' && f.state !== 'falling') f.rag = null; f.state = st;

  f.lean.x = s[4]; f.lean.z = s[5];

  const kind = AK[s[6]];

  if (kind) { const phase = PH[s[7]] || 'windup'; const changed = !f.action || f.action.kind !== kind || f.action.phase !== phase || f.action.id !== s[27];

    if (changed) f.action = { id: s[27], kind, t: 0, phase };

    f.action.phase = phase; f.action.arc = ARC[s[8]] || 'R2L'; f.action.charge = s[9];

    f.action.t = Number.isFinite(s[24]) ? Math.max(0, s[24]) : changed ? 0 : f.action.t + dt;

  } else f.action = null;

  f.gdir = ['L', 'R', 'H', 'mid'].includes(s[25]) ? s[25] : null;

  f.aimPitch = Number.isFinite(s[26]) ? clamp(s[26], -0.75, 0.55) : 0;

  f.gas = s[10]; f.fatigue = s[11]; f.groundPos.x = s[12]; f.groundPos.z = s[13]; f.fallDir.x = s[14]; f.fallDir.z = s[15]; f.fallT = s[16]; f.gt = s[17];

  f.guard = !!(s[18] & 1); f.brace = !!(s[18] & 2); f.sprint = !!(s[18] & 4); f.touched = !!(s[18] & 8); f.out = !!(s[18] & 32);

  f.vel.x = s[19]; f.vel.z = s[20]; f.bell = s[21]; f.groundStyle = ['fall', 'kneel', 'sit'][s[22]] || 'fall'; f.riseT = s[23];

}

function netPlay(e) {

  const [, k, a, b, c, d] = e;

  if (k === 'h') { const p = new THREE.Vector3(a, b, c); AU.armourHit(1, 0.9); sparks(p, 10, 1); if (d > 1) flipFx('impact', p, 0.9, 0.22, '#fff6d8', true); if (G.player && dist2(G.player.pos, p) < 0.9) { flashHit(); impactFeel('taken', null, 1); } }

  else if (k === 'b') { AU.block('clash', 1, 0.9); sparks(new THREE.Vector3(a, b, c), 6, 0.8); }

  else if (k === 'd') { AU.crash(0.9); AU.cheer(1); dustPuff(a, b); flipFx(CUTE.on ? 'stars' : 'cloud', new THREE.Vector3(a, 0.5, b), 2.4, 1); }

  else if (k === 'c') showCall(a, b);

  else if (k === 't') toast(a, b, c);

}
