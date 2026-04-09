// src/components/workorders/WorkOrderDetail.js
import React, { useCallback, useEffect, useState } from 'react'
import { Container, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

import Topbar from '../components/Topbar'
import NotificationSnackbar from '../components/ui/NotificationSnackbar'
import PageLoader from '../components/ui/PageLoader'

// 🔹 New modular components
import WorkOrderHeader from '../components/workorders/WorkOrderHeader'
import WorkOrderContactSection from '../components/workorders/WorkOrderContactSection'
import WorkOrderItemsSection from '../components/workorders/WorkOrderItemsSection'
import WorkOrderFooterSection from '../components/workorders/WorkOrderFooterSection'
import WorkOrderEventSection from '../components/workorders/WorkOrderEventSection'

// 🔹 Services
import {
  fetchWorkOrderById,
  updateWorkOrderStatus,
} from '../services/workOrderServices'
import { generateKotFromWorkOrder, checkKotExists } from '../services/kotService'
import { createDeliveryFromWorkOrder } from '../services/deliveryService'
import { toInputDateValue } from '../utils/dateFormatter'

// 🔹 Currency
import { useSettings } from '../context/SettingsContext'
import { displayCurrency } from '../utils/currencyUtils'

const parseJsonMaybe = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const normalizeItems = (data) => {
  const rawItems =
    data?.items ||
    data?.work_order_items ||
    data?.workOrderItems ||
    data?.order_items ||
    data?.line_items ||
    []

  const parsedItems = parseJsonMaybe(rawItems)
  const list = Array.isArray(rawItems)
    ? rawItems
    : Array.isArray(parsedItems)
      ? parsedItems
      : []

  return list.map((it) => {
    const quantity = Number(it.quantity ?? it.qty ?? 0)
    const unitPrice = Number(it.unit_price ?? it.price ?? it.rate ?? 0)
    const discount = Number(it.discount ?? it.discount_amount ?? 0)
    const tax = Number(it.tax ?? it.tax_amount ?? it.gst_amount ?? 0)
    const computedLineTotal = quantity * unitPrice - discount + tax

    return {
      ...it,
      product_name: it.product_name || it.name || it.description || '—',
      brand: it.brand || it.product_brand || '—',
      quantity,
      unit_price: unitPrice,
      discount,
      tax,
      line_total: Number(it.line_total ?? it.total ?? computedLineTotal ?? 0),
    }
  })
}

function WorkOrderDetail() {
  const { id } = useParams()

  const [workOrder, setWorkOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kotExists, setKotExists] = useState(false)

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const { settings } = useSettings()
  const currency = displayCurrency(settings?.currency_code)
  const isCateringBusiness = settings?.business_type === 'CATERING'
  const isGeneralBusiness = String(settings?.business_type || 'GENERAL').toUpperCase() === 'GENERAL'

  /* ----------------------------------
     NOTIFICATION
  ---------------------------------- */
  const showNotification = useCallback((message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }, [])

  /* ----------------------------------
     LOAD WORK ORDER
  ---------------------------------- */
  const loadWorkOrder = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchWorkOrderById(id)

      // Normalize numbers (same discipline as quotation)
      data.total_amount = Number(data.total_amount || 0)
      data.items = normalizeItems(data)

      // Aggregate and remove negative discount rows (coupons) so WO details
      // display items like the Invoice: keep only non-negative line items
      try {
        const mapped = Array.isArray(data.items) ? data.items : []
        // compute discount as sum of negative line_total values
        const discountSum = mapped.reduce((s, it) => {
          const lt = Number(it.line_total || 0)
          return s + (lt < 0 ? lt : 0)
        }, 0)

        // remove negative rows from displayed items
        data.items = mapped.filter((it) => Number(it.line_total || 0) >= 0)

        // expose display_taxable_subtotal (pre-discount subtotal)
        data.display_taxable_subtotal = Number(data.subtotal || 0) + Math.abs(Number(discountSum || 0))
        // also expose discount value for footer
        data._computed_discount = Math.abs(Number(discountSum || 0))
      } catch (e) {
        // ignore
        console.warn('WorkOrderDetail: failed to normalize coupon discount rows', e && e.message ? e.message : e)
      }

      setWorkOrder(data)

      // Check if KOT already exists
      try {
        const kotCheck = await checkKotExists(id)
        setKotExists(kotCheck?.exists || false)
      } catch (err) {
        console.error('Failed to check KOT existence', err)
        setKotExists(false)
      }
    } catch (err) {
      console.error('❌ Failed to load work order', err)
      showNotification('Failed to load work order', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showNotification])

  useEffect(() => {
    loadWorkOrder()
  }, [loadWorkOrder])

  /* ----------------------------------
     STATUS CHANGE
  ---------------------------------- */
  const handleStatusChange = async (newStatus) => {
    try {
      await updateWorkOrderStatus(id, newStatus)
      showNotification('Status updated successfully')
      loadWorkOrder()
    } catch (err) {
      console.error('❌ Status update failed', err)
      showNotification('Failed to update status', 'error')
    }
  }

  const handleGenerateKot = async () => {
    try {
      const res = await generateKotFromWorkOrder(id)

      if (res?.already_existed) {
        showNotification('KOT already exists for this Work Order')
        return
      }

      showNotification('KOT generated successfully')
    } catch (err) {
      console.error('❌ KOT generation failed', err)
      showNotification(
        err?.response?.data?.error || 'Failed to generate KOT',
        'error'
      )
    }
  }

  const handleCreateDelivery = async () => {
    try {
      const deliveryDate =
        toInputDateValue(workOrder?.event_date) ||
        toInputDateValue(new Date())

      const deliveryTime = (() => {
        const raw = String(workOrder?.event_time || '').trim()
        const match = raw.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
        return match ? match[1] : '09:00'
      })()

      await createDeliveryFromWorkOrder(id, {
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
      })

      showNotification('Delivery created successfully')
      loadWorkOrder()
    } catch (err) {
      console.error('❌ Delivery creation failed', err)
      showNotification(
        err?.response?.data?.error || 'Failed to create delivery',
        'error'
      )
    }
  }

  /* ----------------------------------
     LOADING / NOT FOUND
  ---------------------------------- */
  if (loading) {
    return (
      <>
        <Topbar />
        <Container sx={{ mt: 4 }}>
          <PageLoader message="Loading work order..." minHeight={240} />
        </Container>
      </>
    )
  }

  if (!workOrder) {
    return (
      <>
        <Topbar />
        <Container sx={{ mt: 4 }}>
          <Typography variant="h6">Work Order not found</Typography>
        </Container>
      </>
    )
  }

  /* ----------------------------------
     UI
  ---------------------------------- */
  return (
    <>
      <Topbar />
      {/* ================= HEADER ================= */}
      <div className="quotation-detail-container">
        <WorkOrderHeader
          workOrder={workOrder}
          onStatusChange={handleStatusChange}
          onGenerateKOT={handleGenerateKot}
          onCreateDelivery={handleCreateDelivery}
          showGenerateKOT={
            isCateringBusiness &&
            workOrder?.mode === 'CATERING' &&
            !kotExists
          }
        />

        {/* ================= CONTACT ================= */}
        <div className="quotation-card">
          <WorkOrderContactSection workOrder={workOrder} />
        </div>

        {/* ================= EVENT (CATERING ONLY) ================= */}
        {!isGeneralBusiness && (workOrder.quotation_mode === 'CATERING' || workOrder.mode === 'CATERING') && (
          <div className="quotation-card">
            <WorkOrderEventSection workOrder={workOrder} />
          </div>
        )}

        {!!String(workOrder.notes || '').trim() && (
          <div className="quotation-card">
            <div className="detail-title"><h4>Notes</h4></div>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#253a43' }}>
              {workOrder.notes}
            </Typography>
          </div>
        )}

        <div className="quotation-card">
          <WorkOrderItemsSection items={workOrder.items} />
        </div>
        <div className="quotation-card">
          <WorkOrderFooterSection
            subtotal={Number(workOrder.display_taxable_subtotal || workOrder.subtotal || 0)}
            discount={Number(workOrder._computed_discount || 0)}
            taxes={Number((workOrder.items || []).reduce((s, it) => s + Number(it.tax || it.tax_amount || it.gst_amount || 0), 0))}
            total={Number(workOrder.total_amount || 0)}
            currency={currency}
          />
        </div>

      </div>

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif((p) => ({ ...p, open: false }))}
      />
    </>
  )
}

export default WorkOrderDetail
