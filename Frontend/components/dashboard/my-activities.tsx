'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useUserActivityEvents, type ActivityEvent } from '@/hooks/useUserActivityEvents';
import { potHref } from '@/lib/pot';

const LABEL: Record<ActivityEvent['type'], string> = {
  Joined: 'You joined',
  PotCreated: 'You created this pot',
  Paid: 'You paid for a round',
  WinnerSelected: 'You received the payout 🎉',
  BidPlaced: 'You placed a bid',
};

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
  const activityEvents = events.filter(e => e.type === "WinnerSelected" || e.type === "BidPlaced" || e.type === "Paid");

  return (
    <section className="py-12 space-y-6 pb-16">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activities</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your activity since you opened this page (full history is coming soon)</p>
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
                    <div className="text-xs text-gray-500">{LABEL[ev.type]}</div>
                  </div>
                  <Link href={potHref(ev.engine, String(ev.args.potId))}>
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
                    <div className="text-xs text-gray-500">{LABEL[ev.type]}</div>
                  </div>
                  <Link href={potHref(ev.engine, String(ev.args.potId))}>
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
