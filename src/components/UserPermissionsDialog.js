import React, { useEffect, useState } from 'react';
import { Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Button, FormControlLabel } from '@mui/material';
import { MODULE_PERMISSION_KEYS, MODULE_PERMISSION_LABELS } from '../config/modulePermissions';
import { getUserVisibilityPermissions, updateUserVisibilityPermissions } from '../services/userServices';

export default function UserPermissionsDialog({ user, open, onClose }) {
  const [permissions, setPermissions] = useState({});
  useEffect(() => { if (open && user?.id) getUserVisibilityPermissions(user.id).then((result) => setPermissions(result.permissions || {})); }, [open, user]);
  const save = async () => { await updateUserVisibilityPermissions(user.id, permissions); onClose(); };
  return <Dialog className="erp-form-drawer" open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Module access — {user?.name}</DialogTitle><DialogContent dividers>{MODULE_PERMISSION_KEYS.map((key) => <FormControlLabel key={key} control={<Checkbox checked={Boolean(permissions[key])} onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })} />} label={MODULE_PERMISSION_LABELS[key]} />)}</DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={save}>Save access</Button></DialogActions></Dialog>;
}
