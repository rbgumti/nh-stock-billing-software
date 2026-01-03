import React, { createContext, useContext, useEffect, useState } from "react";

interface PerformanceModeContextType {
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
}

const PerformanceModeContext = createContext<PerformanceModeContextType | undefined>(undefined);

const STORAGE_KEY = "performance_mode";

export function PerformanceModeProvider({ children }: { children: React.ReactNode }) {
  const [performanceMode, setPerformanceModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  const setPerformanceMode = (enabled: boolean) => {
    setPerformanceModeState(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
  };

  // Apply performance-mode class to document root
  useEffect(() => {
    if (performanceMode) {
      document.documentElement.classList.add("performance-mode");
    } else {
      document.documentElement.classList.remove("performance-mode");
    }
  }, [performanceMode]);

  return (
    <PerformanceModeContext.Provider value={{ performanceMode, setPerformanceMode }}>
      {children}
    </PerformanceModeContext.Provider>
  );
}

export function usePerformanceMode() {
  const context = useContext(PerformanceModeContext);
  if (context === undefined) {
    throw new Error("usePerformanceMode must be used within a PerformanceModeProvider");
  }
  return context;
}
