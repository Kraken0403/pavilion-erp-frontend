import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Add, DeleteOutline, EditOutlined, FileDownloadOutlined,
} from '@mui/icons-material';
import SingleRecordWorkspace from '../components/ui/SingleRecordWorkspace';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { deleteLead, getLeadById, updateLead } from '../services/leadService';
import {
  createActivity,
  deleteActivity,
  getActivitiesByLead,
  updateActivity,
} from '../services/activityService';
import { fetchQuotations } from '../services/quotationService';
import { createCompany, getCompanies } from '../services/companyService';
import { getAllUsers } from '../services/userServices';
import { useSettings } from '../context/SettingsContext';
import { displayCurrency } from '../utils/currencyUtils';

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.error
  || error?.response?.data?.details
  || error?.message
  || fallback
);

const formatMoney = (value, currencyCode = 'INR') => {
  const code = String(currencyCode || 'INR').trim() || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code.length === 3 ? code.toUpperCase() : 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch (_) {
    return `${displayCurrency(code)} ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

const exportRecordCsv = (record, filename) => {
  const rows = Object.entries(record || {}).filter(([, value]) => (
    value === null
    || value === undefined
    || ['string', 'number', 'boolean'].includes(typeof value)
  ));
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = ['Field,Value', ...rows.map(([key, value]) => `${escape(key)},${escape(value)}`)].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function QuotationCardContent({ quotations, money }) {
  const [query, setQuery] = useState('');
  const rows = quotations.filter((quotation) => `${quotation.quotation_number || ''} ${quotation.status || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="record-card-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search quotations" /></div>
    <div className="record-quotation-list">
      {rows.length ? rows.slice(0, 8).map((quotation) => <Link className="record-quotation-row" to={`/quotations/${quotation.id}`} key={quotation.id}>
        <strong>{quotation.quotation_number || `Quotation #${quotation.id}`}</strong>
        <span><em>{quotation.status || 'pending'}</em><b>{money(quotation.total_amount || quotation.grand_total)}</b></span>
      </Link>) : <p className="record-empty">No quotations found.</p>}
    </div>
  </>;
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const currencyCode = settings?.currency_code || 'INR';
  const currencyLabel = displayCurrency(currencyCode);
  const money = useCallback((value) => formatMoney(value, currencyCode), [currencyCode]);

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const load = useCallback(async () => {
    try {
      const [leadRow, activityRows, quotationRows, companyRows, userRows] = await Promise.all([
        getLeadById(id),
        getActivitiesByLead(id),
        fetchQuotations(),
        getCompanies('CUSTOMER'),
        getAllUsers(),
      ]);
      const normalizedCompanies = Array.isArray(companyRows) ? companyRows : [];
      const leadQuotations = (Array.isArray(quotationRows) ? quotationRows : []).filter((quotation) => String(quotation.lead_id) === String(id));
      setLead(leadRow);
      setActivities(Array.isArray(activityRows) ? activityRows : []);
      setQuotations(leadQuotations);
      setCompanies(normalizedCompanies);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setCompany(normalizedCompanies.find((item) => String(item.id) === String(leadRow?.company_id)) || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load contact.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const companyOptions = useMemo(() => companies.map((item) => ({
    value: item.name,
    label: item.name,
    linkedValue: item.id,
  })), [companies]);

  const salespersonOptions = useMemo(() => users
    .filter((user) => user?.id !== undefined && user?.id !== null && (user?.name || user?.username || user?.email))
    .map((user) => ({
      value: user.id,
      label: [user.name || user.username || user.email, user.role_name || user.role, user.email && (user.name || user.username) ? user.email : null].filter(Boolean).join(' · '),
    })), [users]);

  const handleCreateCompany = useCallback(async (name) => {
    const saved = await createCompany({ name, company_type: 'CUSTOMER' });
    setCompanies((current) => {
      if (current.some((item) => String(item.id) === String(saved.id))) return current;
      return [...current, saved].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    });
    setCompany(saved);
    return { value: saved.name, label: saved.name, linkedValue: saved.id };
  }, []);

  const fields = useMemo(() => [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'email', label: 'Email ID', type: 'email' },
    {
      key: 'company_name',
      label: 'Company name',
      type: 'creatable-autocomplete',
      options: companyOptions,
      linkedKey: 'company_id',
      onCreateOption: handleCreateCompany,
      createOptionLabel: 'Company',
      placeholder: 'Search or add company',
    },
    { key: 'designation', label: 'Designation' },
    { key: 'phone_number', label: 'Phone number', type: 'tel' },
    { key: 'lead_status', label: 'Lead status', type: 'select', options: ['new', 'in-progress', 'closed', 'won', 'lost'] },
    {
      key: 'assigned_salesperson',
      label: 'Assigned salesperson',
      type: 'autocomplete',
      options: salespersonOptions,
      placeholder: 'Search salesperson',
      render: (value) => salespersonOptions.find((option) => String(option.value) === String(value))?.label || value || '—',
    },
    { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
    { key: 'source', label: 'Source' },
    { key: 'follow_up_date', label: 'Follow-up', type: 'datetime' },
    { key: 'amount', label: `Lead value (${currencyLabel})`, type: 'number', render: (value) => money(value) },
    { key: 'gst_number', label: 'GST number' },
    { key: 'contact_name', label: 'Contact name' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
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
  ], [companyOptions, currencyLabel, handleCreateCompany, money, salespersonOptions]);

  const timeline = useMemo(() => [
    ...activities.map((activity) => ({
      ...activity,
      id: `activity-${activity.id}`,
      activityId: activity.id,
      editable: true,
    })),
    ...quotations.map((quotation) => ({
      id: `quotation-${quotation.id}`,
      type: 'quotation',
      title: `Quotation ${quotation.quotation_number || `#${quotation.id}`}`,
      description: `Quotation ${quotation.status || 'pending'} · ${money(quotation.total_amount || quotation.grand_total)}`,
      created_at: quotation.created_at || quotation.quotation_date,
      editable: false,
      meta: <Link to={`/quotations/${quotation.id}`}>Open quotation</Link>,
    })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)), [activities, money, quotations]);

  const contactTitle = `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || lead?.contact_name || `Contact #${lead?.id || id}`;

  const handleExport = useCallback(() => {
    if (!lead) return;
    exportRecordCsv(lead, `${String(contactTitle).replace(/[^a-z0-9-_]+/gi, '-') || `contact-${id}`}.csv`);
    showNotification('Contact exported successfully.', 'success');
  }, [contactTitle, id, lead, showNotification]);

  const cards = useMemo(() => [
    { id: 'lead-details', title: 'Lead Details', position: 'left', fieldKeys: ['first_name', 'last_name', 'email', 'company_name', 'designation', 'phone_number'], deletable: false },
    { id: 'key-information', title: 'Key Information', position: 'left', fieldKeys: ['email', 'phone_number', 'lead_status', 'assigned_salesperson'], deletable: false },
    {
      id: 'actions',
      title: 'Actions',
      position: 'right',
      fixed: true,
      disableDrag: true,
      deletable: false,
      allowSettings: false,
      titleEditable: false,
      fieldKeys: [],
      customContent: () => <div className="record-action-buttons">
        <button type="button" className="hs-listing__create" onClick={() => navigate(`/leads?edit=${id}`)}><EditOutlined />Edit contact</button>
        <button type="button" className="hs-listing__create" onClick={() => navigate(`/quotation/create/${id}`)}><Add />Create quotation</button>
      </div>,
    },
    {
      id: 'quotations',
      title: 'Quotations',
      position: 'right',
      deletable: false,
      allowSettings: true,
      defaultCollapsed: quotations.length === 0,
      fieldKeys: [],
      customContent: () => <QuotationCardContent quotations={quotations} money={money} />,
      headerActions: () => <button className="record-card-header-link" type="button" title="Create quotation" onClick={() => navigate(`/quotation/create/${id}`)}><Add /></button>,
    },
    {
      id: 'company',
      title: 'Company',
      position: 'right',
      fieldKeys: ['company_name'],
      deletable: false,
      defaultCollapsed: !company && !lead?.company_name,
      customContent: company ? () => <div className="record-property"><span>Linked company</span><div><Link to={`/companies/${company.id}`}>{company.name}</Link><br /><small>{company.email || ''}</small><br /><small>{company.phone || ''}</small></div></div> : null,
    },
    { id: 'sales-information', title: 'Sales Information', position: 'right', fieldKeys: ['lead_status', 'priority', 'assigned_salesperson', 'amount', 'source'] },
    { id: 'additional-information', title: 'Additional Information', position: 'right', fieldKeys: ['gst_number', 'follow_up_date', 'billing_city', 'billing_state', 'shipping_city', 'shipping_state', 'notes'] },
  ], [company, id, lead?.company_name, money, navigate, quotations]);

  const summaryCard = useMemo(() => lead ? ({
    backTo: '/leads',
    backLabel: 'Contacts',
    displayTitle: contactTitle,
    subtitle: [lead.company_name, lead.designation].filter(Boolean).join(' · '),
    fieldKeys: ['email', 'phone_number', 'company_name', 'lead_status'],
    actions: [
      { label: 'Edit contact', icon: <EditOutlined />, onClick: () => navigate(`/leads?edit=${id}`) },
      { label: 'Export contact', icon: <FileDownloadOutlined />, onClick: handleExport },
      { label: 'Delete contact', icon: <DeleteOutline />, danger: true, onClick: () => setDeleteOpen(true) },
    ],
  }) : null, [contactTitle, handleExport, id, lead, navigate]);

  const handleDelete = async () => {
    if (deleteSaving) return;
    setDeleteSaving(true);
    try {
      await deleteLead(id);
      setDeleteOpen(false);
      navigate('/leads');
    } catch (deleteError) {
      showNotification(getErrorMessage(deleteError, 'Unable to delete contact.'), 'error');
      setDeleteSaving(false);
    }
  };

  if (error) return <div className="record-load-error">{error}</div>;
  if (!lead) return <div className="record-load-error">Loading contact…</div>;

  const totalQuoted = quotations.reduce((sum, quotation) => sum + Number(quotation.total_amount || quotation.grand_total || 0), 0);
  const wonQuoted = quotations
    .filter((quotation) => ['approved', 'won', 'accepted'].includes(String(quotation.status || '').toLowerCase()))
    .reduce((sum, quotation) => sum + Number(quotation.total_amount || quotation.grand_total || 0), 0);

  return <>
    <SingleRecordWorkspace
      storageKey={`pav-erp:record:lead:${id}`}
      backTo="/leads"
      backLabel="Contacts"
      title={contactTitle}
      subtitle={[lead.company_name, lead.designation].filter(Boolean).join(' · ')}
      hidePageHeader
      summaryCard={summaryCard}
      record={lead}
      fields={fields}
      initialCards={cards}
      activities={timeline}
      activityTypes={['call', 'email', 'meeting', 'task', 'note', 'deadline']}
      onSaveFields={async (patch) => { await updateLead(id, patch); await load(); }}
      onAddActivity={async (payload) => { await createActivity(id, payload); await load(); }}
      onUpdateActivity={async (activityId, payload) => { await updateActivity(activityId, payload); await load(); }}
      onDeleteActivity={async (activityId) => { await deleteActivity(activityId); await load(); }}
      revenueContent={<div className="record-stat-grid">
        <div className="record-stat"><span>Total quoted ({currencyLabel})</span><strong>{money(totalQuoted)}</strong></div>
        <div className="record-stat"><span>Approved / won ({currencyLabel})</span><strong>{money(wonQuoted)}</strong></div>
        <div className="record-stat"><span>Quotations</span><strong>{quotations.length}</strong></div>
        <div className="record-stat"><span>Lead value ({currencyLabel})</span><strong>{money(lead.amount)}</strong></div>
      </div>}
    />

    <ConfirmDialog
      open={deleteOpen}
      title="Delete contact"
      message={`Delete ${contactTitle}? This action cannot be undone.`}
      confirmText="Delete contact"
      onConfirm={handleDelete}
      onCancel={() => setDeleteOpen(false)}
      loading={deleteSaving}
    />

    <NotificationSnackbar
      open={notification.open}
      message={notification.message}
      severity={notification.severity}
      onClose={() => setNotification((current) => ({ ...current, open: false }))}
    />
  </>;
}
