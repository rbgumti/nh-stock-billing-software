// Re-export from shared auth context to avoid duplicate auth listeners
import { useAuth, type AppRole } from '@/hooks/useAuthContext';

export type { AppRole };

export { type AppRole as AppRoleType };

export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'patients', 'prescriptions', 'invoices', 'stock', 'reports', 'appointments', 'salary', 'analytics'],
  billing: ['dashboard', 'invoices', 'patients', 'reports'],
  reception: ['dashboard', 'patients', 'appointments', 'prescriptions'],
  pharma: ['dashboard', 'invoices', 'patients', 'reports', 'stock'],
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  billing: 'Billing',
  reception: 'Reception',
  pharma: 'Pharma',
};

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  roles: AppRole[];
  created_at: string;
}

export function useUserRole() {
  const { user, roles, rolesLoading, hasAccess, isAdmin, primaryRole } = useAuth();

  return {
    user,
    role: primaryRole,
    roles,
    loading: rolesLoading,
    hasAccess,
    isAdmin,
  };
}
