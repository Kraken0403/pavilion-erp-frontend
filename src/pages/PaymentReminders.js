import React, { useState } from 'react';
import { SendOutlined } from '@mui/icons-material';
import HubSpotListing from '../components/ui/HubSpotListing';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import ChannelSelectModal from '../components/ui/ChannelSelectModal';
import { formatDate } from '../utils/dateFormatter';
import { getPendingPaymentReminders, sendPaymentReminderEmail, sendPaymentReminderWhatsApp } from '../services/paymentReminderService';
import useAutoRefresh from '../hooks/useAutoRefresh';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const fields = [
  { key: 'invoice_number', label: 'Invoice number' }, { key: 'customer_name', label: 'Customer' },
  { key: 'customer_email', label: 'Email' }, { key: 'due_date', label: 'Due date' },
  { key: 'grand_total', label: 'Total' }, { key: 'paid_amount', label: 'Paid' },
  { key: 'balance_due', label: 'Pending' }, { key: '_action', label: 'Action' },
];

export default function PaymentReminders() {
  const [rows, setRows] = useState([]);
  const [sending, setSending] = useState({});
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const load = async () => { const response = await getPendingPaymentReminders(); setRows(Array.isArray(response?.pending_payments) ? response.pending_payments : []); };
  useAutoRefresh(load, { intervalMs: 15000 });
  const send = async (invoiceId, { sendEmail = true, sendWhatsApp = false } = {}) => {
    setSending((current) => ({ ...current, [invoiceId]: true }));
    const tasks = [];
    if (sendEmail) tasks.push(sendPaymentReminderEmail(invoiceId));
    if (sendWhatsApp) tasks.push(sendPaymentReminderWhatsApp(invoiceId));
    const results = await Promise.allSettled(tasks);
    const failures = results.filter((result) => result.status === 'rejected').length;
    setSending((current) => ({ ...current, [invoiceId]: false }));
    setNotification({ open: true, message: failures ? `Sent ${results.length - failures} request(s), failed ${failures}` : 'Payment notification sent successfully', severity: failures ? 'warning' : 'success' });
  };
  return <><HubSpotListing title="Payment reminders" rows={rows} initialFields={fields} onRefresh={load} renderValue={(field, value, row) => {
    if (field === 'due_date') return value ? formatDate(value) : '—';
    if (['grand_total', 'paid_amount', 'balance_due'].includes(field)) return money(value);
    if (field === '_action') return <button className="secondary-btn" disabled={sending[row.id]} onClick={(event) => { event.stopPropagation(); setActiveInvoiceId(row.id); }}><SendOutlined />{sending[row.id] ? 'Sending…' : 'Send notification'}</button>;
    return value ?? '—';
  }} /><NotificationSnackbar {...notification} onClose={() => setNotification((current) => ({ ...current, open: false }))} /><ChannelSelectModal open={Boolean(activeInvoiceId)} onClose={() => setActiveInvoiceId(null)} title="Send Payment Reminder" subtitle="Choose how you want to notify this customer" defaultEmail defaultWhatsApp confirmLabel="Send Notification" onConfirm={async (selection) => { const id = activeInvoiceId; setActiveInvoiceId(null); if (id) await send(id, selection); }} /></>;
}
