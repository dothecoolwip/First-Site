// ===================================================================
// The King and the Queen sit in the Great Hall. Hold the Royal writ and you may challenge either for their seat.
// If the real holder is online in the game, it's them you fight (an invite to a duel); if not, a tougher-than-the-guard
// stand-in with their name. The very first challenge a seat ever gets is met with a bow: "The crown is yours!"
// The seats are kept on the BuhurtOS server (steeltape-throne), so everyone sees the same King and Queen.
// ===================================================================
const THRONE_URL = BOS_URL + '/functions/v1/steeltape-throne';
const THRONE = { seats: null, at: 0, loading: false, labels: {} };
function throneLoad(force) {
  if (THRONE.loading || typeof fetch !== 'function') return; if (!force && Date.now() - THRONE.at < 60000) return;
  THRONE.loading = true;
  fetch(THRONE_URL, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => { THRONE.loading = false; if (d && d.seats) { THRONE.seats = d.seats; THRONE.at = Date.now(); throneLabels(); } }).catch(() => { THRONE.loading = false; });
}
async function thronePost(body) {
  const headers = { 'Content-Type': 'application/json' };
  try { const s = BOS.sb && (await BOS.sb.auth.getSession()).data.session; if (s && s.access_token) headers.Authorization = 'Bearer ' + s.access_token; } catch (e) { }
  const r = await fetch(THRONE_URL, { method: 'POST', headers, body: JSON.stringify(body) }); if (!r.ok) throw new Error('throne ' + r.status);
  const d = await r.json(); if (d.seats) { THRONE.seats = d.seats; THRONE.at = Date.now(); throneLabels(); } return d;
}
function throneHolder(seat) { const S = THRONE.seats && THRONE.seats[seat]; return S ? S : { name: seat === 'king' ? 'the King' : 'the Queen', uid: null, challenges: 1 }; }
function throneMine(seat) { const H = throneHolder(seat); return !!(H.uid && BOS.user && BOS.user.id === H.uid); }
// the King and Queen on the dais, with their names
function buildThrone(R) {
  const H = HALL, cx = (H.x0 + H.x1) / 2, z = H.z0 + 3.4;
  THRONE.figs = {};
  for (const [seat, dx, k, col] of [['king', -1.6, 'po_male_sitting', '#5b2a86'], ['queen', 1.6, 'po_female_sitting', '#8a1a2a']]) {
    const p = kpiece(R, k, cx + dx, 0.8, z, 0, 1); if (p) { p.traverse(o => { if (o.isMesh) o.material = lmat({ vertexColors: true, color: col, roughness: 0.9, flatShading: true }); }); p.userData.landmark = true; }
    kpiece(R, 'rp_crown', cx + dx, 2.45, z, 0, 0.42);
    const lab = townLabel(seat === 'king' ? 'The King' : 'The Queen', '👑', '#e3b341'); lab.position.set(cx + dx, 3.3, z); lab.userData.landmark = true; R.add(lab); THRONE.labels[seat] = lab;
  }
  TOWN.stalls.push({ V: { key: 'throne', name: 'The Throne', role: 'Challenge for the crown', icon: '👑' }, g: new THREE.Object3D(), npc: null, ry: 0, x: cx, z: z + 4, ax: cx, az: z + 5, label: new THREE.Object3D(), open: openThrone, verb: 'Approach' });
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
      const H = throneHolder(seat), mine = throneMine(seat), online = throneOnline(seat), first = THRONE.seats && H.challenges === 0;
      const who = (seat === 'king' ? 'King ' : 'Queen ') + H.name, held = (CAREER.throne || {})[seat];
      list.append(h('div', { class: 'up' }, h('div', null, h('div', { class: 'uph' }, h('b', null, who), h('span', { class: 'tier' }, mine ? 'You hold this seat' : online ? 'Online now' : held ? 'You took it once' : 'On the throne')),
        h('div', { class: 'muted' }, mine ? 'Sit back. Challengers will come to you.' : online ? `${H.name} is in the realm right now: it’s them you’d fight, one on one, in the Great Hall.` : `${H.name} isn’t here; their champion fights for them. Beat them and the seat is yours${first ? '' : ''}.`)),
        h('button', { class: 'btn small ' + (mine ? 'tape' : 'primary flagtape'), disabled: mine ? true : null, onclick: () => { if (!mine) throneChallenge(seat); } }, mine ? 'Yours' : 'Challenge')));
    }
    if (!THRONE.seats) list.append(h('p', { class: 'muted small' }, 'The herald is still fetching the court rolls. Try again in a moment if the names look wrong.'));
  });
}
// is the real holder in the game right now? (a lobby peer signed in to BuhurtOS with the holder's id)
function throneOnline(seat) { const H = throneHolder(seat); if (!H.uid) return null; return ((typeof LOBBY !== 'undefined' && LOBBY.peers) || []).find(p => p.presence && p.presence.bu === H.uid && p.peer !== (LOBBY.me || null)) || null; }
async function throneChallenge(seat) {
  AU.click(); closeVendor(); toastMenu('You step before the throne…');
  let d; try { d = await thronePost({ seat, action: 'challenge', name: myName() }); } catch (e) { toastMenu('The herald can’t reach the court rolls. Try again when you’re online.'); return; }
  if (d.bow) { throneBow(seat, d.was); return; }
  const online = throneOnline(seat);
  if (online) { THRONE.pending = seat; await sendInvite(online); toastMenu(`${throneHolder(seat).name} is here: a duel invite is sent. Win it and the seat is yours.`); return; }
  throneFight(seat);
}
// the first ever challenge: the holder rises and bows
function throneBow(seat, was) {
  CAREER.throne = CAREER.throne || {}; CAREER.throne[seat] = Date.now(); saveCareer(); unlock('crowned', true);
  msg('the throne', 'The crown is yours!', `<p>${was} rises from the ${seat === 'king' ? 'King’s' : 'Queen’s'} seat, looks you up and down, and bows low.</p><p><b>“The crown is yours!”</b></p><p>The hall erupts. You are ${seat === 'king' ? 'King' : 'Queen'} of the realm until someone takes it from you.</p>`, [['Take the seat', toTitle, true]]);
  try { AU.cheer(1.8); } catch (e) { }
}
// the stand-in: a tougher opponent than the King's Guard, in the holder's name
function throneFight(seat) {
  const H = throneHolder(seat);
  CLUBS.throne = { key: 'throne', name: H.name, full: (seat === 'king' ? 'King ' : 'Queen ') + H.name, short: 'CRN', tabard: seat === 'king' ? '#5b2a86' : '#8a1a2a', trim: '#e3b341', charge: 'quarterly', flag: '#e3b341',
    roster: [{ num: 1, name: H.name, arch: seat === 'king' ? 'heavy' : 'striker', weapon: seat === 'king' ? 'longaxe' : 'longsword', shield: null, helm: 'greathelm', prof: { react: 0.11, aggr: 1.35, guard: 0.86, cancel: 0.84 }, stab: 1.24, keep: true, bos: H.fighter ? { id: H.fighter, team: null } : null }] };
  G.attract = false; G.tourney = null; REP.log = []; endTraining(); TOWN.returnTo = 'throne';
  leaveTown(() => { setupMatch({ mode: 1, opp: 'throne', stage: `For the ${seat === 'king' ? 'King’s' : 'Queen’s'} seat`, throne: seat, venue: 'hall', aiTier: 3 }); toTactics(); });
}
// the online duel with the real holder is over
function throneOnlineEnd(won) {
  const seat = THRONE.pending; if (!seat) return; THRONE.pending = null;
  if (!won) { toastMenu(`${throneHolder(seat).name} keeps the ${seat === 'king' ? 'King’s' : 'Queen’s'} seat.`); return; }
  thronePost({ seat, action: 'claim', name: myName() }).then(() => { CAREER.throne = CAREER.throne || {}; CAREER.throne[seat] = Date.now(); pay(5000); saveCareer(); updateTitlePurse(); unlock('crowned', true); toastMenu(`The crown is yours! You are ${seat === 'king' ? 'King' : 'Queen'} of the realm.`); }).catch(() => toastMenu('You won, but the herald couldn’t record it. Challenge again when you’re online.'));
}
async function throneEnd(m, won, withPurse) {
  const seat = m.throne, H = throneHolder(seat);
  if (won) {
    try { await thronePost({ seat, action: 'claim', name: myName() }); } catch (e) { }
    CAREER.throne = CAREER.throne || {}; CAREER.throne[seat] = Date.now(); pay(5000); saveCareer(); updateTitlePurse(); unlock('crowned', true);
    msg('the throne', 'The crown is yours!', withPurse(`<p>${H.name}’s champion is down. The hall goes quiet, then roars. You are ${seat === 'king' ? 'King' : 'Queen'} of the realm. Bonus ${fmtMoney(5000)}.</p>`), [['Take the seat', toTitle, true]]);
  } else msg('the throne', 'The crown stays', withPurse(`<p>Not this time. ${H.name} keeps the ${seat === 'king' ? 'King’s' : 'Queen’s'} seat. The Great Hall will be here when you’re ready to try again.</p>`), [['Try again', () => throneFight(seat)], ['Back to the realm', toTitle, true]]);
}
