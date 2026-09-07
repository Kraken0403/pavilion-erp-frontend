import React, { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { addLead } from '../../services/leadService';
import EntityFormDrawer from '../ui/EntityFormDrawer';
import EditForm from '../EditForm';

const initial = { first_name:'', last_name:'', email:'', phone_number:'', designation:'', company_id:'', company_name:'', gst_number:'', billing_address:'', billing_city:'', billing_state:'', billing_pincode:'', shipping_address:'', shipping_city:'', shipping_state:'', shipping_pincode:'', lead_status:'new', contact_name:'', follow_up_date:'', priority:'medium', notes:'', assigned_salesperson:'', hotness:1, amount:0, source:'CRM', custom_fields:[] };

export default function AddLeadDialog({ open, onClose, onLeadCreated, prefillName }) {
  const [form, setForm] = useState(initial);
  const [customFields, setCustomFields] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const [firstName='', ...rest] = String(prefillName || '').split(' ');
    setForm({ ...initial, first_name:firstName, last_name:rest.join(' ') }); setCustomFields([]); setError('');
  }, [open, prefillName]);
  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]:event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await addLead({ ...form, custom_fields:customFields });
      const created = { ...form, id:result?.leadId || result?.id || result?.data?.id, custom_fields:customFields };
      onLeadCreated?.(created); onClose?.();
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to create contact.'); }
  };
  return <><EntityFormDrawer open={open} title="Create contact" onClose={onClose}><EditForm leadData={form} handleChange={handleChange} handleSubmit={submit} activeTab="leadDetails" customFields={customFields} handleCustomFieldsUpdate={setCustomFields} /></EntityFormDrawer><Snackbar open={Boolean(error)} autoHideDuration={4500} onClose={() => setError('')}><Alert severity="error">{error}</Alert></Snackbar></>;
}
