interface PoolOverviewProps {
    isDarkMode: boolean;
  }
  
  export function PoolOverview({ isDarkMode }: PoolOverviewProps) {
    const pools = [
      {
        name: 'Tech Startup Fund',
        description: 'Investment pool for emerging tech startups',
        status: 'Active',
        totalAmount: '$50,000',
        participants: 12,
        yieldRate: '12.5%',
      },
      {
        name: 'DeFi Yield Pool',
        description: 'Decentralized finance yield aggregator',
        status: 'Active',
        totalAmount: '$75,000',
        participants: 18,
        yieldRate: '15.2%',
      },
      {
        name: 'Real Estate ROSCA',
        description: 'Rotating savings for real estate investment',
        status: 'Active',
        totalAmount: '$120,000',
        participants: 24,
        yieldRate: '8.0%',
      },
      {
        name: 'Green Energy Fund',
        description: 'Sustainable energy investment pool',
        status: 'Active',
        totalAmount: '$85,000',
        participants: 15,
        yieldRate: '10.5%',
      },
    ];
  
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Pool Overview</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your Pools</p>
          <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Scroll to see all your active pools</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pools.map((pool, idx) => (
            <div key={idx} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4  ${
            isDarkMode
              ? ' text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          } `}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.name}</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{pool.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  isDarkMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-green-200 text-black'
                }`}>
                  {pool.status}
                </span>
              </div>
  
              <div className={`space-y-2 text-sm`}>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Total Amount</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Participants</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.participants}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Yield Rate</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>{pool.yieldRate}</span>
                </div>
              </div>
  
              <div className="flex gap-3 pt-2">
                <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                  View Details
                </button>
                <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  