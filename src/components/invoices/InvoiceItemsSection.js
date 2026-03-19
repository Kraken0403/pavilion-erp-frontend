import React from 'react'
import { Grid, TextField, Typography, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import Autocomplete from '@mui/material/Autocomplete'

function InvoiceItemsSection({
  items,
  updateItem,
  addItem,
  removeItem,
  products,
  handleProductSelect,
  readOnly = false,
}) {
  return (
    <div className="quotation-items-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Invoice Items
      </Typography>

      {items.map((item, index) => (
        <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
          {/* PRODUCT */}
          <Grid item xs={12} md={4}>
            <Typography className="field-label">Product</Typography>
            {readOnly ? (
              <Typography>{item.product?.name || item.description}</Typography>
            ) : (
              <Autocomplete
                options={products}
                getOptionLabel={(p) => p.name || ''}
                value={item.product || null}
                onChange={(e, value) => handleProductSelect(index, value)}
                renderInput={(params) => (
                  <TextField {...params} className="form-input" />
                )}
              />
            )}
          </Grid>

          {/* QTY */}
          <Grid item xs={12} md={2}>
            <Typography className="field-label">Qty</Typography>
            {readOnly ? (
              <Typography>{(function(){ try { const { formatQty } = require('../../utils/formatters'); return formatQty(item.quantity) } catch { return item.quantity } })()}</Typography>
            ) : (
              <TextField
                className="form-input"
                type="number"
                fullWidth
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
              />
            )}
          </Grid>

          {/* PRICE */}
          <Grid item xs={12} md={2}>
            <Typography className="field-label">Unit Price</Typography>
            {readOnly ? (
              <Typography>{item.selling_price}</Typography>
            ) : (
              <TextField
                className="form-input"
                type="number"
                fullWidth
                value={item.selling_price}
                onChange={(e) => updateItem(index, { selling_price: e.target.value })}
              />
            )}
          </Grid>

          {/* GST */}
          <Grid item xs={12} md={2}>
            <Typography className="field-label">GST %</Typography>
            {readOnly ? (
              <Typography>{item.gst_rate}</Typography>
            ) : (
              <TextField
                className="form-input"
                type="number"
                fullWidth
                value={item.gst_rate}
                onChange={(e) => updateItem(index, { gst_rate: e.target.value })}
              />
            )}
          </Grid>

          {/* DELETE */}
          {!readOnly && (
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'end' }}>
              <IconButton onClick={() => removeItem(index)}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          )}
        </Grid>
      ))}

      {!readOnly && (
        <button className="add-item-btn" onClick={addItem}>
          + Add Item
        </button>
      )}
    </div>
  )
}

export default InvoiceItemsSection