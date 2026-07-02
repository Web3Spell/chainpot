import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
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
const V = COLORS.violet;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={V}>Your options</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 90, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.05, whiteSpace: 'pre-line', maxWidth: 920 }}>
          Need cash before payday?{'\n'}<span style={{ color: V }}>Your options were bad.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Matrix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px 60px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>Side by side</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 16, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          Four ways. <span style={{ color: V }}>One winner.</span>
        </div>
        <ComparisonMatrix
          delay={18}
          accent={V}
          columns={['Bank', 'Loan app', 'Susu', 'ChainPot']}
          rows={[
            { label: 'Access', cells: [{ v: 'denied', kind: 'bad' }, { v: 'instant', kind: 'mid' }, { v: 'yes', kind: 'good' }, { v: 'yes', kind: 'good' }] },
            { label: 'Cost', cells: [{ v: '12–18%', kind: 'mid' }, { v: '35–40%', kind: 'bad' }, { v: '0%', kind: 'good' }, { v: 'you set', kind: 'good' }] },
            { label: 'Organizer risk', cells: [{ v: '—', kind: 'good' }, { v: '—', kind: 'good' }, { v: 'high', kind: 'bad' }, { v: 'none', kind: 'good' }] },
            { label: 'Builds credit', cells: [{ v: 'maybe', kind: 'mid' }, { v: 'no', kind: 'bad' }, { v: 'no', kind: 'bad' }, { v: 'yes', kind: 'good' }] },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Verdict: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, opacity: fadeIn(frame, 8, 12), lineHeight: 1.08, whiteSpace: 'pre-line', maxWidth: 920 }}>
          Bank won’t. Loan app hurts.{'\n'}Susu might vanish.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: V, opacity: fadeIn(frame, 40, 14), marginTop: 40 }}>
          ChainPot just works.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortQ: React.FC = () => {
  const durations = [180, 210, 180, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Matrix /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Verdict /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'All the access.\nNone of the catch.'} sub="credit, re-imagined" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'The circle,\nupgraded.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_q.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 18, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 36, src: 'pop.wav', v: 0.34 }, { s: 1, at: 48, src: 'pop.wav', v: 0.34 }, { s: 1, at: 60, src: 'pop.wav', v: 0.34 }, { s: 1, at: 72, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 8, src: 'impact.wav', v: 0.42 }, { s: 2, at: 40, src: 'bell.wav', v: 0.42 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
