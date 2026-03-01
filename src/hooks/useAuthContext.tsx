import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type AppRole = 'admin' | 'manager' | 'billing' | 'reception' | 'pharma';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  rolesLoading: boolean;
  hasAccess: (section: string) => boolean;
  isAdmin: boolean;
  primaryRole: AppRole | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'patients', 'prescriptions', 'invoices', 'stock', 'reports', 'appointments', 'salary', 'analytics'],
  billing: ['dashboard', 'invoices', 'patients', 'reports'],
  reception: ['dashboard', 'patients', 'appointments', 'prescriptions'],
  pharma: ['dashboard', 'invoices', 'patients', 'reports', 'stock'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let lastFetchedUserId: string | null = null;
    let networkFailures = 0;

    const fetchRoles = async (userId: string) => {
      if (lastFetchedUserId === userId) return;
      lastFetchedUserId = userId;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (!mounted) return;
        if (error) {
          setRoles([]);
        } else {
          setRoles((data || []).map(r => r.role as AppRole));
        }
      } catch {
        if (mounted) setRoles([]);
      } finally {
        if (mounted) setRolesLoading(false);
      }
    };

    const handleSession = (session: { user: { id: string } } | null) => {
      if (!mounted) return;
      networkFailures = 0; // reset on successful session fetch
      const u = session?.user ?? null;
      setUser(u as any);
      setLoading(false);
      if (u) {
        fetchRoles(u.id);
      } else {
        setRoles([]);
        setRolesLoading(false);
      }
    };

    const clearStaleSession = () => {
      if (!mounted) return;
      console.warn("Clearing stale auth session after repeated network failures");
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setUser(null);
      setLoading(false);
      setRoles([]);
      setRolesLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && _event === 'TOKEN_REFRESHED') return;
      handleSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    }).catch(() => {
      networkFailures++;
      if (networkFailures >= 2) {
        clearStaleSession();
      } else if (mounted) {
        setUser(null);
        setLoading(false);
        setRoles([]);
        setRolesLoading(false);
      }
    });

    // Listen for unhandled auth fetch failures and clear stale tokens
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      if (msg.includes("Failed to fetch") || msg.includes("AuthRetryableFetchError")) {
        networkFailures++;
        if (networkFailures >= 3) {
          clearStaleSession();
          event.preventDefault();
        }
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const hasAccess = useCallback((section: string): boolean => {
    if (roles.length === 0) return false;
    return roles.some(role => {
      const permissions = ROLE_PERMISSIONS[role];
      return permissions.includes('*') || permissions.includes(section);
    });
  }, [roles]);

  const isAdmin = roles.includes('admin');

  const primaryRole: AppRole | null = roles.includes('admin')
    ? 'admin'
    : roles.includes('manager')
      ? 'manager'
      : roles.includes('billing')
        ? 'billing'
        : roles.includes('reception')
          ? 'reception'
          : roles.includes('pharma')
            ? 'pharma'
            : null;

  return (
    <AuthContext.Provider value={{ user, loading, roles, rolesLoading, hasAccess, isAdmin, primaryRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
