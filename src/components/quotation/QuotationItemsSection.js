import React, { useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  TextField,
  Typography,
  Box,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useSettings } from '../../context/SettingsContext'
import '../../assets/styles/QuotationItems.scss'

function QuotationItemsSection({
  items,
  setItems,
  updateItem,
  handleProductSelect,
  addItem,
  reorderItems,
  setOpenProductDialog,
  isLocked,
  gstPricingMode = 'EXCLUSIVE',
  products = [],
}) {
  const { settings } = useSettings()
  const currency = settings?.currency_code || '₹'

  const dragFromIndex = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  /* ---------------------------------------
     HELPERS
  --------------------------------------- */
  const safeNumber = (v, fallback = 0) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  const normalizeProductLabel = (p) =>
    p?.name ||
    p?.product_name ||
    p?.title ||
    p?.label ||
    p?.variant_sku ||
    ''

  /* ---------------------------------------
     NORMALIZE PRODUCTS (CRITICAL)
  --------------------------------------- */
  const productOptions = useMemo(() => {
    return (products || []).map((p) => ({
      ...p,
      __id: String(p.id ?? p.product_id ?? p._id),
      __label: normalizeProductLabel(p),
    }))
  }, [products])

  const resolveProductValue = (itemProduct) => {
    if (!itemProduct) return null

    const id =
      itemProduct.__id ||
      itemProduct.id ||
      itemProduct.product_id ||
      itemProduct._id

    return (
      productOptions.find(
        (p) => String(p.__id) === String(id)
      ) || null
    )
  }

  /* ---------------------------------------
     DRAG & DROP
  --------------------------------------- */
  const reorder = (from, to) => {
    reorderItems(from, to)
  }


  const calculateItem = (item, quantityOverride) => {
    const qty = Number(quantityOverride ?? item.quantity ?? 1)
    const price = Number(item.selling_price || 0)
    const gross = qty * price
    const discount = Math.min(Number(item.discount || 0), Math.max(gross, 0))
    const gstRate = Number(item.gst_rate || 0)
    const discounted = Math.max(gross - discount, 0)

    let tax = 0
    let lineTotal = discounted

    if (gstRate > 0) {
      if (gstPricingMode === 'INCLUSIVE') {
        tax = discounted * gstRate / (100 + gstRate)
        lineTotal = discounted
      } else {
        tax = discounted * gstRate / 100
        lineTotal = discounted + tax
      }
    }

    return {
      line_total: lineTotal,
      tax
    }
  }


  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */
  return (
    <div className="quotation-items-section">
      <Typography className="section-title">
        <span className="sep"></span>
        Quotation Items
      </Typography>

      <div className="qi-table-wrap">
        <table className="qi-table">
          <thead>
            <tr>
              <th className="col-drag"></th>
              <th className="col-serial">#</th>
              <th className="col-product">Product</th>
              <th className="col-qty">Qty</th>
              <th className="col-cost">Cost Price ({currency})</th>
              <th className="col-selling">Selling Price ({currency})</th>
              <th className="col-discount">Discount ({currency})</th>
              <th className="col-gst">GST %</th>
              <th className="col-margin">Margin ({currency})</th>
              <th className="col-total">Line Total ({currency})</th>
              <th className="col-remove"></th>

            </tr>
          </thead>


          <tbody>
            {(items || []).map((item, index) => {
              const cost = safeNumber(item.cost_price)
              const sell = safeNumber(item.selling_price, 0)
              const qty = Math.max(safeNumber(item.quantity, 1), 1)
              const rowSubtotal = sell * qty
              const rowDiscount = Math.min(safeNumber(item.discount), Math.max(rowSubtotal, 0))
              const rowNetRevenue = Math.max(rowSubtotal - rowDiscount, 0)
              const rowCost = cost * qty
              const margin = rowNetRevenue - rowCost
              const marginPct = rowNetRevenue > 0 ? (margin / rowNetRevenue) * 100 : 0


              return (
                <tr key={index}

                  onDragStart={() => {
                    dragFromIndex.current = index
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverIndex(index)
                  }}
                  onDrop={() => {
                    reorder(dragFromIndex.current, index)
                    dragFromIndex.current = null
                    setDragOverIndex(null)
                  }}
                  className={
                    dragOverIndex === index ? 'qi-row-drag-over' : ''
                  }>
                  {/* DRAG */}
                  <td className="qi-drag">
                    <span
                      className="qi-grip"
                      draggable={!isLocked}
                      onDragStart={() => {
                        dragFromIndex.current = index
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOverIndex(index)
                      }}
                      onDrop={() => {
                        reorder(dragFromIndex.current, index)
                        dragFromIndex.current = null
                        setDragOverIndex(null)
                      }}
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </span>
                  </td>

                  <td className="col-serial">{index + 1}</td>


                  {/* PRODUCT */}
                  <td>
                    <Autocomplete
                      className="form-input"
                      disabled={isLocked}
                      options={productOptions}
                      clearOnBlur={false}
                      value={resolveProductValue(item.product)}
                      getOptionLabel={(o) => o?.__label || ''}
                      isOptionEqualToValue={(a, b) =>
                        String(a.__id) === String(b.__id)
                      }
                      onChange={(e, val) => {
                        if (!val) return

                        const baseItem = {
                          ...items[index],
                          product: val,
                          cost_price: val.cost_price ?? val.cost ?? 0,
                          selling_price: val.selling_price ?? val.price ?? 0,
                          gst_rate: val.gst_rate ?? 0,
                          discount: items[index].discount ?? 0,
                          quantity: items[index].quantity ?? 1,
                        }

                        const calc = calculateItem(baseItem)

                        updateItem(index, {
                          ...baseItem,
                          ...calc,
                        })
                      }}

                      renderOption={(props, option) => (
                        <li {...props} key={option.__id}>
                          {option.__label}
                        </li>
                      )}
                      PaperComponent={({ children }) => (
                        <Box className="qi-dropdown">
                          {children}
                          {!isLocked && (
                            <Box
                              className="qi-add-option"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setOpenProductDialog(true)}
                            >
                              <AddIcon fontSize="small" />
                              Add Product
                            </Box>
                          )}
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          className="form-input"
                          placeholder="Search product"
                          onMouseDown={(e) => e.stopPropagation()}

                        />
                      )}
                    />
                  </td>

                  {/* QTY */}
                  <td>
                    <TextField
                      className="form-input"
                      type="number"
                      value={item.quantity ?? 1}
                      onMouseDown={(e) => e.stopPropagation()}

                      onChange={(e) => {
                        const raw = e.target.value

                        if (raw === '') {
                          updateItem(index, { quantity: '' })
                          return
                        }

                        const quantity = Math.max(1, safeNumber(raw, 1))
                        const calc = calculateItem(item, quantity)

                        updateItem(index, {
                          quantity,
                          ...calc,
                        })
                      }}


                    />
                  </td>

                  {/* COST */}
                  <td>
                    <TextField
                      className="form-input"
                      type="number"
                      value={item.cost_price ?? 0}
                      onMouseDown={(e) => e.stopPropagation()}

                      onChange={(e) => {
                        const raw = e.target.value

                        if (raw === '') {
                          updateItem(index, { cost_price: '' })
                          return
                        }

                        updateItem(index, {
                          cost_price: Math.max(0, safeNumber(raw)),
                        })
                      }}

                    />
                  </td>



                  {/* SELL */}
                  <td>
                    <TextField
                      className="form-input"
                      type="number"
                      value={item.selling_price ?? 0}
                      onMouseDown={(e) => e.stopPropagation()}

                      onChange={(e) => {
                        const raw = e.target.value

                        if (raw === '') {
                          updateItem(index, { selling_price: '' })
                          return
                        }

                        const selling_price = safeNumber(raw)
                        const calc = calculateItem({ ...item, selling_price })

                        updateItem(index, {
                          selling_price,
                          ...calc,
                        })
                      }}


                    />
                  </td>

                  {/* DISCOUNT */}
                  <td>
                    <TextField
                      className="form-input"
                      type="number"
                      value={item.discount === '' ? '' : item.discount}
                      onMouseDown={(e) => e.stopPropagation()}

                      onChange={(e) => {
                        const raw = e.target.value

                        if (raw === '') {
                          updateItem(index, { discount: '' })
                          return
                        }

                        const discount = Math.max(0, safeNumber(raw))
                        const calc = calculateItem({ ...item, discount })

                        updateItem(index, {
                          discount,
                          ...calc,
                        })
                      }}

                    />
                  </td>

                  {/* GST RATE (READ ONLY) */}
                  <td>
                    <TextField
                      className="form-input"
                      value={`${item.gst_rate || 0}%`}
                      InputProps={{ readOnly: true }}
                      onMouseDown={(e) => e.stopPropagation()}

                    />
                  </td>




                  {/* MARGIN */}
                  <td>
                    <TextField
                      className="form-input"
                      value={` ${margin.toFixed(
                        2
                      )} (${marginPct.toFixed(1)}%)`}
                      InputProps={{ readOnly: true }}
                      onMouseDown={(e) => e.stopPropagation()}

                    />
                  </td>

                  {/* LINE TOTAL */}
                  <td>
                    <TextField
                      className="form-input"
                      value={` ${Number(item.line_total || 0).toFixed(2)}`}
                      InputProps={{ readOnly: true }}
                      onMouseDown={(e) => e.stopPropagation()}

                    />
                  </td>

                  {/* ACTIONS (reserved) */}
                  <td className="col-remove">
                    {!isLocked && (
                      <span
                        className="qi-remove"
                        title="Remove item"
                        onClick={() => removeItem(index)}
                      >
                        ✕
                      </span>
                    )}
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isLocked && (
        <button className="add-item-btn" onClick={addItem}>
          + Add Product
        </button>
      )}
    </div>
  )

}

export default QuotationItemsSection
