import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HubSpotListing from '../components/ui/HubSpotListing';
import EntityFormDrawer from '../components/ui/EntityFormDrawer';
import CreateInvoice from './CreateInvoice';
import { getInvoices } from '../services/invoiceService';
import useAutoRefresh from '../hooks/useAutoRefresh';

const fields = [
  { key: 'invoice_number', label: 'Invoice number' }, { key: 'customer_name', label: 'Customer' },
  { key: 'issue_date', label: 'Issue date' }, { key: 'due_date', label: 'Due date' },
  { key: 'grand_total', label: 'Total amount' }, { key: 'paid_amount', label: 'Paid amount' },
  { key: 'balance_due', label: 'Balance due' }, { key: 'status', label: 'Status' },
];
export default function Invoices() {
  const navigate = useNavigate(); const location = useLocation(); const [invoices, setInvoices] = useState([]); const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(async () => { const data = await getInvoices(); const list = Array.isArray(data) ? data : data?.invoices || []; setInvoices(list.map((invoice) => { const paid = Number(invoice.paid_amount || 0); const total = Number(invoice.grand_total || 0); return { ...invoice, customer_name: `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim() || invoice.customer_name || '—', balance_due: Math.max(0, total - paid) }; })); }, []);
  useEffect(() => { load().catch(() => setInvoices([])); }, [load]);
  useEffect(() => { if (new URLSearchParams(location.search).get('create') === '1') setCreateOpen(true); }, [location.search]);
  useAutoRefresh(load, { intervalMs: 20000 });
  const closeCreate = () => { setCreateOpen(false); if (new URLSearchParams(location.search).has('create')) navigate('/invoices', { replace: true }); };
  return <><HubSpotListing title="Invoices" createLabel="Create invoice" rows={invoices} initialFields={fields} onCreate={() => setCreateOpen(true)} onRowOpen={(invoice) => navigate(`/invoices/${invoice.id}`)} onRefresh={load} renderValue={(field, value) => ['grand_total', 'paid_amount', 'balance_due'].includes(field) ? `₹${Number(value || 0).toFixed(2)}` : (value ?? '—')} /><EntityFormDrawer open={createOpen} title="Create invoice" onClose={closeCreate}><CreateInvoice onSaved={() => { closeCreate(); load(); }} /></EntityFormDrawer></>;
}
