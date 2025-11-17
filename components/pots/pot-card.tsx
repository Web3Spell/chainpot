'use client';

interface PotCardProps {
  pot: {
    id: number;
    name: string;
    description: string;
    totalAmount: string;
    participants: number;
    yieldRate: string;
    frequency: string;
    status: string;
    cyclesComplete: number;
  };
  isDarkMode: boolean;
}

export function PotCard({ pot, isDarkMode }: PotCardProps) {
  const isActive = pot.status === 'Active';

  return (
    <div
      className={`p-6 rounded-2xl border-3 border-black transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer ${
          isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {pot.name}
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {pot.description}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isActive
              ? isDarkMode
                ? 'bg-green-500/30 text-green-200'
                : 'bg-green-100 text-green-700'
              : isDarkMode
              ? 'bg-yellow-500/30 text-yellow-200'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {pot.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-t border-b border-white/10">
        <div>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Pool
          </p>
          <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {pot.totalAmount}
          </p>
        </div>
        <div>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Participants
          </p>
          <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {pot.participants}
          </p>
        </div>
        <div>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Yield Rate
          </p>
          <p className={`text-lg font-bold text-green-500`}>{pot.yieldRate}</p>
        </div>
        <div>
          <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Frequency
          </p>
          <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {pot.frequency}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {pot.cyclesComplete} cycles completed
        </p>
        <button
          className={`w-full mr-2 ml-[34px] py-3 rounded-full text-sm font-semibold transition-colors ${
            isDarkMode
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-black text-white hover:bg-black/90'
          }`}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
