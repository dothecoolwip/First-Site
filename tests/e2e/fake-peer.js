// A stand-in for PeerJS (window.Peer) over BroadcastChannel, so the peer-to-peer path runs offline in tests.
module.exports = function installFakePeer() {
  const mk = () => { const h = {}; return { on(e, f) { (h[e] = h[e] || []).push(f); }, emit(e, ...a) { (h[e] || []).forEach(f => f(...a)); } }; };
  window.Peer = function (id) {
    const bus = new BroadcastChannel('fake-peerjs'); // one channel per peer, so peers in the same page hear each other
    const ev = mk(), self = this; const myId = typeof id === 'string' ? id : 'anon-' + Math.random().toString(36).slice(2, 9);
    const conns = {};
    self.id = myId; self.on = ev.on;
    const makeConn = (remote) => { const ce = mk(); const c = { peer: remote, open: false, on: ce.on, send(d) { bus.postMessage({ k: 'data', to: remote, from: myId, d }); }, close() { bus.postMessage({ k: 'close', to: remote, from: myId }); } }; c._e = ce; conns[remote] = c; return c; };
    bus.addEventListener('message', e => {
      const m = e.data;
      if (m.k === 'claim?' && m.id === myId && typeof id === 'string') bus.postMessage({ k: 'taken', id: myId, nonce: m.nonce });
      if (m.to !== myId) return;
      if (m.k === 'connect') { const c = makeConn(m.from); c.open = true; ev.emit('connection', c); setTimeout(() => c._e.emit('open'), 0); bus.postMessage({ k: 'accept', to: m.from, from: myId }); }
      if (m.k === 'accept' && conns[m.from]) { conns[m.from].open = true; conns[m.from]._e.emit('open'); }
      if (m.k === 'data' && conns[m.from]) conns[m.from]._e.emit('data', m.d);
      if (m.k === 'close' && conns[m.from]) { conns[m.from].open = false; conns[m.from]._e.emit('close'); }
    });
    self.connect = (remote) => { const c = makeConn(remote); setTimeout(() => bus.postMessage({ k: 'connect', to: remote, from: myId }), 0); return c; };
    self.destroy = () => { self.dead = true; self.destroyed = true; try { bus.close(); } catch (e) { } };
    // claim the id: if someone answers "taken" within 150 ms, fail like PeerJS does
    const nonce = Math.random(); let taken = false;
    const onTaken = e => { if (e.data.k === 'taken' && e.data.nonce === nonce) taken = true; };
    bus.addEventListener('message', onTaken);
    if (typeof id === 'string') bus.postMessage({ k: 'claim?', id: myId, nonce });
    setTimeout(() => { bus.removeEventListener('message', onTaken); if (taken) ev.emit('error', { type: 'unavailable-id' }); else ev.emit('open', myId); }, 150);
  };
};
