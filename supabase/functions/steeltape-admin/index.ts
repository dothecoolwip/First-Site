// Owner-only analytics for Steel & Tape. BuhurtOS account totals are explicitly separate from game players.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
const OWNER_ID = '8c40a519-d188-4779-ab4c-88ef4b939e07';
const OWNER_EMAIL = 'garrettrobson95@gmail.com';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'content-type, apikey, authorization', 'Access-Control-Allow-Methods':'GET, POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type':'application/json', 'Cache-Control':'no-store' } });
const cutoff = (days: number) => Date.now() - days * 86400000;
const isAfter = (date: string | null | undefined, when: number) => !!date && new Date(date).getTime() >= when;
type Player = { player_key: string; uid: string | null; claimed_uid: string | null; visitor_id: string | null; name: string; first_seen: string; last_seen: string; last_active: string; sessions: number; matches: number; wins: number; bug_reports: number; feature_ideas: number; last_device: string; last_level: number | null; account_created_at: string | null };
type Event = { id: number; kind: string; uid: string | null; name: string; data: Record<string, unknown>; ua: string; at: string };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error:'method' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, token = req.headers.get('authorization') || '';
  if (!token.startsWith('Bearer ')) return json({ error:'sign in' }, 401);
  let email = '';
  try {
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization:token } }, auth:{ persistSession:false } });
    const { data, error } = await auth.auth.getUser(token.slice(7));
    if (error) return json({ error:'invalid session' }, 401);
    email = (data.user?.email || '').trim().toLowerCase();
    if (data.user?.id !== OWNER_ID || email !== OWNER_EMAIL || !data.user.email_confirmed_at || data.user.is_anonymous === true) return json({ error:'not an admin' }, 403);
  } catch { return json({ error:'invalid session' }, 401); }
  const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth:{ persistSession:false } });
  if (req.method === 'POST') {
    let body: { action?: string; id?: number } = {};
    try { body = await req.json(); } catch { return json({ error:'invalid JSON' }, 400); }
    if (body.action !== 'resolve' || !Number.isSafeInteger(body.id) || (body.id || 0) < 1) return json({ error:'invalid action' }, 400);
    const { data: row, error: readError } = await sb.from('steeltape_events').select('kind,data').eq('id', body.id).maybeSingle();
    if (readError) return json({ error:'report read failed' }, 503);
    if (!row || !['bug','feature'].includes(row.kind)) return json({ error:'report not found' }, 404);
    const prev = row.data && typeof row.data === 'object' ? row.data : {};
    const { error } = await sb.from('steeltape_events').update({ data:{ ...prev, resolved:!prev.resolved } }).eq('id', body.id);
    if (error) return json({ error:'report update failed' }, 503);
    return json({ ok:true });
  }
  try {
    const allPlayers: Player[] = [], E: Event[] = [];
    let offset = 0;
    for (let page = 0; page < 100; page++) {
      const { data, error } = await sb.from('steeltape_players').select('player_key,uid,claimed_uid,visitor_id,name,first_seen,last_seen,last_active,sessions,matches,wins,bug_reports,feature_ideas,last_device,last_level,account_created_at').order('last_active',{ ascending:false }).range(offset, offset + 999);
      if (error) throw error;
      allPlayers.push(...(data || []) as Player[]);
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
    const since = new Date(cutoff(30)).toISOString();
    let eventsTruncated = false;
    for (let page = 0; page < 50; page++) {
      const { data, error } = await sb.from('steeltape_events').select('id,kind,uid,name,data,ua,at').gte('at', since).order('at',{ascending:false}).range(page*1000, page*1000+999);
      if (error) throw error;
      E.push(...(data || []) as Event[]);
      if (!data || data.length < 1000) break;
      if (page === 49) eventsTruncated = true;
    }
    // The owner dashboard needs totals, not a list of people's auth records.
    // Supabase admin.listUsers fails on this project, so use a read-only service-role RPC.
    const [{ data: throne, error: thError }, { count: total, error: countError }, { data: accountCounts, error: accountCountsError }] = await Promise.all([
      sb.from('steeltape_throne').select('seat,holder_name,since,challenges'),
      sb.from('steeltape_events').select('id',{count:'exact',head:true}),
      sb.rpc('steeltape_platform_account_counts')
    ]);
    if (thError || countError || accountCountsError) throw thError || countError || accountCountsError;
    const platformTotal = Number(accountCounts?.total || 0);
    const platformNew30 = Number(accountCounts?.new30 || 0);
    // Lifetime measured playtime is tracked separately from event counts.
    // Fetch all account totals; no historical time is invented for old events.
    const playSecondsByAccount = new Map<string,number>();
    for (let page = 0; page < 100; page++) {
      const { data: durations, error } = await sb.from('steeltape_playtime_totals')
        .select('user_id,total_seconds').order('user_id').range(page*1000,page*1000+999);
      if (error) throw error;
      for (const d of durations || []) playSecondsByAccount.set(d.user_id,Number(d.total_seconds || 0));
      if (!durations || durations.length < 1000) break;
    }
    const allTimePlaySeconds = [...playSecondsByAccount.values()].reduce((sum,n)=>sum+n,0);
    const registered = allPlayers.filter(p => !!p.uid);
    const guests = allPlayers.filter(p => !p.uid && !p.claimed_uid);
    const participants = [...registered, ...guests];
    const now5 = Date.now() - 5 * 60000;
    const actives = { online:participants.filter(p => isAfter(p.last_active, now5)).length, today:participants.filter(p => isAfter(p.last_active, cutoff(1))).length, week:participants.filter(p => isAfter(p.last_active, cutoff(7))).length };
    const sum = (key: 'sessions'|'matches'|'wins') => allPlayers.reduce((a,p)=>a + Number(p[key]||0),0);
    const byKind: Record<string,number> = {}, days: Record<string,{ sessions:number;matches:number }> = {}, modes: Record<string,{n:number;won:number}> = {};
    for (const e of E) {
      byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      const d = e.at.slice(0,10), x = days[d] || (days[d] = {sessions:0,matches:0});
      if (e.kind === 'session') x.sessions++;
      if (e.kind === 'match') {
        x.matches++;
        const detail = e.data || {};
        const k = String(detail.stage || detail.mode || 'Other').slice(0,60);
        const m = modes[k] || (modes[k] = {n:0,won:0});
        m.n++; if (detail.won === true) m.won++;
      }
    }
    return json({
      email, total:total||0, byKind, days, modes, throne:throne||[],
      reports:E.filter(e => e.kind==='bug'||e.kind==='feature').slice(0,200),
      players:participants.map(p=>({key:p.player_key, uid:p.uid, name:p.name, sessions:p.sessions, matches:p.matches, wins:p.wins, playSeconds:p.uid ? (playSecondsByAccount.get(p.uid) ?? 0) : null, bugReports:p.bug_reports, featureIdeas:p.feature_ideas, first:p.first_seen, last:p.last_active, level:p.last_level, ua:p.last_device, created:p.account_created_at})).sort((a,b)=>b.last.localeCompare(a.last)),
      stats:{ registered:registered.length, guestBrowsers:guests.length, browserProfiles:allPlayers.filter(p=>!p.uid).length,
        online:actives.online, active24h:actives.today, active7d:actives.week,
        newPlayers30d:registered.filter(p=>isAfter(p.first_seen,cutoff(30))).length,
        createdAuth30d:registered.filter(p=>isAfter(p.account_created_at,cutoff(30))).length,
        allTimeSessions:sum('sessions'), allTimeMatches:sum('matches'), allTimeWins:sum('wins'), allTimePlaySeconds,
        platformTotal, platformNew30, recentEventsTruncated:eventsTruncated }
    });
  } catch (e) {
    console.error('steeltape-admin analytics', e instanceof Error ? e.message : 'query failed');
    return json({error:'analytics unavailable'},503);
  }
});
