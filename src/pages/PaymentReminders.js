import React, { useMemo, useState } from 'react';
import PaginationBar from '../components/ui/PaginationBar';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import ChannelSelectModal from '../components/ui/ChannelSelectModal';
import PageLoader from '../components/ui/PageLoader';
import { formatDate } from '../utils/dateFormatter';
import {
  getPendingPaymentReminders,
  sendPaymentReminderEmail,
  sendPaymentReminderWhatsApp,
} from '../services/paymentReminderService';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentReminders.scss';
import useAutoRefresh from '../hooks/useAutoRefresh';

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
  const [page, setPage] = useState(1);
  const REMINDERS_PER_PAGE = 20;

  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const loadPendingRows = async ({ isAutoRefresh = false } = {}) => {
    if (!isAutoRefresh) setLoading(true);
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
      if (!isAutoRefresh) setLoading(false);
    }
  };

  useAutoRefresh(loadPendingRows, { intervalMs: 15000 });

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

  React.useEffect(() => setPage(1), [searchQuery, rows]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * REMINDERS_PER_PAGE;
    return filteredRows.slice(start, start + REMINDERS_PER_PAGE);
  }, [filteredRows, page]);

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

  const handleSendReminderWithSelection = async (
    invoiceId,
    { sendEmail = true, sendWhatsApp = false } = {}
  ) => {
    setSendingByInvoiceId((prev) => ({ ...prev, [invoiceId]: true }));

    try {
      const tasks = [];
      if (sendEmail) tasks.push(sendPaymentReminderEmail(invoiceId));
      if (sendWhatsApp) tasks.push(sendPaymentReminderWhatsApp(invoiceId));

      const results = await Promise.allSettled(tasks);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      setNotification({
        open: true,
        message:
          failedCount === 0
            ? 'Payment notification sent successfully'
            : `Sent ${successCount} request(s), failed ${failedCount}`,
        severity: failedCount === 0 ? 'success' : 'warning',
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to send payment notification',
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
            Track all pending payments and send reminders through Email or WhatsApp.
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
        <div className="module-toolbar">
          <div className="toolbar-actions">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search by invoice/customer/email/status"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
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
                <td colSpan={8} className="table-empty-message">
                  <PageLoader message="Loading pending payments..." minHeight={140} size={26} />
                </td>
              </tr>
            ) : filteredRows.length ? (
              paginatedRows.map((row) => (
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
                      onClick={() => {
                        setActiveInvoiceId(row.id);
                        setChannelModalOpen(true);
                      }}
                      disabled={sendingByInvoiceId[row.id]}
                    >
                      {sendingByInvoiceId[row.id] ? 'Sending...' : 'Send Notification'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="table-empty-message">No pending payments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="module-footer">
        <PaginationBar
          currentPage={page}
          totalItems={filteredRows.length}
          itemsPerPage={REMINDERS_PER_PAGE}
          onPageChange={setPage}
        />
      </div>

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />

      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => {
          setChannelModalOpen(false);
          setActiveInvoiceId(null);
        }}
        title="Send Payment Reminder"
        subtitle="Choose how you want to notify this customer"
        defaultEmail
        defaultWhatsApp
        confirmLabel="Send Notification"
        onConfirm={async (selection) => {
          const invoiceId = activeInvoiceId;
          setChannelModalOpen(false);
          setActiveInvoiceId(null);
          if (invoiceId) {
            await handleSendReminderWithSelection(invoiceId, selection);
          }
        }}
      />
    </div>
  );
};

export default PaymentReminders;
