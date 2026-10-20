import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useCart } from '../context/useCart.js'

export default function Header() {
  const { user, ready, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const onShop = location.pathname === '/'
  const [search, setSearch] = useState(query)
  const [seen, setSeen] = useState({ onShop, query })

  if (onShop && (seen.onShop !== onShop || seen.query !== query)) {
    setSeen({ onShop, query })
    setSearch(query)
  }

  function onSearch(event) {
    event.preventDefault()
    const next = new URLSearchParams()
    const term = search.trim()
    if (term) next.set('q', term)
    if (location.pathname === '/') {
      const category = params.get('category')
      if (category) next.set('category', category)
    }
    const query = next.toString()
    navigate(query ? `/?${query}` : '/')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden="true">
            N
          </span>
          North & Pine
        </Link>
        <form className="search" role="search" onSubmit={onSearch}>
          <label className="sr-only" htmlFor="q">
            Search products
          </label>
          <input
            id="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bowls, linen, lamps"
          />
          <button type="submit" className="primary">
            Search
          </button>
        </form>
        <nav className="nav" aria-label="Account">
          <NavLink to="/cart" className="cart-link">
            Cart
            {count > 0 ? <span className="badge">{count}</span> : null}
          </NavLink>
          {ready && user ? (
            <div className="account">
              <Link to="/orders">{user.name}</Link>
              <button type="button" className="text" onClick={() => logout()}>
                Log out
              </button>
            </div>
          ) : null}
          {ready && !user ? (
            <div className="account">
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="button primary">
                Sign up
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
