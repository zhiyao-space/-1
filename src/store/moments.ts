import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MomentAuthorType = 'user' | 'character' | 'npc'

export interface MomentAuthor {
  type: MomentAuthorType
  id: string
  name: string
}

export interface MomentComment {
  id: string
  author: MomentAuthor
  content: string
  /** 楼中楼：父评论 id，null 表示一级评论 */
  parentId: string | null
  /** 展示用：回复对象昵称 */
  replyToName: string | null
  likes: string[]
  createdAt: number
}

export interface MomentMusic {
  title: string
  artist: string
  coverId: string | null
}

export interface MomentVisitor {
  key: string
  name: string
  time: number
}

export type MomentVisibility = 'all' | 'private' | 'custom'
export type MomentRange = 'all' | 'halfYear' | 'month' | 'threeDays'

export interface Moment {
  id: string
  author: MomentAuthor
  content: string
  imageIds: string[]
  location: string
  visibility: MomentVisibility
  visibleIds: string[]
  /** 点赞者键：'user' | 'character:<id>' | 'npc:<id>' */
  likes: string[]
  comments: MomentComment[]
  music: MomentMusic | null
  /** 转发来源（原创为 null） */
  repostOf: { momentId: string; authorName: string } | null
  edited: boolean
  visitors: MomentVisitor[]
  createdAt: number
}

export interface MomentSettings {
  coverId: string | null
  wechatId: string
  range: MomentRange
  /** 陌生人可看最近十条 */
  strangerTen: boolean
  /** 不让他看：这些角色看不到我的朋友圈 */
  hideFromIds: string[]
  /** 不看他：这些角色的朋友圈我不看 */
  hideIds: string[]
}

interface MomentsState {
  moments: Moment[]
  settings: MomentSettings
  /** 未读的点赞/评论/访客人次，打开朋友圈后清零 */
  unread: number
  /** 待定位的动态 id（从聊天卡片/通知跳转） */
  pendingJumpId: string | null

  addMoment: (
    m: Omit<Moment, 'id' | 'createdAt' | 'likes' | 'comments' | 'edited' | 'visitors' | 'repostOf'> &
      Partial<Pick<Moment, 'createdAt' | 'repostOf'>>
  ) => string
  updateMoment: (id: string, patch: Partial<Moment>) => void
  removeMoment: (id: string) => void
  toggleLike: (id: string, key: string) => void
  addComment: (momentId: string, c: Omit<MomentComment, 'id' | 'createdAt' | 'likes'>) => void
  removeComment: (momentId: string, commentId: string) => void
  toggleCommentLike: (momentId: string, commentId: string, key: string) => void
  recordVisitor: (momentId: string, visitor: MomentVisitor) => void
  updateSettings: (patch: Partial<MomentSettings>) => void
  bumpUnread: (n?: number) => void
  markSeen: () => void
  setPendingJump: (id: string | null) => void
}

export const emptyMomentSettings: MomentSettings = {
  coverId: null,
  wechatId: '',
  range: 'all',
  strangerTen: true,
  hideFromIds: [],
  hideIds: [],
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

export function momentAuthorKey(a: MomentAuthor): string {
  return a.type === 'user' ? 'user' : `${a.type}:${a.id}`
}

/** 相对时间：刚刚 / n分钟前 / n小时前 / n天前 / 日期 */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export const useMoments = create<MomentsState>()(
  persist(
    (set) => ({
      moments: [],
      settings: emptyMomentSettings,
      unread: 0,
      pendingJumpId: null,

      addMoment: (m) => {
        const id = uid('mo')
        const moment: Moment = {
          ...m,
          id,
          createdAt: m.createdAt ?? Date.now(),
          likes: [],
          comments: [],
          repostOf: m.repostOf ?? null,
          edited: false,
          visitors: [],
        }
        set((s) => ({ moments: [moment, ...s.moments] }))
        return id
      },
      updateMoment: (id, patch) =>
        set((s) => ({ moments: s.moments.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMoment: (id) => set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),

      toggleLike: (id, key) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === id
              ? {
                  ...m,
                  likes: m.likes.includes(key) ? m.likes.filter((k) => k !== key) : [...m.likes, key],
                }
              : m
          ),
        })),

      addComment: (momentId, c) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  comments: [
                    ...m.comments,
                    { ...c, id: uid('mc'), createdAt: Date.now(), likes: [] },
                  ],
                }
              : m
          ),
        })),
      removeComment: (momentId, commentId) =>
        set((s) => ({
          moments: s.moments.map((m) => {
            if (m.id !== momentId) return m
            // 级联删除其楼中楼
            const children = m.comments.filter((c) => c.parentId === commentId).map((c) => c.id)
            const doomed = new Set([commentId, ...children])
            return { ...m, comments: m.comments.filter((c) => !doomed.has(c.id)) }
          }),
        })),
      toggleCommentLike: (momentId, commentId, key) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  comments: m.comments.map((c) =>
                    c.id === commentId
                      ? { ...c, likes: c.likes.includes(key) ? c.likes.filter((k) => k !== key) : [...c.likes, key] }
                      : c
                  ),
                }
              : m
          ),
        })),

      recordVisitor: (momentId, visitor) =>
        set((s) => ({
          moments: s.moments.map((m) =>
            m.id === momentId
              ? { ...m, visitors: [...m.visitors.filter((v) => v.key !== visitor.key), visitor].slice(-20) }
              : m
          ),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      bumpUnread: (n = 1) => set((s) => ({ unread: s.unread + n })),
      markSeen: () => set({ unread: 0 }),
      setPendingJump: (id) => set({ pendingJumpId: id }),
    }),
    {
      name: 'ksc:moments',
      migrate: (persisted) => {
        const s = persisted as Partial<MomentsState>
        return {
          ...s,
          settings: { ...emptyMomentSettings, ...s.settings },
          moments: (s.moments ?? []).map((m) => ({
            ...m,
            music: m.music ?? null,
            repostOf: m.repostOf ?? null,
            edited: m.edited ?? false,
            visitors: m.visitors ?? [],
            comments: (m.comments ?? []).map((c) => ({ ...c, likes: c.likes ?? [] })),
          })),
        } as MomentsState
      },
    }
  )
)