import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuthorType = 'user' | 'character' | 'npc' | 'alias'

export interface ForumAuthor {
  type: AuthorType
  id: string
  name: string
  avatarId: string | null
}

export function userAuthor(name: string): ForumAuthor {
  return { type: 'user', id: 'user', name, avatarId: null }
}

export interface ForumNPC {
  id: string
  name: string
  avatarId: string | null
  persona: string
  familiarity: number
  createdAt: number
}

export interface ForumAlias {
  id: string
  name: string
}

export interface ForumCircle {
  id: string
  name: string
  description: string
  coverId: string | null
  isPrivate: boolean
  rules: string
  ownerId: string
  memberCharacterIds: string[]
  memberNpcIds: string[]
  userJoined: boolean
  createdAt: number
}

export interface PollData {
  options: string[]
  multi: boolean
  deadline: number | null
  votes: Record<string, number[]>
}

export interface RelayPart {
  authorKey: string
  authorName: string
  text: string
  time: number
}

export interface RelayData {
  rules: string
  target: number
  parts: RelayPart[]
}

export interface FanficMeta {
  outline: string
  cp: string
  words: string
  style: string
  ending: string
}

export type PlayStyle = 'normal' | 'twitter' | 'insta' | 'fanfic' | 'event' | 'rule'

export interface ForumComment {
  id: string
  postId: string
  parentId: string | null
  author: ForumAuthor
  content: string
  upvotes: number
  downvotes: number
  myVote: 0 | 1 | -1
  essence: boolean
  createdAt: number
}

export interface ForumPost {
  id: string
  circleId: string
  author: ForumAuthor
  title: string
  content: string
  imageIds: string[]
  imageDesc: string
  tags: string[]
  playStyle: PlayStyle
  threadParts: string[]
  quoteOf: string | null
  fanficMeta: FanficMeta | null
  type: 'text' | 'image' | 'poll' | 'relay'
  poll: PollData | null
  relay: RelayData | null
  anonymous: boolean
  upvotes: number
  downvotes: number
  myVote: 0 | 1 | -1
  favorites: number
  myFavorite: boolean
  shares: number
  views: number
  pinned: boolean
  essence: boolean
  locked: boolean
  createdAt: number
}

export interface ForumDMMessage {
  id: string
  from: 'user' | 'them'
  content: string
  imageId: string | null
  stickerId: string | null
  sharedPostId: string | null
  time: number
}

export interface ForumDM {
  id: string
  partner: ForumAuthor
  stranger: boolean
  messages: ForumDMMessage[]
  lastActive: number
}

export interface ForumProfile {
  username: string
  signature: string
  bannerId: string | null
  avatarId: string | null
}

interface ForumState {
  circles: ForumCircle[]
  posts: ForumPost[]
  comments: ForumComment[]
  dms: ForumDM[]
  npcs: ForumNPC[]
  aliases: ForumAlias[]
  activeAliasId: string | null
  profile: ForumProfile
  following: string[]
  followers: string[]
  karma: { post: number; comment: number }
  blockedNpcIds: string[]

  createCircle: (c: Omit<ForumCircle, 'id' | 'createdAt'>) => string
  updateCircle: (id: string, patch: Partial<ForumCircle>) => void
  removeCircle: (id: string) => void
  toggleJoinCircle: (id: string) => void

  addPost: (p: Omit<ForumPost, 'id' | 'createdAt' | 'upvotes' | 'downvotes' | 'myVote' | 'favorites' | 'myFavorite' | 'shares' | 'views' | 'pinned' | 'essence' | 'locked'>) => ForumPost
  updatePost: (id: string, patch: Partial<ForumPost>) => void
  removePost: (id: string) => void
  votePost: (id: string, v: 1 | -1) => void
  favoritePost: (id: string) => void
  sharePost: (id: string) => void

  addComment: (c: Omit<ForumComment, 'id' | 'createdAt' | 'upvotes' | 'downvotes' | 'myVote' | 'essence'>) => ForumComment
  updateComment: (id: string, patch: Partial<ForumComment>) => void
  removeComment: (id: string) => void
  voteComment: (id: string, v: 1 | -1) => void
  bumpKarma: (kind: 'post' | 'comment', delta: number) => void

  addNpc: (n: Omit<ForumNPC, 'id' | 'createdAt' | 'familiarity'>) => string
  updateNpc: (id: string, patch: Partial<ForumNPC>) => void
  removeNpc: (id: string) => void
  toggleBlockNpc: (id: string) => void

  addAlias: (name: string) => void
  removeAlias: (id: string) => void
  setActiveAlias: (id: string | null) => void

  updateProfile: (patch: Partial<ForumProfile>) => void
  toggleFollow: (id: string) => void
  addFollower: (id: string) => void

  ensureDm: (partner: ForumAuthor, stranger: boolean) => string
  addDmMessage: (dmId: string, msg: Omit<ForumDMMessage, 'id' | 'time'>) => void
  updateDm: (dmId: string, patch: Partial<ForumDM>) => void
  removeDm: (dmId: string) => void
}

function uid(p: string): string {
  return `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const useForum = create<ForumState>()(
  persist(
    (set, get) => ({
      circles: [],
      posts: [],
      comments: [],
      dms: [],
      npcs: [],
      aliases: [],
      activeAliasId: null,
      profile: { username: '', signature: '', bannerId: null, avatarId: null },
      following: [],
      followers: [],
      karma: { post: 0, comment: 0 },
      blockedNpcIds: [],

      createCircle: (c) => {
        const id = uid('fc')
        set((s) => ({ circles: [...s.circles, { ...c, id, createdAt: Date.now() }] }))
        return id
      },
      updateCircle: (id, patch) =>
        set((s) => ({ circles: s.circles.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCircle: (id) =>
        set((s) => ({
          circles: s.circles.filter((c) => c.id !== id),
          posts: s.posts.filter((p) => p.circleId !== id),
        })),
      toggleJoinCircle: (id) =>
        set((s) => ({
          circles: s.circles.map((c) => (c.id === id ? { ...c, userJoined: !c.userJoined } : c)),
        })),

      addPost: (p) => {
        const post: ForumPost = {
          ...p,
          id: uid('fp'),
          createdAt: Date.now(),
          upvotes: 0,
          downvotes: 0,
          myVote: 0,
          favorites: 0,
          myFavorite: false,
          shares: 0,
          views: 0,
          pinned: false,
          essence: false,
          locked: false,
        }
        set((s) => ({ posts: [...s.posts, post] }))
        return post
      },
      updatePost: (id, patch) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePost: (id) =>
        set((s) => ({
          posts: s.posts.filter((p) => p.id !== id),
          comments: s.comments.filter((c) => c.postId !== id),
        })),
      votePost: (id, v) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p
            if (p.myVote === v) return { ...p, [v === 1 ? 'upvotes' : 'downvotes']: Math.max(0, p[v === 1 ? 'upvotes' : 'downvotes'] - 1), myVote: 0 as const }
            const up = p.upvotes - (p.myVote === 1 ? 1 : 0) + (v === 1 ? 1 : 0)
            const down = p.downvotes - (p.myVote === -1 ? 1 : 0) + (v === -1 ? 1 : 0)
            return { ...p, upvotes: Math.max(0, up), downvotes: Math.max(0, down), myVote: v }
          }),
        })),
      favoritePost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, myFavorite: !p.myFavorite, favorites: p.favorites + (p.myFavorite ? -1 : 1) } : p
          ),
        })),
      sharePost: (id) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, shares: p.shares + 1 } : p)) })),

      addComment: (c) => {
        const comment: ForumComment = { ...c, id: uid('fm'), createdAt: Date.now(), upvotes: 0, downvotes: 0, myVote: 0, essence: false }
        set((s) => ({ comments: [...s.comments, comment] }))
        return comment
      },
      updateComment: (id, patch) =>
        set((s) => ({ comments: s.comments.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
      voteComment: (id, v) =>
        set((s) => ({
          comments: s.comments.map((c) => {
            if (c.id !== id) return c
            if (c.myVote === v) return { ...c, [v === 1 ? 'upvotes' : 'downvotes']: Math.max(0, c[v === 1 ? 'upvotes' : 'downvotes'] - 1), myVote: 0 as const }
            const up = c.upvotes - (c.myVote === 1 ? 1 : 0) + (v === 1 ? 1 : 0)
            const down = c.downvotes - (c.myVote === -1 ? 1 : 0) + (v === -1 ? 1 : 0)
            return { ...c, upvotes: Math.max(0, up), downvotes: Math.max(0, down), myVote: v }
          }),
        })),
      bumpKarma: (kind, delta) =>
        set((s) => ({ karma: { ...s.karma, [kind]: Math.max(0, s.karma[kind] + delta) } })),

      addNpc: (n) => {
        const id = uid('npc')
        set((s) => ({ npcs: [...s.npcs, { ...n, id, createdAt: Date.now(), familiarity: 0 }] }))
        return id
      },
      updateNpc: (id, patch) =>
        set((s) => ({ npcs: s.npcs.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      removeNpc: (id) =>
        set((s) => ({
          npcs: s.npcs.filter((n) => n.id !== id),
          circles: s.circles.map((c) => ({ ...c, memberNpcIds: c.memberNpcIds.filter((x) => x !== id) })),
        })),
      toggleBlockNpc: (id) =>
        set((s) => ({
          blockedNpcIds: s.blockedNpcIds.includes(id)
            ? s.blockedNpcIds.filter((x) => x !== id)
            : [...s.blockedNpcIds, id],
        })),

      addAlias: (name) =>
        set((s) => ({ aliases: [...s.aliases, { id: uid('al'), name: name.trim() || `马甲${s.aliases.length + 1}` }] })),
      removeAlias: (id) =>
        set((s) => ({
          aliases: s.aliases.filter((a) => a.id !== id),
          activeAliasId: s.activeAliasId === id ? null : s.activeAliasId,
        })),
      setActiveAlias: (id) => set({ activeAliasId: id }),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      toggleFollow: (id) =>
        set((s) => ({
          following: s.following.includes(id) ? s.following.filter((x) => x !== id) : [...s.following, id],
        })),
      addFollower: (id) =>
        set((s) => ({ followers: s.followers.includes(id) ? s.followers : [...s.followers, id] })),

      ensureDm: (partner, stranger) => {
        const existing = get().dms.find(
          (d) => d.partner.id === partner.id && d.partner.type === partner.type
        )
        if (existing) {
          if (existing.stranger && !stranger) get().updateDm(existing.id, { stranger: false })
          return existing.id
        }
        const id = uid('dm')
        set((s) => ({
          dms: [...s.dms, { id, partner, stranger, messages: [], lastActive: Date.now() }],
        }))
        return id
      },
      addDmMessage: (dmId, msg) =>
        set((s) => ({
          dms: s.dms.map((d) =>
            d.id === dmId
              ? {
                  ...d,
                  stranger: false,
                  messages: [...d.messages, { ...msg, id: uid('fdm'), time: Date.now() }],
                  lastActive: Date.now(),
                }
              : d
          ),
        })),
      updateDm: (dmId, patch) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, ...patch } : d)) })),
      removeDm: (dmId) => set((s) => ({ dms: s.dms.filter((d) => d.id !== dmId) })),
    }),
    { name: 'ksc:forum', migrate: (persisted) => {
      const s = persisted as Partial<ForumState>
      return {
        ...s,
        profile: { username: '', signature: '', bannerId: null, avatarId: null, ...s.profile },
      } as ForumState
    } }
  )
)

export const PLAY_STYLE_LABEL: Record<PlayStyle, string> = {
  normal: '普通帖',
  twitter: 'Twitter 体短帖',
  insta: 'Instagram 视觉帖',
  fanfic: '同人文',
  event: '沉浸式推演',
  rule: '规则怪谈',
}

export function heatOf(p: ForumPost, commentCount: number): number {
  const ageHours = (Date.now() - p.createdAt) / 3600_000
  const decay = 1 / (1 + ageHours / 12)
  return Math.round((p.upvotes * 3 + commentCount * 2 + p.favorites + p.shares + p.views * 0.1) * decay)
}

export function authorKey(a: ForumAuthor): string {
  return `${a.type}:${a.id}`
}
