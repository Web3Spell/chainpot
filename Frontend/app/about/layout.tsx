import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About ChainPot — Save together. Trust the code.',
  description:
    'How ChainPot works: rotating savings circles (chit fund, committee, kitty) on Base. No seed phrase, no gas fees, fair draws by Chainlink, contracts audited by Certora.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
