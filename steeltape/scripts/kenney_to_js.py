"""Bake Kenney (CC0) GLB models into compact geometry for the town: KENNEY_GEO[name] = {mats: [{n, c, a, v, i}]}.
Kenney models use plain material colours, so each material keeps its colour (c) and alpha (a); positions are in mm (ints).
Node transforms are applied (nested nodes too). Usage: python3 -I kenney_to_js.py OUT.js NAME=PATH.glb ...
"""
import sys, json, struct, math

COMP = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def read_acc(g, bin_, ai):
    a = g['accessors'][ai]; bv = g['bufferViews'][a['bufferView']]
    fmt, size = COMP[a['componentType']]; n = NCOMP[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', size * n)
    return [struct.unpack_from('<' + fmt * n, bin_, off + k * stride) for k in range(a['count'])]

def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def node_mat(n):
    if 'matrix' in n:
        m = n['matrix']; return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    t = n.get('translation', [0, 0, 0]); q = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
    x, y, z, w = q
    R = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    return [[R[r][0] * s[0], R[r][1] * s[1], R[r][2] * s[2], t[r]] for r in range(3)] + [[0, 0, 0, 1]]

def convert(path):
    b = open(path, 'rb').read()
    l0 = struct.unpack_from('<I', b, 12)[0]; g = json.loads(b[20:20 + l0])
    off = 20 + l0; l1 = struct.unpack_from('<I', b, off)[0]; bin_ = b[off + 8: off + 8 + l1]
    mats = {}
    def walk(ni, M):
        n = g['nodes'][ni]; M = mat_mul(M, node_mat(n))
        if 'mesh' in n:
            for p in g['meshes'][n['mesh']]['primitives']:
                P = read_acc(g, bin_, p['attributes']['POSITION'])
                I = [i[0] for i in read_acc(g, bin_, p['indices'])] if 'indices' in p else list(range(len(P)))
                m = g['materials'][p.get('material', 0)] if g.get('materials') else {}
                f = m.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])
                name = m.get('name', 'm')
                D = mats.setdefault(name, {'n': name, 'c': [round(x, 3) for x in f[:3]], 'a': round(f[3], 2), 'v': [], 'i': []})
                base = len(D['v']) // 3
                for v in P:
                    w = [M[r][0] * v[0] + M[r][1] * v[1] + M[r][2] * v[2] + M[r][3] for r in range(3)]
                    D['v'] += [round(w[k] * 1000) for k in range(3)]
                D['i'] += [base + i for i in I]
        for c in n.get('children', []): walk(c, M)
    I4 = [[1 if r == c else 0 for c in range(4)] for r in range(4)]
    for ni in g['scenes'][g.get('scene', 0)]['nodes']: walk(ni, I4)
    return {'mats': list(mats.values())}

out, pairs = sys.argv[1], sys.argv[2:]
geo = {}
for p in pairs:
    name, path = p.split('=', 1); geo[name] = convert(path)
js = '// Kenney (www.kenney.nl) models, CC0: Fantasy Town Kit, Nature Kit, Graveyard Kit. Baked by scripts/kenney_to_js.py\nconst KENNEY_GEO = ' + json.dumps(geo, separators=(',', ':')) + ';\n'
open(out, 'w').write(js); print(out, len(js) // 1024, 'KB', len(geo), 'models')
