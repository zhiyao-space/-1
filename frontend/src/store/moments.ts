import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MomentAuthor {
  type: 'user' | 'character'
  id: string
  name: string
}

export interface MomentComment {
  id: string
  author: MomentAuthor
  content: string
  replyToName: string | null
  time: number
}

export type MomentVisibility = 'all' | 'friends' | 'custom'

export interface Moment {
  id: string
  author: MomentAuthor
  content: string
  imageIds: string[]
  visibility: MomentVisibility
  visibleIds: string[]
  likes: string[]
  comments: MomentComment[]
  createdAt: number
}

interface MomentsState {
  moments: Moment[]
  publish: (m: Omit<Moment, 'id' | 'createdAt' | 'likes' | 'comments'>) => void
  addCharacterMoment: (m: Omit<Moment, 'id' | 'createdAt' | 'likes' | 'comments'>) => void
  removeMoment: (id: string) => void
  toggleLike: (id: string) => void
  addLike: (id: string, who: MomentAuthor) => void
  addComment: (id: string, comment: Omit<MomentComment, 'id' | 'time'>) => void
}

function uid(): string {
  return `mo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const useMoments = create<MomentsState>()(
  persist(
    (set) => ({
      moments: [],
      publish: (m) =>
        set((s) => ({ moments: [...s.moments, { ...m, id: uid(), createdAt: Date.now(), likes: [], comments: [] }] })),
      addCharacterMoment: (m) =>
        set((s) => ({ moments: [...s.moments, { ...m, id: uid(), createdAt: Date.now(), likes: [], comments: [] }] })),
      removeMoment: (id) => set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),
      toggleLike: (id) =>
        set((s) => ({
          moments: s.moments.map((m) => {
            if (m.id !== id) return m
            return {
              ...m,
              likes: m.likes.includes('user') ? m.likes.filter((x) => x !== 'user') : [...m.likes, 'user'],
            }
          }),
        })),
      addLike: (id, who) =>
        set((s) => ({
          moments: s.moments.map((m) => {
            if (m.id !== id || m.likes.includes(who.id)) return m
            return { ...m, likes: [...m.likes, who.id] }
          }),
        })),
      addComment: (id, comment) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === id ? { ...m, comments: [...m.comments, { ...comment, id: uid(), time: Date.now() }] } : m
          ),
        })),
    }),
    { name: 'ksc:moments' }
  )
)
