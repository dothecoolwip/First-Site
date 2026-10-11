"""Convert pieces of Quaternius' Medieval Village MegaKit (CC0) into compact geometry for the venues.

Each piece -> list of materials {c: average colour of its base texture, v: positions in cm (ints), i: indices}.
Normals are rebuilt flat in the browser. Usage: python3 -I village_to_js.py GLTF_DIR TEX_DIR OUT.js
"""
import sys, json, struct, math, os
from PIL import Image

PIECES = ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Round', 'Wall_Plaster_Door_Round', 'Wall_UnevenBrick_Straight',
          'Wall_UnevenBrick_Window_Wide_Round', 'Wall_Plaster_WoodGrid', 'Roof_RoundTiles_4x4', 'Roof_RoundTiles_4x6', 'Prop_Chimney',
          'Prop_Wagon', 'Prop_Crate', 'Prop_WoodenFence_Single']
COMP = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}

def read_acc(g, bins, ai):
    a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]; buf = bins[bv['buffer']]
    fmt, size = COMP[a['componentType']]; n = NCOMP[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', size * n)
    out = []
    for k in range(a['count']):
        out.append(struct.unpack_from('<' + fmt * n, buf, off + k * stride))
    return out

def qrot(q, v):
    x, y, z, w = q; vx, vy, vz = v
    ix = w * vx + y * vz - z * vy; iy = w * vy + z * vx - x * vz; iz = w * vz + x * vy - y * vx; iw = -x * vx - y * vy - z * vz
    return (ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x)

TEXCOL = {}
def avg_colour(g, mi, tex_dir, gdir):
    m = g['materials'][mi]; pbr = m.get('pbrMetallicRoughness', {})
    f = pbr.get('baseColorFactor', [1, 1, 1, 1])
    t = pbr.get('baseColorTexture')
    c = [1, 1, 1]
    if t is not None:
        img = g['images'][g['textures'][t['index']]['source']]; uri = img.get('uri', '')
        path = os.path.join(gdir, uri)
        if not os.path.exists(path): path = os.path.join(tex_dir, os.path.basename(uri))
        if path not in TEXCOL and os.path.exists(path):
            im = Image.open(path).convert('RGB').resize((1, 1), Image.BOX); TEXCOL[path] = [x / 255 for x in im.getpixel((0, 0))]
        c = TEXCOL.get(path, c)
    return [round(c[i] * f[i], 3) for i in range(3)], m.get('name', '')

def convert(gdir, tex_dir, name):
    fn = os.path.join(gdir, name + '.gltf'); g = json.load(open(fn))
    bins = [open(os.path.join(gdir, b['uri']), 'rb').read() for b in g['buffers']]
    mats = {}
    for node in g['nodes']:
        if 'mesh' not in node: continue
        t = node.get('translation', [0, 0, 0]); r = node.get('rotation', [0, 0, 0, 1]); s = node.get('scale', [1, 1, 1])
        for p in g['meshes'][node['mesh']]['primitives']:
            P = read_acc(g, bins, p['attributes']['POSITION'])
            I = [i[0] for i in read_acc(g, bins, p['indices'])] if 'indices' in p else list(range(len(P)))
            col, mname = avg_colour(g, p.get('material', 0), tex_dir, gdir)
            M = mats.setdefault(mname, {'n': mname, 'c': col, 'v': [], 'i': []})
            base = len(M['v']) // 3
            for v in P:
                w = qrot(r, (v[0] * s[0], v[1] * s[1], v[2] * s[2])); M['v'] += [round((w[k] + t[k]) * 100) for k in range(3)]
            M['i'] += [base + i for i in I]
    return {'mats': list(mats.values())}

if __name__ == '__main__':
    gdir, tex_dir, out = sys.argv[1:4]
    data = {n: convert(gdir, tex_dir, n) for n in PIECES if os.path.exists(os.path.join(gdir, n + '.gltf'))}
    js = '// Medieval Village MegaKit pieces by Quaternius (CC0), flat-coloured\nconst VILLAGE_GEO = ' + json.dumps(data, separators=(',', ':')) + ';\n'
    open(out, 'w').write(js)
    print(len(js) // 1024, 'KB', {k: sum(len(m['i']) // 3 for m in v['mats']) for k, v in data.items()})
