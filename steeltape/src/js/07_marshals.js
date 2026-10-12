// ---------- officials: calls, fouls, cards (REG 2, 5, 6) ----------
G.timers = [];
function after(sec, fn) { G.timers.push({ at: G.simTime + sec, fn }); }
function runTimers() { const now = G.simTime; const due = G.timers.filter(t => t.at <= now); G.timers = G.timers.filter(t => t.at > now); due.forEach(t => t.fn()); }

function buildMarshals() {
  G.marshals.forEach(m => W3.matchRoot.remove(m.model.root));
  G.marshals = [];
  const { W, L } = LIST;
  const add = (role, x, z) => { const model = buildMarshalModel(role); const m = { role, pos: { x, z }, home: { x, z }, facing: 0, flagUp: 0, model, walk: 0 }; model.root.position.set(x, 0, z); W3.matchRoot.add(model.root); G.marshals.push(m); return m; };
  add('knight', -W / 2 + 1.3, 0);
  add('field', W / 2 - 1.6, -5); add('field', -W / 2 + 1.8, 6);
  for (const [x, z] of [[W / 2 + 1.0, -8], [W / 2 + 1.0, 8], [-W / 2 - 1.0, -8], [-W / 2 - 1.0, 8], [0, L / 2 + 1.0], [0, -L / 2 - 1.0]]) add('line', x, z);
}

function updateMarshals(dt) {
  const ups = G.fighters.filter(isUp);
  let cx = 0, cz = 0; ups.forEach(f => { cx += f.pos.x; cz += f.pos.z; }); if (ups.length) { cx /= ups.length; cz /= ups.length; }
  for (const m of G.marshals) {
    m.flagUp = Math.max(0, m.flagUp - dt * 0.6);
    let tx = m.home.x, tz = m.home.z;
    if (m.role === 'field' && ups.length) {
      // shadow the nearest knot of fighters from about 3.5 m away
      let best = null, bd = 1e9; for (const f of ups) { const d = dist2(f.pos, m.pos); if (d < bd) { bd = d; best = f; } }
      const off = vnorm({ x: m.home.x - best.pos.x, z: (m.home.z - best.pos.z) || 0.1 });
      tx = clamp(best.pos.x + off.x * 3.6, -LIST.W / 2 + 0.8, LIST.W / 2 - 0.8); tz = clamp(best.pos.z + off.z * 3.6, -LIST.L / 2 + 0.8, LIST.L / 2 - 0.8);
      if (m.breakTarget) { tx = m.breakTarget.x; tz = m.breakTarget.z; }
    } else if (m.role === 'knight') { tz = clamp(cz, -8, 8); }
    let mx = tx - m.pos.x, mz = tz - m.pos.z; const md = Math.hypot(mx, mz);
    for (const f of G.fighters) { if (f.out) continue; const p = isDown(f) ? f.groundPos : f.pos; const ax = m.pos.x - p.x, az = m.pos.z - p.z; const ad = Math.hypot(ax, az); if (ad < 1.4 && ad > 0.01) { mx += ax / ad * 2.5; mz += az / ad * 2.5; } }
    const ml = Math.hypot(mx, mz); const spd = m.role === 'line' ? 0 : (md > 0.3 ? 2.6 : 0);
    if (ml > 0.01 && spd > 0) { m.pos.x += mx / ml * spd * dt; m.pos.z += mz / ml * spd * dt; m.walk += dt * 7; }
    if (m.role !== 'line') { m.pos.x = clamp(m.pos.x, -LIST.W / 2 + 0.5, LIST.W / 2 - 0.5); m.pos.z = clamp(m.pos.z, -LIST.L / 2 + 0.5, LIST.L / 2 - 0.5); }
    const look = Math.atan2(cx - m.pos.x, cz - m.pos.z); m.facing += angDiff(m.facing, look) * Math.min(1, dt * 4);
    const J = m.model; J.root.position.set(m.pos.x, 0, m.pos.z); J.root.rotation.y = m.facing;
    if (J.ual) { animateUAL(J, spd > 0 && md > 0.3, md, m.flagUp, dt); continue; }
    const sw = spd > 0 && md > 0.3 ? Math.sin(m.walk) * 0.5 : 0; J.legL.rotation.x = sw; J.legR.rotation.x = -sw;
    J.shR.rotation.x = lerp(-0.3, -2.9, ease(m.flagUp)); J.shR.rotation.z = lerp(0, -0.3, m.flagUp);
  }
}
function raiseFlags(role) { G.marshals.forEach(m => { if (!role || m.role === role) m.flagUp = 1.3; }); }

function marshalCall(big, small, priority = 1, speak = true) {
  showCall(big, small); netEvent('c', big, small || '');
  if (speak && G.settings.voice && !G.attract) VOICE.say(big.replace(/[!.]/g, '') + (small && priority >= 2 && priority < 4 ? '. ' + small.replace(/\(.*?\)/g, '') : ''), priority);
}

// can any official see this? (REG 5: a foul in plain view is always called)
function foulVisibility(pos, off, vic) {
  let best = 0;
  for (const m of G.marshals) {
    const d = dist2(m.pos, pos); if (d > (m.role === 'line' ? 14 : 17)) continue;
    let block = 0;
    for (const o of G.fighters) {
      if (o === off || o === vic || !isUp(o)) continue;
      const ex = pos.x - m.pos.x, ez = pos.z - m.pos.z; const el = ex * ex + ez * ez || 1;
      const t = clamp(((o.pos.x - m.pos.x) * ex + (o.pos.z - m.pos.z) * ez) / el, 0, 1);
      const px = m.pos.x + ex * t - o.pos.x, pz = m.pos.z + ez * t - o.pos.z;
      if (Math.hypot(px, pz) < o.radius + 0.05 && t > 0.05 && t < 0.95) block++;
    }
    best = Math.max(best, (block === 0 ? 1 : block === 1 ? 0.45 : 0.08) * (d < 9 ? 1 : 0.8));
  }
  return best;
}

const FOULS = {
  grounded: { text: 'strike on a grounded fighter', cite: 'BR 4.12' },
  skull: { text: 'strike to the base of the skull', cite: 'BR 6' },
  knee: { text: 'strike to the back of the knee', cite: 'BR 6' },
  earlyRise: { text: 'got up before "All rise"', cite: 'REG 6.2.1' },
};
function reportFoul(off, vic, kind) {
  if (G.match && G.match.training) return; // no fouls in the yard
  if (G.match && G.match.duel && vic && G.phase === 'fight') duelScore(vic, DUEL_PTS.foul, 'Foul by the other fighter');
  G.stats.fouls++;
  const pos = vic ? (isDown(vic) ? vic.groundPos : vic.pos) : off.pos;
  const repeat = off.lastFoulT && G.simTime - off.lastFoulT < 25;
  off.lastFoulT = G.simTime;
  const seen = kind === 'earlyRise' ? 1 : foulVisibility(pos, off, vic);
  if (!chance(repeat ? Math.min(1, seen * 1.5) : seen)) {
    if (off.isPlayer) feed('That one went unseen behind the pile-up. Control is a skill.', 'BR 4', 'var(--dim)');
    return;
  }
  if (vic && isUp(vic)) vic.foulVictimT = G.simTime;
  raiseFlags(off.isPlayer ? null : 'field');
  penalize(off, FOULS[kind].text, FOULS[kind].cite, kind === 'earlyRise');
}

function penalize(f, text, cite, straightYellow) {
  const r = f.rec; const tk = f.club.key + '-' + f.num;
  const green = G.tourney && G.tourney.green[tk];
  let card;
  if (r.warnings === 0 && !straightYellow && perk(f, 'show.marshal') && G.match && !G.match.forgiven) { G.match.forgiven = true; feed('The marshal lets your first warning go with a look.', '', 'var(--marshal)'); return; }
  if (r.warnings === 0 && !straightYellow && !(G.match && G.match.warnedFor === tk)) { r.warnings++; card = 'warning'; }
  else { r.yellows++; card = (r.yellows >= 2 || green) ? 'red' : 'yellow'; }
  G.stats.cards += card === 'warning' ? 0 : 1;
  if (G.match) G.match.cards.push({ who: label(f), team: f.team, card, text, cite, round: G.match.round });
  const head = { warning: 'Warning', yellow: 'Yellow card', red: 'Red card' }[card];
  marshalCall(head, `${label(f)}: ${text}`, card === 'red' ? 3 : 2);
  if (card !== 'warning') comm(card === 'red' ? 'red' : 'card', { card: head, who: label(f) }, card === 'red' ? 3 : 2);
  feed(`${cardIcon(card)}${head} for ${label(f)}: ${text}${card === 'red' && green ? ' (green card from the kit check turns the yellow red)' : ''}.`, card === 'red' && green ? 'REG 6.4' : cite, card === 'red' ? 'var(--card-red)' : 'var(--marshal)');
  if (card === 'red') {
    r.red = true; f.redMatches = 2;
    if (isUp(f)) marshalGround(f, 'red card, out of the list', 'REG 6.3.3');
    if (G.match && G.match.duel && G.phase === 'fight') {
      // In a duel a red card is an immediate disqualification, not a
      // suspension that carries into the next round.  Award the match to the
      // other fighter and stop the current round so the red-carded fighter
      // cannot recover and win on points.
      G.match.duelDQ = f.team;
      G.match.wins[1 - f.team] = 2;
      f.out = true;
      f.returnAt = -1;
      after(0.35, () => { if (G.phase === 'fight') endRound('duel'); });
    }
    if (f.isPlayer) after(0.3, () => setStatus('Red card. You sit out the rest of this match and the next (REG 6.3.3).', 'var(--card-red)', 5));
  }
}
function cardIcon(card) {
  if (card === 'warning') return '';
  const c = { yellow: 'var(--marshal)', red: 'var(--card-red)', green: 'var(--card-green)' }[card];
  return `<span class="card" style="background:${c}"></span>`;
}

function fieldBreak(c) {
  const { a, b } = c; breakClinch(a);
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const d = Math.hypot(dx, dz) || 1;
  const fm = G.marshals.filter(m => m.role === 'field').sort((m1, m2) => dist2(m1.pos, a.pos) - dist2(m2.pos, a.pos))[0];
  if (fm) { fm.flagUp = 1.6; fm.breakTarget = { x: (a.pos.x + b.pos.x) / 2 + dz / d * 0.8, z: (a.pos.z + b.pos.z) / 2 - dx / d * 0.8 }; after(1.6, () => { fm.breakTarget = null; }); }
  marshalCall('Break!', 'Passive clinch. Two steps apart.', 2);
  feed(`Field Marshal breaks the clinch between ${label(a)} and ${label(b)}.`, 'BR 4.10', 'var(--marshal)');
  for (const [f, s] of [[a, -1], [b, 1]]) { f.pos.x += dx / d * 0.55 * s; f.pos.z += dz / d * 0.55 * s; f.cd = 0.9; f.vel = { x: 0, z: 0 }; f.ai.next = 0.9; }
  after(1.0, () => { if (G.phase === 'fight') marshalCall('Fight.', '', 1); });
}
