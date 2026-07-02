import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

// One sound at a global frame. Wrapped in a Sequence so it starts on cue.
const Sfx: React.FC<{ at: number; src: string; volume?: number; len?: number }> = ({
  at,
  src,
  volume = 1,
  len = 60,
}) => (
  <Sequence from={Math.max(0, at)} durationInFrames={len} name={src}>
    <Audio src={staticFile(`sfx/${src}`)} volume={volume} />
  </Sequence>
);

// Scene start frames on the global timeline (TransitionSeries overlaps each by 12f)
const S = {
  hook: 0,
  problem: 118,
  solution: 226,
  auction: 334,
  kitty: 497,
  features: 635,
  cta: 773,
};

// transitions sit in the 12 frames before each scene start — soft tonal swish
const SWISH = [S.problem, S.solution, S.auction, S.kitty, S.features, S.cta].map((f) => f - 12);

type Cue = { at: number; src: string; v?: number; len?: number };

const CUES: Cue[] = [
  // ── continuous music bed (the energetic star) ──
  { at: 0, src: 'music.wav', v: 0.72, len: 900 },

  // ── transition swishes (gentle, tonal) ──
  ...SWISH.map((at) => ({ at, src: 'swish.wav', v: 0.26, len: 16 })),

  // ── Hook ──
  { at: S.hook + 11, src: 'impact.wav', v: 0.55 }, // "2B" slam
  { at: S.hook + 50, src: 'pop.wav', v: 0.26 },
  { at: S.hook + 55, src: 'pop.wav', v: 0.26 },
  { at: S.hook + 60, src: 'pop.wav', v: 0.26 },
  { at: S.hook + 64, src: 'bell.wav', v: 0.3 }, // "older than banks"

  // ── Problem (soft low impacts land each pain) ──
  { at: S.problem + 26, src: 'impact.wav', v: 0.34 },
  { at: S.problem + 42, src: 'impact.wav', v: 0.34 },
  { at: S.problem + 58, src: 'impact.wav', v: 0.34 },

  // ── Solution (riser → logo impact → shimmer) ──
  { at: S.solution - 6, src: 'riser.wav', v: 0.4 },
  { at: S.solution + 6, src: 'impact.wav', v: 0.55 },
  { at: S.solution + 26, src: 'bell.wav', v: 0.42 },

  // ── Auction (bid pops → winner bell → money shimmer) ──
  { at: S.auction + 40, src: 'pop.wav', v: 0.4 },
  { at: S.auction + 56, src: 'pop.wav', v: 0.4 },
  { at: S.auction + 72, src: 'pop.wav', v: 0.4 },
  { at: S.auction + 92, src: 'bell.wav', v: 0.5 }, // WINS
  { at: S.auction + 110, src: 'shimmer.wav', v: 0.5 }, // discount split

  // ── Kitty (spin pops → landing impact → winner bell) ──
  { at: S.kitty + 40, src: 'pop.wav', v: 0.28 },
  { at: S.kitty + 55, src: 'pop.wav', v: 0.3 },
  { at: S.kitty + 68, src: 'pop.wav', v: 0.32 },
  { at: S.kitty + 78, src: 'pop.wav', v: 0.34 },
  { at: S.kitty + 86, src: 'impact.wav', v: 0.5 }, // landing
  { at: S.kitty + 94, src: 'bell.wav', v: 0.48 }, // winner / vrf

  // ── Features (card pops → proof pops → credit bell) ──
  { at: S.features + 16, src: 'pop.wav', v: 0.4 },
  { at: S.features + 30, src: 'pop.wav', v: 0.4 },
  { at: S.features + 44, src: 'pop.wav', v: 0.4 },
  { at: S.features + 70, src: 'pop.wav', v: 0.26 },
  { at: S.features + 78, src: 'pop.wav', v: 0.26 },
  { at: S.features + 86, src: 'pop.wav', v: 0.26 },
  { at: S.features + 96, src: 'bell.wav', v: 0.4 }, // Compound credit

  // ── CTA (riser → logo impact → wordmark bell → CTA shimmer) ──
  { at: S.cta - 4, src: 'riser.wav', v: 0.4 },
  { at: S.cta + 28, src: 'impact.wav', v: 0.55 }, // logo lockup
  { at: S.cta + 40, src: 'bell.wav', v: 0.45 }, // wordmark
  { at: S.cta + 64, src: 'shimmer.wav', v: 0.55 }, // Request Access
];

export const AudioTrack: React.FC = () => (
  <>
    {CUES.map((c, i) => (
      <Sfx key={i} at={c.at} src={c.src} volume={c.v} len={c.len} />
    ))}
  </>
);
