import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { CompareRows } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const V = COLORS.violet;
const D = COLORS.danger;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(255,77,109,0.22)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={D}>Not your keys</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 104, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          They handed over{'\n'}<span style={{ color: D }}>$8 billion.</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 58, color: COLORS.white, marginTop: 34, opacity: fadeIn(frame, 44, 14), lineHeight: 1.08, whiteSpace: 'pre-line' }}>
          And waited 2½ years{'\n'}for part of it back.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { v: '$8B', l: 'customer funds\nmisused' },
    { v: '25 yrs', l: 'prison sentence\nhanded down' },
    { v: '~2025', l: 'repayments\nfinally began' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} glow={'rgba(255,77,109,0.16)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={D}>When the keys aren’t yours</Eyebrow></div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 44, color: COLORS.white, marginTop: 22, marginBottom: 50, opacity: fadeIn(frame, 12, 12), lineHeight: 1.28, maxWidth: 900 }}>
          When a crypto exchange held the keys, customers became creditors — and a court decided who got paid, and when.
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          {cards.map((c, i) => {
            const at = 30 + i * 12;
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{ flex: 1, opacity: fadeIn(frame, at, 12), transform: `scale(${interpolate(sp, [0, 1], [0.9, 1])})`, background: COLORS.dangerSoft, border: `1px solid ${D}55`, borderRadius: 22, padding: '24px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT.display, fontSize: 56, color: D, lineHeight: 1 }}>{c.v}</div>
                <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 24, color: COLORS.white60, marginTop: 12, lineHeight: 1.2, whiteSpace: 'pre-line' }}>{c.l}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white40, marginTop: 40, opacity: fadeIn(frame, 70, 14), letterSpacing: 0.5 }}>
          FTX collapse · U.S. Department of Justice
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={34} glow={'rgba(139,92,246,0.3)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>The fix</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, marginTop: 18, marginBottom: 46, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          ChainPot never{'\n'}<span style={{ color: V }}>holds your keys.</span>
        </div>
        <CompareRows
          delay={26}
          badLabel="Custodian"
          goodLabel="ChainPot"
          items={[
            { label: 'Who holds the keys', bad: 'The company', good: 'The contract' },
            { label: 'If it fails', bad: 'You’re a creditor', good: 'Funds stay yours' },
            { label: 'Who can move funds', bad: 'Their admins', good: 'No one' },
          ]}
        />
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 36, color: COLORS.white80, marginTop: 44, opacity: fadeIn(frame, 64, 14), lineHeight: 1.3, maxWidth: 920 }}>
          Custody is the smart contract — rules no admin can override. Any member can finish a stalled cycle, and you can always exit.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortDD: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Context /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Fix /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Not your keys?\nNot your money.'} sub="ChainPot is non-custodial" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Keep your\nkeys.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_dd.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.55 }, { s: 0, at: 44, src: 'impact.wav', v: 0.4 },
        { s: 1, at: 12, src: 'impact.wav', v: 0.4 }, { s: 1, at: 30, src: 'pop.wav', v: 0.34 }, { s: 1, at: 42, src: 'pop.wav', v: 0.34 }, { s: 1, at: 54, src: 'pop.wav', v: 0.34 },
        { s: 2, at: -6, src: 'riser.wav', v: 0.38 }, { s: 2, at: 8, src: 'uplift.wav', v: 0.44 }, { s: 2, at: 30, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.5 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
