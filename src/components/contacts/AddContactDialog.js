import React, { useEffect, useState } from 'react';
import { createContact } from '../../services/contactService';
import CompanyAutocomplete from '../company/CompanyAutocomplete';
import AddCompanyDialog from '../company/AddCompanyDialog';
import NotificationSnackbar from '../ui/NotificationSnackbar';
import EntityFormDrawer from '../ui/EntityFormDrawer';
import '../../assets/styles/EditForm.scss';

const emptyContact = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
};

const Field = ({ label, required = false, wide = false, children }) => (
  <label className={wide ? 'lead-field lead-field--wide' : 'lead-field'}>
    <span>{label}{required && <b className="lead-field__required">*</b>}</span>
    {children}
  </label>
);

function AddContactDialog({ open, onClose, onContactCreated, prefillName = '' }) {
  const [form, setForm] = useState(emptyContact);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [openAddCompany, setOpenAddCompany] = useState(false);
  const [companyPrefill, setCompanyPrefill] = useState('');
  const [formTab, setFormTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) return;
    const words = typeof prefillName === 'string' ? prefillName.trim().split(/\s+/).filter(Boolean) : [];
    setForm({ ...emptyContact, first_name: words[0] || '', last_name: words.slice(1).join(' ') });
    setSelectedCompany(null);
    setFormTab(0);
  }, [open, prefillName]);

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormTab(0);
      return showNotification('First and Last name are required', 'warning');
    }

    try {
      setSaving(true);
      const contact = await createContact({
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_id: selectedCompany?.id || null,
      });

      onContactCreated?.({
        id: contact.contactId || contact.id,
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company_name: selectedCompany?.name || '',
      });
      showNotification('Contact added successfully!');
      onClose();
    } catch (err) {
      console.error('❌ Failed to create contact:', err);
      showNotification(err.response?.data?.error || 'Failed to create contact', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EntityFormDrawer open={open} title="Add contact" onClose={onClose}>
        <form className="contact-editor quick-contact-editor" onSubmit={handleSubmit}>
          <nav>
            <button type="button" className={formTab === 0 ? 'is-active' : ''} onClick={() => setFormTab(0)}>1. Contact details</button>
            <button type="button" className={formTab === 1 ? 'is-active' : ''} onClick={() => setFormTab(1)}>2. Company</button>
          </nav>

          <div className="contact-editor__body">
            {formTab === 0 && (
              <section>
                <h3>Contact details</h3>
                <p>Add the contact information used on quotations and customer records.</p>
                <div className="lead-form-grid">
                  <Field label="First name" required><input required value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} /></Field>
                  <Field label="Last name" required><input required value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} /></Field>
                  <Field label="Email"><input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></Field>
                  <Field label="Phone"><input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
                </div>
                <Field label="Address" wide><textarea rows="4" value={form.address} onChange={(e) => setField('address', e.target.value)} /></Field>
              </section>
            )}

            {formTab === 1 && (
              <section>
                <div className="contact-editor__section-head">
                  <div><h3>Company</h3><p>Link this contact to an existing company or create a new one.</p></div>
                </div>
                <Field label="Linked company" wide>
                  <div className="quick-entity-autocomplete">
                    <CompanyAutocomplete
                      value={selectedCompany}
                      onChange={setSelectedCompany}
                      onAddCompany={(name) => {
                        setCompanyPrefill(name || '');
                        setOpenAddCompany(true);
                      }}
                    />
                  </div>
                </Field>
                {selectedCompany && (
                  <div className="selected-company">
                    <strong>{selectedCompany.name}</strong>
                    <span>{selectedCompany.email || 'No company email'}</span>
                    <span>{selectedCompany.phone || 'No company phone'}</span>
                  </div>
                )}
              </section>
            )}
          </div>

          <footer>
            <button type="button" onClick={() => formTab === 0 ? onClose() : setFormTab(0)}>{formTab === 0 ? 'Cancel' : 'Back'}</button>
            <span />
            {formTab === 0
              ? <button type="button" className="primary" onClick={() => setFormTab(1)}>Next</button>
              : <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Add contact'}</button>}
          </footer>
        </form>
      </EntityFormDrawer>

      <AddCompanyDialog
        open={openAddCompany}
        onClose={() => setOpenAddCompany(false)}
        onCompanyCreated={(company) => {
          setSelectedCompany(company);
          setOpenAddCompany(false);
          showNotification('Company added successfully!');
        }}
        prefillName={companyPrefill}
      />

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

export default AddContactDialog;
