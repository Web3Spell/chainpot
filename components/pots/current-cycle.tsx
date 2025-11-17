'use client';

interface CurrentCycleProps {
  potId: string;
  isDarkMode: boolean;
  isCreator: boolean;
}

export function CurrentCycle({ potId, isDarkMode, isCreator }: CurrentCycleProps) {
  return (
    <section className="mb-8">
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Current Cycle (Cycle 5)
      </h2>

      <div
        className={`p-8 rounded-2xl border-3 border-black ${
           isDarkMode ? 'bg-white/5' : 'bg-white/90'}
           `}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Cycle Details */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Cycle Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cycle Amount</span>
                <span className="font-bold">$5,000</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Start Date</span>
                <span className="font-bold">Nov 16, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>End Date</span>
                <span className="font-bold">Nov 23, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bid Deposit Deadline</span>
                <span className="font-bold">Nov 19, 2025</span>
              </div>
            </div>
          </div>

          {/* Bidding Status */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Bidding Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Active Bids</span>
                <span className="font-bold">8 / 12</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Bid Leader</span>
                <span className="font-bold">0x742d35Cc...</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Highest Bid</span>
                <span className="font-bold text-green-500">$420</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Your Bid</span>
                <span className="font-bold">$350</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Bidding Period Progress
          </p>
          <div
            className={`h-3 rounded-full overflow-hidden ${
              isDarkMode ? 'bg-white/10' : 'bg-black/10'
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: '65%' }}
            />
          </div>
          <p className={`text-xs font-medium mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            3 days remaining until deadline
          </p>
        </div>

        {isCreator && (
          <button
            className={`w-full px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Start Next Cycle
          </button>
        )}
      </div>
    </section>
  );
}
