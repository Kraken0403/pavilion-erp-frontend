import React from 'react'

function WorkOrderFooterSection({ subtotal = 0, discount = 0, taxes = 0, total = 0, currency = '₹' }) {
  const formattedSubtotal = Number(subtotal || 0).toFixed(2)
  const formattedDiscount = Number(discount || 0).toFixed(2)
  const formattedTaxes = Number(taxes || 0).toFixed(2)
  const formattedTotal = Number(total || 0).toFixed(2)

  return (
    <div className="quotation-footer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <strong>Subtotal:</strong> {currency} {formattedSubtotal}
        </div>
        <div>
          <strong>Discount:</strong> {currency} -{formattedDiscount}
        </div>
        <div>
          <strong>Taxes:</strong> {currency} {formattedTaxes}
        </div>
        <div className="total">
          <strong>Grand Total:</strong> {currency} {formattedTotal}
        </div>
      </div>
    </div>
  )
}

export default WorkOrderFooterSection
