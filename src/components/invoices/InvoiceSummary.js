import React from 'react'
import { TextField, InputAdornment } from '@mui/material'
import '../../assets/styles/InvoiceSummary.scss'

function formatAmount(value) {
  return Number(value || 0).toFixed(2)
}

function InvoiceSummary({ totals, currency, pricingMode = 'EXCLUSIVE', roundingAmount = 0, setRoundingAmount = () => {} }) {
  const gstTotal = Number(totals.cgst_total || 0) + Number(totals.sgst_total || 0) + Number(totals.igst_total || 0)
  const gstLabel = pricingMode === 'INCLUSIVE' ? 'GST included in price' : 'GST added separately'

  return (
    <div className="invoice-summary-card">
      <div className="invoice-summary-card__header">
        <div>
          <span className="invoice-summary-eyebrow">Amount Summary</span>
          <h3>Invoice totals</h3>
        </div>
        <span className="invoice-summary-badge">{pricingMode || 'EXCLUSIVE'}</span>
      </div>

      <div className="invoice-summary-list">
        <div className="invoice-summary-row">
          <span>Subtotal</span>
          <strong>{currency} {formatAmount(totals.subtotal)}</strong>
        </div>

        <div className="invoice-summary-row muted">
          <span>{gstLabel}</span>
          <strong>{currency} {formatAmount(gstTotal)}</strong>
        </div>

        {Number(totals.cgst_total || 0) > 0 || Number(totals.sgst_total || 0) > 0 ? (
          <div className="invoice-summary-tax-split">
            <span>CGST: {currency} {formatAmount(totals.cgst_total)}</span>
            <span>SGST: {currency} {formatAmount(totals.sgst_total)}</span>
          </div>
        ) : null}

        {Number(totals.igst_total || 0) > 0 ? (
          <div className="invoice-summary-tax-split">
            <span>IGST: {currency} {formatAmount(totals.igst_total)}</span>
          </div>
        ) : null}

        <div className="invoice-summary-rounding">
          <div>
            <span>Rounding adjustment</span>
            <small>Use negative value for round-down</small>
          </div>
          <TextField
            size="small"
            type="number"
            value={roundingAmount ?? 0}
            onChange={(e) => setRoundingAmount(Number(e.target.value || 0))}
            inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
            InputProps={{ startAdornment: (<InputAdornment position="start">{currency}</InputAdornment>) }}
          />
        </div>
      </div>

      <div className="invoice-summary-grand-total">
        <span>Grand Total</span>
        <strong>{currency} {formatAmount(totals.grand_total)}</strong>
      </div>
    </div>
  )
}

export default InvoiceSummary
