import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

const lightColors = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#64748b',
  border: '#f1f5f9',
  primary: '#ef4444',
  primaryMuted: 'rgba(239,68,68,0.10)',
  onPrimary: '#ffffff',
  tabBarInactive: '#94a3b8',
  surfaceMuted: '#f8fafc',
  surfaceActive: 'rgba(239,68,68,0.08)',
  cardBorderAccent: '#262626'
};

const darkColors = {
  background: '#0A0A0A',
  card: '#161616',
  text: '#F2F2F2',
  textSecondary: '#9ca3af',
  border: '#262626',
  primary: '#E0263F',
  primaryMuted: 'rgba(224,38,63,0.14)',
  onPrimary: '#ffffff',
  tabBarInactive: '#52525b',
  surfaceMuted: '#161616',
  surfaceActive: 'rgba(224,38,63,0.12)',
  cardBorderAccent: '#262626'
};

const THEME_STORAGE_KEY = 'user-theme';

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [hasManualPreference, setHasManualPreference] = useState(false);

  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (!isMounted) return;
        if (saved) {
          setIsDark(saved === 'dark');
          setHasManualPreference(true);
        }
      })
      .catch((error) => {
        console.error('Failed to load saved theme preference:', error);

      })
      .finally(() => {
        if (isMounted) setIsPreferenceLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasManualPreference) {
      setIsDark(systemScheme === 'dark');
    }
  }, [systemScheme, hasManualPreference]);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    setHasManualPreference(true);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to persist theme preference:', error);
    }
  };

  // Lets a settings screen offer "match system" again
  const resetToSystem = async () => {
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear saved theme preference:', error);
    }
    setHasManualPreference(false);
    setIsDark(systemScheme === 'dark');
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors,
        toggleTheme,
        resetToSystem,
        hasManualPreference,
        isPreferenceLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
