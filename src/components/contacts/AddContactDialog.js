import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Button
} from '@mui/material';
import { createContact } from '../../services/contactService';
import CompanyAutocomplete from '../company/CompanyAutocomplete';
import AddCompanyDialog from '../company/AddCompanyDialog';
import NotificationSnackbar from '../ui/NotificationSnackbar';

function AddContactDialog({ open, onClose, onContactCreated, prefillName = '' }) {
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [openAddCompany, setOpenAddCompany] = useState(false);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (open && typeof prefillName === 'string') {
      const words = prefillName.trim().split(' ');
      setFirstName(words[0] || '');
      setLastName(words.slice(1).join(' ') || '');
    }
  }, [open, prefillName]);

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const handleSubmit = async () => {
    if (!first_name.trim() || !last_name.trim()) {
      return showNotification('First and Last name are required', 'warning');
    }

    try {
      const contact = await createContact({
        first_name,
        last_name,
        email,
        phone,
        address,
        company_id: selectedCompany?.id || null
      });

      const newContact = {
        id: contact.contactId,
        first_name,
        last_name,
        email,
        phone,
        company_name: selectedCompany?.name || ''
      };

      onContactCreated(newContact);
      showNotification('✅ Contact added successfully!');
      onClose();
    } catch (err) {
      console.error('❌ Failed to create contact:', err);
      showNotification('❌ Failed to create contact', 'error');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={6}>
              <TextField
                label="First Name"
                fullWidth
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <CompanyAutocomplete
                value={selectedCompany}
                onChange={setSelectedCompany}
                onAddCompany={(name) => {
                  setOpenAddCompany(true);
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Phone"
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Address"
                fullWidth
                multiline
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Add Contact</Button>
        </DialogActions>
      </Dialog>

      <AddCompanyDialog
        open={openAddCompany}
        onClose={() => setOpenAddCompany(false)}
        onCompanyCreated={(company) => {
          setSelectedCompany(company);
          setOpenAddCompany(false);
          showNotification('✅ Company added successfully!');
        }}
        prefillName=""
      />

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </>
  );
}

export default AddContactDialog;
