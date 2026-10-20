import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QtyControl from '../components/QtyControl.jsx'
import { useCart } from '../context/useCart.js'
import { getById } from '../db/idb.js'
import { formatPrice } from '../lib/money.js'

function ProductDetail({ id }) {
  const { addItem } = useCart()
  const [product, setProduct] = useState(undefined)
  const [qty, setQty] = useState(1)
  const [status, setStatus] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    getById('products', id).then((record) => {
      if (!cancelled) setProduct(record ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (product === undefined) return <p className="loading page">Loading piece…</p>
  if (!product) {
    return (
      <div className="page empty">
        <h1>We couldn’t find that piece</h1>
        <Link to="/" className="button primary">
          Back to the shop
        </Link>
      </div>
    )
  }

  const out = product.stock <= 0

  async function onAdd(event) {
    event.preventDefault()
    setPending(true)
    setStatus(null)
    try {
      await addItem(product.id, qty)
      setStatus({ tone: 'ok', text: 'Added to cart' })
    } catch (error) {
      setStatus({ tone: 'bad', text: error.message })
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="page product">
      <div className="product-media">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-copy">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        <p className="price large">{formatPrice(product.price)}</p>
        <p className="lede">{product.description}</p>
        <p className={out ? 'stock out' : product.stock <= 3 ? 'stock low' : 'stock'}>
          {out ? 'Out of stock' : `${product.stock} in stock`}
        </p>
        <form className="buy" onSubmit={onAdd}>
          {out ? null : (
            <QtyControl
              value={qty}
              max={product.stock}
              label={product.name}
              onChange={(next) => setQty(Math.max(1, Math.min(next, product.stock)))}
            />
          )}
          <button type="submit" className="primary" disabled={out || pending}>
            {out ? 'Out of stock' : pending ? 'Adding…' : 'Add to cart'}
          </button>
        </form>
        <p className={status?.tone === 'bad' ? 'status bad' : 'status'} role="status">
          {status?.text ?? ''}
        </p>
        <Link to="/cart" className="text-link">
          View cart
        </Link>
      </div>
    </article>
  )
}

export default function Product() {
  const { id } = useParams()
  return <ProductDetail key={id} id={id} />
}
