// ---------- sign in with BuhurtOS: your BuhurtOS account names you in the game and shows your real buhurt record ----------
// Uses BuhurtOS's own Supabase project with its public (publishable) key: row-level security there decides what a
// signed-in person may read (their own fighter link; public fighter records and career stats). Nothing is written.
const BOS_URL = 'https://mvbxlebznlgroptwwdsm.supabase.co';
const BOS_KEY = 'sb_publishable_u76M-dggKSsdsyhUQKveJg_5fPJ5Nan';
const BOS = { sb: null, p: null, user: null, info: null, otpEmail: '' };
function loadSupabaseLib() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  if (BOS.p) return BOS.p;
  const urls = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];
  BOS.p = new Promise((res, rej) => {
    const next = i => { if (i >= urls.length) { BOS.p = null; rej(new Error('Could not load the BuhurtOS sign-in')); return; } const s = document.createElement('script'); s.src = urls[i]; s.async = true; s.onload = () => window.supabase ? res(window.supabase) : next(i + 1); s.onerror = () => next(i + 1); document.head.append(s); };
    next(0);
  });
  return BOS.p;
}
async function bosClient() {
  if (BOS.sb) return BOS.sb;
  const lib = await loadSupabaseLib();
  BOS.sb = lib.createClient(BOS_URL, BOS_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'buhurt-game-buhurtos' } });
  BOS.sb.auth.onAuthStateChange((evt, session) => {
    const previous = BOS.user;
    BOS.user = session ? session.user : null;
    if (BOS.user) bosLoadInfo();
    else {
      if (typeof cloudOnSignOut === 'function') cloudOnSignOut();
      BOS.info = null; bosApply();
      if (evt === 'SIGNED_OUT' && previous && typeof onbAccountRequired === 'function' && onbAccountRequired()) {
        // No guest gameplay is allowed after tutorial, including after a logout.
        setTimeout(() => {
          if (BOS.user) return;
          if (typeof TOWN !== 'undefined' && TOWN.on) leaveTown(() => toTitle({home:true}));
          else toTitle();
        }, 0);
      }
    }
  });
  return BOS.sb;
}
// on start: pick up a saved sign-in (or one coming back from Google / Discord) without loading anything otherwise
function bosBoot() {
  let saved = false; try { saved = !!localStorage.getItem('buhurt-game-buhurtos'); } catch (e) { }
  const back = /access_token=|[?&]code=/.test(location.hash + location.search);
  if (!saved && !back) return;
  bosClient().then(sb => sb.auth.getSession()).then(r => { const s = r && r.data && r.data.session; if (s) { BOS.user = s.user; bosLoadInfo(); } }).catch(() => { });
}
async function bosLoadInfo() {
  const sb = BOS.sb, u = BOS.user; if (!sb || !u) return;
  // Load this user's complete Steel & Tape save before applying their BuhurtOS profile name.
  // Cloud saves may require an explicit conflict choice; gameplay is never silently overwritten.
  if (typeof cloudOnAuth === 'function') await cloudOnAuth(u.id);
  if (!BOS.user || BOS.user.id !== u.id) return;
  const info = { name: '', team: '', fighter: null, m: 0, w: 0, l: 0, golds: 0, podiums: 0, wins_t: 0 };
  try { const { data } = await sb.from('profiles').select('display_name').eq('id', u.id).maybeSingle(); if (data && data.display_name) info.name = data.display_name; } catch (e) { }
  try {
    const { data: link } = await sb.from('fighter_accounts').select('fighter_id').eq('user_id', u.id).limit(1).maybeSingle();
    if (link && link.fighter_id) {
      info.fighter = link.fighter_id;
      const { data: dir } = await sb.from('fighter_directory').select('display_name, team_name').eq('id', link.fighter_id).maybeSingle();
      if (dir) { info.name = dir.display_name || info.name; info.team = dir.team_name || ''; }
      const { data: st } = await sb.from('fighter_career_stats').select('matches, wins, losses, golds, podiums, tournament_victories').eq('fighter_id', link.fighter_id).maybeSingle();
      if (st) Object.assign(info, { m: st.matches || 0, w: st.wins || 0, l: st.losses || 0, golds: st.golds || 0, podiums: st.podiums || 0, wins_t: st.tournament_victories || 0 });
    }
  } catch (e) { }
  if (!info.name) info.name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || '').split('@')[0];
  BOS.info = info; bosApply();
  if (typeof onbResumeAfterAuth === 'function') onbResumeAfterAuth();
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
function bosRecord() { const I = BOS.info; return I ? { name: I.name, team: I.team, m: I.m, w: I.w, l: I.l, g: I.golds, p: I.podiums, tv: I.wins_t, linked: !!I.fighter } : null; }
// the sign-in box (shown in Play online and Settings)
function renderBosBox() {
  const box = $('#bosBox'); if (!box) return; box.innerHTML = '';
  const I = BOS.info;
  if (I) {
    box.append(h('div', { class: 'bosme' }, h('span', { class: 'bostick' }, '✓'), h('div', null, h('b', null, I.name), h('small', null, I.fighter ? `${I.team ? I.team + ' · ' : ''}${I.m} matches, ${I.w} wins${I.golds ? ', ' + I.golds + ' gold' : ''} on BuhurtOS` : 'BuhurtOS account (no fighter linked yet)'))),
      h('button', { class: 'btn tape small', onclick: async () => { AU.click(); try { await (await bosClient()).auth.signOut(); } catch (e) { } BOS.user = null; BOS.info = null; bosApply(); } }, 'Sign out'));
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
    try { const { error } = await (await bosClient()).auth.signInWithOtp({ email, options: { shouldCreateUser: false } }); if (error) throw error; BOS.otpEmail = email; openBosCode(ret); } catch (e) { say('Couldn’t send a code: ' + (e.message || e)); }
  };
  const oauth = provider => async () => { say('Opening ' + provider + '…'); try { await (await bosClient()).auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); } catch (e) { say('Couldn’t open ' + provider + ': ' + (e.message || e)); } };
  $('#bosGoogle').onclick = oauth('google'); $('#bosDiscord').onclick = oauth('discord');
}
async function bosPassword(ret) {
  const email = ($('#bosEmail').value || '').trim(), password = $('#bosPass').value || '', say = t => { const m = $('#bosMsg'); if (m) m.textContent = t; };
  if (!email || !password) { say('Type your email and password.'); return; }
  say('Signing in…');
  try { const { data, error } = await (await bosClient()).auth.signInWithPassword({ email, password }); if (error) throw error; BOS.user = data.user; await bosLoadInfo(); toastMenu(`Signed in as ${myName()}`); ret(); }
  catch (e) { say(/invalid/i.test(e.message || '') ? 'Wrong email or password. (Signed up with Google or Discord? Use those buttons.)' : 'Couldn’t sign in: ' + (e.message || e)); }
}
function openBosCode(ret) {
  msg('buhurtos', 'Check your email', `<p>We sent a sign-in email to <b>${escTxt(BOS.otpEmail)}</b>. Type the code from it here.</p>
    <label class="runcode"><span>Code</span><input id="bosOtp" inputmode="numeric" maxlength="10" autocomplete="one-time-code" placeholder="123456"></label>
    <p class="muted small" id="bosMsg">If the email only has a link, open it on this device instead.</p>`,
    [['Sign in', async () => {
      const token = ($('#bosOtp').value || '').trim(), say = t => { $('#bosMsg').textContent = t; };
      try { const { data, error } = await (await bosClient()).auth.verifyOtp({ email: BOS.otpEmail, token, type: 'email' }); if (error) throw error; BOS.user = data.user; await bosLoadInfo(); toastMenu(`Signed in as ${myName()}`); ret(); } catch (e) { say('That code didn’t work: ' + (e.message || e)); }
    }, true], ['Back', () => openBosSignIn(ret)]]);
}
