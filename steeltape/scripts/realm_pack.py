# Pack baked realm models (Quaternius MegaKit/Farm/Crops/RPG/Posed, KayKit Forest, Kenney Retro) into src/realm_geo.js
# in the same format as PACK_GEO: Int16 mm positions, RGB bytes, Uint16/32 indices. Centred on x/z, standing on y=0,
# optionally rescaled to a real-world height, and decimated by vertex clustering when over budget.
import json, sys, glob, base64, struct
import numpy as np
D, OUT = sys.argv[1], sys.argv[2]
H = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
raw = {}
for f in sorted(glob.glob(D + '/b*.json')): raw.update(json.load(open(f)))
def cluster(P, C, I, cell):
    q = np.floor(P / cell).astype(np.int64); q -= q.min(0)
    _, inv = np.unique(q, axis=0, return_inverse=True); inv = inv.ravel(); n = inv.max() + 1
    cnt = np.bincount(inv, minlength=n).astype(np.float64)
    NP = np.stack([np.bincount(inv, P[:, k], n) for k in range(3)], 1) / cnt[:, None]
    NC = np.stack([np.bincount(inv, C[:, k], n) for k in range(3)], 1) / cnt[:, None]
    T = inv[I.reshape(-1, 3)]; T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 0] != T[:, 2])]
    _, ui = np.unique(np.sort(T, 1), axis=0, return_index=True); T = T[np.sort(ui)]
    used = np.unique(T); rm = -np.ones(n, np.int64); rm[used] = np.arange(len(used))
    return NP[used], NC[used], rm[T]
out = {}; tot = 0
for k, m in raw.items():
    P = np.array(m['pos'], np.float64).reshape(-1, 3) / 1000; C = np.array(m['col'], np.float64).reshape(-1, 3); I = np.array(m['idx'], np.int64)
    if len(I) < 3: print('empty', k); continue
    lo, hi = P.min(0), P.max(0); P[:, 0] -= (lo[0] + hi[0]) / 2; P[:, 2] -= (lo[2] + hi[2]) / 2; P[:, 1] -= lo[1]
    h = hi[1] - lo[1]; want = H.get(k) or next((v for p, v in H.items() if p.endswith('*') and k.startswith(p[:-1])), None)
    if want and want < 0: P *= -want
    elif want: P *= want / max(h, 1e-6)
    elif max(hi - lo) > 30: P *= 0.01  # centimetre exports
    tris = len(I) // 3; budget = 2600 if k.startswith('po_') else 3600
    if tris > budget:
        ext = (P.max(0) - P.min(0)).max(); lo_c, hi_c = ext / 600, ext / 15
        for _ in range(16):
            cell = (lo_c * hi_c) ** 0.5; NP, NC, T = cluster(P, C, I, cell)
            if len(T) > budget: lo_c = cell
            elif len(T) < budget * 0.6: hi_c = cell
            else: break
        P, C, I = NP, NC, T.ravel()
    # dedupe identical vertices (same position and colour)
    key = np.concatenate([np.round(P * 1000).astype(np.int64), (np.clip(C, 0, 255).astype(np.int64) >> 3)], 1)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True); inv = inv.ravel()
    P2, C2 = P[first], C[first]; I2 = inv[I.reshape(-1)].reshape(-1, 3); I2 = I2[(I2[:, 0] != I2[:, 1]) & (I2[:, 1] != I2[:, 2]) & (I2[:, 0] != I2[:, 2])]
    pq = np.round(P2 * 1000).astype(np.int64)
    if np.abs(pq).max() > 32767: print('too big, scaling', k, np.abs(pq).max()); pq = np.clip(pq, -32767, 32767)
    nv = len(pq); big = nv > 65535
    pb = struct.pack('<%dh' % pq.size, *pq.ravel()); cb = np.clip(np.round(C2), 0, 255).astype(np.uint8).tobytes(); ib = struct.pack(('<%dI' if big else '<%dH') % I2.size, *I2.ravel())
    out[k] = {'p': base64.b64encode(pb).decode(), 'c': base64.b64encode(cb).decode(), 'i': base64.b64encode(ib).decode(), 'b': 1 if big else 0}
    tot += len(pb) + len(cb) + len(ib)
    ext = (pq.max(0) - pq.min(0)) / 1000
    print(f'{k} {nv}v {len(I2)}t size {ext[0]:.2f}x{ext[1]:.2f}x{ext[2]:.2f}')
js = ('// Realm models: Quaternius (Fantasy Props MegaKit, Farm Buildings, Nature Crops, Ultimate RPG Items, Posed Background Characters; CC0),\n'
      '// KayKit Forest Nature (CC0), Kenney Retro Medieval Kit (CC0). Baked to vertex colours by tools/bake, packed by scripts/realm_pack.py\n'
      'var REALM_GEO = ' + json.dumps(out, separators=(',', ':')) + ';\n')
open(OUT, 'w').write(js); print('raw', tot // 1024, 'KB; js', len(js) // 1024, 'KB')
