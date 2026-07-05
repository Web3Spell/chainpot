import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Background, useEnter, fadeIn } from './ui';
import { COLORS, FONT, SAFE } from './theme';

/* small top-corner wordmark used across shorts */
export const TopMark: React.FC<{ delay?: number }> = ({ delay = 4 }) => {
  const frame = useCurrentFrame();
  const o = fadeIn(frame, delay, 12);
  return (
    <div style={{ position: 'absolute', top: SAFE.top - 40, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, opacity: o }}>
      <Img src={staticFile('logo-white.svg')} style={{ width: 34, height: 37 }} />
      <span style={{ fontFamily: FONT.display, fontSize: 32, color: COLORS.white, letterSpacing: -0.5 }}>ChainPot</span>
    </div>
  );
};

/* ChainPot logo + animated gradient wordmark reveal */
export const LogoReveal: React.FC<{ headline?: string; sub?: string; accent?: string }> = ({
  headline = 'Now the circle runs on code.',
  sub,
  accent = COLORS.violet,
}) => {
  const frame = useCurrentFrame();
  const sp = useEnter(6, { damping: 12, mass: 1.2 });
  const logoO = fadeIn(frame, 6, 12);
  const wordO = fadeIn(frame, 24, 12);
  const headO = fadeIn(frame, 40, 14);
  const subO = fadeIn(frame, 56, 14);
  const glow = 0.5 + Math.sin(frame / 12) * 0.5;
  const gradPos = interpolate(frame, [0, 120], [0, 200]);
  return (
    <AbsoluteFill>
      <Background intensity={1} cy={44} glow={`${accent}88`} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${SAFE.side}px`, textAlign: 'center' }}>
        <div style={{ position: 'relative', opacity: logoO }}>
          <div style={{ position: 'absolute', inset: -55, borderRadius: '50%', background: `radial-gradient(circle, ${accent}88 0%, rgba(0,0,0,0) 70%)`, opacity: glow }} />
          <Img src={staticFile('logo.svg')} style={{ width: 230, height: 248, position: 'relative', transform: `scale(${interpolate(sp, [0, 1], [0.4, 1])})` }} />
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 140, marginTop: 18, opacity: wordO, backgroundImage: `linear-gradient(90deg, ${COLORS.white}, ${COLORS.violetLight}, ${COLORS.white})`, backgroundSize: '200% auto', backgroundPosition: `${gradPos}% 50%`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: -2 }}>
          ChainPot
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 54, color: COLORS.white, opacity: headO, marginTop: 4, lineHeight: 1.15, maxWidth: 860, whiteSpace: 'pre-line' }}>
          {headline}
        </div>
        {sub && <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, opacity: subO, marginTop: 32, letterSpacing: 1 }}>{sub}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* closing CTA card — tagline + invite badge + Request Access */
export const EndCard: React.FC<{ tagline: string; accent?: string }> = ({ tagline, accent = COLORS.violet }) => {
  const frame = useCurrentFrame();
  const sp = useEnter(6, { damping: 14 });
  const logoO = fadeIn(frame, 6, 12);
  const wordO = fadeIn(frame, 20, 12);
  const tagO = fadeIn(frame, 34, 12);
  const badgeO = fadeIn(frame, 48, 12);
  const ctaSp = useEnter(58, { damping: 12 });
  const ctaO = fadeIn(frame, 58, 12);
  const gradPos = interpolate(frame, [0, 120], [0, 200]);
  return (
    <AbsoluteFill>
      <Background intensity={1} cy={46} glow={`${accent}88`} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, textAlign: 'center' }}>
        <div style={{ position: 'relative', opacity: logoO }}>
          <div style={{ position: 'absolute', inset: -45, borderRadius: '50%', background: `radial-gradient(circle, ${accent}88 0%, rgba(0,0,0,0) 70%)`, opacity: 0.7 }} />
          <Img src={staticFile('logo.svg')} style={{ width: 170, height: 183, position: 'relative', transform: `scale(${interpolate(sp, [0, 1], [0.5, 1])})` }} />
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 124, marginTop: 14, opacity: wordO, backgroundImage: `linear-gradient(90deg, ${COLORS.white}, ${COLORS.violetLight}, ${COLORS.white})`, backgroundSize: '200% auto', backgroundPosition: `${gradPos}% 50%`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: -2 }}>
          ChainPot
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 48, color: COLORS.white, opacity: tagO, marginTop: 2, whiteSpace: 'pre-line' }}>{tagline}</div>
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ opacity: badgeO, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 26px', borderRadius: 999, background: `${accent}24`, border: `1px solid ${accent}`, fontFamily: FONT.mono, fontSize: 25, letterSpacing: 2, color: COLORS.violetLight, textTransform: 'uppercase' }}>
            ✦ Invite only — early access
          </div>
          <div style={{ opacity: ctaO, transform: `scale(${interpolate(ctaSp, [0, 1], [0.8, 1])})`, padding: '24px 60px', borderRadius: 999, background: COLORS.white, color: COLORS.black, fontFamily: FONT.sans, fontWeight: 600, fontSize: 44, boxShadow: `0 24px 70px -18px ${accent}` }}>
            Request Access
          </div>
          <div style={{ opacity: ctaO, fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, letterSpacing: 1 }}>
            <span style={{ color: COLORS.base }}>●</span> live on Base testnet
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
