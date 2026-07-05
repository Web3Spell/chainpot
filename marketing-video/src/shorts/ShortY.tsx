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
const A = COLORS.base;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.26)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={A}>Resilience</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 98, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          When the flood comes,{'\n'}who recovers first?
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: A, marginTop: 40, opacity: fadeIn(frame, 54, 14), lineHeight: 1.08, whiteSpace: 'pre-line' }}>
          The family in a{'\n'}savings circle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { t: 'Savings on hand', d: 'money already pooled' },
    { t: 'Your turn — early', d: 'pull the pot when it matters' },
    { t: 'Rebuild faster', d: 'back on your feet sooner' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={34} glow={'rgba(0,82,255,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>A shock absorber</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, marginTop: 18, marginBottom: 22, opacity: fadeIn(frame, 12, 12), lineHeight: 1.03, whiteSpace: 'pre-line' }}>
          A circle is a{'\n'}<span style={{ color: A }}>shock absorber.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 38, color: COLORS.white80, opacity: fadeIn(frame, 24, 12), lineHeight: 1.32, maxWidth: 880, marginBottom: 40 }}>
          Studies of flood-hit households find savings-group members rebuild faster — savings already on hand, and a turn that can come early when you need it.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {cards.map((c, i) => {
            const at = 38 + i * 12;
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{ opacity: sp, transform: `translateX(${(1 - sp) * -40}px)`, display: 'flex', alignItems: 'center', gap: 22, padding: '24px 30px', borderRadius: 22, background: 'rgba(255,255,255,0.05)', border: `1px solid ${A}55` }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: A, boxShadow: `0 0 20px ${A}` }} />
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 44, color: COLORS.white }}>{c.t}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 25, color: COLORS.white60, marginTop: 2 }}>{c.d}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, marginTop: 34, opacity: fadeIn(frame, 80, 14) }}>
          Savings groups &amp; flood resilience (Univ. of Edinburgh, 2024)
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(0,82,255,0.28)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          Need the pot now?{'\n'}<span style={{ color: A }}>Bid and take it early.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white80, marginTop: 40, opacity: fadeIn(frame, 34, 14), maxWidth: 880, lineHeight: 1.3 }}>
          In a hard month, win your turn early at a small discount. The rest of the circle shares that discount — plus the yield. A safety net that pays you back.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortY: React.FC = () => {
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
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'A safety net\nthat pays you back.'} sub="your circle, always there" accent={A} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Build your\nsafety net.'} accent={A} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_y.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 54, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 12, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 38, src: 'pop.wav', v: 0.32 }, { s: 1, at: 50, src: 'pop.wav', v: 0.32 }, { s: 1, at: 62, src: 'pop.wav', v: 0.32 },
        { s: 2, at: -6, src: 'riser.wav', v: 0.38 }, { s: 2, at: 6, src: 'impact.wav', v: 0.5 }, { s: 2, at: 34, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.48 }, { s: 3, at: 40, src: 'bell.wav', v: 0.4 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
