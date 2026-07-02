import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { ComparisonMatrix } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const A = '#F5B544'; // amber — spot-the-scam accent
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={42} glow={'rgba(245,181,68,0.22)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={A}>Spot the fake</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          If a "savings circle"{'\n'}promises you returns —
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 200, color: A, marginTop: 18, opacity: fadeIn(frame, 60, 14), textShadow: `0 0 80px ${A}66`, letterSpacing: -2 }}>
          run.
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
    <div style={{ opacity: fadeIn(frame, at, 10), transform: `translateY(${(1 - sp) * 30}px)`, background: 'rgba(245,181,68,0.08)', border: `1px solid rgba(245,181,68,0.34)`, borderRadius: 22, padding: '26px 34px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white }}>{big}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, letterSpacing: 1 }}>{small}</span>
    </div>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={32} glow={'rgba(245,181,68,0.2)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>The "Blessing Loom"</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: COLORS.white, marginTop: 18, marginBottom: 40, opacity: fadeIn(frame, 12, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          A pyramid in a{'\n'}<span style={{ color: A }}>circle's clothing.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Stat at={26} big="800% promised" small="returns that never come" />
          <Stat at={40} big="$25M taken" small="from real people" />
          <Stat at={54} big="10,000 victims" small="across the US" />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, marginTop: 34, opacity: fadeIn(frame, 72, 14) }}>
          FTC-banned · operators convicted, 2023
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(245,181,68,0.18)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>The real thing</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 66, color: COLORS.white, marginTop: 18, marginBottom: 42, opacity: fadeIn(frame, 12, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          A real circle promises{'\n'}<span style={{ color: A }}>nothing extra.</span>
        </div>
        <ComparisonMatrix
          delay={24}
          accent={A}
          columns={['Pyramid', 'Real ROSCA', 'ChainPot']}
          rows={[
            { label: 'Needs new recruits', cells: [{ v: 'Yes', kind: 'bad' }, { v: 'No', kind: 'good' }, { v: 'No', kind: 'good' }] },
            { label: 'Promised return', cells: [{ v: '800%', kind: 'bad' }, { v: 'None', kind: 'good' }, { v: '~3% real', kind: 'good' }] },
            { label: 'Your payout', cells: [{ v: 'Till it pops', kind: 'bad' }, { v: 'Your turn', kind: 'good' }, { v: 'Your turn', kind: 'good' }] },
            { label: 'Who holds funds', cells: [{ v: 'Founder', kind: 'bad' }, { v: 'Organizer', kind: 'mid' }, { v: 'Contract', kind: 'good' }] },
          ]}
        />
        <div style={{ fontFamily: FONT.mono, fontSize: 25, color: COLORS.white60, marginTop: 34, opacity: fadeIn(frame, 70, 14), lineHeight: 1.4 }}>
          No token. Your upside is your turn + real Compound yield — never a magic multiple.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortV: React.FC = () => {
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
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'No promises.\nJust your circle.'} sub="on-chain · no token · no hype" accent={A} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Real savings.\nNo fairy tales.'} accent={A} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_v.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'pop.wav', v: 0.4 }, { s: 0, at: 60, src: 'impact.wav', v: 0.58 },
        { s: 1, at: 26, src: 'pop.wav', v: 0.36 }, { s: 1, at: 40, src: 'pop.wav', v: 0.36 }, { s: 1, at: 54, src: 'pop.wav', v: 0.36 }, { s: 1, at: 72, src: 'bell.wav', v: 0.34 },
        { s: 2, at: -6, src: 'riser.wav', v: 0.4 }, { s: 2, at: 8, src: 'uplift.wav', v: 0.44 }, { s: 2, at: 24, src: 'bell.wav', v: 0.36 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.5 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
