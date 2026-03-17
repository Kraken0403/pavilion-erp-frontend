import React from 'react'
import { Grid, TextField, Typography, MenuItem } from '@mui/material'

function InvoiceContactSection({
  leadId,
  setLeadId,
  leads,
  invoiceDate,
  setInvoiceDate,
  dueDate,
  setDueDate,
  notes,
  setNotes,
  readOnly = false,
}) {
  return (
    <div className="quotation-contact-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Customer Details
      </Typography>

      <Grid container spacing={2}>
        {/* CUSTOMER */}
        <Grid item xs={12} md={6}>
          <Typography className="field-label">Customer</Typography>
          {readOnly ? (
            <Typography>
              {(() => {
                const lead = leads.find((l) => l.id === leadId)
                return lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : ''
              })()}
            </Typography>
          ) : (
            <TextField
              className="form-input"
              select
              fullWidth
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              {leads.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.first_name} {l.last_name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Grid>

        {/* INVOICE DATE */}
        <Grid item xs={12} md={3}>
          <Typography className="field-label">Invoice Date</Typography>
          {readOnly ? (
            <Typography>{invoiceDate}</Typography>
          ) : (
            <TextField
              className="form-input"
              type="date"
              fullWidth
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Grid>

        {/* DUE DATE */}
        <Grid item xs={12} md={3}>
          <Typography className="field-label">Due Date</Typography>
          {readOnly ? (
            <Typography>{dueDate}</Typography>
          ) : (
            <TextField
              className="form-input"
              type="date"
              fullWidth
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Grid>

        {/* NOTES */}
        <Grid item xs={12}>
          <Typography className="field-label">Notes</Typography>
          {readOnly ? (
            <Typography>{notes}</Typography>
          ) : (
            <TextField
              className="form-input"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Grid>
      </Grid>
    </div>
  )
}

export default InvoiceContactSection