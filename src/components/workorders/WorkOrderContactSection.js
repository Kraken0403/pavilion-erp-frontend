import React from 'react'
import { Grid, TextField, Typography } from '@mui/material'
import '../../assets/styles/QuotationContact.scss'

const parseSnapshot = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function WorkOrderContactSection({ workOrder }) {
  if (!workOrder) return null

  const billingSnapshot = parseSnapshot(workOrder.billing_snapshot)
  const shippingSnapshot = parseSnapshot(workOrder.shipping_snapshot)

  const snapshotName =
    billingSnapshot?.name ||
    `${billingSnapshot?.first_name || ''} ${billingSnapshot?.last_name || ''}`.trim() ||
    shippingSnapshot?.name ||
    `${shippingSnapshot?.first_name || ''} ${shippingSnapshot?.last_name || ''}`.trim()

  const fullName =
    workOrder.customer_name ||
    snapshotName ||
    `${workOrder.first_name || ''} ${workOrder.last_name || ''}`.trim()

  const companyName =
    workOrder.customer_company ||
    workOrder.company_name ||
    billingSnapshot?.company_name ||
    shippingSnapshot?.company_name ||
    ''

  const phoneNumber =
    workOrder.customer_phone ||
    workOrder.phone_number ||
    billingSnapshot?.phone_number ||
    billingSnapshot?.phone ||
    shippingSnapshot?.phone_number ||
    shippingSnapshot?.phone ||
    ''

  const emailAddress =
    workOrder.customer_email ||
    workOrder.email ||
    billingSnapshot?.email ||
    shippingSnapshot?.email ||
    ''

  const gstNumber =
    workOrder.customer_gst ||
    workOrder.gst_number ||
    billingSnapshot?.gst_number ||
    shippingSnapshot?.gst_number ||
    ''

  return (
    <div className="quotation-contact-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Client Information
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography className="field-label">Client</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={fullName}
            disabled
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography className="field-label">Company</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={companyName}
            disabled
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography className="field-label">Phone</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={phoneNumber}
            disabled
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography className="field-label">Email</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={emailAddress}
            disabled
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography className="field-label">GST</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={gstNumber}
            disabled
          />
        </Grid>

        {workOrder.site_name && (
          <Grid item xs={12}>
            <Typography className="field-label">Site</Typography>
            <TextField
              className="form-input"
              fullWidth
              value={workOrder.site_name}
              disabled
            />
          </Grid>
        )}
      </Grid>
    </div>
  )
}

export default WorkOrderContactSection
