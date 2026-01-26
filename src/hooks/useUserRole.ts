import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'manager' | 'billing' | 'reception';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  created_at: string;
}

// Define which sections each role can access
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['*'], // Full access
  manager: ['dashboard', 'patients', 'prescriptions', 'invoices', 'stock', 'reports', 'appointments', 'salary', 'analytics'],
  billing: ['dashboard', 'invoices', 'patients', 'reports'],
  reception: ['dashboard', 'patients', 'appointments', 'prescriptions'],
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  billing: 'Billing',
  reception: 'Reception',
};

export function useUserRole() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (userId: string) => {
      try {
        console.log('Fetching role for user:', userId);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        console.log('Role fetch result:', { data, error });
        
        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else {
          setRole(data?.role as AppRole || null);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = useCallback((section: string): boolean => {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.includes('*') || permissions.includes(section);
  }, [role]);

  const isAdmin = role === 'admin';

  return {
    user,
    role,
    loading,
    hasAccess,
    isAdmin,
  };
}
