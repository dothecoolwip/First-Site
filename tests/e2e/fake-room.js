// A stand-in for the claude.ai `room` capability, so two pages in one browser context can find each other:
// presence and peers travel over BroadcastChannel. Same shape as the real API: presence, onPeers, peers, join, leave.
module.exports = function installFakeRoom() {
  const myPeer = 'p' + Math.random().toString(36).slice(2, 10);
  function makeRoom(name) {
    const ch = new BroadcastChannel('fake-room-' + name);
    const state = {}; let mine = {}; const subs = [];
    const snapshot = () => [{ peer: myPeer, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() },
      ...Object.entries(state).map(([peer, p]) => ({ peer, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: p, updatedAt: Date.now() }))];
    const notify = (left = []) => { const peers = snapshot(); subs.forEach(fn => fn({ peers, joined: [], left, updated: [] })); };
    ch.onmessage = e => { const m = e.data; if (m.t === 'p') { state[m.peer] = m.p; notify(); } else if (m.t === 'hello') { ch.postMessage({ t: 'p', peer: myPeer, p: mine }); } else if (m.t === 'bye') { const p = { peer: m.peer }; delete state[m.peer]; notify([p]); } };
    ch.postMessage({ t: 'hello' });
    return {
      presence(patch) { mine = { ...mine }; for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } ch.postMessage({ t: 'p', peer: myPeer, p: mine }); notify(); return Promise.resolve(); },
      onPeers(fn) { subs.push(fn); setTimeout(() => fn({ peers: snapshot(), joined: snapshot(), left: [], updated: [] }), 0); return () => subs.splice(subs.indexOf(fn), 1); },
      peers: snapshot,
      emit() { return Promise.resolve(); }, on() { return () => { }; },
      async join(n) { return makeRoom(name + '/' + n); },
      leave() { ch.postMessage({ t: 'bye', peer: myPeer }); ch.close(); },
    };
  }
  const lobby = makeRoom('lobby');
  window.claude = { use: async n => n === 'room' ? lobby : null };
};
