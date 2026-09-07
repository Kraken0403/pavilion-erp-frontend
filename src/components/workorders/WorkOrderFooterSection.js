import React from 'react'

function WorkOrderFooterSection({
  total = 0,
  subtotal = null,
  discount = 0,
  discountPercent = null,
  currency = 'Rs.'
}) {
  const formatAmount = (value) => `${currency} ${Number(value || 0).toFixed(2)}`
  const hasDiscount = Number(discount || 0) > 0

  return (
    <div className="quotation-footer">
      <div className="total" style={{ minWidth: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <span>Subtotal</span>
          <span>{formatAmount(subtotal ?? total)}</span>
        </div>
        {hasDiscount && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
            <span>Discount{discountPercent ? ` (${discountPercent}%)` : ''}</span>
            <span>-{formatAmount(discount)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
          <strong>Grand Total</strong>
          <strong>{formatAmount(total)}</strong>
        </div>
      </div>
    </div>
  )
}

export default WorkOrderFooterSection
