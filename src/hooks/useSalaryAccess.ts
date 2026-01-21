import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SALARY_ACCESS_KEY = "salary_access_granted";

export function useSalaryAccess() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check session storage for existing access
    return sessionStorage.getItem(SALARY_ACCESS_KEY) === "true";
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    setIsVerifying(true);
    
    try {
      // Validate input before sending
      if (!password || password.length === 0 || password.length > 100) {
        return false;
      }

      const { data, error } = await supabase.functions.invoke('verify-salary-access', {
        body: { password }
      });

      if (error) {
        console.error('Salary verification error:', error);
        return false;
      }

      if (data?.success) {
        sessionStorage.setItem(SALARY_ACCESS_KEY, "true");
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Salary verification error:', error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const revokeAccess = useCallback(() => {
    sessionStorage.removeItem(SALARY_ACCESS_KEY);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    isVerifying,
    verifyPassword,
    revokeAccess,
  };
}
