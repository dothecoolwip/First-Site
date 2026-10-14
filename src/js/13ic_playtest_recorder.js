// Super-admin playtest recorder. Samples the actual resolved position after collision.
const PLAYTEST = { id: null, starting: false, saving: false, stopped: false, pending: [], lastPoint: null, lastAt: 0, retryAt: 0, error: '', count: 0 };
const PLAYTEST_QUEUE_PREFIX = 'steeltape-playtest-queue:';
function playtestPersist() {
  if (!BOS.user?.id) return;
  try { localStorage.setItem(PLAYTEST_QUEUE_PREFIX + BOS.user.id, JSON.stringify({ id: PLAYTEST.id, pending: PLAYTEST.pending, count: PLAYTEST.count, stopped: PLAYTEST.stopped })); }
  catch (e) { PLAYTEST.error = 'Browser storage is full; keep this tab open until sync completes'; }
}
function playtestResume() {
  if (!BOS.testAdmin || !BOS.user?.id || PLAYTEST.id) return;
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYTEST_QUEUE_PREFIX + BOS.user.id) || 'null');
    if (!saved || !saved.id || !Array.isArray(saved.pending)) return;
    PLAYTEST.id = saved.id; PLAYTEST.pending = saved.pending.filter(e => e.owner_id === BOS.user.id && e.session_id === saved.id);
    PLAYTEST.count = Number(saved.count) || 0; PLAYTEST.stopped = !!saved.stopped;
    if (PLAYTEST.pending.length) playtestFlush();
  } catch (e) { }
}
function playtestPlace() {
  if (typeof TOWN === 'undefined' || !TOWN.on || !TOWN.pos) return { x: null, z: null, facing: null, zone: '' };
  return { x: +TOWN.pos.x.toFixed(3), z: +TOWN.pos.z.toFixed(3), facing: +TOWN.face.toFixed(3), zone: TOWN.mineOn ? 'Deep mine' : (TOWN.district || 'Realm') };
}
function playtestStatus() {
  return PLAYTEST.starting ? 'Starting recorder…' : PLAYTEST.error ? `Sync issue: ${PLAYTEST.error} · ${PLAYTEST.pending.length} points waiting` : PLAYTEST.id ? `Recording · ${PLAYTEST.count} points · ${PLAYTEST.pending.length} waiting to sync` : PLAYTEST.stopped ? 'Stopped for this visit' : 'Ready to record';
}
function playtestEntry(kind, detail) {
  if (!BOS.testAdmin || !PLAYTEST.id || (PLAYTEST.stopped && kind !== 'stop')) return;
  PLAYTEST.pending.push({ session_id: PLAYTEST.id, owner_id: BOS.user.id, at: new Date().toISOString(), kind, ...playtestPlace(), detail: detail || {} });
  PLAYTEST.count++;
  playtestPersist();
  if (PLAYTEST.pending.length >= 30) playtestFlush();
}
function playtestAction(kind, detail) { playtestEntry(kind, detail); }
function playtestAuthReset() {
  PLAYTEST.id = null; PLAYTEST.pending = []; PLAYTEST.lastPoint = null;
  PLAYTEST.starting = false; PLAYTEST.saving = false; PLAYTEST.stopped = false;
  PLAYTEST.error = ''; PLAYTEST.count = 0;
}
async function playtestStart() {
  if (!BOS.testAdmin || !BOS.user?.id || PLAYTEST.id || PLAYTEST.starting || !TOWN.on) return;
  PLAYTEST.starting = true; PLAYTEST.error = '';
  try {
    const sb = await bosClient();
    const { data, error } = await sb.from('steeltape_playtest_sessions').insert({ owner_id: BOS.user.id, build_version: window.BUILD_VER || '', device: navigator.userAgent.slice(0, 300) }).select('id').single();
    if (error) throw error;
    PLAYTEST.id = data.id; PLAYTEST.stopped = false; PLAYTEST.count = 0; PLAYTEST.lastPoint = null;
    playtestPersist();
    playtestEntry('start', { mode: TOWN.mineOn ? 'mine' : 'realm' });
    playtestFlush();
  } catch (e) { PLAYTEST.error = e.message || String(e); PLAYTEST.retryAt = Date.now() + 10000; }
  finally { PLAYTEST.starting = false; }
}
async function playtestFlush() {
  if (!BOS.testAdmin || !PLAYTEST.id || PLAYTEST.saving || !PLAYTEST.pending.length || Date.now() < PLAYTEST.retryAt) return;
  PLAYTEST.saving = true;
  const batch = PLAYTEST.pending.slice(0, 100);
  try {
    const { error } = await (await bosClient()).from('steeltape_playtest_entries').insert(batch);
    if (error) throw error;
    PLAYTEST.pending.splice(0, batch.length); PLAYTEST.error = '';
    playtestPersist();
    PLAYTEST.retryAt = 0;
  } catch (e) { PLAYTEST.error = e.message || String(e); PLAYTEST.retryAt = Date.now() + 10000; }
  finally { PLAYTEST.saving = false; }
  if (PLAYTEST.pending.length && !PLAYTEST.error) setTimeout(playtestFlush, 0);
}
function playtestTick() {
  if (!BOS.testAdmin || !TOWN.on) return;
  if (PLAYTEST.stopped) return;
  if (!PLAYTEST.id) { if (!PLAYTEST.stopped && !PLAYTEST.starting && Date.now() >= PLAYTEST.retryAt) playtestStart(); return; }
  const now = Date.now(), p = playtestPlace();
  if (now - PLAYTEST.lastAt < 250) return;
  const old = PLAYTEST.lastPoint;
  if (!old || Math.hypot(p.x - old.x, p.z - old.z) >= 0.25 || p.zone !== old.zone || now - PLAYTEST.lastAt >= 5000) {
    playtestEntry('position', { mounted: !!TOWN.mounted, sprinting: TOWN.speed > 4, autoWalk: !!TRAVEL.auto });
    PLAYTEST.lastPoint = p; PLAYTEST.lastAt = now;
  }
}
async function playtestStop() {
  if (!PLAYTEST.id) { PLAYTEST.stopped = true; return; }
  if (!PLAYTEST.stopped) playtestEntry('stop');
  PLAYTEST.stopped = true;
  playtestPersist();
  await playtestFlush();
  if (PLAYTEST.pending.length) { toastMenu('Recorder has unsynced points. Stay online and retry.'); return; }
  const { error } = await (await bosClient()).from('steeltape_playtest_sessions').update({ ended_at: new Date().toISOString() }).eq('id', PLAYTEST.id);
  if (error) { PLAYTEST.error = error.message; toastMenu('Could not finish session. Retry when online.'); return; }
  PLAYTEST.id = null; PLAYTEST.lastPoint = null; PLAYTEST.error = '';
  playtestPersist();
  toastMenu('Playtest saved.');
}
async function playtestCapture() {
  if (!BOS.testAdmin || !TOWN.on) return;
  if (!PLAYTEST.id) await playtestStart();
  if (!PLAYTEST.id) { toastMenu('Recorder could not start. Check your connection.'); return; }
  let blob;
  try {
    const renderer = W3.renderer;
    renderer.render(W3.scene, W3.camera);
    blob = await new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/jpeg', 0.88));
  } catch (e) { }
  if (!blob) { toastMenu('Could not capture the game view.'); return; }
  const position = playtestPlace(), captureAt = new Date().toISOString();
  const sessionId = PLAYTEST.id, noteId = crypto.randomUUID();
  const path = `${BOS.user.id}/${sessionId}/${noteId}.jpg`;
  let screenshotUploaded = false;
  const previewUrl = URL.createObjectURL(blob);
  townPanel('Screenshot note', box => {
    const preview = h('img', { src: previewUrl, alt: 'Captured game view', style: 'width:100%;max-height:42vh;object-fit:contain;background:#111' });
    const textarea = h('textarea', { rows: '5', maxlength: '4000', placeholder: 'What looks wrong here? What should change?' });
    const status = h('p', { class: 'muted small' }, `X ${position.x}, Z ${position.z} · ${position.zone}`);
    const save = h('button', { class: 'btn primary flagtape small', onclick: async () => {
      const body = textarea.value.trim();
      if (!body) { status.textContent = 'Write a note before saving.'; return; }
      save.disabled = true; status.textContent = 'Uploading screenshot and note…';
      try {
        const sb = await bosClient();
        if (!screenshotUploaded) {
          const uploaded = await sb.storage.from('steeltape-playtest').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (uploaded.error) throw uploaded.error;
          screenshotUploaded = true;
        }
        const { error } = await sb.from('steeltape_playtest_notes').insert({ id: noteId, session_id: sessionId, owner_id: BOS.user.id, at: captureAt, ...position, body, screenshot_path: path });
        if (error) throw error;
        playtestEntry('note', { noteId });
        URL.revokeObjectURL(previewUrl); closeVendor(); toastMenu('Screenshot and note saved to the admin panel.');
      } catch (e) { status.textContent = 'Save failed: ' + (e.message || e) + '. Try again.'; save.disabled = false; }
    } }, 'Save screenshot & note');
    box.append(preview, status, textarea, save);
  });
}
setInterval(playtestFlush, 5000);
window.addEventListener('online', playtestFlush);
window.addEventListener('pagehide', () => { if (PLAYTEST.id && PLAYTEST.pending.length) playtestFlush(); });
