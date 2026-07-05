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
const D = COLORS.danger;
const V = COLORS.violet;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={42} glow={'rgba(255,77,109,0.26)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={D}>A true story</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          He ran the circle{'\n'}for 15 years.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 88, color: D, marginTop: 40, opacity: fadeIn(frame, 64, 14), lineHeight: 1.04, whiteSpace: 'pre-line', textShadow: `0 0 60px ${D}66` }}>
          Then vanished{'\n'}2 days before payday.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ at: number; big: string; small: string }> = ({ at, big, small }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
  return (
    <div style={{ opacity: fadeIn(frame, at, 10), transform: `translateY(${(1 - sp) * 30}px)`, background: 'rgba(255,77,109,0.08)', border: `1px solid rgba(255,77,109,0.32)`, borderRadius: 22, padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white }}>{big}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, letterSpacing: 1 }}>{small}</span>
    </div>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={32} glow={'rgba(255,77,109,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={D}>Hyderabad · Feb 2025</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: COLORS.white, marginTop: 18, marginBottom: 40, opacity: fadeIn(frame, 12, 12) }}>
          One man held{'\n'}<span style={{ color: D }}>everyone's money.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Stat at={26} big="₹100 crore" small="gone overnight" />
          <Stat at={40} big="2,000 families" small="left with nothing" />
          <Stat at={54} big="Every phone" small="switched off" />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, marginTop: 34, opacity: fadeIn(frame, 72, 14) }}>
          Source: ETV Bharat, 2025
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PayRow: React.FC<{ at: number; label: string; ok: boolean }> = ({ at, label, ok }) => {
  const frame = useCurrentFrame();
  const o = fadeIn(frame, at, 10);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: o, background: ok ? 'rgba(139,92,246,0.1)' : 'rgba(255,77,109,0.08)', border: `1px solid ${ok ? V : D}55`, borderRadius: 18, padding: '22px 30px' }}>
      <span style={{ fontSize: 44, color: ok ? V : D }}>{ok ? '✓' : '✗'}</span>
      <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 38, color: COLORS.white }}>{label}</span>
    </div>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={38} glow={'rgba(139,92,246,0.32)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>The fix</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 18, marginBottom: 46, opacity: fadeIn(frame, 12, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          ChainPot's organizer{'\n'}<span style={{ color: V }}>never holds the pot.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <PayRow at={26} label="Can start a circle" ok={true} />
          <PayRow at={40} label="Can touch your funds" ok={false} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, marginTop: 36, opacity: fadeIn(frame, 58, 14), lineHeight: 1.4 }}>
          Custody is the smart contract.{'\n'}No phone to switch off.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortU: React.FC = () => {
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
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Trust the contract,\nnot the collector.'} sub="live on Base testnet" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Join a circle\nno one can run.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_u.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 64, src: 'impact.wav', v: 0.55 },
        { s: 1, at: 26, src: 'pop.wav', v: 0.36 }, { s: 1, at: 40, src: 'pop.wav', v: 0.36 }, { s: 1, at: 54, src: 'pop.wav', v: 0.36 }, { s: 1, at: 72, src: 'bell.wav', v: 0.34 },
        { s: 2, at: -6, src: 'riser.wav', v: 0.4 }, { s: 2, at: 8, src: 'uplift.wav', v: 0.44 }, { s: 2, at: 26, src: 'bell.wav', v: 0.36 }, { s: 2, at: 40, src: 'pop.wav', v: 0.34 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.5 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
