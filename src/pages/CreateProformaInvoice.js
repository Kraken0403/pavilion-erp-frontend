import React, { useEffect, useState } from 'react'
import { Container, TextField, Stack } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'

import NotificationSnackbar from '../components/ui/NotificationSnackbar'
import InvoiceHeader from '../components/invoices/InvoiceHeader'
import InvoiceContactSection from '../components/invoices/InvoiceContactSection'
import InvoiceItemsSection from '../components/invoices/InvoiceItemsSection'
import InvoiceSummary from '../components/invoices/InvoiceSummary'
import InvoiceFooterSection from '../components/invoices/InvoiceFooterSection'
import Topbar from '../components/Topbar'

import { fetchAllProducts } from '../services/productServices'
import { fetchLeads } from '../services/leadService'
import { createProformaInvoice, getInvoiceSettings, createProformaFromQuotation } from '../services/invoiceService'
import { fetchQuotationById } from '../services/quotationService'
import { toInputDateValue } from '../utils/dateFormatter'

function CreateProformaInvoice() {
  const navigate = useNavigate()

  const [gstPricingMode, setGstPricingMode] = useState('EXCLUSIVE')
  const [currency, setCurrency] = useState('₹')

  const [leadId, setLeadId] = useState('')
  const [leads, setLeads] = useState([])

  const [invoiceDate, setInvoiceDate] = useState(toInputDateValue(new Date()))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')

  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const location = useLocation()
  const [, setReadOnlyFromQuotation] = useState(false)

  useEffect(() => {
    fetchAllProducts()
      .then((res) => {
        const list =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.products) ? res.products : []
        setProducts(list)
      })
      .catch((err) => console.error('Failed to load products', err))
  }, [])

  useEffect(() => {
    fetchLeads()
      .then((res) => {
        const arr =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.leads) ? res.leads : []
        setLeads(arr)
      })
      .catch((err) => console.error('Failed to load leads', err))
  }, [])

  useEffect(() => {
    getInvoiceSettings()
      .then((settings) => {
        setGstPricingMode(settings?.gst_pricing_mode || 'EXCLUSIVE')
        setCurrency(settings?.currency_code || '₹')
      })
      .catch(() => { })
  }, [])

  // If opened with ?quotationId=..., auto-create proforma from that quotation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quotationId = params.get('quotationId') || params.get('quotation_id')
    if (!quotationId) return

    ;(async () => {
      showNotification('Creating proforma from quotation...', 'info')
      try {
        const created = await createProformaFromQuotation(quotationId)
        const id = created?.id || created?.proforma_id || created?.proformaInvoiceId
        if (id) {
          showNotification('Proforma created from quotation', 'success')
          setTimeout(() => navigate(`/proforma-invoices/${id}`), 500)
        } else {
          showNotification('Proforma created but id not returned', 'warning')
        }
      } catch (err) {
        showNotification(err?.response?.data?.error || err.message || 'Failed to create proforma from quotation', 'error')
      }
    })()
  }, [navigate])

  // If navigated with state.quotationId (from Approved Quotation dialog), prefill form and make read-only
  useEffect(() => {
    const qid = location?.state?.quotationId || location?.state?.quotation_id
    if (!qid) return

    ;(async () => {
      try {
        const q = await fetchQuotationById(qid)
        // Lead
        setLeadId(q.lead_id || '')
        // Header
        setInvoiceDate(q.quotation_date ? q.quotation_date.substring(0, 10) : toInputDateValue(new Date()))
        setDueDate(q.valid_until ? (q.valid_until.substring ? q.valid_until.substring(0, 10) : q.valid_until) : '')
        setNotes(q.notes || '')

        // Event details
        setEventName(q.event_name || '')
        setEventDate(q.event_date ? (q.event_date.substring ? q.event_date.substring(0, 10) : q.event_date) : '')

        // Items: normalize to expected shape
        const normalized = (q.items || []).map((it) => ({
          product: it.product_id ? { id: it.product_id, name: it.product_name || '' } : null,
          quantity: Number(it.quantity || 1),
          selling_price: Number(it.selling_price ?? it.unit_price ?? 0),
          gst_rate: Number(it.tax ?? it.gst_rate ?? 0),
          description: it.product_name || it.description || '',
        }))

        setItems(normalized)
        setReadOnlyFromQuotation(true)
        showNotification('Form prefilled from quotation (read-only). You can create now.', 'info')
      } catch (err) {
        console.error(err)
        showNotification('Failed to load quotation for prefill', 'error')
      }
    })()
  }, [location])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product: null,
        quantity: 1,
        selling_price: 0,
        gst_rate: 0,
        variant_id: null,
      },
    ])
  }

  const updateItem = (index, updates) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...updates }
      return copy
    })
  }

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index, product) => {
    if (!product) return

    updateItem(index, {
      product,
      quantity: 1,
      selling_price: Number(product.selling_price || 0),
      gst_rate: Number(product.gst_rate || 0),
      variant_id: product.variantId || null,
    })
  }

  const calculateTotals = () => {
    let subtotal = 0
    let cgst_total = 0
    let sgst_total = 0
    let igst_total = 0
    let grand_total = 0

    items.forEach((item) => {
      const qty = Number(item.quantity || 0)
      const price = Number(item.selling_price || 0)
      const gst = Number(item.gst_rate || 0)
      const lineBase = qty * price

      if (gstPricingMode === 'EXCLUSIVE') {
        subtotal += lineBase
        const gstAmount = (lineBase * gst) / 100
        cgst_total += gstAmount / 2
        sgst_total += gstAmount / 2
        grand_total += lineBase + gstAmount
      } else {
        const base = lineBase / (1 + gst / 100)
        const gstAmount = lineBase - base
        subtotal += base
        cgst_total += gstAmount / 2
        sgst_total += gstAmount / 2
        grand_total += lineBase
      }
    })

    return {
      subtotal,
      cgst_total,
      sgst_total,
      igst_total,
      grand_total,
    }
  }

  const totals = calculateTotals()

  const showNotification = (message, severity = 'success') =>
    setNotif({ open: true, message, severity })

  const handleSubmit = async () => {
    if (!leadId) return showNotification('Customer is required', 'warning')
    if (!invoiceDate) return showNotification('Proforma date is required', 'warning')

    const validItems = items.filter(
      (i) => i.product?.id && Number(i.quantity) > 0 && Number(i.selling_price) >= 0
    )

    if (validItems.length !== items.length) {
      return showNotification('Please check item quantities and prices', 'warning')
    }

    const payload = {
      lead_id: leadId,
      event_details: eventName ? { name: eventName, scheduled_for: eventDate || null } : null,
      issue_date: invoiceDate,
      due_date: dueDate || null,
      notes: notes || null,
      source_type: 'MANUAL_PROFORMA',
      items: validItems.map((i) => ({
        product_id: i.product.id,
        quantity: Number(i.quantity),
        unit_price: Number(i.selling_price),
        gst_rate: Number(i.gst_rate || 0),
      })),
    }

    try {
      await createProformaInvoice(payload)
      showNotification('Proforma invoice created successfully')
      setTimeout(() => navigate('/proforma-invoices'), 700)
    } catch (err) {
      showNotification(
        err?.response?.data?.error || err.message || 'Failed to create proforma invoice',
        'error'
      )
    }
  }

  return (
    <div className="quotations">
      <Container>
        <Topbar />

        <InvoiceHeader
          invoice={{
            invoice_number: 'NEW',
            status: 'issued',
          }}
          documentLabel="Proforma Invoice"
        />

        <div className="quotation-card">
          <InvoiceContactSection
            leadId={leadId}
            setLeadId={setLeadId}
            leads={leads}
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            dueDate={dueDate}
            setDueDate={setDueDate}
            notes={notes}
            setNotes={setNotes}
          />
        </div>

        <div className="quotation-card">
          <Stack spacing={2}>
            <TextField label="Event name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
            <TextField label="Event date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <InvoiceItemsSection
            items={items}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
            products={products}
            handleProductSelect={handleProductSelect}
          />
        </div>

        <div className="quotation-card">
          <InvoiceSummary totals={totals} currency={currency} pricingMode={gstPricingMode} />
          <InvoiceFooterSection handleSubmit={handleSubmit} label="Create Proforma" />
        </div>

        <NotificationSnackbar
          open={notif.open}
          message={notif.message}
          severity={notif.severity}
          onClose={() => setNotif((p) => ({ ...p, open: false }))}
        />
      </Container>
    </div>
  )
}

export default CreateProformaInvoice
