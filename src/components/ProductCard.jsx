import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { formatPrice } from '../lib/money.js'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const [status, setStatus] = useState(null)
  const [pending, setPending] = useState(false)
  const out = product.stock <= 0

  async function onAdd() {
    setPending(true)
    setStatus(null)
    try {
      await addItem(product.id, 1)
      setStatus({ tone: 'ok', text: 'Added to cart' })
    } catch (error) {
      setStatus({ tone: 'bad', text: error.message })
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="card">
      <Link to={`/product/${product.id}`} className="card-media">
        <img src={product.image} alt="" />
      </Link>
      <div className="card-body">
        <p className="eyebrow">{product.category}</p>
        <h2>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h2>
        <p className="price">{formatPrice(product.price)}</p>
        <p className={out ? 'stock out' : product.stock <= 3 ? 'stock low' : 'stock'}>
          {out ? 'Out of stock' : product.stock <= 3 ? `Only ${product.stock} left` : `${product.stock} in stock`}
        </p>
        <button type="button" className="primary" onClick={onAdd} disabled={out || pending}>
          {out ? 'Out of stock' : pending ? 'Adding…' : 'Add to cart'}
        </button>
        <p className={status?.tone === 'bad' ? 'status bad' : 'status'} role="status">
          {status?.text ?? ''}
        </p>
      </div>
    </article>
  )
}
