import React, { useEffect, useState } from 'react'
import { Container } from '@mui/material'
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
import { createProformaInvoice, createProformaFromQuotation } from '../services/invoiceService'
import { getSettings } from '../services/settingsService'
import { displayCurrency } from '../utils/currencyUtils'
import { fetchQuotationById, updateQuotationStatus } from '../services/quotationService'
import { getProformaInvoiceById } from '../services/invoiceService'
import { toInputDateValue } from '../utils/dateFormatter'
import { fetchWorkOrderById } from '../services/workOrderServices'
import '../assets/styles/QuotationDetail.scss'

function CreateProformaInvoice() {
  const navigate = useNavigate()

  const [gstPricingMode, setGstPricingMode] = useState(null)
  const [currency, setCurrency] = useState('₹')

  const [leadId, setLeadId] = useState('')
  const [leads, setLeads] = useState([])

  const [invoiceDate, setInvoiceDate] = useState(toInputDateValue(new Date()))
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const location = useLocation()
  
  const [readOnly, setReadOnly] = useState(false)
  const [editingProformaId, setEditingProformaId] = useState(null)

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

  // helper to derive gst rate: if item provides gst_rate use it, otherwise
  // if item.tax looks like an amount compute percentage = (tax / (qty*unit)) * 100
  const deriveGstRate = (it, prod) => {
    const explicit = it.gst_rate ?? it.gstRate
    if (typeof explicit !== 'undefined' && explicit !== null && explicit !== '') return Number(explicit)

    const taxAmount = Number(it.tax ?? it.tax_amount ?? it.gst_amount ?? NaN)
    const qty = Number(it.quantity ?? it.qty ?? 1)
    const unit = Number(it.selling_price ?? it.unit_price ?? it.price ?? (prod ? prod.selling_price : 0))

    if (!Number.isNaN(taxAmount) && qty > 0 && unit > 0) {
      const base = qty * unit
      // avoid division by zero
      if (base > 0) return Number(((taxAmount / base) * 100).toFixed(2))
    }

    return Number(prod?.gst_rate ?? 0)
  }

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setGstPricingMode(settings?.gst_pricing_mode || 'EXCLUSIVE')
        setCurrency(displayCurrency(settings?.currency_code))
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
          // Mark the quotation converted in the backend and continue
          try {
            await updateQuotationStatus(Number(quotationId), 'converted')
          } catch (e) {
            console.warn('Failed to update quotation status after proforma creation', e && e.message ? e.message : e)
          }

          setTimeout(() => navigate(`/proforma-invoices/${id}`), 500)
        } else {
          showNotification('Proforma created but id not returned', 'warning')
        }
      } catch (err) {
        showNotification(err?.response?.data?.error || err.message || 'Failed to create proforma from quotation', 'error')
      }
    })()
  }, [navigate, products])

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


        // Items: normalize to expected shape and map to existing product objects when available
        const normalized = (q.items || []).map((it) => {
          const pid = it.product_id || null
          const prod = Array.isArray(products) ? products.find(p => Number(p.id) === Number(pid)) : null
          return {
            product: prod || (pid ? { id: pid, name: it.product_name || '' } : null),
            quantity: Number(it.quantity || 1),
            selling_price: Number(it.selling_price ?? it.unit_price ?? (prod ? prod.selling_price : 0) ?? 0),
            gst_rate: deriveGstRate(it, prod),
            description: it.product_name || it.description || '',
          }
        })

        setItems(normalized)
        
        showNotification('Form prefilled from quotation (read-only). You can create now.', 'info')
      } catch (err) {
        console.error(err)
        showNotification('Failed to load quotation for prefill', 'error')
      }
    })()
  }, [location, products])

  // If navigated with state.workOrderId or ?workOrderId=..., prefill form from work order
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const workOrderId = params.get('workOrderId') || params.get('work_order_id') || location?.state?.workOrderId || location?.state?.work_order_id
    if (!workOrderId) return

    ;(async () => {
      try {
        const wo = await fetchWorkOrderById(workOrderId)

        // Lead
        setLeadId(wo.lead_id || wo.leadId || wo.customer_id || '')

        // Header: prefer event_date, else created_at / today
        setInvoiceDate(wo.event_date ? (wo.event_date.substring ? wo.event_date.substring(0,10) : wo.event_date) : toInputDateValue(new Date()))
        setDueDate('')
        setNotes(wo.notes || wo.description || '')

        // Ensure products list available
        let prods = products
        if (!Array.isArray(prods) || prods.length === 0) {
          try {
            const res = await fetchAllProducts()
            prods = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.products) ? res.products : []
            setProducts(prods)
          } catch (err) {
            prods = []
          }
        }

        // Items: normalize work order items -> form items
        const normalized = (wo.items || []).map((it) => {
          const pid = it.product_id || it.productId || null
          const prod = Array.isArray(prods) ? prods.find(p => Number(p.id) === Number(pid)) : null
          return {
            product: prod || (pid ? { id: pid, name: it.product_name || it.name || it.description || '' } : null),
            quantity: Number(it.quantity || it.qty || 1),
            selling_price: Number(it.unit_price ?? it.selling_price ?? (prod ? prod.selling_price : 0) ?? 0),
            gst_rate: deriveGstRate(it, prod),
            description: it.description || it.product_name || it.name || '',
          }
        })

        setItems(normalized)

        showNotification('Form prefilled from work order. You can create now.', 'info')
      } catch (err) {
        console.error(err)
        showNotification('Failed to load work order for prefill', 'error')
      }
    })()
  }, [location, products])

  // If navigated with state.proformaId (Edit from Proforma details), prefill form for editing
  useEffect(() => {
    const pid = location?.state?.proformaId || location?.state?.proforma_id
    if (!pid) return

    ;(async () => {
      try {
        const p = await getProformaInvoiceById(pid)
        setEditingProformaId(pid)

        // Lead
        setLeadId(p.lead_id || p.leadId || '')

        // Header
        setInvoiceDate(p.issue_date ? (p.issue_date.substring ? p.issue_date.substring(0, 10) : p.issue_date) : toInputDateValue(new Date()))
        setDueDate(p.due_date ? (p.due_date.substring ? p.due_date.substring(0, 10) : p.due_date) : '')
        setNotes(p.notes || '')

        // Ensure products list available
        let prods = products
        if (!Array.isArray(prods) || prods.length === 0) {
          try {
            const res = await fetchAllProducts()
            prods = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.products) ? res.products : []
            setProducts(prods)
          } catch (err) {
            prods = []
          }
        }

        // Items: map proforma_items -> form items
        const normalized = (p.items || []).map((it) => {
          const pid = it.product_id || null
          const prod = Array.isArray(prods) ? prods.find(x => Number(x.id) === Number(pid)) : null
          return {
            product: prod || (pid ? { id: pid, name: it.product_name || it.description || '' } : null),
            quantity: Number(it.quantity || 1),
            selling_price: Number(it.unit_price ?? it.selling_price ?? it.unitPrice ?? 0),
            gst_rate: Number(it.gst_rate ?? it.gstRate ?? 0),
            description: it.description || it.product_name || '',
          }
        })

        setItems(normalized)
        
        setReadOnly(Boolean(p.tax_invoice_exists))
        showNotification(p.tax_invoice_exists ? 'This proforma is finalized (tax invoice exists).' : 'Form prefilled for edit (not saved until you submit).', p.tax_invoice_exists ? 'warning' : 'info')
      } catch (err) {
        console.error(err)
        showNotification('Failed to load proforma for edit', 'error')
      }
    })()
  }, [location, products])

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
    const mode = gstPricingMode || 'EXCLUSIVE'
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

      if (mode === 'EXCLUSIVE') {
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

  // Rounding amount: default removes decimal part (nearest integer adjustment)
  const [roundingAmount, setRoundingAmount] = useState(null)
  const [roundingManual, setRoundingManual] = useState(false)

  useEffect(() => {
    if (roundingManual) return
    const grand = Number(totals.grand_total || 0)
    const defaultRound = Math.round(grand) - grand
    setRoundingAmount(Number(defaultRound.toFixed(2)))
  }, [totals.grand_total, roundingManual])

  const handleSetRoundingAmount = (v) => {
    setRoundingManual(true)
    setRoundingAmount(Number(v || 0))
  }

  const derivedTotals = { ...totals, roundingAmount: Number(roundingAmount || 0), grand_total: Number((totals.grand_total || 0) + (Number(roundingAmount) || 0)) }

  const showNotification = (message, severity = 'success') =>
    setNotif({ open: true, message, severity })

  const handleSubmit = async () => {
    if (readOnly && editingProformaId) return showNotification('This proforma is finalized and cannot be edited', 'warning')
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
      issue_date: invoiceDate,
      due_date: dueDate || null,
      notes: notes || null,
      // default to manual proforma; if this form was prefilling from a quotation
      // include the quotation as the source so server can mark it converted.
      source_type: 'MANUAL_PROFORMA',
      items: validItems.map((i) => ({
        product_id: i.product?.id || null,
        description: i.description || (i.product ? i.product.name : null),
        quantity: Number(i.quantity),
        unit_price: Number(i.selling_price),
        gst_rate: Number(i.gst_rate || 0),
      })),
      rounding_amount: Number(roundingAmount || 0),
      grand_total: Number((totals.grand_total || 0) + (Number(roundingAmount) || 0)),
    }

    // If navigated from a quotation (prefill via location.state), set source_type and source_id
    const qid = location?.state?.quotationId || location?.state?.quotation_id
    if (qid) {
      payload.source_type = 'QUOTATION_PROFORMA'
      payload.source_id = Number(qid)
    }

    // If navigated from a work order, mark the proforma source
    const wid = location?.state?.workOrderId || location?.state?.work_order_id
    if (wid) {
      payload.source_type = 'WORKORDER_PROFORMA'
      payload.source_id = Number(wid)
    }

    try {
      await createProformaInvoice(payload)
      // If created from a quotation, mark quotation as converted
      try {
        if (payload.source_type && String(payload.source_type).toUpperCase().includes('QUOTATION') && payload.source_id) {
          await updateQuotationStatus(Number(payload.source_id), 'converted')
        }
      } catch (e) {
        console.warn('Failed to update quotation status after manual proforma creation', e && e.message ? e.message : e)
      }

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
          <InvoiceSummary totals={derivedTotals} currency={currency} pricingMode={gstPricingMode} roundingAmount={roundingAmount} setRoundingAmount={handleSetRoundingAmount} />
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
