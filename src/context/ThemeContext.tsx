import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { settingService } from "../api/setting.service";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = "role_manage_dark_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
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

  // Sync with DB on mount if setting exists
  useEffect(() => {
    settingService.getSettings()
      .then((res) => {
        const darkSetting = (res.settings || []).find((s) => s.settingKey === "dark_mode_enabled");
        if (darkSetting) {
          const isEnabled = darkSetting.settingValue === "true";
          setIsDarkModeState(isEnabled);
          localStorage.setItem(THEME_STORAGE_KEY, isEnabled.toString());
          applyThemeToDom(isEnabled);
        }
      })
      .catch(() => {
        // Fallback to local storage if API is not yet loaded
      });
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setIsDarkModeState(enabled);
    localStorage.setItem(THEME_STORAGE_KEY, enabled.toString());
    applyThemeToDom(enabled);
    settingService.updateSettingsBulk({ dark_mode_enabled: enabled.toString() }).catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((prev) => {
      const next = !prev;
      localStorage.setItem(THEME_STORAGE_KEY, next.toString());
      applyThemeToDom(next);
      settingService.updateSettingsBulk({ dark_mode_enabled: next.toString() }).catch(() => {});
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
