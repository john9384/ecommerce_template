import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="page empty">
      <h1>Page not found</h1>
      <p>That address isn’t part of the shop.</p>
      <Link to="/" className="button primary">
        Back to the shop
      </Link>
    </section>
  )
}
