import { useState, useCallback } from "react";

const SALARY_PASSWORD = "Roop@58925658";
const SALARY_ACCESS_KEY = "salary_access_granted";

export function useSalaryAccess() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check session storage for existing access
    return sessionStorage.getItem(SALARY_ACCESS_KEY) === "true";
  });

  const verifyPassword = useCallback((password: string): boolean => {
    if (password === SALARY_PASSWORD) {
      sessionStorage.setItem(SALARY_ACCESS_KEY, "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const revokeAccess = useCallback(() => {
    sessionStorage.removeItem(SALARY_ACCESS_KEY);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    verifyPassword,
    revokeAccess,
  };
}
