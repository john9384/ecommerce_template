import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import { listCategories, listProducts } from '../db/idb.js'

export default function Shop() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? 'All'
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([listProducts({ category, query }), listCategories()]).then(
      ([nextProducts, nextCategories]) => {
        if (cancelled) return
        setProducts(nextProducts)
        setCategories(nextCategories)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [category, query])

  function hrefFor(name) {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    if (name !== 'All') next.set('category', name)
    const search = next.toString()
    return search ? `/?${search}` : '/'
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Home goods</p>
        <h1>Goods for the table and the room.</h1>
        <p className="lede">
          Small-batch pieces. Stock, your cart, and past orders all live in this browser.
        </p>
      </header>
      <nav className="filters" aria-label="Categories">
        {['All', ...categories].map((name) => (
          <Link
            key={name}
            to={hrefFor(name)}
            className={name === category ? 'chip active' : 'chip'}
            aria-current={name === category ? 'true' : undefined}
          >
            {name}
          </Link>
        ))}
      </nav>
      {loading ? (
        <p className="loading">Loading pieces…</p>
      ) : products.length === 0 ? (
        <div className="empty">
          <h2>No pieces match</h2>
          <p>Try another category or a shorter search.</p>
          <Link to="/" className="button primary">
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <p className="result-count">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
            {query ? ` for “${query}”` : ''}
          </p>
          <div className="grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
