#!/usr/bin/env python3
"""Bundle the source files into one artifact page, plus a local test wrapper."""
import pathlib, subprocess, sys

root = pathlib.Path(__file__).parent
src = root / 'src'
def read_utf8(path):
    return pathlib.Path(path).read_text(encoding='utf-8')

css = read_utf8(src / 'style.css')
body = read_utf8(src / 'body.html')
import base64, json
# embed every recording in the page so the sounds never depend on side files loading
cache = root / 'build_cache'; cache.mkdir(exist_ok=True)
music_small = cache / 'music_battle.mp3'
if not music_small.exists():
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root / 'audio' / 'music_battle.mp3'), '-ac', '1', '-b:a', '64k', str(music_small)], check=True)
emb = {}
for p in sorted((root / 'audio').glob('*.mp3')):
    f = music_small if p.name == 'music_battle.mp3' else p
    emb[p.stem] = base64.b64encode(f.read_bytes()).decode()
ual = 'const UAL_GLB = "' + base64.b64encode((cache / 'ual.glb').read_bytes()).decode() + '";\n' if (cache / 'ual.glb').exists() else ''
sfx_b64 = 'const SFX_B64 = ' + json.dumps(emb, separators=(',', ':')) + ';\n'
js = sfx_b64 + ual + read_utf8(src / 'gltf_lib.js') + '\n' + read_utf8(src / 'sfx_data.js') + '\n' + read_utf8(src / 'asset_geo.js') + '\n' + read_utf8(src / 'fantasy_geo.js') + '\n' + read_utf8(src / 'village_geo.js') + '\n' + read_utf8(src / 'kenney_geo.js') + '\n' + read_utf8(src / 'pack_geo.js') + '\n' + read_utf8(src / 'decor_geo.js') + '\n' + read_utf8(src / 'outfit_geo.js') + '\n' + read_utf8(src / 'wskin_geo.js') + '\n' + read_utf8(src / 'realm_geo.js') + '\n' + read_utf8(src / 'animal_geo.js') + '\n' + read_utf8(src / 'castle_geo.js') + '\n' + read_utf8(src / 'vfx_data.js') + '\n' + '\n'.join(read_utf8(p) for p in sorted((src / 'js').glob('*.js')))

THREE = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'
page = f'''<title>Buhurt: Steel &amp; Tape</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Big+Shoulders+Display:wght@700;800;900&family=Permanent+Marker&display=swap">
<style>
{css}
</style>
{body}
<script src="{THREE}"></script>
<script>
(function(){{
'use strict';
{js}
}})();
</script>
'''
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'steel-and-tape.html').write_text(page, encoding='utf-8')
test = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>
{page}
</body></html>'''
(root / 'test' / 'index.html').write_text(test, encoding='utf-8')
import shutil
shutil.rmtree(root / 'test' / 'audio', ignore_errors=True)  # the test page must prove the embedded sounds work on their own
# syntax check the bundled script; game.js (our modules only) is what ESLint checks
(root / 'test' / 'bundle.js').unlink(missing_ok=True)
(cache / 'bundle.js').write_text('(function(){\n' + js + '\n})();', encoding='utf-8')
game = "(function(){\n'use strict';\n" + '\n'.join(read_utf8(p) for p in sorted((src / 'js').glob('*.js'))) + '\n})();\n'
(cache / 'game.js').write_text(game, encoding='utf-8')
r = subprocess.run(['node', '--check', str(cache / 'bundle.js')], capture_output=True, text=True)
if r.returncode:
    print(r.stderr); sys.exit(1)
# installable app: the same page with a manifest and an offline cache; the cache name follows the build so updates arrive
import hashlib, re, zipfile
pwa = root / 'pwa'
if pwa.exists():
    head = '<!doctype html><html><head><meta charset="utf-8"><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0f1316"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
    sw_reg = "<script>if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});</script>"
    ver = 'steel-tape-' + hashlib.sha1(page.encode()).hexdigest()[:10]
    (pwa / 'index.html').write_text(head + '\n' + f'<script>window.BUILD_VER="{ver}";</script>' + page + '\n' + sw_reg + '\n</body></html>', encoding='utf-8')
    sw = pwa / 'sw.js'; sw.write_text(re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{ver}';", read_utf8(sw)), encoding='utf-8')
    with zipfile.ZipFile(root / 'steel-and-tape-app.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(pwa.iterdir()): z.write(f, f.name)
print('built', len(page) // 1024, 'KB')
