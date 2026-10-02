import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MomentAuthor {
  type: 'user' | 'character' | 'npc'
  id: string
  name: string
}

export interface MomentComment {
  id: string
  author: MomentAuthor
  content: string
  parentId: string | null
  replyToName: string | null
  time: number
}

export type MomentVisibility = 'all' | 'friends' | 'custom'

export interface MomentMusic {
  title: string
  artist: string
}

export interface MomentVisitor {
  type: 'character'
  id: string
  name: string
  time: number
}

export interface Moment {
  id: string
  author: MomentAuthor
  content: string
  imageIds: string[]
  visibility: MomentVisibility
  visibleIds: string[]
  likes: string[]
  comments: MomentComment[]
  music: MomentMusic | null
  edited: boolean
  visitors: MomentVisitor[]
  createdAt: number
}

export type MomentDraft = Omit<
  Moment,
  'id' | 'createdAt' | 'likes' | 'comments' | 'edited' | 'visitors'
>

interface MomentsState {
  moments: Moment[]
  jumpTo: string | null
  publish: (m: MomentDraft) => void
  addCharacterMoment: (m: MomentDraft) => void
  removeMoment: (id: string) => void
  editMoment: (id: string, content: string) => void
  toggleLike: (id: string) => void
  addLike: (id: string, who: MomentAuthor) => void
  addComment: (id: string, comment: Omit<MomentComment, 'id' | 'time'>) => void
  removeComment: (momentId: string, commentId: string) => void
  recordVisitor: (id: string, visitor: MomentVisitor) => void
  setJumpTo: (id: string | null) => void
}

function uid(): string {
  return `mo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// authorKey：用户 'user'，角色为角色 id（兼容存量数据），NPC 为 'npc:<id>'
export function authorKey(a: MomentAuthor): string {
  if (a.type === 'user') return 'user'
  if (a.type === 'npc') return `npc:${a.id}`
  return a.id
}

// 存量数据补齐新字段（music/edited/visitors/comment.parentId）
function normalizeMoment(raw: unknown): Moment {
  const m = raw as Partial<Moment> & { comments?: Partial<MomentComment>[] }
  return {
    ...(m as Moment),
    music: m.music ?? null,
    edited: !!m.edited,
    visitors: Array.isArray(m.visitors) ? m.visitors : [],
    comments: (m.comments ?? []).map((c) => ({ ...(c as MomentComment), parentId: c.parentId ?? null })),
  }
}

export const useMoments = create<MomentsState>()(
  persist(
    (set) => ({
      moments: [],
      jumpTo: null,
      publish: (m) =>
        set((s) => ({
          moments: [
            ...s.moments,
            { ...m, id: uid(), createdAt: Date.now(), likes: [], comments: [], edited: false, visitors: [] },
          ],
        })),
      addCharacterMoment: (m) =>
        set((s) => ({
          moments: [
            ...s.moments,
            { ...m, id: uid(), createdAt: Date.now(), likes: [], comments: [], edited: false, visitors: [] },
          ],
        })),
      removeMoment: (id) => set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),
      editMoment: (id, content) =>
        set((s) => ({
          moments: s.moments.map((m) => (m.id === id ? { ...m, content, edited: true } : m)),
        })),
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
            if (m.id !== id) return m
            const key = authorKey(who)
            if (m.likes.includes(key)) return m
            return { ...m, likes: [...m.likes, key] }
          }),
        })),
      addComment: (id, comment) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === id ? { ...m, comments: [...m.comments, { ...comment, id: uid(), time: Date.now() }] } : m
          ),
        })),
      removeComment: (momentId, commentId) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  comments: m.comments.filter(
                    (c) => c.id !== commentId && c.parentId !== commentId
                  ),
                }
              : m
          ),
        })),
      recordVisitor: (id, visitor) =>
        set((s) => ({
          moments: s.moments.map((m) => {
            if (m.id !== id) return m
            if (m.visitors.some((v) => v.id === visitor.id)) return m
            return { ...m, visitors: [visitor, ...m.visitors].slice(0, 20) }
          }),
        })),
      setJumpTo: (id) => set({ jumpTo: id }),
    }),
    {
      name: 'ksc:moments',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MomentsState>
        return {
          ...current,
          ...p,
          moments: (p.moments ?? []).map(normalizeMoment),
        }
      },
    }
  )
)
