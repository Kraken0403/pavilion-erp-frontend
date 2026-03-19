export function formatQty(value) {
  const n = Number(value || 0)
  if (Number.isNaN(n)) return String(value)
  if (Number.isInteger(n)) return String(n)
  // Remove trailing zeros
  return String(n).replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/,'')
}

export function formatMoney(value, currency = '₹') {
  return `${currency} ${Number(value || 0).toFixed(2)}`
}
