import React, { useEffect, useMemo, useState } from 'react';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import { formatDate } from '../utils/dateFormatter';
import {
  getPendingPaymentReminders,
  sendPaymentReminderEmail,
} from '../services/paymentReminderService';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentReminders.scss';

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const PaymentReminders = () => {
  const [loading, setLoading] = useState(true);
  const [sendingByInvoiceId, setSendingByInvoiceId] = useState({});
  const [rows, setRows] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  const loadPendingRows = async () => {
    setLoading(true);
    try {
      const response = await getPendingPaymentReminders();
      setRows(Array.isArray(response?.pending_payments) ? response.pending_payments : []);
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to load pending payments',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.invoice_number,
        row.customer_name,
        row.customer_email,
        row.status,
      ].some((value) => String(value || '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalInvoices += 1;
        acc.totalPending += Number(row.balance_due || 0);
        return acc;
      },
      { totalInvoices: 0, totalPending: 0 }
    );
  }, [filteredRows]);

  const handleSendReminder = async (invoiceId) => {
    setSendingByInvoiceId((prev) => ({ ...prev, [invoiceId]: true }));

    try {
      await sendPaymentReminderEmail(invoiceId);
      setNotification({
        open: true,
        message: 'Payment reminder sent successfully',
        severity: 'success',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to send payment reminder',
        severity: 'error',
      });
    } finally {
      setSendingByInvoiceId((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  return (
    <div className="leads-table-container payment-reminder-page">
      <Topbar />

      <div className="table-container payment-reminder-card">
        <div className="payment-reminder-header">
          <h2>Payment Reminders</h2>
          <p>
            Track all pending payments and send reminder emails instantly.
          </p>
        </div>

        <div className="payment-reminder-summary">
          <div className="summary-item">
            <div className="summary-label">Pending Invoices</div>
            <div className="summary-value">{summary.totalInvoices}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total Pending Amount</div>
            <div className="summary-value">{formatCurrency(summary.totalPending)}</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="payment-reminder-search">
          <input
            className="input"
            placeholder="Search by invoice/customer/email/status"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <table className="leads-table">
          <thead>
            <tr>
              <th>INVOICE #</th>
              <th>CUSTOMER</th>
              <th>EMAIL</th>
              <th>DUE DATE</th>
              <th>TOTAL</th>
              <th>PAID</th>
              <th>PENDING</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="table-empty">Loading pending payments...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoice_number}</td>
                  <td>{row.customer_name}</td>
                  <td>{row.customer_email || '—'}</td>
                  <td>{row.due_date ? formatDate(row.due_date) : '—'}</td>
                  <td>{formatCurrency(row.grand_total)}</td>
                  <td>{formatCurrency(row.paid_amount)}</td>
                  <td>{formatCurrency(row.balance_due)}</td>
                  <td>
                    <button
                      className="secondary-btn"
                      onClick={() => handleSendReminder(row.id)}
                      disabled={!row.customer_email || sendingByInvoiceId[row.id]}
                    >
                      {sendingByInvoiceId[row.id] ? 'Sending...' : 'Send Email'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="table-empty">No pending payments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PaymentReminders;
