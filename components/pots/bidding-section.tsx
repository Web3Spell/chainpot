'use client';

import { useState } from 'react';

interface BiddingSectionProps {
  potId: string;
  isDarkMode: boolean;
}

export function BiddingSection({ potId, isDarkMode }: BiddingSectionProps) {
  const [bidAmount, setBidAmount] = useState('');

  const handleBid = () => {
    if (bidAmount) {
      console.log(`[v0] Bid placed: ${bidAmount}`);
      alert(`Bid of $${bidAmount} placed successfully!`);
      setBidAmount('');
    }
  };

  return (
    <section className="mb-8">
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Place Your Bid
      </h2>

      <div
        className={`p-8 rounded-2xl border-3 border-black ${
           isDarkMode ? 'bg-white/5' : 'bg-white/90'}
           `}
      >
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1">
            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Bid Amount (USD)
            </label>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter your bid amount"
              className={`w-full px-4 py-3 rounded-lg border-2 border-black transition-colors ${
                isDarkMode ? 'bg-white/5' : 'bg-white/90'}
                focus:outline-none`}
            />
            <p className={`text-xs font-medium mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Current highest bid: $420
            </p>
          </div>
          <button
            onClick={handleBid}
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Place Bid
          </button>
        </div>
      </div>
    </section>
  );
}
