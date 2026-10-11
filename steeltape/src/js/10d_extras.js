// ---------- commentary booth, sound captions, attack glints, text size, fullscreen, share text ----------
// Two voices call the fight: the arena announcer on the PA, and the colour man next to him.
const COMM = { q: [], t: 0, busy: 0, last: {}, firstDown: false, lastLine: '' };
const COMM_LINES = {
  start: [['pa', 'Round {r}! Fighters ready… and here we go!'], ['pa', 'Round {r} at the Red Deer Rumble. Let’s hear some noise!'], ['co', 'Watch the polearms early. They decide these openings.']],
  final: [['pa', 'Final round! Everything on this one!'], ['co', 'One round, one trophy. Nobody saves anything now.']],
  first: [['co', 'First body on the floor goes to {team}!'], ['co', 'And {team} draw first blood. Well, first concrete.'], ['pa', 'Down goes one! {team} strike first!']],
  takedown: [['co', 'Oh, textbook. {how} and they’re down.'], ['co', 'You love to see it. Clean {how}.'], ['pa', 'What a takedown from {who}!'], ['co', 'That’s the {how} we’ve been waiting for.']],
  pdown: [['co', 'Ooh, {who} is on the concrete. That’ll sting tomorrow.'], ['co', 'And {who} goes down. Too far forward.'], ['pa', '{who} is grounded!']],
  ratio: [['pa', 'Three to one! That’s the round!'], ['co', 'Outnumbered three to one, the marshals stop it.']],
  card: [['co', 'The marshal’s not having any of that. {card} for {who}.'], ['co', '{card}. Control is a skill, folks.']],
  red: [['pa', 'Red card! {who} is out of the list!'], ['co', 'Red card. That team fights short now, and it might cost them the match.']],
  armour: [['co', 'Strap’s gone! That’s why you bring the hockey tape.'], ['co', 'Armour failure, and that’s a ground. Brutal luck.']],
  matchpoint: [['pa', 'Match point for {team}!'], ['co', 'One more round and {team} take it.']],
  comeback: [['co', 'What a comeback from {team}!'], ['pa', 'They were down, and now they’re level!']],
  lead: [['co', '{who} takes the lead, {score}.'], ['pa', 'Lead change! {score}.']],
  head: [['co', 'Right on the helmet. Three points.'], ['co', 'Head shot! The visor rang like a bell.']],
  tired: [['co', 'Look at those shoulders heave. Somebody’s cooked.'], ['co', 'The legs are going. This is where fitness wins fights.']],
  perfect: [['co', 'Perfect block! Timed it to the hair.'], ['co', 'Read that one like a book. Perfect parry.']],
  repair: [['co', 'Lovely tape job. Very Alberta.'], ['co', 'Neat wraps. That strap will hold.']],
  rival: [['pa', 'Grudge match! {who} has been waiting for this one.'], ['co', '{who} and our fighter do not like each other. At all.'], ['co', 'Last time it was {last}. {who} has been practising.']],
  win: [['pa', '{team} win the match!'], ['co', 'Well earned. {team} were the better side today.']],
  // youth day
  cstart: [['pa', 'Little knights, ready? Gooo!'], ['co', 'Look at those helmets. Adorable and terrifying.']],
  cdown: [['co', 'Boop! Down they go!'], ['co', 'Whoopsie! Straight onto the bum.'], ['pa', 'What a bonk!']],
  ccard: [['co', 'Uh oh, the moose marshal says gentle hands please.']],
  cwin: [['pa', 'Everybody gets a juice box! {team} win!']],
};
function comm(type, d = {}, pri = 1) {
  if (!G.settings.comm || G.attract || G.autopilot || !G.match || G.match.training) return;
  if (CUTE.on) { const ct = { start: 'cstart', final: 'cstart', first: 'cdown', takedown: 'cdown', pdown: 'cdown', card: 'ccard', red: 'ccard', win: 'cwin' }[type]; if (ct) type = ct; }
  const lines = COMM_LINES[type]; if (!lines) return;
  if (G.realTime - (COMM.last[type] || -99) < (pri >= 3 ? 2 : 12)) return; // don't repeat the same kind of call
  let pickL = lines[(Math.random() * lines.length) | 0]; if (lines.length > 1 && pickL[1] === COMM.lastLine) pickL = lines[(lines.indexOf(pickL) + 1) % lines.length];
  const txt = pickL[1].replace(/\{(\w+)\}/g, (_, k) => d[k] != null ? d[k] : '');
  COMM.last[type] = G.realTime;
  if (pri < 3 && COMM.q.length >= 2) return;
  COMM.q.push({ who: pickL[0], txt, pri, raw: pickL[1] }); COMM.q.sort((a, b) => b.pri - a.pri);
}
function updateComm(dt) {
  const el = $('#comm'); if (!el) return;
  COMM.busy -= dt;
  if (COMM.busy <= 0) {
    if (COMM.q.length && !CAM.cine) {
      const c = COMM.q.shift(); COMM.lastLine = c.raw;
      el.innerHTML = ''; el.append(h('b', null, c.who === 'pa' ? 'ANNOUNCER' : 'COLOUR'), h('span', null, c.txt));
      el.className = 'on ' + c.who; COMM.busy = 2.6 + c.txt.length * 0.03;
      if (G.settings.spokenComm) speakComm(c); else if (G.settings.voice && c.pri >= 2) VOICE.say(c.txt, 1);
    } else el.className = '';
  }
}

// sound captions: words and arrows for sounds you might miss (helmets muffle a lot)
const CAP = { t: 0, last: {} };
function caption(key, text, side) {
  if (!G.settings.cap || G.attract) return;
  if (G.realTime - (CAP.last[key] || -99) < 3) return; CAP.last[key] = G.realTime;
  const el = $('#capline'); el.textContent = (side === 'l' ? '◀ ' : '') + '[' + text + ']' + (side === 'r' ? ' ▶' : ''); el.hidden = false; CAP.t = 2.2;
}
function updateCaptions(dt) {
  CAP.t -= dt; if (CAP.t <= 0) $('#capline').hidden = true;
  const p = G.player; if (!G.settings.cap || !p || !isUp(p) || G.phase !== 'fight') return;
  for (const o of G.fighters) { // footsteps behind you
    if (o.team === p.team || !isUp(o) || vlen(o.vel) < 2.2) continue;
    const d = dist2(o.pos, p.pos); if (d > 4.5) continue;
    const rel = angDiff(FP.yaw, angTo(p.pos, o.pos)); if (Math.abs(rel) < 1.6) continue;
    caption('steps', o.sprint ? 'someone charging at you' : 'footsteps behind you', rel > 0 ? 'l' : 'r'); break;
  }
}

// a glint on the weapon of anyone winding up a swing at you
const TELE = { sprites: [] };
function updateTelegraphs(t) {
  const mode = G.settings.tele || 'subtle', p = G.player;
  if (!TELE.sprites.length) for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.spark, color: '#fff3b0', blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true })); s.visible = false; s.renderOrder = 6; (W3.matchRoot || W3.scene).add(s); TELE.sprites.push(s); }
  let n = 0;
  if (mode !== 'off' && p && isUp(p) && G.phase === 'fight' && !G.autopilot && !CAM.cine) {
    for (const o of G.fighters) {
      if (n >= TELE.sprites.length) break;
      const a = o.action; if (o.team === p.team || !isUp(o) || !a || a.kind !== 'swing' || a.phase !== 'windup' || o.ai.target !== p) continue;
      if (dist2(o.pos, p.pos) > reachOf(o) + 1.2 || !o.model || !o.model.weapon) continue;
      const s = TELE.sprites[n++]; const wp = new THREE.Vector3(0, (o.weapon && o.weapon.len || 0.9) * 0.85, 0); o.model.weapon.localToWorld(wp);
      s.position.copy(wp); const k = clamp(a.t / Math.max(0.05, swingTimes(o).wind), 0, 1);
      s.scale.setScalar((mode === 'strong' ? 0.55 : 0.32) * (0.6 + 0.6 * k) * (1 + 0.15 * Math.sin(t * 40)));
      s.material.color.set(a.arc === 'O' ? '#ff6a5a' : '#fff3b0'); s.visible = true;
    }
  }
  for (let i = n; i < TELE.sprites.length; i++) TELE.sprites[i].visible = false;
}

function applyTextSize() { document.documentElement.style.setProperty('--ts', String(+G.settings.ts || 1)); document.documentElement.style.fontSize = (16 * (+G.settings.ts || 1)) + 'px'; }
// fullscreen first, then the landscape lock (lock only works once fullscreen is on); iPhones support neither
const FS = { tried: false };
async function goFullscreen(manual) {
  if (!manual && FS.tried) return; FS.tried = true;
  const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (e) { if (manual) toastMenu('Fullscreen isn’t allowed here. Use your browser’s menu, or add the page to your home screen.'); return; }
  try { if (screen.orientation && screen.orientation.lock && IN.mode === 'touch') await screen.orientation.lock('landscape'); } catch (e) { }
}
function watchContext() { // if the phone drops the GPU (backgrounded, low memory), say so instead of freezing
  const c = W3.renderer && W3.renderer.domElement; if (!c) return;
  c.addEventListener('webglcontextlost', e => { e.preventDefault(); G.ctxLost = true; if (G.phase === 'fight' && !G.paused) togglePause(true); toastMenu('Graphics paused by the phone. Hang on…'); }, false);
  c.addEventListener('webglcontextrestored', () => { G.ctxLost = false; toastMenu('Back!'); }, false);
}

document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-share]'); if (b) { AU.click(); copyShare(G.shareKind || 'match', G.shareExtra || {}); } });
// spoiler-free share text: one square per scoring hit or round
function shareText(kind, extra = {}) {
  const m = G.match; if (!m) return '';
  const head = kind === 'daily' ? `BUHURT Daily #${extra.day} ${extra.mod || ''}` : kind === 'run' ? `BUHURT Gauntlet ${extra.code}` : `BUHURT: Steel & Tape`;
  const lines = [head.trim(), `${m.wins[0] > m.wins[1] ? '🏆' : m.wins[0] === m.wins[1] ? '🤝' : '🛡️'} ${m.wins[0]}–${m.wins[1]} vs ${CLUBS[m.opp] ? CLUBS[m.opp].short : ''}${m.category === 'youth' ? ' 🧸' : ''}`];
  const rnd = m.results.map((r, i) => `R${r.round}${r.winner === 0 ? '🟩' : r.winner === 1 ? '🟥' : '⬜'}`).join(' ');
  lines.push(rnd);
  const hits = (MT.zones || []).slice(0, 14).map(z => ({ helmet: '🟩', torso: '🟨', armL: '🟦', armR: '🟦', legs: '🟦', down: '💥' })[z] || '⬛').join('');
  if (hits) lines.push(hits);
  const tape = G.tourney ? '' : `🩹 tape ${MT.tape || 0} · 🟨 cards ${m.cards.filter(c => c.team === 0 && c.card !== 'warning').length}`;
  lines.push(tape); if (extra.streak) lines.push(`🔥 streak ${extra.streak}`);
  return lines.filter(Boolean).join('\n');
}
async function copyShare(kind, extra) {
  const txt = shareText(kind, extra);
  try { if (navigator.share && IN.mode === 'touch') { await navigator.share({ text: txt }); return; } } catch (e) { }
  try { await navigator.clipboard.writeText(txt); toastMenu('Result copied. Paste it anywhere.'); }
  catch (e) { const ta = h('textarea', null, txt); ta.style.cssText = 'position:fixed;left:-999px'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); toastMenu('Result copied.'); } catch (e2) { toastMenu('Could not copy here.'); } ta.remove(); }
}

// ---- hype: the crowd and a war drum build with the moment (close score, match point, last fighters standing) ----
const HYPE = { v: 0, next: 0, beat: 0 };
function hype(add) { HYPE.v = Math.min(1, HYPE.v + add); }
function updateHype(dt) {
  if (!AU.ctx || AU.muted || G.phase !== 'fight' || G.attract || G.paused || !G.match || G.match.training) { HYPE.v *= 0.995; HYPE.next = 0; return; }
  const m = G.match; let base = 0.12;
  if (m.round >= 3 || m.champion || m.wins[0] === 1 || m.wins[1] === 1) base += 0.22;
  if (m.duel) { if (Math.abs(m.pts[0] - m.pts[1]) <= 2 && m.pts[0] + m.pts[1] >= 4) base += 0.22; if (m.clock < 15) base += 0.15; }
  else { const a = standing(0), b = standing(1); if (a + b <= 5 && Math.abs(a - b) <= 1) base += 0.25; if (a === 1 || b === 1) base += 0.15; }
  HYPE.v = Math.max(base, HYPE.v - dt * 0.035);
  const t = AU.ctx.currentTime, spb = 60 / (84 + 52 * HYPE.v);
  if (HYPE.next < t) HYPE.next = t + 0.05;
  while (HYPE.next < t + 0.2) {
    const b = HYPE.beat++ % 8, when = HYPE.next - t, v = 0.1 + 0.32 * HYPE.v, h = HYPE.v;
    if (h > 0.25) { if (b % 4 === 0) AU.play('drum0', v, CUTE.on ? 1.3 : 1, when); if (b % 4 === 2 && h > 0.42) AU.play('drum1', v * 0.8, CUTE.on ? 1.3 : 1, when); if (h > 0.65 && (b === 3 || b === 7)) AU.play('drum0', v * 0.55, 1.15, when); }
    if (h > 0.58 && (b === 2 || b === 6)) { AU.any('clap', 0.3 * h, rand(0.95, 1.05), when); AU.any('clap', 0.22 * h, rand(0.9, 1.1), when + 0.012); } // the crowd claps along
    HYPE.next += spb / 2;
  }
}

// ---- hit map: where your blows landed this match, on a little figure ----
function hitMapHtml() {
  const z = MT.zones || []; if (!z.length) return '';
  const c = { helmet: 0, torso: 0, arm: 0, legs: 0, down: 0 }; for (const k of z) { if (k === 'armL' || k === 'armR') c.arm++; else if (c[k] != null) c[k]++; }
  const max = Math.max(1, c.helmet, c.torso, c.arm, c.legs), fill = n => `rgba(255,61,139,${0.12 + 0.88 * n / max})`;
  return `<div class="hitmap"><svg viewBox="0 0 120 170" aria-label="Where your hits landed">
    <circle cx="60" cy="22" r="16" fill="${fill(c.helmet)}" stroke="#ece8de" stroke-width="1.5"/>
    <rect x="38" y="42" width="44" height="58" rx="8" fill="${fill(c.torso)}" stroke="#ece8de" stroke-width="1.5"/>
    <rect x="18" y="44" width="16" height="54" rx="7" fill="${fill(c.arm)}" stroke="#ece8de" stroke-width="1.5"/><rect x="86" y="44" width="16" height="54" rx="7" fill="${fill(c.arm)}" stroke="#ece8de" stroke-width="1.5"/>
    <rect x="40" y="104" width="17" height="60" rx="7" fill="${fill(c.legs)}" stroke="#ece8de" stroke-width="1.5"/><rect x="63" y="104" width="17" height="60" rx="7" fill="${fill(c.legs)}" stroke="#ece8de" stroke-width="1.5"/>
    <g font-family="Big Shoulders Display, sans-serif" font-weight="900" font-size="14" fill="#fff" text-anchor="middle"><text x="60" y="27">${c.helmet}</text><text x="60" y="76">${c.torso}</text><text x="26" y="76">${c.arm}</text><text x="60" y="140">${c.legs}</text></g></svg>
    <div><b>Where you hit</b><span>Head ${c.helmet} · Body ${c.torso} · Arms ${c.arm} · Legs ${c.legs}</span><span>Takedowns ${c.down}</span><span class="muted">${c.helmet >= c.torso ? 'Hunting the helmet. Big points in duels.' : 'Working the body. Look up for head shots.'}</span></div></div>`;
}

// two voices from the speech engine: a booming PA announcer and a drier colour man
function speakComm(c) {
  if (!window.speechSynthesis || AU.muted) return;
  try {
    VOICE.speak(c.txt, c.who === 'pa' ? 'pa' : 'co', c.pri);
  } catch (e) { }
}
// ---- broadcast touches: fighter cards before round one, a live stats strip ----
function showIntro() {
  const m = G.match; if (!m || m.training || G.attract || m.round !== 1) return;
  const el = $('#intro'); if (!el) return;
  const side = t => G.fighters.filter(f => (m.ffa ? true : f.team === t) && !f.out).slice(0, m.ffa ? 8 : 5);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const card = f => `<div class="icard"><b>${esc(f.isPlayer ? (CAREER.name === 'You' ? 'You' : CAREER.name) : f.name)}</b><span>${f.weapon ? f.weapon.name : ''} · ${f.body.h.toFixed(2)} m</span></div>`;
  el.innerHTML = m.ffa ? `<div class="iside">${side(0).map(card).join('')}</div>` : `<div class="iside a"><h4>${esc(m.versus && VS.names ? VS.names[0] : CLUBS.reavers.name)}</h4>${side(0).map(card).join('')}</div><div class="ivs">VS</div><div class="iside b"><h4>${esc(m.versus && VS.names ? VS.names[1] || '' : CLUBS[m.opp] ? CLUBS[m.opp].name : '')}</h4>${side(1).map(card).join('')}</div>`;
  el.hidden = false; el.classList.remove('out'); clearTimeout(showIntro.t); showIntro.t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.hidden = true, 400); }, 2300);
}
function updateStatsStrip() {
  const el = $('#statstrip'), m = G.match; if (!el) return;
  const on = m && !m.training && !m.duel && !m.ffa && G.phase === 'fight' && !CAM.cine && G.settings.stats !== false;
  el.hidden = !on; if (!on) return;
  const h2 = m.hitsT || [0, 0], d = m.takedowns || [0, 0]; const txt = `Hits ${h2[0]}–${h2[1]} · Downs ${d[0]}–${d[1]}`; if (el.textContent !== txt) el.textContent = txt;
}
