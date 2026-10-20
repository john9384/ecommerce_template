import { Link } from 'react-router-dom'
import QtyControl from '../components/QtyControl.jsx'
import Totals from '../components/Totals.jsx'
import { useCart } from '../context/useCart.js'
import { formatPrice } from '../lib/money.js'

export default function Cart() {
  const { lines, subtotal, cartReady, setQty, removeItem } = useCart()

  return (
    <section className="page">
      <h1>Cart</h1>
      {!cartReady ? (
        <p className="loading">Loading your cart…</p>
      ) : lines.length === 0 ? (
        <div className="empty">
          <p>Your cart is empty.</p>
          <Link to="/" className="button primary">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="split">
          <ul className="cart-list">
            {lines.map((line) => (
              <li className="cart-line" key={line.product.id}>
                <Link to={`/product/${line.product.id}`} className="line-media">
                  <img src={line.product.image} alt="" />
                </Link>
                <div className="line-info">
                  <h2>
                    <Link to={`/product/${line.product.id}`}>{line.product.name}</Link>
                  </h2>
                  <p>{formatPrice(line.product.price)}</p>
                  <QtyControl
                    value={line.qty}
                    max={line.product.stock}
                    label={line.product.name}
                    onChange={(qty) => setQty(line.product.id, qty)}
                  />
                  <button type="button" className="text" onClick={() => removeItem(line.product.id)}>
                    Remove
                  </button>
                </div>
                <p className="line-total">{formatPrice(line.product.price * line.qty)}</p>
              </li>
            ))}
          </ul>
          <aside className="summary">
            <h2>Summary</h2>
            <Totals subtotal={subtotal} />
            <p className="fine">Free shipping on orders of $75 or more.</p>
            <Link to="/checkout" className="button primary">
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}
