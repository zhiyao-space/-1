import { create } from 'zustand'

export type AppId =
  | 'settings'
  | 'chat'
  | 'forum'
  | 'music'

export interface PendingForum {
  view: 'post' | 'dm' | 'circle' | 'profile'
  id: string
}

interface UIState {
  screen: 'lock' | 'desktop'
  activeApp: AppId | null
  banner: { characterId: string; characterName: string; text: string } | null
  pendingChat: { kind: 'single'; characterId: string } | { kind: 'group'; groupId: string } | null
  pendingForum: PendingForum | null
  unlock: () => void
  lock: () => void
  openApp: (id: AppId) => void
  closeApp: () => void
  setBanner: (b: UIState['banner']) => void
  setPendingChat: (p: UIState['pendingChat']) => void
  setPendingForum: (p: PendingForum | null) => void
}

export const useUI = create<UIState>((set) => ({
  screen: 'lock',
  activeApp: null,
  banner: null,
  pendingChat: null,
  pendingForum: null,
  unlock: () => set({ screen: 'desktop' }),
  lock: () => set({ screen: 'lock', activeApp: null }),
  openApp: (id) => set({ activeApp: id }),
  closeApp: () => set({ activeApp: null }),
  setBanner: (banner) => set({ banner }),
  setPendingChat: (pendingChat) => set({ pendingChat }),
  setPendingForum: (pendingForum) => set({ pendingForum }),
}))

export interface ToastItem {
  id: number
  text: string
  kind: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: ToastItem[]
  push: (text: string, kind?: ToastItem['kind']) => void
  dismiss: (id: number) => void
}

let toastSeq = 0

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = 'success') => {
    toastSeq += 1
    const id = toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
