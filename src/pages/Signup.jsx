import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { safeNext } from '../lib/routes.js'

export default function Signup() {
  const { user, ready, signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [name, setName] = useState('')
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
      await signup({ name, email, password })
      navigate(next)
    } catch (err) {
      setError(err.message || 'Could not create the account.')
      setPending(false)
    }
  }

  return (
    <section className="page auth">
      <h1>Create an account</h1>
      <p className="lede">We’ll keep your name, cart, and orders in this browser. Passwords are stored hashed.</p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
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
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="primary" disabled={pending}>
          {pending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="switch">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
      </p>
    </section>
  )
}
