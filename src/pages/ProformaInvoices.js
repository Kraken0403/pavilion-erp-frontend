import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HubSpotListing from '../components/ui/HubSpotListing';
import EntityFormDrawer from '../components/ui/EntityFormDrawer';
import CreateProformaInvoice from './CreateProformaInvoice';
import { getProformaInvoices } from '../services/invoiceService';

const fields = [
  { key: 'invoice_number', label: 'Proforma number' }, { key: 'customer_name', label: 'Customer' },
  { key: 'issue_date', label: 'Issue date' }, { key: 'due_date', label: 'Due date' },
  { key: 'grand_total', label: 'Total amount' }, { key: 'status', label: 'Status' },
  { key: 'tax_invoice_id', label: 'Tax invoice' },
];
export default function ProformaInvoices() {
  const navigate = useNavigate(); const location = useLocation(); const [invoices, setInvoices] = useState([]); const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(async () => { const data = await getProformaInvoices(); setInvoices((Array.isArray(data) ? data : []).map((invoice) => ({ ...invoice, customer_name: `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim() || invoice.customer_name || '—' }))); }, []);
  useEffect(() => { load().catch(() => setInvoices([])); }, [load]);
  useEffect(() => { if (new URLSearchParams(location.search).get('create') === '1') setCreateOpen(true); }, [location.search]);
  const closeCreate = () => { setCreateOpen(false); if (new URLSearchParams(location.search).has('create')) navigate('/proforma-invoices', { replace: true }); };
  return <><HubSpotListing title="Proforma invoices" createLabel="Create proforma invoice" rows={invoices} initialFields={fields} onCreate={() => setCreateOpen(true)} onRowOpen={(invoice) => navigate(`/proforma-invoices/${invoice.id}`)} onRefresh={load} renderValue={(field, value) => field === 'grand_total' ? `₹${Number(value || 0).toFixed(2)}` : (value ?? '—')} /><EntityFormDrawer open={createOpen} title="Create proforma invoice" onClose={closeCreate}><CreateProformaInvoice onSaved={() => { closeCreate(); load(); }} /></EntityFormDrawer></>;
}
