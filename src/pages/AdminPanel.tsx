import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, AppRole, ROLE_LABELS, ROLE_PERMISSIONS, UserWithRole } from '@/hooks/useUserRole';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Trash2, Pencil, KeyRound, Loader2, Lock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  const [editUsername, setEditUsername] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'exporting' | 'importing' | 'done' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncResults, setSyncResults] = useState<Record<string, number> | null>(null);

  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    role: 'reception' as AppRole,
  });

  // Live environment config (production Supabase project)
  const LIVE_SUPABASE_URL = 'https://bzbiehprbvbkgfrcktvk.supabase.co';
  const LIVE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YmllaHByYnZia2dmcmNrdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTA1NDYsImV4cCI6MjA4NTY4NjU0Nn0.dv4lTia7qsUDJDPZ4Ex0KPHH8AjjxinjjULzv2N2JKw';
  // Live credentials are passed to the sync-to-live edge function server-side

  const handleSyncToLive = async () => {
    if (syncStatus === 'exporting' || syncStatus === 'importing') return;
    setSyncStatus('exporting');
    setSyncProgress(20);
    setSyncMessage('Syncing data to Live environment...');
    setSyncResults(null);

    try {
      setSyncStatus('importing');
      setSyncProgress(40);
      setSyncMessage('Exporting & importing via secure server-side sync...');

      // Use the sync-to-live edge function which handles export, secret auth,
      // and calling the Live import function server-side.
      const { data: syncData, error: syncError } = await invokeWithAuth('sync-to-live', {
        body: {
          liveUrl: LIVE_SUPABASE_URL,
          liveAnonKey: LIVE_ANON_KEY,
        },
      });

      if (syncError) throw syncError;
      if ((syncData as any)?.error) throw new Error((syncData as any).error);

      setSyncProgress(100);
      setSyncStatus('done');
      setSyncMessage('Sync completed successfully!');
      setSyncResults((syncData as any)?.exported || null);
      toast.success('Data synced to Live successfully');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(err.message || 'Sync failed');
      toast.error(err.message || 'Sync failed');
    }
  };

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
      // IMPORTANT: profiles.user_id is the auth user id (used by user_roles + admin functions)
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const authUserId = (profile as any).user_id as string | undefined;
        const userRoles = (roles || []).filter(r => r.user_id === authUserId);
        return {
          id: authUserId || profile.id,
          email: profile.email,
          full_name: profile.full_name,
          username: (profile as any).username || null,
          roles: userRoles.map(r => r.role as AppRole),
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
      const { data, error } = await invokeWithAuth('create-user', {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          fullName: newUserForm.fullName,
          username: newUserForm.username || null,
          role: newUserForm.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('User created successfully');
      setIsAddUserDialogOpen(false);
      setNewUserForm({ email: '', password: '', fullName: '', username: '', role: 'reception' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // Update user (role and username)
  const handleUpdateUser = async (newRole: AppRole) => {
    if (!selectedUser) return;

    setUpdatingUser(true);
    try {
      const trimmedUsername = editUsername.trim();

      // Use backend function so updates work regardless of RLS and always target auth user id
      const { data, error } = await invokeWithAuth('set-user-role', {
        body: {
          userId: selectedUser.id,
          role: newRole,
          username: trimmedUsername,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success('User updated successfully');
      setIsEditRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await invokeWithAuth('delete-user', {
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
      const { data, error } = await invokeWithAuth('reset-user-password', {
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

  const getRoleBadgeVariant = (role: AppRole) => {
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
                    <p className="text-2xl font-bold">{users.filter(u => u.roles.includes(r)).length}</p>
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
                      <TableHead>Username</TableHead>
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
                        <TableCell>
                          {user.username ? (
                            <Badge variant="secondary" className="font-mono">
                              {user.username}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? user.roles.map(r => (
                              <Badge key={r} variant={getRoleBadgeVariant(r)}>
                                {ROLE_LABELS[r]}
                              </Badge>
                            )) : (
                              <Badge variant="outline">No role</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit User"
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

        {/* Sync Data to Live */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sync Data to Live
            </CardTitle>
            <CardDescription>Export data from Test and import it into the Live environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus !== 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {syncStatus === 'exporting' || syncStatus === 'importing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : syncStatus === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span>{syncMessage}</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
                {syncResults && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(syncResults).map(([table, count]) => (
                      <div key={table} className="flex justify-between p-2 rounded bg-muted/50">
                        <span className="font-medium">{table}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={handleSyncToLive}
              disabled={syncStatus === 'exporting' || syncStatus === 'importing'}
              className="gap-2"
              variant="gold"
            >
              {syncStatus === 'exporting' || syncStatus === 'importing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncStatus === 'exporting' ? 'Exporting...' : syncStatus === 'importing' ? 'Importing...' : 'Sync Data to Live'}
            </Button>
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
              <Label>Username (for login)</Label>
              <Input
                value={newUserForm.username}
                onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                placeholder="e.g. reception1"
              />
              <p className="text-xs text-muted-foreground mt-1">Optional. Users can login with username instead of email.</p>
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

      {/* Edit User Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={(open) => {
        setIsEditRoleDialogOpen(open);
        if (open && selectedUser) {
          setEditUsername(selectedUser.username || '');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Editing: <strong>{selectedUser?.email}</strong>
            </p>
            <div>
              <Label>Username (for login)</Label>
              <Input
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                placeholder="e.g. reception1"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to remove username login.</p>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={selectedUser?.roles[0] || 'reception'}
                onValueChange={value => handleUpdateUser(value as AppRole)}
                disabled={updatingUser}
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
              <p className="text-xs text-muted-foreground mt-1">Select a role to save changes.</p>
            </div>
            {updatingUser && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            )}
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
