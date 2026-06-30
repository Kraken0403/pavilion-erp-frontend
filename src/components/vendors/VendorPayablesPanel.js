import React, { useEffect, useMemo, useState } from 'react';
import { Button, Chip } from '@mui/material';
import { getVendorPayables, recordVendorPayment } from '../../services/vendorService';
import { formatDate } from '../../utils/dateFormatter';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value || 0));

function VendorPayablesPanel() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await getVendorPayables({ status: '' });
      setRows(res?.data || []);
      setSummary(res?.summary || {});
    } catch (err) {
      console.error('Vendor payables load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRows(); }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.vendor_name, row.product_name, row.work_order_number, row.quotation_number, row.status]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const handleRecordPayment = async (row) => {
    const balance = Number(row.amount || 0) - Number(row.paid_amount || 0);
    if (balance <= 0) return;
    const raw = window.prompt(`Enter vendor payment amount for ${row.vendor_name || 'vendor'}`, String(balance));
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return window.alert('Enter a valid payment amount');
    await recordVendorPayment(row.id, amount);
    await loadRows();
  };

  return (
    <div className="table-container module-card vendor-payables-panel">
      <div className="module-header compact">
        <div>
          <h2>Vendor Payables</h2>
          <p>Auto-created from approved quotations and work orders when product vendors are selected.</p>
        </div>
        <div className="search-input slim">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor payable" />
        </div>
      </div>

      <div className="module-summary">
        <div className="summary-item"><div className="summary-label">Total Payable</div><div className="summary-value">{formatCurrency(summary.total_amount)}</div></div>
        <div className="summary-item"><div className="summary-label">Paid</div><div className="summary-value">{formatCurrency(summary.paid_amount)}</div></div>
        <div className="summary-item"><div className="summary-label">Balance</div><div className="summary-value">{formatCurrency(summary.balance_amount)}</div></div>
      </div>

      <table className="leads-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Reference</th>
            <th>Product</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} className="table-empty-message">Loading vendor payables...</td></tr>
          ) : filteredRows.length ? filteredRows.map((row) => (
            <tr key={row.id}>
              <td>{row.vendor_name || '—'}</td>
              <td>{row.work_order_number || row.quotation_number || '—'}</td>
              <td>{row.product_name || row.description || '—'}</td>
              <td>{formatCurrency(row.amount)}</td>
              <td>{formatCurrency(row.paid_amount)}</td>
              <td>{formatCurrency(Number(row.amount || 0) - Number(row.paid_amount || 0))}</td>
              <td><Chip size="small" label={row.status || 'pending'} color={row.status === 'paid' ? 'success' : row.status === 'partial' ? 'warning' : 'default'} /></td>
              <td>{row.created_at ? formatDate(row.created_at) : '—'}</td>
              <td>
                {row.status !== 'paid' ? (
                  <Button size="small" variant="outlined" onClick={() => handleRecordPayment(row)}>Record Payment</Button>
                ) : '—'}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={9} className="table-empty-message">No vendor payables yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default VendorPayablesPanel;
