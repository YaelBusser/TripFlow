import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeColors, getThemeColors } from '../lib/theme';

const THEME_STORAGE_KEY = 'tripflow_theme';

interface ThemeContextType {
  theme: Theme;
  themeColors: ThemeColors;
  setTheme: (theme: Theme) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('auto');
  const systemTheme = useColorScheme() || 'light';
  const themeColors = getThemeColors(theme, systemTheme);
  const isDark = themeColors === getThemeColors('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme && ['light', 'dark', 'auto'].includes(storedTheme)) {
        setThemeState(storedTheme as Theme);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du thème:', error);
    }
  }

  async function setTheme(newTheme: Theme) {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, themeColors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
