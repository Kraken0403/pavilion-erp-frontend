import React from 'react'

function InvoiceFooterSection({ handleSubmit, label = 'Create Invoice' }) {
  return (
    <div className="quotation-footer">
      <button className="save-btn-x" onClick={handleSubmit}>
        {label}
      </button>
    </div>
  )
}

export default InvoiceFooterSection