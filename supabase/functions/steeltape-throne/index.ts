import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import './crown-core.js';
import { createCrownService, createRepository } from './service.mjs';
const Core=(globalThis as unknown as {CrownCore: Record<string,unknown>}).CrownCore;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey, authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!,admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}),repo=createRepository(admin,Core);
  if(req.method==='GET')return json({seats:await repo.seats()});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(Number(req.headers.get('content-length')||0)>65536)return json({error:'Crown request too large'},413);
  const bearer=req.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return json({error:'Sign in before challenging.'},401);
  const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}}),verified=await auth.auth.getUser(bearer.slice(7));
  if(verified.error||!verified.data.user?.id)return json({error:'Invalid sign-in.'},401);
  const text=await req.text();if(text.length>65536)return json({error:'Crown request too large'},413);
  let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}const service=createCrownService(repo,Core),result=await service(verified.data.user.id,body);
  return json(body.action==='finish'||body.action==='begin'||body.action==='challenge'?{...result,seats:await repo.seats()}:result);
 }catch(error){const e=error as Error&{status?:number};console.error('crown:',e.message);return json({error:e.status?e.message:'The Crown Herald could not verify this attempt.'},e.status||503);}
});
