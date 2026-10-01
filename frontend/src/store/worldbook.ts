import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WbMount = 'always' | 'keyword' | 'disabled'
export type WbDepth = 'system' | 'user' | 'context'

export interface WbEntry {
  id: string
  name: string
  content: string
  keywords: string[]
  depth: WbDepth
  priority: number
  mount: WbMount
}

export interface WorldBook {
  id: string
  name: string
  category: string
  coverId: string | null
  enabled: boolean
  scope: 'global' | 'local'
  boundCharacterIds: string[]
  entries: WbEntry[]
}

export interface WbHitLogItem {
  time: number
  characterId: string
  bookId: string
  bookName: string
  entryNames: string[]
  estTokens: number
}

interface WorldbookState {
  books: WorldBook[]
  tokenBudget: number
  hitLogs: WbHitLogItem[]
  createBook: (name: string, category: string) => string
  updateBook: (id: string, patch: Partial<Omit<WorldBook, 'id' | 'entries'>>) => void
  removeBook: (id: string) => void
  duplicateBook: (id: string) => void
  addEntry: (bookId: string, e: Omit<WbEntry, 'id'>) => void
  updateEntry: (bookId: string, entryId: string, patch: Partial<Omit<WbEntry, 'id'>>) => void
  removeEntry: (bookId: string, entryId: string) => void
  duplicateEntry: (bookId: string, entryId: string) => void
  setTokenBudget: (n: number) => void
  pushHitLog: (log: WbHitLogItem) => void
  clearHitLogs: () => void
  importBook: (name: string, category: string, entries: Omit<WbEntry, 'id'>[]) => void
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

export const useWorldbook = create<WorldbookState>()(
  persist(
    (set, get) => ({
      books: [],
      tokenBudget: 2048,
      hitLogs: [],
      createBook: (name, category) => {
        const id = uid('wb')
        set((s) => ({ books: [...s.books, { id, name, category, coverId: null, enabled: true, scope: 'global', boundCharacterIds: [], entries: [] }] }))
        return id
      },
      updateBook: (id, patch) =>
        set((s) => ({ books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
      duplicateBook: (id) =>
        set((s) => {
          const src = s.books.find((b) => b.id === id)
          if (!src) return {}
          const copy: WorldBook = {
            ...src,
            id: uid('wb'),
            name: `${src.name} 副本`,
            entries: src.entries.map((e) => ({ ...e, id: uid('we') })),
          }
          return { books: [...s.books, copy] }
        }),
      addEntry: (bookId, e) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === bookId ? { ...b, entries: [...b.entries, { ...e, id: uid('we') }] } : b)),
        })),
      updateEntry: (bookId, entryId, patch) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === bookId ? { ...b, entries: b.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) } : b
          ),
        })),
      removeEntry: (bookId, entryId) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === bookId ? { ...b, entries: b.entries.filter((e) => e.id !== entryId) } : b)),
        })),
      duplicateEntry: (bookId, entryId) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b
            const src = b.entries.find((e) => e.id === entryId)
            if (!src) return b
            return { ...b, entries: [...b.entries, { ...src, id: uid('we'), name: `${src.name} 副本` }] }
          }),
        })),
      setTokenBudget: (n) => set({ tokenBudget: Math.max(0, Math.round(n)) }),
      pushHitLog: (log) => set((s) => ({ hitLogs: [log, ...s.hitLogs].slice(0, 50) })),
      clearHitLogs: () => set({ hitLogs: [] }),
      importBook: (name, category, entries) =>
        set((s) => ({
          books: [...s.books, { id: uid('wb'), name, category, coverId: null, enabled: true, scope: 'global', boundCharacterIds: [], entries: entries.map((e) => ({ ...e, id: uid('we') })) }],
        })),
    }),
    { name: 'ksc:worldbook' }
  )
)

export function booksForCharacter(characterId: string): WorldBook[] {
  return useWorldbook
    .getState()
    .books.filter((b) => b.enabled && (b.scope === 'global' || b.boundCharacterIds.includes(characterId)))
}

export const WB_CATEGORY_PRESETS = ['设定集', '世界观', '人物档案', '地点', '物品', '剧情', '文风', '记忆库']
