import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentOutlined, Inventory2Outlined, PaymentsOutlined, ReceiptLongOutlined, RefreshOutlined, RequestQuoteOutlined, StarBorderOutlined, TuneOutlined, WarningAmberOutlined } from '@mui/icons-material';
import Topbar from '../components/Topbar';
import PageLoader from '../components/ui/PageLoader';
import { generateDashboardReport } from '../services/reportService';
import { getInvoices, getProformaInvoices } from '../services/invoiceService';
import { getPendingPaymentReminders } from '../services/paymentReminderService';
import { formatDate } from '../utils/dateFormatter';
import { formatCurrency } from '../utils/currencyUtils';
import { useSettings } from '../context/SettingsContext';
import '../assets/styles/Dashboard.scss';

const number = (value) => Number(value || 0).toLocaleString('en-IN');

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const money = (value) => formatCurrency(value, settings?.currency_code || 'INR', { maximumFractionDigits: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [proformas, setProformas] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('');
    const [report, invoiceRows, proformaRows, reminders] = await Promise.allSettled([generateDashboardReport(undefined, 6), getInvoices(), getProformaInvoices(), getPendingPaymentReminders()]);
    if (report.status === 'fulfilled') setDashboard(report.value || null);
    setInvoices(invoiceRows.status === 'fulfilled' && Array.isArray(invoiceRows.value) ? invoiceRows.value : []);
    setProformas(proformaRows.status === 'fulfilled' && Array.isArray(proformaRows.value) ? proformaRows.value : []);
    setPendingPayments(reminders.status === 'fulfilled' && Array.isArray(reminders.value?.pending_payments) ? reminders.value.pending_payments : []);
    if (report.status === 'rejected' && invoiceRows.status === 'rejected') setError('Unable to load dashboard data. Please refresh once the API is reachable.');
    setLoading(false);
  }, []);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const totals = useMemo(() => ({
    invoiceValue:invoices.reduce((sum, row) => sum + Number(row?.grand_total || 0), 0), invoiceCount:invoices.length, proformaCount:proformas.length,
    paidCount:invoices.filter((row) => String(row?.status || '').toLowerCase() === 'paid').length,
    pendingAmount:pendingPayments.reduce((sum, row) => sum + Number(row?.balance_due || 0), 0), pendingCount:pendingPayments.length,
  }), [invoices, proformas, pendingPayments]);
  const summary = dashboard?.summary || {};
  const trendRows = Array.isArray(dashboard?.trend) ? dashboard.trend : [];
  const topProducts = Array.isArray(dashboard?.data?.top_products) ? dashboard.data.top_products : [];
  const maxTrend = Math.max(...trendRows.map((row) => Number(row.total_revenue || 0)), 1);
  const maxProduct = Math.max(...topProducts.map((row) => Number(row.total_revenue || 0)), 1);
  const metrics = [
    { label:'Invoice value', value:money(summary.totalInvoiceAmount ?? totals.invoiceValue), meta:`${number(totals.invoiceCount)} invoices`, icon:ReceiptLongOutlined, path:'/invoices' },
    { label:'Proforma invoices', value:number(totals.proformaCount), meta:'Open estimates and conversions', icon:RequestQuoteOutlined, path:'/proforma-invoices' },
    { label:'Pending payments', value:money(totals.pendingAmount), meta:`${number(totals.pendingCount)} invoices pending`, icon:PaymentsOutlined, path:'/payments' },
    { label:'Collection rate', value:`${Number(summary.collectionRate || 0).toFixed(0)}%`, meta:`${number(totals.paidCount)} paid invoices`, icon:AssessmentOutlined, path:'/reports' },
  ];

  return <div className="hs-dashboard">
    <Topbar />
    <header className="hs-dashboard__header"><div className="hs-dashboard__title"><StarBorderOutlined /><div><h1>Business overview</h1><p>Sales, collections, and operational activity.</p></div></div><div><button className="secondary-btn" onClick={() => navigate('/reports')}>Manage reports</button><button className="hs-listing__create" onClick={() => navigate('/invoices?create=1')}><ReceiptLongOutlined />Create invoice</button></div></header>
    <nav className="hs-dashboard__filterbar"><button type="button">Quick filters</button><button type="button">Date range</button><i /><button type="button"><TuneOutlined />Advanced filters</button><button type="button" className="hs-dashboard__refresh" title="Refresh" onClick={loadDashboard}><RefreshOutlined /></button></nav>
    {error && <div className="hs-dashboard__notice"><WarningAmberOutlined />{error}</div>}
    {loading ? <section className="hs-dashboard__loading"><PageLoader message="Loading dashboard…" minHeight={260} /></section> : <>
      <section className="hs-dashboard__metrics">{metrics.map((metric) => { const Icon = metric.icon; return <button key={metric.label} type="button" onClick={() => navigate(metric.path)}><span><Icon /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.meta}</em></div></button>; })}</section>
      <section className="hs-dashboard__grid"><article className="hs-dashboard__card"><header><div><h2>Revenue trend</h2><p>Invoice movement over the last six months</p></div><button className="secondary-btn" onClick={() => navigate('/reports')}>View reports</button></header><div className="hs-dashboard__bars">{trendRows.length ? trendRows.map((row) => <div key={row.month}><span>{row.month}</span><i><b style={{ width:`${Math.max(3, Math.round(Number(row.total_revenue || 0) / maxTrend * 100))}%` }} /></i><strong>{money(row.total_revenue)}</strong></div>) : <p className="hs-dashboard__empty">No revenue trend available yet.</p>}</div></article><article className="hs-dashboard__card"><header><div><h2>Top products</h2><p>Highest revenue products</p></div><Inventory2Outlined /></header><div className="hs-dashboard__products">{topProducts.length ? topProducts.slice(0, 6).map((product) => <div key={product.product_name}><p><strong>{product.product_name || 'Unknown product'}</strong><span>{money(product.total_revenue)}</span></p><i><b style={{ width:`${Math.max(3, Math.round(Number(product.total_revenue || 0) / maxProduct * 100))}%` }} /></i></div>) : <p className="hs-dashboard__empty">No product data available yet.</p>}</div></article></section>
      <section className="hs-dashboard__card hs-dashboard__card--table"><header><div><h2>Pending payment queue</h2><p>Invoices that need collection or a reminder</p></div><button className="hs-listing__create" onClick={() => navigate('/payment-reminders')}>Send reminders</button></header><div className="hs-dashboard__table"><table><thead><tr><th>Invoice #</th><th>Customer</th><th>Due date</th><th>Total</th><th>Pending</th><th /></tr></thead><tbody>{pendingPayments.slice(0, 6).length ? pendingPayments.slice(0, 6).map((row) => <tr key={row.id}><td>{row.invoice_number}</td><td>{row.customer_name || '—'}</td><td>{row.due_date ? formatDate(row.due_date) : '—'}</td><td>{money(row.grand_total)}</td><td>{money(row.balance_due)}</td><td><button onClick={() => navigate(`/invoices/${row.id}`)}>Open</button></td></tr>) : <tr><td colSpan="6" className="hs-dashboard__empty">No pending payments right now.</td></tr>}</tbody></table></div></section>
    </>}
  </div>;
}
