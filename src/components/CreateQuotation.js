import React, { useCallback, useEffect, useState } from 'react'
import { Container } from '@mui/material'
import { useParams } from 'react-router-dom'

import Topbar from './Topbar'
import NotificationSnackbar from '../components/ui/NotificationSnackbar'

import QuotationContactSection from '../components/quotation/QuotationContactSection'
import QuotationItemsSection from '../components/quotation/QuotationItemsSection'
import QuotationFooterSection from '../components/quotation/QuotationFooterSection'
import QuotationSummary from './quotation/QuotationSummary'
import { getSettings } from '../services/settingsService'

import {
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import {
  fetchAllProducts,
  createProduct,
  updateProduct
} from '../services/productServices'
import AddProductDialog from './products/AddProductDialog'
import AddLeadDialog from '../components/leads/AddLeadDialog'

import { createQuotation } from '../services/quotationService'
import { fetchLeads } from '../services/leadService'
import { getQuotationSettings } from '../services/quotationSettingsService'
import { calculateQuotationTotals } from '../utils/quotationCalculator'
import QuotationHeader from '../components/quotation/QuotationHeader'
import { toInputDateValue } from '../utils/dateFormatter'


function CreateQuotation() {
  const toDateInput = (value) => {
    if (!value) return ''
    const raw = String(value).trim()
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return ''
    return toInputDateValue(parsed)
  }

  const toTimeInput = (value) => {
    if (!value) return ''
    const raw = String(value).trim()
    const match = raw.match(/^(\d{2}:\d{2})/)
    if (match) return match[1]

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return ''
    const hh = String(parsed.getHours()).padStart(2, '0')
    const mm = String(parsed.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  /* ---------------------------------------
     GLOBAL SETTINGS
  --------------------------------------- */
  const [gstPricingMode, setGstPricingMode] = useState('INCLUSIVE')
  const [currency, setCurrency] = useState('₹')
  const [quotationMode, setQuotationMode] = useState('GENERAL')
  const [editingProduct, setEditingProduct] = useState(null);
  const [leadId, setLeadId] = useState('')
  const [leads, setLeads] = useState([])
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [prefillLeadName, setPrefillLeadName] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [quotationDate, setQuotationDate] = useState(
    toInputDateValue(new Date())
  )
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState([])
  const [productPrefilledLeadId, setProductPrefilledLeadId] = useState(null)

  const { leadId: routeLeadId } = useParams()

  const [products, setProducts] = useState([])

  const [pax, setPax] = useState(null)
  const [cateringMeta, setCateringMeta] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    event_location: ''
  })

  const [openProductDialog, setOpenProductDialog] = useState(false)


  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' })

  const showNotification = useCallback((message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }, [])

  const calculatePrefilledLine = useCallback(({ quantity, selling_price, discount, gst_rate }) => {
    const qty = Math.max(Number(quantity || 1), 1)
    const price = Math.max(Number(selling_price || 0), 0)
    const rawDiscount = Math.max(Number(discount || 0), 0)
    const gross = qty * price
    const appliedDiscount = Math.min(rawDiscount, Math.max(gross, 0))
    const discounted = Math.max(gross - appliedDiscount, 0)
    const gst = Math.max(Number(gst_rate || 0), 0)

    let tax = 0
    let line_total = discounted

    if (gst > 0) {
      if (gstPricingMode === 'INCLUSIVE') {
        tax = discounted * gst / (100 + gst)
        line_total = discounted
      } else {
        tax = discounted * gst / 100
        line_total = discounted + tax
      }
    }

    return { tax, line_total }
  }, [gstPricingMode])

  /* ---------------------------------------
   GLOBAL SYSTEM MODE (CATERING / GENERAL)
    --------------------------------------- */
  useEffect(() => {
    getSettings()
      .then(settings => {
        setQuotationMode(settings?.business_type || 'GENERAL')
        setGstPricingMode(settings?.gst_pricing_mode || 'INCLUSIVE')
      })
      .catch(err => console.error('Failed to load global settings', err))
  }, [])

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
     SETTINGS
  --------------------------------------- */
  useEffect(() => {
    getQuotationSettings()
      .then(settings => {
        setCurrency(settings?.currency_code || '₹')
      })
      .catch(err => console.error('Failed to load quotation settings', err))
  }, [])


  /* ---------------------------------------
     LEADS
  --------------------------------------- */


  useEffect(() => {
    fetchLeads()
      .then(res => {
        const arr =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.leads) ? res.leads : []

        setLeads(arr)

        if (routeLeadId) {
          const match = arr.find(l => String(l.id) === String(routeLeadId))
          if (match) {
            setLeadId(match.id)
            setSelectedLead(match)
          }
        }
      })
      .catch(err => console.error('Failed to load leads', err))
  }, [routeLeadId])

  /* ---------------------------------------
     HEADER
  --------------------------------------- */


  const addItem = () => {
    setItems(p => [
      ...p,
      {
        product: null,
        quantity: 1,
        selling_price: 0,
        cost_price: 0,
        discount: 0,
        gst_rate: 0,
        tax: 0,
        line_total: 0,
        variant_id: null
      }
    ])
  }

  const updateItem = (index, updates) => {
    setItems(p => {
      const next = [...p]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const handleAddProduct = async (productData) => {
    try {
      let savedProduct;

      if (editingProduct) {
        savedProduct = await updateProduct(editingProduct.id, productData)
        showNotification('✅ Product updated successfully')
      } else {
        savedProduct = await createProduct(productData)
        showNotification('✅ Product created successfully')
      }

      // 🔁 Refresh product list so autocomplete updates
      const res = await fetchAllProducts()
      const list =
        Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
            Array.isArray(res?.products) ? res.products : []
      setProducts(list)

      // 🔒 Close dialog
      setOpenProductDialog(false)
      setEditingProduct(null)

      return savedProduct
    } catch (err) {
      showNotification(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save product',
        'error'
      )
      throw err
    }
  }


  const reorderItems = (from, to) => {
    if (from === to || from == null || to == null) return
    setItems(p => {
      const next = [...p]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleProductSelect = (index, product) => {
    if (!product) return

    updateItem(index, {
      product,
      quantity: 1,
      selling_price: Number(product.selling_price || product.price || 0),
      cost_price: Number(product.cost_price || 0),
      discount: 0,
      gst_rate: Number(product.gst_rate || 0),
      variant_id: product.variantId || null
    })
  }

  /* ---------------------------------------
     CATERING META
  --------------------------------------- */

  useEffect(() => {
    if (quotationMode !== 'CATERING') {
      setPax(null)
      setCateringMeta({
        event_name: '',
        event_date: '',
        event_time: '',
        event_location: ''
      })
    }
  }, [quotationMode])

  // Prefill event fields when a lead is selected for catering quotations.
  useEffect(() => {
    if (!selectedLead || quotationMode !== 'CATERING') return

    setPax(selectedLead?.pax ? Number(selectedLead.pax) : null)
    setCateringMeta({
      event_name: selectedLead?.event_name || selectedLead?.event_type || '',
      event_date: toDateInput(selectedLead?.event_date),
      event_time: toTimeInput(selectedLead?.event_time),
      event_location: selectedLead?.event_location || '',
    })
  }, [selectedLead, quotationMode])

  // Prefill quotation item from lead product details when opening from lead route.
  useEffect(() => {
    if (!routeLeadId || !selectedLead || !products.length) return
    if (String(productPrefilledLeadId) === String(selectedLead.id)) return

    setProductPrefilledLeadId(selectedLead.id)

    // Do not overwrite if user already added/edited items.
    if (items.length > 0) return

    const leadProductId = Number(selectedLead?.product_id || 0)
    const leadProductName = String(selectedLead?.product_name || '').trim()

    let matchedProduct = null

    if (leadProductId > 0) {
      matchedProduct = products.find((product) => Number(product?.id) === leadProductId) || null
    }

    if (!matchedProduct && leadProductName) {
      const normalizedName = leadProductName.toLowerCase()
      matchedProduct = products.find(
        (product) => String(product?.name || '').trim().toLowerCase() === normalizedName
      ) || null
    }

    if (!matchedProduct) {
      if (leadProductId > 0 || leadProductName) {
        showNotification('Lead product not found in product master. Please select it manually.', 'warning')
      }
      return
    }

    const quantity = quotationMode === 'CATERING'
      ? Math.max(1, Number(selectedLead?.pax || 1))
      : 1

    const selling_price = Number(matchedProduct?.selling_price || matchedProduct?.price || 0)
    const cost_price = Number(matchedProduct?.cost_price || 0)
    const discount = 0
    const gst_rate = Number(matchedProduct?.gst_rate || 0)

    const calc = calculatePrefilledLine({
      quantity,
      selling_price,
      discount,
      gst_rate,
    })

    setItems([
      {
        product: matchedProduct,
        quantity,
        selling_price,
        cost_price,
        discount,
        gst_rate,
        tax: calc.tax,
        line_total: calc.line_total,
        variant_id: matchedProduct?.variantId || null
      }
    ])
  }, [
    routeLeadId,
    selectedLead,
    products,
    quotationMode,
    items.length,
    productPrefilledLeadId,
    calculatePrefilledLine,
    showNotification,
  ])

  /* ---------------------------------------
     DISCOUNT (FLAT FOR NOW)
  --------------------------------------- */
  const [overallDiscount, setOverallDiscount] = useState(0)

  /* ---------------------------------------
     TOTALS (ALWAYS SAFE)
  --------------------------------------- */
  const totals = calculateQuotationTotals({
    items,
    overallDiscount,
    pax,
    quotationMode,
    gstPricingMode
  })

  /* ---------------------------------------
     SUBMIT
  --------------------------------------- */
  const handleSubmit = async () => {
    if (!leadId) return showNotification('Lead is required', 'warning')
    if (!quotationDate) return showNotification('Quotation date is required', 'warning')

    if (quotationMode === 'CATERING' && (!pax || pax < 1)) {
      return showNotification('PAX is required for catering', 'warning')
    }

    // ✅ VALIDATE: Sum of quantities must equal PAX in CATERING mode
    if (quotationMode === 'CATERING') {
      const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      if (totalQty !== Number(pax)) {
        return showNotification(
          `Total quantity (${totalQty}) must equal PAX (${pax})`,
          'error'
        )
      }
    }

    const validItems = items.filter(
      i =>
        i.product?.id &&
        Number(i.quantity) > 0 &&
        Number(i.selling_price) >= 0
    )

    if (validItems.length !== items.length) {
      return showNotification('Please check item quantities and prices', 'warning')
    }

    const payload = {
      lead_id: leadId,
      quotation_date: quotationDate,
      valid_until: validUntil || null,
      notes: notes || null,

      // 🔒 LOCKED DISCOUNT LOGIC
      quotation_discount_type: 'FLAT',
      quotation_discount_value: Number(overallDiscount || 0),
      quotation_discount_amount: Number(overallDiscount || 0),

      // Optional but recommended to store
      total_tax: Number(totals.totalTax || 0),
      grand_total: Number(totals.grandTotal || 0),

      items: validItems.map(i => ({
        product_id: i.product.id,
        variant_id: i.variant_id || null,
        quantity: Number(i.quantity),
        unit_price: Number(i.selling_price),
        discount: Number(i.discount || 0),
        gst_rate: Number(i.gst_rate || 0),
        cost_price: Number(i.cost_price || 0),
        cost_price_unit: i.cost_price_unit || 'unit',
        cost_price_qty: Number(i.cost_price_qty || 1),
        cost_pricing_mode: i.cost_pricing_mode || 'absolute',
        cost_discount_percent: Number(i.cost_discount_percent || 0)
      })),

      ...(quotationMode === 'CATERING' && {
        pax,
        event_name: cateringMeta.event_name,
        event_date: cateringMeta.event_date || null,
        event_time: cateringMeta.event_time || null,
        event_location: cateringMeta.event_location || null
      })
    }

    try {
      await createQuotation(payload)
      showNotification('✅ Quotation created successfully')
      // redirect to quotations list
      window.location.href = '/quotations'
    } catch (err) {
      showNotification(
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err.message ||
        'Failed to create quotation',
        'error'
      )
    }
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="quotations">
      <Container>
        <Topbar />

        <QuotationHeader
          quotation={{
            quotation_number: 'NEW',
            version: 1,
            status: 'pending'
          }}
          showActions={false}
        />


        <div className="quotation-card">
          <QuotationContactSection
            leadId={leadId}
            setLeadId={setLeadId}
            leads={leads}
            selectedLead={selectedLead}
            setSelectedLead={setSelectedLead}
            quotationDate={quotationDate}
            setQuotationDate={setQuotationDate}
            validUntil={validUntil}
            setValidUntil={setValidUntil}
            notes={notes}
            setNotes={setNotes}
            openAddLeadDialog={() => setAddLeadOpen(true)}
            setPrefillLeadName={setPrefillLeadName}
          />
        </div>




        {quotationMode === 'CATERING' && (
          <div className="quotation-card">
            <div className="quotation-contact-section">
              <Typography className="section-title">
                <span className="sep"></span>
                Event Details
              </Typography>

              <Grid container spacing={2}>
                {/* EVENT NAME */}
                <Grid item xs={12} md={4}>
                  <Typography className="field-label">Event Name</Typography>
                  <TextField
                    className="form-input"
                    fullWidth
                    value={cateringMeta.event_name || ''}
                    onChange={(e) =>
                      setCateringMeta((p) => ({
                        ...p,
                        event_name: e.target.value,
                      }))
                    }
                  />
                </Grid>

                {/* EVENT DATE */}
                <Grid item xs={12} md={4}>
                  <Typography className="field-label">Event Date</Typography>
                  <TextField
                    className="form-input"
                    type="date"
                    fullWidth
                    value={cateringMeta.event_date || ''}
                    onChange={(e) =>
                      setCateringMeta((p) => ({
                        ...p,
                        event_date: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* EVENT TIME */}
                <Grid item xs={12} md={4}>
                  <Typography className="field-label">Event Time</Typography>
                  <TextField
                    className="form-input"
                    type="time"
                    fullWidth
                    value={cateringMeta.event_time || ''}
                    onChange={(e) =>
                      setCateringMeta((p) => ({
                        ...p,
                        event_time: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* EVENT LOCATION */}
                <Grid item xs={12} md={6}>
                  <Typography className="field-label">Event Location</Typography>
                  <TextField
                    className="form-input"
                    fullWidth
                    value={cateringMeta.event_location || ''}
                    onChange={(e) =>
                      setCateringMeta((p) => ({
                        ...p,
                        event_location: e.target.value,
                      }))
                    }
                  />
                </Grid>

                {/* PAX */}
                <Grid item xs={12} md={6}>
                  <Typography className="field-label">PAX</Typography>
                  <TextField
                    className="form-input"
                    type="number"
                    fullWidth
                    inputProps={{ min: 1 }}
                    value={pax ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value

                      if (raw === '') {
                        setPax(null)
                        return
                      }

                      setPax(Math.max(1, Number(raw)))
                    }}
                  />
                </Grid>
              </Grid>
            </div>
          </div>
        )}





        <div className="quotation-card">
          <QuotationItemsSection
            items={items}
            setItems={setItems}
            updateItem={updateItem}
            handleProductSelect={handleProductSelect}
            addItem={addItem}
            openProductDialog={openProductDialog}
            setOpenProductDialog={setOpenProductDialog}
            quotationMode={quotationMode}
            pax={quotationMode === 'CATERING' ? pax : null}
            gstPricingMode={gstPricingMode}
            isLocked={false}
            reorderItems={reorderItems}
            products={products}
          />
        </div>

        <div className="quotation-card">
          <QuotationSummary
            totals={totals}
            overallDiscount={overallDiscount}
            setOverallDiscount={setOverallDiscount}
            currency={currency}
          />
          <QuotationFooterSection
            total={Number(totals.grandTotal || 0)}
            handleSubmit={handleSubmit}
            currency={currency}
          />
        </div>

        <AddProductDialog
          open={openProductDialog}
          onClose={() => {
            setOpenProductDialog(false)
            setEditingProduct(null)
          }}
          onAddProduct={handleAddProduct}
          productToEdit={editingProduct}
        />

        <AddLeadDialog
          open={addLeadOpen}
          onClose={() => setAddLeadOpen(false)}
          prefillName={prefillLeadName}
          showNotification={showNotification}
          onLeadCreated={async (leadId) => {
            const res = await fetchLeads()
            const arr =
              Array.isArray(res) ? res :
                Array.isArray(res?.data) ? res.data :
                  Array.isArray(res?.leads) ? res.leads : []

            setLeads(arr)

            const match = arr.find(l => String(l.id) === String(leadId))
            if (match) {
              setSelectedLead(match)
              setLeadId(match.id)
            }
          }}
        />

        <NotificationSnackbar
          open={notif.open}
          message={notif.message}
          severity={notif.severity}
          onClose={() => setNotif(p => ({ ...p, open: false }))}
        />
      </Container>
    </div>
  )
}

export default CreateQuotation
