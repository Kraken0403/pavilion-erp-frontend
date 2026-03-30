import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  Assessment,
  PictureAsPdf
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import Topbar from '../components/Topbar';
import {
  generateSalesReport,
  generateCustomerReport,
  generateProductReport,
  generateLeadReport,
  generateWorkOrderReport,
  generateDashboardReport,
  downloadReportPdf
} from '../services/reportService';
import { useSettings } from '../context/SettingsContext';
import { formatDate as formatLocalDate, toInputDateValue } from '../utils/dateFormatter';

const Reports = () => {
  const { settings } = useSettings();
  const isCateringBusiness = settings?.business_type === 'CATERING';

  const [reportType, setReportType] = useState('sales');
  const [salesType, setSalesType] = useState('combined'); // for sales report: invoices, quotations, combined
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toInputDateValue(d);
  });
  const [endDate, setEndDate] = useState(() => toInputDateValue(new Date()));

  const [reportData, setReportData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dashboardExtras, setDashboardExtras] = useState(null);
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dashboardMonthsRange, setDashboardMonthsRange] = useState(6);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  const rowsPerPage = 10;

  const panelSx = {
    borderRadius: 3,
    border: '1px solid #e0e7ef',
    boxShadow: '0 8px 32px rgba(16, 24, 40, 0.10)',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e6f0ff 100%)',
  };

  const formatDateSafe = (value) => {
    if (!value) return 'N/A';
    const formatted = formatLocalDate(value);
    return formatted || 'N/A';
  };

  const reportTypes = [
    { value: 'sales', label: 'Sales Report' },
    { value: 'dashboard', label: 'Dashboard (Monthly)' },
    { value: 'customers', label: 'Customer Report' },
    { value: 'products', label: 'Product Report' },
    // { value: 'leads', label: 'Lead Report' },
  ];

  if (isCateringBusiness) {
    reportTypes.push({ value: 'work-orders', label: 'Work Order Report' });
  }

  const loadReportData = useCallback(async () => {
    if (reportType !== 'dashboard' && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      return;
    }

    setError('');
    setReportData(null);
    setSummary(null);

    try {
      let result;

      switch (reportType) {
        case 'dashboard':
          result = await generateDashboardReport(dashboardMonth, dashboardMonthsRange);
          setReportData(result.trend || []);
          setSummary(result.summary || null);
          setDashboardExtras(result.data || null);
          return;
        case 'sales':
          result = await generateSalesReport(startDate, endDate, salesType);
          break;
        case 'customers':
          result = await generateCustomerReport(startDate, endDate);
          break;
        case 'products':
          result = await generateProductReport(startDate, endDate);
          break;
        case 'leads':
          result = await generateLeadReport(startDate, endDate);
          break;
        case 'work-orders':
          result = await generateWorkOrderReport(startDate, endDate);
          break;
        default:
          throw new Error('Invalid report type');
      }

      setReportData(result.data);
      setSummary(result.summary);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    }
  }, [reportType, salesType, startDate, endDate, dashboardMonth, dashboardMonthsRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    setPage(0);
  }, [reportType, salesType, startDate, endDate, reportData?.length, dashboardMonth, dashboardMonthsRange]);

  const paginatedReportData = Array.isArray(reportData)
    ? reportData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : [];

  const handleDownloadPdf = async () => {
    try {
      await downloadReportPdf(reportType, startDate, endDate, salesType);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    }
  };

  const handleExportExcel = () => {
    try {
      if (!Array.isArray(reportData) || reportData.length === 0) {
        setError('No data to export');
        return;
      }

      // Only product export is supported for Excel right now
      if (reportType !== 'products') {
        setError('Excel export currently supports Product Report only');
        return;
      }

      const sheetData = reportData.map((row) => ({
        'Product Name': row.product_name || '',
        'Quantity Sold': row.total_quantity_sold || 0,
        'Times Ordered': row.times_ordered || 0,
        'Avg Price': row.avg_price || 0,
        'Total Revenue': row.total_revenue || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, `products-report-${toInputDateValue(new Date())}.xlsx`);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setError('Failed to export Excel. Check console for details.');
    }
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    if (reportType === 'dashboard') {
      const s = summary;
      const cards = [
        { label: 'Leads', value: s.leadsCount ?? 0, sub: `${s.qualifiedLeads ?? 0} qualified` },
        { label: 'Quotations', value: s.quotationsCount ?? 0, sub: `${s.convertedLeads ?? 0} converted` },
        { label: 'Work Orders', value: s.workOrdersCount ?? 0, sub: `${s.pendingInvoicesCount ?? 0} pending invoices` },
        { label: 'Products', value: s.productsCount ?? 0, sub: 'Inventory & pricing' },
        { label: 'Pending KOTs', value: s.pendingKots ?? 0, sub: 'Kitchen ticket queue' },
        { label: 'Total Invoice Amount', value: `₹${parseFloat(s.totalInvoiceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: '' },
        { label: 'Collection Rate', value: `${parseFloat(s.collectionRate || 0).toFixed(0)}%`, sub: '' }
      ];

      return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {cards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  background: 'linear-gradient(130deg, #edf4ff 0%, #f8fbff 100%)',
                  border: '1px solid',
                  borderColor: '#c8ddff',
                  boxShadow: '0 6px 16px rgba(30, 64, 175, 0.08)',
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'text.primary' }}>
                    {card.value}
                  </Typography>
                  {card.sub ? (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{card.sub}</Typography>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }
  };

    const parseAmount = (value) => {
      const n = Number(value || 0);
      return Number.isFinite(n) ? n : 0;
    };

    const toStatusDistribution = (rows = []) => {
      const map = {};
      rows.forEach((row) => {
        const key = String(row?.status || 'unknown').trim() || 'unknown';
        map[key] = (map[key] || 0) + 1;
      });

      return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    };

    const getChartRows = () => {
      if (!Array.isArray(reportData) || !reportData.length) return [];

      if (reportType === 'sales') {
        return [...reportData]
          .map((row) => ({
            label: row.number || row.invoice_number || row.quotation_number || 'Unknown',
            value: parseAmount(row.total_amount),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
      }

      if (reportType === 'customers') {
        return [...reportData]
          .map((row) => ({
            label: row.customer_name || 'Unknown Customer',
            value: parseAmount(row.total_spent),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
      }

      if (reportType === 'products') {
        return [...reportData]
          .map((row) => ({
            label: row.product_name || 'Unknown Product',
            value: parseAmount(row.total_revenue),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
      }

      if (reportType === 'work-orders') {
        return toStatusDistribution(reportData);
      }

      if (reportType === 'dashboard') {
        return [...reportData].map((row) => ({
          label: row.month,
          value: Number(row.total_revenue || 0)
        }));
      }

      return [];
    };

    const renderCharts = () => {
      const rows = getChartRows();
      if (!rows.length) return null;

      const maxValue = Math.max(...rows.map((item) => Number(item.value || 0)), 1);
      const isCurrency = ['sales', 'customers', 'products'].includes(reportType);
      const palette = [
        'linear-gradient(90deg,#7dd3fc 0%,#60a5fa 100%)',
        'linear-gradient(90deg,#fbbf24 0%,#fb923c 100%)',
        'linear-gradient(90deg,#86efac 0%,#34d399 100%)',
        'linear-gradient(90deg,#f472b6 0%,#fb7185 100%)',
        'linear-gradient(90deg,#a78bfa 0%,#8b5cf6 100%)',
        'linear-gradient(90deg,#fda4af 0%,#f87171 100%)'
      ];
      const chartTitle = reportType === 'work-orders'
        ? 'Work Order Status Overview'
        : 'Top Performance Snapshot';

      return (
        <Paper sx={{ p: 3, mb: 3, ...panelSx }}>
          {reportType === 'dashboard' && dashboardExtras && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Top Products</Typography>
              {dashboardExtras.top_products && dashboardExtras.top_products.length ? (
                <Grid container spacing={1}>
                  {dashboardExtras.top_products.map((p, idx) => (
                    <Grid item key={idx} xs={12} sm={6} md={3}>
                      <Card sx={{ p: 1 }}>
                        <Typography variant="body2">{p.product_name}</Typography>
                        <Typography variant="h6">₹{parseFloat(p.total_revenue || 0).toLocaleString('en-IN')}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : null}
            </Box>
          )}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            {chartTitle}
          </Typography>
          <Grid container spacing={2}>
            {rows.map((item, index) => {
              const rawValue = Number(item.value || 0);
              const widthPercent = Math.max(4, Math.round((rawValue / maxValue) * 100));
              const labelValue = isCurrency
                ? `₹${rawValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                : rawValue.toLocaleString('en-IN');

              return (
                <Grid item xs={12} key={item.label}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {labelValue}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 12, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${widthPercent}%`,
                        borderRadius: 99,
                        background: palette[index % palette.length],
                        boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.06)'
                      }}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      );
    };

    const renderTable = () => {
      if (!reportData || reportData.length === 0) {
        return (
          <Alert severity="info" sx={{ mt: 2 }}>
            No data found for the selected date range.
          </Alert>
        );
      }

      // Different table structures based on report type
      switch (reportType) {
        case 'sales':
          return renderSalesTable();
        case 'customers':
          return renderCustomerTable();
        case 'products':
          return renderProductTable();
        case 'leads':
          return renderLeadTable();
        case 'work-orders':
          return renderWorkOrderTable();
        default:
          return null;
      }
    };

    const renderSalesTable = () => (
      <Table>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            <TableCell><strong>#</strong></TableCell>
            <TableCell><strong>Type</strong></TableCell>
            <TableCell><strong>Number</strong></TableCell>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Customer</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            {salesType === 'invoices' && <TableCell><strong>Payment</strong></TableCell>}
            <TableCell align="right"><strong>Amount</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReportData.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{page * rowsPerPage + index + 1}</TableCell>
              <TableCell>{row.type || 'N/A'}</TableCell>
              <TableCell><strong>{row.number || row.invoice_number || row.quotation_number}</strong></TableCell>
              <TableCell>{formatDateSafe(row.date || row.invoice_date || row.quotation_date)}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>
                {(() => {
                  const statusKey = String(row.status || '').trim().toLowerCase();
                  let chipColor = 'default';
                  if (statusKey === 'paid') chipColor = 'success';
                  else if (statusKey === 'issued') chipColor = 'info';
                  else if (statusKey === 'overdue') chipColor = 'error';
                  else if (statusKey === 'approved') chipColor = 'success';
                  return (
                    <Chip label={row.status} size="small" color={chipColor} sx={{ fontWeight: 700, textTransform: 'uppercase' }} />
                  )
                })()}
              </TableCell>
              {salesType === 'invoices' && (
                <TableCell>
                  {(() => {
                    const payKey = String(row.payment_status || '').trim().toLowerCase();
                    const payColor = payKey === 'paid' ? 'success' : (payKey === 'pending' ? 'warning' : 'default');
                    return <Chip label={row.payment_status} size="small" color={payColor} sx={{ fontWeight: 700, textTransform: 'uppercase' }} />
                  })()}
                </TableCell>
              )}
              <TableCell align="right">
                <strong>₹{parseFloat(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    const renderCustomerTable = () => (
      <Table>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            <TableCell><strong>#</strong></TableCell>
            <TableCell><strong>Customer</strong></TableCell>
            <TableCell><strong>Email</strong></TableCell>
            <TableCell><strong>Phone</strong></TableCell>
            <TableCell align="center"><strong>Invoices</strong></TableCell>
            <TableCell align="right"><strong>Total Spent</strong></TableCell>
            <TableCell align="right"><strong>Paid</strong></TableCell>
            <TableCell align="right"><strong>Pending</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReportData.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{page * rowsPerPage + index + 1}</TableCell>
              <TableCell><strong>{row.customer_name}</strong></TableCell>
              <TableCell>{row.customer_email || 'N/A'}</TableCell>
              <TableCell>{row.customer_phone || 'N/A'}</TableCell>
              <TableCell align="center">{row.total_invoices}</TableCell>
              <TableCell align="right">
                <strong>₹{parseFloat(row.total_spent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </TableCell>
              <TableCell align="right">₹{parseFloat(row.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell align="right" sx={{ color: parseFloat(row.pending_amount) > 0 ? 'error.main' : 'inherit' }}>
                ₹{parseFloat(row.pending_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    const renderProductTable = () => (
      <Table>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            <TableCell><strong>#</strong></TableCell>
            <TableCell><strong>Product Name</strong></TableCell>
            <TableCell align="center"><strong>Quantity Sold</strong></TableCell>
            <TableCell align="center"><strong>Times Ordered</strong></TableCell>
            <TableCell align="right"><strong>Avg Price</strong></TableCell>
            <TableCell align="right"><strong>Total Revenue</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReportData.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{page * rowsPerPage + index + 1}</TableCell>
              <TableCell><strong>{row.product_name}</strong></TableCell>
              <TableCell align="center">{row.total_quantity_sold}</TableCell>
              <TableCell align="center">{row.times_ordered}</TableCell>
              <TableCell align="right">₹{parseFloat(row.avg_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell align="right">
                <strong>₹{parseFloat(row.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    const renderLeadTable = () => (
      <Table>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Source</strong></TableCell>
            <TableCell align="right"><strong>Converted</strong></TableCell>
            <TableCell align="right"><strong>Conv. Rate</strong></TableCell>
            <TableCell><strong>Assigned Users</strong></TableCell>
            <TableCell align="right"><strong>Count</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReportData.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    bgcolor: '#e3f2fd',
                    color: '#0d47a1'
                  }}
                >
                  {row.status}
                </Box>
              </TableCell>
              <TableCell>{row.source || 'N/A'}</TableCell>
              <TableCell align="right"><strong>{row.converted_count ?? 0}</strong></TableCell>
              <TableCell align="right">{row.conversion_rate || '0%'}</TableCell>
              <TableCell>{row.assigned_users || 'N/A'}</TableCell>
              <TableCell align="right"><strong>{row.count}</strong></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    const renderWorkOrderTable = () => (
      <Table>
        <TableHead>
          <TableRow sx={{ background: '#f5f5f5' }}>
            <TableCell><strong>#</strong></TableCell>
            <TableCell><strong>WO Number</strong></TableCell>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Customer</strong></TableCell>
            <TableCell><strong>Mode</strong></TableCell>
            <TableCell><strong>Event Date</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell align="right"><strong>Amount</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReportData.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{page * rowsPerPage + index + 1}</TableCell>
              <TableCell><strong>{row.work_order_number}</strong></TableCell>
              <TableCell>{formatDateSafe(row.work_order_date || row.issue_date)}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    bgcolor: row.mode === 'CATERING' ? '#fff3cd' : '#d1ecf1',
                    color: row.mode === 'CATERING' ? '#856404' : '#0c5460'
                  }}
                >
                  {row.mode}
                </Box>
              </TableCell>
              <TableCell>{formatDateSafe(row.event_date)}</TableCell>
              <TableCell>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    bgcolor: row.status === 'completed' ? '#d4edda' : '#fff3cd',
                    color: row.status === 'completed' ? '#155724' : '#856404'
                  }}
                >
                  {row.status}
                </Box>
              </TableCell>
              <TableCell align="right">
                <strong>₹{parseFloat(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    return (
      <>
        <Topbar />
        <Box sx={{ background: '#f4f6f9', minHeight: '100vh', py: 4 }}>
          <Container maxWidth="xl">
            <Paper sx={{ p: 3, mb: 3, ...panelSx }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assessment sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                      Reports
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#5b6b82' }}>
                      Generate analytics, exports and snapshots for your business.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" onClick={loadReportData} sx={{ fontWeight: 700 }}>
                    Generate
                  </Button>
                  <Button variant="contained" color="primary" startIcon={<PictureAsPdf />} onClick={handleDownloadPdf} sx={{ fontWeight: 700 }}>
                    Export PDF
                  </Button>
                  <Button variant="contained" color="success" onClick={handleExportExcel} sx={{ fontWeight: 700 }}>
                    Export Excel
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Filter Section */}
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Report Type"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fbfcff', borderRadius: 1 } }}
                  >
                    {reportTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {reportType === 'sales' && (
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      select
                      fullWidth
                      label="Sales Type"
                      value={salesType}
                      onChange={(e) => setSalesType(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="combined">Combined</MenuItem>
                      <MenuItem value="invoices">Invoices Only</MenuItem>
                      <MenuItem value="quotations">Quotations Only</MenuItem>
                    </TextField>
                  </Grid>
                )}

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    type="date"
                    fullWidth
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 1 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    type="date"
                    fullWidth
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 1 } }}
                  />
                </Grid>

                {reportType === 'dashboard' && (
                  <>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        type="month"
                        fullWidth
                        label="Target Month"
                        value={dashboardMonth}
                        onChange={(e) => setDashboardMonth(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        type="number"
                        fullWidth
                        label="Months Range"
                        value={dashboardMonthsRange}
                        onChange={(e) => setDashboardMonthsRange(Number(e.target.value || 6))}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Grid>
                  </>
                )}

                {/* <Grid item xs={12} sm={6} md={2}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{
                    backgroundColor: 'primary.main',
                    '&.Mui-disabled': {
                      color: '#fff',
                      opacity: 0.9,
                    }
                  }}
                >
                  {loading ? 'Applying...' : 'Auto Applied'}
                </Button>
              </Grid> */}

                {reportData && reportType !== 'dashboard' && (
                  <Grid item xs={12} sm={6} md={2}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={handleDownloadPdf}
                      startIcon={<PictureAsPdf />}
                      color="error"
                    >
                      PDF
                    </Button>
                  </Grid>
                )}

                {reportData && reportType === 'products' && (
                  <Grid item xs={12} sm={6} md={2}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={handleExportExcel}
                      color="success"
                    >
                      Excel
                    </Button>
                  </Grid>
                )}
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>

            {/* Summary Cards */}
            {renderSummaryCards()}
            {/* Quick Chart Placeholder (for trends, analytics) */}
            {/* You can add a chart library like recharts or chart.js here for more visuals */}
            {/* Example: <BarChart data={...} /> or <LineChart data={...} /> */}

            {/* Quick Charts */}
            {renderCharts()}
            {/* Donut/Pie Chart Placeholder for status/source distribution */}
            {/* Example: <PieChart data={...} /> */}

            {reportType === 'dashboard' && dashboardExtras && dashboardExtras.pending_invoices && (
              <Paper sx={{ p: 3, mb: 3, ...panelSx }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Pending Invoices</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Pending</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardExtras.pending_invoices.map((row, idx) => (
                        <TableRow key={row.id || idx} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell><strong>{row.invoice_number}</strong></TableCell>
                          <TableCell>{formatDateSafe(row.issue_date)}</TableCell>
                          <TableCell>{row.customer_name}</TableCell>
                          <TableCell align="right">₹{parseFloat(row.pending_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            )}

            {/* Report Table */}
            {reportData && (
              <Paper sx={{ p: 3, ...panelSx }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Report Data
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  {renderTable()}
                </Box>
                {Array.isArray(reportData) && reportData.length > rowsPerPage && (
                  <TablePagination
                    component="div"
                    count={reportData.length}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10]}
                  />
                )}
              </Paper>
            )}
          </Container>
        </Box>
      </>
    );
  };
export default Reports;
