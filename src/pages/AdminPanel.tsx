import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, AppRole, ROLE_LABELS, ROLE_PERMISSIONS, UserWithRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Trash2, Pencil, KeyRound, Loader2, Lock } from 'lucide-react';
import { FloatingOrbs } from '@/components/ui/floating-orbs';
import { Navigate } from 'react-router-dom';

export default function AdminPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'reception' as AppRole,
  });

  // Fetch all users with their roles
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: userRole?.role as AppRole || null,
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Create new user
  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.role) {
      toast.error('Please fill all required fields');
      return;
    }

    if (newUserForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setCreating(true);
    try {
      // Call edge function to create user (requires service role)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          fullName: newUserForm.fullName,
          role: newUserForm.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('User created successfully');
      setIsAddUserDialogOpen(false);
      setNewUserForm({ email: '', password: '', fullName: '', role: 'reception' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // Update user role
  const handleUpdateRole = async (newRole: AppRole) => {
    if (!selectedUser) return;

    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: newRole });

        if (error) throw error;
      }

      toast.success('Role updated successfully');
      setIsEditRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  // Reset user password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Password reset successfully');
      setIsResetPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'billing': return 'secondary';
      case 'reception': return 'outline';
      default: return 'outline';
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen p-4 md:p-6 relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage users and access control</p>
            </div>
          </div>
          
          <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['admin', 'manager', 'billing', 'reception'] as AppRole[]).map(r => (
            <Card key={r} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{ROLE_LABELS[r]}</p>
                    <p className="text-2xl font-bold">{users.filter(u => u.role === r).length}</p>
                  </div>
                  <Users className="w-6 h-6 text-primary/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users
            </CardTitle>
            <CardDescription>Manage user accounts and their access roles</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Add your first user to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'No name'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role ? ROLE_LABELS[user.role] : 'No role'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit Role"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditRoleDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Reset Password"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewPassword('');
                                setIsResetPasswordDialogOpen(true);
                              }}
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Delete User"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>Overview of what each role can access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {(['admin', 'manager', 'billing', 'reception'] as AppRole[]).map(r => (
                <div key={r} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getRoleBadgeVariant(r)}>{ROLE_LABELS[r]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_PERMISSIONS[r].includes('*') 
                      ? 'Full access to all sections'
                      : `Access to: ${ROLE_PERMISSIONS[r].join(', ')}`
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={newUserForm.fullName}
                onChange={e => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={newUserForm.password}
                onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select
                value={newUserForm.role}
                onValueChange={value => setNewUserForm({ ...newUserForm, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['admin', 'manager', 'billing', 'reception'] as AppRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Changing role for: <strong>{selectedUser?.email}</strong>
            </p>
            <div>
              <Label>New Role</Label>
              <Select
                defaultValue={selectedUser?.role || 'reception'}
                onValueChange={value => handleUpdateRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['admin', 'manager', 'billing', 'reception'] as AppRole[]).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for: <strong>{selectedUser?.email}</strong>
            </p>
            <div>
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
