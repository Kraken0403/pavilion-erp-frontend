import React, { useEffect, useState } from 'react';
import { Add, Close } from '@mui/icons-material';
import { Drawer, IconButton } from '@mui/material';
import ActivitiesTab from './leads/ActivitiesTab';
import NotesTab from './leads/NotesTab';
import FilesTab from './leads/FilesTab';
import WgiymEditor from './ui/WgiymEditor';
import FormattedDateInput from './ui/FormattedDateInput';
import { getAllCustomFields } from '../services/customFieldServices';
import { getAllUsers } from '../services/userServices';
import { createCompany, getCompanies } from '../services/companyService';
import '../assets/styles/EditForm.scss';

const states = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
const blankCompany = { name:'', gst_number:'', email:'', phone:'', website:'', billing_address:'', billing_city:'', billing_state:'', billing_pincode:'', shipping_address:'', shipping_city:'', shipping_state:'', shipping_pincode:'', company_type:'CUSTOMER' };
const contactTabs = ['Contact details','Company details','Lead details','Assignment'];

const Field = ({ label, children, wide = false }) => <label className={wide ? 'lead-field lead-field--wide' : 'lead-field'}><span>{label}</span>{children}</label>;
const Input = ({ label, name, value, onChange, type='text', ...props }) => <Field label={label}><input type={type} name={name} value={value ?? ''} onChange={onChange} {...props} /></Field>;
const Select = ({ label, name, value, onChange, options, allowBlank = true }) => <Field label={label}><select name={name} value={value ?? ''} onChange={onChange}>{allowBlank && <option value="">Select an option</option>}{options.map((option) => <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>{typeof option === 'string' ? option : option.label}</option>)}</select></Field>;

export default function EditForm({ leadData, handleChange, handleSubmit, activeTab, handleCustomFieldsUpdate }) {
  const [formTab, setFormTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [companyDrawer, setCompanyDrawer] = useState(false);
  const [companyForm, setCompanyForm] = useState(blankCompany);

  useEffect(() => {
    Promise.all([getAllUsers(), getCompanies('CUSTOMER'), getAllCustomFields()]).then(([userRows, companyRows, fieldRows]) => {
      setUsers(userRows || []); setCompanies(companyRows || []); setCustomFields(fieldRows || []);
    }).catch((error) => console.error('Unable to load contact form options', error));
  }, []);
  useEffect(() => {
    const next = {}; (leadData.custom_fields || []).forEach((field) => { next[field.field_id] = field.field_value || ''; }); setCustomValues(next);
  }, [leadData.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (name, value) => handleChange({ target:{ name, value } });
  const updateCustom = (fieldId, value) => {
    const next = { ...customValues, [fieldId]:value }; setCustomValues(next);
    handleCustomFieldsUpdate(Object.entries(next).map(([field_id, field_value]) => ({ field_id:Number(field_id), field_value })));
  };
  const selectCompany = (id) => {
    const company = companies.find((item) => String(item.id) === String(id)); change('company_id', id); change('company_name', company?.name || '');
    if (company && !leadData.gst_number) change('gst_number', company.gst_number || '');
  };
  const saveCompany = async (event) => {
    event.preventDefault(); const company = await createCompany(companyForm); setCompanies((current) => [...current, company]); change('company_id', company.id); change('company_name', company.name); if (!leadData.gst_number) change('gst_number', company.gst_number || ''); setCompanyDrawer(false); setCompanyForm(blankCompany);
  };
  if (activeTab === 'activities') return <ActivitiesTab leadId={leadData.id} />;
  if (activeTab === 'notes') return <NotesTab leadId={leadData.id} />;
  if (activeTab === 'files') return <FilesTab leadId={leadData.id} />;

  return <>
    <form className="contact-editor" onSubmit={handleSubmit}>
      <nav>{contactTabs.map((tab, index) => <button type="button" className={formTab === index ? 'is-active' : ''} onClick={() => setFormTab(index)} key={tab}>{index + 1}. {tab}</button>)}</nav>
      <div className="contact-editor__body">
        {formTab === 0 && <section><h3>Contact details</h3><p>The individual can be saved without a company.</p><div className="lead-form-grid"><Input label="First name *" name="first_name" value={leadData.first_name} onChange={handleChange} required /><Input label="Last name" name="last_name" value={leadData.last_name} onChange={handleChange} /><Input label="Email" name="email" type="email" value={leadData.email} onChange={handleChange} /><Input label="Phone number" name="phone_number" type="tel" value={leadData.phone_number} onChange={handleChange} /><Input label="Designation" name="designation" value={leadData.designation} onChange={handleChange} /><Input label="GST number" name="gst_number" value={leadData.gst_number} onChange={handleChange} /></div><h4>Personal billing address</h4><div className="lead-form-grid"><Input label="Address" name="billing_address" value={leadData.billing_address} onChange={handleChange} /><Input label="City" name="billing_city" value={leadData.billing_city} onChange={handleChange} /><Select label="State" name="billing_state" value={leadData.billing_state} onChange={handleChange} options={states} /><Input label="PIN code" name="billing_pincode" value={leadData.billing_pincode} onChange={handleChange} /></div><h4>Personal shipping address</h4><div className="lead-form-grid"><Input label="Address" name="shipping_address" value={leadData.shipping_address} onChange={handleChange} /><Input label="City" name="shipping_city" value={leadData.shipping_city} onChange={handleChange} /><Select label="State" name="shipping_state" value={leadData.shipping_state} onChange={handleChange} options={states} /><Input label="PIN code" name="shipping_pincode" value={leadData.shipping_pincode} onChange={handleChange} /></div></section>}
        {formTab === 1 && <section><div className="contact-editor__section-head"><div><h3>Company details</h3><p>Choose an existing customer company or create one here.</p></div><button type="button" onClick={() => setCompanyDrawer(true)}><Add />Create company</button></div><div className="lead-form-grid"><Select label="Company" name="company_id" value={leadData.company_id} onChange={(event) => selectCompany(event.target.value)} options={companies.map((company) => ({ value:company.id, label:company.name }))} /><Input label="Company name" name="company_name" value={leadData.company_name} onChange={handleChange} /></div>{leadData.company_id && (() => { const company=companies.find((item) => String(item.id)===String(leadData.company_id)); return company ? <div className="selected-company"><strong>{company.name}</strong><span>{company.gst_number || 'No GST number'}</span><span>{company.billing_address || company.registered_address || 'No billing address'}</span><span>{company.shipping_address || company.registered_address || 'No shipping address'}</span></div> : null; })()}</section>}
        {formTab === 2 && <section><h3>Lead details</h3><div className="lead-form-grid"><Select label="Status" name="lead_status" value={leadData.lead_status} onChange={handleChange} options={['new','in-progress','qualified','won','lost']} allowBlank={false} /><Input label="Contact name" name="contact_name" value={leadData.contact_name} onChange={handleChange} /><Field label="Follow-up date"><FormattedDateInput name="follow_up_date" includeTime value={leadData.follow_up_date} onChange={handleChange} /></Field><Select label="Priority" name="priority" value={leadData.priority} onChange={handleChange} options={['low','medium','high']} allowBlank={false} /></div><Field label="Notes" wide><WgiymEditor value={leadData.notes || ''} onChange={(value) => change('notes', value)} placeholder="Add notes about this contact" /></Field><h4>Custom fields</h4><div className="lead-form-grid">{customFields.map((field) => { const id=field.field_id || field.id; return field.field_type === 'select' ? <Select key={id} label={field.field_name} value={customValues[id]} onChange={(event) => updateCustom(id,event.target.value)} options={field.options || []} /> : <Input key={id} label={field.field_name} value={customValues[id]} onChange={(event) => updateCustom(id,event.target.value)} type={field.field_type === 'number' ? 'number' : 'text'} />; })}</div></section>}
        {formTab === 3 && <section><h3>Assignment and value</h3><div className="lead-form-grid"><Select label="Assigned salesperson" name="assigned_salesperson" value={leadData.assigned_salesperson} onChange={handleChange} options={users.map((user) => ({ value:user.id, label:user.name || user.email }))} /><Select label="Hotness" name="hotness" value={leadData.hotness} onChange={handleChange} options={[1,2,3,4,5].map((value) => ({ value, label:`${value} / 5` }))} /><Input label="Expected revenue" name="amount" type="number" min="0" step="0.01" value={leadData.amount} onChange={handleChange} /><Select label="Source" name="source" value={leadData.source} onChange={handleChange} options={['CRM','Website','Referral','Social media','Walk-in','Other']} /></div></section>}
      </div>
      <footer><button type="button" onClick={() => setFormTab(Math.max(0, formTab - 1))} disabled={!formTab}>Back</button><span />{formTab < contactTabs.length - 1 ? <button type="button" className="primary" onClick={() => setFormTab(formTab + 1)}>Next</button> : <button type="submit" className="primary">{leadData.id ? 'Save changes' : 'Create contact'}</button>}</footer>
    </form>
    <Drawer anchor="right" open={companyDrawer} onClose={() => setCompanyDrawer(false)} PaperProps={{ className:'inline-company-drawer' }}><header><h2>Create company</h2><IconButton onClick={() => setCompanyDrawer(false)}><Close /></IconButton></header><form onSubmit={saveCompany}><div><Input label="Company name *" value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name:event.target.value }))} required /><Input label="GST number" value={companyForm.gst_number} onChange={(event) => setCompanyForm((current) => ({ ...current, gst_number:event.target.value }))} /><Input label="Email" type="email" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email:event.target.value }))} /><Input label="Phone" value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone:event.target.value }))} /><Input label="Billing address" value={companyForm.billing_address} onChange={(event) => setCompanyForm((current) => ({ ...current, billing_address:event.target.value }))} /><Select label="Billing state" value={companyForm.billing_state} onChange={(event) => setCompanyForm((current) => ({ ...current, billing_state:event.target.value }))} options={states} /><Input label="Shipping address" value={companyForm.shipping_address} onChange={(event) => setCompanyForm((current) => ({ ...current, shipping_address:event.target.value }))} /><Select label="Shipping state" value={companyForm.shipping_state} onChange={(event) => setCompanyForm((current) => ({ ...current, shipping_state:event.target.value }))} options={states} /></div><footer><button type="button" onClick={() => setCompanyDrawer(false)}>Cancel</button><button className="primary">Create and select</button></footer></form></Drawer>
  </>;
}

