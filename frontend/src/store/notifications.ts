import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppId } from './ui'

export interface NotificationTarget {
  app: AppId
  payload?: { kind: 'single'; characterId: string } | { kind: 'group'; groupId: string } | { view: 'post' | 'dm' | 'circle' | 'profile'; id: string }
}

export type NotificationKind =
  | 'forum-comment'
  | 'forum-like'
  | 'forum-fav'
  | 'forum-share'
  | 'forum-follow'
  | 'forum-pin'
  | 'forum-essence'
  | 'forum-post'
  | 'dm'
  | 'chat'
  | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  target: NotificationTarget
  time: number
  read: boolean
}

interface NotificationState {
  items: AppNotification[]
  push: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

let seq = 0

export const useNotifications = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      push: (n) => {
        seq += 1
        const item: AppNotification = { ...n, id: `nt${Date.now().toString(36)}${seq}`, time: Date.now(), read: false }
        set((s) => ({ items: [item, ...s.items].slice(0, 80) }))
      },
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clearAll: () => set({ items: [] }),
    }),
    { name: 'ksc:notifications' }
  )
)
