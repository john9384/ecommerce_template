import { formatPrice, shippingCost } from '../lib/money.js'

export default function Totals({ subtotal }) {
  const delivery = shippingCost(subtotal)
  const total = subtotal + delivery

  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatPrice(subtotal)}</dd>
      </div>
      <div>
        <dt>Shipping</dt>
        <dd>{delivery === 0 ? 'Free' : formatPrice(delivery)}</dd>
      </div>
      <div className="grand">
        <dt>Total</dt>
        <dd>{formatPrice(total)}</dd>
      </div>
    </dl>
  )
}
