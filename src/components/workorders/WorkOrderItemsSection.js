import React from 'react'
import { Typography } from '@mui/material'
import { useSettings } from '../../context/SettingsContext'
import '../../assets/styles/QuotationItems.scss'

function WorkOrderItemsSection({ items = [] }) {
  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'

  return (
    <div className="quotation-items-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Work Order Items
      </Typography>

      <div className="qi-table-wrap">
        <table className="qi-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Brand</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>GST</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.product_name}</td>
                <td>{it.brand}</td>
                <td>{it.quantity}</td>
                <td>{currency} {it.unit_price.toFixed(2)}</td>
                <td>{currency} {it.discount.toFixed(2)}</td>
                <td>{currency} {it.tax.toFixed(2)}</td>
                <td>{currency} {it.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkOrderItemsSection
