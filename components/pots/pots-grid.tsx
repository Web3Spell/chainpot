'use client';

import Link from 'next/link';
import { PotCard } from './pot-card';

interface PotsGridProps {
  isDarkMode: boolean;
}

// Mock data for available pots
const mockPots = [
  {
    id: 1,
    name: 'Tech Startup Fund',
    description: 'Investment pool for emerging technology startups',
    totalAmount: '$50,000',
    participants: 12,
    yieldRate: '12.5%',
    frequency: 'Weekly',
    status: 'Active',
    cyclesComplete: 8,
  },
  {
    id: 2,
    name: 'DeFi Yield Pool',
    description: 'Decentralized finance yield generation pool',
    totalAmount: '$75,000',
    participants: 18,
    yieldRate: '15.2%',
    frequency: 'Biweekly',
    status: 'Active',
    cyclesComplete: 5,
  },
  {
    id: 3,
    name: 'Real Estate ROSCA',
    description: 'Real estate investment through rotating pool',
    totalAmount: '$120,000',
    participants: 24,
    yieldRate: '8.8%',
    frequency: 'Monthly',
    status: 'Active',
    cyclesComplete: 3,
  },
  {
    id: 4,
    name: 'Green Energy Initiative',
    description: 'Sustainable energy projects investment pool',
    totalAmount: '$45,000',
    participants: 9,
    yieldRate: '11.3%',
    frequency: 'Weekly',
    status: 'Accepting',
    cyclesComplete: 2,
  },
  {
    id: 5,
    name: 'Education Fund',
    description: 'Educational technology and services funding',
    totalAmount: '$35,000',
    participants: 7,
    yieldRate: '10.5%',
    frequency: 'Biweekly',
    status: 'Active',
    cyclesComplete: 6,
  },
  {
    id: 6,
    name: 'Health & Wellness',
    description: 'Healthcare innovations and wellness startups',
    totalAmount: '$60,000',
    participants: 15,
    yieldRate: '13.7%',
    frequency: 'Monthly',
    status: 'Active',
    cyclesComplete: 4,
  },
];

export function PotsGrid({ isDarkMode }: PotsGridProps) {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockPots.map((pot) => (
          <Link key={pot.id} href={`/pots/${pot.id}`}>
            <PotCard pot={pot} isDarkMode={isDarkMode} />
          </Link>
        ))}
      </div>
    </section>
  );
}
