// Steel & Tape testing powers only. BuhurtOS project administration is never granted here.
// The grant comes from Auth app_metadata, fetched with auth.getUser() after sign-in.
function testAdminApply(save = true) {
  if (typeof BOS === 'undefined' || !BOS.testAdmin) return;
  let changed = false;
  if (CAREER.level !== 100 || CAREER.xp !== 0) { CAREER.level = 100; CAREER.xp = 0; changed = true; }
  // Existing shops compare and subtract purse directly. Refill a generous test
  // balance on each save so buying anything never blocks this account.
  if (!Number.isFinite(CAREER.purse) || CAREER.purse < 100000000) { CAREER.purse = 1000000000; changed = true; }
  if (typeof skillsState === 'function') skillsState();
  if (changed && save) {
    if (typeof applyCosmeticUnlocks === 'function') applyCosmeticUnlocks();
    store.set('career', CAREER);
    if (typeof updateTitlePurse === 'function') updateTitlePurse();
  }
}
function testAdminRefresh() {
  const button = document.getElementById('townAdmin');
  if (button) button.hidden = !BOS.testAdmin;
  if (!BOS.testAdmin && typeof TOWN !== 'undefined') TOWN.testRunSpeed = 1;
  if (typeof townHudUpdate === 'function') townHudUpdate();
}
function testAdminTeleport(stall) {
  if (!BOS.testAdmin || !TOWN.on || !stall) return;
  if (!!stall.mine !== !!TOWN.mineOn) return;
  if (TOWN.spec) stopSpectating();
  if (typeof clearWaypoint === 'function') clearWaypoint();
  const pos = typeof freeNear === 'function' ? freeNear(stall.ax, stall.az) : [stall.ax, stall.az];
  TOWN.pos = { x: pos[0], z: pos[1] };
  TOWN.cam = null; TOWN.speed = 0; TOWN.winded = false; TOWN.stam = 1;
  if (typeof playtestAction === 'function') playtestAction('teleport', { destination: stall.V.name });
  closeVendor();
  toastMenu(`Teleported to ${stall.V.name}.`);
}
function openTestAdmin() {
  if (!BOS.testAdmin || !TOWN.on) return;
  townPanel('Test tools', box => {
    box.append(h('p', { class: 'muted' }, 'Game-only testing account: level 100, unlimited purchasing power, and endless village sprinting. These powers do not change BuhurtOS permissions.'));
    const recorderStatus = h('p', { class: 'muted small' }, playtestStatus());
    const recorder = h('div', { class: 'row townrow' });
    recorder.append(h('button', { class: 'btn primary flagtape small', onclick: () => playtestCapture() }, 'Take screenshot & note'));
    recorder.append(h('button', { class: 'btn tape small', onclick: async () => { if (PLAYTEST.id) await playtestStop(); else { PLAYTEST.stopped = false; await playtestStart(); } recorderStatus.textContent = playtestStatus(); } }, PLAYTEST.id ? 'Stop recording' : 'Start recording'));
    recorder.append(h('button', { class: 'btn tape small', onclick: () => { playtestFlush(); recorderStatus.textContent = playtestStatus(); } }, 'Sync now'));
    box.append(h('h3', null, 'Playtest recorder'), h('p', { class: 'muted small' }, 'Records your route every quarter second while moving, plus interactions. Screenshots and notes appear in the owner command post.'), recorderStatus, recorder);
    const speeds = h('div', { class: 'row townrow' });
    for (const value of [1, 1.5, 2, 3, 5]) {
      speeds.append(h('button', { class: 'btn tape small', onclick: () => {
        if (!BOS.testAdmin) return;
        TOWN.testRunSpeed = value;
        toastMenu(`Run speed ${value}×.`);
      } }, `${value}× speed`));
    }
    box.append(h('h3', null, 'Run speed'), speeds, h('h3', null, 'Teleport'));
    const places = TOWN.stalls.filter(s => !!s.mine === !!TOWN.mineOn && !s.player && !s.node && (!s.secret || secretFound(s.secret.key)));
    const list = h('div', { class: 'ups shop' });
    for (const stall of places) list.append(h('div', { class: 'up' },
      h('div', null, h('b', null, stall.V.name), h('div', { class: 'muted small' }, stall.V.role || 'Destination')),
      h('button', { class: 'btn primary flagtape small', onclick: () => testAdminTeleport(stall) }, 'Teleport')));
    box.append(list);
  });
}
