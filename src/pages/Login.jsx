import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { safeNext } from '../lib/routes.js'

export default function Login() {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (ready && user) navigate(next, { replace: true })
  }, [ready, user, next, navigate])

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await login({ email, password })
      navigate(next)
    } catch (err) {
      setError(err.message || 'Could not log in.')
      setPending(false)
    }
  }

  return (
    <section className="page auth">
      <h1>Log in</h1>
      <p className="lede">Pick up the cart and orders saved with your account.</p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="primary" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="switch">
        New here? <Link to={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </p>
    </section>
  )
}
