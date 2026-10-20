export function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function shippingCost(subtotal) {
  if (subtotal <= 0 || subtotal >= 75) return 0
  return 6
}
