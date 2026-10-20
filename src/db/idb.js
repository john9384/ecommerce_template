import { shippingCost } from '../lib/money.js'

const DB_NAME = 'northpine'
const DB_VERSION = 1
const SESSION_KEY = 'current'

let dbPromise

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains('products')) {
          const products = db.createObjectStore('products', { keyPath: 'id' })
          products.createIndex('category', 'category', { unique: false })
          products.createIndex('name', 'name', { unique: false })
        }

        if (!db.objectStoreNames.contains('users')) {
          const users = db.createObjectStore('users', { keyPath: 'id' })
          users.createIndex('email', 'email', { unique: true })
        }

        if (!db.objectStoreNames.contains('carts')) {
          db.createObjectStore('carts', { keyPath: 'userId' })
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orders = db.createObjectStore('orders', { keyPath: 'id' })
          orders.createIndex('userId', 'userId', { unique: false })
        }

        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = undefined
        reject(request.error)
      }
    })
  }

  return dbPromise
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error('The database transaction was aborted.'))
    tx.onerror = () => reject(tx.error || new Error('The database transaction failed.'))
  })
}

export async function getAll(storeName) {
  const db = await openDb()
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll())
}

export async function getById(storeName, id) {
  const db = await openDb()
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(id))
}

export async function putRecord(storeName, value) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).put(value)
  await transactionDone(tx)
}

export async function deleteRecord(storeName, key) {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).delete(key)
  await transactionDone(tx)
}

export async function ensureSeeded(products) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite')
    const store = tx.objectStore('products')
    const countRequest = store.count()

    countRequest.onsuccess = () => {
      if (countRequest.result > 0) return
      for (const product of products) store.put(product)
    }

    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error('Could not seed the shop.'))
    tx.onerror = () => reject(tx.error || new Error('Could not seed the shop.'))
  })
}

export async function listProducts({ category, query } = {}) {
  const db = await openDb()
  const store = db.transaction('products', 'readonly').objectStore('products')
  const products =
    category && category !== 'All'
      ? await requestToPromise(store.index('category').getAll(category))
      : await requestToPromise(store.getAll())

  const needle = query?.trim().toLowerCase()
  const filtered = needle
    ? products.filter((product) =>
        `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(needle),
      )
    : products

  return filtered.sort((a, b) => a.name.localeCompare(b.name))
}

export async function listCategories() {
  const products = await getAll('products')
  return [...new Set(products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export async function getUserByEmail(email) {
  const db = await openDb()
  return requestToPromise(
    db.transaction('users', 'readonly').objectStore('users').index('email').get(email),
  )
}

export async function createUser(user) {
  const db = await openDb()
  const tx = db.transaction('users', 'readwrite')
  tx.objectStore('users').add(user)
  await transactionDone(tx)
}

export async function getSessionUserId() {
  const record = await getById('session', SESSION_KEY)
  return record?.userId ?? null
}

export async function setSessionUserId(userId) {
  await putRecord('session', { key: SESSION_KEY, userId })
}

export async function clearSession() {
  await deleteRecord('session', SESSION_KEY)
}

export async function getCart(userId) {
  const record = await getById('carts', userId)
  return record ?? { userId, items: [] }
}

export async function saveCart(cart) {
  await putRecord('carts', cart)
}

export async function mergeCarts(fromId, toId) {
  if (fromId === toId) return getCart(toId)

  const [source, target, products] = await Promise.all([
    getCart(fromId),
    getCart(toId),
    getAll('products'),
  ])
  const stock = new Map(products.map((product) => [product.id, product.stock]))
  const totals = new Map()

  for (const item of [...target.items, ...source.items]) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.qty)
  }

  const items = []
  for (const [productId, qty] of totals) {
    const available = stock.get(productId) ?? 0
    if (available <= 0) continue
    items.push({ productId, qty: Math.min(qty, available) })
  }

  await saveCart({ userId: toId, items })
  await saveCart({ userId: fromId, items: [] })
  return { userId: toId, items }
}

export async function readCartLines(userId) {
  const cart = await getCart(userId)
  const products = await getAll('products')
  const byId = new Map(products.map((product) => [product.id, product]))
  const lines = []
  let changed = false

  for (const item of cart.items) {
    const product = byId.get(item.productId)
    if (!product || product.stock <= 0) {
      changed = true
      continue
    }
    const qty = Math.min(item.qty, product.stock)
    if (qty !== item.qty) changed = true
    lines.push({ product, qty })
  }

  if (changed) {
    await saveCart({
      userId,
      items: lines.map((line) => ({ productId: line.product.id, qty: line.qty })),
    })
  }

  return lines
}

export async function getOrdersByUser(userId) {
  const db = await openDb()
  const orders = await requestToPromise(
    db.transaction('orders', 'readonly').objectStore('orders').index('userId').getAll(userId),
  )
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function placeOrder({ userId, items, shipping }) {
  const merged = new Map()
  for (const item of items) {
    const qty = Number(item.qty) || 0
    if (qty <= 0) continue
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty)
  }
  const lines = [...merged.entries()]

  if (lines.length === 0) {
    return Promise.reject(new Error('Your cart is empty.'))
  }

  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(['products', 'orders', 'carts'], 'readwrite')
        const productsStore = tx.objectStore('products')
        const ordersStore = tx.objectStore('orders')
        const cartsStore = tx.objectStore('carts')
        const snapshots = []
        let settled = false

        const fail = (error) => {
          if (settled) return
          settled = true
          reject(error instanceof Error ? error : new Error('Could not place the order.'))
          try {
            tx.abort()
          } catch {
            // The transaction may already be finished.
          }
        }

        const finalize = () => {
          const subtotal = snapshots.reduce((sum, line) => sum + line.price * line.qty, 0)
          const delivery = shippingCost(subtotal)
          const order = {
            id: crypto.randomUUID(),
            userId,
            items: snapshots,
            shipping,
            subtotal,
            shippingCost: delivery,
            total: subtotal + delivery,
            createdAt: new Date().toISOString(),
          }
          ordersStore.add(order)
          cartsStore.put({ userId, items: [] })
          tx._result = order
        }

        const processAt = (index) => {
          if (settled) return
          if (index >= lines.length) {
            finalize()
            return
          }

          const [productId, qty] = lines[index]
          const request = productsStore.get(productId)
          request.onsuccess = () => {
            if (settled) return
            const product = request.result
            if (!product) {
              fail(new Error('A product in your cart is no longer available.'))
              return
            }
            if (product.stock < qty) {
              fail(new Error(`${product.name} only has ${product.stock} in stock.`))
              return
            }
            snapshots.push({
              productId: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              qty,
            })
            productsStore.put({ ...product, stock: product.stock - qty })
            processAt(index + 1)
          }
          request.onerror = () => fail(request.error)
        }

        processAt(0)

        tx.oncomplete = () => {
          if (settled) return
          settled = true
          resolve(tx._result)
        }
        tx.onabort = () => {
          if (settled) return
          settled = true
          reject(tx.error || new Error('Could not place the order.'))
        }
        tx.onerror = () => {
          if (settled) return
          settled = true
          reject(tx.error || new Error('Could not place the order.'))
        }
      }),
  )
}
