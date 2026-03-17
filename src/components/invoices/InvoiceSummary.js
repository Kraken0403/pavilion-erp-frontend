import React from 'react'
import { Typography } from '@mui/material'

function InvoiceSummary({ totals, currency, pricingMode = 'EXCLUSIVE' }) {
  const gstLabel = pricingMode === 'INCLUSIVE' ? 'GST (included)' : 'GST (exclusive)'

  return (
    <div className="quotation-summary">
      <Typography>
        Subtotal: {currency} {totals.subtotal?.toFixed(2)}
      </Typography>
      <Typography>
        {gstLabel}: {currency} {((totals.cgst_total || 0) + (totals.sgst_total || 0) + (totals.igst_total || 0)).toFixed(2)}
      </Typography>
      <Typography variant="h6">
        Grand Total: {currency} {totals.grand_total?.toFixed(2)}
      </Typography>
    </div>
  )
}

export default InvoiceSummary