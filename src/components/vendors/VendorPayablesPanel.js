import React, { useEffect, useState } from 'react';
import { Close, PaymentsOutlined } from '@mui/icons-material';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material';
import HubSpotListing from '../ui/HubSpotListing';
import { getVendorPayables, recordVendorPayment } from '../../services/vendorService';
import { formatDate } from '../../utils/dateFormatter';
import { formatCurrency } from '../../utils/currencyUtils';
import { useSettings } from '../../context/SettingsContext';
const fields = [
  { key: 'vendor_name', label: 'Vendor' }, { key: 'reference', label: 'Reference' },
  { key: 'product_name', label: 'Product' }, { key: 'amount', label: 'Amount' },
  { key: 'paid_amount', label: 'Paid' }, { key: 'balance', label: 'Balance' },
  { key: 'status', label: 'Status', options: ['pending', 'partial', 'paid'] },
  { key: 'created_at', label: 'Created' }, { key: '_action', label: 'Action' },
];

export default function VendorPayablesPanel() {
  const { settings } = useSettings();
  const money = (value) => formatCurrency(value, settings?.currency_code || 'INR');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [activeRow, setActiveRow] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const loadRows = async () => {
    const response = await getVendorPayables({ status: '' });
    setSummary(response?.summary || {});
    setRows((response?.data || []).map((row) => ({
      ...row,
      reference: row.work_order_number || row.quotation_number || '—',
      product_name: row.product_name || row.description || '—',
      balance: Number(row.amount || 0) - Number(row.paid_amount || 0),
    })));
  };
  useEffect(() => { loadRows().catch(() => setRows([])); }, []);
  const openPayment = (row) => { setActiveRow(row); setAmount(String(row.balance)); setError(''); };
  const savePayment = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > Number(activeRow?.balance || 0)) { setError('Enter an amount greater than zero and no more than the outstanding balance.'); return; }
    await recordVendorPayment(activeRow.id, value);
    setActiveRow(null); setAmount(''); await loadRows();
  };
  return <section className="vendor-payables-section"><div className="module-summary vendor-payables-summary"><div className="summary-item"><div className="summary-label">Total payable</div><div className="summary-value">{money(summary.total_amount)}</div></div><div className="summary-item"><div className="summary-label">Paid</div><div className="summary-value">{money(summary.paid_amount)}</div></div><div className="summary-item"><div className="summary-label">Balance</div><div className="summary-value">{money(summary.balance_amount)}</div></div></div><div className="vendor-payables-listing"><HubSpotListing title="Vendor payables" rows={rows} initialFields={fields} onRefresh={loadRows} renderValue={(field, value, row) => {
    if (['amount', 'paid_amount', 'balance'].includes(field)) return money(value);
    if (field === 'created_at') return value ? formatDate(value) : '—';
    if (field === '_action') return row.status !== 'paid' ? <button className="secondary-btn" onClick={(event) => { event.stopPropagation(); openPayment(row); }}><PaymentsOutlined />Record payment</button> : '—';
    return value ?? '—';
  }} /></div><Dialog className="erp-form-drawer" open={Boolean(activeRow)} onClose={() => setActiveRow(null)} fullWidth maxWidth="sm"><DialogTitle>Record vendor payment<IconButton aria-label="Close" onClick={() => setActiveRow(null)} sx={{ position: 'absolute', right: 10, top: 10 }}><Close /></IconButton></DialogTitle><DialogContent dividers><p>{activeRow?.vendor_name} · Outstanding {money(activeRow?.balance)}</p><TextField autoFocus fullWidth type="number" label="Payment amount" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); }} error={Boolean(error)} helperText={error} sx={{ mt: 2 }} inputProps={{ min: 0, max: activeRow?.balance, step: '0.01' }} /></DialogContent><DialogActions><Button onClick={() => setActiveRow(null)}>Cancel</Button><Button variant="contained" onClick={savePayment}>Record payment</Button></DialogActions></Dialog></section>;
}
