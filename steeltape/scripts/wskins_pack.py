# Cosmetic weapon skins: decimate (vertex clustering), orient and normalise baked CC0 weapon meshes -> src/wskin_geo.js
# Normalised frame (matches buildWeapon): long axis +Y. Hafted: butt at y=0, top at y=1. Bladed: guard at y=0, blade tip at y=1.
# Flat of the blade faces +-Z (edges along X). Axe/pick bits point +Z.
import json, sys, glob, base64, struct
import numpy as np
D = sys.argv[1]; OUT = sys.argv[2]; FLIP = set(sys.argv[3].split(',')) if len(sys.argv) > 3 and sys.argv[3] else set()
L = json.load(open(D + '/list.json'))
raw = {}
for f in sorted(glob.glob(D + '/b*.json')): raw.update(json.load(open(f)))
HAFT = {'axe', 'mace', 'longaxe', 'polearm'}
def cluster(P, C, I, cell):
    q = np.floor(P / cell).astype(np.int64); q -= q.min(0)
    key = (q[:, 0] * 73856093) ^ (q[:, 1] * 19349663) ^ (q[:, 2] * 83492791)
    _, inv = np.unique(np.stack([q[:, 0], q[:, 1], q[:, 2]], 1), axis=0, return_inverse=True); inv = inv.ravel()
    n = inv.max() + 1; cnt = np.bincount(inv, minlength=n).astype(np.float64)
    NP = np.stack([np.bincount(inv, P[:, k], n) for k in range(3)], 1) / cnt[:, None]
    NC = np.stack([np.bincount(inv, C[:, k], n) for k in range(3)], 1) / cnt[:, None]
    T = inv[I.reshape(-1, 3)]
    T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 0] != T[:, 2])]
    T = np.unique(np.sort(T, 1) * 0 + T, axis=0) if len(T) else T
    # drop duplicate faces (same vertex set)
    _, ui = np.unique(np.sort(T, 1), axis=0, return_index=True); T = T[np.sort(ui)]
    used = np.unique(T); remap = -np.ones(n, np.int64); remap[used] = np.arange(len(used))
    return NP[used], NC[used], remap[T]
out = {}; report = []
for it in L:
    k, fam = it['k'], it['fam']; m = raw.get(k)
    if not m: print('missing', k); continue
    P = np.array(m['pos'], np.float64).reshape(-1, 3) / 1000; C = np.array(m['col'], np.float64).reshape(-1, 3); I = np.array(m['idx'], np.int64)
    P -= P.mean(0)
    # principal axes: long -> Y
    w, V = np.linalg.eigh(np.cov(P.T)); order = np.argsort(w)[::-1]; V = V[:, order]
    Q = P @ V  # columns: long, mid, thin
    Q = Q[:, [1, 0, 2]]  # x=mid, y=long, z=thin
    y = Q[:, 1]; y0, y1 = y.min(), y.max(); Lm = y1 - y0
    t = (y - y0) / Lm; nb = 24; sl = np.minimum((t * nb).astype(int), nb - 1)
    spread = np.array([np.abs(Q[sl == b][:, [0, 2]]).max() if np.any(sl == b) else 0 for b in range(nb)])
    if fam in HAFT:
        top_heavy = spread[int(nb * 0.7):].mean() >= spread[:int(nb * 0.3)].mean()
        if not top_heavy: Q[:, 1] *= -1; Q[:, 0] *= -1
    else:
        g = int(np.argmax(spread)); longer_up = (nb - 1 - g) >= g
        if not longer_up: Q[:, 1] *= -1; Q[:, 0] *= -1
    if k in FLIP: Q[:, 1] *= -1; Q[:, 0] *= -1
    y = Q[:, 1]; y0, y1 = y.min(), y.max(); Lm = y1 - y0; t = (y - y0) / Lm; sl = np.minimum((t * nb).astype(int), nb - 1)
    if fam in HAFT:
        # haft centre line from the lower half; turn so the head sticks out toward +Z
        lo = t < 0.5; cx, cz = np.median(Q[lo, 0]), np.median(Q[lo, 2]); Q[:, 0] -= cx; Q[:, 2] -= cz
        hd = t > 0.72; H = Q[hd][:, [0, 2]]; far = H[np.argmax((H ** 2).sum(1))]; ang = np.arctan2(far[0], far[1])
        if fam in ('axe', 'longaxe') or fam == 'polearm':
            c, s = np.cos(-ang), np.sin(-ang); X, Z = Q[:, 0].copy(), Q[:, 2].copy(); Q[:, 0] = c * X + s * Z; Q[:, 2] = -s * X + c * Z
        Q[:, 1] = (Q[:, 1] - y0) / Lm; Q[:, 0] /= Lm; Q[:, 2] /= Lm; meta = {'g': 0}
    else:
        cx = np.median(Q[t > 0.5, 0]); cz = np.median(Q[t > 0.5, 2]); Q[:, 0] -= cx; Q[:, 2] -= cz
        Q[:, 1] = (Q[:, 1] - y0) / Lm; Q[:, 0] /= Lm; Q[:, 2] /= Lm; meta = {'g': 0}
    # decimate to roughly 1200-1800 triangles
    lo_c, hi_c = 1 / 400, 1 / 20
    for _ in range(18):
        cell = (lo_c * hi_c) ** 0.5; NP, NC, T = cluster(Q, C, I, cell)
        if len(T) > 1800: lo_c = cell
        elif len(T) < 1100: hi_c = cell
        else: break
    pq = np.round(NP * 16000).astype(np.int64); assert np.abs(pq).max() < 32767, k
    cb = np.clip(np.round(NC), 0, 255).astype(np.uint8)
    out[k] = {'n': it['n'], 'f': fam, **meta, 'p': base64.b64encode(struct.pack('<%dh' % pq.size, *pq.ravel())).decode(), 'c': base64.b64encode(cb.tobytes()).decode(), 'i': base64.b64encode(struct.pack('<%dH' % T.size, *T.ravel())).decode()}
    report.append((k, fam, len(NP), len(T), round(float(Lm), 2)))
js = '// Cosmetic weapon skins: 3D Orc Weapons Pack and 3D Fantasy Weapons Pack 2 (polyy.ai, CC0). Decimated and normalised by scripts/wskins_pack.py\nvar WSKIN_GEO = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
for r in report: print(*r)
print('KB', len(js) // 1024)
