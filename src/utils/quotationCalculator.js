/* -------------------------------------------------
   ITEM LEVEL CALCULATIONS
------------------------------------------------- */

export const calculateLine = ({
    quantity = 0,
    selling_price = 0,
    discount = 0,
    gst_rate = 0
  }) => {
    const gross = quantity * selling_price
    const discounted = Math.max(gross - discount, 0)
  
    const tax =
      gst_rate > 0
        ? discounted * gst_rate / (100 + gst_rate) // inclusive GST
        : 0
  
    return {
      line_total: discounted,
      tax
    }
  }
  
  /* -------------------------------------------------
     QUOTATION LEVEL CALCULATIONS
  ------------------------------------------------- */
  
 // utils/quotationCalculator.js
// utils/quotationCalculator.js
// utils/quotationCalculator.js
export function calculateQuotationTotals({
    items = [],
    overallDiscount = 0,
    pax = null,
    quotationMode = 'GENERAL',
    gstPricingMode = 'EXCLUSIVE'
  } = {}) {
  
    const paxFactor =
      quotationMode === 'CATERING'
        ? Math.max(Number(pax || 1), 1)
        : 1
  
    let rawSubtotal = 0
    let itemDiscount = 0
    let discountedSubtotal = 0
    let totalTax = 0
    let lineTotalSum = 0
  
    // 🔥 COST & PROFIT
    let totalCost = 0
    let marginValue = 0
  
    for (const i of items) {
      const qty = Math.max(Number(i.quantity || 0), 0)
  
      const selling = Math.max(Number(i.selling_price || 0), 0)
      const cost = Math.max(Number(i.cost_price || 0), 0)
  
      const discount = Math.max(Number(i.discount || 0), 0)
      const gst = Math.max(Number(i.gst_rate || 0), 0)
  
      // ---------------- SELL SIDE ----------------
      const rowSubtotal = selling * qty
      rawSubtotal += rowSubtotal
  
      const rowDiscount = Math.min(discount, rowSubtotal)
      itemDiscount += rowDiscount
  
      const base = Math.max(rowSubtotal - rowDiscount, 0)
      discountedSubtotal += base
  
      let rowTax = 0
      let rowLineTotal = base
  
      if (gst > 0) {
        if (gstPricingMode === 'INCLUSIVE') {
          rowTax = base * gst / (100 + gst)
          rowLineTotal = base
        } else {
          rowTax = base * gst / 100
          rowLineTotal = base + rowTax
        }
      }
  
      totalTax += rowTax
      lineTotalSum += rowLineTotal
  
      // ---------------- COST / MARGIN ----------------
      const rowCost = cost * qty
      totalCost += rowCost
  
      marginValue += (base - rowCost)
    }
  
    // PAX multiplier
    rawSubtotal *= paxFactor
    itemDiscount *= paxFactor
    discountedSubtotal *= paxFactor
    totalTax *= paxFactor
    lineTotalSum *= paxFactor
    totalCost *= paxFactor
    marginValue *= paxFactor
  
    const overall = Math.max(Number(overallDiscount || 0), 0)

    const totalBeforeOverallDiscount = lineTotalSum
    const totalAfterOverallDiscount =
      Math.max(totalBeforeOverallDiscount - overall, 0)
    
    const totalDiscount = itemDiscount + overall
    
    // ✅ FIXED MARGIN CALCULATION
    const netRevenue = Math.max(
      discountedSubtotal - overall,
      0
    )
    
    const finalMarginValue = netRevenue - totalCost
    
    const marginPercent =
      netRevenue > 0
        ? (finalMarginValue / netRevenue) * 100
        : 0
    
    return {
      paxFactor,
    
      subtotal: rawSubtotal,
      rawSubtotal,
    
      discountedSubtotal,
    
      itemDiscount,
      overallDiscount: overall,
      totalDiscount,
    
      tax: totalTax,
      totalTax,
    
      total: totalAfterOverallDiscount,
      grandTotal: totalAfterOverallDiscount,
    
      totalCost,
      marginValue: finalMarginValue,
      marginPercent
    }
    
  }
  