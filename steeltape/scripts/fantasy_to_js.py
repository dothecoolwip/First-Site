"""Convert Quaternius Medieval Weapons Pack OBJs (CC0) into compact indexed geometry for the Fantasy weapon set.

Output convention (matches buildWeapon): length along +y, the hand at y=0, edges / axe bits facing +z.
Positions are stored in millimetres as ints; normals are rebuilt flat in the browser.
"""
import sys, json, math

def parse(path):
    V, groups, cur = [], {}, None
    for line in open(path):
        p = line.split()
        if not p: continue
        if p[0] == 'v': V.append([float(a) for a in p[1:4]])
        elif p[0] == 'usemtl': cur = p[1]; groups.setdefault(cur, [])
        elif p[0] == 'f':
            idx = [int(t.split('/')[0]) - 1 for t in p[1:]]
            for i in range(1, len(idx) - 1): groups[cur].append((idx[0], idx[i], idx[i + 1]))
    return V, groups

def mtl(path):
    out, cur = {}, None
    for line in open(path):
        p = line.split()
        if not p: continue
        if p[0] == 'newmtl': cur = p[1]
        elif p[0] == 'Kd' and cur: out[cur] = [float(a) for a in p[1:4]]
    return out

METAL = {'Steel', 'LightSteel', 'DarkSteel', 'Gold', 'LightGold', 'Red', 'LightRed', 'Black'}

def convert(D, name, length, grip, guard_at=None):
    V, groups = parse(f'{D}/{name}.obj'); K = mtl(f'{D}/{name}.mtl')
    ys = [v[1] for v in V]; y0, y1 = min(ys), max(ys)
    s = length / (y1 - y0)
    # centre the grip / haft on the axis
    wood = [i for m, tris in groups.items() if 'Wood' in m or m in ('Black', 'DarkBrown') for t in tris for i in t]
    if wood:
        cx = (min(V[i][0] for i in wood) + max(V[i][0] for i in wood)) / 2
        cz = (min(V[i][2] for i in wood) + max(V[i][2] for i in wood)) / 2
    else: cx = cz = 0
    if guard_at is not None:  # bladed: crossguard sits just above the hand
        low = [v for v in V if v[1] < y0 + (y1 - y0) * 0.4]
        gy = max(low, key=lambda v: abs(v[0] - cx))[1]
        ty = guard_at - gy * s
    else: ty = grip - y0 * s  # hafted: the hand is `grip` metres above the butt
    def tf(v):
        x, y, z = (v[0] - cx) * s, v[1] * s - ty, (v[2] - cz) * s
        return [-z, y, x]  # rotate so +x (axe bit) faces +z
    mats = []
    for m, tris in groups.items():
        remap, verts, idx = {}, [], []
        for t in tris:
            for i in t:
                if i not in remap:
                    remap[i] = len(verts) // 3
                    verts += [round(q * 1000) for q in tf(V[i])]
                idx.append(remap[i])
        kd = K.get(m, [0.5, 0.5, 0.5])
        mats.append({'n': m, 'c': [round(c, 3) for c in kd], 'm': 1 if m in METAL else 0, 'v': verts, 'i': idx})
    return {'mats': mats}

D = sys.argv[1]
spec = {
    # key: (obj, overall length m, hand above butt m (hafted) | None, guard height above hand (bladed))
    'f_sword':     ('Sword', 0.98, None, 0.07),
    'f_rune':      ('Sword_2', 0.98, None, 0.07),
    'f_golden':    ('Sword_Golden', 1.04, None, 0.07),
    'f_great':     ('Sword_Big', 1.3, None, 0.07),
    'f_claymore':  ('Claymore', 1.4, None, 0.07),
    'f_axe':       ('Axe', 0.86, 0.1, None),
    'f_hatchet':   ('Axe_Small', 0.55, 0.08, None),
    'f_dblaxe':    ('Axe_Double', 1.3, 0.38, None),
    'f_hammer':    ('Hammer_Small', 0.8, 0.1, None),
    'f_maul':      ('Hammer_Double', 1.18, 0.36, None),
    'f_scythe':    ('Scythe', 1.75, 0.5, None),
    'f_spear':     ('Spear', 2.25, 0.55, None),
}
out = {k: convert(D, o, L, g, ga) for k, (o, L, g, ga) in spec.items()}
js = '// Fantasy weapon geometry from the Medieval Weapons Pack by Quaternius (quaternius.com), CC0\nconst FANTASY_GEO = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(sys.argv[2], 'w').write(js)
print({k: sum(len(m['i']) // 3 for m in v['mats']) for k, v in out.items()}, len(js) // 1024, 'KB')
