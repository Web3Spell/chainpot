import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Counter, Timeline } from '../infographics';
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
      <Background intensity={0.9} cy={42} glow={'rgba(139,92,246,0.32)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={V}>The original fintech</Eyebrow></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 30, opacity: fadeIn(frame, 14, 12) }}>
          <Counter to={2200} dur={46} style={{ fontFamily: FONT.display, fontSize: 280, color: COLORS.white, lineHeight: 0.92, letterSpacing: -4 }} />
          <div style={{ fontFamily: FONT.mono, fontSize: 40, color: V, letterSpacing: 12, marginTop: 6 }}>YEARS OLD</div>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white, marginTop: 40, opacity: fadeIn(frame, 40, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          Older than every{'\n'}<span style={{ color: V }}>bank alive today.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Ages: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={34} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>The same circle, through time</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 72, color: COLORS.white, marginTop: 18, marginBottom: 50, opacity: fadeIn(frame, 12, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          One idea.{'\n'}<span style={{ color: V }}>Two thousand years.</span>
        </div>
        <Timeline
          delay={18}
          accent={V}
          phases={[
            { tag: '~200 BCE', title: 'China', sub: 'first recorded rotating savings circle', state: 'done' },
            { tag: '1255 CE', title: 'Japan — “mujin”', sub: 'Buddhist temples ran interest-free circles', state: 'done' },
            { tag: 'Today', title: 'On-chain, on Base', sub: 'the same idea, now unbreakable', state: 'now' },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(139,92,246,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          The idea never{'\n'}changed.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 64, color: V, marginTop: 34, opacity: fadeIn(frame, 32, 14), lineHeight: 1.08, maxWidth: 900, whiteSpace: 'pre-line' }}>
          We just made it{'\n'}impossible to break.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortW: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Ages /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'The world’s oldest bank,\nfinally trustless.'} sub="2,200 years → live on Base" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Save the old way.\nThe trustless way.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_w.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 40, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 18, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 34, src: 'pop.wav', v: 0.32 }, { s: 1, at: 50, src: 'pop.wav', v: 0.32 }, { s: 1, at: 66, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 6, src: 'impact.wav', v: 0.42 }, { s: 2, at: 32, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
