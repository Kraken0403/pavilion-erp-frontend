import React, { useMemo, useState } from 'react';
import PaginationBar from '../components/ui/PaginationBar';
import { Chip } from '@mui/material';
import Topbar from '../components/Topbar';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import ReceiptsModal from '../components/invoices/ReceiptsModal';
import PageLoader from '../components/ui/PageLoader';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';
import { getInvoices } from '../services/invoiceService';
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

function PaymentHistory() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);
    const [receiptsModalInvoice, setReceiptsModalInvoice] = useState(null);
    const [page, setPage] = useState(1);
    const PAID_PER_PAGE = 20;

    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info',
    });

    const loadPaidRows = async ({ isAutoRefresh = false } = {}) => {
        if (!isAutoRefresh) setLoading(true);
        try {
            const response = await getInvoices();
            const paidInvoices = (Array.isArray(response) ? response : []).filter(
                (invoice) => String(invoice?.status || '').toLowerCase() === 'paid'
            );
            setRows(paidInvoices);
        } catch (error) {
            setNotification({
                open: true,
                message: error?.response?.data?.error || 'Failed to load payment history',
                severity: 'error',
            });
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    };

    useAutoRefresh(loadPaidRows, { intervalMs: 15000 });

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) =>
            [row.invoice_number, row.first_name, row.last_name, row.company_name, row.status]
                .some((value) => String(value || '').toLowerCase().includes(q))
        );
    }, [rows, searchQuery]);

    React.useEffect(() => setPage(1), [searchQuery, rows]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * PAID_PER_PAGE;
        return filteredRows.slice(start, start + PAID_PER_PAGE);
    }, [filteredRows, page]);

    const summary = useMemo(() => {
        return filteredRows.reduce(
            (acc, row) => {
                const invoicePaid = Array.isArray(row?.payments)
                    ? row.payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0)
                    : Number(row?.grand_total || 0);

                acc.totalInvoices += 1;
                acc.totalPaid += invoicePaid;
                return acc;
            },
            { totalInvoices: 0, totalPaid: 0 }
        );
    }, [filteredRows]);

    const getTotalPaid = (invoice) => {
        const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
        return payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
    };

    const getLatestPaymentDate = (invoice) => {
        const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
        if (!payments.length) return null;

        return payments
            .map((payment) => payment?.paymentDate)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0];
    };

    return (
        <div className="leads-table-container payment-module-page">
            <Topbar />

            <div className="table-container module-card">
                <div className="module-header">
                    <h2>Payment History</h2>
                    <p>View paid invoices and access payment receipts anytime.</p>
                </div>

                <div className="module-summary">
                    <div className="summary-item">
                        <div className="summary-label">Paid Invoices</div>
                        <div className="summary-value">{summary.totalInvoices}</div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-label">Total Paid Amount</div>
                        <div className="summary-value">{formatCurrency(summary.totalPaid)}</div>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="module-toolbar">
                    <div className="toolbar-actions">
                        <button
                            className="secondary-btn"
                            onClick={() => navigate('/payments')}
                        >
                            Pending Payments
                        </button>
                        <div className="search-input">
                            <input
                                type="text"
                                placeholder="Search by invoice/customer"
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
                            <th>PAID DATE</th>
                            <th>INVOICE TOTAL</th>
                            <th>TOTAL PAID</th>
                            <th>STATUS</th>
                            <th>RECEIPTS</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="table-empty-message">
                                    <PageLoader message="Loading payment history..." minHeight={140} size={26} />
                                </td>
                            </tr>
                        ) : filteredRows.length ? (
                            paginatedRows.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.invoice_number}</td>
                                    <td>{`${row.first_name || ''} ${row.last_name || ''}`.trim() || row.company_name || '—'}</td>
                                    <td>{getLatestPaymentDate(row) ? formatDate(getLatestPaymentDate(row)) : '—'}</td>
                                    <td>{formatCurrency(row.grand_total)}</td>
                                    <td>{formatCurrency(getTotalPaid(row))}</td>
                                    <td>
                                        <Chip label="Paid" color="success" size="small" />
                                    </td>
                                    <td>
                                        {row.payments && row.payments.length > 0 ? (
                                            <button
                                                className="secondary-btn"
                                                onClick={() => {
                                                    setReceiptsModalInvoice(row);
                                                    setReceiptsModalOpen(true);
                                                }}
                                            >
                                                View Receipts ({row.payments.length})
                                            </button>
                                        ) : (
                                            <span className="receipts-empty">No Receipts</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="table-empty-message">
                                    No paid invoices found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="module-footer">
                <PaginationBar
                    currentPage={page}
                    totalItems={filteredRows.length}
                    itemsPerPage={PAID_PER_PAGE}
                    onPageChange={setPage}
                />
            </div>

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

export default PaymentHistory;
