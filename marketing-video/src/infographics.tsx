import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { COLORS, FONT } from './theme';
import { fadeIn } from './ui';

/* ============================ count-up number ============================ */
export const Counter: React.FC<{
  to: number;
  from?: number;
  delay?: number;
  dur?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({ to, from = 0, delay = 0, dur = 40, prefix = '', suffix = '', decimals = 0, compact = false, style }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + dur], [from, to], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  let text: string;
  if (compact) {
    if (v >= 1e9) text = (v / 1e9).toFixed(decimals) + 'B';
    else if (v >= 1e6) text = (v / 1e6).toFixed(decimals) + 'M';
    else if (v >= 1e3) text = (v / 1e3).toFixed(decimals) + 'K';
    else text = v.toFixed(decimals);
  } else {
    text = v.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  }
  return <span style={style}>{prefix}{text}{suffix}</span>;
};

/* ============================ horizontal bar chart ============================ */
export type Bar = { label: string; value: number; color?: string; valueLabel?: string };
export const BarChart: React.FC<{
  data: Bar[];
  max?: number;
  delay?: number;
  barHeight?: number;
  gap?: number;
  labelW?: number;
  accent?: string;
}> = ({ data, max, delay = 0, barHeight = 64, gap = 22, labelW = 300, accent = COLORS.violet }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mx = max ?? Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {data.map((d, i) => {
        const at = delay + i * 8;
        const grow = spring({ frame: frame - at, fps, config: { damping: 200 } });
        const w = (d.value / mx) * grow;
        const o = fadeIn(frame, at, 10);
        const col = d.color ?? accent;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: o }}>
            <div style={{ width: labelW, flexShrink: 0, textAlign: 'right', fontFamily: FONT.sans, fontWeight: 500, fontSize: 34, color: COLORS.white }}>
              {d.label}
            </div>
            <div style={{ flex: 1, height: barHeight, borderRadius: 14, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${w * 100}%`,
                  borderRadius: 14,
                  background: `linear-gradient(90deg, ${col}aa, ${col})`,
                  boxShadow: `0 0 30px -4px ${col}`,
                }}
              />
              <div style={{ position: 'absolute', right: 18, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, opacity: interpolate(grow, [0.6, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                {d.valueLabel ?? d.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ============================ radial / donut stat ============================ */
export const Donut: React.FC<{
  pct: number; // 0..100
  delay?: number;
  size?: number;
  stroke?: number;
  color?: string;
  centerTop?: string;
  centerSub?: string;
}> = ({ pct, delay = 0, size = 320, stroke = 30, color = COLORS.violet, centerTop, centerSub }) => {
  const frame = useCurrentFrame();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = interpolate(frame, [delay, delay + 36], [0, pct / 100], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          style={{ filter: `drop-shadow(0 0 14px ${color})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT.display, fontSize: size * 0.28, color: COLORS.white, lineHeight: 1 }}>
          {centerTop ?? `${Math.round(p * 100)}%`}
        </div>
        {centerSub && <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white60, marginTop: 6, letterSpacing: 1 }}>{centerSub}</div>}
      </div>
    </div>
  );
};

/* ============================ global node map ============================ */
export type GeoNode = { x: number; y: number; label: string; sub?: string; color?: string };
export const NodeMap: React.FC<{
  nodes: GeoNode[];
  delay?: number;
  width?: number;
  height?: number;
}> = ({ nodes, delay = 0, width = 900, height = 620 }) => {
  const frame = useCurrentFrame();
  // faint dot lattice for the "data map" feel
  const cols = 26, rows = 16;
  const dots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    dots.push({ x: (c / (cols - 1)) * width, y: (r / (rows - 1)) * height });
  }
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={2} fill="rgba(255,255,255,0.07)" />
        ))}
        {/* arcs from each node to the next, drawn over time */}
        {nodes.map((n, i) => {
          if (i === 0) return null;
          const a = nodes[i - 1], b = n;
          const ax = a.x * width, ay = a.y * height, bx = b.x * width, by = b.y * height;
          const mx = (ax + bx) / 2, my = Math.min(ay, by) - 80;
          const path = `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
          const len = Math.hypot(bx - ax, by - ay) * 1.4;
          const prog = interpolate(frame, [delay + 20 + i * 6, delay + 40 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <path key={i} d={path} fill="none" stroke={COLORS.violet} strokeWidth={2.5}
              strokeDasharray={len} strokeDashoffset={len * (1 - prog)} opacity={0.5}
              style={{ filter: `drop-shadow(0 0 6px ${COLORS.violetGlow})` }} />
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const at = delay + i * 6;
        const o = fadeIn(frame, at, 10);
        const pulse = 0.6 + Math.sin((frame - at) / 8) * 0.4;
        const col = n.color ?? COLORS.violetBright;
        return (
          <div key={i} style={{ position: 'absolute', left: n.x * width, top: n.y * height, transform: 'translate(-50%,-50%)', opacity: o, textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: col, margin: '0 auto', boxShadow: `0 0 ${10 + pulse * 16}px ${col}` }} />
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 26, color: COLORS.white, marginTop: 8, whiteSpace: 'nowrap' }}>{n.label}</div>
            {n.sub && <div style={{ fontFamily: FONT.mono, fontSize: 20, color: COLORS.white60, whiteSpace: 'nowrap' }}>{n.sub}</div>}
          </div>
        );
      })}
    </div>
  );
};

/* ============================ numbered step flow ============================ */
export type Step = { n: string; title: string; sub?: string; color?: string };
export const StepFlow: React.FC<{ steps: Step[]; delay?: number; activeColor?: string }> = ({ steps, delay = 0, activeColor = COLORS.violet }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {steps.map((s, i) => {
        const at = delay + i * 14;
        const o = fadeIn(frame, at, 12);
        const x = interpolate(o, [0, 1], [-40, 0]);
        const col = s.color ?? activeColor;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: o, transform: `translateX(${x}px)` }}>
            <div style={{ width: 86, height: 86, flexShrink: 0, borderRadius: 22, background: `${col}22`, border: `1.5px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 44, color: col }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontFamily: FONT.display, fontSize: 46, color: COLORS.white, lineHeight: 1.05 }}>{s.title}</div>
              {s.sub && <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 30, color: COLORS.white60, marginTop: 4 }}>{s.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ============================ before/after compare ============================ */
export type CompareItem = { label: string; bad: string; good: string };
export const CompareRows: React.FC<{ items: CompareItem[]; delay?: number; badLabel?: string; goodLabel?: string }> = ({ items, delay = 0, badLabel = 'Bank loan', goodLabel = 'ChainPot' }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 18, opacity: fadeIn(frame, delay, 10) }}>
        <div style={{ flex: 1 }} />
        <div style={{ width: 230, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: COLORS.danger, letterSpacing: 1 }}>{badLabel}</div>
        <div style={{ width: 230, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: COLORS.green, letterSpacing: 1 }}>{goodLabel}</div>
      </div>
      {items.map((it, i) => {
        const at = delay + 8 + i * 10;
        const o = fadeIn(frame, at, 10);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: o }}>
            <div style={{ flex: 1, fontFamily: FONT.sans, fontWeight: 400, fontSize: 32, color: COLORS.white80 }}>{it.label}</div>
            <div style={{ width: 230, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 600, fontSize: 30, color: COLORS.danger, background: 'rgba(255,77,109,0.1)', borderRadius: 12, padding: '12px 0' }}>{it.bad}</div>
            <div style={{ width: 230, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 600, fontSize: 30, color: COLORS.green, background: 'rgba(25,251,155,0.1)', borderRadius: 12, padding: '12px 0' }}>{it.good}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ============================ line / area chart ============================ */
export type Series = { name: string; color: string; pts: number[] }; // pts: 0..1 normalized
export const AreaChart: React.FC<{
  series: Series[];
  labels?: string[];
  delay?: number;
  width?: number;
  height?: number;
}> = ({ series, labels = [], delay = 0, width = 880, height = 460 }) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [delay, delay + 50], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const padB = 60, padT = 20;
  const h = height - padB - padT;
  const xy = (s: Series) => s.pts.map((v, i) => [(i / (s.pts.length - 1)) * width, padT + (1 - v) * h]);
  const clipW = prog * width;
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        {/* gridlines */}
        {[0, 0.5, 1].map((g, i) => (
          <line key={i} x1={0} x2={width} y1={padT + g * h} y2={padT + g * h} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        ))}
        <defs>
          <clipPath id="reveal"><rect x={0} y={0} width={clipW} height={height} /></clipPath>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <g clipPath="url(#reveal)">
          {series.map((s, i) => {
            const pts = xy(s);
            const line = pts.map((p) => p.join(',')).join(' ');
            const area = `${line} ${width},${padT + h} 0,${padT + h}`;
            return (
              <g key={i}>
                <polygon points={area} fill={`url(#grad${i})`} />
                <polyline points={line} fill="none" stroke={s.color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${s.color}aa)` }} />
              </g>
            );
          })}
        </g>
        {/* end dots + labels */}
        {series.map((s, i) => {
          const pts = xy(s);
          const last = pts[pts.length - 1];
          const o = interpolate(prog, [0.85, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <g key={i} opacity={o}>
              <circle cx={last[0]} cy={last[1]} r={9} fill={s.color} style={{ filter: `drop-shadow(0 0 10px ${s.color})` }} />
            </g>
          );
        })}
        {labels.map((l, i) => (
          <text key={i} x={(i / (labels.length - 1)) * width} y={height - 18} fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize={24} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>{l}</text>
        ))}
      </svg>
      {/* legend */}
      <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 8, opacity: fadeIn(frame, delay + 10, 12) }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
            <span style={{ width: 16, height: 4, background: s.color, borderRadius: 2 }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white80 }}>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================ comparison matrix ============================ */
export type MCell = { v: string; kind?: 'good' | 'bad' | 'mid' };
export const ComparisonMatrix: React.FC<{
  columns: string[]; // last column is the highlighted "ChainPot" one
  rows: { label: string; cells: MCell[] }[];
  delay?: number;
  accent?: string;
  highlightLast?: boolean;
}> = ({ columns, rows, delay = 0, accent = COLORS.violet, highlightLast = true }) => {
  const frame = useCurrentFrame();
  const colW = `minmax(0, 1fr)`;
  const grid = `260px repeat(${columns.length}, ${colW})`;
  const cellColor = (k?: string) => (k === 'good' ? COLORS.green : k === 'bad' ? COLORS.danger : COLORS.white80);
  const mark = (k?: string) => (k === 'good' ? '✓ ' : k === 'bad' ? '✗ ' : '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, opacity: fadeIn(frame, delay, 10) }}>
        <div />
        {columns.map((c, i) => {
          const hot = highlightLast && i === columns.length - 1;
          return (
            <div key={i} style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, letterSpacing: 0.5, color: hot ? '#fff' : COLORS.white60, padding: '10px 6px', borderRadius: 12, background: hot ? accent : 'transparent', border: hot ? `1px solid ${accent}` : 'none', fontWeight: hot ? 700 : 400 }}>
              {c}
            </div>
          );
        })}
      </div>
      {rows.map((r, ri) => {
        const at = delay + 8 + ri * 9;
        const o = fadeIn(frame, at, 10);
        return (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: grid, gap: 12, alignItems: 'center', opacity: o }}>
            <div style={{ fontFamily: FONT.sans, fontWeight: 400, fontSize: 30, color: COLORS.white }}>{r.label}</div>
            {r.cells.map((c, ci) => {
              const hot = highlightLast && ci === columns.length - 1;
              return (
                <div key={ci} style={{ textAlign: 'center', fontFamily: FONT.sans, fontWeight: hot ? 600 : 400, fontSize: 28, color: cellColor(c.kind), padding: '14px 6px', borderRadius: 12, background: hot ? `${accent}1a` : 'rgba(255,255,255,0.03)', border: hot ? `1px solid ${accent}55` : `1px solid ${COLORS.glassBorder}` }}>
                  {mark(c.kind)}{c.v}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ============================ vertical timeline ============================ */
export type Phase = { tag: string; title: string; sub?: string; state: 'done' | 'now' | 'next' };
export const Timeline: React.FC<{ phases: Phase[]; delay?: number; accent?: string }> = ({ phases, delay = 0, accent = COLORS.violet }) => {
  const frame = useCurrentFrame();
  const col = (s: string) => (s === 'done' ? COLORS.green : s === 'now' ? accent : COLORS.white40);
  return (
    <div style={{ position: 'relative', paddingLeft: 60 }}>
      <div style={{ position: 'absolute', left: 27, top: 10, bottom: 10, width: 3, background: 'rgba(255,255,255,0.12)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {phases.map((p, i) => {
          const at = delay + i * 13;
          const o = fadeIn(frame, at, 12);
          const c = col(p.state);
          const pulse = p.state === 'now' ? 0.5 + Math.sin((frame - at) / 8) * 0.5 : 1;
          return (
            <div key={i} style={{ position: 'relative', opacity: o, transform: `translateX(${interpolate(o, [0, 1], [30, 0])}px)` }}>
              <div style={{ position: 'absolute', left: -49, top: 6, width: 30, height: 30, borderRadius: '50%', background: p.state === 'next' ? 'transparent' : c, border: `3px solid ${c}`, boxShadow: p.state === 'now' ? `0 0 ${10 + pulse * 18}px ${c}` : 'none' }} />
              <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: 2, color: c, textTransform: 'uppercase' }}>{p.tag}</div>
              <div style={{ fontFamily: FONT.display, fontSize: 46, color: COLORS.white, lineHeight: 1.05, marginTop: 2 }}>{p.title}</div>
              {p.sub && <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 28, color: COLORS.white60, marginTop: 2 }}>{p.sub}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
