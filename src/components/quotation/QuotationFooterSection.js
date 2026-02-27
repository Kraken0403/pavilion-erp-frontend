import React from 'react'

function QuotationFooterSection({
  total = 0,
  handleSubmit,
  readOnly = false,
  disabled = false,
  currency = '₹'
}) {
  return (
    <div className="quotation-footer">
      {/* <div className="total">
        <strong>Total:</strong> {currency} {Number(total || 0).toFixed(2)}
      </div> */}

      {!readOnly && (
        <button
          className="primary-btn"
          onClick={handleSubmit}
          disabled={disabled || typeof handleSubmit !== 'function'}
        >
          Save Quotation
        </button>
      )}
    </div>
  )
}

export default QuotationFooterSection
