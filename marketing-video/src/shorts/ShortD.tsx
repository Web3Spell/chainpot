import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { StepFlow, Counter } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const B = COLORS.base;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

/* 1 — HOOK */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.4)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={B}>How it works</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 26, opacity: fadeIn(frame, 14, 12), lineHeight: 1.02, whiteSpace: 'pre-line', transform: `translateY(${interpolate(fadeIn(frame, 14, 12), [0, 1], [30, 0])}px)` }}>
          A savings circle,{'\n'}<span style={{ color: B }}>fully on-chain.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 50, color: COLORS.white60, opacity: fadeIn(frame, 44, 14), marginTop: 36 }}>
          Here's the whole thing in 30 seconds.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 — STEPS */
const Steps: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Four steps · one cycle</Eyebrow></div>
        <div style={{ marginTop: 40, marginBottom: 44, fontFamily: FONT.display, fontSize: 72, color: COLORS.white, opacity: fadeIn(frame, 12, 12) }}>
          Simple as a <span style={{ color: B }}>group chat.</span>
        </div>
        <StepFlow
          delay={22}
          activeColor={B}
          steps={[
            { n: '1', title: 'Create a pot', sub: 'Set the amount, members and cycles.' },
            { n: '2', title: 'Everyone contributes', sub: 'Idle funds earn Compound yield.' },
            { n: '3', title: 'Win your turn', sub: 'Lowest bid — or a fair VRF lottery.' },
            { n: '4', title: 'Get paid', sub: 'The winner takes the pot, instantly.' },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3 — THE PAYOFF */
const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(0,82,255,0.3)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>The clever part</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, marginBottom: 40, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          Waiting your turn{'\n'}<span style={{ color: B }}>pays you back.</span>
        </div>
        <GlassCard style={{ padding: '26px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fadeIn(frame, 24, 12) }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, letterSpacing: 2 }}>CYCLE POOL</span>
          <span style={{ fontFamily: FONT.display, fontSize: 60, color: COLORS.white }}>$10,000</span>
        </GlassCard>
        <GlassCard style={{ marginTop: 18, padding: '26px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fadeIn(frame, 36, 12) }}>
          <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: COLORS.white }}>Winning bid</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 52, color: COLORS.violetBright, fontWeight: 600 }}>$8,500</span>
        </GlassCard>
        <div style={{ marginTop: 22, padding: '30px 36px', borderRadius: 24, background: 'rgba(25,251,155,0.08)', border: '1px solid rgba(25,251,155,0.3)', display: 'flex', alignItems: 'center', gap: 18, opacity: fadeIn(frame, 50, 12) }}>
          <span style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.green }}>
            +$<Counter to={166} delay={54} dur={28} />
          </span>
          <span style={{ fontFamily: FONT.sans, fontWeight: 400, fontSize: 38, color: COLORS.white, lineHeight: 1.1 }}>
            to <b>everyone else</b> — the discount<br />plus all the Compound yield.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 4 — RECAP */
const Recap: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ['Trustless', 'Yield-bearing', 'Auditable', 'Two winner modes', 'No organizer risk'];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(0,82,255,0.3)'} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, opacity: fadeIn(frame, 6, 12) }}>
          That's the whole <span style={{ color: B }}>protocol.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 860 }}>
          {chips.map((c, i) => (
            <div key={c} style={{ opacity: fadeIn(frame, 24 + i * 7, 10), fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, padding: '16px 28px', borderRadius: 999, background: 'rgba(0,82,255,0.1)', border: '1px solid rgba(0,82,255,0.4)', letterSpacing: 1 }}>
              ✓ {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortD: React.FC = () => {
  const durations = [150, 180, 170, 150, 155, 155];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Steps /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Recap /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'No bank. No organizer.\nJust code.'} sub="create · contribute · win · split" accent={B} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'A chit fund\nyou never have to trust.'} accent={B} /></TransitionSeries.Sequence>
      </TransitionSeries>

      <ShortAudio
        music="music_d.wav"
        durations={durations}
        cues={[
          { s: 0, at: 16, src: 'bell.wav', v: 0.4 }, { s: 0, at: 44, src: 'pop.wav', v: 0.3 },
          { s: 1, at: 24, src: 'pop.wav', v: 0.4 }, { s: 1, at: 38, src: 'pop.wav', v: 0.4 }, { s: 1, at: 52, src: 'pop.wav', v: 0.4 }, { s: 1, at: 66, src: 'pop.wav', v: 0.4 },
          { s: 2, at: 24, src: 'pop.wav', v: 0.35 }, { s: 2, at: 36, src: 'pop.wav', v: 0.35 }, { s: 2, at: 52, src: 'shimmer.wav', v: 0.5 },
          { s: 3, at: 6, src: 'impact.wav', v: 0.4 }, { s: 3, at: 24, src: 'pop.wav', v: 0.3 }, { s: 3, at: 38, src: 'pop.wav', v: 0.3 }, { s: 3, at: 52, src: 'bell.wav', v: 0.38 },
          { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
          { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
        ]}
      />
    </AbsoluteFill>
  );
};
