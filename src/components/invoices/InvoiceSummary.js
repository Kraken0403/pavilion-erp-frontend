import React from 'react'
import { Typography, TextField, InputAdornment } from '@mui/material'

function InvoiceSummary({ totals, currency, pricingMode = 'EXCLUSIVE', roundingAmount = 0, setRoundingAmount = () => {} }) {
  const gstLabel = pricingMode === 'INCLUSIVE' ? 'GST (included)' : 'GST (exclusive)'

  return (
    <div className="quotation-summary">
      <Typography>
        Subtotal: {currency} {totals.subtotal?.toFixed(2)}
      </Typography>
      <Typography>
        {gstLabel}: {currency} {((totals.cgst_total || 0) + (totals.sgst_total || 0) + (totals.igst_total || 0)).toFixed(2)}
      </Typography>

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <span style={{ display: 'block', marginBottom: 6, color: '#666' }}>Rounding +/-</span>
        <TextField
          size="small"
          type="number"
          value={roundingAmount ?? 0}
          onChange={(e) => setRoundingAmount(Number(e.target.value || 0))}
          inputProps={{ style: { textAlign: 'right' } }}
          InputProps={{ startAdornment: (<InputAdornment position="start">{currency}</InputAdornment>) }}
          sx={{ width: 160 }}
        />
      </div>

      <Typography variant="h6">
        Grand Total: {currency} {Number(totals.grand_total || 0).toFixed(2)}
      </Typography>
    </div>
  )
}

export default InvoiceSummary