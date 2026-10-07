const PREFIX = 'ksc:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('storage save failed', key, e)
  }
}

export function remove(key: string): void {
  localStorage.removeItem(PREFIX + key)
}
