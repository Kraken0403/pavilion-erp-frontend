import React from 'react'

function WorkOrderFooterSection({ subtotal = 0, discount = 0, taxes = 0, total = 0, currency = '₹' }) {
  return (
    <div className="quotation-footer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <strong>Subtotal:</strong> {currency} {Number(subtotal).toFixed(2)}
        </div>
        <div>
          <strong>Discount:</strong> {currency} {Number(discount).toFixed(2)}
        </div>
        <div>
          <strong>Taxes:</strong> {currency} {Number(taxes).toFixed(2)}
        </div>
        <div className="total">
          <strong>Grand Total:</strong> {currency} {Number(total).toFixed(2)}
        </div>
      </div>
    </div>
  )
}

export default WorkOrderFooterSection
