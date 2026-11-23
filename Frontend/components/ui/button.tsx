import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[opacity,transform,background-color] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cp-page ' +
  'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
const variants: Record<Variant, string> = {
  primary: 'bg-cp-ink text-cp-ink-inverse hover:opacity-90',
  secondary: 'border-3 border-cp-line text-cp-ink hover:bg-cp-line-soft',
  ghost: 'text-cp-ink hover:bg-cp-line-soft',
  danger: 'bg-cp-danger text-white hover:opacity-90',
};
// Both sizes keep a ≥44px touch target.
const sizes: Record<Size, string> = { md: 'min-h-11 px-5 text-sm', lg: 'min-h-12 px-7 text-base' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant, size, className = '', ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ href, variant, size, className = '', children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}
