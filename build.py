"""Rebuild the scoped hosted game from editable recovered source modules."""
from pathlib import Path
import hashlib,json,re,subprocess,shutil
root=Path(__file__).parent;src=root/'src';dist=root/'dist'
map_data=json.loads((src/'world-map.json').read_text(encoding='utf8'))
prefix=(src/'page-prefix.html').read_text(encoding='utf8')
asset_keys={'map-bridge'}
for name in ['PACK_GEO','DECOR_GEO','REALM_GEO','CASTLE_GEO','KENNEY_GEO']:
    match=re.search(r'const '+name+r'\s*=\s*',prefix)
    if match:
        geo,_=json.JSONDecoder().raw_decode(prefix[match.end():])
        asset_keys.update(k for k in geo if re.search(r'tent|bench|table|house|building|rack|lamp|barrel|crate|tree|fence|cart|bridge',k,re.I) and not re.search(r'wall|gate|tower|castle|stairs|ramp',k,re.I))
for p in map_data['props']:
    if p['asset'] not in asset_keys and not (p['asset'].startswith('vendor:') and p['id']==p['asset']):
        raise ValueError('Unknown map asset: '+p['asset'])
subprocess.run(['node','-e',"require('./src/shared/map-core.js').validate(JSON.parse(require('fs').readFileSync('./src/world-map.json','utf8')))"],cwd=root,check=True)
crown=(src/'shared/crown-core.js').read_text(encoding='utf8')
protocol='crooked-crown-1-'+hashlib.sha256(crown.encode()).hexdigest()[:12]
crown=crown.replace("const VERSION='crooked-crown-1'",f"const VERSION='{protocol}'")
shared='\n'.join(crown if p.name=='crown-core.js' else p.read_text(encoding='utf8') for p in sorted((src/'shared').glob('*.js')))
map_const='\nconst WORLD_MAP_DATA='+json.dumps(map_data,separators=(',',':'))+';\n'
game_files=sorted((src/'js').glob('*.js'))
modules=shared+map_const+''.join(p.read_text(encoding='utf8') for p in game_files)
page=(src/'page-prefix.html').read_text(encoding='utf8')+modules+(src/'page-suffix.html').read_text(encoding='utf8')
owner_source=b''.join(p.read_bytes() for folder in ['editor','server'] for p in sorted((src/folder).glob('*')) if p.is_file())+(src/'admin.html').read_bytes()+(src/'sw.js').read_bytes()
version='steel-tape-auth-'+hashlib.sha256(page.encode()+owner_source).hexdigest()[:12]
page=page.replace('__BUILD_VERSION__',version)
(dist/'index.html').write_text(page,encoding='utf8')
(dist/'sw.js').write_text(re.sub(r"const VERSION = '[^']*';",f"const VERSION = '{version}';",(src/'sw.js').read_text(encoding='utf8')),encoding='utf8')
(dist/'version.json').write_text(json.dumps({'version':version})+'\n',encoding='utf8')
shutil.copyfile(src/'admin.html',dist/'admin.html')
cache=root/'build_cache';cache.mkdir(exist_ok=True)
(cache/'game.js').write_text("(function(){\n'use strict';\n"+modules+'\n})();\n',encoding='utf8')
subprocess.run(['node','--check',str(cache/'game.js')],check=True)
print(version)
(root/'supabase/functions/steeltape-throne/crown-core.js').write_text(crown,encoding='utf8')
editor=dist/'map-editor';editor.mkdir(exist_ok=True)
for p in (src/'editor').glob('*'):
    if p.is_file():shutil.copyfile(p,editor/p.name)
shutil.copyfile(src/'shared/map-core.js',editor/'map-core.js')
shutil.copyfile(src/'world-map.json',editor/'world-map.json')
# A separate preview document has no persistent game store, cloud client, or sign-in flow.
preview_modules=shared+map_const
preview_footer=(src/'editor/preview.js').read_text(encoding='utf8')
for p in game_files:
    code=p.read_text(encoding='utf8')
    if p.name=='13_main.js':code=code.replace('if (window.claude && window.claude.hot && window.claude.hot.ready)',preview_footer+'\nif (window.claude && window.claude.hot && window.claude.hot.ready)',1)
    preview_modules+=code
    if p.name=='00_util.js':preview_modules+='\nconst previewStore=new Map();store.get=(k,d)=>previewStore.has(k)?previewStore.get(k):d;store.set=(k,v)=>previewStore.set(k,v);store.del=k=>previewStore.delete(k);\n'
suffix=(src/'page-suffix.html').read_text(encoding='utf8')
preview=(src/'page-prefix.html').read_text(encoding='utf8')+preview_modules+suffix
preview=preview.replace('__BUILD_VERSION__',version).replace('<head>','<head><base href="../">',1)
preview=re.sub(r'<script[^>]+src="https://[^\"]*(?:supabase|peerjs)[^\"]*"[^>]*></script>','',preview)
preview=preview.replace('exports = module.exports; \n','exports = module.exports;\n')
preview=preview.replace('<script src="update_prompt.js"></script>','')
(editor/'preview.html').write_text(preview,encoding='utf8')
# Hosted editor files are served only after owner verification by the function.
# Split the large game script below the platform's per-response payload limit.
private=dist/'api/workshop-assets'
if private.exists():shutil.rmtree(private)
private.mkdir(parents=True)
protected=preview.replace('<base href="../">','<base href="/">')
parts=[]
def split_script(match):
    code=match.group(1).encode('utf8')
    if len(code)<2000000:return match.group(0)
    if parts:raise ValueError('Unexpected second large preview script')
    for i,start in enumerate(range(0,len(code),2*1024*1024)):
        name=f'preview-part-{i:02d}.bin';parts.append(name)
        (private/(name+'.asset')).write_bytes(code[start:start+2*1024*1024])
    return '<script type="module" src="/map-editor/preview-loader.js"></script>'
protected=re.sub(r'<script>([\s\S]*?)</script>',split_script,protected)
loader='const names='+json.dumps(parts)+';\n'+'''try{const buffers=await Promise.all(names.map(async n=>{const r=await fetch('/map-editor/'+n,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('Owner session expired. Return to /admin.html.');return new Uint8Array(await r.arrayBuffer());}));const data=new Uint8Array(buffers.reduce((n,b)=>n+b.length,0));let offset=0;for(const b of buffers){data.set(b,offset);offset+=b.length;}new Function(new TextDecoder().decode(data))();}catch(e){document.body.textContent=e.message;throw e;}'''
(private/'preview-loader.js.asset').write_text(loader,encoding='utf8')
for p in editor.iterdir():
    if p.is_file() and p.name!='preview.js':
        (private/(p.name+'.asset')).write_bytes(protected.encode('utf8') if p.name=='preview.html' else p.read_bytes())
(private/'manifest.json').write_text(json.dumps({'files':sorted(p.name[:-6] for p in private.glob('*.asset'))}),encoding='utf8')
shutil.copyfile(src/'server/map-workshop.js',dist/'api/map-workshop.js')
