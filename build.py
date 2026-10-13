"""Rebuild the scoped hosted game from editable recovered source modules."""
from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).parent;src=root/'src';dist=root/'dist'
modules=''.join(p.read_text(encoding='utf8') for p in sorted((src/'js').glob('*.js')))
page=(src/'page-prefix.html').read_text(encoding='utf8')+modules+(src/'page-suffix.html').read_text(encoding='utf8')
version='steel-tape-auth-'+hashlib.sha256(page.encode()).hexdigest()[:12]
page=page.replace('__BUILD_VERSION__',version)
(dist/'index.html').write_text(page,encoding='utf8')
(dist/'sw.js').write_text(re.sub(r"const VERSION = '[^']*';",f"const VERSION = '{version}';",(src/'sw.js').read_text(encoding='utf8')),encoding='utf8')
(dist/'version.json').write_text(json.dumps({'version':version})+'\n',encoding='utf8')
cache=root/'build_cache';cache.mkdir(exist_ok=True)
(cache/'game.js').write_text("(function(){\n'use strict';\n"+modules+'\n})();\n',encoding='utf8')
subprocess.run(['node','--check',str(cache/'game.js')],check=True)
print(version)
