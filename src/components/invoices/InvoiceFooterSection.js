import React from 'react'

function InvoiceFooterSection({ handleSubmit }) {
  return (
    <div className="quotation-footer">
      <button className="save-btn-x" onClick={handleSubmit}>
        Create Invoice
      </button>
    </div>
  )
}

export default InvoiceFooterSection