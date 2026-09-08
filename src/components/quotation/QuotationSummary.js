import React from 'react'
import '../../assets/styles/QuotationSummary.scss'
import '../../assets/styles/QuotationItems.scss'
import RecordFinancialSummary from '../ui/RecordFinancialSummary'

function QuotationSummary({
  totals = {},
  overallDiscount,
  setOverallDiscount,
  currency = '₹',
  isLocked = false
}) {
  const n = v => Number(v || 0).toFixed(2)
  const p = v => Number(v || 0).toFixed(1)

  return (
    <RecordFinancialSummary items={[
      { key: 'margin', label: 'Margin', value: `${currency} ${n(totals.marginValue)}`, subvalue: `${p(totals.marginPercent)}%`, tone: 'positive' },
      { key: 'subtotal', label: 'Subtotal', value: `${currency} ${n(totals.subtotal)}` },
      { key: 'tax', label: 'Taxes', value: `${currency} ${n(totals.totalTax)}` },
      { key: 'discount', label: 'Overall Discount', value: isLocked
        ? `${currency} ${n(overallDiscount)}`
        : <input type="number" min="0" value={overallDiscount} aria-label="Overall discount" onChange={(event) => setOverallDiscount(Math.max(0, Number(event.target.value || 0)))} /> },
      { key: 'grand-total', label: 'Grand Total', value: `${currency} ${n(totals.grandTotal)}` },
    ]} />
  )
}

export default QuotationSummary
