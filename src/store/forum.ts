import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCharacters } from './characters'

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

export type ForumDMMessageKind = 'text' | 'image' | 'sticker' | 'post' | 'voice' | 'file'

export interface ForumDMMessage {
  id: string
  from: 'user' | 'them'
  content: string
  imageId: string | null
  stickerId: string | null
  sharedPostId: string | null
  time: number
  /** 消息类型，旧数据可能缺失，可用 dmMessageKind 推导 */
  kind?: ForumDMMessageKind
  /** 对方发来的消息是否已读，默认未读 */
  read?: boolean
  /** 是否已撤回 */
  recalled?: boolean
  /** 语音时长（秒） */
  voiceDuration?: number
  /** 文件名 */
  fileName?: string
  /** 文件大小（字节） */
  fileSize?: number
}

export type ForumDMReceivePermission = 'all' | 'following' | 'none'

export interface ForumDM {
  id: string
  partner: ForumAuthor
  stranger: boolean
  messages: ForumDMMessage[]
  lastActive: number
  /** 是否置顶 */
  pinned?: boolean
  /** 是否已屏蔽 */
  blocked?: boolean
  /** 接收私信权限 */
  receivePermission?: ForumDMReceivePermission
  /** 是否已举报 */
  reported?: boolean
}

/** 推导消息类型（兼容没有 kind 字段的旧持久化数据） */
export function dmMessageKind(m: ForumDMMessage): ForumDMMessageKind {
  if (m.kind) return m.kind
  if (m.sharedPostId) return 'post'
  if (m.stickerId) return 'sticker'
  if (m.imageId) return 'image'
  return 'text'
}

/** 统计一条会话中未读的对方消息数量 */
export function dmUnreadCount(dm: ForumDM): number {
  return dm.messages.filter((m) => m.from === 'them' && !m.read && !m.recalled).length
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
  /** 把某条会话里对方发来的消息全部标为已读 */
  markDmRead: (dmId: string) => void
  /** 把某条会话里最后一条对方消息标为未读 */
  markDmUnread: (dmId: string) => void
  /** 撤回自己 2 分钟内发送的消息 */
  recallDmMessage: (dmId: string, msgId: string) => void
  /** 删除单条消息 */
  removeDmMessage: (dmId: string, msgId: string) => void
  /** 切换会话置顶 */
  togglePinDm: (dmId: string) => void
  /** 清空会话聊天记录 */
  clearDmMessages: (dmId: string) => void
  /** 设置会话屏蔽状态 */
  setDmBlocked: (dmId: string, v: boolean) => void
  /** 设置会话接收私信权限 */
  setDmReceivePermission: (dmId: string, v: ForumDMReceivePermission) => void
  /** 举报会话 */
  reportDm: (dmId: string) => void
  /** 转发一条消息到另一个会话 */
  forwardDmMessage: (fromDmId: string, msgId: string, toDmId: string) => void
  /** 首次进入时若私信列表为空，生成若干条起始会话，避免空空如也 */
  seedDmsIfEmpty: () => void
}

function uid(p: string): string {
  return `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

interface SeedLine {
  from: 'user' | 'them'
  content: string
  read?: boolean
}

interface SeedScript {
  stranger: boolean
  lines: SeedLine[]
}

/** 生成一条起始私信会话的剧本，按角色名与序号轮换不同话题 */
function seedScript(a: ForumAuthor, i: number): SeedScript {
  const n = a.name
  const scripts: SeedScript[] = [
    {
      stranger: false,
      lines: [
        { from: 'them', content: `嗨，我是${n}，刚在论坛刷到你的帖子，聊两句？`, read: false },
        { from: 'user', content: '好呀，欢迎欢迎～' },
        { from: 'them', content: '你平时都在哪个圈子玩呀？', read: false },
      ],
    },
    {
      stranger: false,
      lines: [
        { from: 'them', content: '在吗？上次那件事后来怎么样了', read: true },
        { from: 'user', content: '已经处理好啦，谢谢你惦记' },
        { from: 'them', content: '那就好，有事随时喊我', read: false },
      ],
    },
    {
      stranger: true,
      lines: [
        { from: 'them', content: `你好，我是${n}，冒昧打扰，可以交个朋友吗？`, read: false },
        { from: 'them', content: '感觉我们兴趣挺合拍的', read: false },
      ],
    },
    {
      stranger: false,
      lines: [
        { from: 'them', content: '晚上好，吃饭了吗？', read: false },
        { from: 'user', content: '刚吃完，你呢？' },
      ],
    },
  ]
  return scripts[i % scripts.length]
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
                  messages: [
                    ...d.messages,
                    {
                      ...msg,
                      id: uid('fdm'),
                      time: Date.now(),
                      // 对方发来的消息默认未读，自己发出的不受影响
                      read: msg.from === 'them' ? (msg.read ?? false) : msg.read,
                    },
                  ],
                  lastActive: Date.now(),
                }
              : d
          ),
        })),
      updateDm: (dmId, patch) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, ...patch } : d)) })),
      removeDm: (dmId) => set((s) => ({ dms: s.dms.filter((d) => d.id !== dmId) })),

      markDmRead: (dmId) =>
        set((s) => ({
          dms: s.dms.map((d) =>
            d.id === dmId
              ? { ...d, messages: d.messages.map((m) => (m.from === 'them' ? { ...m, read: true } : m)) }
              : d
          ),
        })),
      markDmUnread: (dmId) =>
        set((s) => ({
          dms: s.dms.map((d) => {
            if (d.id !== dmId) return d
            let idx = -1
            for (let i = d.messages.length - 1; i >= 0; i--) {
              if (d.messages[i].from === 'them' && !d.messages[i].recalled) {
                idx = i
                break
              }
            }
            if (idx < 0) return d
            return { ...d, messages: d.messages.map((m, i) => (i === idx ? { ...m, read: false } : m)) }
          }),
        })),
      recallDmMessage: (dmId, msgId) =>
        set((s) => ({
          dms: s.dms.map((d) =>
            d.id === dmId
              ? {
                  ...d,
                  messages: d.messages.map((m) =>
                    m.id === msgId && m.from === 'user' && Date.now() - m.time <= 120_000 ? { ...m, recalled: true } : m
                  ),
                }
              : d
          ),
        })),
      removeDmMessage: (dmId, msgId) =>
        set((s) => ({
          dms: s.dms.map((d) => (d.id === dmId ? { ...d, messages: d.messages.filter((m) => m.id !== msgId) } : d)),
        })),
      togglePinDm: (dmId) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, pinned: !d.pinned } : d)) })),
      clearDmMessages: (dmId) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, messages: [] } : d)) })),
      setDmBlocked: (dmId, v) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, blocked: v } : d)) })),
      setDmReceivePermission: (dmId, v) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, receivePermission: v } : d)) })),
      reportDm: (dmId) =>
        set((s) => ({ dms: s.dms.map((d) => (d.id === dmId ? { ...d, reported: true } : d)) })),
      forwardDmMessage: (fromDmId, msgId, toDmId) => {
        const src = get().dms.find((d) => d.id === fromDmId)
        const msg = src?.messages.find((m) => m.id === msgId)
        if (!msg) return
        get().addDmMessage(toDmId, {
          from: 'user',
          content: msg.content,
          imageId: msg.imageId,
          stickerId: msg.stickerId,
          sharedPostId: msg.sharedPostId,
          kind: dmMessageKind(msg),
          read: true,
          recalled: false,
          voiceDuration: msg.voiceDuration,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
        })
      },
      seedDmsIfEmpty: () => {
        if (get().dms.length > 0) return
        const chars = useCharacters.getState().characters
        const actors: ForumAuthor[] = []
        for (const c of chars.slice(0, 3)) {
          actors.push({ type: 'character', id: c.id, name: c.name, avatarId: c.avatarId })
        }
        for (const n of get().npcs) {
          if (actors.length >= 4) break
          actors.push({ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId })
        }
        // 可私信对象不足 3 位时，补几位论坛常客，保证至少 3 条起始会话，列表不为空
        const defaults: [string, string][] = [
          ['巷口的风', '爱在论坛闲逛的老网友，说话随和'],
          ['深夜便利店', '夜猫子，喜欢分享生活碎片'],
          ['热干面信徒', '吃货一枚，三句不离美食'],
        ]
        while (actors.length < 3) {
          const [name, persona] = defaults[actors.length % defaults.length]
          const id = get().addNpc({ name, avatarId: null, persona })
          actors.push({ type: 'npc', id, name, avatarId: null })
        }
        actors.slice(0, 4).forEach((a, i) => {
          const script = seedScript(a, i)
          const dmId = get().ensureDm(a, script.stranger)
          for (const line of script.lines) {
            get().addDmMessage(dmId, {
              from: line.from,
              content: line.content,
              imageId: null,
              stickerId: null,
              sharedPostId: null,
              kind: 'text',
              read: line.read,
            })
          }
          // addDmMessage 会把会话标记为好友，这里恢复陌生人状态
          if (script.stranger) get().updateDm(dmId, { stranger: true })
        })
      },
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
