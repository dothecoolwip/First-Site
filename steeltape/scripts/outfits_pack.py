# Pack Quaternius "Modular Character Outfits - Fantasy" (CC0) into src/outfit_geo.js:
# quantised skinned meshes on the UAL 65-bone rig + small base-colour textures. Skin parts get a flat skin tone at runtime.
import json, struct, base64, io, sys, os
from PIL import Image
D = sys.argv[1]  # .../Exports/glTF (Godot-Unreal)/Outfits
T = sys.argv[2]  # .../Textures
OUT = sys.argv[3]
CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def load(name):
    g = json.load(open(os.path.join(D, name + '.gltf'))); b = open(os.path.join(D, g['buffers'][0]['uri']), 'rb').read()
    def acc(i):
        a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]; n = NC[a['type']]; c = CT[a['componentType']]; sz = struct.calcsize(c)
        st = v.get('byteStride', sz * n); off = v.get('byteOffset', 0) + a.get('byteOffset', 0); out = []
        for k in range(a['count']):
            vals = struct.unpack_from('<' + c * n, b, off + k * st); out.append(vals)
        if a.get('normalized') and c in 'BH': m = 255.0 if c == 'B' else 65535.0; out = [tuple(x / m for x in t) for t in out]
        return out
    return g, acc
b64 = lambda by: base64.b64encode(by).decode()
parts, outfits, ibms = {}, {}, {}
SKIP = {'Male_Ranger_Arms_Bracer', 'Female_Ranger_Arms_Bracer', 'Male_Ranger_Feet_Boots', 'Female_Ranger_Feet', 'Male_Ranger_Body_Belt_1.001'}
for name in ['Male_Peasant', 'Female_Peasant', 'Male_Ranger', 'Female_Ranger']:
    g, acc = load(name)
    ibm = [x for t in acc(g['skins'][0]['inverseBindMatrices']) for x in t]
    ibms[name.split('_')[0]] = ibm
    keys = []
    for m in g['meshes']:
        if m['name'] in SKIP: continue
        for pi, p in enumerate(m['primitives']):
            mat = g['materials'][p['material']]['name']; mk = 'skin' if 'Regular' in mat else ('ranger' if 'Ranger' in mat else 'peasant')
            A = p['attributes']; pos = acc(A['POSITION']); nrm = acc(A['NORMAL']); uv = acc(A['TEXCOORD_0']); J = acc(A['JOINTS_0']); W = acc(A['WEIGHTS_0']); idx = [t[0] for t in acc(p['indices'])]
            lo = [min(v[i] for v in pos) for i in range(3)]; hi = [max(v[i] for v in pos) for i in range(3)]; sc = [(hi[i] - lo[i]) / 65535 or 1e-6 for i in range(3)]
            P = b''.join(struct.pack('<3H', *[round((v[i] - lo[i]) / sc[i]) for i in range(3)]) for v in pos)
            N = b''.join(struct.pack('<3b', *[max(-127, min(127, round(c * 127))) for c in v]) for v in nrm)
            ulo = [min(v[i] for v in uv) for i in range(2)]; uhi = [max(v[i] for v in uv) for i in range(2)]; us = [(uhi[i] - ulo[i]) / 65535 or 1e-6 for i in range(2)]
            U = b''.join(struct.pack('<2H', *[round((v[i] - ulo[i]) / us[i]) for i in range(2)]) for v in uv)
            JB = b''.join(struct.pack('<4B', *v) for v in J)
            WB = b''
            for v in W:
                s = sum(v) or 1; q = [round(x / s * 255) for x in v]; q[q.index(max(q))] += 255 - sum(q); WB += struct.pack('<4B', *q)
            I = struct.pack('<%dH' % len(idx), *idx)
            key = m['name'] + ('' if pi == 0 else '_%d' % pi)
            if key not in parts:
                parts[key] = {'m': mk, 'n': len(pos), 'lo': lo, 'sc': sc, 'ulo': ulo, 'us': us, 'p': b64(P), 'nr': b64(N), 'uv': b64(U), 'j': b64(JB), 'w': b64(WB), 'i': b64(I)}
            keys.append(key)
    outfits[name] = keys
# rangers have no shoes once the 10k-vertex boots go: borrow the peasants' feet
outfits['Male_Ranger'].append('Male_Peasant_Feet'); outfits['Female_Ranger'].append('Female_Peasant_Feet')
def tex(path, s=256):
    im = Image.open(path).convert('RGB').resize((s, s), Image.LANCZOS); bio = io.BytesIO(); im.save(bio, 'JPEG', quality=82, optimize=True); return 'data:image/jpeg;base64,' + b64(bio.getvalue())
texs = {'peasant': tex(os.path.join(T, 'Peasant/T_Peasant_BaseColor.png')), 'peasant2': tex(os.path.join(T, 'Peasant/T_Peasant_2_BaseColor.png')),
        'ranger': tex(os.path.join(T, 'Ranger/T_Ranger_BaseColor.png')), 'ranger2': tex(os.path.join(T, 'Ranger/T_Ranger_3_BaseColor.png'))}
data = {'ibm': {k: b64(struct.pack('<%df' % len(v), *v)) for k, v in ibms.items()}, 'parts': parts, 'outfits': outfits, 'tex': texs}
js = '// Quaternius Modular Character Outfits - Fantasy (CC0), packed by scripts/outfits_pack.py\nvar OUTFIT_GEO = ' + json.dumps(data, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print('parts', len(parts), {k: len(v) for k, v in outfits.items()}, 'verts', sum(p['n'] for p in parts.values()), 'KB', len(js) // 1024)
