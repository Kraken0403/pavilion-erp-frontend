import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Topbar from '../components/Topbar';
import PageLoader from '../components/ui/PageLoader';
import { generateDashboardReport } from '../services/reportService';
import { getInvoices, getProformaInvoices } from '../services/invoiceService';
import { getPendingPaymentReminders } from '../services/paymentReminderService';
import { formatDate } from '../utils/dateFormatter';

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardReport, invoiceRows, proformaRows, pendingResponse] = await Promise.allSettled([
        generateDashboardReport(undefined, 6),
        getInvoices(),
        getProformaInvoices(),
        getPendingPaymentReminders(),
      ]);

      if (dashboardReport.status === 'fulfilled') {
        setDashboard(dashboardReport.value || null);
      } else {
        console.warn('Dashboard report failed:', dashboardReport.reason);
      }

      setInvoices(invoiceRows.status === 'fulfilled' && Array.isArray(invoiceRows.value) ? invoiceRows.value : []);
      setProformas(proformaRows.status === 'fulfilled' && Array.isArray(proformaRows.value) ? proformaRows.value : []);
      setPendingPayments(
        pendingResponse.status === 'fulfilled' && Array.isArray(pendingResponse.value?.pending_payments)
          ? pendingResponse.value.pending_payments
          : []
      );

      if (dashboardReport.status === 'rejected' && invoiceRows.status === 'rejected') {
        setError('Failed to load dashboard data. Please refresh once the API is reachable.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totals = useMemo(() => {
    const paidInvoices = invoices.filter((item) => String(item?.status || '').toLowerCase() === 'paid');
    const pendingAmount = pendingPayments.reduce((sum, item) => sum + Number(item?.balance_due || 0), 0);
    const invoiceAmount = invoices.reduce((sum, item) => sum + Number(item?.grand_total || 0), 0);

    return {
      invoiceCount: invoices.length,
      proformaCount: proformas.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingPayments.length,
      pendingAmount,
      invoiceAmount,
    };
  }, [invoices, proformas, pendingPayments]);

  const summary = dashboard?.summary || {};
  const trendRows = Array.isArray(dashboard?.trend) ? dashboard.trend : [];
  const topProducts = Array.isArray(dashboard?.data?.top_products) ? dashboard.data.top_products : [];
  const pendingInvoiceRows = pendingPayments.slice(0, 6);
  const maxTrendRevenue = Math.max(...trendRows.map((row) => Number(row.total_revenue || 0)), 1);
  const maxProductRevenue = Math.max(...topProducts.map((row) => Number(row.total_revenue || 0)), 1);

  const statCards = [
    {
      label: 'Invoice Value',
      value: formatCurrency(summary.totalInvoiceAmount ?? totals.invoiceAmount),
      hint: `${formatNumber(totals.invoiceCount)} invoices`,
      icon: ReceiptLongIcon,
      path: '/invoices',
    },
    {
      label: 'Proforma Invoices',
      value: formatNumber(totals.proformaCount),
      hint: 'Open estimates and conversions',
      icon: RequestQuoteIcon,
      path: '/proforma-invoices',
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(totals.pendingAmount),
      hint: `${formatNumber(totals.pendingCount)} invoices pending`,
      icon: PaymentsIcon,
      path: '/payments',
    },
    {
      label: 'Collection Rate',
      value: `${Number(summary.collectionRate || 0).toFixed(0)}%`,
      hint: `${formatNumber(totals.paidCount)} paid invoices`,
      icon: AssessmentIcon,
      path: '/reports',
    },
  ];

  return (
    <div className="dashboard-page">
      <Topbar />

      <section className="dashboard-hero-card">
        <div>
          <p className="dashboard-kicker">ERP Overview</p>
          <h1>Track quotations, invoices, payments, and operations from one place.</h1>
          <p>
            This dashboard is built around the modules you asked for: invoices, proforma invoices,
            pending payments, reminders, and reports.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="primary-btn" onClick={() => navigate('/invoices/create')}>Create Invoice</button>
          <button className="secondary-btn" onClick={() => navigate('/reports')}>Open Reports</button>
        </div>
      </section>

      {error ? <div className="dashboard-error"><WarningAmberIcon /> {error}</div> : null}

      {loading ? (
        <div className="dashboard-loader-card">
          <PageLoader message="Loading ERP dashboard..." minHeight={260} />
        </div>
      ) : (
        <>
          <section className="dashboard-stats-grid">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <button type="button" className="dashboard-stat-card" key={card.label} onClick={() => navigate(card.path)}>
                  <span className="dashboard-stat-icon"><Icon /></span>
                  <span className="dashboard-stat-copy">
                    <span className="dashboard-stat-label">{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.hint}</small>
                  </span>
                </button>
              );
            })}
          </section>

          <section className="dashboard-grid-two">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h3>Revenue Trend</h3>
                  <p>Last 6 months invoice movement</p>
                </div>
                <button className="secondary-btn" onClick={() => navigate('/reports')}>View Reports</button>
              </div>
              <div className="dashboard-bars">
                {trendRows.length ? trendRows.map((row) => {
                  const revenue = Number(row.total_revenue || 0);
                  const width = Math.max(4, Math.round((revenue / maxTrendRevenue) * 100));
                  return (
                    <div className="dashboard-bar-row" key={row.month}>
                      <div className="dashboard-bar-label">{row.month}</div>
                      <div className="dashboard-bar-track"><span style={{ width: `${width}%` }} /></div>
                      <div className="dashboard-bar-value">{formatCurrency(revenue)}</div>
                    </div>
                  );
                }) : (
                  <div className="dashboard-empty-state">No revenue trend available yet.</div>
                )}
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h3>Top Products</h3>
                  <p>Highest revenue products from reports</p>
                </div>
                <Inventory2Icon className="dashboard-panel-icon" />
              </div>
              <div className="dashboard-product-list">
                {topProducts.length ? topProducts.slice(0, 6).map((product) => {
                  const revenue = Number(product.total_revenue || 0);
                  const width = Math.max(4, Math.round((revenue / maxProductRevenue) * 100));
                  return (
                    <div className="dashboard-product-item" key={product.product_name}>
                      <div className="dashboard-product-head">
                        <strong>{product.product_name || 'Unknown Product'}</strong>
                        <span>{formatCurrency(revenue)}</span>
                      </div>
                      <div className="dashboard-mini-track"><span style={{ width: `${width}%` }} /></div>
                    </div>
                  );
                }) : (
                  <div className="dashboard-empty-state">No top product data available yet.</div>
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h3>Pending Payment Queue</h3>
                <p>Invoices that need collection or reminders</p>
              </div>
              <button className="primary-btn" onClick={() => navigate('/payment-reminders')}>Send Reminders</button>
            </div>
            <div className="dashboard-table-wrap">
              <table className="leads-table dashboard-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Due Date</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoiceRows.length ? pendingInvoiceRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.invoice_number}</td>
                      <td>{row.customer_name || '—'}</td>
                      <td>{row.due_date ? formatDate(row.due_date) : '—'}</td>
                      <td>{formatCurrency(row.grand_total)}</td>
                      <td>{formatCurrency(row.balance_due)}</td>
                      <td>
                        <button className="secondary-btn" onClick={() => navigate(`/invoices/${row.id}`)}>Open</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="table-empty-message">No pending payments right now.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
