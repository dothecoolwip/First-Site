# Keep only some animations of a glTF (embedded buffer), decimate their keyframes, drop everything unused, write a GLB.
import json, sys, base64, struct
src, out, keep, step = sys.argv[1], sys.argv[2], sys.argv[3].split(','), int(sys.argv[4]) if len(sys.argv) > 4 else 2
g = json.load(open(src)); buf = base64.b64decode(g['buffers'][0]['uri'].split(',', 1)[1])
CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def read(ai):
    a = g['accessors'][ai]; v = g['bufferViews'][a['bufferView']]; n = NC[a['type']]; c = CT[a['componentType']]; sz = struct.calcsize(c)
    st = v.get('byteStride', sz * n); off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + c * n, buf, off + k * st) for k in range(a['count'])], a
g['animations'] = [a for a in g.get('animations', []) if a['name'] in keep]
newbuf = bytearray(); views = []; accs = []; amap = {}
def add_acc(ai, rows=None, a=None):
    if rows is None:
        if ai in amap: return amap[ai]
        rows, a = read(ai)
    a = dict(a); c = CT[a['componentType']]; n = NC[a['type']]
    while len(newbuf) % 4: newbuf.append(0)
    data = b''.join(struct.pack('<' + c * n, *r) for r in rows)
    view = {'buffer': 0, 'byteOffset': len(newbuf), 'byteLength': len(data)}
    if a.get('_target'): view['target'] = a.pop('_target')
    newbuf.extend(data); views.append(view); a['bufferView'] = len(views) - 1; a.pop('byteOffset', None); a['count'] = len(rows)
    if a['componentType'] == 5126 and n <= 4:
        a['min'] = [min(r[i] for r in rows) for i in range(n)]; a['max'] = [max(r[i] for r in rows) for i in range(n)]
    accs.append(a); idx = len(accs) - 1
    if ai is not None: amap[ai] = idx
    return idx
for m in g['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: add_acc(v) for k, v in p['attributes'].items() if k in ('POSITION', 'NORMAL', 'JOINTS_0', 'WEIGHTS_0', 'COLOR_0', 'TEXCOORD_0')}
        if 'indices' in p: p['indices'] = add_acc(p['indices'])
        p.pop('targets', None)
for s in g.get('skins', []):
    if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = add_acc(s['inverseBindMatrices'])
# drop channels that never move in any kept animation (bake the value into the node instead)
vals = {}
for an in g['animations']:
    for ch in an['channels']:
        O, _ = read(an['samplers'][ch['sampler']]['output']); key = (ch['target']['node'], ch['target']['path'])
        const = all(max(abs(x - y) for x, y in zip(r, O[0])) < 1e-4 for r in O)
        vals.setdefault(key, []).append(O[0] if const else None)
static = {k: v[0] for k, v in vals.items() if all(x is not None and max(abs(p - q) for p, q in zip(x, v[0])) < 1e-4 for x in v) and len(v) == len(g['animations'])}
for (ni, path), v in static.items(): g['nodes'][ni][path] = list(v)
for an in g['animations']:
    chs, sms = [], []
    for ch in an['channels']:
        if (ch['target']['node'], ch['target']['path']) in static: continue
        smp = an['samplers'][ch['sampler']]; ch = dict(ch); ch['sampler'] = len(sms); chs.append(ch); sms.append(smp)
    an['channels'], an['samplers'] = chs, sms
for an in g['animations']:
    done = {}
    for smp in an['samplers']:
        ti, oi = smp['input'], smp['output']
        T, ta = read(ti); O, oa = read(oi)
        idx = list(range(0, len(T), step)) + ([len(T) - 1] if (len(T) - 1) % step else [])
        if smp.get('interpolation') == 'CUBICSPLINE': idx = list(range(len(T)))
        key = (ti, tuple(idx))
        if key not in done: done[key] = add_acc(None, [T[i] for i in idx], ta)
        smp['input'] = done[key]
        smp['output'] = add_acc(None, [O[i] for i in idx], oa)
g['accessors'] = accs; g['bufferViews'] = views; g['buffers'] = [{'byteLength': len(newbuf)}]
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
while len(newbuf) % 4: newbuf.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(newbuf)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(newbuf), 0x004E4942) + bytes(newbuf)
open(out, 'wb').write(glb); print(out, len(glb) // 1024, 'KB', [a['name'] for a in g['animations']])
