"""Slice the uploaded CC0/CC-BY packs into short game clips (mono MP3) for Steel & Tape."""
import subprocess, sys, os, json, numpy as np, shutil, glob
UP, OUT = sys.argv[1], sys.argv[2]
SR = 44100
def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def save(x, name, br='96k'):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', br, os.path.join(OUT, name + '.mp3')], input=x.astype(np.float32).tobytes(), check=True)
    return name
def env(x, win=441):
    a = np.abs(x); k = np.ones(win) / win
    return np.convolve(a, k, mode='same')
def onsets(x, maxn, min_gap=0.35, rel=0.3):
    e = env(x); thr = max(rel * e.max(), 0.01); out = []; i = 0; gap = int(min_gap * SR)
    above = e > thr
    while i < len(x) and len(out) < maxn:
        idx = np.argmax(above[i:]) + i
        if not above[idx]: break
        out.append(idx); i = idx + gap
        while i < len(x) and above[i]: i += 1
    return out
def clip(x, start, dur, fade=0.08):
    s = max(0, start - int(0.008 * SR)); seg = x[s:s + int(dur * SR)].copy()
    f = int(fade * SR); seg[-f:] *= np.linspace(1, 0, f)
    return seg
made = []
def slice_file(path, prefix, n, dur, start_idx):
    x = load(path); k = start_idx
    for o in onsets(x, n):
        made.append(save(clip(x, o, dur), f'{prefix}{k}')); k += 1
    return k
W1, W2 = os.path.join(UP, 'medieval_sfx_weapon_on_weapon_1_of_2'), os.path.join(UP, 'medieval_sfx_weapon_on_weapon_2_of_2')
T2 = os.path.join(UP, 'medieval_sfx_textures_2_of_2')
k = 0
for f in ['Sabre Norse Sword Blade on Blade', 'Norse Sword Katana Blade on Blade', 'Axe Norse Sword Blade on Blade', 'Sabre Katana Blade on Blade']:
    k = slice_file(os.path.join(W1, f + '.wav'), 'clash', 2, 0.9, k)
for f in ['Seax Norse Sword Blade on Blade', 'Spear Norse Sword Blade on Blade']:
    k = slice_file(os.path.join(W2, f + '.wav'), 'clash', 2, 0.9, k)
k = 0
for f in ['Mace Norse Sword Blade', 'Mace Sabre Blade', 'Mace Katana Blade', 'Mace Axe Blade and Haft', 'Mace Spear Blade']:
    k = slice_file(os.path.join(W1, f + '.wav'), 'heavy', 2, 0.85, k)
k = 0
for f, d in [('Axe Spear Haft on Haft', W1), ('Axe Sabre Haft on Blade', W1), ('Spear Spear Haft on Haft', W2), ('Spear Katana Haft on Blade', W2)]:
    k = slice_file(os.path.join(d, f + '.wav'), 'haft', 2, 0.6, k)
k = 0
for f in ['Axe Swing', 'Spear Swing']: k = slice_file(os.path.join(T2, f + '.wav'), 'swingH', 3, 0.55, k)
k = 0
for f in ['Sabre Swing', 'Seax Swing']: k = slice_file(os.path.join(T2, f + '.wav'), 'swingL', 3, 0.45, k)
slice_file(os.path.join(T2, 'Sabre Draw Fast.wav'), 'drawS', 1, 0.8, 0)
# armoured steps on concrete
steps = sorted(glob.glob(os.path.join(UP, 'steps', '*.wav')))[:10]
for i, f in enumerate(steps): made.append(save(load(f), f'mstep{i}', '64k'))
# effort grunts and yells (male)
Y = os.path.join(UP, 'yell', 'yelling sounds')
for i, f in enumerate(['3grunt1', '3grunt2', '3grunt3', '3grunt4', '3grunt5', '3grunt6']):
    x = load(os.path.join(Y, f + '.wav')); o = onsets(x, 1, rel=0.2); s = o[0] if o else 0
    made.append(save(clip(x, s, 0.5, 0.06), f'grunt{i}', '64k'))
for i, f in enumerate(['1yell2', '1yell6', '2yell1', '3yell3']):
    x = load(os.path.join(Y, f + '.wav')); o = onsets(x, 1, rel=0.2); s = o[0] if o else 0
    made.append(save(clip(x, s, 0.9, 0.1), f'yell{i}', '64k'))
# tape rip for the repair bench
made.append(save(load(sys.argv[3]), 'taperip', '96k'))
# crowd (Gregor Quendel, CC BY 4.0)
C = glob.glob(os.path.join(UP, 'crowd', '*'))[0]
def crowd(num, name, start, dur, br='80k'):
    f = glob.glob(os.path.join(C, f'* - {num} - *.mp3'))[0]; x = load(f)
    seg = x[int(start * SR): int((start + dur) * SR)].copy(); fi = int(0.4 * SR); seg[:fi] *= np.linspace(0, 1, fi); seg[-fi:] *= np.linspace(1, 0, fi)
    made.append(save(seg, name, br))
crowd('10', 'crowdBed', 5, 28)
crowd('05', 'cheerSoft', 0, 6)
crowd('03', 'cheerBig', 0, 6.5)
crowd('07', 'crowdChatter', 3, 10)
print(json.dumps(made))
