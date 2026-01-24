import React, { createContext, useContext, useEffect, useState } from "react";

interface AppSettingsContextType {
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  ultraLowEndMode: boolean;
  setUltraLowEndMode: (enabled: boolean) => void;
  compactMode: boolean;
  setCompactMode: (enabled: boolean) => void;
  doctorName: string;
  setDoctorName: (name: string) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const PERFORMANCE_KEY = "performance_mode";
const ULTRA_LOW_END_KEY = "ultra_low_end_mode";
const COMPACT_KEY = "compact_mode";
const DOCTOR_NAME_KEY = "doctor_name";

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [performanceMode, setPerformanceModeState] = useState(() => {
    const stored = localStorage.getItem(PERFORMANCE_KEY);
    return stored === "true";
  });

  const [ultraLowEndMode, setUltraLowEndModeState] = useState(() => {
    const stored = localStorage.getItem(ULTRA_LOW_END_KEY);
    return stored === "true";
  });

  const [compactMode, setCompactModeState] = useState(() => {
    const stored = localStorage.getItem(COMPACT_KEY);
    return stored === "true";
  });

  const [doctorName, setDoctorNameState] = useState(() => {
    const stored = localStorage.getItem(DOCTOR_NAME_KEY);
    return stored || "Dr. Metali Bhatti";
  });

  // Sync with localStorage changes from other tabs or components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DOCTOR_NAME_KEY && e.newValue) {
        setDoctorNameState(e.newValue);
      }
      if (e.key === PERFORMANCE_KEY) {
        setPerformanceModeState(e.newValue === "true");
      }
      if (e.key === ULTRA_LOW_END_KEY) {
        setUltraLowEndModeState(e.newValue === "true");
      }
      if (e.key === COMPACT_KEY) {
        setCompactModeState(e.newValue === "true");
      }
    };

    // Also sync on focus to catch any missed updates
    const handleFocus = () => {
      const storedDoctor = localStorage.getItem(DOCTOR_NAME_KEY);
      if (storedDoctor && storedDoctor !== doctorName) {
        setDoctorNameState(storedDoctor);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [doctorName]);

  const setPerformanceMode = (enabled: boolean) => {
    setPerformanceModeState(enabled);
    localStorage.setItem(PERFORMANCE_KEY, String(enabled));
  };

  const setUltraLowEndMode = (enabled: boolean) => {
    setUltraLowEndModeState(enabled);
    localStorage.setItem(ULTRA_LOW_END_KEY, String(enabled));
    // Ultra low-end mode also enables performance mode
    if (enabled && !performanceMode) {
      setPerformanceMode(true);
    }
  };

  const setCompactMode = (enabled: boolean) => {
    setCompactModeState(enabled);
    localStorage.setItem(COMPACT_KEY, String(enabled));
  };

  const setDoctorName = (name: string) => {
    setDoctorNameState(name);
    localStorage.setItem(DOCTOR_NAME_KEY, name);
    // Dispatch a custom event to notify other components immediately
    window.dispatchEvent(new CustomEvent('doctorNameChanged', { detail: name }));
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

  useEffect(() => {
    if (ultraLowEndMode) {
      document.documentElement.classList.add("ultra-low-end-mode");
    } else {
      document.documentElement.classList.remove("ultra-low-end-mode");
    }
  }, [ultraLowEndMode]);

  return (
    <AppSettingsContext.Provider value={{ 
      performanceMode, 
      setPerformanceMode, 
      ultraLowEndMode,
      setUltraLowEndMode,
      compactMode, 
      setCompactMode,
      doctorName,
      setDoctorName
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
