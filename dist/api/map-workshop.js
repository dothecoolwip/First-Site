'use strict';
const crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const OWNER_EMAIL='garrettrobson95@gmail.com',OWNER_ID='8c40a519-d188-4779-ab4c-88ef4b939e07';
const COOKIE='__Host-steeltape-workshop';
const SUPABASE_URL='https://mvbxlebznlgroptwwdsm.supabase.co';
const PUBLIC_KEY='sb_publishable_u76M-dggKSsdsyhUQKveJg_5fPJ5Nan';
function isOwner(u){return !!u&&u.id===OWNER_ID&&String(u.email||'').trim().toLowerCase()===OWNER_EMAIL&&!!u.email_confirmed_at&&u.is_anonymous!==true;}
function createHandler(options={}){
 const fetcher=options.fetch||globalThis.fetch,root=options.assetsRoot||path.join(process.cwd(),'api/workshop-assets');
 const now=options.now||(()=>Date.now()),keyValue=()=>options.key||process.env.MAP_WORKSHOP_SESSION_KEY;
 const key=()=>{const v=keyValue();if(!/^[0-9a-f]{64}$/i.test(v||''))throw Error('Workshop session configuration unavailable');return Buffer.from(v,'hex');};
 function seal(token){let exp=Math.floor(now()/1000)+900;try{const p=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));if(Number.isFinite(p.exp))exp=Math.min(exp,p.exp);}catch{}const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),data=Buffer.concat([c.update(JSON.stringify({token,exp})),c.final()]);return {value:Buffer.concat([iv,c.getAuthTag(),data]).toString('base64url'),exp};}
 function unseal(value){try{const b=Buffer.from(value,'base64url');if(b.length<29||b.length>12000)return null;const d=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));const s=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]));return s.exp>now()/1000&&typeof s.token==='string'?s:null;}catch{return null;}}
 async function verified(token){if(!token||token.length>8192)return null;const r=await fetcher(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!r.ok)return null;return r.json();}
 function cookie(value,maxAge){return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;}
 function sameOrigin(req){const origin=req.headers.origin,host=req.headers.host;return !!origin&&origin===(options.origin||'https://'+host);}
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.bin':'application/octet-stream'};
 return async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie, Authorization');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
  const json=(body,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
  const deny=(status=401)=>{if(!asset||asset==='index.html'){res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Owner sign-in required</title><h1>Map Workshop</h1><p>Only the verified owner can enter.</p><p><a href="/admin.html">Sign in through the admin page</a></p>');}else json({error:status===403?'Owner access required':'Owner sign-in required',login:'/admin.html'},status);};
  let asset=req.query?.asset;if(Array.isArray(asset)){json({error:'Invalid path'},400);return;}if(asset===undefined)asset=new URL(req.url,'https://workshop.invalid').searchParams.get('asset')||'';
  if(typeof asset!=='string'||asset.length>110||asset&&!/^[a-z0-9][a-z0-9._-]*$/i.test(asset)){json({error:'Invalid path'},400);return;}
  try{
   if(asset==='session'&&req.method==='DELETE'){if(!sameOrigin(req)){json({error:'Invalid origin'},403);return;}res.setHeader('Set-Cookie',cookie('',0));res.statusCode=204;res.end();return;}
   if(asset==='session'&&req.method==='POST'){
    if(!sameOrigin(req)){json({error:'Invalid origin'},403);return;}
    const auth=req.headers.authorization||'';if(!auth.startsWith('Bearer ')){deny();return;}
    const token=auth.slice(7),user=await verified(token);if(!user){deny();return;}if(!isOwner(user)){deny(403);return;}
    const s=seal(token),ttl=Math.max(0,s.exp-Math.floor(now()/1000));if(!ttl){deny();return;}
    res.setHeader('Set-Cookie',cookie(s.value,ttl));json({ok:true,email:OWNER_EMAIL,expires:s.exp});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){json({error:'Method not allowed'},405);return;}
   const value=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1),session=value&&unseal(value);
   if(!session){deny();return;}const user=await verified(session.token);if(!user){deny();return;}if(!isOwner(user)){deny(403);return;}
   if(asset==='session'){json({ok:true,email:OWNER_EMAIL,expires:session.exp});return;}
   asset=asset||'index.html';const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
   if(!manifest.files.includes(asset)){json({error:'Not found'},404);return;}
   let body=await fs.readFile(path.join(root,asset+'.asset'));
   if(asset.endsWith('.html'))body=Buffer.from(body.toString().replace('<head>','<head><script>window.__MAP_WORKSHOP_AUTHORIZED__=true;</script>'));
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
   res.setHeader('Content-Type',types[path.extname(asset)]||'application/octet-stream');res.setHeader('Content-Length',body.length);res.statusCode=200;res.end(req.method==='HEAD'?undefined:body);
  }catch{json({error:'Owner verification is temporarily unavailable. Return to the admin page and retry.'},503);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.isOwner=isOwner;module.exports.COOKIE=COOKIE;
