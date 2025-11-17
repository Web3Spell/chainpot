interface BrowsePoolsProps {
    isDarkMode: boolean;
  }
  
  export function BrowsePools({ isDarkMode }: BrowsePoolsProps) {
    const pools = [
      {
        name: 'NFT Collection Pool',
        description: 'Discover and invest in digital art collections together',
        totalAmount: '$30,000',
        participants: 8,
        yieldRate: '18.5%',
      },
      {
        name: 'Education Savings',
        description: 'Save for education with community pool benefits',
        totalAmount: '$20,000',
        participants: 15,
        yieldRate: '6.5%',
      },
      {
        name: 'Travel Fund',
        description: 'Save together for unforgettable travel experiences',
        totalAmount: '$20,000',
        participants: 10,
        yieldRate: '7.7%',
      },
      {
        name: 'Business Launch',
        description: 'Support emerging entrepreneurs and grow together',
        totalAmount: '$50,000',
        participants: 20,
        yieldRate: '9.2%',
      },
    ];
  
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Browse Pools</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Discover and join community investment pools</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pools.map((pool, idx) => (
            <div key={idx} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4  ${
            isDarkMode
              ? 'text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
              <div className="space-y-2">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.name}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{pool.description}</p>
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
  
              <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                Join Pool
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }
  