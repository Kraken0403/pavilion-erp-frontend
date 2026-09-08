import React, { useEffect, useState } from 'react'
import { Container } from '@mui/material'
import { useParams } from 'react-router-dom'

import NotificationSnackbar from '../components/ui/NotificationSnackbar'

import QuotationContactSection from '../components/quotation/QuotationContactSection'
import QuotationItemsSection from '../components/quotation/QuotationItemsSection'
import QuotationFooterSection from '../components/quotation/QuotationFooterSection'
import QuotationSummary from './quotation/QuotationSummary'

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
import { useSettings } from '../context/SettingsContext'
import { displayCurrency } from '../utils/currencyUtils'
import '../assets/styles/QuotationDetail.scss'


function CreateQuotation() {
  const { settings: globalSettings } = useSettings() || {}
  /* ---------------------------------------
     GLOBAL SETTINGS
  --------------------------------------- */
  const [gstPricingMode, setGstPricingMode] = useState('EXCLUSIVE')
  const [currency, setCurrency] = useState('₹')
  const [quotationMode, setQuotationMode] = useState('GENERAL')
  const [editingProduct, setEditingProduct] = useState(null);
  const [leadId, setLeadId] = useState('')
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState([])

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
  const [openAddLeadDialog, setOpenAddLeadDialog] = useState(false)
  const [prefillLeadName, setPrefillLeadName] = useState('')
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' })


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
        const businessType = String(globalSettings?.business_type || 'GENERAL').toUpperCase()
        const nextMode = businessType === 'CATERING'
          ? 'CATERING'
          : businessType === 'HYBRID'
            ? (settings?.quotation_mode || 'GENERAL')
            : 'GENERAL'
        setQuotationMode(nextMode)
        setGstPricingMode(settings?.gst_pricing_mode || globalSettings?.gst_pricing_mode || 'EXCLUSIVE')
        setCurrency(displayCurrency(settings?.currency_code || globalSettings?.currency_code || 'INR'))
      })
      .catch(err => console.error('Failed to load quotation settings', err))
  }, [globalSettings])

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




  const showNotification = (message, severity = 'success') =>
    setNotif({ open: true, message, severity })

  /* ---------------------------------------
     SUBMIT
  --------------------------------------- */
  const handleSubmit = async () => {
    if (!leadId) return showNotification('Lead is required', 'warning')
    if (!quotationDate) return showNotification('Quotation date is required', 'warning')

    if (quotationMode === 'CATERING' && (!pax || pax < 1)) {
      return showNotification('PAX is required for catering', 'warning')
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
        gst_rate: Number(i.gst_rate || 0)
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

      // reset
      setItems([])
      setOverallDiscount(0)
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
    <div className="quotations quotation-page quotation-create-page">
      <Container className="quotation-page-container">
        <QuotationHeader
          quotation={{
            quotation_number: 'NEW',
            version: 1,
            status: 'pending'
          }}
          showActions={false}
        />

        <div className="quotation-card quotation-card--compact">
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
              openAddLeadDialog={() => setOpenAddLeadDialog(true)}
              setPrefillLeadName={setPrefillLeadName}
              defaultDetailsOpen={false}
            />
        </div>



        {quotationMode === 'CATERING' && (
          <div className="quotation-card quotation-card--compact catering-meta">
            <h3>Event Details</h3>
            <div className="grid">
              <input placeholder="Event Name" value={cateringMeta.event_name}
                onChange={e => setCateringMeta(p => ({ ...p, event_name: e.target.value }))} />
              <input type="date" value={cateringMeta.event_date}
                onChange={e => setCateringMeta(p => ({ ...p, event_date: e.target.value }))} />
              <input type="time" value={cateringMeta.event_time}
                onChange={e => setCateringMeta(p => ({ ...p, event_time: e.target.value }))} />
              <input placeholder="Event Location" value={cateringMeta.event_location}
                onChange={e => setCateringMeta(p => ({ ...p, event_location: e.target.value }))} />
              <input type="number" min={1} placeholder="PAX" value={pax || ''}
                onChange={e => setPax(Number(e.target.value) || null)} />
            </div>
            </div>
        )}


        <div className="quotation-card quotation-card--items">
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
              isLocked={false}
              reorderItems={reorderItems}
              products={products}
            />
        </div>

        <div className="quotation-card quotation-card--summary">
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
          open={openAddLeadDialog}
          onClose={() => setOpenAddLeadDialog(false)}
          prefillName={prefillLeadName}
          onLeadCreated={lead => {
            setLeads(p => [...p, lead])
            setLeadId(lead.id)
            setSelectedLead(lead)
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
