import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Totals from '../components/Totals.jsx'
import { useAuth } from '../context/useAuth.js'
import { useCart } from '../context/useCart.js'
import { formatPrice } from '../lib/money.js'

const EMPTY = {
  name: '',
  email: '',
  address: '',
  city: '',
  postal: '',
  country: 'United States',
}

export default function Checkout() {
  const { user } = useAuth()
  const { lines, subtotal, cartReady, checkout } = useCart()
  const navigate = useNavigate()
  const lock = useRef(false)
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: user?.name ?? '',
    email: user?.email ?? '',
  }))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login?next=/checkout', { replace: true })
  }, [user, navigate])

  if (!user) return null

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (lock.current) return
    const shipping = {
      name: form.name.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      postal: form.postal.trim(),
      country: form.country.trim(),
    }
    if (Object.values(shipping).some((value) => !value)) {
      setError('Fill in every shipping field.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      setError('Enter a valid email address.')
      return
    }

    lock.current = true
    setPending(true)
    setError('')
    try {
      const order = await checkout(shipping)
      navigate(`/orders?placed=${order.id}`)
    } catch (err) {
      setError(err.message || 'Could not place the order.')
      lock.current = false
      setPending(false)
    }
  }

  return (
    <section className="page">
      <h1>Checkout</h1>
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
          <form className="form" onSubmit={onSubmit}>
            <h2>Shipping</h2>
            <label className="field">
              Full name
              <input value={form.name} onChange={update('name')} autoComplete="name" required />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              Street address
              <input
                value={form.address}
                onChange={update('address')}
                autoComplete="street-address"
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                City
                <input value={form.city} onChange={update('city')} autoComplete="address-level2" required />
              </label>
              <label className="field">
                Postal code
                <input value={form.postal} onChange={update('postal')} autoComplete="postal-code" required />
              </label>
            </div>
            <label className="field">
              Country
              <input value={form.country} onChange={update('country')} autoComplete="country-name" required />
            </label>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="primary" disabled={pending}>
              {pending ? 'Placing order…' : 'Place order'}
            </button>
          </form>
          <aside className="summary">
            <h2>Your order</h2>
            <ul className="mini-lines">
              {lines.map((line) => (
                <li key={line.product.id}>
                  <img src={line.product.image} alt="" />
                  <span>
                    {line.product.name}
                    <small> × {line.qty}</small>
                  </span>
                  <strong>{formatPrice(line.product.price * line.qty)}</strong>
                </li>
              ))}
            </ul>
            <Totals subtotal={subtotal} />
          </aside>
        </div>
      )}
    </section>
  )
}
