import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getById, getCart, placeOrder, readCartLines, saveCart } from '../db/idb.js'
import { useAuth } from './useAuth.js'
import { CartContext } from './useCart.js'

export function CartProvider({ children }) {
  const { user, ready } = useAuth()
  const userId = user?.id ?? 'guest'
  const [lines, setLines] = useState([])
  const [cartReady, setCartReady] = useState(false)
  const [trackedUserId, setTrackedUserId] = useState(userId)
  const requestId = useRef(0)

  if (trackedUserId !== userId) {
    setTrackedUserId(userId)
    setLines([])
    setCartReady(false)
  }

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    const next = await readCartLines(userId)
    if (requestId.current !== id) return next
    setLines(next)
    setCartReady(true)
    return next
  }, [userId])

  useEffect(() => {
    if (!ready) return
    const id = ++requestId.current
    let cancelled = false
    readCartLines(userId).then((next) => {
      if (cancelled || requestId.current !== id) return
      setLines(next)
      setCartReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [ready, userId])

  const value = useMemo(() => {
    async function addItem(productId, qty = 1) {
      const product = await getById('products', productId)
      if (!product || product.stock <= 0) throw new Error('This item is out of stock.')
      const cart = await getCart(userId)
      const existing = cart.items.find((item) => item.productId === productId)
      const current = existing?.qty ?? 0
      if (current >= product.stock) throw new Error(`Only ${product.stock} available.`)
      const nextQty = Math.min(current + qty, product.stock)
      const items = existing
        ? cart.items.map((item) =>
            item.productId === productId ? { ...item, qty: nextQty } : item,
          )
        : [...cart.items, { productId, qty: nextQty }]
      await saveCart({ userId, items })
      await refresh()
    }

    async function setQty(productId, qty) {
      const product = await getById('products', productId)
      const cart = await getCart(userId)
      const max = product?.stock ?? 0
      const nextQty = Math.max(0, Math.min(qty, max))
      const items =
        nextQty === 0
          ? cart.items.filter((item) => item.productId !== productId)
          : cart.items.some((item) => item.productId === productId)
            ? cart.items.map((item) =>
                item.productId === productId ? { ...item, qty: nextQty } : item,
              )
            : [...cart.items, { productId, qty: nextQty }]
      await saveCart({ userId, items })
      await refresh()
    }

    async function removeItem(productId) {
      const cart = await getCart(userId)
      await saveCart({
        userId,
        items: cart.items.filter((item) => item.productId !== productId),
      })
      await refresh()
    }

    async function checkout(shipping) {
      if (!user) throw new Error('Log in to check out.')
      const cart = await getCart(user.id)
      const order = await placeOrder({ userId: user.id, items: cart.items, shipping })
      await refresh()
      return order
    }

    const count = lines.reduce((sum, line) => sum + line.qty, 0)
    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0)

    return {
      lines,
      count,
      subtotal,
      cartReady,
      addItem,
      setQty,
      removeItem,
      checkout,
      refresh,
    }
  }, [cartReady, lines, refresh, user, userId])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
