import React from 'react'
import { Grid, TextField, Typography } from '@mui/material'
import '../../assets/styles/QuotationContact.scss'

function WorkOrderContactSection({ workOrder }) {
  if (!workOrder) return null

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
            value={`${workOrder.first_name || ''} ${workOrder.last_name || ''}`.trim()}
            disabled
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography className="field-label">Company</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={workOrder.company_name || ''}
            disabled
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography className="field-label">Phone</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={workOrder.phone_number || ''}
            disabled
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Typography className="field-label">Email</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={workOrder.email || ''}
            disabled
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography className="field-label">GST</Typography>
          <TextField
            className="form-input"
            fullWidth
            value={workOrder.gst_number || ''}
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
