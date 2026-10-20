import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getOrdersByUser } from '../db/idb.js'
import { formatPrice } from '../lib/money.js'

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function Orders() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    if (!user) navigate('/login?next=/orders', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getOrdersByUser(user.id).then((records) => {
      if (!cancelled) setOrders(records)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  const placed = orders?.find((order) => order.id === params.get('placed'))

  return (
    <section className="page">
      {placed ? (
        <div className="notice" role="status">
          <p className="eyebrow">Order confirmed</p>
          <h1>Thanks, {placed.shipping.name.split(' ')[0]}.</h1>
          <p>
            Order {placed.id.slice(0, 8).toUpperCase()} is saved in this browser. We’ll send it to{' '}
            {placed.shipping.address}, {placed.shipping.city}.
          </p>
        </div>
      ) : (
        <h1>Orders</h1>
      )}
      {orders === null ? (
        <p className="loading">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="empty">
          <p>No orders yet.</p>
          <Link to="/" className="button primary">
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order" key={order.id}>
              <header>
                <h2>Order {order.id.slice(0, 8).toUpperCase()}</h2>
                <p>{formatDate(order.createdAt)}</p>
              </header>
              <ul>
                {order.items.map((item) => (
                  <li key={item.productId}>
                    <img src={item.image} alt="" />
                    <span>
                      {item.name} × {item.qty}
                    </span>
                    <strong>{formatPrice(item.price * item.qty)}</strong>
                  </li>
                ))}
              </ul>
              <p className="fine">
                Ships to {order.shipping.name}, {order.shipping.address}, {order.shipping.city}{' '}
                {order.shipping.postal}
              </p>
              <p className="order-total">
                {order.shippingCost === 0 ? 'Shipping free' : `Shipping ${formatPrice(order.shippingCost)}`}
                {' · '}
                <strong>{formatPrice(order.total)}</strong>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
