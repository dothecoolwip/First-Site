// ---------- online fights for 1 to 20 people: a lobby first (teams, bots, kit), then the host runs the fight ----------
// Everyone in a lobby room sets a presence: role (host/guest), uid, name, lo (kit), team, ready. The host's presence also
// carries the lobby settings (L). When the host starts, its presence carries the match spec (S) for a few seconds; every
// page builds the identical match from S, then guests send inputs (vin) and the host sends snapshots (s) of everyone.
const ONL = { me: Math.random().toString(36).slice(2, 10), L: null, peers: [], inMatch: false, ready: false, team: 0, vins: {}, remote: {}, go: 0, S: null, lastGo: 0, renderT: 0, hostSeen: false, roleSeq: 0, roleSeqSeen: {} };
const MAX_HUMANS = 20;
const ONL_WEAPONS = [['sword', 'heater', 'Sword & shield'], ['sword', 'buckler', 'Sword & buckler'], ['longsword', null, 'Longsword'], ['polearm', null, 'Polearm'], ['axe', 'heater', 'Axe & shield'], ['mace', 'heater', 'Mace & shield'], ['longaxe', null, 'Long axe']];
const ONL_HELMS = ['greathelm', 'pigface', 'sallet', 'barbute', 'kettle'];
function onlineKit() { return Object.assign({ w: 0, helm: G.loadout.helm || 'pigface' }, store.get('onlineKit', {})); }
function myLo() { const lo = myLoadout(), k = onlineKit(), W = ONL_WEAPONS[k.w] || ONL_WEAPONS[0]; return { ...lo, weapon: W[0], shield: W[1], helm: HELMS[k.helm] ? k.helm : 'pigface', base: null, name: myName() }; }
function lobbyL() { return Object.assign({ n: 3, bots: [null, null], roles: [[], []], venue: G.quickVenue || W3.venue || 'arena', cat: G.category, open: false }, ONL.L || {}); }
function hostPeer() { return ONL.peers.find(p => p.presence && p.presence.role === 'host'); }
// the people in the lobby, host first, then in the order they joined
function lobbyHumans() {
  const out = []; const seen = new Set();
  for (const p of ONL.peers) {
    const P = p.presence || {}; if (!P.uid || (P.role !== 'host' && P.role !== 'guest') || seen.has(P.uid)) continue; seen.add(P.uid);
    out.push({ uid: P.uid, account: P.account || null, bos: !!P.bos, name: String(P.name || 'A fighter').slice(0, 20), team: P.team === 1 ? 1 : 0, lo: P.lo, level: clamp(Math.floor(Number(P.level) || 1), 1, 100), ready: !!P.ready, host: P.role === 'host', me: P.uid === ONL.me, peer: p.peer });
  }
  return out.sort((a, b) => (b.host ? 1 : 0) - (a.host ? 1 : 0)).slice(0, MAX_HUMANS);
}
function teamCounts(L, hum) {
  const h = [0, 1].map(t => hum.filter(x => x.team === t).length), n = Math.max(L.n, h[0], h[1], 1);
  const bots = [0, 1].map(t => { const free = n - h[t]; const b = L.bots[t]; return b == null ? free : clamp(b, 0, free); });
  return { h, n, bots, total: [h[0] + bots[0], h[1] + bots[1]] };
}
function myPresence(extra) { return Object.assign({ protocol: NET_PROTOCOL, role: NET.role, uid: ONL.me, account: BOS.user && BOS.user.id || null, name: myName(), bos: !!BOS.info, lo: myLo(), level: clamp(CAREER.level || 1, 1, 100), team: ONL.team, ready: NET.role === 'host' ? true : ONL.ready }, extra || {}); }
function newCode() { return Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[(Math.random() * 24) | 0]).join(''); }

// ---- host: open a lobby (open = anyone tapping Find a match may join)
async function hostLobby(open) {
  const lob = await initLobby(); if (!lob) { toastMenu('Could not reach the online service.'); return false; }
  if (NET.room && NET.role === 'host' && !ONL.inMatch) { if (open) setLobbyOpen(true); renderLobby(); return true; }
  if (NET.room) netLeave();
  const code = newCode();
  let r; try { r = await lob.join('lobby-' + code.toLowerCase()); } catch (e) { toastMenu('Could not reach the online service. Check the internet connection and try again.'); return false; }
  Object.assign(NET, { room: r, role: 'host', code, on: false, seq: 0, ev: [], lastEv: 0 });
  ONL.L = Object.assign(lobbyL(), store.get('onlineL', {}), { open: !!open }); ONL.team = 0; ONL.inMatch = false; ONL.vins = {}; ONL.remote = {}; ONL.go = 0; ONL.S = null; ONL.roleSeqSeen = {};
  r.presence(myPresence({ L: ONL.L, go: 0 }));
  NET.unsub = r.onPeers(ch => { ONL.peers = ch.peers; hostPeers(ch); });
  setLobbyOpen(!!open);
  renderLobby(); return true;
}
function setLobbyOpen(open) { ONL.L = Object.assign(lobbyL(), { open }); hostSync(); lobbySet({ look: open ? NET.code : null, st: lobbyStatus() }); }
function hostSync() { if (NET.role === 'host' && NET.room && !ONL.inMatch) { store.set('onlineL', { n: ONL.L.n, bots: ONL.L.bots, roles: ONL.L.roles, venue: ONL.L.venue }); try { NET.room.presence(myPresence({ L: ONL.L, go: 0, S: null, s: null })); } catch (e) { } } }
function onlineCaptain(team) { return lobbyHumans().find(h => h.team === team) || null; }
function onlineBotRole(team, slot, role) {
  if (ONL.inMatch || !NET.room || !['auto', 'tank', 'rook', 'runner'].includes(role)) return;
  const captain = onlineCaptain(team);
  const L = NET.role === 'host' ? lobbyL() : Object.assign(lobbyL(), (hostPeer() || { presence: {} }).presence.L || {});
  if (!captain || captain.uid !== ONL.me || slot < 0 || slot >= teamCounts(L, lobbyHumans()).bots[team]) return;
  if (NET.role !== 'host') { NET.room.presence(myPresence({ roleEdit: { team, slot, role, seq: ++ONL.roleSeq } })); return; }
  const roles = (ONL.L.roles || [[], []]).map(row => Array.isArray(row) ? row.slice() : []);
  roles[team][slot] = role === 'auto' ? null : role; ONL.L.roles = roles; hostSync(); lobbyRefresh();
}
function hostPeers(ch) {
  for (const p of ch.peers) { const P = p.presence || {};
    if (P.role === 'guest' && P.uid && P.vin && P.protocol === NET_PROTOCOL) {
      if (ONL.inMatch && !G.fighters.some(f => f.netUid === P.uid && f.netPeer === p.peer)) continue;
      const old = ONL.remote[P.uid];
      if (Number.isSafeInteger(P.vin.seq) && P.vin.seq > (old?.seq || 0)) {
        const value = validatedVin(P.vin, old?.value);
        if (value) ONL.remote[P.uid] = { value, seq: P.vin.seq, pause: !!P.pauseRequested, at: performance.now() };
      }
    } }
  if (!ONL.inMatch) for (const p of ch.peers) {
    const P = p.presence || {}, R = P.roleEdit;
    if (!P.uid || !R || !Number.isInteger(R.seq) || R.seq <= (ONL.roleSeqSeen[P.uid] || 0)) continue;
    ONL.roleSeqSeen[P.uid] = R.seq;
    const captain = onlineCaptain(R.team), C = teamCounts(lobbyL(), lobbyHumans());
    if (!captain || captain.uid !== P.uid || P.team !== R.team || !Number.isInteger(R.slot) || R.slot < 0 || R.slot >= C.bots[R.team] || !['auto', 'tank', 'rook', 'runner'].includes(R.role)) continue;
    const roles = (ONL.L.roles || [[], []]).map(row => Array.isArray(row) ? row.slice() : []);
    roles[R.team][R.slot] = R.role === 'auto' ? null : R.role; ONL.L.roles = roles; hostSync();
  }
  for (const p of ch.left || []) { // someone left: in a fight, a bot takes over their fighter
    const f = ONL.inMatch && G.fighters.find(x => x.netPeer === p.peer); if (f) { f.vin = null; f.netUid = null; toast(`${f.name} left: a bot takes over`, 'bad'); }
  }
  if (!ONL.inMatch) lobbyRefresh();
}
// ---- guest: join a lobby by code
async function joinLobby(code) {
  code = String(code || '').toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) return;
  const lob = await initLobby(); if (!lob) { toastMenu('Could not reach the online service.'); return; }
  if (NET.room) netLeave(); stopSearch();
  msg('lobby', `Joining ${code}…`, '<p>Finding the lobby…</p>', [['Cancel', () => { netLeave(); openOnlineHub(); }]]);
  let r; try { r = await lob.join('lobby-' + code.toLowerCase()); } catch (e) { toastMenu('Could not reach that lobby. Check the code.'); openOnlineHub(); return; }
  Object.assign(NET, { room: r, role: 'guest', code, on: false, lastEv: 0, vin: newVin(), snap: null });
  ONL.inMatch = false; ONL.ready = false; ONL.team = 1; ONL.lastGo = 0; ONL.hostSeen = false;
  r.presence(myPresence());
  NET.unsub = r.onPeers(ch => { ONL.peers = ch.peers; guestPeers(ch); });
  setTimeout(() => { if (NET.code === code && NET.role === 'guest' && !ONL.hostSeen) { toastMenu('That lobby isn’t open any more.'); netLeave(); openOnlineHub(); } }, 15000);
}
function netJoin(room, code) { return joinLobby(code); } // older callers (links, invites)
function guestPeers(ch) {
  const host = hostPeer();
  if (host && !ONL.hostSeen) { // first look at the lobby: take the emptier side, unless it's full
    ONL.hostSeen = true; NET.peer = host.peer;
    const hum = lobbyHumans(); if (hum.length > MAX_HUMANS || (hum.length === MAX_HUMANS && !hum.some(x => x.me))) { toastMenu('That lobby is full (20 people).'); netLeave(); openOnlineHub(); return; }
    const c = [0, 1].map(t => hum.filter(x => x.team === t && !x.me).length); ONL.team = c[1] <= c[0] ? 1 : 0;
    try { NET.room.presence(myPresence()); } catch (e) { }
    if (!(P0 => P0.go && P0.S)(host.presence)) renderLobby();
  }
  if (host && (ch.left || []).some(p => p.peer === host.peer)) { netDropped(); return; }
  if (!host && ONL.hostSeen && (ch.left || []).length) { netDropped(); return; }
  if (!host) return;
  const P = host.presence;
  if (P.go && P.S && P.go !== ONL.lastGo) { ONL.lastGo = P.go; buildOnlineMatch(P.S); return; }
  if (ONL.inMatch && NET.on && P.s) NET.snap = P;
  if (ONL.inMatch && !P.go) { backToLobbyLocal(); return; }
  if (!ONL.inMatch) lobbyRefresh();
}

// ---- the lobby screen
function lobbyRefresh() { if (G.screen === 'msgScr' && $('#lobTeams')) { const now = performance.now(); if (now - ONL.renderT < 150) { clearTimeout(ONL.rt); ONL.rt = setTimeout(lobbyRefresh, 160); return; } ONL.renderT = now; renderLobbyParts(); } }
function renderLobby() {
  const host = NET.role === 'host';
  msg('lobby', `Lobby ${NET.code}`, `<div class="lobtop"><span class="muted">Code <b class="num lobcode">${NET.code}</b></span><span id="lobCount" class="muted"></span></div>
    <div class="lobteams" id="lobTeams"></div>
    <div id="lobSettings" class="lobset"></div>
    <h4 class="invh">Your kit</h4>
    <div class="lobkit" id="lobKit"></div>
    <h4 class="invh">Invite</h4>
    <div id="lobInvite" class="invlist"></div>`,
    host ? [['Start fight', hostStart, true], ['Leave', leaveLobby]] : [[ONL.ready ? 'Not ready' : 'Ready', toggleReady, true], ['Leave', leaveLobby]]);
  renderLobbyParts(); renderKit();
}
function renderLobbyParts() {
  const host = NET.role === 'host', L = host ? lobbyL() : Object.assign(lobbyL(), (hostPeer() || { presence: {} }).presence.L || {});
  const hum = lobbyHumans(), C = teamCounts(L, hum);
  const cnt = $('#lobCount'); if (cnt) cnt.textContent = `${hum.length} of ${MAX_HUMANS} people · ${C.total[0]} v ${C.total[1]} · Challenge level ${Math.max(1, ...hum.map(x => x.level))} (highest human)`;
  const box = $('#lobTeams'); if (!box) return; box.innerHTML = '';
  ['Reavers', 'Wardens'].forEach((tn, t) => {
    const col = h('div', { class: 'lobteam t' + t }, h('h5', null, `${tn} · ${C.total[t]}`));
    for (const x of hum.filter(y => y.team === t)) {
      const W = ONL_WEAPONS.find(w => x.lo && w[0] === x.lo.weapon && (w[1] || null) === (x.lo.shield || null));
      col.append(h('button', { class: 'lobp' + (x.me ? ' me' : ''), onclick: () => openProfileByUid(x.uid, x) }, h('b', null, (x.bos ? '✓ ' : '') + x.name + (x.me ? ' (you)' : '')), h('small', null, `${x.host ? 'host · ' : ''}${W ? W[2] : (x.lo && WEAPONS[x.lo.weapon] ? WEAPONS[x.lo.weapon].name : '')}${x.host || x.ready ? ' · ready ✓' : ' · not ready'}`)));
    }
    if (C.bots[t]) col.append(h('div', { class: 'lobbots' }, `+ ${C.bots[t]} bot${C.bots[t] === 1 ? '' : 's'}`));
    if (C.n > 1) for (let slot = 0; slot < C.bots[t]; slot++) {
      const cur = ((L.roles || [[], []])[t] || [])[slot] || 'auto';
      const sel = h('select', { class: 'bot-role-select', 'aria-label': `${tn} bot ${slot + 1} role`, disabled: onlineCaptain(t)?.uid !== ONL.me, onchange: e => onlineBotRole(t, slot, e.target.value) });
      for (const role of ['auto', 'tank', 'rook', 'runner']) sel.append(h('option', { value: role, selected: role === cur }, role === 'auto' ? `Auto (${MELEE_ROLES[MELEE_ROLE_PATTERN[slot % MELEE_ROLE_PATTERN.length]]})` : MELEE_ROLES[role]));
      col.append(h('label', { class: 'bot-role-row' }, h('span', null, `Bot ${slot + 1}`), sel));
    }
    const mine = hum.find(y => y.me);
    if (mine && mine.team !== t && C.h[t] < C.n) col.append(h('button', { class: 'btn tape small', onclick: () => { ONL.team = t; AU.click(); try { NET.room.presence(myPresence(host ? { L: ONL.L } : {})); } catch (e) { } lobbyRefresh(); } }, 'Join this side'));
    box.append(col);
  });
  const set = $('#lobSettings'); if (!set) return; set.innerHTML = '';
  if (!host) { set.append(h('p', { class: 'muted small' }, `${C.n} a side · ${VENUES[L.venue] ? VENUES[L.venue].name : ''} · ${L.cat}. The host sets these and starts the fight.`)); return; }
  const step = (label, val, min, max, fn) => h('div', { class: 'stepper' }, h('span', null, label), h('button', { class: 'btn tape small', disabled: val <= min ? true : null, onclick: () => { AU.click(); fn(val - 1); } }, '−'), h('b', { class: 'num' }, String(val)), h('button', { class: 'btn tape small', disabled: val >= max ? true : null, onclick: () => { AU.click(); fn(val + 1); } }, '+'));
  set.append(step('People a side', C.n, Math.max(1, C.h[0], C.h[1]), 10, v => { ONL.L.n = v; ONL.L.bots = [null, null]; hostSync(); lobbyRefresh(); }));
  for (const t of [0, 1]) set.append(step(`Bots, ${t ? 'Wardens' : 'Reavers'}`, C.bots[t], 0, C.n - C.h[t], v => { const b = ONL.L.bots.slice(); b[t] = v; ONL.L.bots = b; hostSync(); lobbyRefresh(); }));
  const seg = (label, opts, cur, fn) => { const s = h('div', { class: 'seg small' }); for (const [v, n] of opts) s.append(h('button', { 'aria-pressed': String(cur === v), onclick: () => { AU.click(); fn(v); } }, n)); return h('div', { class: 'setrow' }, h('span', null, label), s); };
  set.append(seg('Arena', Object.values(VENUES).map(V => [V.key, V.name]), L.venue, v => { ONL.L.venue = v; hostSync(); lobbyRefresh(); }));
  set.append(seg('Division', [['men', 'Adult'], ['youth', 'Kids']], L.cat === 'youth' ? 'youth' : 'men', v => { ONL.L.cat = v; hostSync(); lobbyRefresh(); }));
  set.append(seg('Find a match', [['1', 'Open to anyone'], ['0', 'Friends only']], L.open ? '1' : '0', v => { setLobbyOpen(v === '1'); lobbyRefresh(); }));
  renderLobbyInvite();
}
function renderKit() {
  const box = $('#lobKit'); if (!box) return; box.innerHTML = ''; const k = onlineKit();
  const ws = h('div', { class: 'chips' }); ONL_WEAPONS.forEach((W, i) => ws.append(h('button', { class: 'chip', 'aria-pressed': String(k.w === i), onclick: () => { store.set('onlineKit', { ...onlineKit(), w: i }); AU.click(); kitChanged(); } }, W[2])));
  const hs = h('div', { class: 'chips' }); ONL_HELMS.forEach(hk => hs.append(h('button', { class: 'chip', 'aria-pressed': String(k.helm === hk), onclick: () => { store.set('onlineKit', { ...onlineKit(), helm: hk }); AU.click(); kitChanged(); } }, HELMS[hk] ? HELMS[hk].name : hk)));
  box.append(h('div', { class: 'muted small' }, 'Weapon'), ws, h('div', { class: 'muted small' }, 'Helm'), hs);
}
function kitChanged() { renderKit(); try { NET.room.presence(myPresence(NET.role === 'host' ? { L: ONL.L } : {})); } catch (e) { } lobbyRefresh(); }
function renderLobbyInvite() {
  const box = $('#lobInvite'); if (!box) return; box.innerHTML = '';
  const inLobby = new Set(lobbyHumans().map(x => x.name));
  const list = LOBBY.peers.filter(p => !/online fight|in a lobby/.test(String(p.presence.st || '')) || !inLobby.has(p.presence.name));
  for (const p of list.slice(0, 12)) {
    const sent = LOBBY.invited === p.peer;
    box.append(h('div', { class: 'invrow' }, h('button', { class: 'invwho linkish', onclick: () => openProfile(p) }, h('b', null, String(p.presence.name).slice(0, 20)), h('small', null, String(p.presence.st || '').slice(0, 30))),
      h('span', { class: 'invacts' }, profileBtn(p), h('button', { class: 'btn ' + (sent ? 'tape' : 'primary flagtape') + ' small', onclick: () => sendInvite(p) }, sent ? 'Invited ✓' : 'Invite'))));
  }
  box.append(h('button', { class: 'btn tape small', onclick: () => { AU.click(); shareInvite(); } }, 'Send a link'));
}
function toggleReady() { ONL.ready = !ONL.ready; try { NET.room.presence(myPresence()); } catch (e) { } renderLobby(); }
function leaveLobby() { lobbySet({ look: null, invite: null }); LOBBY.invited = null; netLeave(); openOnlineHub(); }

// ---- start: the host turns the lobby into a match spec everyone builds the same way
function hostStart() {
  const L = lobbyL(), hum = lobbyHumans(), C = teamCounts(L, hum);
  if (L.throne) {
    const challenger = hum.find(x => x.account === L.throne.challenger), holder = hum.find(x => x.account === L.throne.holder);
    if (C.total[0] !== 1 || C.total[1] !== 1 || hum.length !== 2 || !challenger || !holder || challenger.team === holder.team) { toastMenu('A crown duel must be one signed-in challenger against the current title holder, with no bots.'); return; }
  }
  if (C.total[0] < 1 || C.total[1] < 1) { toastMenu('Each side needs at least one fighter: add a bot.'); return; }
  const H = []; for (const t of [0, 1]) hum.filter(x => x.team === t).forEach((x, i) => H.push({ uid: x.uid, account: x.account, t, i, lo: x.lo, peer: x.peer }));
  if (hum.some(h => !h.lo || h.lo.protocol !== NET_PROTOCOL)) { toastMenu('A player needs to update the game before Ready.'); return; }
  const S = { protocol: NET_PROTOCOL, counts: C.total, venue: L.throne ? 'hall' : L.venue, cat: L.throne ? (L.throne.seat === 'queen' ? 'women' : 'men') : L.cat, H, roles: L.roles || [[], []], throne: L.throne || null, challengeLevel: Math.max(1, ...hum.map(x => x.level)) };
  ONL.go = Date.now(); ONL.S = S; lobbySet({ look: null, st: 'in an online fight' }); LOBBY.invited = null;
  buildOnlineMatch(S);
}
function buildOnlineMatch(S) {
  if (S.protocol != null && S.protocol !== NET_PROTOCOL) { toastMenu('Update the game before joining this match.'); return; }
  G.attract = false; G.tourney = null; REP.log = []; endTraining();
  const catWas = G.category; G.category = S.cat || G.category;
  const N = Math.max(S.counts[0], S.counts[1], 1);
  setupMatch({ mode: N, opp: 'wardens', stage: `Online ${S.counts[0]} v ${S.counts[1]}`, venue: S.venue, online: true, challengeLevel: clamp(Number(S.challengeLevel) || 1, 1, 100), pro: N === 1 });
  G.category = catWas;
  for (const t of [0, 1]) { const team = G.fighters.filter(f => f.team === t); for (const f of team.slice(S.counts[t])) { W3.matchRoot.remove(f.model.root); G.fighters.splice(G.fighters.indexOf(f), 1); } }
  G.fighters.forEach(f => { f.isPlayer = false; delete f.combatProfile; f.vin = null; f.netUid = null; f.netPeer = null; }); G.player = null;
  for (const hm of S.H) {
    const f = G.fighters.filter(x => x.team === hm.t)[hm.i]; if (!f) continue;
    applyLo(f, hm.lo, G.match.category); f.netUid = hm.uid; f.netPeer = hm.peer; f.ai.role = null; f.isPlayer = hm.uid === ONL.me; f.spec.player = f.isPlayer;
    const identityPeer = ONL.peers.find(p => p.presence?.uid === hm.uid);
    f.creatorVerified = !f.isPlayer && !!identityPeer && creatorRemote(f.creatorProof, 'combat', identityPeer.peer);
    W3.matchRoot.remove(f.model.root); buildFighterModel(f); W3.matchRoot.add(f.model.root);
    if (hm.uid === ONL.me) { f.isPlayer = true; G.player = f; }
    else if (NET.role === 'host') f.vin = ONL.vins[hm.uid] = ONL.vins[hm.uid] || newVin();
  }
  for (const t of [0, 1]) {
    const bots = G.fighters.filter(f => f.team === t && !f.netUid).sort((a, b) => a.idx - b.idx);
    bots.forEach((f, i) => { const role = S.roles && S.roles[t] && S.roles[t][i]; f.ai.roleManual = MELEE_ROLES[role] ? role : null; });
    assignMeleeRoles(t);
  }
  G.match.netSpec = S; G.match.duel = N === 1 && S.counts[0] === 1 && S.counts[1] === 1; buildPips();
  if (S.throne) G.match.throneDuel = S.throne;
  $('#sbA').textContent = 'RVR'; $('#sbB').textContent = 'WDN';
  ONL.inMatch = true; NET.on = true; NET.pauseRequested = false; NET.ev = []; NET.lastEv = 0; NET.snap = null;
  startRound();
  if (NET.role === 'host') beginFight();
  else { hideAll(); setHud(true); G.phase = 'prefight'; refreshTouchUI(); if (G.player) FP.yaw = G.player.facing; }
}
// ---- during the fight
function netTick(dt) {
  if (!NET.on || !NET.room) return;
  NET.sendT -= dt;
  if (NET.role === 'host') {
    const humans = G.match?.netSpec?.H || [];
    G.paused = onlineCoop() && humans.every(h => h.uid === ONL.me ? NET.pauseRequested : ONL.remote[h.uid]?.pause && performance.now() - ONL.remote[h.uid].at <= 500);
    for (const uid in ONL.vins) {
      const V = ONL.vins[uid], R = ONL.remote[uid];
      if (R && performance.now() - R.at <= 500) { Object.assign(V, R.value, { e: { ...R.value.e } }); V.expired = false; }
      else if (!V.expired) { Object.assign(V, neutralVin(V)); V.expired = true; }
    }
    const big = G.fighters.length > 8;
    if (NET.sendT <= 0) {
      NET.sendT = big ? 0.08 : 0.05; const m = G.match; if (!m) return;
      const s = G.fighters.map(f => { const a = packF(f); return big ? a.map(v => typeof v === 'number' ? Math.round(v * 100) / 100 : v) : a; });
      NET.room.presence({ protocol: NET_PROTOCOL, paused: G.paused, role: 'host', simTime: q(G.simTime), go: ONL.go, S: Date.now() - ONL.go < 5000 ? ONL.S : null, L: null, s, m: [q(m.clock), m.pts[0], m.pts[1], m.wins[0], m.wins[1], m.round, ['prefight', 'fight', 'stopping', 'between', 'over', 'tactics'].indexOf(G.phase), m.overtime ? 1 : 0], mk: G.marshals.map(k => [q(k.pos.x), q(k.pos.z), q(k.facing), q(k.flagUp)]), ev: NET.ev });
    }
  } else {
    const V = NET.vin; V.mx = PIN.move.x; V.mz = PIN.move.z; V.yaw = isCtl() ? FP.yaw : null; V.pitch = isCtl() ? FP.pitch : 0; V.sp = PIN.sprint ? 1 : 0; V.gd = PIN.guard ? ({ L: 2, R: 3, H: 4 }[PIN.gdir] || 1) : 0; V.br = PIN.brace ? 1 : 0;
    if (IN.swingStart) { IN.swingStart = false; V.sw++; V.sh = 1; V.arc = 'auto'; }
    if (V.sh) { let pv = null; if (IN.pad.id !== null) pv = arcFromDrag(IN.pad.dx, IN.pad.dy, 16); else if (IN.mouse.down) pv = arcFromDrag(IN.mouse.adx, IN.mouse.ady, 22); else if (IN.gp.rtDown) pv = PIN.rx > 0.45 ? 'R2L' : PIN.rx < -0.45 ? 'L2R' : PIN.ry < -0.5 ? 'O' : null; if (pv && pv !== 'auto') V.arc = pv; }
    if (IN.swingRelease) { if (IN.swingRelease !== 'auto') V.arc = IN.swingRelease; V.sh = 0; IN.swingRelease = null; }
    for (const k of ['trip', 'shove', 'grab', 'tackle']) if (IN.edges.has(k)) { IN.edges.delete(k); V.e[k]++; }
    if (G.screen || G.photo) { V.mx = V.mz = V.gd = 0; V.sp = V.br = V.sh = false; }
    if (NET.sendT <= 0) { NET.sendT = 0.05; V.seq = (V.seq || 0) + 1; NET.room.presence({ protocol: NET_PROTOCOL, pauseRequested: !!NET.pauseRequested, role: 'guest', uid: ONL.me, name: myName(), team: ONL.team, vin: V }); }
    const P = NET.snap; if (!P || !P.s) return; G.paused = onlineCoop() && !!P.paused;
    if (Number.isFinite(P.simTime)) G.simTime = Math.max(G.simTime, P.simTime);
    G.fighters.forEach((f, i) => P.s[i] && unpackF(f, P.s[i], dt));
    const m = G.match, M = P.m; if (!M) return; m.clock = M[0]; m.pts = [M[1], M[2]]; const won = [M[3], M[4]]; m.round = M[5]; m.overtime = !!M[7];
    const ph = ['prefight', 'fight', 'stopping', 'between', 'over', 'tactics'][M[6]] || 'fight';
    if (ph !== G.phase) { if (ph === 'over' && G.phase !== 'over') { m.wins = won; G.phase = 'over'; netGuestEnd(); return; } G.phase = ph; refreshTouchUI(); }
    m.wins = won;
    (P.mk || []).forEach((k, i) => { const mm = G.marshals[i]; if (mm) { mm.pos.x = k[0]; mm.pos.z = k[1]; mm.facing = k[2]; mm.flagUp = k[3]; } });
    for (const e of P.ev || []) { if (e[0] <= NET.lastEv) continue; NET.lastEv = e[0]; netPlay(e); }
  }
}
function resultTitle(m) {
  const t = G.player ? G.player.team : 0, won = m.wins[t] > m.wins[1 - t], drawn = m.wins[0] === m.wins[1];
  return [drawn ? 'Draw' : won ? 'Your side wins' : 'Your side loses', `<p>${m.wins[t]}–${m.wins[1 - t]} in rounds.</p>`];
}
function onlineMatchEnd() { // host
  const [title, body] = resultTitle(G.match); if (!G.match.rewarded) { G.match.rewarded = true; progressMatch(G.match, title === 'Your side wins'); } if (typeof throneOnlineEnd === 'function') throneOnlineEnd(G.match);
  msg('online', title, body + '<p class="muted">Back to the lobby to go again, change sides or add bots.</p>', [['Back to lobby', hostBackToLobby, true], ['Leave', () => { netLeave(); toTitle(); }]]);
}
function netGuestEnd() {
  const [title, body] = resultTitle(G.match); if (!G.match.rewarded) { G.match.rewarded = true; progressMatch(G.match, title === 'Your side wins'); } if (typeof throneOnlineEnd === 'function') throneOnlineEnd(G.match);
  setHud(false); msg('online', title, body + '<p class="muted">The lobby opens again when the host is ready.</p>', [['Leave', () => { netLeave(); toTitle(); }, true]]);
}
function hostBackToLobby() {
  ONL.inMatch = false; NET.on = false; ONL.go = 0; ONL.S = null;
  startAttract(); hostSync(); if (ONL.L.open) setLobbyOpen(true); lobbySet({ st: 'in a lobby' }); renderLobby();
}
function backToLobbyLocal() { ONL.inMatch = false; NET.on = false; ONL.ready = false; startAttract(); try { NET.room.presence(myPresence()); } catch (e) { } renderLobby(); }
function netDropped() {
  if (!NET.room) return;
  const wasOver = G.phase === 'over' && ONL.inMatch;
  netLeave(); if (wasOver) return;
  toastMenu('The host left the lobby.'); toTitle();
}
function netLeave() { try { NET.unsub && NET.unsub(); NET.room && NET.room.leave(); } catch (e) { } Object.assign(NET, { on: false, room: null, role: null, unsub: null, code: '' }); ONL.inMatch = false; ONL.peers = []; }

