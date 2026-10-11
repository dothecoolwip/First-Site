"""Convert selected Quaternius OBJ models (CC0) into compact JS geometry for Steel & Tape."""
import sys, json, math
def parse(path):
    V, N, out, cur = [], [], {}, None
    for line in open(path):
        p = line.split()
        if not p: continue
        if p[0] == 'v': V.append([float(a) for a in p[1:4]])
        elif p[0] == 'vn': N.append([float(a) for a in p[1:4]])
        elif p[0] == 'usemtl': cur = p[1]; out.setdefault(cur, [])
        elif p[0] == 'f':
            idx = [(int(t.split('/')[0]) - 1, int(t.split('/')[2]) - 1 if t.count('/') == 2 and t.split('/')[2] else None) for t in p[1:]]
            for i in range(1, len(idx) - 1): out[cur].append((idx[0], idx[i], idx[i + 1]))
    return V, N, out
def convert(path, length=None, width=None, rot_y=0.0, guard_at=None):
    V, N, groups = parse(path)
    ys = [v[1] for v in V]; xs = [v[0] for v in V]
    if length: s = length / (max(ys) - min(ys))
    else: s = width / (max(xs) - min(xs))
    ty = 0.0
    if guard_at is not None:  # crossguard = widest point of the hilt region
        low = [v for v in V if v[1] < min(ys) + (max(ys) - min(ys)) * 0.35]
        gy = max(low, key=lambda v: abs(v[0]))[1]
        ty = guard_at - gy * s
    else: ty = -(max(ys) + min(ys)) / 2 * s
    c, sn = math.cos(rot_y), math.sin(rot_y)
    def tf(v): x, y, z = v[0] * s, v[1] * s + ty, v[2] * s; return [x * c + z * sn, y, -x * sn + z * c]
    def tn(n): x, y, z = n; return [x * c + z * sn, y, -x * sn + z * c]
    W = (max(xs) - min(xs)) * s; H = (max(ys) - min(ys)) * s
    res = {}
    for mat, tris in groups.items():
        pos, nor, uv = [], [], []
        for t in tris:
            pts = [tf(V[i]) for i, _ in t]
            if all(n is not None for _, n in t): ns = [tn(N[n]) for _, n in t]
            else:
                a, b, cc = pts; u = [b[k] - a[k] for k in range(3)]; w = [cc[k] - a[k] for k in range(3)]
                n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; l = math.sqrt(sum(q * q for q in n)) or 1; ns = [[q / l for q in n]] * 3
            for (i, _), p, n in zip(t, pts, ns):
                pos += [round(q, 4) for q in p]; nor += [round(q, 3) for q in n]
                ox = V[i][0] * s; oy = V[i][1] * s + ty
                uv += [round(ox / W + 0.5, 4), round((oy - (ty if guard_at is None else 0)) / H + 0.5 if guard_at is None else oy / H, 4)]
        res[mat] = {'p': pos, 'n': nor, 'u': uv}
    return res
D = sys.argv[1]
assets = {
    'sword': convert(D + '/Sword.obj', length=0.92, rot_y=math.pi / 2, guard_at=0.068),
    'longsword': convert(D + '/Sword_Big.obj', length=1.18, rot_y=math.pi / 2, guard_at=0.068),
    'heater': convert(D + '/Shield_Heater.obj', width=0.5),
}
js = '// Weapon and shield geometry from the Medieval Weapons Pack by Quaternius (quaternius.com), CC0\nconst ASSET_GEO = ' + json.dumps(assets, separators=(',', ':')) + ';\n'
open(sys.argv[2], 'w').write(js)
print({k: {m: len(g['p']) // 9 for m, g in v.items()} for k, v in assets.items()}, len(js) // 1024, 'KB')
