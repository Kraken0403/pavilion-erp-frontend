import React, { useCallback, useMemo, useState } from 'react';
import PaginationBar from '../components/ui/PaginationBar';
import { Chip } from '@mui/material';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import PageLoader from '../components/ui/PageLoader';
import StatusUpdateModal from '../components/invoices/StatusUpdateModal';
import VendorPayablesPanel from '../components/vendors/VendorPayablesPanel';
import ReceiptsModal from '../components/invoices/ReceiptsModal';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';
import { formatStatusLabel } from '../utils/statusFormatter';
import {
    getPendingPaymentReminders,
} from '../services/paymentReminderService';
import { getInvoiceById } from '../services/invoiceService';
import useAutoRefresh from '../hooks/useAutoRefresh';
import '../assets/styles/LeadsTable.scss';
import '../assets/styles/PaymentModule.scss';

const formatCurrency = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

function Payments() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);

    const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);
    const [receiptsModalInvoice, setReceiptsModalInvoice] = useState(null);
    const [page, setPage] = useState(1);
    const PENDING_PER_PAGE = 20;

    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info',
    });

    const loadPendingRows = useCallback(async ({ isAutoRefresh = false } = {}) => {
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
    }, []);

    useAutoRefresh(loadPendingRows, { intervalMs: 15000 });

    const handleClosePaymentModal = useCallback(() => {
        setPaymentModalOpen(false);
        setPaymentInvoiceId(null);
    }, []);

    const handlePaymentSuccess = useCallback((message) => {
        setNotification({ open: true, message, severity: 'success' });
        loadPendingRows();
    }, [loadPendingRows]);

    const handlePaymentError = useCallback((message) => {
        setNotification({ open: true, message, severity: 'error' });
    }, []);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) =>
            [row.invoice_number, row.customer_name, row.customer_email, row.status]
                .some((value) => String(value || '').toLowerCase().includes(q))
        );
    }, [rows, searchQuery]);

    // reset page when filter changes
    React.useEffect(() => setPage(1), [searchQuery, rows]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * PENDING_PER_PAGE;
        return filteredRows.slice(start, start + PENDING_PER_PAGE);
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

    const handleOpenReceipts = async (invoiceId) => {
        try {
            const invoice = await getInvoiceById(invoiceId);
            setReceiptsModalInvoice(invoice);
            setReceiptsModalOpen(true);
        } catch {
            setNotification({
                open: true,
                message: 'Failed to load receipts.',
                severity: 'error',
            });
        }
    };

    return (
        <div className="leads-table-container payment-module-page">
            <Topbar />

            <div className="table-container module-card">
                <div className="module-header">
                    <h2>Payments</h2>
                    <p>Track pending invoices, receive payments, and open receipts.</p>
                </div>

                <div className="module-summary">
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
                        <button
                            className="secondary-btn"
                            onClick={() => navigate('/payments/history')}
                        >
                            Payment History
                        </button>
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
                            <th>DUE DATE</th>
                            <th>TOTAL</th>
                            <th>PAID</th>
                            <th>PENDING</th>
                            <th>STATUS</th>
                            <th>RECEIVE PAYMENT</th>
                            <th>RECEIPTS</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="table-empty-message">
                                    <PageLoader message="Loading pending payments..." minHeight={140} size={26} />
                                </td>
                            </tr>
                        ) : filteredRows.length ? (
                            paginatedRows.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.invoice_number}</td>
                                    <td>{row.customer_name || '—'}</td>
                                    <td>{row.due_date ? formatDate(row.due_date) : '—'}</td>
                                    <td>{formatCurrency(row.grand_total)}</td>
                                    <td>{formatCurrency(row.paid_amount)}</td>
                                    <td>{formatCurrency(row.balance_due)}</td>
                                    <td>
                                        <Chip
                                            label={formatStatusLabel(row.status)}
                                            size="small"
                                            color={row.status === 'part-payment' ? 'warning' : 'primary'}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className="primary-btn"
                                            onClick={() => {
                                                setPaymentInvoiceId(row.id);
                                                setPaymentModalOpen(true);
                                            }}
                                        >
                                            Add Payment
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="secondary-btn"
                                            onClick={() => handleOpenReceipts(row.id)}
                                        >
                                            View Receipts
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={9} className="table-empty-message">
                                    No pending payments found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <VendorPayablesPanel />

            <div className="module-footer">
                <PaginationBar
                    currentPage={page}
                    totalItems={filteredRows.length}
                    itemsPerPage={PENDING_PER_PAGE}
                    onPageChange={setPage}
                />
            </div>

            <StatusUpdateModal
                open={paymentModalOpen}
                invoiceId={paymentInvoiceId}
                onClose={handleClosePaymentModal}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
            />

            <ReceiptsModal
                open={receiptsModalOpen}
                invoice={receiptsModalInvoice}
                onClose={() => {
                    setReceiptsModalOpen(false);
                    setReceiptsModalInvoice(null);
                }}
                onError={(message) => {
                    setNotification({ open: true, message, severity: 'error' });
                }}
            />

            <NotificationSnackbar
                {...notification}
                onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
}

export default Payments;
