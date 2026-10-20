import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './useAuth.js'
import { PRODUCTS } from '../data/products.js'
import {
  clearSession,
  createUser,
  ensureSeeded,
  getById,
  getSessionUserId,
  getUserByEmail,
  mergeCarts,
  setSessionUserId,
} from '../db/idb.js'
import { hashPassword, randomSalt } from '../db/password.js'

function publicUser(record) {
  return { id: record.id, name: record.name, email: record.email }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      await ensureSeeded(PRODUCTS)
      const userId = await getSessionUserId()
      if (!userId) return
      const record = await getById('users', userId)
      if (!cancelled && record) setUser(publicUser(record))
    }

    restore()
      .catch(() => {
        // The shop can still render once ready is set; pages surface their own errors.
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => {
    async function signup({ name, email, password }) {
      const trimmedName = name.trim()
      const normalizedEmail = normalizeEmail(email)
      if (!trimmedName) throw new Error('Enter your name.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new Error('Enter a valid email address.')
      }
      if (password.length < 6) throw new Error('Use at least 6 characters for the password.')

      const existing = await getUserByEmail(normalizedEmail)
      if (existing) throw new Error('An account with that email already exists.')

      const salt = randomSalt()
      const passwordHash = await hashPassword(password, salt)
      const record = {
        id: crypto.randomUUID(),
        name: trimmedName,
        email: normalizedEmail,
        salt,
        passwordHash,
      }

      try {
        await createUser(record)
      } catch (error) {
        if (error?.name === 'ConstraintError') {
          throw new Error('An account with that email already exists.')
        }
        throw error
      }

      await setSessionUserId(record.id)
      await mergeCarts('guest', record.id)
      const next = publicUser(record)
      setUser(next)
      return next
    }

    async function login({ email, password }) {
      const normalizedEmail = normalizeEmail(email)
      const record = await getUserByEmail(normalizedEmail)
      if (!record) throw new Error('Email or password is incorrect.')
      const passwordHash = await hashPassword(password, record.salt)
      if (passwordHash !== record.passwordHash) {
        throw new Error('Email or password is incorrect.')
      }
      await setSessionUserId(record.id)
      await mergeCarts('guest', record.id)
      const next = publicUser(record)
      setUser(next)
      return next
    }

    async function logout() {
      await clearSession()
      setUser(null)
    }

    return { user, ready, signup, login, logout }
  }, [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
