import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

import { signup } from '../services/authService';
import {
  deleteUserWithReassignment,
  getAllUsers,
  getUserDeleteImpact,
  deleteUser,
  updateUser,
  getUserVisibilityPermissions,
  saveUserVisibilityPermissions,
} from '../services/userServices';
import {
  createRole,
  deleteRole,
  getAllRoles,
  getRoleDeleteImpact,
  updateRole,
} from '../services/roleServices';
import {
  MODULE_PERMISSION_KEYS,
  MODULE_PERMISSION_LABELS,
  getDefaultModulePermissions,
  normalizeModulePermissions,
} from '../config/modulePermissions';
import { useAuth } from '../context/AuthContext';

function SignUp() {
  const { currentUser, loadUserPermissions } = useAuth();

  const toTitleCase = (value) => {
    return String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const isAdmin = useMemo(() => {
    return (currentUser?.role || '').toLowerCase() === 'admin';
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [openCreateUserModal, setOpenCreateUserModal] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [openEditUserModal, setOpenEditUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserIsAdmin, setEditingUserIsAdmin] = useState(false);
  const [editingUserForm, setEditingUserForm] = useState({
    name: '',
    email: '',
    roleId: '',
  });

  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [savingRole, setSavingRole] = useState(false);
  const [openCreateRoleModal, setOpenCreateRoleModal] = useState(false);

  const [openEditRoleModal, setOpenEditRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleForm, setEditingRoleForm] = useState({ name: '', description: '' });

  const [openDeleteUserModal, setOpenDeleteUserModal] = useState(false);
  const [deletingUserLoading, setDeletingUserLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteUserImpact, setDeleteUserImpact] = useState(null);
  const [reassignToUserId, setReassignToUserId] = useState('');

  const [openDeleteRoleModal, setOpenDeleteRoleModal] = useState(false);
  const [deletingRoleLoading, setDeletingRoleLoading] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [deleteRoleImpact, setDeleteRoleImpact] = useState(null);

  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState(getDefaultModulePermissions());
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadUsersAndRoles = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [userList, roleList] = await Promise.all([getAllUsers(), getAllRoles()]);
      setUsers(userList || []);
      setRoles(roleList || []);

      setUserForm((prev) => ({
        ...prev,
        roleId: prev.roleId || String(roleList?.[0]?.id || ''),
      }));

      setSelectedPermissionUserId((prev) => {
        if (prev && userList?.some((user) => String(user.id) === String(prev))) {
          return prev;
        }
        return userList?.length ? String(userList[0].id) : '';
      });
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to load users/roles');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsersAndRoles();
  }, [loadUsersAndRoles]);

  const roleNames = useMemo(() => {
    return Array.from(new Set(roles.map((role) => role.name))).filter(Boolean);
  }, [roles]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const roleName = String(user.role_name || user.role || '').toLowerCase();
      const matchRole = roleFilter === 'all' || roleName === roleFilter.toLowerCase();
      const matchSearch =
        !search ||
        String(user.name || '').toLowerCase().includes(search) ||
        String(user.email || '').toLowerCase().includes(search);
      return matchRole && matchSearch;
    });
  }, [users, userSearch, roleFilter]);

  const usersCountByRoleId = useMemo(() => {
    return users.reduce((acc, user) => {
      const key = user.role_id ? String(user.role_id) : '';
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const activeAdminCount = useMemo(() => {
    return users.filter((user) => String(user.role_name || user.role || '').toLowerCase() === 'admin').length;
  }, [users]);

  const fetchUserPermissions = useCallback(async (userId) => {
    if (!userId) {
      setUserPermissions(getDefaultModulePermissions());
      return;
    }

    setLoadingPermissions(true);
    try {
      const data = await getUserVisibilityPermissions(Number(userId));
      setUserPermissions(normalizeModulePermissions(data?.permissions));
    } catch (error) {
      setUserPermissions(getDefaultModulePermissions());
      alert(error?.response?.data?.error || 'Failed to fetch user permissions');
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPermissionUserId) {
      fetchUserPermissions(selectedPermissionUserId);
    }
  }, [selectedPermissionUserId, fetchUserPermissions]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      await signup({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        roleId: userForm.roleId ? Number(userForm.roleId) : null,
      });

      setUserForm({
        name: '',
        email: '',
        password: '',
        roleId: roles?.[0] ? String(roles[0].id) : '',
      });
      setOpenCreateUserModal(false);
      await loadUsersAndRoles();
      alert('User created successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to create user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleEditUserStart = (user) => {
    setEditingUserId(user.id);
    setEditingUserIsAdmin(String(user.role_name || user.role || '').toLowerCase() === 'admin');
    setEditingUserForm({
      name: user.name || '',
      email: user.email || '',
      roleId: user.role_id ? String(user.role_id) : '',
    });
    setOpenEditUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUserId) return;

    const selectedUser = users.find((u) => Number(u.id) === Number(editingUserId));
    const selectedUserIsAdmin = String(selectedUser?.role_name || selectedUser?.role || '').toLowerCase() === 'admin';
    const roleChanged = Number(editingUserForm.roleId || 0) !== Number(selectedUser?.role_id || 0);

    if (selectedUserIsAdmin && roleChanged) {
      alert('Admin role cannot be changed');
      return;
    }

    try {
      await updateUser(editingUserId, {
        name: editingUserForm.name,
        email: editingUserForm.email,
        roleId: editingUserForm.roleId ? Number(editingUserForm.roleId) : null,
      });
      setOpenEditUserModal(false);
      setEditingUserId(null);
      setEditingUserIsAdmin(false);
      await loadUsersAndRoles();
      alert('User updated successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUserStart = async (user) => {
    setDeletingUserLoading(true);
    setDeletingUser(user);
    setDeleteUserImpact(null);
    setReassignToUserId('');
    setOpenDeleteUserModal(true);

    try {
      const impactData = await getUserDeleteImpact(user.id);
      setDeleteUserImpact(impactData?.impact || null);
    } catch (error) {
      setOpenDeleteUserModal(false);
      setDeletingUser(null);
      alert(error?.response?.data?.error || 'Failed to fetch delete impact');
    } finally {
      setDeletingUserLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deletingUser?.id) return;

    try {
      if (deleteUserImpact?.totalAssignments > 0) {
        if (!reassignToUserId) {
          alert('Please select a reassignment user');
          return;
        }

        await deleteUserWithReassignment(deletingUser.id, Number(reassignToUserId));
      } else {
        await deleteUser(deletingUser.id);
      }

      setOpenDeleteUserModal(false);
      setDeletingUser(null);
      setDeleteUserImpact(null);
      setReassignToUserId('');
      await loadUsersAndRoles();
      alert('User deleted successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setSavingRole(true);
    try {
      await createRole({ name: roleForm.name, description: roleForm.description });
      setRoleForm({ name: '', description: '' });
      setOpenCreateRoleModal(false);
      await loadUsersAndRoles();
      alert('Role created successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to create role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleEditRoleStart = (role) => {
    setEditingRoleId(role.id);
    setEditingRoleForm({ name: role.name || '', description: role.description || '' });
    setOpenEditRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!editingRoleId) return;
    try {
      await updateRole(editingRoleId, {
        name: editingRoleForm.name,
        description: editingRoleForm.description,
      });
      setOpenEditRoleModal(false);
      setEditingRoleId(null);
      await loadUsersAndRoles();
      alert('Role updated successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRoleStart = async (role) => {
    if (String(role.name || '').toLowerCase() === 'admin') {
      alert('Admin role cannot be deleted');
      return;
    }

    setDeletingRoleLoading(true);
    setDeletingRole(role);
    setDeleteRoleImpact(null);
    setOpenDeleteRoleModal(true);

    try {
      const impactData = await getRoleDeleteImpact(role.id);
      setDeleteRoleImpact(impactData || null);
    } catch (error) {
      setOpenDeleteRoleModal(false);
      setDeletingRole(null);
      alert(error?.response?.data?.error || 'Failed to fetch role delete impact');
    } finally {
      setDeletingRoleLoading(false);
    }
  };

  const handleDeleteRoleConfirm = async () => {
    if (!deletingRole?.id) return;

    try {
      if (deleteRoleImpact?.assignedCount > 0) {
        setOpenDeleteRoleModal(false);
        setDeletingRole(null);
        setDeleteRoleImpact(null);
        setActiveTab(0);
        setRoleFilter(deletingRole.name || 'all');
        return;
      }

      await deleteRole(deletingRole.id);

      setOpenDeleteRoleModal(false);
      setDeletingRole(null);
      setDeleteRoleImpact(null);
      await loadUsersAndRoles();
      alert('Role deleted successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedPermissionUserId) {
      alert('Select a user first');
      return;
    }

    setSavingPermissions(true);
    try {
      await saveUserVisibilityPermissions(Number(selectedPermissionUserId), userPermissions);
      if (Number(currentUser?.id) === Number(selectedPermissionUserId)) {
        await loadUserPermissions(currentUser.id);
      }
      alert('Permissions saved successfully');
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
        <Alert severity="warning">Admin access is required to manage users, roles, and permissions.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1160, margin: '0 auto', padding: '20px' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, marginBottom: '6px' }}>User Management</Typography>
      <Typography color="text.secondary" sx={{ marginBottom: '16px' }}>
        Manage users, roles, and user-based module permissions.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ marginBottom: 2 }}>
        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 0 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GroupsRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Total Users</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{users.length}</Typography>
              <Typography variant="caption" color="text.secondary">{activeAdminCount} admin users</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 0 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                backgroundColor: 'secondary.main',
                color: 'secondary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SecurityRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Total Roles</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{roles.length}</Typography>
              <Typography variant="caption" color="text.secondary">{roles.filter((r) => String(r.name || '').toLowerCase() === 'admin').length} protected role</Typography>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          centered
          sx={{
            '& .MuiTabs-flexContainer': { justifyContent: 'center' },
          }}
        >
          <Tab label="Users" />
          <Tab label="Roles" />
          <Tab label="Permissions" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Card sx={{ marginTop: '16px', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <Typography variant="h6">Users</Typography>
              <Button variant="contained" onClick={() => setOpenCreateUserModal(true)}>
                Create User
              </Button>
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ marginBottom: '14px' }}>
              <TextField
                label="Search by name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                fullWidth
              />
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel id="role-filter">Filter by role</InputLabel>
                <Select
                  labelId="role-filter"
                  label="Filter by role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  {roleNames.map((name) => (
                    <MenuItem key={name} value={name}>{toTitleCase(name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Role</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          No users found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Try changing the search term or selected role filter.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.name}
                          {user.email === currentUser?.email && (
                            <Chip label="You" color="primary" size="small" sx={{ marginLeft: '8px' }} />
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{toTitleCase(user.role_name || user.role || '-')}</TableCell>
                        <TableCell align="right">
                          <IconButton color="primary" onClick={() => handleEditUserStart(user)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            disabled={user.email === currentUser?.email}
                            onClick={() => handleDeleteUserStart(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card sx={{ marginTop: '16px', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <Typography variant="h6">Roles</Typography>
              <Button variant="contained" onClick={() => setOpenCreateRoleModal(true)}>
                Create Role
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Users</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => {
                    const isAdminRole = String(role.name || '').toLowerCase() === 'admin';
                    const assignedUsersCount = usersCountByRoleId[String(role.id)] || 0;

                    return (
                      <TableRow key={role.id}>
                        <TableCell>{toTitleCase(role.name)}</TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={assignedUsersCount > 0 ? 'primary' : 'default'}
                            label={`${assignedUsersCount} user${assignedUsersCount === 1 ? '' : 's'}`}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton color="primary" onClick={() => handleEditRoleStart(role)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            disabled={isAdminRole}
                            onClick={() => handleDeleteRoleStart(role)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card sx={{ marginTop: '16px', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
          <CardContent>
            <Typography variant="h6" sx={{ marginBottom: '14px' }}>User Permissions</Typography>

            <FormControl sx={{ minWidth: 360, marginBottom: '14px' }}>
              <InputLabel id="permission-user">Select User</InputLabel>
              <Select
                labelId="permission-user"
                label="Select User"
                value={selectedPermissionUserId}
                onChange={(e) => setSelectedPermissionUserId(e.target.value)}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!selectedPermissionUserId ? (
              <Alert severity="info">Select a user to configure permissions.</Alert>
            ) : loadingPermissions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                <Stack spacing={1.25} sx={{ marginBottom: '16px' }}>
                  {MODULE_PERMISSION_KEYS.map((key) => (
                    <Paper
                      key={key}
                      sx={{
                        padding: '10px 14px',
                        borderRadius: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography sx={{ fontWeight: 500 }}>{MODULE_PERMISSION_LABELS[key]}</Typography>
                      <Switch
                        checked={Boolean(userPermissions[key])}
                        onChange={() => setUserPermissions((p) => ({ ...p, [key]: !p[key] }))}
                      />
                    </Paper>
                  ))}
                </Stack>

                <Button variant="contained" onClick={handleSavePermissions} disabled={savingPermissions}>
                  {savingPermissions ? 'Saving...' : 'Save Permissions'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={openCreateUserModal}
        onClose={() => setOpenCreateUserModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleCreateUser}>
          <DialogTitle sx={{ pb: 1 }}>Create User</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={userForm.name}
                onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel id="modal-new-user-role">Role</InputLabel>
                <Select
                  labelId="modal-new-user-role"
                  label="Role"
                  value={userForm.roleId}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, roleId: e.target.value }))}
                  required
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={String(role.id)}>{toTitleCase(role.name)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreateUserModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={savingUser}>
              {savingUser ? 'Saving...' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={openEditUserModal}
        onClose={() => {
          setOpenEditUserModal(false);
          setEditingUserId(null);
          setEditingUserIsAdmin(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>Edit User</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={editingUserForm.name}
              onChange={(e) => setEditingUserForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={editingUserForm.email}
              onChange={(e) => setEditingUserForm((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel id="modal-edit-user-role">Role</InputLabel>
              <Select
                labelId="modal-edit-user-role"
                label="Role"
                value={editingUserForm.roleId}
                onChange={(e) => setEditingUserForm((prev) => ({ ...prev, roleId: e.target.value }))}
                disabled={editingUserIsAdmin}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={String(role.id)}>{toTitleCase(role.name)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {editingUserIsAdmin && (
              <FormHelperText>Admin role cannot be changed.</FormHelperText>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenEditUserModal(false);
              setEditingUserId(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveUser}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCreateRoleModal}
        onClose={() => setOpenCreateRoleModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleCreateRole}>
          <DialogTitle sx={{ pb: 1 }}>Create Role</DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2}>
              <TextField
                label="Role Name"
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenCreateRoleModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={savingRole}>
              {savingRole ? 'Saving...' : 'Create Role'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={openEditRoleModal}
        onClose={() => {
          setOpenEditRoleModal(false);
          setEditingRoleId(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>Edit Role</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Role Name"
              value={editingRoleForm.name}
              onChange={(e) => setEditingRoleForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editingRoleForm.description}
              onChange={(e) => setEditingRoleForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenEditRoleModal(false);
              setEditingRoleId(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveRole}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteUserModal}
        onClose={() => {
          setOpenDeleteUserModal(false);
          setDeletingUser(null);
          setDeleteUserImpact(null);
          setReassignToUserId('');
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>Delete User</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {deletingUserLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Alert severity={deleteUserImpact?.totalAssignments > 0 ? 'warning' : 'info'}>
                {deleteUserImpact?.totalAssignments > 0
                  ? `${deletingUser?.name || 'This user'} has ${deleteUserImpact.totalAssignments} linked records. Reassign before delete.`
                  : `This will permanently delete ${deletingUser?.name || 'this user'}.`}
              </Alert>

              {deleteUserImpact?.totalAssignments > 0 && (
                <Paper sx={{ borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Linked records by module</Typography>
                  <Stack spacing={0.75}>
                    {(deleteUserImpact.assignments || []).map((item) => (
                      <Typography key={`${item.table}-${item.column}`} variant="body2" color="text.secondary">
                        {item.table} ({item.column}): {item.count}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              )}

              {deleteUserImpact?.totalAssignments > 0 && (
                <FormControl fullWidth required error={deleteUserImpact?.totalAssignments > 0 && !reassignToUserId}>
                  <InputLabel id="reassign-user-label">Reassign linked records to</InputLabel>
                  <Select
                    labelId="reassign-user-label"
                    label="Reassign linked records to"
                    value={reassignToUserId}
                    onChange={(e) => setReassignToUserId(e.target.value)}
                  >
                    {users
                      .filter((user) => String(user.id) !== String(deletingUser?.id))
                      .map((user) => (
                        <MenuItem key={user.id} value={String(user.id)}>
                          {user.name} ({user.email})
                        </MenuItem>
                      ))}
                  </Select>
                  {!reassignToUserId && (
                    <FormHelperText>Select a user to continue</FormHelperText>
                  )}
                </FormControl>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenDeleteUserModal(false);
              setDeletingUser(null);
              setDeleteUserImpact(null);
              setReassignToUserId('');
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingUserLoading || (deleteUserImpact?.totalAssignments > 0 && !reassignToUserId)}
            onClick={handleDeleteUserConfirm}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteRoleModal}
        onClose={() => {
          setOpenDeleteRoleModal(false);
          setDeletingRole(null);
          setDeleteRoleImpact(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>Delete Role</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {deletingRoleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Alert severity={deleteRoleImpact?.assignedCount > 0 ? 'warning' : 'info'}>
                {deleteRoleImpact?.assignedCount > 0
                  ? `${deletingRole?.name || 'This role'} is assigned to ${deleteRoleImpact.assignedCount} users. Reassign users before delete.`
                  : `This will permanently delete role ${deletingRole?.name || ''}. `}
                <br />Reassign these users from the Users tab first, then return here to delete this role.
              </Alert>

              {deleteRoleImpact?.assignedCount > 0 && (
                <Paper sx={{ borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Assigned users</Typography>
                  <Stack spacing={0.75}>
                    {(deleteRoleImpact.assignedUsers || []).map((user) => (
                      <Typography key={user.id} variant="body2" color="text.secondary">
                        {user.name} ({user.email})
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* {deleteRoleImpact?.assignedCount > 0 && (
                <Alert
                  severity="warning"
                >
                  Reassign these users from the Users tab first, then return here to delete this role.
                </Alert>
              )} */}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOpenDeleteRoleModal(false);
              setDeletingRole(null);
              setDeleteRoleImpact(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingRoleLoading}
            onClick={handleDeleteRoleConfirm}
          >
            {deleteRoleImpact?.assignedCount > 0 ? 'Go to Users Tab' : 'Delete Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SignUp;
