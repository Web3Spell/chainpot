import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { UserX, ShieldCheck, Lock, Eye, LifeBuoy } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={44} glow={'rgba(255,77,109,0.35)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={COLORS.danger}>The oldest problem</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04 }}>
          One person<br />holds the pot.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: COLORS.danger, opacity: fadeIn(frame, 44, 14), marginTop: 40 }}>
          Sometimes they vanish with it.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Spof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const shake = frame > 60 ? Math.sin(frame * 1.4) * interpolate(frame, [60, 90], [6, 0], { extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={42} glow={'rgba(255,77,109,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 10, 12), transform: `scale(${interpolate(sp, [0, 1], [0.7, 1])}) translateX(${shake}px)` }}>
          <div style={{ width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,77,109,0.12)', border: `2px solid ${COLORS.danger}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <UserX size={110} color={COLORS.danger} strokeWidth={1.6} />
          </div>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 44, opacity: fadeIn(frame, 26, 12), lineHeight: 1.05 }}>
          The organizer holds<br />everyone's money.
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white60, marginTop: 26, opacity: fadeIn(frame, 46, 14), maxWidth: 820 }}>
          When they disappear, the whole circle collapses — and the law rarely catches up.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - 16, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <Background intensity={1} cy={42} glow={'rgba(25,251,155,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={COLORS.green}>The fix is structural</Eyebrow></div>
        <div style={{ marginTop: 36, opacity: fadeIn(frame, 12, 12), transform: `scale(${interpolate(sp, [0, 1], [0.7, 1])})` }}>
          <div style={{ width: 200, height: 200, borderRadius: 44, background: 'rgba(25,251,155,0.1)', border: `2px solid ${COLORS.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 0 60px -10px ${COLORS.green}` }}>
            <ShieldCheck size={110} color={COLORS.green} strokeWidth={1.6} />
          </div>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 40, opacity: fadeIn(frame, 26, 12), lineHeight: 1.04 }}>
          ChainPot holds nothing<br />a human can take.
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 32, color: COLORS.white60, marginTop: 28, opacity: fadeIn(frame, 46, 14), letterSpacing: 1 }}>
          custody is the smart contract — not a person
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Pillars: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const feats = [
    { icon: Lock, title: 'Non-custodial by design', sub: 'No admin key can move members’ funds.' },
    { icon: Eye, title: 'Every move is public', sub: 'Contributions and payouts are on-chain events.' },
    { icon: LifeBuoy, title: 'Recovery built in', sub: 'Any member can drive a stalled cycle to finish.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow>Why nothing can run away</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {feats.map((f, i) => {
            const at = 14 + i * 14;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = f.icon;
            return (
              <GlassCard key={i} style={{ padding: '32px 34px', display: 'flex', alignItems: 'center', gap: 26, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 92, height: 92, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${COLORS.violet}1f`, border: `1px solid ${COLORS.violet}66` }}>
                  <Icon size={48} color={COLORS.violetBright} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 46, color: COLORS.white, lineHeight: 1.05 }}>{f.title}</div>
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

export const ShortE: React.FC = () => {
  const durations = [150, 165, 170, 160, 150, 165];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Spof /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Solution /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Pillars /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Trust the code,\nnot the collector.'} sub="non-custodial · on Base" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'The organizer\nthat can’t run away.'} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_e.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 44, src: 'impact.wav', v: 0.4 },
        { s: 1, at: 16, src: 'impact.wav', v: 0.45 }, { s: 1, at: 60, src: 'impact.wav', v: 0.5 },
        { s: 2, at: 16, src: 'uplift.wav', v: 0.45 }, { s: 2, at: 26, src: 'bell.wav', v: 0.42 },
        { s: 3, at: 16, src: 'pop.wav', v: 0.4 }, { s: 3, at: 30, src: 'pop.wav', v: 0.4 }, { s: 3, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
