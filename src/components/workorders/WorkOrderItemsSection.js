import React from 'react'
import { Typography } from '@mui/material'
import { useSettings } from '../../context/SettingsContext'
import '../../assets/styles/QuotationItems.scss'

function WorkOrderItemsSection({ items = [] }) {
  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'

  const toNumber = (value) => Number(value || 0)

  const getItemExtraDescription = (item = {}) => {
    const raw = String(item.description || '').trim()
    if (!raw) return ''

    const productName = String(item.product_name || item.name || '').trim().toLowerCase()
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.toLowerCase() !== productName)

    return lines.join(' | ')
  }

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
                <td>
                  <div>{it.product_name || it.name || it.description || '—'}</div>
                  {!!getItemExtraDescription(it) && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {getItemExtraDescription(it)}
                    </div>
                  )}
                </td>
                <td>{it.brand || it.product_brand || '—'}</td>
                <td>{toNumber(it.quantity ?? it.qty)}</td>
                <td>{currency} {toNumber(it.unit_price ?? it.price ?? it.rate).toFixed(2)}</td>
                <td>{currency} {toNumber(it.discount ?? it.discount_amount).toFixed(2)}</td>
                <td>{currency} {toNumber(it.tax ?? it.tax_amount ?? it.gst_amount).toFixed(2)}</td>
                <td>{currency} {toNumber(it.line_total ?? it.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkOrderItemsSection
