import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Risk Disclosure — ChainPot' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
