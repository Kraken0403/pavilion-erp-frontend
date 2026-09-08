import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadOutlined, PictureAsPdfOutlined, RefreshOutlined } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import HubSpotListing from '../components/ui/HubSpotListing';
import FormattedDateInput from '../components/ui/FormattedDateInput';
import {
  generateSalesReport,
  generateCustomerReport,
  generateProductReport,
  generateWorkOrderReport,
  generateDashboardReport,
  downloadReportPdf
} from '../services/reportService';
import { useSettings } from '../context/SettingsContext';
import { toInputDateValue } from '../utils/dateFormatter';
import { formatCurrency } from '../utils/currencyUtils';
import '../assets/styles/Reports.scss';

const reportTabs = [
  { value: 'data', label: 'All Report Data' },
  { value: 'summary', label: 'Summary' }
];

const reportFields = {
  sales: [
    { key: 'type', label: 'Type' },
    { key: 'number', label: 'Number' },
    { key: 'date', label: 'Date' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'total_amount', label: 'Total amount' },
    { key: 'status', label: 'Status' },
    { key: 'source_type', label: 'Source' }
  ],
  customers: [
    { key: 'customer_name', label: 'Customer' },
    { key: 'customer_email', label: 'Email' },
    { key: 'customer_phone', label: 'Phone' },
    { key: 'total_invoices', label: 'Invoices' },
    { key: 'total_spent', label: 'Total spent' },
    { key: 'paid_amount', label: 'Paid amount' },
    { key: 'pending_amount', label: 'Pending amount' },
    { key: 'last_transaction_date', label: 'Last transaction' }
  ],
  products: [
    { key: 'product_name', label: 'Product' },
    { key: 'total_quantity_sold', label: 'Quantity sold' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'times_ordered', label: 'Times ordered' },
    { key: 'avg_price', label: 'Average price' }
  ],
  'work-orders': [
    { key: 'work_order_number', label: 'Work order' },
    { key: 'work_order_date', label: 'Date' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'total_amount', label: 'Total amount' },
    { key: 'status', label: 'Status' },
    { key: 'mode', label: 'Mode' },
    { key: 'event_date', label: 'Event date' },
    { key: 'venue', label: 'Venue' }
  ],
  dashboard: [
    { key: 'month', label: 'Month' },
    { key: 'invoices_count', label: 'Invoices' },
    { key: 'total_revenue', label: 'Revenue' },
    { key: 'total_tax', label: 'Tax' }
  ]
};

const Reports = () => {
  const { settings } = useSettings();
  const isCatering = settings?.business_type === 'CATERING';
  const currencyCode = settings?.currency_code || 'INR';
  const [activeTab, setActiveTab] = useState('data');
  const [reportType, setReportType] = useState('sales');
  const [salesType, setSalesType] = useState('combined');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toInputDateValue(date);
  });
  const [endDate, setEndDate] = useState(() => toInputDateValue(new Date()));
  const [dashboardMonth, setDashboardMonth] = useState(() => toInputDateValue(new Date()).slice(0, 7));
  const [dashboardMonths, setDashboardMonths] = useState(6);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [dashboardExtras, setDashboardExtras] = useState({});
  const [error, setError] = useState('');

  const reportTypes = useMemo(() => [
    { value: 'sales', label: 'Sales report' },
    { value: 'dashboard', label: 'Dashboard (monthly)' },
    { value: 'customers', label: 'Customer report' },
    { value: 'products', label: 'Product report' },
    ...(isCatering ? [{ value: 'work-orders', label: 'Work order report' }] : [])
  ], [isCatering]);

  const loadReport = useCallback(async () => {
    if (reportType !== 'dashboard' && (!startDate || !endDate)) {
      setError('Select both a start date and an end date.');
      return;
    }

    setError('');
    try {
      let result;
      if (reportType === 'sales') result = await generateSalesReport(startDate, endDate, salesType);
      else if (reportType === 'customers') result = await generateCustomerReport(startDate, endDate);
      else if (reportType === 'products') result = await generateProductReport(startDate, endDate);
      else if (reportType === 'work-orders') result = await generateWorkOrderReport(startDate, endDate);
      else result = await generateDashboardReport(dashboardMonth, dashboardMonths);

      const dataRows = reportType === 'dashboard' ? (result?.trend || []) : (result?.data || []);
      setRows(dataRows.map((row, index) => ({
        ...row,
        ...(reportType === 'sales' ? {
          type: row.type || (row.invoice_number ? 'Invoice' : 'Quotation'),
          number: row.number || row.invoice_number || row.quotation_number
        } : {}),
        id: row.id ?? row.number ?? row.invoice_number ?? row.quotation_number
          ?? row.work_order_number ?? row.customer_email ?? row.product_name ?? `report-${index}`
      })));
      setSummary(result?.summary || {});
      setDashboardExtras(reportType === 'dashboard' ? (result?.data || {}) : {});
    } catch (requestError) {
      setRows([]);
      setSummary({});
      setDashboardExtras({});
      setError(requestError?.response?.data?.error || requestError?.message || 'Failed to load report.');
    }
  }, [dashboardMonth, dashboardMonths, endDate, reportType, salesType, startDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(rows.map(({ id, ...row }) => row));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Report');
    XLSX.writeFile(book, `${reportType}-report.xlsx`);
  };

  const exportPdf = async () => {
    try {
      setError('');
      await downloadReportPdf(reportType, startDate, endDate, salesType);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Failed to export report PDF.');
    }
  };

  const money = useCallback((value) => formatCurrency(value || 0, currencyCode), [currencyCode]);
  const summaryCards = useMemo(() => {
    if (reportType === 'sales') return [
      { label: 'Total records', value: summary.totalRecords || 0 },
      { label: 'Total revenue', value: money(summary.totalRevenue) },
      { label: 'Report type', value: String(summary.reportType || salesType).replace(/_/g, ' ') }
    ];
    if (reportType === 'customers') return [
      { label: 'Total customers', value: summary.totalCustomers || 0 },
      { label: 'Total revenue', value: money(summary.totalRevenue) },
      { label: 'Average customer value', value: money((summary.totalRevenue || 0) / Math.max(summary.totalCustomers || 0, 1)) }
    ];
    if (reportType === 'products') return [
      { label: 'Total products', value: summary.totalProducts || 0 },
      { label: 'Quantity sold', value: summary.totalQuantitySold || 0 },
      { label: 'Total revenue', value: money(summary.totalRevenue) }
    ];
    if (reportType === 'work-orders') return [
      { label: 'Total work orders', value: summary.totalWorkOrders || 0 },
      { label: 'Catering orders', value: summary.cateringOrders || 0 },
      { label: 'General orders', value: summary.generalOrders || 0 },
      { label: 'Total revenue', value: money(summary.totalRevenue) }
    ];
    return [
      { label: 'Invoices', value: summary.invoicesCount || 0 },
      { label: 'Total revenue', value: money(summary.totalRevenue) },
      { label: 'Total tax', value: money(summary.totalTax) },
      { label: 'Collection rate', value: `${Number(summary.collectionRate || 0).toFixed(1)}%` },
      { label: 'Quotations', value: summary.quotationsCount || 0 },
      { label: 'Work orders', value: summary.workOrdersCount || 0 }
    ];
  }, [money, reportType, salesType, summary]);

  const chartRows = useMemo(() => {
    if (reportType === 'dashboard') return rows.slice(-6).map((row) => ({ label: row.month, value: Number(row.total_revenue || 0) }));
    if (reportType === 'customers') return rows.slice(0, 6).map((row) => ({ label: row.customer_name, value: Number(row.total_spent || 0) }));
    if (reportType === 'products') return rows.slice(0, 6).map((row) => ({ label: row.product_name, value: Number(row.total_revenue || 0) }));
    if (reportType === 'work-orders') {
      const counts = rows.reduce((result, row) => ({ ...result, [row.status || 'Unknown']: (result[row.status || 'Unknown'] || 0) + 1 }), {});
      return Object.entries(counts).map(([label, value]) => ({ label, value }));
    }
    return rows.slice(0, 6).map((row) => ({
      label: row.number || row.invoice_number || row.quotation_number || 'Record',
      value: Number(row.total_amount || 0)
    }));
  }, [reportType, rows]);
  const chartMax = Math.max(...chartRows.map((row) => row.value), 1);

  const filterBar = <div className="reports-filters">
    <label><span>Report</span><select value={reportType} onChange={(event) => setReportType(event.target.value)}>{reportTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {reportType === 'sales' && <label><span>Sales data</span><select value={salesType} onChange={(event) => setSalesType(event.target.value)}><option value="combined">Invoices & quotations</option><option value="invoices">Invoices only</option><option value="quotations">Quotations only</option></select></label>}
    {reportType === 'dashboard' ? <>
      <label><span>Month</span><input type="month" value={dashboardMonth} onChange={(event) => setDashboardMonth(event.target.value)} /></label>
      <label><span>Trend range</span><select value={dashboardMonths} onChange={(event) => setDashboardMonths(Number(event.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select></label>
    </> : <>
      <label><span>From</span><FormattedDateInput name="report_start_date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label><span>To</span><FormattedDateInput name="report_end_date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </>}
    <button type="button" onClick={loadReport}><RefreshOutlined />Refresh</button>
    {error && <div className="reports-error">{error}</div>}
  </div>;

  const actions = <>
    {reportType !== 'dashboard' && <button className="reports-action" type="button" onClick={exportPdf}><PictureAsPdfOutlined />Export PDF</button>}
    <button className="reports-action" type="button" onClick={exportExcel} disabled={!rows.length}><DownloadOutlined />Export Excel</button>
  </>;

  const summaryView = <div className="reports-summary">
    <div className="reports-summary__cards">{summaryCards.map((card) => <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong></article>)}</div>
    <section className="reports-summary__chart">
      <div><h2>{reportTypes.find((type) => type.value === reportType)?.label} summary</h2><p>Based on the filters selected above.</p></div>
      {chartRows.length ? <div className="reports-bars">{chartRows.map((row) => <div className="reports-bar" key={row.label}><span title={row.label}>{row.label}</span><i><b style={{ width: `${Math.max((row.value / chartMax) * 100, 2)}%` }} /></i><strong>{reportType === 'work-orders' ? row.value : money(row.value)}</strong></div>)}</div> : <p className="reports-empty">No summary data matches the current filters.</p>}
    </section>
    {reportType === 'dashboard' && dashboardExtras?.top_products?.length > 0 && <section className="reports-summary__chart"><div><h2>Top products</h2><p>Highest revenue products in the selected month.</p></div><div className="reports-bars">{dashboardExtras.top_products.map((row) => <div className="reports-bar" key={row.product_name}><span>{row.product_name}</span><i><b style={{ width: `${Math.max((Number(row.total_revenue || 0) / Math.max(...dashboardExtras.top_products.map((item) => Number(item.total_revenue || 0)), 1)) * 100, 2)}%` }} /></i><strong>{money(row.total_revenue)}</strong></div>)}</div></section>}
  </div>;

  return <div className="reports-page">
    <HubSpotListing
      key={reportType}
      title="Reports"
      rows={rows}
      initialFields={reportFields[reportType] || []}
      tabs={reportTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={actions}
      headerContent={filterBar}
      customContent={activeTab === 'summary' ? summaryView : null}
      onRefresh={loadReport}
      storageKey={`pav-erp:list:reports-${reportType}`}
    />
  </div>;
};

export default Reports;
