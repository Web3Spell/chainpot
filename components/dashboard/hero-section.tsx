interface HeroSectionProps {
    isDarkMode: boolean;
  }
  
  export function HeroSection({ isDarkMode }: HeroSectionProps) {
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-3">
          <h1 className={`text-5xl md:text-6xl font-black leading-tight space-y-2`}>
            <span className={`inline-block border-b-4 pb-2 ${isDarkMode ? 'border-white text-white' : 'border-black text-black'}`}>
              Welcome to
            </span>
            <span className={`block border-b-4 pb-2 ${isDarkMode ? 'border-white text-white' : 'border-black text-black'}`}>
              Creator's Dashboard
            </span>
          </h1>
          <p className={`text-lg italic ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
            Manage your ROSCA pools and track your yield earnings
          </p>
        </div>
  
        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 pt-4 max-w-md">
          <a href="/pots/create/">
          <button className={`px-8 py-3 rounded-full font-semibold text-sm transition-colors whitespace-nowrap ${
            isDarkMode
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-black text-white hover:bg-black/90'
          }`}>
            Create Pool
          </button>
          </a>
          <a href="/pots">
          <button className={`px-8 py-3 rounded-full font-semibold text-sm transition-colors whitespace-nowrap border-2 ${
            isDarkMode
              ? 'bg-transparent border-white text-white hover:bg-white/10'
              : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            Join Pool
          </button>
          </a>
        </div>
      </section>
    );
  }
  