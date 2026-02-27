import React from 'react'
import { Typography } from '@mui/material'

function InvoiceHeader({ invoice }) {
  return (
    <div className="quotation-header">
      <Typography className="quotation-number">
        Invoice: {invoice?.invoice_number || 'NEW'}
      </Typography>
      <Typography className="quotation-status">
        Status: {invoice?.status || 'issued'}
      </Typography>
    </div>
  )
}

export default InvoiceHeader