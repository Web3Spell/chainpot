import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Timeline } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const V = COLORS.violet;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(139,92,246,0.32)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={V}>The road ahead</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 108, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          We’re just{'\n'}<span style={{ color: V }}>getting started.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Roadmap: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>What’s shipping</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 18, marginBottom: 50, opacity: fadeIn(frame, 12, 12) }}>
          v3 → v4 → <span style={{ color: V }}>mainnet.</span>
        </div>
        <Timeline
          delay={18}
          accent={V}
          phases={[
            { tag: 'Shipped', title: 'v3 — audited & live', sub: '5 contracts on Base testnet', state: 'done' },
            { tag: 'In progress', title: 'v4 — battle-hardened', sub: 'external audit · collateral + slashing · multisig', state: 'now' },
            { tag: 'Next', title: 'v5 — mainnet', sub: 'Base mainnet · mobile PWA · 10 pilot circles', state: 'next' },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Vision: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(139,92,246,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 100, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          2 billion people{'\n'}save in circles.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 56, color: V, marginTop: 36, opacity: fadeIn(frame, 32, 14), maxWidth: 900 }}>
          We’re putting all of them on-chain.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortT: React.FC = () => {
  const durations = [180, 210, 180, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Roadmap /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Vision /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'The future of the\nworld’s oldest bank.'} sub="v3 → v4 → mainnet" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Join the\nfirst circles.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_t.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 18, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 32, src: 'pop.wav', v: 0.34 }, { s: 1, at: 45, src: 'pop.wav', v: 0.34 }, { s: 1, at: 58, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 8, src: 'impact.wav', v: 0.4 }, { s: 2, at: 30, src: 'bell.wav', v: 0.38 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
