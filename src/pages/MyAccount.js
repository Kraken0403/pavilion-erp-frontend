import React, { useEffect, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../services/userServices';
import { useAuth } from '../context/AuthContext';
import '../assets/styles/MyAccount.scss';

export default function MyAccount() {
  const { updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '', phone_number: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { getMyProfile().then(setProfile).catch(() => setError('Unable to load your profile.')); }, []);
  const saveProfile = async (event) => { event.preventDefault(); setError(''); try { const result = await updateMyProfile(profile); setProfile(result.user); updateCurrentUser(result.user); setNotice('Profile saved.'); } catch (err) { setError(err.response?.data?.error || 'Unable to save your profile.'); } };
  const savePassword = async (event) => { event.preventDefault(); setError(''); if (password.newPassword !== password.confirm) return setError('The new passwords do not match.'); try { await changeMyPassword(password.currentPassword, password.newPassword); setPassword({ currentPassword: '', newPassword: '', confirm: '' }); setNotice('Password updated.'); } catch (err) { setError(err.response?.data?.error || 'Unable to update password.'); } };
  return <div className="my-account"><div className="my-account__intro"><h1>My account</h1><p>Manage your personal profile and security settings.</p></div>{error && <Alert severity="error">{error}</Alert>}{notice && <Alert severity="success">{notice}</Alert>}<div className="my-account__grid"><form className="my-account__card" onSubmit={saveProfile}><h2>Profile</h2><TextField label="Name" value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} fullWidth /><TextField label="Email" type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} fullWidth /><TextField label="Phone number" value={profile.phone_number || ''} onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} fullWidth /><Button type="submit" variant="contained">Save profile</Button></form><form className="my-account__card" onSubmit={savePassword}><h2>Password</h2><p>Use at least eight characters.</p><TextField label="Current password" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} fullWidth required /><TextField label="New password" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} fullWidth required /><TextField label="Confirm new password" type="password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} fullWidth required /><Button type="submit" variant="contained">Update password</Button></form></div></div>;
}
