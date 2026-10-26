type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-cp-line-soft text-cp-ink',
  accent: 'bg-cp-accent-soft text-cp-accent',
  success: 'bg-cp-success-soft text-cp-success',
  warn: 'bg-cp-warn-soft text-cp-warn',
  danger: 'bg-cp-danger-soft text-cp-danger',
};

export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
export type { Tone };
