import React, { useEffect, useState } from 'react'
import { Container } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import NotificationSnackbar from '../components/ui/NotificationSnackbar'

import InvoiceHeader from '../components/invoices/InvoiceHeader'
import InvoiceContactSection from '../components/invoices/InvoiceContactSection'
import InvoiceItemsSection from '../components/invoices/InvoiceItemsSection'
import InvoiceSummary from '../components/invoices/InvoiceSummary'
import InvoiceFooterSection from '../components/invoices/InvoiceFooterSection'

import {
  fetchAllProducts
} from '../services/productServices'

import { fetchLeads } from '../services/leadService'
import { createInvoice } from '../services/invoiceService'
import { getSettings } from '../services/settingsService'
import { displayCurrency } from '../utils/currencyUtils'
import Topbar from '../components/Topbar'
import { toInputDateValue } from '../utils/dateFormatter'
import '../assets/styles/QuotationDetail.scss'

function CreateInvoice() {
  const navigate = useNavigate()

  /* ---------------------------------------
     SETTINGS
  --------------------------------------- */

  const [gstPricingMode, setGstPricingMode] = useState(null)
  const [currency, setCurrency] = useState('₹')

  /* ---------------------------------------
     BASIC STATE
  --------------------------------------- */

  const [leadId, setLeadId] = useState('')
  const [leads, setLeads] = useState([])

  const [invoiceDate, setInvoiceDate] = useState(
    toInputDateValue(new Date())
  )
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState([])

  const [products, setProducts] = useState([])

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  /* ---------------------------------------
     LOAD PRODUCTS
  --------------------------------------- */

  useEffect(() => {
    fetchAllProducts()
      .then(res => {
        const list =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.products) ? res.products : []
        setProducts(list)
      })
      .catch(err => console.error('Failed to load products', err))
  }, [])

  /* ---------------------------------------
     LOAD LEADS
  --------------------------------------- */

  useEffect(() => {
    fetchLeads()
      .then(res => {
        const arr =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.leads) ? res.leads : []
        setLeads(arr)
      })
      .catch(err => console.error('Failed to load leads', err))
  }, [])

  /* ---------------------------------------
     LOAD INVOICE SETTINGS
  --------------------------------------- */

  useEffect(() => {
    getSettings()
      .then(settings => {
        setGstPricingMode(settings?.gst_pricing_mode || 'EXCLUSIVE')
        setCurrency(displayCurrency(settings?.currency_code))
      })
      .catch(() => { })
  }, [])

  /* ---------------------------------------
     ITEM MANAGEMENT
  --------------------------------------- */

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        product: null,
        quantity: 1,
        selling_price: 0,
        gst_rate: 0,
        variant_id: null
      }
    ])
  }

  const updateItem = (index, updates) => {
    setItems(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...updates }
      return copy
    })
  }

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleProductSelect = (index, product) => {
    if (!product) return

    updateItem(index, {
      product,
      quantity: 1,
      selling_price: Number(product.selling_price || 0),
      gst_rate: Number(product.gst_rate || 0),
      variant_id: product.variantId || null
    })
  }

  /* ---------------------------------------
     TOTAL CALCULATION (CLIENT SIDE PREVIEW)
  --------------------------------------- */

  const calculateTotals = () => {
    const mode = gstPricingMode || 'EXCLUSIVE'
    let subtotal = 0
    let cgst_total = 0
    let sgst_total = 0
    let igst_total = 0
    let grand_total = 0

    items.forEach(item => {
      const qty = Number(item.quantity || 0)
      const price = Number(item.selling_price || 0)
      const gst = Number(item.gst_rate || 0)

      const lineBase = qty * price

      if (mode === 'EXCLUSIVE') {
        subtotal += lineBase
        const gstAmount = (lineBase * gst) / 100

        // Simplified assumption (split equally)
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
      grand_total
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

  /* ---------------------------------------
     SUBMIT
  --------------------------------------- */

  const handleSubmit = async () => {

    if (!leadId)
      return showNotification('Customer is required', 'warning')

    if (!invoiceDate)
      return showNotification('Invoice date is required', 'warning')

    const validItems = items.filter(
      i =>
        i.product?.id &&
        Number(i.quantity) > 0 &&
        Number(i.selling_price) >= 0
    )

    if (validItems.length !== items.length)
      return showNotification('Please check item quantities and prices', 'warning')

    const payload = {
      lead_id: leadId,
      issue_date: invoiceDate,
      due_date: dueDate || null,
      notes: notes || null,
      source_type: 'MANUAL',
      rounding_amount: Number(roundingAmount || 0),
      grand_total: Number((totals.grand_total || 0) + (Number(roundingAmount) || 0)),
      items: validItems.map(i => ({
        product_id: i.product.id,
        quantity: Number(i.quantity),
        unit_price: Number(i.selling_price),
        gst_rate: Number(i.gst_rate || 0)
      }))
    }

    try {
      await createInvoice(payload)

      showNotification('✅ Invoice created successfully')

      // redirect to invoices list after a brief delay so the user sees the success message
      setTimeout(() => navigate('/invoices'), 1000)

    } catch (err) {
      showNotification(
        err?.response?.data?.error ||
        err.message ||
        'Failed to create invoice',
        'error'
      )
    }
  }

  const showNotification = (message, severity = 'success') =>
    setNotif({ open: true, message, severity })

  /* ---------------------------------------
     UI
  --------------------------------------- */

  return (
    <div className="quotations">
      <Container>
        <Topbar />

        <InvoiceHeader
          invoice={{
            invoice_number: 'NEW',
            status: 'issued'
          }}
          documentLabel="Tax Invoice"
        />

        {/* CONTACT */}
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

        {/* ITEMS */}
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

        {/* SUMMARY */}
        <div className="quotation-card">
          <InvoiceSummary
            totals={{ ...totals, grand_total: Number((totals.grand_total || 0) + (Number(roundingAmount) || 0)) }}
            currency={currency}
            pricingMode={gstPricingMode}
            roundingAmount={roundingAmount}
            setRoundingAmount={handleSetRoundingAmount}
          />
          <InvoiceFooterSection
            handleSubmit={handleSubmit}
          />
        </div>

        <NotificationSnackbar
          open={notif.open}
          message={notif.message}
          severity={notif.severity}
          onClose={() =>
            setNotif(p => ({ ...p, open: false }))
          }
        />
      </Container>
    </div>
  )
}

export default CreateInvoice
