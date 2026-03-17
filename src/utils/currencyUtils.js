export function displayCurrency(codeOrSymbol) {
  if (!codeOrSymbol) return '₹'
  const s = String(codeOrSymbol).trim()
  if (!s) return '₹'
  // Map common currency codes to their symbol for UI display
  if (s.toUpperCase() === 'INR') return '₹'
  // If caller already passed a symbol like '₹', just return it
  if (s.length <= 3 && /[^A-Za-z0-9]/.test(s)) return s
  return s
}

export default displayCurrency
