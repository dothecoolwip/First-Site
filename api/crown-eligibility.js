// Read-only preflight for this private test host. Actual begin/finish and crown
// ownership remain with the existing shared verifier; this service cannot write.
const BACKEND = 'https://mvbxlebznlgroptwwdsm.supabase.co';
const PUBLIC_KEY = 'sb_publishable_u76M-dggKSsdsyhUQKveJg_5fPJ5Nan';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail = (message, status = 503) => { throw Object.assign(new Error(message), { status }); };

function crownEligibility({ fighter, directory, roster, snapshot, seats, uid }) {
  const result = {};
  for (const seat of ['king', 'queen']) {
    let reason = null;
    if (!fighter) reason = 'unlinked';
    else if (!roster.fighters.some(f => f.id === fighter.fighter_id)) reason = 'roster';
    else if (!directory) reason = 'directory';
    else if (!['male', 'female'].includes(directory.gender)) reason = 'details';
    else if (directory.gender !== (seat === 'king' ? 'male' : 'female')) reason = 'gender';
    else if (!seats[seat]?.uid) reason = 'vacant';
    else if (seats[seat].uid === uid) reason = 'own';
    else if (!snapshot?.['st-career']?.writs?.royal) reason = 'royal';
    result[seat] = { eligible: reason === null, reason };
  }
  return result;
}

function createEligibilityHandler(fetcher = fetch) {
  return async request => {
    const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
    const json = (value, status = 200) => Response.json(value, { status, headers });
    if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
    const authorization = request.headers.get('authorization') || '';
    if (!/^Bearer \S+$/.test(authorization) || authorization.length > 10000) return json({ error: 'Sign in with your existing BuhurtOS account to check eligibility.' }, 401);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
    try {
      const get = async (path, options = {}) => {
        try {
        // Workers support manual/follow, not redirect:error. Reject every 3xx
        // through the !ok check below; credentials never follow a redirect.
        const response = await fetcher(BACKEND + path, { ...options, headers: { apikey: PUBLIC_KEY, Authorization: authorization, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000), redirect: 'manual' });
        if (!response.ok) fail(path === '/auth/v1/user' && [400,401,403].includes(response.status) ? 'Your sign-in could not be verified. Sign in again with the existing account.' : 'Crown eligibility could not be loaded. Retry shortly.', path === '/auth/v1/user' && [400,401,403].includes(response.status) ? 401 : 503);
        return response.json();
        } catch (error) {
          if (error.status !== 401) {
            const safe = String(error.message || error.name || 'Read failed').replaceAll(authorization, '[redacted]').replaceAll(authorization.slice(7), '[redacted]').replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi, '[id]').slice(0, 200);
            console.error('crown-preflight-read', JSON.stringify({ service: path.split('?')[0], status: error.status || null, type: error.name, message: safe }));
          }
          throw error;
        }
      };
      // The Auth service verifies the token. No caller-supplied user ID is used.
      const user = await get('/auth/v1/user');
      if (!uuid(user?.id)) fail('Your sign-in could not be verified.', 401);
      const uid = user.id;
      const links = await get('/rest/v1/fighter_accounts?select=fighter_id&user_id=eq.' + encodeURIComponent(uid) + '&limit=1');
      if (!Array.isArray(links)) fail('Fighter association data is unavailable. Retry.');
      const fighter = links[0] || null;
      if (!fighter) return json({ eligibility: { king: { eligible: false, reason: 'unlinked' }, queen: { eligible: false, reason: 'unlinked' } } });
      if (!uuid(fighter.fighter_id)) fail('Your linked fighter record is unavailable. Retry.');
      const [roster, entries, cloud, crowns] = await Promise.all([
        get('/functions/v1/steeltape-roster'),
        get('/rest/v1/fighter_directory?select=id,gender&id=eq.' + encodeURIComponent(fighter.fighter_id) + '&limit=1'),
        // This existing STABLE RPC only SELECTs the authenticated user's save.
        get('/rest/v1/rpc/steeltape_cloud_read', { method: 'POST', body: '{}' }),
        get('/functions/v1/steeltape-throne'),
      ]);
      if (roster?.scope !== 'hacsa' || !Array.isArray(roster.fighters)) fail('Competition roster is unavailable. Retry shortly.');
      if (!Array.isArray(entries) || !crowns?.seats) fail('Crown information is incomplete. Retry shortly.');
      return json({ eligibility: crownEligibility({ fighter, directory: entries[0] || null, roster, snapshot: cloud?.snapshot, seats: crowns.seats, uid }) });
    } catch (error) {
      return json({ error: error.status === 401 ? error.message : 'The Crown Herald could not complete the eligibility check. Retry; no registration change is needed for a loading error.' }, error.status === 401 ? 401 : 503);
    }
  };
}

const eligibilityHandler=createEligibilityHandler();
module.exports=async(req,res)=>{try{const headers={};for(const name of ['authorization','origin'])if(typeof req.headers[name]==='string')headers[name]=req.headers[name];const request=new Request('https://'+req.headers.host+req.url,{method:req.method,headers});const response=await eligibilityHandler(request);res.statusCode=response.status;for(const [key,value]of response.headers)res.setHeader(key,value);res.end(Buffer.from(await response.arrayBuffer()));}catch{res.statusCode=503;res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Crown eligibility is temporarily unavailable. Retry.'}));}};
