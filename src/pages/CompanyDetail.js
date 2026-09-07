import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Add, EditOutlined } from '@mui/icons-material';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import { getCompanyById, updateCompany } from '../services/companyService';
import { createActivity } from '../services/activityService';
import { resolveBackendAssetUrl } from '../services/api';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

function ContactList({ contacts }) {
  return <div className="record-quotation-list">{contacts.length ? contacts.slice(0, 10).map((contact) => <Link className="record-quotation-row" to={`/leads/${contact.id}`} key={contact.id}><strong>{`${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.contact_name || `Contact #${contact.id}`}</strong><span><em>{contact.designation || contact.lead_status || 'Contact'}</em><b>{contact.email || contact.phone_number || ''}</b></span></Link>) : <p className="record-empty">No contacts are linked to this company.</p>}</div>;
}

function QuotationList({ quotations }) {
  const [query, setQuery] = useState('');
  const rows = quotations.filter((quotation) => `${quotation.quotation_number || ''} ${quotation.lead_name || ''} ${quotation.status || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="record-card-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quotations" /></div><div className="record-quotation-list">{rows.length ? rows.slice(0, 10).map((quotation) => <Link className="record-quotation-row" to={`/quotations/${quotation.id}`} key={quotation.id}><strong>{quotation.quotation_number || `Quotation #${quotation.id}`}</strong><span><em>{quotation.lead_name || quotation.status || ''}</em><b>{money(quotation.total_amount)}</b></span></Link>) : <p className="record-empty">No quotations found.</p>}</div></>;
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setCompany(await getCompanyById(id)); setError(''); }
    catch (err) { setError(err.response?.data?.error || 'Unable to load company.'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => [
    { key: 'name', label: 'Company name' },
    { key: 'legal_name', label: 'Registered legal name' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'website', label: 'Website' },
    { key: 'gst_number', label: 'GST number' },
    { key: 'pan_number', label: 'PAN number' },
    { key: 'company_type', label: 'Company type', type: 'select', options: ['ISSUING', 'CUSTOMER', 'BOTH'] },
    { key: 'logo_url', label: 'Company logo', readOnly: true, render: (value) => value ? <img src={resolveBackendAssetUrl(value)} alt="Company logo" style={{ maxWidth: 180, maxHeight: 72, objectFit: 'contain' }} /> : '—' },
    { key: 'registered_address', label: 'Registered address', type: 'textarea' },
    { key: 'registered_city', label: 'Registered city' },
    { key: 'registered_state', label: 'Registered state' },
    { key: 'registered_pincode', label: 'Registered PIN code' },
    { key: 'billing_address', label: 'Billing address', type: 'textarea' },
    { key: 'billing_city', label: 'Billing city' },
    { key: 'billing_state', label: 'Billing state' },
    { key: 'billing_pincode', label: 'Billing PIN code' },
    { key: 'shipping_address', label: 'Shipping address', type: 'textarea' },
    { key: 'shipping_city', label: 'Shipping city' },
    { key: 'shipping_state', label: 'Shipping state' },
    { key: 'shipping_pincode', label: 'Shipping PIN code' },
    { key: 'created_at', label: 'Created', type: 'datetime', readOnly: true },
    { key: 'updated_at', label: 'Updated', type: 'datetime', readOnly: true },
  ], []);

  const cards = useMemo(() => company ? [
    { id: 'company-details', title: 'Company Details', position: 'left', fieldKeys: ['name', 'legal_name', 'email', 'phone', 'website', 'logo_url'], deletable: false },
    { id: 'key-information', title: 'Key Information', position: 'left', fieldKeys: ['gst_number', 'pan_number', 'company_type', 'registered_state'], deletable: false },
    { id: 'quotations', title: 'Quotations', position: 'right', nonCollapsible: true, deletable: false, customContent: () => <QuotationList quotations={company.quotations || []} />, headerActions: () => company.contacts?.[0] ? <button type="button" title="Create quotation" onClick={() => navigate(`/quotation/create/${company.contacts[0].id}`)}><Add /></button> : null },
    { id: 'contacts', title: 'Linked Contacts', position: 'right', deletable: false, customContent: () => <ContactList contacts={company.contacts || []} /> },
    { id: 'billing', title: 'Billing Details', position: 'right', fieldKeys: ['billing_address', 'billing_city', 'billing_state', 'billing_pincode', 'gst_number'] },
    { id: 'shipping', title: 'Shipping Details', position: 'right', fieldKeys: ['shipping_address', 'shipping_city', 'shipping_state', 'shipping_pincode'] },
  ] : [], [company, navigate]);

  const timeline = useMemo(() => company ? [
    ...(company.activities || []).map((activity) => ({ ...activity, id: `activity-${activity.id}`, title: activity.title || `${activity.type || 'Activity'} · ${activity.lead_name || ''}` })),
    ...(company.quotations || []).map((quotation) => ({ id: `quotation-${quotation.id}`, type: 'quotation', title: `Quotation ${quotation.quotation_number || `#${quotation.id}`}`, description: `${quotation.lead_name || 'Company'} · ${quotation.status || 'pending'} · ${money(quotation.total_amount)}`, created_at: quotation.created_at || quotation.quotation_date, meta: <Link to={`/quotations/${quotation.id}`}>Open quotation</Link> })),
    ...(company.invoices || []).map((invoice) => ({ id: `invoice-${invoice.id}`, type: 'invoice', title: `Invoice ${invoice.invoice_number || `#${invoice.id}`}`, description: `${invoice.status || ''} · ${money(invoice.grand_total)}`, created_at: invoice.created_at, meta: <Link to={`/invoices/${invoice.id}`}>Open invoice</Link> })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) : [], [company]);

  if (error) return <div className="record-load-error">{error}</div>;
  if (!company) return <div className="record-load-error">Loading company…</div>;

  return <SingleRecordWorkspace
    storageKey={`pav-erp:record:company:${id}`}
    backTo="/companies"
    backLabel="Companies"
    title={company.name || `Company #${company.id}`}
    subtitle={[company.legal_name, company.gst_number].filter(Boolean).join(' · ')}
    record={company}
    fields={fields}
    initialCards={cards}
    activities={timeline}
    onSaveFields={async (patch) => { await updateCompany(id, { ...company, ...patch }); await load(); }}
    onAddActivity={company.contacts?.[0] ? async (payload) => { await createActivity(company.contacts[0].id, payload); await load(); } : undefined}
    revenueContent={<div className="record-stat-grid"><div className="record-stat"><span>Revenue</span><strong>{money(company.stats?.revenue)}</strong></div><div className="record-stat"><span>Quoted value</span><strong>{money(company.stats?.quoted_value)}</strong></div><div className="record-stat"><span>Contacts</span><strong>{company.stats?.contacts || 0}</strong></div><div className="record-stat"><span>Invoices</span><strong>{company.stats?.invoices || 0}</strong></div></div>}
    toolbarActions={() => <><button type="button" className="hs-listing__create" onClick={() => navigate(`/companies?edit=${id}`)}><EditOutlined />Edit company</button>{company.contacts?.[0] && <button className="hs-listing__create" type="button" onClick={() => navigate(`/quotation/create/${company.contacts[0].id}`)}><Add />Create quotation</button>}</>}
  />;
}
