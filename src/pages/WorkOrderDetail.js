// src/components/workorders/WorkOrderDetail.js
import React, { useEffect, useState } from 'react'
import { Container, CircularProgress, Typography } from '@mui/material'
import { useParams, useNavigate } from 'react-router-dom'

import Topbar from '../components/Topbar'
import NotificationSnackbar from '../components/ui/NotificationSnackbar'

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
  const navigate = useNavigate()

  const [workOrder, setWorkOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kotExists, setKotExists] = useState(false)

  const [notif, setNotif] = useState({
    open: false,
    message: '',
    severity: 'success',
  })

  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'
  const isCateringBusiness = settings?.business_type === 'CATERING'

  /* ----------------------------------
     NOTIFICATION
  ---------------------------------- */
  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity })
  }

  /* ----------------------------------
     LOAD WORK ORDER
  ---------------------------------- */
  useEffect(() => {
    loadWorkOrder()
  }, [id])

  const loadWorkOrder = async () => {
    try {
      setLoading(true)
      const data = await fetchWorkOrderById(id)

      // Normalize numbers (same discipline as quotation)
      data.total_amount = Number(data.total_amount || 0)
      data.items = normalizeItems(data)

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
  }

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
          <CircularProgress />
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
        {workOrder.quotation_mode === 'CATERING' && (
          <div className="quotation-card">
            <WorkOrderEventSection workOrder={workOrder} />
          </div>
        )}

        <div className="quotation-card">
          <WorkOrderItemsSection items={workOrder.items} />
        </div>
        <div className="quotation-card">
          <WorkOrderFooterSection
            total={workOrder.total_amount}
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
