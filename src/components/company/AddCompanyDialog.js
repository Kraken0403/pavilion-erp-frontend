import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Button
} from '@mui/material';
import { createCompany } from '../../services/companyService';
import NotificationSnackbar from '../ui/NotificationSnackbar';

function AddCompanyDialog({ open, onClose, onCompanyCreated, prefillName = '' }) {
  const [name, setName] = useState(prefillName || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gst, setGst] = useState('');
  const [pan, setPan] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showNotification('Company name is required', 'warning');
      return;
    }
    try {
      const company = await createCompany({
        name,
        email,
        phone,
        gst_number: gst,
        pan_number: pan,
        website,
        address
      });
      onCompanyCreated({ id: company.companyId, name });
      showNotification('✅ Company added successfully!');
      onClose();
    } catch (err) {
      console.error('❌ Failed to create company:', err);
      showNotification('❌ Failed to create company.', 'error');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Add Company</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12}>
              <TextField label="Company Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Phone" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="GST Number" fullWidth value={gst} onChange={(e) => setGst(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="PAN Number" fullWidth value={pan} onChange={(e) => setPan(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Website" fullWidth value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" fullWidth multiline rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Add Company</Button>
        </DialogActions>
      </Dialog>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </>
  );
}

export default AddCompanyDialog;
