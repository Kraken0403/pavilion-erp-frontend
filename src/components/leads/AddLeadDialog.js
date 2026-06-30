import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem
} from '@mui/material';

import { addLead } from '../../services/leadService';
import { getAllCustomFields } from '../../services/customFieldServices';
import WgiymEditor from '../ui/WgiymEditor';

function AddLeadDialog({ open, onClose, onLeadCreated, prefillName }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    lead_status: '',
    email: '',
    phone_number: '',
    contact_name: '',
    follow_up_date: '',
    priority: '',
    notes: '',
    assigned_salesperson: '',
    hotness: '',
    amount: ''
  });

  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});

  useEffect(() => {
    if (prefillName) {
      const [firstName, ...rest] = prefillName.split(" ");
      setForm(prev => ({
        ...prev,
        first_name: firstName,
        last_name: rest.join(" ")
      }));
    }
  }, [prefillName]);

  useEffect(() => {
    loadCustomFields();
  }, []);

  const loadCustomFields = async () => {
    try {
      const fields = await getAllCustomFields();
      setCustomFields(fields);
    } catch (err) {
      console.error("❌ Failed loading custom fields", err);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomValue = (fieldId, value) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        custom_fields: Object.entries(customValues).map(([field_id, field_value]) => ({
          field_id,
          field_value
        }))
      };

      const created = await addLead(payload);
      const leadId = created?.leadId || created?.id || created?.data?.id;
      const newLead = {
        id: leadId,
        ...form,
        lead_status: form.lead_status || 'new',
        priority: form.priority || 'medium',
      };
      onLeadCreated(newLead);
      onClose();
    } catch (err) {
      console.error("❌ Failed to add lead:", err);
      alert("Failed to create lead");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ className: "flowbite-card" }}>
      <DialogTitle className="dialog-title">Add New Lead</DialogTitle>

      <DialogContent dividers className="dialog-content">
        <Grid container spacing={2}>

          <Grid item xs={6}>
            <TextField className="form-input" label="First Name" fullWidth
              value={form.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Last Name" fullWidth
              value={form.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Company Name" fullWidth
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Email" fullWidth
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Phone Number" fullWidth
              value={form.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Lead Status" fullWidth
              value={form.lead_status}
              onChange={(e) => handleChange('lead_status', e.target.value)}
              select
            >
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="contacted">Contacted</MenuItem>
              <MenuItem value="qualified">Qualified</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6}>
            <TextField
              className="form-input"
              label="Follow Up Date"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.follow_up_date}
              onChange={(e) => handleChange('follow_up_date', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField className="form-input" label="Priority" fullWidth
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <label className="field-label">Notes</label>
            <WgiymEditor value={form.notes || ''} onChange={(value) => handleChange('notes', value)} />
          </Grid>

          {/* Custom Fields */}
          {customFields.map((field, i) => {
            const fieldId = field.field_id || field.id;
            return (
              <Grid item xs={6} key={fieldId || i}>
                <TextField
                  className="form-input"
                  label={field.field_name}
                  fullWidth
                  onChange={(e) => handleCustomValue(fieldId, e.target.value)}
                />
              </Grid>
            );
          })}

        </Grid>
      </DialogContent>

      <DialogActions className="dialog-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="save-btn-x" onClick={handleSubmit}>Save Lead</button>
      </DialogActions>
    </Dialog>
  );
}

export default AddLeadDialog;
