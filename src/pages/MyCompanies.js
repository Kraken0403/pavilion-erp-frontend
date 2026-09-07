import React, { useEffect, useMemo, useState } from 'react';
import { AddBusinessOutlined, Close, DeleteOutline } from '@mui/icons-material';
import { Alert, Drawer, IconButton, Snackbar, Switch } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HubSpotListing from '../components/ui/HubSpotListing';
import FileUploader from '../components/ui/FileUploader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { createCompany, deleteCompany, getCompanies, getCompanyById, updateCompany } from '../services/companyService';
import '../assets/styles/MyCompanies.scss';

const states = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const empty = { name:'', legal_name:'', company_type:'ISSUING', logo_url:'', gst_number:'', pan_number:'', email:'', phone:'', website:'', registered_address:'', registered_city:'', registered_state:'', registered_pincode:'', billing_address:'', billing_city:'', billing_state:'', billing_pincode:'', shipping_address:'', shipping_city:'', shipping_state:'', shipping_pincode:'' };
const fields = [{ key:'name', label:'Company name' },{ key:'legal_name', label:'Legal name' },{ key:'gst_number', label:'GST number' },{ key:'email', label:'Email' },{ key:'phone', label:'Phone' },{ key:'registered_state', label:'Registered state' },{ key:'updated_at', label:'Updated' }];
const addressKeys = ['address', 'city', 'state', 'pincode'];

function Field({ label, required = false, children }) {
  return <label><span>{label}{required && <b className="company-required">*</b>}</span>{children}</label>;
}

function AddressFields({ prefix, form, setField, disabled = false }) {
  return <div className={`company-address-grid ${disabled ? 'is-disabled' : ''}`}>
    <Field label="Address"><textarea rows="3" disabled={disabled} value={form[`${prefix}_address`] || ''} onChange={(e) => setField(`${prefix}_address`, e.target.value)} /></Field>
    <div className="company-form-grid">
      <Field label="City"><input disabled={disabled} value={form[`${prefix}_city`] || ''} onChange={(e) => setField(`${prefix}_city`, e.target.value)} /></Field>
      <Field label="State"><select disabled={disabled} value={form[`${prefix}_state`] || ''} onChange={(e) => setField(`${prefix}_state`, e.target.value)}><option value="">Select state</option>{states.map((state) => <option key={state}>{state}</option>)}</select></Field>
      <Field label="PIN code"><input disabled={disabled} inputMode="numeric" value={form[`${prefix}_pincode`] || ''} onChange={(e) => setField(`${prefix}_pincode`, e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>
    </div>
  </div>;
}

export default function MyCompanies({ scope = 'ISSUING', title = 'My companies' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(empty);
  const [tab, setTab] = useState('details');
  const [billingSame, setBillingSame] = useState(false);
  const [shippingSame, setShippingSame] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState({ open:false, message:'', severity:'success' });

  const load = async () => setCompanies(await getCompanies(scope));
  useEffect(() => { load().catch(() => setNotice({ open:true, message:'Unable to load companies.', severity:'error' })); }, [scope]);

  const openCreate = () => { setForm({ ...empty, company_type: scope }); setTab('details'); setBillingSame(false); setShippingSame(false); setDrawer('create'); };
  const openEdit = (company) => {
    const next = { ...empty, ...company };
    setForm(next);
    setBillingSame(addressKeys.every((key) => String(next[`billing_${key}`] || '') === String(next[`registered_${key}`] || '')));
    setShippingSame(addressKeys.every((key) => String(next[`shipping_${key}`] || '') === String(next[`registered_${key}`] || '')));
    setTab('details');
    setDrawer(company);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') { openCreate(); return; }
    const editId = params.get('edit');
    if (!editId) return;
    const cached = companies.find((company) => String(company.id) === String(editId));
    if (cached) { openEdit(cached); return; }
    getCompanyById(editId).then(openEdit).catch(() => setNotice({ open:true, message:'Unable to load company.', severity:'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, companies.length]);

  const setField = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (key.startsWith('registered_')) {
      const suffix = key.replace('registered_', '');
      if (billingSame) next[`billing_${suffix}`] = value;
      if (shippingSame) next[`shipping_${suffix}`] = value;
    }
    return next;
  });

  const setSameAsRegistered = (prefix, checked) => {
    if (prefix === 'billing') setBillingSame(checked); else setShippingSame(checked);
    if (!checked) return;
    setForm((current) => {
      const next = { ...current };
      addressKeys.forEach((key) => { next[`${prefix}_${key}`] = current[`registered_${key}`] || ''; });
      return next;
    });
  };

  const closeDrawer = () => {
    setDrawer(null);
    setConfirmDelete(false);
    if (new URLSearchParams(location.search).has('create') || new URLSearchParams(location.search).has('edit')) navigate(location.pathname, { replace: true });
  };

  const payload = useMemo(() => {
    const next = { ...form, company_type: scope };
    if (billingSame) addressKeys.forEach((key) => { next[`billing_${key}`] = next[`registered_${key}`] || ''; });
    if (shippingSame) addressKeys.forEach((key) => { next[`shipping_${key}`] = next[`registered_${key}`] || ''; });
    return next;
  }, [form, scope, billingSame, shippingSame]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const saved = drawer === 'create' ? await createCompany(payload) : await updateCompany(drawer.id, payload);
      await load(); closeDrawer(); setNotice({ open:true, message:`${saved.name || form.name} saved.`, severity:'success' });
    } catch (error) { setNotice({ open:true, message:error.response?.data?.error || 'Unable to save company.', severity:'error' }); }
  };

  const remove = async () => {
    if (!drawer?.id || deleting) return;
    setDeleting(true);
    try { await deleteCompany(drawer.id); await load(); closeDrawer(); setNotice({ open:true, message:'Company deleted.', severity:'success' }); }
    catch (error) { setNotice({ open:true, message:error.response?.data?.error || 'Unable to delete company.', severity:'error' }); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  return <>
    <HubSpotListing
      title={title}
      createLabel="Add company"
      createIcon={<AddBusinessOutlined />}
      rows={companies}
      initialFields={fields}
      onCreate={openCreate}
      onRowOpen={(company) => navigate(`/companies/${company.id}`)}
      onUpdateRow={openEdit}
      onRefresh={load}
    />

    <Drawer anchor="right" open={Boolean(drawer)} onClose={closeDrawer} PaperProps={{ className:'company-form-drawer erp-standard-drawer' }}>
      <header><div><h2>{drawer === 'create' ? 'Add company' : 'Edit company'}</h2><p>Keep company identity, tax and address details in one place.</p></div><IconButton onClick={closeDrawer}><Close /></IconButton></header>
      <nav className="company-form-tabs"><button type="button" className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Company details</button><button type="button" className={tab === 'addresses' ? 'active' : ''} onClick={() => setTab('addresses')}>Addresses</button></nav>
      <form onSubmit={save}>
        <div className="company-form-body">
          {tab === 'details' && <section>
            <div className="company-form-grid">
              <Field label="Company name" required><input required value={form.name} onChange={(e) => setField('name', e.target.value)} /></Field>
              <Field label="Registered legal name"><input value={form.legal_name} onChange={(e) => setField('legal_name', e.target.value)} /></Field>
              <Field label="GST number"><input value={form.gst_number} onChange={(e) => setField('gst_number', e.target.value.toUpperCase())} /></Field>
              <Field label="PAN number"><input value={form.pan_number} onChange={(e) => setField('pan_number', e.target.value.toUpperCase())} /></Field>
              <Field label="Company email"><input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></Field>
              <Field label="Phone number"><input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></Field>
              <Field label="Website"><input type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} /></Field>
            </div>
            <div className="company-logo-field"><FileUploader label="Company logo" fileUrl={form.logo_url} onFileUploaded={(url) => setField('logo_url', url)} /></div>
          </section>}

          {tab === 'addresses' && <>
            <section><h3>Registered address</h3><AddressFields prefix="registered" form={form} setField={setField} /></section>
            <section><div className="company-section-heading"><h3>Billing address</h3><label className="company-same-toggle"><Switch size="small" checked={billingSame} onChange={(event) => setSameAsRegistered('billing', event.target.checked)} /><span>Same as registered address</span></label></div><AddressFields prefix="billing" form={form} setField={setField} disabled={billingSame} /></section>
            <section><div className="company-section-heading"><h3>Shipping address</h3><label className="company-same-toggle"><Switch size="small" checked={shippingSame} onChange={(event) => setSameAsRegistered('shipping', event.target.checked)} /><span>Same as registered address</span></label></div><AddressFields prefix="shipping" form={form} setField={setField} disabled={shippingSame} /></section>
          </>}
        </div>
        <footer>{drawer !== 'create' && <button type="button" className="danger" onClick={() => setConfirmDelete(true)}><DeleteOutline />Delete</button>}<span /><button type="button" onClick={closeDrawer}>Cancel</button><button type="submit" className="primary">{drawer === 'create' ? 'Create company' : 'Save changes'}</button></footer>
      </form>
    </Drawer>

    <ConfirmDialog open={confirmDelete} title="Delete company" message={`Delete ${form.name || 'this company'}? This action cannot be undone.`} confirmText="Delete company" loading={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={remove} />
    <Snackbar open={notice.open} autoHideDuration={4500} onClose={() => setNotice((current) => ({ ...current, open:false }))}><Alert severity={notice.severity}>{notice.message}</Alert></Snackbar>
  </>;
}
