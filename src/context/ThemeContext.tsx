import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getDarkModeSetting, setDarkModeSetting } from '../services/settings';

interface ThemeContextType {
  darkMode: boolean;
  loadingTheme: boolean;
  setDarkMode: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [darkMode, setDarkModeState] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTheme() {
      if (!user) {
        if (mounted) {
          setDarkModeState(false);
          setLoadingTheme(false);
        }
        return;
      }

      try {
        const enabled = await getDarkModeSetting(user.id);
        if (mounted) setDarkModeState(enabled);
      } catch (err) {
        console.error('Failed to load theme setting:', err);
      } finally {
        if (mounted) setLoadingTheme(false);
      }
    }

    setLoadingTheme(true);
    loadTheme().catch(console.error);
    return () => {
      mounted = false;
    };
  }, [user]);

  const setDarkMode = useCallback(
    async (enabled: boolean) => {
      const prev = darkMode;
      setDarkModeState(enabled);
      if (!user) return;
      try {
        await setDarkModeSetting(user.id, enabled);
      } catch (err) {
        setDarkModeState(prev);
        throw err;
      }
    },
    [darkMode, user],
  );

  return (
    <ThemeContext.Provider value={{ darkMode, loadingTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeSettings(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeSettings must be used within ThemeProvider');
  }
  return context;
}
