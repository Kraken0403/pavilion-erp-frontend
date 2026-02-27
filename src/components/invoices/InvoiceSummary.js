import React from 'react'
import { Typography } from '@mui/material'

function InvoiceSummary({ totals, currency }) {
  return (
    <div className="quotation-summary">
      <Typography>
        Subtotal: {currency} {totals.subtotal?.toFixed(2)}
      </Typography>
      <Typography>
        CGST: {currency} {totals.cgst_total?.toFixed(2)}
      </Typography>
      <Typography>
        SGST: {currency} {totals.sgst_total?.toFixed(2)}
      </Typography>
      <Typography>
        IGST: {currency} {totals.igst_total?.toFixed(2)}
      </Typography>
      <Typography variant="h6">
        Grand Total: {currency} {totals.grand_total?.toFixed(2)}
      </Typography>
    </div>
  )
}

export default InvoiceSummary