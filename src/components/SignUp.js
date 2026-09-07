import React, { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, Snackbar, TextField } from '@mui/material';
import { Add, AdminPanelSettingsOutlined, DeleteOutline } from '@mui/icons-material';
import { jwtDecode } from 'jwt-decode';
import { signup } from '../services/authService';
import { deleteUser, getAllUsers } from '../services/userServices';
import EntityFormDrawer from './ui/EntityFormDrawer';
import HubSpotListing from './ui/HubSpotListing';
import UserPermissionsDialog from './UserPermissionsDialog';

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'salesperson' });
  const [users, setUsers] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);
  const [notice, setNotice] = useState({ open: false, message: '', severity: 'success' });
  const tokenUser = useMemo(() => {
    try { return jwtDecode(localStorage.getItem('token') || ''); } catch (_) { return {}; }
  }, []);
  const loadUsers = async () => {
    try { setUsers(await getAllUsers()); }
    catch (_) { setNotice({ open: true, message: 'Failed to load users.', severity: 'error' }); }
  };
  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createUser = async (event) => {
    event.preventDefault();
    try {
      await signup(form); await loadUsers(); setDrawerOpen(false);
      setForm({ name: '', email: '', password: '', role: 'salesperson' });
      setNotice({ open: true, message: 'User created successfully.', severity: 'success' });
    } catch (error) { setNotice({ open: true, message: error.message || 'Failed to create user.', severity: 'error' }); }
  };
  const removeUser = async (event, user) => {
    event.stopPropagation();
    if (!window.confirm(`Delete ${user.name || user.email}?`)) return;
    try { await deleteUser(user.id); await loadUsers(); setNotice({ open: true, message: 'User deleted.', severity: 'success' }); }
    catch (_) { setNotice({ open: true, message: 'Failed to delete user.', severity: 'error' }); }
  };
  const renderValue = (field, value, user) => {
    if (field === 'status') return user.id === tokenUser.id ? 'You' : 'Active';
    if (field === 'actions') return tokenUser.role === 'admin' ? <div className="user-list-actions"><button onClick={(event) => { event.stopPropagation(); setPermissionUser(user); }}><AdminPanelSettingsOutlined />Access</button><button disabled={user.role === 'admin' || user.id === tokenUser.id || user.email === tokenUser.email} onClick={(event) => removeUser(event, user)}><DeleteOutline />Delete</button></div> : '—';
    return value || '—';
  };

  return <div className="settings-user-list"><HubSpotListing title="Users" createLabel="Add user" createIcon={<Add />} onCreate={() => setDrawerOpen(true)} rows={users.map((user) => ({ ...user, status: user.id === tokenUser.id ? 'You' : 'Active', actions: '' }))} initialFields={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'actions', label: 'Actions' }]} onRefresh={loadUsers} onRowOpen={tokenUser.role === 'admin' ? (user) => setPermissionUser(user) : undefined} renderValue={renderValue} />
    <EntityFormDrawer open={drawerOpen} title="Add user" onClose={() => setDrawerOpen(false)}><form className="settings-user-form" onSubmit={createUser}><TextField required label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /><TextField required type="email" label="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /><TextField required type="password" label="Password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><TextField select label="Role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><MenuItem value="salesperson">Salesperson</MenuItem><MenuItem value="supervisor">Supervisor</MenuItem><MenuItem value="admin">Admin</MenuItem></TextField><footer><button type="button" onClick={() => setDrawerOpen(false)}>Cancel</button><button className="primary" type="submit">Create user</button></footer></form></EntityFormDrawer>
    <UserPermissionsDialog user={permissionUser} open={Boolean(permissionUser)} onClose={() => setPermissionUser(null)} />
    <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((current) => ({ ...current, open: false }))}><Alert severity={notice.severity}>{notice.message}</Alert></Snackbar>
  </div>;
}
export default SignUp;
