import React from 'react'

function WorkOrderFooterSection({ total = 0, currency = '₹' }) {
  return (
    <div className="quotation-footer">
      <div className="total">
        <strong>Grand Total:</strong> {currency} {Number(total).toFixed(2)}
      </div>
    </div>
  )
}

export default WorkOrderFooterSection
