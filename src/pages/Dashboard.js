import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Container,
  Paper,
  TextField,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Box,
  Stack,
} from '@mui/material'
import {
  ArrowOutward,
  CheckCircle,
  BarChart,
  CalendarMonth,
  LocalDining,
  MonetizationOn,
  NorthEast,
  PendingActions,
  Schedule,
  ReceiptLong,
  TrendingUp,
  WarningAmber,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

import Topbar from '../components/Topbar'
import PageLoader from '../components/ui/PageLoader'

import { getInvoices } from '../services/invoiceService'
import { fetchQuotations } from '../services/quotationService'
import { fetchAllProducts } from '../services/productServices'
import { fetchLeads } from '../services/leadService'
import { fetchWorkOrders } from '../services/workOrderServices'
import { fetchKots } from '../services/kotService'
import { useSettings } from '../context/SettingsContext'
import { formatDate as formatLocalDate, parseDateInput } from '../utils/dateFormatter'
import useAutoRefresh from '../hooks/useAutoRefresh'

const DASHBOARD_PENDING_INVOICES_PAGE_KEY = 'dashboardPendingInvoicesPage'
const DASHBOARD_PENDING_INVOICES_ROWS_KEY = 'dashboardPendingInvoicesRowsPerPage'
const DASHBOARD_TREND_RANGE_KEY = 'dashboardTrendRangeMonths'
const DASHBOARD_PENDING_FILTER_KEY = 'dashboardPendingInvoicesFilter'
const DASHBOARD_SELECTED_MONTH_KEY = 'dashboardSelectedMonth'

const Dashboard = () => {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)

  const [invoices, setInvoices] = useState([])
  const [quotations, setQuotations] = useState([])
  const [products, setProducts] = useState([])
  const [leads, setLeads] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [kots, setKots] = useState([])
  const [pendingInvoicesPage, setPendingInvoicesPage] = useState(() => {
    const savedPage = Number(sessionStorage.getItem(DASHBOARD_PENDING_INVOICES_PAGE_KEY));
    return Number.isInteger(savedPage) && savedPage >= 0 ? savedPage : 0;
  })
  const [pendingInvoicesRowsPerPage, setPendingInvoicesRowsPerPage] = useState(() => {
    const savedRows = Number(sessionStorage.getItem(DASHBOARD_PENDING_INVOICES_ROWS_KEY))
    return [5, 10, 15].includes(savedRows) ? savedRows : 5
  })
  const [trendRangeMonths, setTrendRangeMonths] = useState(() => {
    const savedRange = Number(sessionStorage.getItem(DASHBOARD_TREND_RANGE_KEY))
    return [3, 6, 12].includes(savedRange) ? savedRange : 6
  })
  const [pendingInvoiceFilter, setPendingInvoiceFilter] = useState(() => {
    const savedFilter = sessionStorage.getItem(DASHBOARD_PENDING_FILTER_KEY)
    return ['all', 'issued', 'overdue'].includes(savedFilter) ? savedFilter : 'all'
  })
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const savedMonth = sessionStorage.getItem(DASHBOARD_SELECTED_MONTH_KEY)
    if (/^\d{4}-\d{2}$/.test(savedMonth || '')) {
      return savedMonth
    }
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const hasLoadedOnceRef = useRef(false)

  const getListSignature = (items, pick) => {
    if (!Array.isArray(items)) return '[]'

    return JSON.stringify(items.map((item) => pick(item || {})))
  }

  const isCateringBusiness = settings?.business_type === 'CATERING';

  /* =======================
     FORMAT HELPERS
  ======================= */

  const formatINR = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)

  const formatDate = (date) =>
    date ? formatLocalDate(date) : '-'

  function getInvoiceDate(inv) {
    return parseDateInput(inv?.issue_date || inv?.created_at || inv?.date || 0)
  }

  function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime())
  }

  /* =======================
     LOAD DATA
  ======================= */

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent && !hasLoadedOnceRef.current) {
        setLoading(true)
      }

      const promises = [
        getInvoices(),
        fetchQuotations(),
        fetchAllProducts(),
        fetchLeads(),
        fetchWorkOrders(),
      ];

      // Only fetch KOTs if business type is CATERING
      if (isCateringBusiness) {
        promises.push(fetchKots('all'));
      }

      const results = await Promise.all(promises);

      const [
        invoicesRes,
        quotationsRes,
        productsRes,
        leadsRes,
        workOrdersRes,
        kotsRes
      ] = results;

      const nextInvoices = Array.isArray(invoicesRes)
        ? invoicesRes
        : invoicesRes?.data || []

      setInvoices((prev) => {
        const prevSignature = getListSignature(prev, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          issue_date: String(item?.issue_date || ''),
          grand_total: Number(item?.grand_total || 0),
        }))
        const nextSignature = getListSignature(nextInvoices, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          issue_date: String(item?.issue_date || ''),
          grand_total: Number(item?.grand_total || 0),
        }))
        return prevSignature === nextSignature ? prev : nextInvoices
      })

      const nextQuotations = Array.isArray(quotationsRes)
        ? quotationsRes
        : quotationsRes?.data || []

      setQuotations((prev) => {
        const prevSignature = getListSignature(prev, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          created_at: String(item?.created_at || ''),
          grand_total: Number(item?.grand_total || 0),
        }))
        const nextSignature = getListSignature(nextQuotations, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          created_at: String(item?.created_at || ''),
          grand_total: Number(item?.grand_total || 0),
        }))
        return prevSignature === nextSignature ? prev : nextQuotations
      })

      const nextProducts = Array.isArray(productsRes)
        ? productsRes
        : productsRes?.data || []

      setProducts((prev) => {
        const prevSignature = getListSignature(prev, (item) => ({
          id: Number(item?.id || 0),
          name: String(item?.name || ''),
          updated_at: String(item?.updated_at || ''),
        }))
        const nextSignature = getListSignature(nextProducts, (item) => ({
          id: Number(item?.id || 0),
          name: String(item?.name || ''),
          updated_at: String(item?.updated_at || ''),
        }))
        return prevSignature === nextSignature ? prev : nextProducts
      })

      const nextLeads = Array.isArray(leadsRes)
        ? leadsRes
        : leadsRes?.leads || leadsRes?.data || []

      setLeads((prev) => {
        const prevSignature = getListSignature(prev, (item) => ({
          id: Number(item?.id || 0),
          updated_at: String(item?.updated_at || ''),
          status: String(item?.status || ''),
        }))
        const nextSignature = getListSignature(nextLeads, (item) => ({
          id: Number(item?.id || 0),
          updated_at: String(item?.updated_at || ''),
          status: String(item?.status || ''),
        }))
        return prevSignature === nextSignature ? prev : nextLeads
      })
      // KOTs (only if catering business)
      if (isCateringBusiness && kotsRes) {
        const nextKots = Array.isArray(kotsRes)
          ? kotsRes
          : kotsRes?.kots || kotsRes?.data || []

        setKots((prev) => {
          const prevSignature = getListSignature(prev, (item) => ({
            id: Number(item?.id || 0),
            status: String(item?.status || ''),
            updated_at: String(item?.updated_at || ''),
          }))
          const nextSignature = getListSignature(nextKots, (item) => ({
            id: Number(item?.id || 0),
            status: String(item?.status || ''),
            updated_at: String(item?.updated_at || ''),
          }))
          return prevSignature === nextSignature ? prev : nextKots
        })
      }


      // 🔥 FIXED WORK ORDER PARSING
      const nextWorkOrders = Array.isArray(workOrdersRes)
        ? workOrdersRes
        : workOrdersRes?.workOrders
        || workOrdersRes?.data
        || []

      setWorkOrders((prev) => {
        const prevSignature = getListSignature(prev, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          issue_date: String(item?.issue_date || ''),
          total_amount: Number(item?.total_amount || 0),
        }))
        const nextSignature = getListSignature(nextWorkOrders, (item) => ({
          id: Number(item?.id || 0),
          status: String(item?.status || ''),
          issue_date: String(item?.issue_date || ''),
          total_amount: Number(item?.total_amount || 0),
        }))
        return prevSignature === nextSignature ? prev : nextWorkOrders
      })

    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      if (!hasLoadedOnceRef.current) {
        setLoading(false)
        hasLoadedOnceRef.current = true
      }
    }
  }, [isCateringBusiness])

  useEffect(() => {
    loadData({ silent: false })
  }, [loadData])

  const handleDashboardAutoRefresh = useCallback(() => {
    return loadData({ silent: true })
  }, [loadData])

  useAutoRefresh(handleDashboardAutoRefresh, {
    intervalMs: 30000,
    watch: [isCateringBusiness],
  })

  /* =======================
     CALCULATIONS
  ======================= */

  const totalInvoiceAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.grand_total || 0),
    0
  )

  // Selected month derived dates (used by pending invoice filters)
  const [selectedYear, selectedMonthIndex] = selectedMonthKey.split('-').map(Number)
  const selectedMonthDate = new Date(selectedYear, Math.max(0, selectedMonthIndex - 1), 1)
  const currentMonthStart = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1)
  const previousMonthStart = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1)
  const nextMonthStart = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1)
  const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short' })

  // helper: determine if invoice is overdue
  function isOverdueInvoice(inv) {
    if (typeof inv?.is_overdue === 'boolean') return inv.is_overdue

    const status = String(inv?.status || '').trim().toLowerCase()
    if (status === 'paid' || status === 'cancelled') return false

    const grand = Number(inv?.grand_total || 0)
    let paid = Number(inv?.paid_amount || 0)
    if (!paid && Array.isArray(inv?.payments) && inv.payments.length) {
      paid = inv.payments.reduce((s, p) => {
        if (String(p.paymentType || '').toUpperCase() === 'OTHER') return s
        return s + Number(p.amount || 0)
      }, 0)
    }
    const balanceDue = Math.max(0, grand - paid)
    if (balanceDue <= 0) return false

    const dueDate = parseDateInput(inv?.due_date || inv?.dueDate || inv?.issue_date || 0)
    return dueDate instanceof Date && !Number.isNaN(dueDate.getTime()) && dueDate < new Date()
  }

  // Include invoices that are overdue regardless of the issue month,
  // and also include issued invoices from the selected month with a positive balance.
  const pendingInvoices = invoices
    .filter((inv) => {
      const date = getInvoiceDate(inv)

      // Determine balance due robustly: prefer backend `balance_due`, else compute from payments
      const grand = Number(inv?.grand_total || 0)
      let paid = Number(inv?.paid_amount || 0)
      if (!paid && Array.isArray(inv?.payments) && inv.payments.length) {
        paid = inv.payments.reduce((s, p) => {
          if (String(p.paymentType || '').toUpperCase() === 'OTHER') return s
          return s + Number(p.amount || 0)
        }, 0)
      }
      const balanceDue = Math.max(0, grand - paid)

      const status = String(inv?.status || '').trim().toLowerCase()
      const isIssued = status === 'issued'
      const inSelectedMonth = isValidDate(date) && date >= currentMonthStart && date < nextMonthStart

      // Include if invoice is overdue (server or computed) OR it's an issued invoice within selected month with balance
      if (isOverdueInvoice(inv)) return true
      if (isIssued && inSelectedMonth && balanceDue > 0) return true
      return false
    })
    .sort(
      (a, b) =>
        (parseDateInput(b.issue_date || 0) || new Date(0)) -
        (parseDateInput(a.issue_date || 0) || new Date(0))
    )

  const pendingKotsCount = kots.filter(
    (k) => String(k?.status || '').toLowerCase() === 'pending'
  ).length

  const filteredPendingInvoices = pendingInvoices.filter((inv) => {
    if (pendingInvoiceFilter === 'issued') {
      return String(inv?.status || '').trim().toLowerCase() === 'issued'
    }
    if (pendingInvoiceFilter === 'overdue') {
      return isOverdueInvoice(inv)
    }
    return true
  })

  const paginatedPendingInvoices = filteredPendingInvoices.slice(
    pendingInvoicesPage * pendingInvoicesRowsPerPage,
    pendingInvoicesPage * pendingInvoicesRowsPerPage + pendingInvoicesRowsPerPage
  )

  const handlePendingInvoicesPageChange = (_event, nextPage) => {
    setPendingInvoicesPage(nextPage)
  }

  const handlePendingInvoicesRowsPerPageChange = (event) => {
    setPendingInvoicesRowsPerPage(parseInt(event.target.value, 10))
    setPendingInvoicesPage(0)
  }

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredPendingInvoices.length / pendingInvoicesRowsPerPage) - 1)
    if (pendingInvoicesPage > maxPage) {
      setPendingInvoicesPage(maxPage)
    }
  }, [filteredPendingInvoices.length, pendingInvoicesPage, pendingInvoicesRowsPerPage])

  useEffect(() => {
    setPendingInvoicesPage(0)
  }, [pendingInvoiceFilter])

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_PENDING_INVOICES_PAGE_KEY, String(pendingInvoicesPage))
  }, [pendingInvoicesPage])

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_PENDING_INVOICES_ROWS_KEY, String(pendingInvoicesRowsPerPage))
  }, [pendingInvoicesRowsPerPage])

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_TREND_RANGE_KEY, String(trendRangeMonths))
  }, [trendRangeMonths])

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_PENDING_FILTER_KEY, pendingInvoiceFilter)
  }, [pendingInvoiceFilter])

  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_SELECTED_MONTH_KEY, selectedMonthKey)
  }, [selectedMonthKey])

  const leadQualifiedCount = leads.filter(
    (lead) => String(lead?.status || '').toLowerCase() === 'qualified'
  ).length

  const leadConvertedCount = leads.filter((lead) => {
    const status = String(lead?.status || '').toLowerCase()
    return status === 'won' || status === 'converted'
  }).length

  const invoiceCollectionRate = invoices.length
    ? Math.round(
      (invoices.filter((inv) => String(inv?.status || '').trim().toLowerCase() === 'paid').length /
        invoices.length) *
      100
    )
    : 0

  // selected-month dates and helpers are defined earlier above

  const thisMonthRevenue = invoices.reduce((sum, inv) => {
    const date = getInvoiceDate(inv)
    if (!isValidDate(date) || date < currentMonthStart || date >= nextMonthStart) {
      return sum
    }
    return sum + Number(inv?.grand_total || 0)
  }, 0)

  const lastMonthRevenue = invoices.reduce((sum, inv) => {
    const date = getInvoiceDate(inv)
    if (!isValidDate(date) || date < previousMonthStart || date >= currentMonthStart) {
      return sum
    }
    return sum + Number(inv?.grand_total || 0)
  }, 0)

  const revenueDeltaPercent = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0
      ? 100
      : 0

  const averageInvoiceValue = invoices.length
    ? Math.round(totalInvoiceAmount / invoices.length)
    : 0

  const revenueTrend = Array.from({ length: trendRangeMonths }, (_, index) => {
    const date = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - (trendRangeMonths - 1 - index), 1)
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)

    const value = invoices.reduce((sum, inv) => {
      const invoiceDate = getInvoiceDate(inv)
      if (!isValidDate(invoiceDate) || invoiceDate < start || invoiceDate >= end) {
        return sum
      }
      return sum + Number(inv?.grand_total || 0)
    }, 0)

    return {
      label: monthFormatter.format(date),
      value,
    }
  })

  const selectedRangeRevenue = revenueTrend.reduce((sum, month) => sum + Number(month?.value || 0), 0)
  const selectedRangeAverage = revenueTrend.length ? Math.round(selectedRangeRevenue / revenueTrend.length) : 0

  const paidInvoicesCount = invoices.filter((inv) => String(inv?.status || '').trim().toLowerCase() === 'paid').length
  const issuedInvoicesCount = invoices.filter((inv) => String(inv?.status || '').trim().toLowerCase() === 'issued').length
  const cancelledInvoicesCount = invoices.filter((inv) => String(inv?.status || '').trim().toLowerCase() === 'cancelled').length

  const overdueInvoicesCount = invoices.filter((inv) => isOverdueInvoice(inv)).length

  const activeInvoicesCount = Math.max(0, invoices.length - paidInvoicesCount - cancelledInvoicesCount)
  const overdueShare = activeInvoicesCount > 0
    ? Math.round((overdueInvoicesCount / activeInvoicesCount) * 100)
    : 0

  const totalPaidAmount = invoices.reduce((sum, inv) => {
    const status = String(inv?.status || '').trim().toLowerCase()
    return status === 'paid' ? sum + Number(inv?.grand_total || 0) : sum
  }, 0)

  const totalPendingAmount = pendingInvoices.reduce(
    (sum, inv) => sum + Number(inv?.grand_total || 0),
    0
  )

  const topPendingInvoicesByAmount = [...pendingInvoices]
    .sort((a, b) => Number(b?.grand_total || 0) - Number(a?.grand_total || 0))
    .slice(0, 4)

  const currentMonthInvoiceCount = invoices.filter((inv) => {
    const date = getInvoiceDate(inv)
    return isValidDate(date) && date >= currentMonthStart && date < nextMonthStart
  }).length

  const lastMonthInvoiceCount = invoices.filter((inv) => {
    const date = getInvoiceDate(inv)
    return isValidDate(date) && date >= previousMonthStart && date < currentMonthStart
  }).length

  const invoiceVelocityPercent = lastMonthInvoiceCount > 0
    ? Math.round(((currentMonthInvoiceCount - lastMonthInvoiceCount) / lastMonthInvoiceCount) * 100)
    : currentMonthInvoiceCount > 0
      ? 100
      : 0

  const buildSparklinePath = (items) => {
    const width = 520
    const height = 130
    const padding = 10
    if (!items.length) return ''

    const stepX = (width - padding * 2) / Math.max(1, items.length - 1)
    const maxValue = Math.max(...items.map((i) => i.value), 1)

    return items
      .map((item, index) => {
        const x = padding + stepX * index
        const y = height - padding - ((item.value || 0) / maxValue) * (height - padding * 2)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const sparklinePath = buildSparklinePath(revenueTrend)

  const kpiCards = [
    {
      key: 'leads',
      title: 'Leads',
      value: leads.length,
      color: '#0288d1',
      path: '/leads',
      accent: 'linear-gradient(120deg, #e0f7ff 0%, #f4fbff 100%)',
      icon: <TrendingUp fontSize="small" />,
      meta: `${leadQualifiedCount} qualified`,
    },
    {
      key: 'quotations',
      title: 'Quotations',
      value: quotations.length,
      color: '#6a1b9a',
      path: '/quotations',
      accent: 'linear-gradient(120deg, #f5e8ff 0%, #fcf6ff 100%)',
      icon: <ReceiptLong fontSize="small" />,
      meta: `${leadConvertedCount} converted leads`,
    },
    {
      key: 'workorders',
      title: 'Work Orders',
      value: workOrders.length,
      color: '#ef6c00',
      path: '/workorders',
      accent: 'linear-gradient(120deg, #ffedd8 0%, #fff8ef 100%)',
      icon: <PendingActions fontSize="small" />,
      meta: `${pendingInvoices.length} pending invoices`,
    },
    {
      key: 'products',
      title: 'Products',
      value: products.length,
      color: '#00897b',
      path: '/products',
      accent: 'linear-gradient(120deg, #dffaf5 0%, #f2fffc 100%)',
      icon: <ArrowOutward fontSize="small" />,
      meta: 'Inventory and pricing',
    },
  ]

  if (isCateringBusiness) {
    kpiCards.push({
      key: 'pending-kots',
      title: 'Pending KOTs',
      value: pendingKotsCount,
      color: '#9c27b0',
      path: '/kots',
      accent: 'linear-gradient(120deg, #f7e8ff 0%, #fdf7ff 100%)',
      icon: <LocalDining fontSize="small" />,
      meta: 'Kitchen ticket queue',
    })
  }

  kpiCards.push({
    key: 'total-invoice-amount',
    title: 'Total Invoice Amount',
    value: formatINR(totalInvoiceAmount),
    color: '#2e7d32',
    path: '/invoices',
    accent: 'linear-gradient(120deg, #e5ffe8 0%, #f4fff4 100%)',
    icon: <ReceiptLong fontSize="small" />,
    meta: `${invoiceCollectionRate}% collection rate`,
  })

  /* =======================
     KPI CARD
  ======================= */

  const StatCard = ({ title, value, color, accent, icon, meta, onClick }) => (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 1.8,
        cursor: 'pointer',
        border: '1px solid #e6edf7',
        transition: '0.3s',
        background: accent || '#fff',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 136,
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 12px 28px rgba(16, 24, 40, 0.14)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ color: '#516176', fontWeight: 700, letterSpacing: 0.2 }}>
          {title}
        </Typography>

        <Avatar
          sx={{
            width: 30,
            height: 30,
            bgcolor: color,
            color: '#fff',
          }}
        >
          {icon}
        </Avatar>
      </Box>

      <Typography
        variant="h5"
        sx={{
          mt: 1.5,
          mb: 1,
          fontWeight: 700,
          color,
          fontSize: { xs: '1.35rem', md: '1.55rem' },
        }}
      >
        {value}
      </Typography>

      <Chip
        label={meta}
        size="small"
        sx={{
          bgcolor: '#ffffffcc',
          border: '1px solid #e3eaf4',
          color: '#3e4b60',
          fontWeight: 600,
        }}
      />
    </Paper>
  )

  return (
    <>
      <Topbar />

      <Box
        sx={{
          background:
            'radial-gradient(circle at 10% 0%, #edf4ff 0%, #f7fbff 35%, #f5f7fb 68%, #f2f4f8 100%)',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Container maxWidth="lg">

          {loading ? (
            <PageLoader message="Loading dashboard..." minHeight={300} />
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  mb: 3,
                  p: { xs: 2, md: 2.6 },
                  borderRadius: 2,
                  border: '1px solid #dfe8f5',
                  background: '#ffffffeb',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 12, letterSpacing: 1.6, fontWeight: 800, color: '#5f6f87' }}>
                      CRM COMMAND CENTER
                    </Typography>
                    <Typography sx={{ mt: 0.6, fontSize: { xs: 24, md: 30 }, fontWeight: 800, color: '#0f172a' }}>
                      Revenue + Collections Dashboard
                    </Typography>
                    <Typography sx={{ mt: 0.7, color: '#5b6b82' }}>
                      Clean, fast overview of sales movement, cash collection health, and invoice risk.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      type="month"
                      label="Select Month"
                      value={selectedMonthKey}
                      onChange={(event) => setSelectedMonthKey(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        minWidth: 190,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: '#eef4ff',
                          color: '#1e3a8a',
                          fontWeight: 700,
                          borderRadius: 2,
                        },
                      }}
                      InputProps={{
                        startAdornment: <CalendarMonth sx={{ mr: 1, color: '#1e3a8a', fontSize: 18 }} />,
                      }}
                    />
                    <Button onClick={() => navigate('/invoices')} variant="contained" sx={{ fontWeight: 700 }}>
                      Open Invoices
                    </Button>
                    <Button onClick={() => navigate('/leads')} variant="outlined" sx={{ fontWeight: 700 }}>
                      View Leads
                    </Button>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.2,
                  }}
                >
                  {[
                    {
                      label: 'This Month Revenue',
                      value: formatINR(thisMonthRevenue),
                      hint: `${revenueDeltaPercent >= 0 ? '+' : ''}${revenueDeltaPercent}% vs last month`,
                      color: '#0f766e',
                      icon: <MonetizationOn fontSize="small" />,
                    },
                    {
                      label: 'Invoice Velocity',
                      value: `${currentMonthInvoiceCount}`,
                      hint: `${invoiceVelocityPercent >= 0 ? '+' : ''}${invoiceVelocityPercent}% MoM`,
                      color: '#1d4ed8',
                      icon: <NorthEast fontSize="small" />,
                    },
                    {
                      label: 'Overdue Pressure',
                      value: `${overdueInvoicesCount}`,
                      hint: `${overdueShare}% of active invoices`,
                      color: '#b45309',
                      icon: <WarningAmber fontSize="small" />,
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.3,
                        borderRadius: 1.4,
                        border: '1px solid #e3ebf7',
                        background: '#fff',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 12, color: '#5a6a82', fontWeight: 700 }}>{item.label}</Typography>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: `${item.color}1A`, color: item.color }}>
                          {item.icon}
                        </Avatar>
                      </Box>
                      <Typography sx={{ mt: 0.6, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{item.value}</Typography>
                      <Typography sx={{ mt: 0.2, fontSize: 12, color: item.color, fontWeight: 700 }}>{item.hint}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* ================= KPI SECTION ================= */}
              <Box
                sx={{
                  mb: 3,
                  display: 'grid',
                  gap: 2.2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: `repeat(${isCateringBusiness ? 3 : 3}, minmax(0, 1fr))`,
                    lg: `repeat(${isCateringBusiness ? 6 : 5}, minmax(0, 1fr))`,
                  },
                }}
              >
                {kpiCards.map((card) => (
                  <StatCard
                    key={card.key}
                    title={card.title}
                    value={card.value}
                    color={card.color}
                    accent={card.accent}
                    icon={card.icon}
                    meta={card.meta}
                    onClick={() => navigate(card.path)}
                  />
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  mb: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1.15fr 1fr',
                  },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid #dce6f4',
                    background: '#fff',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Revenue Intelligence
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: 14 }}>
                        Trend and momentum across the selected window
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.8}>
                      {[3, 6, 12].map((range) => (
                        <Button
                          key={range}
                          size="small"
                          variant={trendRangeMonths === range ? 'contained' : 'outlined'}
                          onClick={() => setTrendRangeMonths(range)}
                          sx={{ minWidth: 48, fontWeight: 700 }}
                        >
                          {range}M
                        </Button>
                      ))}
                    </Stack>
                  </Box>

                  <Chip
                    icon={<BarChart sx={{ color: '#2563eb !important' }} />}
                    label={`Avg monthly ${formatINR(selectedRangeAverage)} | Avg invoice ${formatINR(averageInvoiceValue)}`}
                    sx={{ bgcolor: '#eef4ff', color: '#1e40af', fontWeight: 700, mb: 1.5 }}
                  />

                  <Box sx={{ p: 1.2, borderRadius: 1.4, border: '1px solid #dbe7f8', background: '#f8fbff' }}>
                    <svg viewBox="0 0 540 140" width="100%" height="140" role="img" aria-label="Revenue trend chart">
                      <defs>
                        <linearGradient id="revLineGradient" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#93c5fd" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <path d={sparklinePath} fill="none" stroke="url(#revLineGradient)" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${trendRangeMonths}, minmax(0, 1fr))`, mt: 0.5 }}>
                      {revenueTrend.map((item) => (
                        <Box key={item.label} sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 11, color: '#64748b' }}>{item.label}</Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
                            {item.value > 0 ? formatINR(item.value) : '-'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.2 }}>
                    <Box sx={{ p: 1.1, border: '1px solid #e2e8f0', borderRadius: 1.2 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Current Month</Typography>
                      <Typography sx={{ fontSize: 19, fontWeight: 800 }}>{formatINR(thisMonthRevenue)}</Typography>
                    </Box>
                    <Box sx={{ p: 1.1, border: '1px solid #e2e8f0', borderRadius: 1.2 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Previous Month</Typography>
                      <Typography sx={{ fontSize: 19, fontWeight: 800 }}>{formatINR(lastMonthRevenue)}</Typography>
                    </Box>
                    <Box sx={{ p: 1.1, border: '1px solid #e2e8f0', borderRadius: 1.2 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Growth</Typography>
                      <Typography sx={{ fontSize: 19, fontWeight: 800, color: revenueDeltaPercent >= 0 ? '#0f766e' : '#b91c1c' }}>
                        {revenueDeltaPercent >= 0 ? '+' : ''}{revenueDeltaPercent}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid #dce6f4',
                    background: '#fff',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Collections Monitor
                  </Typography>
                  <Typography sx={{ mt: 0.4, mb: 1.8, color: '#64748b', fontSize: 14 }}>
                    Cash realization and risk watch
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={invoiceCollectionRate}
                        size={82}
                        thickness={5}
                        sx={{ color: '#16a34a' }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{invoiceCollectionRate}%</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>Collected</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{formatINR(totalPaidAmount)}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.7 }}>Pending</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#b45309' }}>
                        {formatINR(totalPendingAmount)}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.6 }} />

                  <Stack spacing={1.1}>
                    {[
                      { label: 'Paid', value: paidInvoicesCount, color: '#22c55e', icon: <CheckCircle fontSize="small" /> },
                      { label: 'Issued', value: issuedInvoicesCount, color: '#3b82f6', icon: <Schedule fontSize="small" /> },
                      { label: 'Overdue', value: overdueInvoicesCount, color: '#f59e0b', icon: <WarningAmber fontSize="small" /> },
                    ].map((item) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: `${item.color}1F`, color: item.color }}>
                            {item.icon}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600, color: '#334155' }}>{item.label}</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700 }}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 1.8 }} />

                  <Typography sx={{ fontSize: 13, color: '#64748b', mb: 0.8, fontWeight: 700 }}>
                    High Value Pending
                  </Typography>
                  <Stack spacing={0.8}>
                    {topPendingInvoicesByAmount.length ? topPendingInvoicesByAmount.map((inv) => (
                      <Box
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        sx={{
                          cursor: 'pointer',
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid #e3ebf5',
                          display: 'flex',
                          justifyContent: 'space-between',
                          '&:hover': { background: '#f8fbff' },
                        }}
                      >
                        <Typography sx={{ fontWeight: 600, color: '#1f2937' }}>{inv.invoice_number || `#${inv.id}`}</Typography>
                        <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(inv.grand_total)}</Typography>
                      </Box>
                    )) : (
                      <Typography sx={{ color: '#64748b', fontSize: 13 }}>No pending invoices</Typography>
                    )}
                  </Stack>
                </Paper>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  mb: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1.4fr 1fr',
                  },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid #e1e9f4',
                    background: '#ffffffd9',
                    backdropFilter: 'blur(3px)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Pending Invoices
                    </Typography>
                    <Stack direction="row" spacing={0.8}>
                      {[
                        { key: 'all', label: `All (${pendingInvoices.length})` },
                        {
                          key: 'issued',
                          label: `Issued (${pendingInvoices.filter((inv) => String(inv?.status || '').trim().toLowerCase() === 'issued').length})`,
                        },
                        {
                          key: 'overdue',
                          label: `Overdue (${pendingInvoices.filter((inv) => isOverdueInvoice(inv)).length})`,
                        },
                      ].map((item) => (
                        <Button
                          key={item.key}
                          size="small"
                          variant={pendingInvoiceFilter === item.key ? 'contained' : 'outlined'}
                          onClick={() => setPendingInvoiceFilter(item.key)}
                          sx={{ fontWeight: 700, textTransform: 'none' }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </Stack>
                  </Box>

                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#627289', fontWeight: 700 }}><strong>Invoice #</strong></TableCell>
                        <TableCell sx={{ color: '#627289', fontWeight: 700 }}><strong>Date</strong></TableCell>
                        <TableCell sx={{ color: '#627289', fontWeight: 700 }}><strong>Total</strong></TableCell>
                        <TableCell sx={{ color: '#627289', fontWeight: 700 }}><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {paginatedPendingInvoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '&:nth-of-type(even)': { background: '#f8fbff' },
                          }}
                          onClick={() =>
                            navigate(`/invoices/${inv.id}`)
                          }
                        >
                          <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {inv.invoice_number}
                          </TableCell>

                          <TableCell>
                            {formatDate(inv.issue_date)}
                          </TableCell>

                          <TableCell sx={{ fontWeight: 600 }}>
                            {formatINR(inv.grand_total)}
                          </TableCell>

                          <TableCell>
                            {isOverdueInvoice(inv) ? (
                              <Chip
                                label="Overdue"
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  backgroundColor: '#fff7ed',
                                  color: '#b45309',
                                }}
                              />
                            ) : (
                              <Chip
                                label={inv.status}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  backgroundColor:
                                    inv.status === 'issued'
                                      ? '#e3f2fd'
                                      : '#fff3e0',
                                  color:
                                    inv.status === 'issued'
                                      ? '#1976d2'
                                      : '#ef6c00',
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      {!filteredPendingInvoices.length && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="table-empty-message"
                          >
                            No pending invoices
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {!!filteredPendingInvoices.length && (
                    <TablePagination
                      component="div"
                      count={filteredPendingInvoices.length}
                      page={pendingInvoicesPage}
                      onPageChange={handlePendingInvoicesPageChange}
                      rowsPerPage={pendingInvoicesRowsPerPage}
                      onRowsPerPageChange={handlePendingInvoicesRowsPerPageChange}
                      rowsPerPageOptions={[5, 10, 15]}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid #e1e9f4',
                    background: '#fff',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Lead Pipeline Snapshot
                  </Typography>
                  <Typography sx={{ mt: 0.4, mb: 2.2, color: '#64748b', fontSize: 14 }}>
                    Quick view of lead progression from new to won.
                  </Typography>

                  <Stack spacing={1.7}>
                    {[
                      {
                        label: 'Total Leads',
                        value: leads.length,
                        percent: 100,
                        color: '#3b82f6',
                      },
                      {
                        label: 'Qualified',
                        value: leadQualifiedCount,
                        percent: leads.length ? Math.round((leadQualifiedCount / leads.length) * 100) : 0,
                        color: '#0ea5e9',
                      },
                      {
                        label: 'Converted',
                        value: leadConvertedCount,
                        percent: leads.length ? Math.round((leadConvertedCount / leads.length) * 100) : 0,
                        color: '#22c55e',
                      },
                    ].map((item) => (
                      <Box key={item.label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                          <Typography sx={{ fontWeight: 600, color: '#334155' }}>{item.label}</Typography>
                          <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.value} ({item.percent}%)
                          </Typography>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 30, background: '#edf2fa' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${Math.max(6, item.percent)}%`,
                              borderRadius: 30,
                              background: item.color,
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontSize: 13, color: '#64748b' }}>Collections Efficiency</Typography>
                      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                        {invoiceCollectionRate}%
                      </Typography>
                    </Box>

                    <Button
                      onClick={() => navigate('/reports')}
                      size="small"
                      endIcon={<ArrowOutward />}
                      sx={{ fontWeight: 700 }}
                    >
                      Open Reports
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </>
          )}
        </Container>
      </Box>
    </>
  )
}

export default Dashboard