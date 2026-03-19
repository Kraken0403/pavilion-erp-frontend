import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Chip, Checkbox, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItemButton, ListItemText, CircularProgress, Typography
} from '@mui/material'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import UtilsBar from '../components/UtilsBar'
import PaginationBar from '../components/ui/PaginationBar'
import NotificationSnackbar from '../components/ui/NotificationSnackbar'
import ChannelSelectModal from '../components/ui/ChannelSelectModal'
import { formatDate } from '../utils/dateFormatter'
import { formatStatusLabel } from '../utils/statusFormatter'
import {
  getProformaInvoices,
  createTaxInvoiceFromProforma,
} from '../services/invoiceService'
import { fetchApprovedQuotations } from '../services/quotationService'
import * as XLSX from 'xlsx'
import '../assets/styles/LeadsTable.scss'

const INVOICES_PER_PAGE = 20

const statusColors = {
  draft: 'default',
  issued: 'primary',
  'part-payment': 'warning',
  paid: 'success',
  cancelled: 'error',
}

function ProformaInvoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('latest')
  const [dateFilter, setDateFilter] = useState({})
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [creatingTaxId, setCreatingTaxId] = useState(null)

  // ── Proforma creation dialogs
  const [proformaDialogOpen, setProformaDialogOpen] = useState(false)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false)
  const [approvedQuotations, setApprovedQuotations] = useState([])
  const [loadingQuotations, setLoadingQuotations] = useState(false)
  const [creatingFromQuotation] = useState(false)

  const handleOpenProformaDialog = () => setProformaDialogOpen(true)
  const handleOpenManualDialog = () => {
    setProformaDialogOpen(false)
    setManualDialogOpen(false)
    navigate('/proforma-invoices/create')
  }
  const handleOpenQuotationDialog = async () => {
    setProformaDialogOpen(false)
    setQuotationDialogOpen(true)
    setLoadingQuotations(true)
    try {
      const list = await fetchApprovedQuotations()
      setApprovedQuotations(Array.isArray(list) ? list : [])
    } catch {
      setNotification({ open: true, message: 'Failed to load approved quotations.', severity: 'error' })
    } finally {
      setLoadingQuotations(false)
    }
  }
  const handleCreateFromQuotation = async (quotationId) => {
    // Navigate to the proforma create page with quotationId so the form is prefilled and read-only
    setQuotationDialogOpen(false)
    navigate('/proforma-invoices/create', { state: { quotationId } })
  }

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  })
  const [channelModalOpen, setChannelModalOpen] = useState(false)

  const loadInvoices = useCallback(async () => {
    try {
      const data = await getProformaInvoices()
      setInvoices(Array.isArray(data) ? data : [])
    } catch {
      setNotification({
        open: true,
        message: 'Failed to load proforma invoices.',
        severity: 'error',
      })
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const processedInvoices = useMemo(() => {
    let data = [...invoices]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter((inv) =>
        [inv.invoice_number, inv.first_name, inv.last_name, inv.status].some((field) =>
          String(field || '').toLowerCase().includes(q)
        )
      )
    }

    if (dateFilter?.startDate) {
      data = data.filter((inv) => new Date(inv.issue_date) >= new Date(dateFilter.startDate))
    }

    if (dateFilter?.endDate) {
      data = data.filter((inv) => new Date(inv.issue_date) <= new Date(dateFilter.endDate))
    }

    switch (sortValue) {
      case 'latest':
        data.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
        break
      case 'oldest':
        data.sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date))
        break
      case 'az':
        data.sort((a, b) => String(a.invoice_number || '').localeCompare(String(b.invoice_number || '')))
        break
      case 'za':
        data.sort((a, b) => String(b.invoice_number || '').localeCompare(String(a.invoice_number || '')))
        break
      default:
        break
    }

    return data
  }, [invoices, searchQuery, sortValue, dateFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortValue, dateFilter])

  const indexOfLast = currentPage * INVOICES_PER_PAGE
  const indexOfFirst = indexOfLast - INVOICES_PER_PAGE
  const currentInvoices = processedInvoices.slice(indexOfFirst, indexOfLast)

  const toggleSelectAll = () => {
    const next = !selectAll
    setSelectAll(next)
    setSelectedInvoices(next ? processedInvoices.map((inv) => inv.id) : [])
  }

  const toggleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const exportToExcel = () => {
    if (!selectedInvoices.length) return

    const selectedData = invoices
      .filter((inv) => selectedInvoices.includes(inv.id))
      .map((inv) => ({
        'Proforma #': inv.invoice_number,
        Customer: `${inv.first_name || ''} ${inv.last_name || ''}`.trim(),
        Date: formatDate(inv.issue_date),
        Total: Number(inv.grand_total || 0).toFixed(2),
        Status: formatStatusLabel(inv.status),
      }))

    const ws = XLSX.utils.json_to_sheet(selectedData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Proforma Invoices')
    XLSX.writeFile(wb, 'selected_proforma_invoices.xlsx')

    setSelectedInvoices([])
    setSelectAll(false)
  }

  const handleExportPdf = async (e, id) => {
    e.stopPropagation()
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

  const handleCreateTaxInvoice = async (e, invoiceId, taxInvoiceId = null) => {
    e.stopPropagation()

    try {
      // If taxInvoiceId already provided, just open it
      if (taxInvoiceId) {
        navigate(`/invoices/${taxInvoiceId}`)
        return
      }

      setCreatingTaxId(invoiceId)
      const res = await createTaxInvoiceFromProforma(invoiceId)
      const createdTaxInvoiceId = res?.tax_invoice?.id

      setNotification({
        open: true,
        message: res?.already_existed
          ? 'Tax invoice already exists for this proforma.'
          : 'Tax invoice created successfully.',
        severity: 'success',
      })

      if (createdTaxInvoiceId) {
        navigate(`/invoices/${createdTaxInvoiceId}`)
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error?.response?.data?.error || 'Failed to create tax invoice.',
        severity: 'error',
      })
    } finally {
      setCreatingTaxId(null)
    }
  }

  const handleSendReminders = async ({ sendEmail = true, sendWhatsApp = false } = {}) => {
    if (!selectedInvoices.length) return

    const ids = [...selectedInvoices]
    const tasks = []

    const { sendProformaEmail, sendProformaWhatsApp } = await import('../services/invoiceService')

    if (sendEmail) tasks.push(...ids.map((id) => sendProformaEmail(id)))
    if (sendWhatsApp) tasks.push(...ids.map((id) => sendProformaWhatsApp(id)))

    const results = await Promise.allSettled(tasks)
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failedCount = results.length - successCount

    setNotification({
      open: true,
      message:
        failedCount === 0
          ? `📩 Notification sent successfully (${successCount} request${successCount > 1 ? 's' : ''})`
          : `⚠️ Sent ${successCount} request(s), failed for ${failedCount}`,
      severity: failedCount === 0 ? 'success' : 'warning',
    })

    setSelectedInvoices([])
    setSelectAll(false)
  }

  return (
    <div className="leads-table-container">
      <Topbar />

      <UtilsBar
        buttonLabel="Create Proforma Invoice"
        onButtonClick={handleOpenProformaDialog}
        selectedCount={selectedInvoices.length}
        onExportSelected={exportToExcel}
        onSendReminders={() => setChannelModalOpen(true)}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
      />

      {/* ── Proforma Creation Option Dialog ── */}
      <Dialog
        open={proformaDialogOpen}
        onClose={() => setProformaDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create Proforma Invoice</DialogTitle>
        <DialogContent dividers>
          <Button
            variant="contained"
            fullWidth
            sx={{ mb: 2, borderRadius: 2, fontWeight: 700 }}
            onClick={handleOpenManualDialog}
          >
            Manual Entry
          </Button>
          <Button
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 2, fontWeight: 700 }}
            onClick={handleOpenQuotationDialog}
          >
            From Approved Quotation
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProformaDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ── Manual Entry Dialog ── */}
      <Dialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Manual Proforma Entry</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ p: 2 }}>
            Redirecting to manual proforma creation form...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => navigate('/proforma-invoices/create')}>Open Form</Button>
        </DialogActions>
      </Dialog>

      {/* ── Select Approved Quotation Dialog ── */}
      <Dialog
        open={quotationDialogOpen}
        onClose={() => !creatingFromQuotation && setQuotationDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select Approved Quotation</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 200 }}>
          {loadingQuotations ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <CircularProgress />
            </div>
          ) : approvedQuotations.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              No approved quotations available.
            </Typography>
          ) : (
            <List disablePadding>
              {approvedQuotations.map((q) => (
                <ListItemButton
                  key={q.id}
                  disabled={creatingFromQuotation}
                  onClick={() => handleCreateFromQuotation(q.id)}
                  divider
                >
                  <ListItemText
                    primary={q.quotation_number || `#${q.id}`}
                    secondary={`${q.first_name || ''} ${q.last_name || ''}`.trim() || q.lead_name || '—'}
                  />
                  {creatingFromQuotation && <CircularProgress size={20} />}
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setQuotationDialogOpen(false)}
            disabled={creatingFromQuotation}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <div className="table-container">
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <Checkbox checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th>PROFORMA #</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>TOTAL</th>
              <th>STATUS</th>
              <th>PDF</th>
              <th>TAX INVOICE</th>
            </tr>
          </thead>

          <tbody>
            {currentInvoices.map((inv) => (
              <tr
                key={inv.id}
                className="clickable-row"
                onClick={() => navigate(`/proforma-invoices/${inv.id}`)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoices.includes(inv.id)}
                    onChange={() => toggleSelectInvoice(inv.id)}
                  />
                </td>
                <td>{inv.invoice_number}</td>
                <td>{inv.first_name} {inv.last_name}</td>
                <td>{formatDate(inv.issue_date)}</td>
                <td>₹ {Number(inv.grand_total || 0).toFixed(2)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Chip
                    label={formatStatusLabel(inv.status)}
                    color={statusColors[inv.status] || 'default'}
                    size="small"
                  />
                </td>
                <td
                  onClick={(e) => handleExportPdf(e, inv.id)}
                  style={{ cursor: 'pointer', color: '#1976d2' }}
                >
                  Export PDF
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<ReceiptLongIcon />}
                    disabled={creatingTaxId === inv.id}
                    onClick={(e) => handleCreateTaxInvoice(e, inv.id, inv.tax_invoice_id || null)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {creatingTaxId === inv.id
                      ? 'Creating...'
                      : inv.tax_invoice_id
                        ? 'Open Tax Invoice'
                        : 'Create Tax Invoice'}
                  </Button>
                </td>
              </tr>
            ))}

            {!currentInvoices.length && (
              <tr>
                <td colSpan={8} className="table-empty-message">
                  No proforma invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processedInvoices.length}
        itemsPerPage={INVOICES_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <NotificationSnackbar
        {...notification}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />

      <ChannelSelectModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title="Send Proforma Notifications"
        subtitle="Select channels to notify selected customers"
        defaultEmail
        defaultWhatsApp
        confirmLabel="Send Notifications"
        onConfirm={async (selection) => {
          setChannelModalOpen(false)
          await handleSendReminders(selection)
        }}
      />
    </div>
  )
}

export default ProformaInvoices
