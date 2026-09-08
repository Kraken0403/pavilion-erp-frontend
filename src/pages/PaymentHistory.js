import React, { useState } from 'react';
import { ReceiptLong } from '@mui/icons-material';
import HubSpotListing from '../components/ui/HubSpotListing';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import ReceiptsModal from '../components/invoices/ReceiptsModal';
import { getInvoices } from '../services/invoiceService';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { formatDate } from '../utils/dateFormatter';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';
const fields = [
  { key: 'invoice_number', label: 'Invoice number' }, { key: 'customer_name', label: 'Customer' },
  { key: 'paid_date', label: 'Paid date' }, { key: 'grand_total', label: 'Invoice total' },
  { key: 'total_paid', label: 'Total paid' }, { key: 'status', label: 'Status', options: ['paid'] },
  { key: '_receipts', label: 'Receipts' },
];

export default function PaymentHistory() {
  const { settings } = useSettings();
  const money = (value) => formatCurrency(value, settings?.currency_code || 'INR');
  const [rows, setRows] = useState([]);
  const [receiptInvoice, setReceiptInvoice] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const load = async () => {
    const response = await getInvoices();
    const invoices = (Array.isArray(response) ? response : []).filter((invoice) => String(invoice?.status || '').toLowerCase() === 'paid');
    setRows(invoices.map((invoice) => {
      const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
      const dates = payments.map((payment) => payment?.paymentDate).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
      return {
        ...invoice,
        customer_name: `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim() || invoice.company_name || '—',
        paid_date: dates[0] || null,
        total_paid: payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0),
      };
    }));
  };
  useAutoRefresh(load, { intervalMs: 15000 });
  return <><HubSpotListing title="Payment history" rows={rows} initialFields={fields} onRefresh={load} renderValue={(field, value, invoice) => {
    if (field === 'paid_date') return value ? formatDate(value) : '—';
    if (field === 'grand_total' || field === 'total_paid') return money(value);
    if (field === '_receipts') return invoice.payments?.length ? <button className="secondary-btn" onClick={(event) => { event.stopPropagation(); setReceiptInvoice(invoice); }}><ReceiptLong />View receipts ({invoice.payments.length})</button> : 'No receipts';
    return value ?? '—';
  }} /><ReceiptsModal open={Boolean(receiptInvoice)} invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} onError={(message) => setNotification({ open: true, message, severity: 'error' })} /><NotificationSnackbar {...notification} onClose={() => setNotification((current) => ({ ...current, open: false }))} /></>;
}
