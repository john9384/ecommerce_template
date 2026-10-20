import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Header from './Header.jsx'

export default function Layout() {
  const { ready } = useAuth()

  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        {ready ? <Outlet /> : <p className="loading page">Loading the shop…</p>}
      </main>
      <footer className="footer">
        <p>North & Pine is a demonstration shop. Accounts, carts, and orders stay in this browser.</p>
      </footer>
    </div>
  )
}
