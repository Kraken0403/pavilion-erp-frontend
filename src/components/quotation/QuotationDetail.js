import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import Topbar from '../Topbar'
import NotificationSnackbar from '../ui/NotificationSnackbar'
import QuotationContactSection from './QuotationContactSection'
import QuotationItemsSection from './QuotationItemsSection'
import AddLeadDialog from '../leads/AddLeadDialog'
import AddProductDialog from '../products/AddProductDialog'
import { createWorkOrderFromQuotation } from '../../services/workOrderServices'
import {
  fetchQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  updateQuotationItems
} from '../../services/quotationService'
import { fetchLeads } from '../../services/leadService'
import { useSettings } from '../../context/SettingsContext'
import { calculateQuotationTotals } from '../../utils/quotationCalculator'
import QuotationSummary from './QuotationSummary'
import QuotationFooterSection from './QuotationFooterSection'
import QuotationHeader from './QuotationHeader'

import { 
  fetchAllProducts,  
  createProduct,
  updateProduct
} from '../../services/productServices'

import '../../assets/styles/QuotationDetail.scss'

import '../../assets/styles/LeadsTable.scss'

/* ---------------------------------------
   CONSTANTS — MUST MATCH DB ENUMS
--------------------------------------- */
const COST_PRICING_MODES = ['absolute', 'percentage']

const statusColors = {
  pending: 'status-warning',
  approved: 'status-success',
  rejected: 'status-error',
  converted: 'status-info'
}

function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'
  const [products, setProducts] = useState([])
  const [overallDiscount, setOverallDiscount] = useState(0)

  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [pax, setPax] = useState(1)
  const [leads, setLeads] = useState([])
  const [openAddLeadDialog, setOpenAddLeadDialog] = useState(false)
  const [prefillLeadName, setPrefillLeadName] = useState('')

  const loadLeads = async () => {
    try {
      const res = await fetchLeads()
      const leadsArray =
        Array.isArray(res?.leads) ? res.leads :
        Array.isArray(res?.data) ? res.data :
        []
  
      setLeads(leadsArray)
    } catch (err) {
      console.error('Failed to load leads', err)
    }
  }
  

  const [cateringMeta, setCateringMeta] = useState({
    event_name: '',
    event_date: '',
    event_time: '',
    event_location: ''
  })
  

  const [headerForm, setHeaderForm] = useState({
    lead_id: '',
    quotation_date: '',
    valid_until: '',
    notes: ''
  })

  const isLocked = quotation?.is_locked === 1


  const [items, setItems] = useState([])
  const [openProductDialog, setOpenProductDialog] = useState(false)

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  const [selectedLead, setSelectedLead] = useState(null)
  const handleLeadIdChange = useCallback((leadId) => {
    setHeaderForm((prev) => {
      const current = prev.lead_id ?? ''
      const next = leadId ?? ''
      if (String(current) === String(next)) return prev
      return { ...prev, lead_id: next }
    })
  }, [])


  /* ---------------------------------------
     HELPERS
  --------------------------------------- */
  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }

  const normalizeCostMode = (mode) =>
    COST_PRICING_MODES.includes(mode) ? mode : 'absolute'

  /**
   * ✅ Single source of truth for UPDATE / VERSION payload
   * Backend expects FULL snapshot fields always.
   */
  const buildSnapshotItemsPayload = useCallback(() => {
    return (items || [])
      .map((i) => {
        const product_id = i.product_id ?? i.product?.id ?? null
        const product_name =
          i.product_name ||
          i.product?.name ||
          i.product?.label ||
          i.product?.title ||
          '[Unnamed Product]'

          return {
            product_id,
            product_name,
          
            variant_id: i.variant_id ?? null,
            variant_sku: i.variant_sku || '',
          
            quantity: Number(i.quantity) || 0,
          
            // COST SNAPSHOT
            cost_price: Number(i.cost_price) || 0,
            cost_price_qty: Number(i.cost_price_qty) || 1,
            cost_price_unit: i.cost_price_unit || 'unit',
            cost_unit: i.cost_unit || i.cost_price_unit || 'unit',
            cost_pricing_mode: normalizeCostMode(i.cost_pricing_mode),
            cost_discount_percent: Number(i.cost_discount_percent) || 0,
          
            // SELLING SNAPSHOT
            unit_price: Number(i.selling_price) || 0,
            discount: Number(i.discount) || 0,
            tax: Number(i.tax) || 0,
          
            // JSON SNAPSHOTS
            attributes_json: i.attributes_json || {},
            packaging_json: i.packaging_json || {}
          }
          
      })
      // ✅ Keep only valid rows (backend will reject otherwise)
      .filter((i) => i.product_id && i.product_name && i.quantity > 0)
  }, [items])

  /* ---------------------------------------
     PRODUCT → QUOTATION SNAPSHOT
  --------------------------------------- */
  const handleProductSelect = (index, product) => {
    if (!product) {
      updateItem(index, {
        product: null,
        product_id: null,
        product_name: '',
        variant_id: null,
        variant_sku: '',
        selling_price: 0,
        selling_price_qty: 1,
        selling_price_unit: 'unit',
        cost_price: 0,
        cost_price_qty: 1,
        cost_price_unit: 'unit',
        cost_unit: 'unit',
        cost_pricing_mode: 'absolute',
        cost_discount_percent: 0,
        attributes_json: {},
        packaging_json: {}
      })
      return
    }

    const productId = product.id ?? product.product_id ?? null
    const productName = product.name ?? product.label ?? product.title ?? ''
    const sellingPrice = Number(product.selling_price ?? product.price ?? 0) || 0
    const costPrice = Number(product.cost_price ?? product.cost ?? 0) || 0

    const variantId =
      product.variant_id ??
      product.variantId ??
      product.variant?.id ??
      null

    const variantSku =
      product.variant_sku ??
      product.sku ??
      product.variant?.sku ??
      ''

    updateItem(index, {
      product,
      product_id: productId,
      product_name: productName || '[Unnamed Product]',

      // COST SNAPSHOT
      cost_price: costPrice,
      cost_price_qty: Number(product.cost_price_qty ?? 1) || 1,
      cost_price_unit: product.cost_price_unit || 'unit',
      cost_unit: product.cost_unit || product.cost_price_unit || 'unit',
      cost_pricing_mode: normalizeCostMode(product.cost_pricing_mode),
      cost_discount_percent: Number(product.cost_discount_percent ?? 0) || 0,

      // SELLING SNAPSHOT
      selling_price: sellingPrice,
      selling_price_qty: Number(product.selling_price_qty ?? 1) || 1,
      selling_price_unit: product.selling_price_unit || 'unit',

      // IDENTITY SNAPSHOT
      variant_id: variantId,
      variant_sku: variantSku,
      attributes_json: product.attributes_json || {},
      packaging_json: product.packaging_json || {}
    })
  }

  /* ---------------------------------------
     LOAD QUOTATION
  --------------------------------------- */
  useEffect(() => {
    loadQuotation()
    loadLeads()
  }, [id])

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

  useEffect(() => {
    if (quotation) {
      setOverallDiscount(
        Number(quotation.quotation_discount_amount || 0)
      )
    }
  }, [quotation])
  


  const loadQuotation = async () => {
    try {
      setLoading(true)
      const data = await fetchQuotationById(id)
      setQuotation(data)
      if (data.quotation_mode === 'CATERING') {
        setPax(Number(data.pax) || 1)
        setCateringMeta({
          event_name: data.event_name || '',
          event_date: data.event_date?.substring(0, 10) || '',
          event_time: data.event_time || '',
          event_location: data.event_location || ''
        })
      }
      // HEADER
      setHeaderForm({
        lead_id: data.lead_id ?? '',
        quotation_date: data.quotation_date?.substring(0, 10) ?? '',
        valid_until: data.valid_until?.substring(0, 10) ?? '',
        notes: data.notes ?? ''
      })

      // ITEMS (STRICT NORMALIZATION)
      const normalizedItems = (data.items || []).map((item) => ({
        ...item,

        product: item.product_id
          ? { id: item.product_id, name: item.product_name }
          : null,

        product_id: item.product_id ?? null,
        product_name: item.product_name || (item.product_id ? '[Unnamed Product]' : ''),

        variant_id: item.variant_id ?? null,
        variant_sku: item.variant_sku || '',

        quantity: Number(item.quantity) || 1,

        cost_price: Number(item.cost_price) || 0,
        cost_price_qty: Number(item.cost_price_qty) || 1,
        cost_price_unit: item.cost_price_unit || 'unit',
        cost_unit: item.cost_unit || item.cost_price_unit || 'unit',
        cost_pricing_mode: normalizeCostMode(item.cost_pricing_mode),
        cost_discount_percent: Number(item.cost_discount_percent) || 0,

        selling_price: Number(item.selling_price) || 0,
        selling_price_qty: Number(item.selling_price_qty) || 1,
        selling_price_unit: item.selling_price_unit || 'unit',

        attributes_json: item.attributes_json || {},
        packaging_json: item.packaging_json || {},

        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0
      }))

      setItems(normalizedItems)

      // LEAD
      if (data.lead_id) {
        const leadsRes = await fetchLeads()
        const leads = Array.isArray(leadsRes?.leads)
          ? leadsRes.leads
          : Array.isArray(leadsRes?.data)
          ? leadsRes.data
          : []

        setSelectedLead(
          leads.find((l) => String(l.id) === String(data.lead_id)) || null
        )
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to load quotation', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------
     HEADER SAVE
  --------------------------------------- */
  const handleSaveHeader = async () => {
    try {
      await updateQuotation(id, headerForm)
      showNotification('Quotation updated')
      setEditMode(false)
      loadQuotation()
    } catch (err) {
      console.error(err)
      showNotification('Failed to update quotation', 'error')
    }
  }

  /* ---------------------------------------
     ITEMS
  --------------------------------------- */
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product: null,
        product_id: null,
        product_name: '',
        variant_id: null,
        variant_sku: '',

        quantity: 1,

        cost_price: 0,
        cost_price_qty: 1,
        cost_price_unit: 'unit',
        cost_unit: 'unit',
        cost_pricing_mode: 'absolute',
        cost_discount_percent: 0,

        selling_price: 0,
        selling_price_qty: 1,
        selling_price_unit: 'unit',

        attributes_json: {},
        packaging_json: {},

        discount: 0,
        tax: 0
      }
    ])
  }

  const updateItem = (index, updates) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...updates }
      return copy
    })
  }

  /**
   * ✅ Update items (FULL SNAPSHOT ONLY)
   */
   const handleSaveItems = async () => {
    try {
      const payloadItems = buildSnapshotItemsPayload()
  
      if (!payloadItems.length) {
        return showNotification('Add at least one valid item', 'warning')
      }
  
      // ✅ 1. Save ITEMS
      await updateQuotationItems(id, payloadItems)
  
      // ✅ 2. Save PAX (ONLY if catering)
      if (quotation.quotation_mode === 'CATERING') {
        await updateQuotation(id, {
          pax,
          ...cateringMeta
        })
      }
  
      showNotification('Items & PAX updated successfully')
      loadQuotation()
    } catch (err) {
      console.error(err)
      showNotification(
        err?.response?.data?.error || 'Failed to update items',
        'error'
      )
    }
  }
  const handleSubmit = async () => {
    try {
      if (!headerForm.lead_id) {
        return showNotification('Lead is required', 'warning')
      }
      if (!headerForm.quotation_date) {
        return showNotification('Quotation date is required', 'warning')
      }
  
      if (quotation?.quotation_mode === 'CATERING' && (!pax || pax < 1)) {
        return showNotification('PAX is required for catering', 'warning')
      }
  
      const payloadItems = buildSnapshotItemsPayload()
      if (!payloadItems.length) {
        return showNotification('Add at least one valid item', 'warning')
      }
  
      // 1) Save items snapshot
      await updateQuotationItems(id, payloadItems)
  
      // 2) Save header + discount + totals (+ catering meta)
      await updateQuotation(id, {
        ...headerForm,
      
        quotation_discount_type: 'FLAT',
        quotation_discount_value: Number(overallDiscount || 0),
      
        ...(quotation?.quotation_mode === 'CATERING' && {
          pax,
          ...cateringMeta
        })
      })
      
  
      showNotification('✅ Quotation updated successfully')
      loadQuotation()
    } catch (err) {
      console.error(err)
      showNotification(
        err?.response?.data?.error || 'Failed to save quotation',
        'error'
      )
    }
  }
  
  

  /* ---------------------------------------
     VERSION
  --------------------------------------- */
  const handleCreateVersion = async () => {
    try {
      const payloadItems = buildSnapshotItemsPayload()
  
      if (!payloadItems.length) {
        return showNotification('Add at least one valid item', 'warning')
      }
  
      // const nextVersion = Number(quotation.version || 1) + 1
  
      const payload = {
        parent_id: quotation.parent_id || quotation.id,
        lead_id: headerForm.lead_id,
        quotation_date: headerForm.quotation_date,
        valid_until: headerForm.valid_until || null,
        notes: headerForm.notes || null,
        items: payloadItems,
        ...(quotation.quotation_mode === 'CATERING' && {
          pax,
          event_name: cateringMeta.event_name,
          event_date: cateringMeta.event_date || null,
          event_time: cateringMeta.event_time || null,
          event_location: cateringMeta.event_location || null
        })
      }
      
  
      const res = await createQuotation(payload)
  
      showNotification(`New Version created`)
      navigate(`/quotations/${res.id}`)
    } catch (err) {
      console.error(err)
      showNotification(
        err?.response?.data?.error || 'Failed to create version',
        'error'
      )
    }
  }
  

  const handleCreateWorkOrder = async () => {
    try {
      if (quotation.status !== 'approved') {
        return showNotification(
          'Work Order can only be created from approved quotations',
          'warning'
        )
      }
  
      const payload = {
        quotation_id: quotation.id
      }

      console.log('🔥 Creating WO for quotation ID:', payload)

  
      const res = await createWorkOrderFromQuotation(payload.quotation_id)
  
      showNotification('Work Order created successfully')
  
      // 🔒 Lock quotation + mark converted
      await updateQuotationStatus(quotation.id, 'converted')
  
      loadQuotation()

      const workOrderId =
        res?.id ||
        res?.work_order_id ||
        res?.data?.id

      if (!workOrderId) {
        throw new Error('Work order created but ID not returned')
      }

      navigate(`/workorders/${workOrderId}`)

  
      // 🔀 Navigate to Work Order detail
      // navigate(`/workorders/${res.id}`)
    } catch (err) {
      console.error(err)
      showNotification(
        err?.response?.data?.error || 'Failed to create work order',
        'error'
      )
    }
  }
  
  const reorderItems = (from, to) => {
    if (from === to || from == null || to == null) return
  
    setItems(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    })
  }
  
  

  /* ---------------------------------------
     TOTALS
  --------------------------------------- */
  const totals = calculateQuotationTotals({
    items,
    overallDiscount, // ✅ state
    pax,
    quotationMode: quotation?.quotation_mode,
    gstPricingMode: settings?.gst_pricing_mode || 'EXCLUSIVE'
  })
  
  

  /* ---------------------------------------
     UI
  --------------------------------------- */
  if (loading) {
    return (
      <>
        <Topbar />
        <div className="quotation-loading">Loading…</div>
      </>
    )
  }

  if (!quotation) {
    return (
      <>
        <Topbar />
        <div className="quotation-loading">Quotation not found</div>
      </>
    )
  }

  return (
    <>
      <Topbar />

      <div className="quotation-detail-container">
      <QuotationHeader
        quotation={quotation}
        isLocked={isLocked}
        onStatusChange={async (newStatus) => {
          try {
            await updateQuotationStatus(quotation.id, newStatus)
            setQuotation(prev => ({ ...prev, status: newStatus }))
            showNotification('Status updated')
          } catch {
            showNotification('Failed to update status', 'error')
          }
        }}
        onApprove={async () => {
          try {
            await updateQuotationStatus(quotation.id, 'approved')
            setQuotation(prev => ({ ...prev, status: 'approved' }))
            showNotification('Quotation approved')
          } catch {
            showNotification('Failed to approve quotation', 'error')
          }
        }}
        onCreateWorkOrder={handleCreateWorkOrder}
        onCreateVersion={handleCreateVersion}
      />



        <div className="quotation-card">
        <QuotationContactSection
          isLocked={isLocked}
          leads={leads}
          leadId={headerForm.lead_id}
          setLeadId={handleLeadIdChange}
          selectedLead={selectedLead}
          setSelectedLead={setSelectedLead}
          quotationDate={headerForm.quotation_date}
          setQuotationDate={(v) =>
            setHeaderForm((p) => ({ ...p, quotation_date: v }))
          }
          validUntil={headerForm.valid_until}
          setValidUntil={(v) =>
            setHeaderForm((p) => ({ ...p, valid_until: v }))
          }
          notes={headerForm.notes}
          setNotes={(v) => setHeaderForm((p) => ({ ...p, notes: v }))}
          openAddLeadDialog={() => setOpenAddLeadDialog(true)}
          setPrefillLeadName={setPrefillLeadName}
        />



          {editMode && !isLocked && (
            <button className="btn-primary mt" onClick={handleSaveHeader}>
              Save Header
            </button>
          )}
        </div>

        {quotation.quotation_mode === 'CATERING' && (
            <div className="quotation-card catering-meta">
              <h3>Event Details</h3>

              <div className="grid">
                <input disabled={isLocked}
                  placeholder="Event Name"
                  value={cateringMeta.event_name}
                  onChange={(e) =>
                    setCateringMeta(p => ({ ...p, event_name: e.target.value }))
                  }
                />

                <input disabled={isLocked}
                  type="date"
                  value={cateringMeta.event_date}
                  onChange={(e) =>
                    setCateringMeta(p => ({ ...p, event_date: e.target.value }))
                  }
                />

                <input disabled={isLocked}
                  placeholder="Event Time (e.g. 7 PM – 11 PM)"
                  value={cateringMeta.event_time}
                  onChange={(e) =>
                    setCateringMeta(p => ({ ...p, event_time: e.target.value }))
                  }
                />

                <input disabled={isLocked}
                  placeholder="Event Location / Venue"
                  value={cateringMeta.event_location}
                  onChange={(e) =>
                    setCateringMeta(p => ({ ...p, event_location: e.target.value }))
                  }
                />

                <input disabled={isLocked}
                  type="number"
                  min={1}
                  placeholder="PAX"
                  value={pax}
                  onChange={(e) => setPax(Number(e.target.value) || 1)}
                />
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
            reorderItems={reorderItems}
            openProductDialog={openProductDialog}
            setOpenProductDialog={setOpenProductDialog}
            quotationMode={quotation.quotation_mode}
            pax={pax}
            isLocked={isLocked}
            products={products}
          />

        </div>


        <div className='quotation-card'>


        <QuotationSummary
          totals={totals}
          overallDiscount={overallDiscount}
          setOverallDiscount={setOverallDiscount}
          currency={currency}
          isLocked={isLocked}
        />

        <QuotationFooterSection
          total={Number(totals.grandTotal || 0)}
          handleSubmit={handleSubmit}
          currency={currency}
          disabled={isLocked}
        />
      </div>


          {/* {!isLocked && (
            <button className="btn-primary mt" onClick={handleSaveItems}>
              Save Items
            </button>
          )} */}

      </div>




      <AddProductDialog
        open={openProductDialog}
        onClose={() => setOpenProductDialog(false)}
      />

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
      <AddLeadDialog
        open={openAddLeadDialog}
        onClose={() => setOpenAddLeadDialog(false)}
        prefillName={prefillLeadName}
        onLeadCreated={(lead) => {
          setLeads((p) => [...p, lead])
          setSelectedLead(lead)
          setHeaderForm((p) => ({ ...p, lead_id: lead.id }))
        }}
      />
    </>
  )
}

export default QuotationDetail
