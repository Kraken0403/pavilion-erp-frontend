import React, { useEffect, useRef, useState } from 'react'
import {
  Container,
  Paper,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
} from '@mui/material'
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

  /* =======================
     LOAD DATA
  ======================= */

  const loadData = async ({ silent = false } = {}) => {
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
  }

  useEffect(() => {
    loadData({ silent: false })
  }, [isCateringBusiness])

  useAutoRefresh(() => loadData({ silent: true }), {
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

  const pendingInvoices = invoices
    .filter(
      (inv) =>
        inv.status !== 'paid' &&
        inv.status !== 'cancelled'
    )
    .sort(
      (a, b) =>
        (parseDateInput(b.issue_date || 0) || new Date(0)) -
        (parseDateInput(a.issue_date || 0) || new Date(0))
    )

  const pendingKotsCount = kots.filter(
    (k) => String(k?.status || '').toLowerCase() === 'pending'
  ).length

  const kpiCards = [
    {
      key: 'leads',
      title: 'Leads',
      value: leads.length,
      color: '#0288d1',
      path: '/leads',
    },
    {
      key: 'quotations',
      title: 'Quotations',
      value: quotations.length,
      color: '#6a1b9a',
      path: '/quotations',
    },
    {
      key: 'workorders',
      title: 'Work Orders',
      value: workOrders.length,
      color: '#ef6c00',
      path: '/workorders',
    },
    {
      key: 'products',
      title: 'Products',
      value: products.length,
      color: '#00897b',
      path: '/products',
    },
  ]

  if (isCateringBusiness) {
    kpiCards.push({
      key: 'pending-kots',
      title: 'Pending KOTs',
      value: pendingKotsCount,
      color: '#9c27b0',
      path: '/kots',
    })
  }

  kpiCards.push({
    key: 'total-invoice-amount',
    title: 'Total Invoice Amount',
    value: formatINR(totalInvoiceAmount),
    color: '#2e7d32',
    path: '/invoices',
  })

  /* =======================
     KPI CARD
  ======================= */

  const StatCard = ({ title, value, color, onClick }) => (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        cursor: 'pointer',
        border: '1px solid #eee',
        transition: '0.3s',
        background: '#fff',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ color: '#777' }}
      >
        {title}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          mt: 1,
          fontWeight: 600,
          color,
        }}
      >
        {value}
      </Typography>
    </Paper>
  )

  return (
    <>
      <Topbar />

      <Box
        sx={{
          background: '#f4f6f9',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Container maxWidth="lg">

          {loading ? (
            <PageLoader message="Loading dashboard..." minHeight={300} />
          ) : (
            <>
              {/* ================= KPI SECTION ================= */}
              <Box
                sx={{
                  mb: 4,
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: `repeat(${isCateringBusiness ? 6 : 5}, minmax(0, 1fr))`,
                  },
                }}
              >
                {kpiCards.map((card) => (
                  <StatCard
                    key={card.key}
                    title={card.title}
                    value={card.value}
                    color={card.color}
                    onClick={() => navigate(card.path)}
                  />
                ))}
              </Box>

              {/* ================= PENDING INVOICES ================= */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid #eee',
                  background: '#fff',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  Pending Invoices
                </Typography>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Invoice #</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pendingInvoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          navigate(`/invoices/${inv.id}`)
                        }
                      >
                        <TableCell>
                          {inv.invoice_number}
                        </TableCell>

                        <TableCell>
                          {formatDate(inv.issue_date)}
                        </TableCell>

                        <TableCell>
                          {formatINR(inv.grand_total)}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={inv.status}
                            size="small"
                            sx={{
                              fontWeight: 500,
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
                        </TableCell>
                      </TableRow>
                    ))}

                    {!pendingInvoices.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align="center"
                        >
                          No pending invoices
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </Container>
      </Box>
    </>
  )
}

export default Dashboard