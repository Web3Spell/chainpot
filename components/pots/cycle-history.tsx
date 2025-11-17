'use client';

interface CycleHistoryProps {
  potId: string;
  isDarkMode: boolean;
}

export function CycleHistory({ potId, isDarkMode }: CycleHistoryProps) {
  const cycles = [
    {
      number: 4,
      winner: '0x742d35Cc...',
      amount: '$420',
      participants: 12,
      date: 'Nov 9 - Nov 16, 2025',
    },
    {
      number: 3,
      winner: '0x5F3D2Aa...',
      amount: '$385',
      participants: 12,
      date: 'Nov 2 - Nov 9, 2025',
    },
    {
      number: 2,
      winner: '0x8C1E4Bb...',
      amount: '$410',
      participants: 11,
      date: 'Oct 26 - Nov 2, 2025',
    },
    {
      number: 1,
      winner: '0x3A9F2Dd...',
      amount: '$395',
      participants: 10,
      date: 'Oct 19 - Oct 26, 2025',
    },
  ];

  return (
    <section>
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Cycle History
      </h2>

      <div className="space-y-4">
        {cycles.map((cycle) => (
          <div
            key={cycle.number}
            className={`p-6 rounded-xl border-3 border-black transition-all ${
                isDarkMode ? 'bg-white/5' : 'bg-white/90'}
                `}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cycle
                </p>
                <p className="text-2xl font-bold">{cycle.number}</p>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Winner
                </p>
                <p className="font-bold">{cycle.winner}</p>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Winning Amount
                </p>
                <p className="text-lg font-bold text-green-500">{cycle.amount}</p>
              </div>
              <div className="md:text-right">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {cycle.date}
                </p>
                <p className="font-bold">{cycle.participants} participants</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
