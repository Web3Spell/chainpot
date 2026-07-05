import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Counter } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const G = COLORS.green;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(25,251,155,0.22)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={G}>South Africa</Eyebrow></div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 28, opacity: fadeIn(frame, 14, 12) }}>
          <Counter to={50} dur={46} prefix="R" suffix="B" style={{ fontFamily: FONT.display, fontSize: 260, color: G, lineHeight: 0.9, letterSpacing: -4 }} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 38, color: COLORS.white60, letterSpacing: 6, marginTop: 4, opacity: fadeIn(frame, 22, 12) }}>SAVED EVERY YEAR</div>
        <div style={{ fontFamily: FONT.display, fontSize: 72, color: COLORS.white, marginTop: 40, opacity: fadeIn(frame, 40, 12), lineHeight: 1.04 }}>
          Without a single bank.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const STATS = [
  { value: 810000, compact: true, decimals: 0, suffix: '', label: 'active stokvels' },
  { value: 11.5, compact: false, decimals: 1, suffix: 'M', label: 'members' },
  { value: 50, compact: false, decimals: 0, prefix: 'R', suffix: 'bn', label: 'saved / year' },
] as const;

const Data: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={34} glow={'rgba(25,251,155,0.18)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Entirely outside the banks</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 18, marginBottom: 56, opacity: fadeIn(frame, 12, 12) }}>
          A nation saving <span style={{ color: G }}>in circles.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {STATS.map((s, i) => {
            const at = 22 + i * 12;
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            const o = fadeIn(frame, at, 10);
            return (
              <div key={i} style={{
                opacity: o, transform: `translateX(${(1 - sp) * -40}px)`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
                padding: '30px 40px', borderRadius: 26,
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${G}33`,
                boxShadow: `0 24px 60px -34px ${G}`,
              }}>
                <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: COLORS.white }}>{s.label}</div>
                <Counter to={s.value} delay={at} dur={36} compact={s.compact} decimals={s.decimals}
                  prefix={'prefix' in s ? (s as { prefix?: string }).prefix ?? '' : ''} suffix={s.suffix}
                  style={{ fontFamily: FONT.display, fontSize: 76, color: G, letterSpacing: -1 }} />
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white40, letterSpacing: 1, marginTop: 36, opacity: fadeIn(frame, 64, 14) }}>
          Stokvels — South Africa · IOL, 2023
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(25,251,155,0.2)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 82, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.06, whiteSpace: 'pre-line' }}>
          Stokvels run on trust.{'\n'}<span style={{ color: G }}>ChainPot runs on trust{'\n'}you can verify.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 42, color: COLORS.white80, marginTop: 40, opacity: fadeIn(frame, 34, 14), lineHeight: 1.3, maxWidth: 880 }}>
          Every contribution, bid and payout is a public on-chain event — and the idle pot earns yield while it waits.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortX: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Data /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Your stokvel,\nupgraded.'} sub="on-chain · yield-bearing" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Bring your circle\non-chain.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_x.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 22, src: 'pop.wav', v: 0.34 }, { s: 1, at: 34, src: 'pop.wav', v: 0.34 }, { s: 1, at: 46, src: 'pop.wav', v: 0.34 }, { s: 1, at: 64, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 6, src: 'impact.wav', v: 0.42 }, { s: 2, at: 34, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
