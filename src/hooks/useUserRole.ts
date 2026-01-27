import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'manager' | 'billing' | 'reception';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async (userId: string) => {
      try {
        console.log('Fetching roles for user:', userId);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        console.log('Roles fetch result:', { data, error });
        
        if (error) {
          console.error('Error fetching roles:', error);
          setRoles([]);
        } else {
          const userRoles = (data || []).map(r => r.role as AppRole);
          setRoles(userRoles);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = useCallback((section: string): boolean => {
    if (roles.length === 0) return false;
    // Check if any of the user's roles has access to the section
    return roles.some(role => {
      const permissions = ROLE_PERMISSIONS[role];
      return permissions.includes('*') || permissions.includes(section);
    });
  }, [roles]);

  const isAdmin = roles.includes('admin');
  
  // Primary role for display (highest privilege first)
  const primaryRole: AppRole | null = roles.includes('admin') 
    ? 'admin' 
    : roles.includes('manager') 
      ? 'manager' 
      : roles.includes('billing') 
        ? 'billing' 
        : roles.includes('reception') 
          ? 'reception' 
          : null;

  // Keep backward compatibility with single role
  const role = primaryRole;

  return {
    user,
    role,
    roles,
    loading,
    hasAccess,
    isAdmin,
  };
}
