import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const THEME_SESSION_KEY = "user_theme_dark_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read theme solely from sessionStorage (browser/session specific, never from shared DB)
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(THEME_SESSION_KEY);
    if (saved !== null) {
      return saved === "true";
    }
    return false;
  });

  const applyThemeToDom = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  };

  useEffect(() => {
    applyThemeToDom(isDarkMode);
  }, [isDarkMode]);

  const setDarkMode = useCallback((enabled: boolean) => {
    setIsDarkModeState(enabled);
    sessionStorage.setItem(THEME_SESSION_KEY, enabled.toString());
    applyThemeToDom(enabled);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((prev) => {
      const next = !prev;
      sessionStorage.setItem(THEME_SESSION_KEY, next.toString());
      applyThemeToDom(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
