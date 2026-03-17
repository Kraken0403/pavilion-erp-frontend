import React from 'react'
// import { TextField } from '@mui/material'
import '../../assets/styles/QuotationSummary.scss'
import '../../assets/styles/QuotationItems.scss'
import {
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material'

function QuotationSummary({
  totals = {},
  overallDiscount,
  setOverallDiscount,
  currency = '₹',
  isLocked = false,
  gstPricingMode = 'INCLUSIVE'
  , roundingAmount = 0,
  setRoundingAmount = () => {}
}) {
  const n = v => {
    const value = Number(v || 0)
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100
    return rounded.toFixed(2)
  }
  const p = v => Number(v || 0).toFixed(1)

  return (
    <div className="quotation-summary">

      <Typography className="section-title">
        <span className="sep"></span>
        Quotation Summary
      </Typography>

      <div className="quotation-summary-content qs-grid">

        {/* LEFT COLUMN */}
        <div className="qs-col qs-col-left">

              <div className="qs-row">
                <span className="qs-label muted">
                  {gstPricingMode === 'INCLUSIVE' ? 'GST Included' : 'GST Exclusive'}
                </span>
                <strong className="qs-value">
                  {currency} {n(totals.totalTax)}
                </strong>
              </div>

          <div className="qs-divider" />

          <div className="qs-row qs-margin">
            <span className="qs-label">Margin</span>
            <strong className="qs-value">
              {currency} {n(totals.marginValue)}
              <span className="qs-sub">
                ({p(totals.marginPercent)}%)
              </span>
            </strong>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="qs-col qs-col-right">

          <div className="qs-row">
            <span className="qs-label">Subtotal</span>
            <strong className="qs-value">
              {currency} {n(totals.discountedSubtotal)}
            </strong>
          </div>

          {gstPricingMode !== 'INCLUSIVE' && gstPricingMode !== 'inclusive' && (
            <div className="qs-row">
              <span className="qs-label muted">GST (added)</span>
              <strong className="qs-value">
                {currency} {n(totals.totalTax)}
              </strong>
            </div>
          )}

          {/* Rounding (editable in-place, mirrors Overall Discount) */}
          <div className="qs-row qs-discount">
            <span className="qs-label">Rounding +/-</span>

            <TextField
              size="small"
              type="number"
              disabled={isLocked}
              value={roundingAmount ?? 0}
              onChange={e => setRoundingAmount(Number(e.target.value || 0))}
              inputProps={{ style: { textAlign: 'right' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">{currency}</InputAdornment>
                ),
              }}
              sx={{ width: 140 }}
            />
          </div>

          <div className="qs-row">
            <span className="qs-label muted">Item Discount</span>
            <strong className="qs-value">
              {currency} {n(totals.itemDiscount)}
            </strong>
          </div>

          <div className="qs-divider" />

          {/* DISCOUNT */}
          <div className="qs-row qs-discount">
            <span className="qs-label">Overall Discount</span>

            <TextField
              size="small"
              type="number"
              disabled={isLocked}
              value={overallDiscount}
              onChange={e =>
                setOverallDiscount(Math.max(0, Number(e.target.value || 0)))
              }
              inputProps={{
                min: 0,
                style: { textAlign: 'right' }
              }}
              sx={{ width: 120 }}
            />
          </div>

          {/* <div className="qs-row">
            <span className="qs-label muted">After Discount</span>
            <strong className="qs-value">
              {currency} {n(totals.discountedSubtotal)}
            </strong>
          </div> */}

          <div className="qs-divider strong" />

          {/* GRAND TOTAL */}
          <div className="qs-row qs-grand">
            <span className="qs-label">Grand Total</span>
            <strong className="qs-grand-value">
              {currency} {n((totals.grandTotal || 0) + (totals.roundingAmount || 0))}
            </strong>
          </div>

        </div>



      </div>


    </div>
  )
}

export default QuotationSummary
