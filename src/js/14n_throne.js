// ===================================================================
// The King and Queen sit in the Great Hall. A crown can change hands only after
// a one-on-one fight between its holder and an eligible linked fighter.
// The seats are kept on the BuhurtOS server (steeltape-throne), so everyone sees the same King and Queen.
// ===================================================================
const THRONE_URL = BOS_URL + '/functions/v1/steeltape-throne';
const THRONE = { seats: null, at: 0, loading: false, labels: {} };
function throneLoad(force) {
  if (THRONE.loading || typeof fetch !== 'function') return; if (!force && Date.now() - THRONE.at < 60000) return;
  THRONE.loading = true;
  fetch(THRONE_URL, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => { THRONE.loading = false; if (d && d.seats) { THRONE.seats = d.seats; THRONE.at = Date.now(); throneLabels(); boardCrownStatues(); boardRedraw(); } }).catch(() => { THRONE.loading = false; });
}
async function thronePost(body) {
  const headers = { 'Content-Type': 'application/json' };
  try { const s = BOS.sb && (await BOS.sb.auth.getSession()).data.session; if (s && s.access_token) headers.Authorization = 'Bearer ' + s.access_token; } catch (e) { }
  const r = await fetch(THRONE_URL, { method: 'POST', headers, body: JSON.stringify(body) }); if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'The herald could not record the duel.'); }
  const d = await r.json(); if (d.seats) { THRONE.seats = d.seats; THRONE.at = Date.now(); throneLabels(); boardCrownStatues(); boardRedraw(); } return d;
}
function throneHolder(seat) { const S = THRONE.seats && THRONE.seats[seat]; return S ? S : { name: seat === 'king' ? 'the King' : 'the Queen', uid: null, challenges: 1 }; }
function throneMine(seat) { const H = throneHolder(seat); return !!(H.uid && BOS.user && BOS.user.id === H.uid); }
// the King and Queen on the dais, with their names
function buildThrone(R) {
  const H = HALL, cx = (H.x0 + H.x1) / 2, z = H.z0 + 3.4;
  THRONE.figs = {};
  for (const [seat, dx, k, col] of [['king', -1.6, 'po_male_sitting', '#5b2a86'], ['queen', 1.6, 'po_female_sitting', '#8a1a2a']]) {
    const Y = gy(cx, z); const p = kpiece(R, k, cx + dx, Y + 0.8, z, 0, 1); if (p) { p.traverse(o => { if (o.isMesh) o.material = lmat({ vertexColors: true, color: col, roughness: 0.9, flatShading: true }); }); p.userData.landmark = true; }
    kpiece(R, 'rp_crown', cx + dx, Y + 2.45, z, 0, 0.42);
    const lab = townLabel(seat === 'king' ? 'The King' : 'The Queen', '👑', '#e3b341'); lab.position.set(cx + dx, Y + 3.3, z); lab.userData.landmark = true; R.add(lab); THRONE.labels[seat] = lab;
  }
  // The hall list blocks the centre aisle. The Crown Herald takes challenges
  // at the hall entrance, where every visitor can actually reach the desk.
  const approachX = cx, approachZ = H.z1 - 2.2;
  const herald = townLabel('Crown Herald', 'Challenge the King or Queen', '#e3b341');
  herald.position.set(approachX, gy(approachX, approachZ) + 2.6, approachZ);
  herald.userData.landmark = true; R.add(herald);
  TOWN.stalls.push({ V: { key: 'throne', name: 'The Crown Herald', role: 'Challenge the King or Queen', icon: '👑' }, g: new THREE.Object3D(), npc: null, ry: 0, x: approachX, z: approachZ, ax: approachX, az: approachZ, label: herald, reach: 3.6, open: openThrone, verb: 'Challenge' });
  throneLabels(); throneLoad();
}
function throneLabels() {
  if (!TOWN.on || !THRONE.labels.king || !THRONE.seats) return;
  for (const seat of ['king', 'queen']) { const old = THRONE.labels[seat]; if (!old || !old.parent) continue; const H = throneHolder(seat); const lab = townLabel((seat === 'king' ? 'King ' : 'Queen ') + H.name, '👑 ' + (throneMine(seat) ? 'That’s you' : 'Challenge for the seat'), '#e3b341'); lab.position.copy(old.position); lab.userData.landmark = true; old.parent.add(lab); old.parent.remove(old); THRONE.labels[seat] = lab; }
}
function openThrone() {
  throneLoad(true);
  if (!realmHasWrit('royal')) { toastMenu('The guards bar the way. Only a holder of the Royal writ may approach the throne.'); return; }
  townPanel('The throne', box => {
    const list = stationRows(box, '“Who comes before the crown? Speak, and say which seat you dare to claim.”', []);
    for (const seat of ['king', 'queen']) {
      const H = throneHolder(seat), mine = throneMine(seat), online = throneOnline(seat), eligible = BOS.info && BOS.info.gender === (seat === 'king' ? 'male' : 'female');
      const who = (seat === 'king' ? 'King ' : 'Queen ') + H.name, held = (CAREER.throne || {})[seat];
      list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, who), h('span', { class: 'tier' }, mine ? 'You hold this seat' : online ? 'Online now' : held ? 'You took it once' : 'On the throne')),
        h('div', { class: 'muted' }, mine ? 'Defend your crown when a challenger arrives.' : !eligible ? `Only a linked ${seat === 'king' ? 'male' : 'female'} fighter can challenge for this title.` : online ? `Fight ${H.name} in a one-on-one duel to take the crown.` : `${H.name} is offline. You must fight the real title holder when they return.`)),
        h('button', { class: 'btn small ' + (mine ? 'tape' : 'primary flagtape'), disabled: mine || !online || !eligible || !THRONE.seats ? true : null, onclick: () => { if (!mine) throneChallenge(seat); } }, mine ? 'Yours' : 'Challenge')));
    }
    if (!THRONE.seats) list.append(h('p', { class: 'muted small' }, 'The herald is still fetching the court rolls. Try again in a moment if the names look wrong.'));
  });
}
// is the real holder in the game right now? (a lobby peer signed in to BuhurtOS with the holder's id)
function throneOnline(seat) { const H = throneHolder(seat); if (!H.uid) return null; return ((typeof LOBBY !== 'undefined' && LOBBY.peers) || []).find(p => p.presence && p.presence.bu === H.uid && p.peer !== (LOBBY.me || null)) || null; }
async function throneChallenge(seat) {
  AU.click();
  if (!BOS.info || BOS.info.gender !== (seat === 'king' ? 'male' : 'female')) { toastMenu(`Only a linked ${seat === 'king' ? 'male' : 'female'} fighter can challenge.`); return; }
  await initLobby();
  const online = throneOnline(seat);
  if (!online) { toastMenu('The title holder is offline. Fight them when they return.'); return; }
  let d; try { d = await thronePost({ seat, action: 'challenge' }); } catch (e) { toastMenu(e.message); return; }
  closeVendor(); await sendInvite(online, d.duel);
  toastMenu(`Crown duel sent to ${throneHolder(seat).name}. Beat the holder to take the title.`);
}
async function throneOnlineEnd(m) {
  const duel = m && m.throneDuel, spec = m && m.netSpec;
  if (!duel || !spec || m.wins[0] === m.wins[1]) return;
  const challenger = spec.H.find(x => x.account === duel.challenger), holder = spec.H.find(x => x.account === duel.holder);
  if (!challenger || !holder || challenger.t === holder.t || !BOS.user) return;
  const winner = m.wins[challenger.t] > m.wins[holder.t] ? 'challenger' : 'holder';
  try {
    await thronePost({ action: 'report', id: duel.id, winner });
    if (winner === 'holder') { toastMenu(`${throneHolder(duel.seat).name} keeps the crown.`); return; }
    if (BOS.user.id !== duel.challenger) return;
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const r = await fetch(THRONE_URL, { cache: 'no-store' });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.seats) { THRONE.seats = d.seats; throneLabels(); boardCrownStatues(); }
      if (d.seats && d.seats[duel.seat] && d.seats[duel.seat].uid === BOS.user.id) {
        CAREER.throneDuels = CAREER.throneDuels || {};
        if (!CAREER.throneDuels[duel.id]) { CAREER.throneDuels[duel.id] = true; CAREER.throne = CAREER.throne || {}; CAREER.throne[duel.seat] = Date.now(); pay(5000); saveCareer(); updateTitlePurse(); unlock('crowned', true); }
        toastMenu(`The crown is yours! You are ${duel.seat === 'king' ? 'King' : 'Queen'} of the realm.`); return;
      }
    }
    toastMenu('Your win is awaiting confirmation from the title holder.');
  } catch (e) { toastMenu(e.message || 'The duel result could not be recorded.'); }
}
async function throneEnd(m, won, withPurse) {
  msg('the throne', 'Crown duel unavailable', withPurse('<p>The title only changes hands in a one-on-one online fight with its current holder.</p>'), [['Back to the realm', toTitle, true]]);
}
