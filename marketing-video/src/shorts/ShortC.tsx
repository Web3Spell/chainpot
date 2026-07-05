import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Heart, GraduationCap, Store, Stethoscope, ShieldCheck, Gift, BadgeCheck } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { CompareRows } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const ROSE = '#FF6FB5';
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

/* 1 — HOOK */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(255,111,181,0.3)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={ROSE}>ChainPot for community</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, marginTop: 30, opacity: fadeIn(frame, 14, 12), lineHeight: 1.05, maxWidth: 900, transform: `translateY(${interpolate(fadeIn(frame, 14, 12), [0, 1], [30, 0])}px)` }}>
          The people who'd lend you money <span style={{ color: ROSE }}>already know your name.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white60, opacity: fadeIn(frame, 44, 14), marginTop: 40 }}>
          Family. Neighbours. Your block.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 — MILESTONES */
const Milestones: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { icon: Heart, who: 'Priya', goal: 'a wedding' },
    { icon: GraduationCap, who: 'Hassan', goal: 'school fees' },
    { icon: Store, who: 'Asha', goal: 'a new stall' },
    { icon: Stethoscope, who: 'Maria', goal: 'a hospital bill' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={40} glow={'rgba(255,111,181,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={ROSE}>One circle · everyone's turn</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          Save together,{'\n'}<span style={{ color: ROSE }}>for what matters.</span>
        </div>
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {items.map((it, i) => {
            const at = 24 + i * 12;
            const o = fadeIn(frame, at, 12);
            const sp = spring({ frame: frame - at, fps, config: { damping: 16 } });
            const Icon = it.icon;
            return (
              <GlassCard key={i} style={{ padding: '30px 28px', opacity: o, transform: `scale(${interpolate(sp, [0, 1], [0.85, 1])})` }}>
                <div style={{ width: 80, height: 80, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ROSE}1f`, border: `1px solid ${ROSE}66` }}>
                  <Icon size={42} color={ROSE} strokeWidth={2} />
                </div>
                <div style={{ fontFamily: FONT.display, fontSize: 44, color: COLORS.white, marginTop: 16 }}>{it.who}</div>
                <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 32, color: COLORS.white60 }}>wins for {it.goal}</div>
              </GlassCard>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          everyone pays in · everyone gets their turn
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3 — RELATIONSHIP BENEFITS */
const Bonds: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const feats = [
    { icon: ShieldCheck, title: 'No one becomes the suspect', sub: 'The contract is the organizer — not your aunt.' },
    { icon: Gift, title: 'Bid low, gift your circle', sub: 'Your discount is split to everyone who waits.' },
    { icon: BadgeCheck, title: 'Trust that follows you', sub: 'Show up, build a reputation across circles.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(255,111,181,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={ROSE}>Keeps the relationship intact</Eyebrow></div>
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

/* 4 — REMITTANCE */
const Remit: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(255,111,181,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={ROSE}>For the ones who left to provide</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, marginBottom: 42, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          Send home and save —{'\n'}<span style={{ color: ROSE }}>in one tap.</span>
        </div>
        <CompareRows
          delay={20}
          badLabel="Old way"
          goodLabel="ChainPot"
          items={[
            { label: 'Transfer fee', bad: '~$8', good: 'cents' },
            { label: 'Arrives in', bad: '1–3 days', good: 'seconds' },
            { label: 'While it waits', bad: 'nothing', good: 'earns yield' },
          ]}
        />
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white40, marginTop: 36, letterSpacing: 1, textAlign: 'center' }}>
          $685B sent home a year · 6.4% avg lost to fees — World Bank
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortC: React.FC = () => {
  const durations = [150, 170, 160, 165, 150, 165];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Milestones /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Bonds /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Remit /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Save together. Stay together.'} sub="your people · your money · on-chain" accent={ROSE} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Money is easier\nwhen it stays in the family.'} accent={ROSE} /></TransitionSeries.Sequence>
      </TransitionSeries>

      <ShortAudio
        music="music_c.wav"
        musicVol={0.74}
        durations={durations}
        cues={[
          { s: 0, at: 16, src: 'bell.wav', v: 0.4 }, { s: 0, at: 44, src: 'shimmer.wav', v: 0.35 },
          { s: 1, at: 26, src: 'pop.wav', v: 0.3 }, { s: 1, at: 38, src: 'pop.wav', v: 0.3 }, { s: 1, at: 50, src: 'pop.wav', v: 0.3 }, { s: 1, at: 62, src: 'pop.wav', v: 0.3 },
          { s: 2, at: 16, src: 'pop.wav', v: 0.34 }, { s: 2, at: 30, src: 'pop.wav', v: 0.34 }, { s: 2, at: 44, src: 'bell.wav', v: 0.38 },
          { s: 3, at: 12, src: 'uplift.wav', v: 0.34 }, { s: 3, at: 30, src: 'pop.wav', v: 0.3 }, { s: 3, at: 44, src: 'bell.wav', v: 0.36 },
          { s: 4, at: -6, src: 'riser.wav', v: 0.38 }, { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
          { s: 5, at: 6, src: 'impact.wav', v: 0.48 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
        ]}
      />
    </AbsoluteFill>
  );
};
