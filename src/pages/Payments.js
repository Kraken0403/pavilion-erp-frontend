import React, { useCallback, useState } from 'react';
import { History, PaymentsOutlined, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import HubSpotListing from '../components/ui/HubSpotListing';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import StatusUpdateModal from '../components/invoices/StatusUpdateModal';
import ReceiptsModal from '../components/invoices/ReceiptsModal';
import VendorPayablesPanel from '../components/vendors/VendorPayablesPanel';
import { getPendingPaymentReminders } from '../services/paymentReminderService';
import { getInvoiceById } from '../services/invoiceService';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { formatDate } from '../utils/dateFormatter';
import { formatStatusLabel } from '../utils/statusFormatter';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const fields = [
  { key: 'invoice_number', label: 'Invoice number' }, { key: 'customer_name', label: 'Customer' },
  { key: 'due_date', label: 'Due date' }, { key: 'grand_total', label: 'Total' },
  { key: 'paid_amount', label: 'Paid' }, { key: 'balance_due', label: 'Pending' },
  { key: 'status', label: 'Status' }, { key: '_payment', label: 'Receive payment' },
  { key: '_receipts', label: 'Receipts' },
];

export default function Payments() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [receiptInvoice, setReceiptInvoice] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const load = useCallback(async () => { const response = await getPendingPaymentReminders(); setRows(Array.isArray(response?.pending_payments) ? response.pending_payments : []); }, []);
  useAutoRefresh(load, { intervalMs: 15000 });
  const openReceipts = async (id) => {
    try { setReceiptInvoice(await getInvoiceById(id)); }
    catch { setNotification({ open: true, message: 'Failed to load receipts.', severity: 'error' }); }
  };
  return <div className="payment-module-page hs-listing-stack"><div className="hs-listing-stack__primary"><HubSpotListing title="Payments" createLabel="Payment history" createIcon={<History />} onCreate={() => navigate('/payments/history')} rows={rows} initialFields={fields} onRowOpen={(row) => navigate(`/invoices/${row.id}`)} onRefresh={load} renderValue={(field, value, row) => {
    if (field === 'due_date') return value ? formatDate(value) : '—';
    if (['grand_total', 'paid_amount', 'balance_due'].includes(field)) return money(value);
    if (field === 'status') return formatStatusLabel(value);
    if (field === '_payment') return <button className="primary-btn" onClick={(event) => { event.stopPropagation(); setPaymentInvoiceId(row.id); }}><PaymentsOutlined />Add payment</button>;
    if (field === '_receipts') return <button className="secondary-btn" onClick={(event) => { event.stopPropagation(); openReceipts(row.id); }}><ReceiptLong />View receipts</button>;
    return value ?? '—';
  }} /></div><VendorPayablesPanel /><StatusUpdateModal open={Boolean(paymentInvoiceId)} invoiceId={paymentInvoiceId} onClose={() => setPaymentInvoiceId(null)} onSuccess={(message) => { setNotification({ open: true, message, severity: 'success' }); load(); }} onError={(message) => setNotification({ open: true, message, severity: 'error' })} /><ReceiptsModal open={Boolean(receiptInvoice)} invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} onError={(message) => setNotification({ open: true, message, severity: 'error' })} /><NotificationSnackbar {...notification} onClose={() => setNotification((current) => ({ ...current, open: false }))} /></div>;
}
