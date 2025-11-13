
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"


interface ThemeContextType {
  // You can add theme-related state or functions here if needed in components
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const primary = localStorage.getItem('theme-primary');
      const background = localStorage.getItem('theme-background');
      const accent = localStorage.getItem('theme-accent');

      if (primary) {
        root.style.setProperty('--primary', primary);
      }
      if (background) {
        root.style.setProperty('--background', background);
      }
      if (accent) {
        root.style.setProperty('--accent', accent);
      }
    };

    // Apply theme on initial load
    applyTheme();

    // Listen for changes from the admin panel
    window.addEventListener('storage', applyTheme);

    return () => {
      window.removeEventListener('storage', applyTheme);
    };
  }, []);

  return (
    <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
        <ThemeContext.Provider value={{}}>
            {children}
        </ThemeContext.Provider>
    </NextThemesProvider>
  );
}

