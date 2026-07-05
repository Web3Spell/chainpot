import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const A = '#FF6FB5';
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(255,111,181,0.26)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={A}>2024&apos;s money trend</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          Loud budgeting{'\n'}is just a savings circle{'\n'}<span style={{ color: A }}>with extra steps.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chips = ['#LoudBudgeting', 'public accountability', 'actually pays out'];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={34} glow={'rgba(255,111,181,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>Save out loud</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, marginTop: 18, marginBottom: 28, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          A flex with{'\n'}<span style={{ color: A }}>a payout.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 39, color: COLORS.white80, opacity: fadeIn(frame, 24, 12), lineHeight: 1.32, maxWidth: 880, marginBottom: 42 }}>
          &ldquo;Loud budgeting&rdquo; blew up in 2024 — saving money, out loud, as a flex. And 40% of Gen Z now learn money from short videos like this one.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {chips.map((c, i) => {
            const at = 40 + i * 11;
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{ opacity: sp, transform: `scale(${0.85 + sp * 0.15})`, padding: '16px 30px', borderRadius: 999, background: `${A}22`, border: `1px solid ${A}`, fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, letterSpacing: 0.5 }}>
                {c}
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 23, color: COLORS.white40, marginTop: 36, opacity: fadeIn(frame, 84, 14) }}>
          Loud budgeting: Jan 2024, 1M+ views · 40% of 18–27s learn finance on social (CNBC/FIS, 2024)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(255,111,181,0.28)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 104, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          Same energy.{'\n'}<span style={{ color: A }}>Real payout.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white80, marginTop: 40, opacity: fadeIn(frame, 34, 14), maxWidth: 880, lineHeight: 1.3 }}>
          A ChainPot circle is saving out loud with your people — everyone shows up, on-chain — plus a real lump sum when it&apos;s your turn, and yield while you wait.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortZ: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Context /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Save out loud.\nGet paid.'} sub="your circle, on-chain" accent={A} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Make saving\na flex.'} accent={A} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_z.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 38, src: 'pop.wav', v: 0.36 }, { s: 0, at: 52, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 12, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 40, src: 'pop.wav', v: 0.34 }, { s: 1, at: 51, src: 'pop.wav', v: 0.34 }, { s: 1, at: 62, src: 'pop.wav', v: 0.34 },
        { s: 2, at: -6, src: 'riser.wav', v: 0.4 }, { s: 2, at: 6, src: 'impact.wav', v: 0.55 }, { s: 2, at: 30, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.48 }, { s: 3, at: 38, src: 'bell.wav', v: 0.4 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
