'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

function preferredDark() {
  const saved = localStorage.getItem('chainpot-theme');
  return saved === 'dark' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start light on the server and first client render (avoids a hydration mismatch), then apply the preference.
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only preference
    setIsDarkMode(preferredDark());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newState = !prev;
      if (newState) {
        localStorage.setItem('chainpot-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        localStorage.setItem('chainpot-theme', 'light');
        document.documentElement.classList.remove('dark');
      }
      return newState;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
