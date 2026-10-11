// ---------- play online: see who's playing (and their stats), find a match, invite someone, or send a link ----------
// The global list is the peer-to-peer lobby (13g) where it can run, otherwise Claude's room. Everyone sets a small
// presence: name, what they're doing, profile stats (pr), `look` (the code of an open lobby, for Find a match) and
// `invite` (a lobby code addressed to one player). Fights themselves happen in a lobby room (13h).
const GAME_URL = 'https://claude.ai/artifact/2hhQkB83SkLC5ta9nNEnkN';
const LOBBY = { room: null, me: null, peers: [], pending: null, seen: {}, ready: false, invited: null, starting: null };
const MM = { searching: false };
const SESSION_START = Date.now();
const escTxt = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function myName() { const n = (CAREER.name && CAREER.name !== 'You') ? CAREER.name : (store.get('lobbyName', '') || ''); return String(n || 'A fighter').slice(0, 20); }
function lobbyStatus() { return NET.on ? 'in an online fight' : NET.room ? (NET.role === 'host' && ONL.L && ONL.L.open ? 'in an open lobby' : 'in a lobby') : TOWN.on ? 'walking around town' : G.attract || G.screen === 'title' ? 'on the title screen' : G.phase === 'fight' ? 'in a fight' : 'in the menus'; }
// play time: counted while the game is on screen, saved with the career
setInterval(() => { if (document.visibilityState === 'visible') { CAREER.playSec = (CAREER.playSec || 0) + 1; if (CAREER.playSec % 30 === 0) saveCareer(); } }, 1000);
function fmtDur(sec) { sec = Math.max(0, Math.round(sec || 0)); const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60); return hh ? `${hh} h ${mm} min` : mm ? `${mm} min` : `${sec} s`; }
function myProfile() { const s = CAREER.stats || {}; return { m: s.matches || 0, w: s.wins || 0, td: s.takedowns || 0, hits: s.hits || 0, rw: s.rumbleWins || 0, t: Math.round(CAREER.playSec || 0), on: SESSION_START, wpn: (WEAPONS[G.loadout.weapon] || WEAPONS.mace).name, club: CAREER.club && CAREER.club.name || '', ach: Object.keys(CAREER.ach || {}).length, bos: bosRecord(), lv: CAREER.level || 1, rank: rankOf(CAREER.level || 1) }; }
async function claudeRoom() { try { return window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { return null; } }
function lobbySet(patch) { try { LOBBY.room && LOBBY.room.presence(patch); } catch (e) { } }
async function initLobby() {
  if (LOBBY.room) return LOBBY.room;
  if (LOBBY.starting) return LOBBY.starting;
  LOBBY.starting = (async () => {
    // everyone in one list: the peer-to-peer lobby works on the website and (where allowed) on claude.ai, so both see
    // each other. If this page can't load it, fall back to Claude's own room.
    let room = null;
    try { await loadPeerLib(); room = p2pLobby(); await room.ready; } catch (e) { try { room && room.leave(); } catch (er) { } room = await claudeRoom(); }
    if (!room) { LOBBY.starting = null; return null; }
    LOBBY.room = room;
    lobbySet({ name: myName(), st: lobbyStatus(), pr: myProfile(), bu: (typeof BOS !== 'undefined' && BOS.user && BOS.user.id) || null, invite: null, look: null, gd: CAREER.guild ? { id: CAREER.guild.id, name: CAREER.guild.name, tag: CAREER.guild.tag, col: CAREER.guild.col } : null });
    setInterval(() => lobbySet({ name: myName(), st: lobbyStatus(), pr: myProfile(), bu: (typeof BOS !== 'undefined' && BOS.user && BOS.user.id) || null }), 5000);
    room.onPeers(ch => {
      const me = ch.peers.find(p => p.isMe && p.sameTab); if (me) LOBBY.me = me.peer;
      LOBBY.peers = ch.peers.filter(p => !p.isMe && p.kind === 'viewer' && p.presence && p.presence.name);
      LOBBY.ready = true;
      try { guildCheck(LOBBY.peers); } catch (e) { }
      updateLobbyBadge();
      for (const p of LOBBY.peers) { // an invite addressed to this player
        const inv = p.presence.invite;
        if (!inv || inv.to !== LOBBY.me || !/^[A-Z]{4}$/.test(String(inv.code || ''))) continue;
        const key = p.peer + inv.code; if (LOBBY.seen[key]) continue; LOBBY.seen[key] = 1;
        LOBBY.pending = { from: String(p.presence.name || 'A friend').slice(0, 20), code: inv.code, peer: p.peer };
        showInvite();
      }
      if (G.screen === 'msgScr' && $('#inviteList')) renderInviteList();
      if (G.screen === 'msgScr' && $('#lobInvite') && !ONL.inMatch) renderLobbyInvite();
    }, () => { });
    return room;
  })();
  return LOBBY.starting;
}
function updateLobbyBadge() {
  const n = LOBBY.peers.length;
  const b = $('#onlineBadge'); if (b) { b.hidden = !n; b.textContent = n + ' online'; }
  // the title screen lists everyone playing right now; tap a name for their stats, or the strip for Play online
  const np = $('#nowPlaying'); if (!np) return;
  np.hidden = !n;
  if (!n) return;
  const busy = p => /fight/.test(String(p.presence.st || ''));
  const list = LOBBY.peers.slice().sort((a, b) => (b.presence.look ? 2 : 0) - (a.presence.look ? 2 : 0) || (busy(a) ? 1 : 0) - (busy(b) ? 1 : 0));
  $('#npCount').textContent = `${n} playing now`;
  const box = $('#npNames'); box.innerHTML = '';
  list.forEach(p => box.append(h('i', { class: p.presence.look ? 'look' : busy(p) ? 'busy' : '', onclick: e => { e.stopPropagation(); AU.click(); openProfile(p); } }, String(p.presence.name || 'A fighter').slice(0, 20))));
}
// someone's stats: how long they've been on today and in total, matches, wins, takedowns
// a small person icon that opens someone's profile, shown beside Invite / Join
function profileBtn(p) {
  const b = h('button', { class: 'profbtn', title: 'View profile', 'aria-label': `View ${String(p.presence && p.presence.name || 'player')}'s profile`, onclick: e => { e.stopPropagation(); AU.click(); openProfile(p); } });
  b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
  return b;
}
function openProfile(p, back) {
  const P = (p && p.presence) || {}, R = P.pr || {};
  const name = String(P.name || 'A fighter').slice(0, 20);
  const rate = R.m ? Math.round(100 * (R.w || 0) / R.m) + '%' : '–';
  const rows = [['Rank', R.lv ? `${R.rank || rankOf(R.lv)}, level ${R.lv}` : '–'], ['Online now for', R.on ? fmtDur((Date.now() - R.on) / 1000) : '–'], ['Total time played', R.t != null ? fmtDur(R.t) : '–'], ['Matches', R.m ?? '–'], ['Wins', R.w ?? '–'], ['Win rate', rate], ['Takedowns', R.td ?? '–'], ['Clean hits', R.hits ?? '–'], ['Rumbles won', R.rw ?? '–'], ['Achievements', R.ach ?? '–'], ['Favourite weapon', R.wpn || '–'], ['Club', R.club || '–'], ['Right now', P.st || '–']];
  const B = R.bos; // their BuhurtOS account and real record, if they signed in with it
  const bosHtml = B ? `<div class="bosrec"><b><span class="bostick">✓</span> BuhurtOS: ${escTxt(B.name)}</b><span>${B.linked ? `${B.team ? escTxt(B.team) + ' · ' : ''}${B.m} real matches, ${B.w} wins${B.l ? ', ' + B.l + ' losses' : ''}${B.g ? ' · ' + B.g + ' gold' : ''}${B.p ? ' · ' + B.p + ' podiums' : ''}${B.tv ? ' · ' + B.tv + ' tournaments won' : ''}` : 'Signed in, no fighter record linked yet'}</span></div>` : '';
  const canJoin = /^[A-Z]{4}$/.test(String(P.look || ''));
  const btns = [];
  if (canJoin) btns.push(['Join their lobby', () => joinLobby(P.look), true]);
  else if (p && p.peer && LOBBY.peers.includes(p)) btns.push(['Invite to a fight', () => sendInvite(p), true]);
  if (p && p.peer && CAREER.guild && LOBBY.peers.includes(p) && !(P.gd && P.gd.id === CAREER.guild.id)) btns.push([`Invite to [${CAREER.guild.tag}]`, () => { guildInvite(p); }]);
  btns.push(['Back', back || (() => (NET.room && !ONL.inMatch ? renderLobby() : openOnlineHub()))]);
  msg('player', (B ? '✓ ' : '') + name, `${bosHtml}<div class="profgrid">${rows.map(([k, v]) => `<span>${k}</span><b>${escTxt(v)}</b>`).join('')}</div>${p && p.guest ? '<p class="muted small">Guest player</p>' : ''}`, btns);
}
// a profile for someone in a lobby: use their global-list entry if we can find it, else what the lobby knows
function openProfileByUid(uid, x) {
  if (x && x.me) { openProfile({ presence: { name: myName(), st: lobbyStatus(), pr: myProfile() } }); return; }
  const p = LOBBY.peers.find(q => q.presence && q.presence.name === x.name);
  openProfile(p || { presence: { name: x.name, st: 'in your lobby', pr: null } });
}
// someone invited you: answer now if you're in the menus, or as soon as the fight in progress is over
function showInvite() {
  const P = LOBBY.pending; if (!P) return;
  if ((G.phase === 'fight' && !G.attract && !G.paused) || NET.on) { toast(`${P.from} wants to fight you online`, 'big', 'Answer after this fight'); return; }
  LOBBY.pending = null; AU.cheer && AU.cheer(0.5);
  msg('invite', `${escTxt(P.from)} invited you!`, `<p><b>${escTxt(P.from)}</b> invited you to their lobby. Pick your side and kit there.</p>`,
    [['Join', () => joinLobby(P.code), true], ['No thanks', openOnlineHub]]);
}
// ---- Find a match: join an open lobby, or open one and wait for others
async function findMatch() {
  AU.click(); await initLobby();
  const open = LOBBY.peers.filter(p => /^[A-Z]{4}$/.test(String(p.presence.look || '')) && !/online fight/.test(String(p.presence.st || '')));
  if (open.length) { joinLobby(open[0].presence.look); return; }
  await hostLobby(true);
}
function stopSearch() { MM.searching = false; }
// ---- the Play online screen
async function openInvite() { return openOnlineHub(); }
async function openOnlineHub() {
  AU.init(); initLobby();
  if (NET.room && !ONL.inMatch) { renderLobby(); return; } // already in a lobby: go back to it
  msg('play online', 'Play online', `
    <div id="bosBox" class="bosbox"></div>
    <div class="hubbtns"><button class="btn primary flagtape big" id="mmFind">Find a match</button><button class="btn tape big" id="mkLobby">Make a lobby</button></div>
    <p class="muted small">Find a match puts you in an open lobby with whoever's looking. Make a lobby to invite friends, pick teams and add bots.</p>
    <h4 class="invh">Playing now <span class="muted small">(tap a name for their stats)</span></h4>
    <div id="inviteList" class="invlist"></div>
    <div class="invrow2">
      <label class="runcode"><span>Have a code?</span><input id="netCode2" maxlength="4" placeholder="ABCD" autocomplete="off"></label>
      <button class="btn tape" id="invJoin">Join</button>
    </div>
    <label class="runcode invname"><span>Your name</span><input id="lobbyName" maxlength="20" autocomplete="off" value="${escTxt(myName() === 'A fighter' ? '' : myName())}" placeholder="What other players see"></label>`,
    [['Back', toTitle]]);
  $('#mmFind').onclick = findMatch;
  $('#mkLobby').onclick = () => { AU.click(); hostLobby(false); };
  $('#invJoin').onclick = () => { const c = ($('#netCode2').value || '').trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(c)) { toastMenu('Codes are four letters.'); return; } joinLobby(c); };
  const nm = $('#lobbyName'); if (nm) nm.onchange = () => { store.set('lobbyName', nm.value.trim().slice(0, 20)); lobbySet({ name: myName() }); };
  renderInviteList(); renderBosBox();
}
function renderInviteList() {
  const box = $('#inviteList'); if (!box) return;
  box.innerHTML = '';
  if (!LOBBY.ready) { box.append(h('p', { class: 'muted' }, 'Looking for players…')); return; }
  const list = LOBBY.peers.slice().sort((a, b) => (b.presence.look ? 1 : 0) - (a.presence.look ? 1 : 0));
  if (!list.length) { box.append(h('p', { class: 'muted' }, 'Nobody else is online right now. Make a lobby and send a friend the link.')); return; }
  for (const p of list) {
    const P = p.presence, R = P.pr || {}, open = /^[A-Z]{4}$/.test(String(P.look || '')), busy = /online fight/.test(String(P.st || ''));
    const btn = busy ? h('span', { class: 'muted small' }, 'busy')
      : open ? h('button', { class: 'btn primary flagtape small', onclick: () => { AU.click(); joinLobby(P.look); } }, 'Join')
        : h('button', { class: 'btn ' + (LOBBY.invited === p.peer ? 'tape' : 'primary flagtape') + ' small', onclick: () => sendInvite(p) }, LOBBY.invited === p.peer ? 'Invited ✓' : 'Invite');
    const sub = `${String(P.st || '').slice(0, 30)}${R.on ? ' · on ' + fmtDur((Date.now() - R.on) / 1000) : ''}${R.m != null ? ' · ' + R.w + ' wins' : ''}`;
    box.append(h('div', { class: 'invrow' + (open ? ' looking' : '') }, h('button', { class: 'invwho linkish', onclick: () => { AU.click(); openProfile(p); } }, h('b', null, (R.bos ? '✓ ' : '') + String(P.name).slice(0, 20)), h('small', null, sub)), h('span', { class: 'invacts' }, profileBtn(p), btn)));
  }
}
// inviting someone opens your lobby (if you haven't one) and sends them its code
async function sendInvite(p) {
  AU.click(); await initLobby();
  if (!(NET.room && NET.role === 'host')) { const ok = await hostLobby(false); if (!ok) return; }
  LOBBY.invited = p.peer;
  lobbySet({ name: myName(), invite: { to: p.peer, code: NET.code, t: Date.now() } });
  toastMenu(`Invite sent to ${String(p.presence.name).slice(0, 20)}`);
  if (G.screen === 'msgScr' && $('#lobTeams')) renderLobbyInvite(); else renderLobby();
}
async function shareInvite() {
  if (!NET.code) return;
  const link = inviteUrl(NET.code);
  const text = link ? `Come fight in BUHURT: Steel & Tape! Tap to join my lobby: ${link}` : `Come fight in BUHURT: Steel & Tape! Open ${GAME_URL} , tap Play online and join with code ${NET.code}`;
  try { if (navigator.share) { await navigator.share({ title: 'BUHURT lobby', text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toastMenu('Invite copied. Paste it in a message to your friend.'); } catch (e) { toastMenu(`Tell your friend the code ${NET.code}`); }
}
