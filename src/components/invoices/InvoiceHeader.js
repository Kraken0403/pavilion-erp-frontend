import React from 'react'
import { Typography } from '@mui/material'
import { formatStatusLabel } from '../../utils/statusFormatter'

function InvoiceHeader({ invoice, documentLabel = 'Invoice' }) {
  return (
    <div className="quotation-header">
      <Typography className="quotation-number">
        {documentLabel}: {invoice?.invoice_number || 'NEW'}
      </Typography>
      <Typography className="quotation-status">
        Status: {formatStatusLabel(invoice?.status || 'issued')}
      </Typography>
    </div>
  )
}

export default InvoiceHeader