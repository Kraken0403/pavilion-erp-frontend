import React, { useEffect, useState } from 'react';
import { createCompany } from '../../services/companyService';
import NotificationSnackbar from '../ui/NotificationSnackbar';
import EntityFormDrawer from '../ui/EntityFormDrawer';
import '../../assets/styles/EditForm.scss';

const emptyCompany = {
  name: '',
  email: '',
  phone: '',
  gst_number: '',
  pan_number: '',
  website: '',
  registered_address: '',
};

const Field = ({ label, required = false, wide = false, children }) => (
  <label className={wide ? 'lead-field lead-field--wide' : 'lead-field'}>
    <span>{label}{required && <b className="lead-field__required">*</b>}</span>
    {children}
  </label>
);

function AddCompanyDialog({ open, onClose, onCompanyCreated, prefillName = '' }) {
  const [form, setForm] = useState(emptyCompany);
  const [formTab, setFormTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyCompany, name: prefillName || '' });
    setFormTab(0);
  }, [open, prefillName]);

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormTab(0);
      return showNotification('Company name is required', 'warning');
    }

    try {
      setSaving(true);
      const company = await createCompany({
        company_type: 'CUSTOMER',
        ...form,
        name: form.name.trim(),
      });
      onCompanyCreated?.({
        ...company,
        id: company.id || company.companyId,
        name: company.name || form.name.trim(),
        email: company.email || form.email,
        phone: company.phone || form.phone,
      });
      showNotification('Company added successfully!');
      onClose();
    } catch (err) {
      console.error('❌ Failed to create company:', err);
      showNotification(err.response?.data?.error || 'Failed to create company.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EntityFormDrawer open={open} title="Add company" onClose={onClose}>
        <form className="contact-editor quick-company-editor" onSubmit={handleSubmit}>
          <nav>
            <button type="button" className={formTab === 0 ? 'is-active' : ''} onClick={() => setFormTab(0)}>1. Company details</button>
            <button type="button" className={formTab === 1 ? 'is-active' : ''} onClick={() => setFormTab(1)}>2. Address</button>
          </nav>

          <div className="contact-editor__body">
            {formTab === 0 && (
              <section>
                <h3>Company details</h3>
                <p>Add the company identity and tax information.</p>
                <div className="lead-form-grid">
                  <Field label="Company name" required><input required value={form.name} onChange={(e) => setField('name', e.target.value)} /></Field>
                  <Field label="Email"><input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></Field>
                  <Field label="Phone"><input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
                  <Field label="Website"><input type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} /></Field>
                  <Field label="GST number"><input value={form.gst_number} onChange={(e) => setField('gst_number', e.target.value.toUpperCase())} /></Field>
                  <Field label="PAN number"><input value={form.pan_number} onChange={(e) => setField('pan_number', e.target.value.toUpperCase())} /></Field>
                </div>
              </section>
            )}

            {formTab === 1 && (
              <section>
                <h3>Registered address</h3>
                <p>This address will be available when the company is selected in business documents.</p>
                <Field label="Address" wide><textarea rows="6" value={form.registered_address} onChange={(e) => setField('registered_address', e.target.value)} /></Field>
              </section>
            )}
          </div>

          <footer>
            <button type="button" onClick={() => formTab === 0 ? onClose() : setFormTab(0)}>{formTab === 0 ? 'Cancel' : 'Back'}</button>
            <span />
            {formTab === 0
              ? <button type="button" className="primary" onClick={() => setFormTab(1)}>Next</button>
              : <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Add company'}</button>}
          </footer>
        </form>
      </EntityFormDrawer>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

export default AddCompanyDialog;
