import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WgiymEditor from '../ui/WgiymEditor';
import { createVendor, updateVendor } from '../../services/vendorService';

const blankVendor = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  alternate_phone: '',
  gst_number: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  brands: '',
  payment_terms: '',
  credit_days: 0,
  opening_balance: 0,
  notes: '',
};

function VendorFormDialog({ open, onClose, vendor = null, onSaved }) {
  const [form, setForm] = useState(blankVendor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(vendor ? { ...blankVendor, ...vendor } : blankVendor);
  }, [open, vendor]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('Vendor name is required');
      return;
    }

    setSaving(true);
    try {
      const saved = vendor?.id
        ? await updateVendor(vendor.id, form)
        : await createVendor(form);
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      alert(error?.response?.data?.error || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog className="flowbite-dialog" open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="dialog-title">
        {vendor?.id ? 'Edit Vendor' : 'Add Vendor'}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent className="dialog-content">
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">Vendor Name</Typography>
            <TextField className="form-input" fullWidth value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">Contact Person</Typography>
            <TextField className="form-input" fullWidth value={form.contact_person || ''} onChange={(e) => setField('contact_person', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">Email</Typography>
            <TextField className="form-input" fullWidth type="email" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">Phone</Typography>
            <TextField className="form-input" fullWidth value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">Alternate Phone</Typography>
            <TextField className="form-input" fullWidth value={form.alternate_phone || ''} onChange={(e) => setField('alternate_phone', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">GST Number</Typography>
            <TextField className="form-input" fullWidth value={form.gst_number || ''} onChange={(e) => setField('gst_number', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography className="field-label">Brands They Provide</Typography>
            <TextField className="form-input" fullWidth placeholder="M&K Sound, Sony, Epson..." value={form.brands || ''} onChange={(e) => setField('brands', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography className="field-label">Credit Days</Typography>
            <TextField className="form-input" fullWidth type="number" value={form.credit_days || 0} onChange={(e) => setField('credit_days', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography className="field-label">Opening Balance</Typography>
            <TextField className="form-input" fullWidth type="number" value={form.opening_balance || 0} onChange={(e) => setField('opening_balance', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography className="field-label">Pincode</Typography>
            <TextField className="form-input" fullWidth value={form.pincode || ''} onChange={(e) => setField('pincode', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">City</Typography>
            <TextField className="form-input" fullWidth value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography className="field-label">State</Typography>
            <TextField className="form-input" fullWidth value={form.state || ''} onChange={(e) => setField('state', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography className="field-label">Address</Typography>
            <TextField className="form-input" fullWidth multiline minRows={2} value={form.address || ''} onChange={(e) => setField('address', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography className="field-label">Payment Terms</Typography>
            <WgiymEditor value={form.payment_terms || ''} onChange={(value) => setField('payment_terms', value)} />
          </Grid>
          <Grid item xs={12}>
            <Typography className="field-label">Notes</Typography>
            <TextField className="form-input" fullWidth multiline minRows={2} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions className="dialog-actions">
        <button className="cancel-btn" onClick={onClose}>Cancel</button>
        <button className="save-btn-x" disabled={saving} onClick={handleSubmit}>{saving ? 'Saving...' : 'Save Vendor'}</button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorFormDialog;
