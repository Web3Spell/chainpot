'use client';

import React from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useUserActivityEvents } from '@/hooks/useUserActivityEvents';

interface MyActivitiesProps {
  isDarkMode: boolean;
}

export function MyActivities({ isDarkMode }: MyActivitiesProps) {
  const { address } = useAccount();
  const userAddress = (address as `0x${string}`) ?? undefined;

  const { events, isLoading } = useUserActivityEvents(userAddress);

  if (isLoading) {
    return (
      <section className="py-12 space-y-6 pb-16">
        <h2 className="text-3xl font-bold">My Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-3 border-black rounded-3xl p-6 h-40 animate-pulse bg-black/10" />
          <div className="border-3 border-black rounded-3xl p-6 h-40 animate-pulse bg-black/10" />
        </div>
      </section>
    );
  }

  const joinEvents = events.filter(e => e.type === "Joined" || e.type === "PotCreated");
  const activityEvents = events.filter(e => e.type === "WinnerSelected" || e.type === "BidPlaced" || e.type === "CycleStarted");

  return (
    <section className="py-12 space-y-6 pb-16">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activities</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Recent on-chain activity from your account during this session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black'}`}>
          <h3 className="text-xl font-bold">My Join Activity</h3>
          <div className="space-y-3 mt-4">
            {joinEvents.length === 0 && <div className="text-gray-500">No join activity found in this session.</div>}
            {joinEvents.map((ev, i) => (
              <div key={i} className="p-3 rounded-lg border border-black/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">Pot #{String(ev.args.potId)}</div>
                    <div className="text-xs text-gray-500">{ev.type}</div>
                  </div>
                  <Link href={`/pots/${String(ev.args.potId)}?engine=${ev.engine}`}>
                    <button className="px-3 py-1 bg-black text-white rounded-full text-xs font-bold">View</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black'}`}>
          <h3 className="text-xl font-bold">My Contributions & Wins</h3>
          <div className="space-y-3 mt-4">
            {activityEvents.length === 0 && <div className="text-gray-500">No recent activity found.</div>}
            {activityEvents.map((ev, i) => (
              <div key={i} className="p-3 rounded-lg border border-black/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">Pot #{String(ev.args.potId)}</div>
                    <div className="text-xs text-gray-500">{ev.type}</div>
                  </div>
                  <Link href={`/pots/${String(ev.args.potId)}?engine=${ev.engine}`}>
                    <button className="px-3 py-1 bg-black text-white rounded-full text-xs font-bold">View</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
