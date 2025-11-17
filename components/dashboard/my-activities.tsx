interface MyActivitiesProps {
    isDarkMode: boolean;
  }
  
  export function MyActivities({ isDarkMode }: MyActivitiesProps) {
    return (
      <section className="py-12 space-y-6 pb-16">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activities</h2>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Join Requests */}
          <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 $ ${
            isDarkMode
              ? 'text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Join Requests</h3>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Pending requests to join pools</p>
            <div className={`space-y-3 text-sm`}>
              <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Join a community to see requests</p>
              <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Manage your join requests in this section</p>
              <button className={`w-full mt-4 px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                Manage Join Requests
              </button>
            </div>
          </div>
  
          {/* My Contributions */}
          <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4  ${
            isDarkMode
              ? 'text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Contributions</h3>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Track your pool contributions</p>
            <div className={`space-y-3 text-sm`}>
              <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No contributions yet. Join a pool to start contributing</p>
              <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Contribute to earning pools to see your progress</p>
              <button className={`w-full mt-4 px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                Start Contributing
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  