'use client';

import { useState, useEffect } from 'react';

export function CountdownTimer({ deadline, label, isDarkMode }: { deadline: number; label: string; isDarkMode?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!deadline) return;

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;

      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      
      setTimeLeft(str);
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || !timeLeft) return null;

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}:</span>
      <span className={`font-mono font-bold px-2 py-1 rounded ${
        timeLeft === 'Expired' 
          ? 'bg-red-500/10 text-red-500' 
          : 'bg-orange-500/10 text-orange-500'
      }`}>
        ⏱️ {timeLeft}
      </span>
    </div>
  );
}
