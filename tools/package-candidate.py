"""Create a local review bundle; never deploy or apply migrations."""
from pathlib import Path
import hashlib,json,subprocess,tarfile,math,re

root=Path(__file__).resolve().parents[1]
review=root/'review';review.mkdir(exist_ok=True)
base='73d56c04b79d59224442e9880edf1bbfcdf9bd92'
protected=['09_input.js','13i_buhurtos.js','13ia_cloudsave.js','13j_roster.js','13ja_identity.js','06_fighter.js','07_marshals.js','08_ai.js','11h_squires.js']
retained={}
for name in protected:
    path='src/js/'+name
    original=subprocess.check_output(['git','show',base+':'+path],cwd=root)
    actual=(root/path).read_bytes()
    # Windows checkout line endings do not change the source module body.
    same=original.replace(b'\r\n',b'\n')==actual.replace(b'\r\n',b'\n')
    if not same:raise RuntimeError('Protected module changed: '+path)
    retained[path]=hashlib.sha256(actual).hexdigest()
version=json.loads((root/'dist/version.json').read_text())['version']
cal=json.loads((root/'tests/equipment-calibration.json').read_text())
single=json.loads((root/'tests/calibration.json').read_text())
core_version=re.search(r"const VERSION='([^']+)'",(root/'supabase/functions/steeltape-throne/crown-core.js').read_text()).group(1)
if cal['simulation']!=core_version or single['simulation']!=core_version:raise RuntimeError('Calibration does not match this core build')
browser=json.loads((root/'tests/map-crown-results.json').read_text())
if browser.get('stats',{}).get('unexpected',1):raise RuntimeError('Browser validation has unexpected failures')
if '\u2139 pass 26' not in (root/'tests/focused-tests.log').read_text(encoding='utf8'):raise RuntimeError('Focused tests are incomplete')
frozen=root.parent/'squire-release-latest'
if json.loads((frozen/'dist/version.json').read_text())['version']!='steel-tape-auth-14edf9973749':raise RuntimeError('Frozen release version differs')
manifest={'base':base,'build':version,'calibration':{'version':cal['simulation'],'fights':cal['total'],'wins':cal['wins'],'rate':cal['rate']},'protectedModules':retained,'frozenV59':{'version':'steel-tape-auth-14edf9973749','indexSha256':hashlib.sha256((frozen/'dist/index.html').read_bytes()).hexdigest()},'remoteMutations':False,'deployment':False}
(review/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
n=cal['total'];p=cal['rate'];z=1.96;den=1+z*z/n;centre=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
result=f'''# Candidate verification

Build: `{version}`. Base source: `{base}`. Core: `{cal['simulation']}`.

- Build syntax and ESLint passed; Deno Edge Function type-check passed.
- 26 focused tests passed: shared geometry/replay, actual PostgreSQL migration and permissions, eligibility, reservations, transfers and retries, plus twelve authentication regressions.
- The final browser report has {browser['stats']['expected']} passing cases, {browser['stats']['unexpected']} unexpected failures. The separate regression log records desktop and emulated-phone checks for manual head aim, explicit fullscreen, three simulated minutes of civilian routing, and castle collision.
- Equipment calibration: {cal['wins']}/{n} complete fights won ({p:.2%}), 64 weapon pairings, twenty seeds each. Wilson 95% interval: {centre-half:.2%}–{centre+half:.2%}. This is one reproducible bot policy, not human evidence. Individual matchups vary; inspect `tests/equipment-calibration.json`.
- Sword-versus-sword benchmark: {single['wins']}/{single['count']} wins ({single['winRate']:.2%}); this narrower result must not be presented as the overall human difficulty.
- Protected authentication, player-save, HACSA identity/roster, squire, ordinary fighter/marshal/AI and input modules match the base source. Frozen v59 remains at `steel-tape-auth-14edf9973749`.

Not performed: physical Android testing, human crown playtests, real staging-account authentication/save checks, or real multi-connection PostgreSQL contention. PGlite serializes database connections; browser crown requests use replaying fixtures. No remote database mutation, deployment, publication or forced update occurred.

See `IMPLEMENTATION.md` and `HANDOVER.md` for operation, source locations and staging checks. The local editor is available at http://127.0.0.1:8848/map-editor/ while its server is running.
'''
(review/'RESULTS.md').write_text(result,encoding='utf8')
folders=['src','dist','supabase','tools','tests','test-support']
files=[root/n for n in ['build.py','eslint.config.js','HANDOVER.md','IMPLEMENTATION.md']]
for folder in folders:
    # Explicitly prune runtime/dependency directories and Playwright trace artifacts.
    import os
    for directory,dirs,names in os.walk(root/folder,followlinks=False):
        dirs[:]=[d for d in dirs if d not in ['node_modules','map-crown-results','editor-results','__pycache__']]
        files.extend(Path(directory)/name for name in names if name not in ['.DS_Store'])
files.extend([review/'manifest.json',review/'RESULTS.md'])
with tarfile.open(review/'map-crown-candidate.tar.gz','w:gz',compresslevel=6) as archive:
    for file in sorted(set(files)):archive.add(file,arcname='map-crown-candidate/'+str(file.relative_to(root)).replace('\\','/'),recursive=False)
print(json.dumps({'build':version,'bundle':str(review/'map-crown-candidate.tar.gz'),'bytes':(review/'map-crown-candidate.tar.gz').stat().st_size,'calibration':manifest['calibration']}))
