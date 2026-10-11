"""Cut Quaternius' Universal Animation Library (CC0) down to the mannequin plus a few clips.
Finger channels and non-root translations are dropped; every kept accessor is repacked tightly.
Usage: python3 -I ual_prune.py IN.glb OUT.glb"""
import sys, json, struct
KEEP = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Talking_Loop', 'Fixing_Kneeling', 'Dance_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Interact', 'PickUp_Table', 'Sword_Attack', 'Walk_Formal_Loop', 'Crouch_Idle_Loop', 'Idle_Torch_Loop']
FINGER = ('index', 'middle', 'pinky', 'ring', 'thumb', 'ball_leaf')
f = open(sys.argv[1], 'rb').read()
jl = struct.unpack_from('<I', f, 12)[0]; g = json.loads(f[20:20 + jl]); bin0 = f[20 + jl + 8:]
SIZE = {5126: 4, 5123: 2, 5125: 4, 5121: 1, 5122: 2, 5120: 1}; N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
# optional: more clips from a second library on the same rig (UAL2), matched to our nodes by name
if len(sys.argv) > 4:
    f2 = open(sys.argv[3], 'rb').read(); jl2 = struct.unpack_from('<I', f2, 12)[0]; g2 = json.loads(f2[20:20 + jl2]); bin2 = f2[20 + jl2 + 8:]
    extra = sys.argv[4].split(','); KEEP = KEEP + extra
    base = len(bin0); pad = (4 - base % 4) % 4; bin0 = bin0 + b'\0' * pad; base += pad; bin0 = bin0 + bin2
    vo, ao = len(g['bufferViews']), len(g['accessors'])
    for v in g2['bufferViews']: v = dict(v); v['byteOffset'] = v.get('byteOffset', 0) + base; g['bufferViews'].append(v)
    for a in g2['accessors']: a = dict(a); a['bufferView'] += vo; g['accessors'].append(a)
    byname = {n.get('name'): i for i, n in enumerate(g['nodes'])}
    for a in g2['animations']:
        if a['name'] not in extra: continue
        chs = []
        for c in a['channels']:
            nm = g2['nodes'][c['target']['node']].get('name')
            if nm not in byname: continue
            chs.append({'sampler': c['sampler'], 'target': {'node': byname[nm], 'path': c['target']['path']}})
        g['animations'].append({'name': a['name'], 'channels': chs, 'samplers': [{**sm, 'input': sm['input'] + ao, 'output': sm['output'] + ao} for sm in a['samplers']]})
anims = []
for a in g['animations']:
    if a['name'] not in KEEP: continue
    ch, sm = [], []
    for c in a['channels']:
        nm = g['nodes'][c['target']['node']].get('name', '')
        if any(nm.startswith(p) for p in FINGER): continue
        if c['target']['path'] == 'translation' and nm not in ('pelvis', 'root'): continue
        if c['target']['path'] == 'scale': continue
        s = a['samplers'][c['sampler']]; sm.append(dict(s)); ch.append({'sampler': len(sm) - 1, 'target': c['target']})
    anims.append({'name': a['name'], 'channels': ch, 'samplers': sm})
g['animations'] = anims
used = set()
for m in g['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: v for k, v in p['attributes'].items() if not k.startswith(('TEXCOORD', 'TANGENT', 'COLOR'))}
for m in g['meshes']:
    for p in m['primitives']:
        used |= set(p['attributes'].values()); used.add(p['indices'])
for s in g['skins']: used.add(s['inverseBindMatrices'])
for a in anims:
    for s in a['samplers']: used.add(s['input']); used.add(s['output'])
remap, newacc, out, views = {}, [], bytearray(), []
for old in sorted(used):
    a = dict(g['accessors'][old]); bv = g['bufferViews'][a['bufferView']]
    es = SIZE[a['componentType']] * N[a['type']]; stride = bv.get('byteStride', es); off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    data = b''.join(bin0[off + i * stride: off + i * stride + es] for i in range(a['count']))
    while len(out) % 4: out.append(0)
    views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}); out += data
    a['bufferView'] = len(views) - 1; a.pop('byteOffset', None); remap[old] = len(newacc); newacc.append(a)
for m in g['meshes']:
    for p in m['primitives']:
        p['attributes'] = {k: remap[v] for k, v in p['attributes'].items()}; p['indices'] = remap[p['indices']]
for s in g['skins']: s['inverseBindMatrices'] = remap[s['inverseBindMatrices']]
for a in anims:
    for s in a['samplers']: s['input'] = remap[s['input']]; s['output'] = remap[s['output']]
g['accessors'] = newacc; g['bufferViews'] = views; g['buffers'] = [{'byteLength': len(out)}]
for k in ('images', 'textures', 'samplers'): g.pop(k, None)
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(out) % 4: out.append(0)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(sys.argv[2], 'wb').write(glb); print(len(glb) // 1024, 'KB', [a['name'] for a in anims])
