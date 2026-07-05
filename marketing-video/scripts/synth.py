import numpy as np, wave, os

SR = 48000
OUT = "/Users/rythme/developer/blockchain/chainpot/marketing-video/public/sfx"
os.makedirs(OUT, exist_ok=True)

try:
    from scipy.signal import lfilter
    HAVE_SCIPY = True
except Exception:
    HAVE_SCIPY = False

def midi(m): return 440.0 * 2 ** ((m - 69) / 12.0)
def t(n): return np.arange(n) / SR
def env_exp(n, tau): return np.exp(-t(n) / tau)
def sine(f, n, phase=0.0): return np.sin(2 * np.pi * f * t(n) + phase)

def lp(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    if HAVE_SCIPY:
        return lfilter([a], [1, -(1 - a)], x, axis=0)
    if x.ndim == 2:
        return np.stack([lp(x[:, 0], cutoff), lp(x[:, 1], cutoff)], axis=1)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y

def hp(x, cutoff): return x - lp(x, cutoff)
def sat(x, drive): return np.tanh(x * drive)

def write_wav(name, audio, peak=0.95, glue=1.0):
    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=1)
    m = np.max(np.abs(audio)) + 1e-9
    audio = audio / m * peak
    audio = np.tanh(audio * glue) / np.tanh(glue)
    data = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{data.shape[0]/SR:.2f}s")

def super_saw(f, n, det=22, nv=7, spread=0.85):
    tt = t(n); Lc = np.zeros(n); Rc = np.zeros(n)
    for i in range(nv):
        d = (i - (nv - 1) / 2) / max(1, (nv - 1) / 2)
        fr = f * 2 ** (d * det / 1200)
        ph = (i * 0.137) % 1.0
        v = 2 * ((fr * tt + ph) % 1.0) - 1
        pan = 0.5 + 0.5 * d * spread
        Lc += v * (1 - pan); Rc += v * pan
    return np.stack([Lc, Rc], axis=1) / nv

def kick(dur=0.4):
    n = int(dur * SR)
    f = 175 * np.exp(-t(n) / 0.022) + 50
    ph = np.cumsum(2 * np.pi * f / SR)
    body = np.sin(ph) * env_exp(n, 0.13)
    click = np.random.uniform(-1, 1, n) * env_exp(n, 0.003) * 0.7
    return sat(body * 1.4 + click, 1.6)

def snare(dur=0.28):
    n = int(dur * SR)
    noise = hp(np.random.uniform(-1, 1, n), 1500)
    tone = (sine(180, n) + sine(330, n)) * 0.5
    e = env_exp(n, 0.07)
    tail = hp(np.random.uniform(-1, 1, n), 800) * env_exp(n, 0.12) * 0.3
    return sat((noise * 0.9 + tone * 0.5) * e + tail, 1.3)

def clap(dur=0.28):
    n = int(dur * SR)
    noise = hp(np.random.uniform(-1, 1, n), 1200)
    e = np.zeros(n)
    for off in (0, int(0.01 * SR), int(0.02 * SR)):
        e2 = np.zeros(n); e2[off:] = env_exp(n - off, 0.05); e = np.maximum(e, e2)
    e += env_exp(n, 0.13) * 0.4
    return noise * e

def hat(dur=0.05, opn=False):
    n = int(dur * SR)
    noise = hp(np.random.uniform(-1, 1, n), 7000)
    return noise * env_exp(n, 0.12 if opn else 0.014)

def crash(dur=1.2):
    n = int(dur * SR)
    noise = hp(np.random.uniform(-1, 1, n), 5000)
    return noise * env_exp(n, 0.5) * 0.6

def build_music(fname, BPM=160, chords=None, roots=None, det=24, drum=1.0, hatg=1.0,
                eight=1.0, padg=0.5, arpg=0.34, glue=1.2, cut_max=7000, total=30.0):
    np.random.seed(7)
    beat = 60 / BPM; bar = beat * 4
    N = int(total * SR)
    nbars = int(total / bar) + 2

    def place(buf, start, sig):
        s = int(start * SR)
        if s >= N: return
        e = min(N, s + sig.shape[0]); buf[s:e] += sig[:e - s]

    chordL = np.zeros(N); chordR = np.zeros(N)
    for b in range(nbars):
        ch = chords[b % 4]; t0 = b * bar
        n = int(bar * SR)
        stack = np.zeros((n, 2))
        for m in ch:
            stack += super_saw(midi(m), n, det=det, nv=7)
        cutoff = 1800 + (cut_max - 1800) * min(1.0, (t0 + 0.5) / 6.0)
        stack = lp(stack, cutoff)
        stack *= np.minimum(t(n) / 0.02, 1.0)[:, None]
        place(chordL, t0, stack[:, 0]); place(chordR, t0, stack[:, 1])

    arpL = np.zeros(N); arpR = np.zeros(N); step = beat / 4
    for b in range(nbars):
        ch = chords[b % 4]
        notes = [ch[0] + 12, ch[min(2, len(ch)-1)], ch[1] + 12, ch[-1], ch[min(2, len(ch)-1)] + 12, ch[1], ch[-1] + 12, ch[0] + 24]
        for s in range(16):
            tb = b * bar + s * step
            if tb >= total: break
            m = notes[s % len(notes)]
            n = int(step * 1.4 * SR)
            sig = super_saw(midi(m), n, det=max(8, det - 8), nv=3) * env_exp(n, 0.07)[:, None]
            amp = (arpg * 0.65) if tb < 3.0 else arpg
            place(arpL, tb, sig[:, 0] * amp); place(arpR, tb, sig[:, 1] * amp)

    bass = np.zeros(N); prev = roots[0]
    for b in range(nbars):
        r = roots[b % 4]; t0 = b * bar; n = int(bar * SR)
        gl = np.full(n, midi(r)); g = int(0.04 * SR)
        gl[:g] = np.linspace(midi(prev), midi(r), g)
        ph = np.cumsum(2 * np.pi * gl / SR)
        amp = env_exp(n, 0.55) * 0.9 + env_exp(n, 0.05) * 0.3
        place(bass, t0, sat(np.sin(ph) * amp * 1.5, 2.2)); prev = r

    drumL = np.zeros(N); drumR = np.zeros(N)
    K, S_, C, Ho, Hc, CR = kick(), snare(), clap(), hat(opn=True), hat(), crash()
    nbeats = int(total / beat) + 1
    for i in range(nbeats):
        tb = i * beat
        if not (0.5 < tb < total - 2.8): continue
        place(drumL, tb, K * drum); place(drumR, tb, K * drum)
        if i % 4 in (1, 3):
            place(drumL, tb, (C + S_) * 0.6 * drum); place(drumR, tb, (C + S_) * 0.6 * drum)
        place(drumL, tb, Hc * 0.5 * hatg); place(drumR, tb, Hc * 0.35 * hatg)
        place(drumL, tb + beat / 2, Ho * 0.4 * hatg); place(drumR, tb + beat / 2, Ho * 0.5 * hatg)
        place(drumL, tb + beat * 0.75, Hc * 0.25 * hatg); place(drumR, tb + beat * 0.75, Hc * 0.25 * hatg)
        if i % 16 == 15:
            for r in range(8):
                place(drumL, tb + r * (beat / 8), S_ * (0.2 + r * 0.05) * drum)
                place(drumR, tb + r * (beat / 8), S_ * (0.2 + r * 0.05) * drum)
    for cb in (0.5, total - 2.8):
        place(drumL, cb, CR * drum); place(drumR, cb, CR * drum)

    duck = np.ones(N)
    for i in range(nbeats):
        tb = i * beat
        if not (0.5 < tb < total - 2.8): continue
        s = int(tb * SR); n = int(0.30 * SR)
        d = 1 - 0.7 * np.exp(-t(min(n, N - s)) / 0.09)
        duck[s:s + len(d)] = np.minimum(duck[s:s + len(d)], d)

    tonalL = (chordL * padg + arpL + bass * 0.9 * eight) * duck
    tonalR = (chordR * padg + arpR + bass * 0.9 * eight) * duck
    L = sat((tonalL + drumL) * 0.6, 1.4); R = sat((tonalR + drumR) * 0.6, 1.4)
    fin = int(0.5 * SR); fout = int(1.5 * SR)
    g = np.ones(N); g[:fin] = np.linspace(0, 1, fin); g[-fout:] = np.linspace(1, 0, fout)
    L *= g; R *= g
    write_wav(fname, np.stack([L, R], axis=1), peak=0.97, glue=glue)

def build_sfx():
    np.random.seed(7)
    n = int(0.6 * SR)
    f = 130 * np.exp(-t(n) / 0.03) + 46
    ph = np.cumsum(2 * np.pi * f / SR)
    imp = np.sin(ph) * env_exp(n, 0.22) + 0.4 * sine(240, n) * env_exp(n, 0.025)
    write_wav("impact.wav", sat(imp * 1.3, 1.5), peak=0.92)
    n = int(0.14 * SR)
    pop = sat((super_saw(660, n, det=16, nv=3)[:, 0] + 0.4 * sine(1320, n)) * env_exp(n, 0.05), 1.4)
    write_wav("pop.wav", pop, peak=0.7)
    n = int(0.7 * SR)
    car, mod = 1046.5, 1046.5 * 2.01
    bell = np.sin(2 * np.pi * car * t(n) + 2.5 * env_exp(n, 0.18) * np.sin(2 * np.pi * mod * t(n))) * env_exp(n, 0.30)
    write_wav("bell.wav", bell, peak=0.8)
    n = int(0.5 * SR); sh = np.zeros(n)
    for i, m in enumerate([72, 76, 79, 84, 88]):
        off = int(i * 0.04 * SR); sh[off:] += sine(midi(m), n - off) * env_exp(n - off, 0.18) * 0.7
    write_wav("shimmer.wav", sh, peak=0.75)
    n = int(0.34 * SR)
    f = 380 * (2 ** (t(n) / 0.34 * 2.2)); ph = np.cumsum(2 * np.pi * f / SR)
    swish = np.sin(ph) * np.sin(np.pi * t(n) / (n / SR)) + 0.25 * sine(2400, n) * env_exp(n, 0.12)
    write_wav("swish.wav", swish, peak=0.6)
    n = int(0.8 * SR)
    f = 200 * (2 ** (t(n) / 0.8 * 2.6)); ph = np.cumsum(2 * np.pi * f / SR)
    riser = (np.sin(ph) + 0.4 * np.sin(ph * 1.5)) * np.minimum(t(n) / 0.6, 1.0)
    write_wav("riser.wav", riser, peak=0.55)
    # whoosh-free uplifter (tonal, for data reveals)
    n = int(0.6 * SR)
    chord = np.zeros((n, 2))
    for m in [60, 64, 67, 72]:
        chord += super_saw(midi(m), n, det=20, nv=5)
    up = chord * (np.minimum(t(n) / 0.5, 1.0) ** 2)[:, None]
    write_wav("uplift.wav", up, peak=0.6)

build_sfx()
# default reel track (unchanged hyperpop)
build_music("music.wav", 160,
    [[69,72,76,79],[65,69,72,77],[67,72,76,79],[67,71,74,79]], [33,29,36,31])
# A — epic data-doc (C major, brighter, cinematic)
build_music("music_a.wav", 150,
    [[72,76,79,84],[71,74,79,83],[69,72,76,81],[69,72,77,81]], [36,31,33,29],
    det=26, padg=0.7, arpg=0.30, drum=0.95)
# B — business / confident driving (A minor, faster, harder)
build_music("music_b.wav", 168,
    [[69,72,76,79],[65,69,72,77],[67,72,76,79],[67,71,74,79]], [33,29,36,31],
    det=24, drum=1.1, hatg=1.1, arpg=0.34)
# C — warm community (lower major, softer, emotional)
build_music("music_c.wav", 140,
    [[60,64,67,72],[59,62,67,71],[57,60,64,69],[57,60,65,69]], [36,31,33,29],
    det=16, drum=0.6, hatg=0.7, eight=0.8, padg=0.95, arpg=0.22, cut_max=5200)
# D — explainer / bouncy (Am G C F, clean plucky)
build_music("music_d.wav", 158,
    [[69,72,76],[67,71,74],[72,76,79],[69,72,77]], [33,31,36,29],
    det=15, drum=0.9, padg=0.42, arpg=0.36)
# E — security / dark tense minor (Am F G Em, heavy, sparse arp)
build_music("music_e.wav", 146,
    [[57,60,64],[53,57,60],[55,59,62],[52,55,59]], [33,29,31,28],
    det=20, drum=0.95, hatg=0.8, padg=0.7, arpg=0.16, cut_max=4200)
# F — yield / clean bright techy (C major high, plucky)
build_music("music_f.wav", 156,
    [[72,76,79],[71,74,79],[69,72,76],[69,72,77]], [36,31,33,29],
    det=18, drum=0.95, padg=0.5, arpg=0.38, cut_max=7600)
# G — inflation / dramatic cinematic (D minor, slow, tense)
build_music("music_g.wav", 144,
    [[62,65,69],[58,62,65],[57,60,65],[60,64,67]], [38,34,29,36],
    det=22, drum=0.9, hatg=0.9, padg=0.85, arpg=0.20, cut_max=5000)
# H — reputation / triumphant anthemic (G major, big 4-note)
build_music("music_h.wav", 150,
    [[67,71,74,79],[62,66,69,74],[64,67,71,76],[60,64,67,72]], [31,38,28,36],
    det=24, drum=1.0, padg=0.65, arpg=0.30, cut_max=7000)
# I — personas / warm global uplifting (F C G Am, mid)
build_music("music_i.wav", 152,
    [[57,60,65],[60,64,67],[59,62,67],[57,60,64]], [29,36,31,33],
    det=18, drum=0.85, hatg=0.9, padg=0.8, arpg=0.26, cut_max=5600)
# J — no-token / confident clean minor (Am F C G, darker, faster)
build_music("music_j.wav", 164,
    [[57,60,64,67],[53,57,60,65],[60,64,67,72],[55,59,62,67]], [33,29,36,31],
    det=22, drum=1.05, hatg=1.0, padg=0.55, arpg=0.30)
# K — why Base / techy bright fast (C major high, plucky)
build_music("music_k.wav", 162, [[72,76,79],[67,71,74],[69,72,76],[74,77,81]], [36,31,33,38],
    det=18, drum=1.0, padg=0.45, arpg=0.36, cut_max=7600)
# L — bidding game / playful tense minor (Am E F Dm)
build_music("music_l.wav", 160, [[57,60,64],[52,56,59],[53,57,60],[50,53,57]], [33,28,29,26],
    det=20, drum=0.95, hatg=1.0, padg=0.55, arpg=0.34)
# M — provably fair / bright trustworthy (G major)
build_music("music_m.wav", 154, [[67,71,74],[62,66,69],[64,67,71],[59,62,67]], [31,38,28,31],
    det=20, drum=0.9, padg=0.6, arpg=0.30, cut_max=6800)
# N — recovery / steady reassuring (F major)
build_music("music_n.wav", 150, [[65,69,72],[60,64,67],[62,65,69],[57,60,64]], [29,36,38,33],
    det=16, drum=0.85, padg=0.72, arpg=0.24, cut_max=5400)
# O — transparency / clean techy (C major)
build_music("music_o.wav", 158, [[60,64,67,72],[55,59,62,67],[57,60,64,69],[53,57,60,65]], [36,31,33,29],
    det=16, drum=0.95, padg=0.5, arpg=0.32, cut_max=7200)
# P — worked example / bouncy explainer (Am G C F)
build_music("music_p.wav", 156, [[69,72,76],[67,71,74],[72,76,79],[65,69,72]], [33,31,36,29],
    det=15, drum=0.9, padg=0.45, arpg=0.36)
# Q — vs alternatives / confident driving (Am F C G, fast hard)
build_music("music_q.wav", 166, [[57,60,64,67],[53,57,60,65],[60,64,67,72],[55,59,62,67]], [33,29,36,31],
    det=23, drum=1.08, hatg=1.05, padg=0.55, arpg=0.30)
# R — women / warm uplifting (F C G Am, soft)
build_music("music_r.wav", 146, [[57,60,65],[60,64,67],[59,62,67],[57,60,64]], [29,36,31,33],
    det=16, drum=0.7, hatg=0.85, padg=0.92, arpg=0.22, cut_max=5200)
# S — defaults / serious darker (D minor)
build_music("music_s.wav", 150, [[62,65,69],[57,60,65],[58,62,65],[60,64,67]], [38,33,34,36],
    det=22, drum=0.95, hatg=0.9, padg=0.8, arpg=0.20, cut_max=4800)
# T — roadmap / anthemic epic (G major big)
build_music("music_t.wav", 152, [[67,71,74,79],[64,67,71,76],[62,66,69,74],[60,64,67,72]], [31,28,38,36],
    det=24, drum=1.0, padg=0.7, arpg=0.30, cut_max=7000)
# === Batch 4 (reels 21-30) ===
# U — vanishing organizer / dark suspense, descending menace (A minor, dim cutoff)
build_music("music_u.wav", 150, [[57,60,64],[56,59,63],[55,58,62],[52,56,59]], [33,32,31,28],
    det=24, drum=0.95, hatg=0.9, padg=0.65, arpg=0.22, cut_max=5000)
# V — pyramid warning / sinister-playful (E phrygian)
build_music("music_v.wav", 158, [[52,55,59],[53,56,60],[55,58,62],[52,55,59]], [28,29,31,28],
    det=22, drum=1.0, hatg=1.05, padg=0.5, arpg=0.34, cut_max=6200)
# W — older than banks / cinematic epic history (D major grand)
build_music("music_w.wav", 144, [[62,66,69,74],[59,62,66,71],[60,64,67,72],[57,61,64,69]], [38,35,36,33],
    det=24, drum=0.85, hatg=0.9, padg=0.85, arpg=0.24, cut_max=6800)
# X — stokvel scale / triumphant bright (C major high)
build_music("music_x.wav", 165, [[60,64,67,72],[62,65,69,72],[64,67,71,76],[67,71,74,79]], [36,38,40,43],
    det=18, drum=1.05, hatg=1.05, padg=0.5, arpg=0.34, cut_max=8000)
# Y — climate resilience / warm hopeful (F major)
build_music("music_y.wav", 142, [[60,65,69],[57,60,65],[62,65,69],[59,62,67]], [36,33,38,31],
    det=16, drum=0.8, hatg=0.85, padg=0.85, arpg=0.22, cut_max=5400)
# Z — loud budgeting / genz club energy (A minor bright fast)
build_music("music_z.wav", 170, [[57,60,64],[60,64,67],[62,65,69],[64,67,71]], [33,36,38,40],
    det=22, drum=1.12, hatg=1.2, padg=0.45, arpg=0.42, cut_max=7800)
# AA — Koreatown kye / heritage warm-proud (G major soulful)
build_music("music_aa.wav", 150, [[55,59,62,67],[57,60,64,69],[60,64,67,72],[55,59,62,67]], [31,33,36,31],
    det=18, drum=0.9, hatg=0.95, padg=0.7, arpg=0.26, cut_max=6000)
# BB — stablecoins vs Visa / big macro driving (E minor anthemic)
build_music("music_bb.wav", 162, [[64,67,71],[59,62,66],[62,66,69],[57,60,64]], [40,35,38,33],
    det=24, drum=1.08, hatg=1.0, padg=0.6, arpg=0.30, cut_max=7400)
# CC — not gambling, saving / warm human data (C major mid)
build_music("music_cc.wav", 154, [[60,64,67],[55,59,62],[57,60,64],[62,65,69]], [36,31,33,38],
    det=18, drum=0.92, hatg=0.95, padg=0.62, arpg=0.30, cut_max=6600)
# DD — not your keys / serious build to bright resolve (A minor -> lift)
build_music("music_dd.wav", 150, [[57,60,64,67],[53,57,60,64],[55,59,62,67],[60,64,67,72]], [33,29,31,36],
    det=22, drum=1.0, hatg=0.95, padg=0.7, arpg=0.28, cut_max=7000)
print("done. scipy:", HAVE_SCIPY)
