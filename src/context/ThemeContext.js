import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

const lightColors = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#64748b',
  border: '#f1f5f9',
  primary: '#ef4444',
  tabBarInactive: '#94a3b8',
};

const darkColors = {
  background: '#121212',   // Material Design dark theme base — neutral gray-black, not navy
  card: '#1e1e1e',         // Slightly lighter than background so cards read as "elevated"
  text: '#f4f4f5',         // Soft off-white — pure #fff on #121212 is harsher than needed
  textSecondary: '#a1a1aa',
  border: '#2c2c2e',
  primary: '#ef4444',
  tabBarInactive: '#71717a',
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [hasManualPreference, setHasManualPreference] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user-theme').then((saved) => {
      if (saved) {
        setIsDark(saved === 'dark');
        setHasManualPreference(true);
      }
    });
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
    await AsyncStorage.setItem('user-theme', next ? 'dark' : 'light');
  };

  // Lets a settings screen offer "match system" again
  const resetToSystem = async () => {
    await AsyncStorage.removeItem('user-theme');
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
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);