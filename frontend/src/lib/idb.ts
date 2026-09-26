const DB_NAME = 'kongshiji-db'
const STORE = 'blobs'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

export async function putBlob(blob: Blob, id?: string): Promise<string> {
  const key = id ?? genId()
  await tx('readwrite', (store) => store.put(blob, key))
  return key
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>('readonly', (store) => store.get(id))
}

export async function deleteBlob(id: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(id))
}

const urlCache = new Map<string, string>()

export async function getBlobURL(id: string): Promise<string | undefined> {
  if (urlCache.has(id)) return urlCache.get(id)
  const blob = await getBlob(id)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  urlCache.set(id, url)
  return url
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
