import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Crown, Lock, FileText } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { Donut } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const ROSE = '#FF6FB5';
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(255,111,181,0.3)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={ROSE}>Who really runs the circle</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 200, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 10), textShadow: '0 0 70px rgba(255,111,181,0.45)' }}>
          85–92%
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 52, color: COLORS.white, opacity: fadeIn(frame, 32, 12), marginTop: 4 }}>
          of <span style={{ fontWeight: 600 }}>arisan</span> members are women.
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, opacity: fadeIn(frame, 52, 14), marginTop: 26, letterSpacing: 1 }}>
          Indonesia · IFLS study
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={40} glow={'rgba(255,111,181,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, alignItems: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12), alignSelf: 'flex-start' }}><Eyebrow color={ROSE}>Run by women · banked by no one</Eyebrow></div>
        <div style={{ marginTop: 56, opacity: fadeIn(frame, 10, 12) }}>
          <Donut pct={70} delay={16} size={360} color={ROSE} centerTop="most" centerSub="are women" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white, textAlign: 'center', marginTop: 44, opacity: fadeIn(frame, 32, 12), maxWidth: 840, lineHeight: 1.25 }}>
          Women run the world’s savings circles — <span style={{ fontWeight: 600 }}>chamas, arisan, susus</span> — and banks turn them away most.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Gives: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const feats = [
    { icon: Crown, title: 'An organizer role no one disputes', sub: 'The contract runs the pot — her name on it, immutably.' },
    { icon: Lock, title: 'Savings only she controls', sub: 'No one can quietly “borrow” the pot.' },
    { icon: FileText, title: 'A record that’s hers', sub: 'Reputation that follows her wallet.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(255,111,181,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={ROSE}>What ChainPot gives her</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {feats.map((f, i) => {
            const at = 14 + i * 14;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = f.icon;
            return (
              <GlassCard key={i} style={{ padding: '32px 34px', display: 'flex', alignItems: 'center', gap: 26, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 92, height: 92, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ROSE}1f`, border: `1px solid ${ROSE}66` }}>
                  <Icon size={48} color={ROSE} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 44, color: COLORS.white, lineHeight: 1.05 }}>{f.title}</div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 30, color: COLORS.white60, marginTop: 4 }}>{f.sub}</div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Line: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(255,111,181,0.28)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 110, color: COLORS.white, opacity: fadeIn(frame, 8, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          Her circle. Her rules.{'\n'}<span style={{ color: ROSE }}>Her record.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortR: React.FC = () => {
  const durations = [150, 175, 170, 150, 150, 165];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Context /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Gives /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Line /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Banking the women\nbanks forgot.'} sub="financial autonomy, on-chain" accent={ROSE} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Built with\nher in mind.'} accent={ROSE} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_r.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 52, src: 'bell.wav', v: 0.36 },
        { s: 1, at: 16, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 40, src: 'bell.wav', v: 0.38 },
        { s: 2, at: 16, src: 'pop.wav', v: 0.36 }, { s: 2, at: 30, src: 'pop.wav', v: 0.36 }, { s: 2, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 8, src: 'impact.wav', v: 0.42 }, { s: 3, at: 30, src: 'bell.wav', v: 0.38 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
