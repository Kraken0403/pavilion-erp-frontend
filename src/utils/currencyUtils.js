export function displayCurrency(codeOrSymbol) {
  if (!codeOrSymbol) return '₹'
  const s = String(codeOrSymbol).trim()
  if (!s) return '₹'
  if (s.toUpperCase() === 'INR') return '₹'
  if (s.length <= 3 && /[^A-Za-z0-9]/.test(s)) return s
  try {
    const symbol = new Intl.NumberFormat('en', { style: 'currency', currency: s.toUpperCase(), currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value
    return symbol || s
  } catch (_) {
    return s
  }
}

export function formatCurrency(value, codeOrSymbol = 'INR', options = {}) {
  const amount = Number(value || 0)
  const digits = options.maximumFractionDigits ?? 2
  return `${displayCurrency(codeOrSymbol)}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: options.minimumFractionDigits ?? digits,
    maximumFractionDigits: digits,
  })}`
}

export default displayCurrency
