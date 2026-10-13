// ---------- sign in with BuhurtOS: your BuhurtOS account names you in the game and shows your real buhurt record ----------
// Uses BuhurtOS's own Supabase project with its public (publishable) key: row-level security there decides what a
// signed-in person may read (their own fighter link; public fighter records and career stats). Nothing is written.
const BOS_URL = 'https://mvbxlebznlgroptwwdsm.supabase.co';
const BOS_KEY = 'sb_publishable_u76M-dggKSsdsyhUQKveJg_5fPJ5Nan';
const BOS = { sb: null, p: null, user: null, info: null, testAdmin: false, otpEmail: '', booting: false, clientPromise: null, bootPromise: null, infoPromise: null, infoUid: null, infoReady: null, recovering: false, authTimer: null };
function loadSupabaseLib() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  if (BOS.p) return BOS.p;
  const urls = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];
  BOS.p = new Promise((res, rej) => {
    const next = i => {
      if (i >= urls.length) { BOS.p = null; rej(new Error('Could not load the BuhurtOS sign-in')); return; }
      const script = document.createElement('script'); script.src = urls[i]; script.async = true;
      let settled = false;
      const finish = ok => { if (settled) return; settled = true; clearTimeout(timer); if (ok && window.supabase) res(window.supabase); else { script.remove(); next(i + 1); } };
      const timer = setTimeout(() => finish(false), 6000);
      script.onload = () => finish(true); script.onerror = () => finish(false); document.head.append(script);
    };
    next(0);
  });
  return BOS.p;
}
// Bound network and SDK waits; callback tokens are never logged or persisted by us.
function bosTimeout(promise, label, ms = 15000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out. Check your connection and retry.')), ms); })]).finally(() => clearTimeout(timer));
}
async function bosFetch(input, options = {}) {
  const controller = new AbortController(), abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try { return await fetch(input, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
function bosCallback() {
  const url = new URL(location.href), hash = new URLSearchParams(url.hash.slice(1));
  const params = hash.has('access_token') || hash.has('error') ? hash : url.searchParams;
  const present = params.has('access_token') || params.has('code') || params.has('error');
  return { url, params, hash: params === hash, present };
}
function bosCleanCallback(callback) {
  if (!callback.present) return;
  // Preserve unrelated query parameters, route hashes and history state.
  for (const key of ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token', 'code', 'error', 'error_code', 'error_description', 'type']) callback.params.delete(key);
  if (callback.hash) callback.url.hash = callback.params.toString();
  history.replaceState(history.state, '', callback.url.href);
}
function bosRecovery(error) {
  BOS.booting = false; BOS.recovering = true; ONB.awaitingAuth = false;
  startupDone();
  msg('sign-in', 'Could not finish sign-in', '<p>' + escTxt(error.message || String(error)) + '</p><p>Your saved progress is still on this device.</p>',
    [['Retry', () => { BOS.recovering = false; BOS.bootPromise = null; BOS.infoReady = null; ONB.awaitingAuth = true; bosBoot(true); }, true],
      ['Back to sign-in', () => { BOS.recovering = false; openBosSignIn(onbAfterAccount); }]]);
}
async function bosClient() {
  if (BOS.sb) return BOS.sb;
  if (BOS.clientPromise) return BOS.clientPromise;
  BOS.clientPromise = (async () => {
    const lib = await bosTimeout(loadSupabaseLib(), 'Loading sign-in');
    // Retain the existing tab-session policy. Do not delete another stored login
    // as a side effect of merely constructing the client.
    const sb = lib.createClient(BOS_URL, BOS_KEY, { global: { fetch: bosFetch }, auth: {
      persistSession: true, storage: sessionStorage, autoRefreshToken: true,
      flowType: 'implicit', detectSessionInUrl: false, storageKey: 'buhurt-game-buhurtos' } });
    BOS.sb = sb;
    sb.auth.onAuthStateChange((evt, session) => {
      const previous = BOS.user;
      BOS.user = session ? session.user : null;
      if (previous?.id !== BOS.user?.id || evt === 'USER_UPDATED') BOS.infoReady = null;
      // Supabase holds its auth lock while dispatching this callback. All
      // profile/cloud/auth work runs in a later task, never inside that lock.
      clearTimeout(BOS.authTimer);
      BOS.authTimer = setTimeout(() => {
        if (BOS.user) {
          if (previous && previous.id !== BOS.user.id) { creatorReset(); BOS.testAdmin = false; if (typeof playtestAuthReset === 'function') playtestAuthReset(); }
          if (!BOS.booting && !BOS.recovering) bosLoadInfo().catch(bosRecovery);
        } else {
          creatorReset(); BOS.testAdmin = false;
          if (typeof playtestAuthReset === 'function') playtestAuthReset();
          if (typeof testAdminRefresh === 'function') testAdminRefresh();
          if (typeof cloudOnSignOut === 'function') cloudOnSignOut();
          BOS.info = null; bosApply();
          if (evt === 'SIGNED_OUT' && previous && onbAccountRequired()) {
            if (typeof TOWN !== 'undefined' && TOWN.on) leaveTown(() => toTitle({ home: true }));
            else toTitle();
          }
        }
      }, 0);
    });
    return sb;
  })().catch(error => { BOS.clientPromise = null; throw error; });
  return BOS.clientPromise;
}
// Handle the explicitly configured implicit callback once. Also accept an
// existing PKCE code return, without letting the SDK exchange it a second time.
function bosBoot(force = false) {
  if (BOS.bootPromise) return BOS.bootPromise;
  const callback = bosCallback(), intent = onbReadAuthReturn();
  let saved = false; try { saved = !!sessionStorage.getItem('buhurt-game-buhurtos'); } catch (e) { }
  if (!force && !saved && !callback.present && !intent) return Promise.resolve();
  BOS.booting = true; BOS.recovering = false; ONB.awaitingAuth = true;
  BOS.bootPromise = (async () => {
    try {
      if (callback.params.has('error')) throw Error(callback.params.get('error_description') || callback.params.get('error'));
      const sb = await bosClient();
      let result;
      if (callback.params.has('access_token')) {
        if (!callback.params.get('refresh_token')) throw Error('The sign-in return was incomplete. Please sign in again.');
        result = await bosTimeout(sb.auth.setSession({ access_token: callback.params.get('access_token'), refresh_token: callback.params.get('refresh_token') }), 'Restoring sign-in');
      } else if (callback.params.has('code')) result = await bosTimeout(sb.auth.exchangeCodeForSession(callback.params.get('code')), 'Completing sign-in');
      else result = await bosTimeout(sb.auth.getSession(), 'Restoring sign-in');
      if (result.error) throw result.error;
      const session = result.data?.session;
      if (!session) throw Error('Sign-in was cancelled or the session expired. Please sign in again.');
      BOS.user = session.user;
      // Clean before cloud restoration: its one intentional reload must not
      // replay a token or a single-use authorization code.
      bosCleanCallback(callback);
      await bosLoadInfo();
      if (CLOUD.applying) return;
      BOS.booting = false;
      onbResumeAfterAuth();
    } catch (error) { bosCleanCallback(callback); bosRecovery(error); }
    finally { BOS.booting = false; }
  })();
  return BOS.bootPromise;
}
async function bosOAuth(provider, say) {
  if (BOS.oauthOpening) return;
  BOS.oauthOpening = true; say('Opening ' + provider + '…');
  try {
    onbSaveAuthReturn();
    const { error } = await bosTimeout((await bosClient()).auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }), 'Opening ' + provider);
    if (error) throw error;
  } catch (error) { say('Couldn’t open ' + provider + ': ' + (error.message || error)); }
  finally { BOS.oauthOpening = false; }
}
function bosLoadInfo() {
  const uid = BOS.user?.id;
  if (!uid) return Promise.resolve();
  if (BOS.infoPromise && BOS.infoUid === uid) return BOS.infoPromise;
  if (BOS.infoReady === uid) return Promise.resolve();
  BOS.infoUid = uid;
  const promise = bosLoadInfoOnce().then(() => { if (BOS.user?.id === uid && !CLOUD.applying) BOS.infoReady = uid; });
  BOS.infoPromise = promise.finally(() => { if (BOS.infoPromise === done) BOS.infoPromise = null; });
  const done = BOS.infoPromise;
  return done;
}
async function bosLoadInfoOnce() {
  const sb = BOS.sb, u = BOS.user; if (!sb || !u) return;
  // Fetch the user from Auth instead of trusting editable local session data.
  // If Auth is temporarily offline, preserve the existing offline-save flow,
  // but never grant testing powers from an unverified cached session.
  let verifiedUser = null;
  try {
    const verified = await bosTimeout(sb.auth.getUser(), 'Verifying your account');
    if (!verified.error) verifiedUser = verified.data && verified.data.user;
  } catch (e) { }
  if (!BOS.user || BOS.user.id !== u.id || (verifiedUser && verifiedUser.id !== u.id)) return;
  if (verifiedUser) BOS.user = verifiedUser;
  BOS.creator = !!(verifiedUser && verifiedUser.email_confirmed_at && verifiedUser.email?.trim().toLowerCase() === 'garrettrobson95@gmail.com');
  BOS.creatorUser = BOS.creator ? verifiedUser.id : null;
  if (!BOS.creator) CREATOR_IDENTITY.proofs = {};
  creatorIssue(); creatorRefreshCharacters();
  BOS.testAdmin = !!(verifiedUser && verifiedUser.app_metadata?.steel_tape_test_admin === true);
  if (BOS.testAdmin && typeof playtestResume === 'function') playtestResume();
  // Do not leave a verified test administrator at the local save's old level
  // while cloud reconciliation is still awaiting a network response.
  if (BOS.testAdmin && typeof testAdminApply === 'function') testAdminApply();
  if (typeof testAdminRefresh === 'function') testAdminRefresh();
  // Load this user's complete Steel & Tape save before applying their BuhurtOS profile name.
  // Cloud saves may require an explicit conflict choice; gameplay is never silently overwritten.
  if (typeof cloudOnAuth === 'function') await cloudOnAuth(u.id);
  // cloudRestore has written the remote save and requested a reload. Do not
  // write the old in-memory CAREER back over it while navigation is pending.
  if (typeof CLOUD !== 'undefined' && CLOUD.applying) return;
  if (!BOS.user || BOS.user.id !== u.id) return;
  if (BOS.testAdmin && typeof testAdminApply === 'function') testAdminApply();
  const info = { name: '', team: '', fighter: null, gender: null, m: 0, w: 0, l: 0, golds: 0, podiums: 0, wins_t: 0 };
  try { const { data } = await bosTimeout(sb.from('profiles').select('display_name').eq('id', u.id).maybeSingle(), 'Loading your profile'); if (data && data.display_name) info.name = data.display_name; } catch (e) { }
  try {
    const { data: link } = await bosTimeout(sb.from('fighter_accounts').select('fighter_id').eq('user_id', u.id).limit(1).maybeSingle(), 'Loading your fighter record');
    if (link && link.fighter_id) {
      info.fighter = link.fighter_id;
      const { data: dir } = await bosTimeout(sb.from('fighter_directory').select('display_name, team_name, gender').eq('id', link.fighter_id).maybeSingle(), 'Loading your fighter record');
      if (dir) { info.name = dir.display_name || info.name; info.team = dir.team_name || ''; info.gender = dir.gender || null; }
      const { data: st } = await bosTimeout(sb.from('fighter_career_stats').select('matches, wins, losses, golds, podiums, tournament_victories').eq('fighter_id', link.fighter_id).maybeSingle(), 'Loading your fighter record');
      if (st) Object.assign(info, { m: st.matches || 0, w: st.wins || 0, l: st.losses || 0, golds: st.golds || 0, podiums: st.podiums || 0, wins_t: st.tournament_victories || 0 });
    }
  } catch (e) { }
  if (!info.name) info.name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || '').split('@')[0];
  BOS.info = info; bosApply();
  if (typeof testAdminRefresh === 'function') testAdminRefresh();
  if (typeof eventIdentify === 'function') eventIdentify(); // claim this device's earlier guest sessions only after verified sign-in
  if (!BOS.booting && !BOS.interactive) onbResumeAfterAuth();
}
// your BuhurtOS name becomes your fighter's name; everyone online sees the BuhurtOS tick and your real record
function bosApply() {
  const I = BOS.info;
  if (I && I.name) { CAREER.name = String(I.name).slice(0, 20); saveCareer(); }
  try { lobbySet({ name: myName(), pr: myProfile() }); } catch (e) { }
  try { if (NET.room && !ONL.inMatch) NET.room.presence({ name: myName(), bos: !!I }); } catch (e) { }
  const t = $('#bosStatus'); if (t) t.textContent = I ? `Signed in with BuhurtOS as ${I.name}` : 'Not signed in';
  if (G.screen === 'msgScr' && $('#bosBox')) renderBosBox();
}
function bosRecord() { const I = BOS.info; return I && rosterEligible(I.fighter) ? { id: I.fighter, name: I.name, team: I.team, m: I.m, w: I.w, l: I.l, g: I.golds, p: I.podiums, tv: I.wins_t, linked: !!I.fighter } : null; }
// the sign-in box (shown in Play online and Settings)
function renderBosBox() {
  const box = $('#bosBox'); if (!box) return; box.innerHTML = '';
  const I = BOS.info;
  if (I) {
    box.append(h('div', { class: 'bosme' }, h('span', { class: 'bostick' }, '✓'), h('div', null, h('b', null, I.name), h('small', null, rosterEligible(I.fighter) ? `${I.team ? I.team + ' · ' : ''}${I.m} matches, ${I.w} wins${I.golds ? ', ' + I.golds + ' gold' : ''} on BuhurtOS` : 'BuhurtOS account (no fighter linked yet)'))),
      h('button', { class: 'btn tape small', onclick: async () => { AU.click(); if (typeof presenceOffline === 'function') presenceOffline(); try { await (await bosClient()).auth.signOut({ scope: 'local' }); } catch (e) { } BOS.user = null; BOS.info = null; creatorReset(); bosApply(); } }, 'Sign out'));
    return;
  }
  box.append(h('button', { class: 'btn primary flagtape bosbtn', onclick: () => { AU.click(); openBosSignIn(); } }, 'Sign in with BuhurtOS'));
}
function openBosSignIn(back) {
  const ret = back || (() => openOnlineHub());
  msg('buhurtos', 'Sign in with BuhurtOS', `<p>Use your BuhurtOS account. Your fighter name and real record show to other players.</p>
    <label class="runcode"><span>Email</span><input id="bosEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
    <label class="runcode"><span>Password</span><input id="bosPass" type="password" autocomplete="current-password"></label>
    <div class="bosalt"><button class="btn tape small" id="bosCode">Email me a sign-in code instead</button><button class="btn tape small" id="bosGoogle">Google</button><button class="btn tape small" id="bosDiscord">Discord</button></div>
    <p class="muted small" id="bosMsg"></p>`,
    [['Sign in', () => bosPassword(ret), true], ['Back', ret]]);
  const say = t => { const m = $('#bosMsg'); if (m) m.textContent = t; };
  $('#bosCode').onclick = async () => {
    const email = ($('#bosEmail').value || '').trim(); if (!email) { say('Type your email first.'); return; }
    say('Sending…');
    try { const { error } = await bosTimeout((await bosClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: false } }), 'Sending your email code'); if (error) throw error; BOS.otpEmail = email; openBosCode(ret); } catch (e) { say('Couldn’t send a code: ' + (e.message || e)); }
  };
  const oauth = provider => () => bosOAuth(provider, say);
  $('#bosGoogle').onclick = oauth('google'); $('#bosDiscord').onclick = oauth('discord');
}
async function bosPassword(ret) {
  const email = ($('#bosEmail').value || '').trim(), password = $('#bosPass').value || '', say = t => { const m = $('#bosMsg'); if (m) m.textContent = t; };
  if (!email || !password) { say('Type your email and password.'); return; }
  say('Signing in…'); BOS.interactive = true;
  try { const { data, error } = await bosTimeout((await bosClient()).auth.signInWithPassword({ email, password }), 'Signing in'); if (error) throw error; BOS.user = data.user; await bosLoadInfo(); if (CLOUD.applying) return; toastMenu(`Signed in as ${myName()}`); ret(); }
  catch (e) { say(/invalid/i.test(e.message || '') ? 'Wrong email or password. (Signed up with Google or Discord? Use those buttons.)' : 'Couldn’t sign in: ' + (e.message || e)); }
  finally { BOS.interactive = false; }
}
function openBosCode(ret) {
  msg('buhurtos', 'Check your email', `<p>We sent a sign-in email to <b>${escTxt(BOS.otpEmail)}</b>. Type the code from it here.</p>
    <label class="runcode"><span>Code</span><input id="bosOtp" inputmode="numeric" maxlength="10" autocomplete="one-time-code" placeholder="123456"></label>
    <p class="muted small" id="bosMsg">If the email only has a link, open it on this device instead.</p>`,
    [['Sign in', async () => {
      const token = ($('#bosOtp').value || '').trim(), say = t => { $('#bosMsg').textContent = t; };
      BOS.interactive = true;
      try { const { data, error } = await bosTimeout((await bosClient()).auth.verifyOtp({ email: BOS.otpEmail, token, type: 'email' }), 'Checking your email code'); if (error) throw error; BOS.user = data.user; await bosLoadInfo(); if (CLOUD.applying) return; toastMenu(`Signed in as ${myName()}`); ret(); } catch (e) { say('That code didn’t work: ' + (e.message || e)); } finally { BOS.interactive = false; }
    }, true], ['Back', () => openBosSignIn(ret)]]);
}

