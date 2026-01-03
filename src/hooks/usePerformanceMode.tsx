import React, { createContext, useContext, useEffect, useState } from "react";

interface AppSettingsContextType {
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  compactMode: boolean;
  setCompactMode: (enabled: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const PERFORMANCE_KEY = "performance_mode";
const COMPACT_KEY = "compact_mode";

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [performanceMode, setPerformanceModeState] = useState(() => {
    const stored = localStorage.getItem(PERFORMANCE_KEY);
    return stored === "true";
  });

  const [compactMode, setCompactModeState] = useState(() => {
    const stored = localStorage.getItem(COMPACT_KEY);
    return stored === "true";
  });

  const setPerformanceMode = (enabled: boolean) => {
    setPerformanceModeState(enabled);
    localStorage.setItem(PERFORMANCE_KEY, String(enabled));
  };

  const setCompactMode = (enabled: boolean) => {
    setCompactModeState(enabled);
    localStorage.setItem(COMPACT_KEY, String(enabled));
  };

  // Apply mode classes to document root
  useEffect(() => {
    if (performanceMode) {
      document.documentElement.classList.add("performance-mode");
    } else {
      document.documentElement.classList.remove("performance-mode");
    }
  }, [performanceMode]);

  useEffect(() => {
    if (compactMode) {
      document.documentElement.classList.add("compact-mode");
    } else {
      document.documentElement.classList.remove("compact-mode");
    }
  }, [compactMode]);

  return (
    <AppSettingsContext.Provider value={{ 
      performanceMode, 
      setPerformanceMode, 
      compactMode, 
      setCompactMode 
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
}

// Keep backward compatibility
export function usePerformanceMode() {
  const { performanceMode, setPerformanceMode } = useAppSettings();
  return { performanceMode, setPerformanceMode };
}

// Alias for the provider (backward compatibility)
export const PerformanceModeProvider = AppSettingsProvider;
