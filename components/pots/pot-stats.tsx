'use client';

interface PotStatsProps {
  potId: string;
  isDarkMode: boolean;
}

export function PotStats({ potId, isDarkMode }: PotStatsProps) {
  const stats = [
    { label: 'Total Pool', value: '$50,000', color: 'text-blue-500' },
    { label: 'Participants', value: '12', color: 'text-purple-500' },
    { label: 'Yield Rate', value: '12.5%', color: 'text-green-500' },
    { label: 'Total Raised', value: '$32,500', color: 'text-orange-500' },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-6 rounded-xl border-3 border-black ${
                isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}
          >
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
