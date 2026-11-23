import type { ComponentProps } from 'react';

/** Signature ChainPot card: thick ink border on a translucent surface. */
export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`rounded-3xl border-3 border-cp-line bg-cp-surface text-cp-ink ${className}`} {...props} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-2xl bg-cp-line-soft motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}
