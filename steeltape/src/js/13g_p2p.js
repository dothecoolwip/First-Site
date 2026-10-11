// ---------- online play anywhere: a peer-to-peer stand-in for Claude's room, used when that room isn't available ----------
// Same small API as the room (presence, onPeers, peers, join, leave), carried over WebRTC with PeerJS's free public
// matchmaker. join('duel-abcd'): the first one in claims the name and waits; the second finds it and connects.
// There is no lobby list this way, so friends join with the code or the link.
const P2P = { p: null };
function loadPeerLib() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (P2P.p) return P2P.p;
  const urls = ['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js', 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  P2P.p = new Promise((res, rej) => {
    const next = i => {
      if (i >= urls.length) { P2P.p = null; rej(new Error('Could not load the online library')); return; }
      const s = document.createElement('script'); s.src = urls[i]; s.async = true;
      s.onload = () => window.Peer ? res(window.Peer) : next(i + 1); s.onerror = () => next(i + 1); document.head.append(s);
    };
    next(0);
  });
  return P2P.p;
}
function p2pRoom() {
  return { p2p: true, presence: () => Promise.resolve(), onPeers: () => () => { }, peers: () => [], emit: () => Promise.resolve(), on: () => () => { }, join: name => p2pJoin(name), leave() { } };
}
// A room for up to 20: the first one in claims the code's peer name and becomes the hub of a star; everyone else
// connects to it. The hub forwards its own presence to all, and a slimmed copy of everyone's presence (no inputs,
// no snapshots) so every page can show the whole lobby.
async function p2pJoin(name) {
  const Peer = await loadPeerLib();
  const id = 'buhurt-steel-tape-' + String(name).toLowerCase().replace(/[^a-z0-9-]/g, '');
  let mine = {}, peer = null, isHub = false, hubConn = null, hubP = {}, others = {}, myId = null, relayT = 0;
  const conns = {}, pres = {}, subs = [];
  const view = (pid, me, p) => ({ peer: pid, isMe: me, sameTab: me, kind: 'viewer', guest: false, by: null, presence: p || {}, updatedAt: Date.now() });
  const slim = p => { if (!p) return {}; const o = {}; for (const k in p) if (k !== 'vin' && k !== 's' && k !== 'mk' && k !== 'ev' && k !== 'm') o[k] = p[k]; return o; };
  const snap = () => {
    const out = [view(myId || 'me', true, mine)];
    if (isHub) for (const pid in pres) out.push(view(pid, false, pres[pid]));
    else { if (hubConn && hubConn.open) out.push(view(hubConn.peer, false, hubP)); for (const pid in others) if (pid !== myId && (!hubConn || pid !== hubConn.peer)) out.push(view(pid, false, others[pid])); }
    return out;
  };
  const notify = (left = []) => { const peers = snap(); subs.slice().forEach(f => { try { f({ peers, joined: [], left, updated: [] }); } catch (e) { } }); };
  const relay = () => { if (relayT) return; relayT = setTimeout(() => { relayT = 0; const m = {}; for (const pid in pres) m[pid] = slim(pres[pid]); m[myId] = slim(mine); for (const pid in conns) { const c = conns[pid]; if (c.open) try { c.send({ t: 'r', m }); } catch (e) { } } }, 200); };
  peer = await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 15000);
    const host = new Peer(id, { debug: 0 });
    host.on('open', () => {
      clearTimeout(t); isHub = true; myId = id;
      host.on('connection', c => {
        if (Object.keys(conns).length >= 19) { c.on('open', () => { try { c.send({ t: 'full' }); c.close(); } catch (e) { } }); return; } // 20 people at most
        conns[c.peer] = c;
        c.on('open', () => { try { c.send({ t: 'p', p: mine }); } catch (e) { } relay(); });
        c.on('data', m => { if (m && m.t === 'p') { const first = !pres[c.peer]; pres[c.peer] = m.p || {}; notify(); if (first || !m.p.vin) relay(); } });
        const gone = () => { if (!conns[c.peer]) return; delete conns[c.peer]; const had = pres[c.peer]; delete pres[c.peer]; notify([view(c.peer, false, had || {})]); relay(); };
        c.on('close', gone); c.on('error', gone);
      });
      res(host);
    });
    host.on('error', e => {
      if (e && e.type === 'unavailable-id') { // someone holds this code already: join them
        try { host.destroy(); } catch (er) { }
        const g = new Peer({ debug: 0 });
        g.on('open', gid => {
          clearTimeout(t); myId = gid; const c = g.connect(id, { reliable: true }); hubConn = c;
          c.on('open', () => { try { c.send({ t: 'p', p: mine }); } catch (er) { } notify(); });
          c.on('data', m => { if (!m) return; if (m.t === 'p') { hubP = m.p || {}; notify(); } else if (m.t === 'r') { others = m.m || {}; notify(); } else if (m.t === 'full') { toastMenu('That lobby is full (20 people).'); } });
          c.on('close', () => { const hp = hubP; hubConn = null; notify([view(id, false, hp)]); });
          c.on('error', () => { });
          res(g);
        });
        g.on('error', er => { clearTimeout(t); rej(er); });
      } else if (!isHub && !hubConn) { clearTimeout(t); rej(e); }
    });
  });
  return {
    p2p: true,
    presence(patch) {
      mine = { ...mine }; for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
      if (isHub) { for (const pid in conns) { const c = conns[pid]; if (c.open) try { c.send({ t: 'p', p: mine }); } catch (e) { } } if (!patch.s) relay(); }
      else if (hubConn && hubConn.open) { try { hubConn.send({ t: 'p', p: mine }); } catch (e) { } }
      return Promise.resolve();
    },
    onPeers(f) { subs.push(f); setTimeout(() => f({ peers: snap(), joined: snap(), left: [], updated: [] }), 0); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
    peers: snap, emit: () => Promise.resolve(), on: () => () => { },
    leave() { try { hubConn && hubConn.close(); } catch (e) { } for (const pid in conns) try { conns[pid].close(); } catch (e) { } try { peer && peer.destroy(); } catch (e) { } },
  };
}
// a link with #join=ABCD drops the friend straight into the host's fight
function checkJoinLink() {
  const m = /join=([A-Za-z]{4})/.exec(location.hash || '') || /[?&]join=([A-Za-z]{4})/.exec(location.search || '');
  if (!m) return;
  const code = m[1].toUpperCase();
  try { history.replaceState(null, '', location.pathname + location.search.replace(/[?&]join=[A-Za-z]{4}/, '')); } catch (e) { }
  setTimeout(() => { AU.init(); joinLobby(code); }, 800);
}
function inviteUrl(code) {
  const onClaude = /claude\.ai|claudeusercontent|anthropic/.test(location.hostname) || location.protocol === 'file:' || location.protocol === 'about:';
  return onClaude ? null : location.origin + location.pathname + '#join=' + code;
}

// ---- a lobby without a server: the first player online becomes the "hub" (a well-known peer name) and keeps the
// list of who's online; everyone else connects to it, sends their presence and gets the list back. If the hub's
// player leaves, the others notice the dropped connection and one of them takes over. Same API as the room.
const HUB_ID = 'buhurt-steel-tape-lobby-v1';
function p2pLobby() {
  let mine = {}, list = {}, myId = null, member = null, conn = null, hub = null, dead = false, fails = 0, schedT = 0;
  const hubConns = {}, hubMembers = {}, subs = [];
  let okRes, okRej; const ready = new Promise((a, b) => { okRes = a; okRej = b; }); setTimeout(() => okRej(new Error('timeout')), 10000);
  const view = () => Object.entries(list).map(([pid, p]) => ({ peer: pid, isMe: pid === myId, sameTab: pid === myId, kind: 'viewer', guest: false, by: null, presence: p || {}, updatedAt: Date.now() }));
  const notify = () => { const peers = view(); subs.slice().forEach(f => { try { f({ peers, joined: [], left: [], updated: [] }); } catch (e) { } }); };
  const sched = () => { if (schedT) return; schedT = setTimeout(() => { schedT = 0; for (const id in hubConns) { const c = hubConns[id]; if (c.open) try { c.send({ t: 'list', m: hubMembers }); } catch (e) { } } }, 250); };
  const becomeHub = Peer => new Promise(res => {
    const h = new Peer(HUB_ID, { debug: 0 }); let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    h.on('open', () => {
      hub = h;
      h.on('connection', c => {
        c.on('data', m => { if (m && m.t === 'p') { hubMembers[c.peer] = m.p || {}; hubConns[c.peer] = c; sched(); } });
        const gone = () => { delete hubMembers[c.peer]; delete hubConns[c.peer]; sched(); };
        c.on('close', gone); c.on('error', gone);
      });
      fin(true);
    });
    h.on('error', e => { if (e && e.type === 'unavailable-id') { try { h.destroy(); } catch (er) { } fin(false); } else fin(!!hub); });
    h.on('disconnected', () => { try { if (!h.destroyed) h.reconnect(); } catch (er) { } });
    setTimeout(() => fin(false), 8000);
  });
  const retry = () => {
    if (dead) return; conn = null; fails++;
    list = myId ? { [myId]: mine } : {}; notify();
    setTimeout(start, 500 + Math.random() * 1500 * Math.min(fails, 4));
  };
  const connectToHub = () => {
    const c = member.connect(HUB_ID, { reliable: true }); conn = c; let opened = false;
    const to = setTimeout(() => { if (!opened && conn === c) { try { c.close(); } catch (e) { } retry(); } }, 7000);
    c.on('open', () => { opened = true; clearTimeout(to); fails = 0; try { c.send({ t: 'p', p: mine }); } catch (e) { } });
    c.on('data', m => { if (m && m.t === 'list' && m.m && typeof m.m === 'object') { list = m.m; notify(); } });
    c.on('close', () => { if (conn === c) retry(); });
    c.on('error', () => { if (conn === c) { clearTimeout(to); retry(); } });
  };
  const start = async () => {
    if (dead) return;
    const Peer = await loadPeerLib();
    if (!hub) await becomeHub(Peer);
    if (!dead) connectToHub();
  };
  (async () => {
    try {
      const Peer = await loadPeerLib();
      member = new Peer({ debug: 0 });
      member.on('open', id => { myId = id; okRes(true); list = { [id]: mine }; notify(); start(); });
      member.on('disconnected', () => { try { if (!member.destroyed) member.reconnect(); } catch (e) { } });
      member.on('error', e => { if (!myId) okRej(e); });
    } catch (e) { okRej(e); }
  })();
  return {
    p2p: true, lobby: true, ready,
    presence(patch) { mine = { ...mine }; for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } if (myId) list = { ...list, [myId]: mine }; if (conn && conn.open) { try { conn.send({ t: 'p', p: mine }); } catch (e) { } } return Promise.resolve(); },
    onPeers(f) { subs.push(f); setTimeout(() => f({ peers: view(), joined: view(), left: [], updated: [] }), 0); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; },
    peers: view, emit: () => Promise.resolve(), on: () => () => { },
    join: name => p2pJoin(name),
    leave() { dead = true; try { conn && conn.close(); member && member.destroy(); hub && hub.destroy(); } catch (e) { } },
  };
}
