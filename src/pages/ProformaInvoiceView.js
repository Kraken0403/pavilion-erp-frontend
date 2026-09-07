import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Chip, Divider, Grid, Typography, Menu, MenuItem, IconButton, ListItemIcon } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ShareIcon from '@mui/icons-material/Share'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ChannelSelectModal from '../components/ui/ChannelSelectModal'
import { formatQty } from '../utils/formatters'
import { sendProformaEmail, sendProformaWhatsApp } from '../services/invoiceService'
import Topbar from '../components/Topbar'
import NotificationSnackbar from '../components/ui/NotificationSnackbar'
import PageLoader from '../components/ui/PageLoader'
import DetailBackLink from '../components/ui/DetailBackLink'
import {
  getProformaInvoiceById,
  createTaxInvoiceFromProforma,
  
} from '../services/invoiceService'
import { formatDate as formatLocalDate } from '../utils/dateFormatter'
import { formatStatusLabel } from '../utils/statusFormatter'
import '../assets/styles/LeadsTable.scss'
import '../assets/styles/QuotationDetail.scss'

const statusColors = {
  draft: 'default',
  issued: 'primary',
  'part-payment': 'warning',
  paid: 'success',
  cancelled: 'error',
}

function ProformaInvoiceView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [taxInvoiceId, setTaxInvoiceId] = useState(null)
  const [creatingTax, setCreatingTax] = useState(false)
  
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  })
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [actionsAnchor, setActionsAnchor] = useState(null)

  const getShareSubtitle = () => {
    const items = invoice?.items || []
    if (!items.length) return ''
    const visible = items.slice(0, 5)
    const parts = visible.map(i => `${i.description} x${formatQty(i.quantity)} · ${formatMoney(i.line_total || i.lineTotal || 0)}`)
    const more = items.length > 5 ? ` · +${items.length - 5} more` : ''
    return parts.join(' · ') + more
  }

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getProformaInvoiceById(id)
      setInvoice(data)
      setTaxInvoiceId(data?.tax_invoice_id || null)
    } catch {
      setNotification({
        open: true,
        message: 'Failed to load proforma invoice.',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const formatMoney = (value) => `₹ ${Number(value || 0).toFixed(2)}`

  const customerName = [invoice?.first_name, invoice?.last_name].filter(Boolean).join(' ').trim() || '—'
  const customerEmail = invoice?.lead?.email || invoice?.billing_snapshot?.email || '—'
  const customerPhone = invoice?.lead?.phone || invoice?.billing_snapshot?.phone || '—'

  const handleExportPdf = async () => {
    try {
      await (await import('../services/invoiceService')).downloadProformaPdf(id)
    } catch {
      setNotification({
        open: true,
        message: 'PDF download failed.',
        severity: 'error',
      })
    }
  }

  const handleCreateTaxInvoice = async () => {
    try {
      // If a tax invoice already exists, open it
      if (taxInvoiceId) {
        navigate(`/invoices/${taxInvoiceId}`)
        return
      }

      setCreatingTax(true)
      const res = await createTaxInvoiceFromProforma(id)
      const createdId = res?.tax_invoice?.id || res?.tax_invoice?.invoice?.id || null

      setNotification({
        open: true,
        message: res?.already_existed
          ? 'Tax invoice already exists for this proforma.'
          : 'Tax invoice created successfully.',
        severity: 'success',
      })

      if (createdId) {
        navigate(`/invoices/${createdId}`)
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to create tax invoice.',
        severity: 'error',
      })
    } finally {
      setCreatingTax(false)
    }
  }

  

  return (
    <div className="quotation-detail-container finance-document-detail">
      <Topbar />
      <DetailBackLink to="/proforma-invoices" label="Proforma invoices" />

      {loading ? (
        <div className="quotation-card">
          <PageLoader message="Loading proforma invoice details..." minHeight={220} />
        </div>
      ) : !invoice ? (
        <div className="quotation-card" style={{ padding: '60px 0', textAlign: 'center' }}>
          <Typography variant="h6">No proforma invoice found</Typography>
        </div>
      ) : (
        <>
          <div className="quotation-header">
            <div className="quotation-head">
              <div className="qh-content">
                <h2>Proforma #{invoice.invoice_number}</h2>
              </div>
              <div className="quotation-meta">
                <span>Issue Date: {formatLocalDate(invoice.issue_date) || '—'}</span>
                <span className="chip">
                  <span>{formatStatusLabel(invoice.status)}</span>
                </span>
              </div>
            </div>

            <div className="quotation-actions">
              <Chip
                className="status-chip"
                label={formatStatusLabel(invoice.status)}
                color={statusColors[invoice.status] || 'default'}
                size="small"
              />

              <button
                className="hs-listing__create"
                onClick={handleExportPdf}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PictureAsPdfOutlinedIcon fontSize="small" />
                Export PDF
              </button>

              {/* Actions menu */}
              <div>
                <IconButton size="small" onClick={(e) => setActionsAnchor(e.currentTarget)}>
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={actionsAnchor}
                  open={Boolean(actionsAnchor)}
                  onClose={() => setActionsAnchor(null)}
                >
                  <MenuItem onClick={() => { setActionsAnchor(null); handleCreateTaxInvoice(); }}>
                    <ListItemIcon>
                      <ReceiptLongIcon fontSize="small" />
                    </ListItemIcon>
                    {creatingTax ? 'Creating...' : (taxInvoiceId ? 'Open Tax Invoice' : 'Create Tax Invoice')}
                  </MenuItem>
                  <MenuItem onClick={() => { setChannelModalOpen(true); setActionsAnchor(null); }}>
                    <ListItemIcon>
                      <ShareIcon fontSize="small" />
                    </ListItemIcon>
                    Share Proforma Invoice
                  </MenuItem>
                </Menu>
              </div>
            </div>
          </div>

          <div className="quotation-card">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Customer Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Customer</Typography>
                <Typography variant="body1">{customerName}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Issue Date</Typography>
                <Typography variant="body1">{formatLocalDate(invoice.issue_date) || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Due Date</Typography>
                <Typography variant="body1">{formatLocalDate(invoice.due_date) || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Email</Typography>
                <Typography variant="body1">{customerEmail}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Phone</Typography>
                <Typography variant="body1">{customerPhone}</Typography>
              </Grid>
            </Grid>
          </div>

          <div className="quotation-card table-container">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Proforma Items
            </Typography>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST %</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(invoice.items || []).length ? invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{formatQty(item.quantity)}</td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>{item.gst_rate}%</td>
                    <td>{formatMoney(item.line_total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="quotation-card">
            <Box sx={{ maxWidth: 360, ml: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">{formatMoney(invoice.display_taxable_subtotal ?? invoice.subtotal)}</Typography>
              </Box>
              {Number(invoice._computed_discount || invoice.discount || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Discount{invoice.discount_percent ? ` (${invoice.discount_percent}%)` : ''}</Typography>
                  <Typography variant="body2">-{formatMoney(invoice._computed_discount || invoice.discount)}</Typography>
                </Box>
              )}
              {Number(invoice.cgst_total || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">CGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.cgst_total)}</Typography>
                </Box>
              )}

              {Number(invoice.sgst_total || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">SGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.sgst_total)}</Typography>
                </Box>
              )}

              {Number(invoice.igst_total || 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">IGST</Typography>
                  <Typography variant="body2">{formatMoney(invoice.igst_total)}</Typography>
                </Box>
              )}

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Grand Total</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatMoney(invoice.grand_total)}</Typography>
              </Box>
            </Box>
          </div>
        </>
      )}

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title={`Share Proforma ${invoice?.invoice_number || ''} with ${customerName}`}
        subtitle={getShareSubtitle()}
        defaultEmail
        defaultWhatsApp={false}
        confirmLabel="Share Proforma"
        onConfirm={async ({ sendEmail = true, sendWhatsApp = false }) => {
          setChannelModalOpen(false)
          try {
            if (sendEmail) await sendProformaEmail(id)
            if (sendWhatsApp) await sendProformaWhatsApp(id)
            setNotification({ open: true, message: '📩 Notification sent', severity: 'success' })
          } catch {
            setNotification({ open: true, message: '❌ Failed to send notification', severity: 'error' })
          }
        }}
      />
    </div>
  )
}

export default ProformaInvoiceView
