import React from 'react'
import RecordFinancialSummary from '../ui/RecordFinancialSummary'

function WorkOrderFooterSection({
  total = 0,
  subtotal = null,
  discount = 0,
  discountPercent = null,
  taxes = 0,
  margin = 0,
  marginPercent = 0,
  currency = '₹'
}) {
  const formatAmount = (value) => `${currency} ${Number(value || 0).toFixed(2)}`

  return (
    <RecordFinancialSummary items={[
      { key: 'margin', label: 'Margin', value: formatAmount(margin), subvalue: `${Number(marginPercent || 0).toFixed(1)}%`, tone: 'positive' },
      { key: 'subtotal', label: 'Subtotal', value: formatAmount(subtotal ?? total) },
      { key: 'discount', label: 'Discount', value: formatAmount(discount), subvalue: discountPercent ? `${Number(discountPercent).toFixed(1)}%` : null },
      { key: 'taxes', label: 'Taxes', value: formatAmount(taxes) },
      { key: 'grand-total', label: 'Grand Total', value: formatAmount(total) },
    ]} />
  )
}

export default WorkOrderFooterSection
