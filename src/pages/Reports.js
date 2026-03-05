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
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Assessment,
  PictureAsPdf
} from '@mui/icons-material';
import Topbar from '../components/Topbar';
import {
  generateSalesReport,
  generateCustomerReport,
  generateProductReport,
  generateLeadReport,
  generateWorkOrderReport,
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

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  const rowsPerPage = 10;

  const formatDateSafe = (value) => {
    if (!value) return 'N/A';
    const formatted = formatLocalDate(value);
    return formatted || 'N/A';
  };

  const reportTypes = [
    { value: 'sales', label: 'Sales Report' },
    { value: 'customers', label: 'Customer Report' },
    { value: 'products', label: 'Product Report' },
    // { value: 'leads', label: 'Lead Report' },
  ];

  if (isCateringBusiness) {
    reportTypes.push({ value: 'work-orders', label: 'Work Order Report' });
  }

  const loadReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);
    setSummary(null);

    try {
      let result;

      switch (reportType) {
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
    } finally {
      setLoading(false);
    }
  }, [reportType, salesType, startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    setPage(0);
  }, [reportType, salesType, startDate, endDate, reportData?.length]);

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

  const renderSummaryCards = () => {
    if (!summary) return null;

    const cards = [];

    // Common summary fields
    if (summary.totalRecords !== undefined) {
      cards.push({ label: 'Total Records', value: summary.totalRecords });
    }
    if (summary.totalRevenue !== undefined) {
      cards.push({ label: 'Total Revenue', value: `₹${parseFloat(summary.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` });
    }
    if (summary.totalCustomers !== undefined) {
      cards.push({ label: 'Total Customers', value: summary.totalCustomers });
    }
    if (summary.totalProducts !== undefined) {
      cards.push({ label: 'Total Products', value: summary.totalProducts });
    }
    if (summary.totalQuantitySold !== undefined) {
      cards.push({ label: 'Quantity Sold', value: summary.totalQuantitySold });
    }
    if (summary.totalLeads !== undefined) {
      cards.push({ label: 'Total Leads', value: summary.totalLeads });
    }
    if (summary.convertedLeads !== undefined) {
      cards.push({ label: 'Converted Leads', value: summary.convertedLeads });
    }
    if (summary.conversionRate !== undefined) {
      cards.push({ label: 'Conversion Rate', value: summary.conversionRate });
    }
    if (summary.topSource !== undefined) {
      cards.push({ label: 'Top Source', value: summary.topSource });
    }
    if (summary.topStatus !== undefined) {
      cards.push({ label: 'Top Status', value: summary.topStatus });
    }
    if (summary.totalWorkOrders !== undefined) {
      cards.push({ label: 'Total Work Orders', value: summary.totalWorkOrders });
    }
    if (summary.cateringOrders !== undefined) {
      cards.push({ label: 'Catering Orders', value: summary.cateringOrders });
    }

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                backgroundColor: '#edf4ff',
                border: '1px solid',
                borderColor: '#c8ddff',
                boxShadow: 'none',
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1, color: 'text.primary' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
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

    return [];
  };

  const renderCharts = () => {
    const rows = getChartRows();
    if (!rows.length) return null;

    const maxValue = Math.max(...rows.map((item) => Number(item.value || 0)), 1);
    const isCurrency = ['sales', 'customers', 'products'].includes(reportType);
    const chartTitle = reportType === 'work-orders'
      ? 'Work Order Status Overview'
      : 'Top Performance Snapshot';

    return (
      <Paper sx={{ p: 3, mb: 3, border: '1px solid #d6e6ff' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          {chartTitle}
        </Typography>
        <Grid container spacing={2}>
          {rows.map((item) => {
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
                <Box sx={{ height: 12, borderRadius: 99, background: '#e6edf7', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${widthPercent}%`,
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, #1e88e5 0%, #42a5f5 100%)',
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
              <Box
                sx={{
                  display: 'inline-block',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  bgcolor: row.status === 'approved' ? '#d4edda' : '#fff3cd',
                  color: row.status === 'approved' ? '#155724' : '#856404'
                }}
              >
                {row.status}
              </Box>
            </TableCell>
            {salesType === 'invoices' && (
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
                    bgcolor: row.payment_status === 'paid' ? '#d4edda' : '#f8d7da',
                    color: row.payment_status === 'paid' ? '#155724' : '#721c24'
                  }}
                >
                  {row.payment_status}
                </Box>
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
          <Paper sx={{ p: 3, mb: 3, border: '1px solid #d6e6ff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Assessment sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
                Reports
              </Typography>
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
                />
              </Grid>

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

              {reportData && (
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
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>

          {/* Summary Cards */}
          {renderSummaryCards()}

          {/* Quick Charts */}
          {renderCharts()}

          {/* Report Table */}
          {reportData && (
            <Paper sx={{ p: 3 }}>
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
