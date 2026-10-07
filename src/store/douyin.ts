import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  aiComment,
  aiInbox,
  aiVideos,
  authorKeyOf,
  buildSignals,
  dyAuthors,
  fallbackComment,
  localInboxContent,
  localVideos,
  liveTitleOf,
  makePasserbies,
  randomInboxType,
  styleOf,
  type DyAuthor,
  type DyBgm,
  type DyComment,
  type DyConversation,
  type DyGroup,
  type DyGroupMessage,
  type DyInboxItem,
  type DyInboxType,
  type DyProfile,
  type DyVideo,
  type DyVisibility,
  type DyVisitorRecord,
} from '../lib/douyinEngine'
import { useProfile } from './profile'
import { useSettings } from './settings'

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 当前用户作为创作者的身份（支持面具/小号多账号切换） */
export function userAuthor(): DyAuthor {
  const prof = useProfile.getState().profile
  const active = prof.masks.find((m) => m.active)
  if (active) {
    return {
      key: `mask:${active.id}`,
      kind: 'user',
      id: active.id,
      name: active.name.trim() || prof.nickname || useSettings.getState().phoneName || '我',
      avatarId: active.avatarId ?? prof.avatarId,
      persona: active.persona.trim() || '你是这个抖音账号的小号主人，日常刷视频、偶尔发作品。',
    }
  }
  return {
    key: 'user',
    kind: 'user',
    id: 'me',
    name: prof.nickname || useSettings.getState().phoneName || '我',
    avatarId: prof.avatarId,
    persona: '你是这个抖音账号的主人，一个普通用户，日常刷视频、偶尔发作品。',
  }
}

function defaultProfile(author: DyAuthor): DyProfile {
  const style = styleOf(author.persona)
  return {
    key: author.key,
    author,
    nickname: author.name,
    bio:
      author.kind === 'user'
        ? '记录一下，随手拍。'
        : style === 'academic'
          ? '把复杂的事讲简单。'
          : style === 'funny'
            ? '日常整活，欢迎来玩。'
            : style === 'beauty'
              ? '穿搭 | 美妆 | 一点小日常'
              : '谢谢你来过。',
    tags: author.kind === 'user' ? ['日常'] : [style === 'talent' ? '音乐' : style === 'dance' ? '舞蹈' : '生活'],
    avatarId: author.avatarId,
    bgImage: null,
    bgPrompt: `${author.name} 的主页背景，氛围感，柔光`,
    gender: author.kind === 'user' ? '不显示' : Math.random() < 0.5 ? '女' : '男',
    age: author.kind === 'user' ? '' : String(randInt(19, 29)),
    ip: pick(['上海', '北京', '杭州', '成都', '广州', '深圳', '重庆', '不显示']),
    privacy: {
      ipVisible: true,
      ipCustom: '',
      gender: '不显示',
      age: '',
      ageVisible: false,
      birthdayVisible: false,
      locationVisible: true,
    },
    theme: 'dark',
    filter: 'none',
    layers: [],
  }
}

interface DyState {
  videos: DyVideo[]
  /** 首页三档 Tab 各自的视频 id 流 */
  liked: string[]
  favorites: string[]
  follows: string[]
  /** 点了「不感兴趣」的视频，推荐权重降低 */
  disliked: string[]
  history: string[]
  comments: DyComment[]
  inbox: DyInboxItem[]
  conversations: DyConversation[]
  /** 群聊消息：groupId → 消息列表 */
  groupMessages: Record<string, DyGroupMessage[]>
  visitors: DyVisitorRecord[]
  passerbyPool: DyAuthor[]
  profiles: Record<string, DyProfile>
  coins: number
  /** 通知生成冷却（30 秒） */
  lastInboxGenAt: number
  /** 防重复：同角色同类型 & 已用过的文案 */
  recentInboxKeys: string[]
  recentInboxTexts: string[]
  generating: boolean

  ensurePool: () => DyAuthor[]
  refreshFeed: () => Promise<void>
  toggleLike: (id: string) => void
  toggleFavorite: (id: string) => void
  toggleFollow: (authorKey: string) => void
  hideVideo: (id: string) => void
  recordWatch: (id: string) => void
  ensureComments: (videoId: string) => Promise<void>
  addComment: (videoId: string, content: string) => void
  likeComment: (id: string) => void
  generateInbox: (count?: number) => Promise<number>
  markInboxRead: (id: string) => void
  markAllInboxRead: () => void
  deleteInbox: (id: string) => void
  /** 归档已读消息，返回归档条数 */
  archiveInbox: () => number
  followBack: (id: string) => void
  openGroup: (group: DyGroup) => void
  sendGroup: (group: DyGroup, content: string) => void
  openConversation: (peer: DyAuthor) => string
  sendDm: (peer: DyAuthor, content: string, imageId?: string | null) => void
  removeDm: (peerKey: string, msgId: string) => void
  receiveDm: (peer: DyAuthor, content: string) => void
  readConversation: (peerKey: string) => void
  visitProfile: (target: string, visitor: DyAuthor, source?: DyVisitorRecord['source']) => void
  ensureProfile: (author: DyAuthor) => DyProfile
  updateProfile: (key: string, patch: Partial<DyProfile>) => void
  setVideoCover: (id: string, url: string) => void
  publishVideo: (input: {
    description: string
    tags: string[]
    coverImageId: string | null
    bgm?: DyBgm
    location?: string
    filter?: string
    visibility?: DyVisibility
    mentions?: string[]
  }) => string
  addCoins: (n: number) => void
  spendCoins: (n: number) => boolean
  reset: () => void
}

export const useDouyin = create<DyState>()(
  persist(
    (set, get) => ({
      videos: [],
      liked: [],
      favorites: [],
      follows: [],
      disliked: [],
      history: [],
      comments: [],
      inbox: [],
      conversations: [],
      groupMessages: {},
      visitors: [],
      passerbyPool: [],
      profiles: {},
      coins: 2000,
      lastInboxGenAt: 0,
      recentInboxKeys: [],
      recentInboxTexts: [],
      generating: false,

      ensurePool: () => {
        const cur = get().passerbyPool
        if (cur.length >= 14) return cur
        const next = [...cur, ...makePasserbies(14 - cur.length)]
        set({ passerbyPool: next })
        return next
      },

      refreshFeed: async () => {
        if (get().generating) return
        set({ generating: true })
        const pool = get().ensurePool()
        const chars = dyAuthors()
        const authors = [...chars, ...pool]
        const avoid = get().videos.map((v) => v.description)
        // 按兴趣加权：关注的作者、以及点赞/收藏/观看偏好的作者被重复投放
        const signals = buildSignals(get().videos, {
          liked: get().liked,
          favorites: get().favorites,
          history: get().history,
          follows: get().follows,
          disliked: get().disliked,
        })
        const preferred = new Set<string>([
          ...signals.follows,
          ...Object.entries(signals.authorAffinity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k]) => k),
        ])
        const weighted = authors.flatMap((a) => (preferred.has(a.key) ? [a, a, a] : [a]))
        // 先本地出内容，保证立刻可见
        const local = localVideos(shuffle(weighted), 8, avoid)
        set((s) => ({
          videos: [...local, ...s.videos].slice(0, 40),
          generating: false,
        }))
        // 再尝试用 AI 生成几条更贴合人设的内容插到前面
        const ai = await aiVideos(chars.length ? chars : authors, 3, avoid)
        if (ai?.length) set((s) => ({ videos: [...ai, ...s.videos].slice(0, 40) }))
      },

      toggleLike: (id) =>
        set((s) => {
          const on = s.liked.includes(id)
          return {
            liked: on ? s.liked.filter((x) => x !== id) : [id, ...s.liked],
            videos: s.videos.map((v) =>
              v.id === id ? { ...v, stats: { ...v.stats, likes: v.stats.likes + (on ? -1 : 1) } } : v
            ),
          }
        }),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites],
        })),

      toggleFollow: (authorKey) =>
        set((s) => ({
          follows: s.follows.includes(authorKey) ? s.follows.filter((x) => x !== authorKey) : [authorKey, ...s.follows],
        })),

      hideVideo: (id) =>
        set((s) => ({ videos: s.videos.filter((v) => v.id !== id), disliked: [...s.disliked, id].slice(-80) })),

      recordWatch: (id) =>
        set((s) => (s.history[0] === id ? s : { history: [id, ...s.history.filter((x) => x !== id)].slice(0, 120) })),

      ensureComments: async (videoId) => {
        if (get().comments.some((c) => c.videoId === videoId)) return
        const video = get().videos.find((v) => v.id === videoId)
        if (!video) return
        const pool = [...dyAuthors(), ...get().ensurePool()]
        const commenters = shuffle(pool.filter((a) => a.key !== video.author.key)).slice(0, 4)
        const base: DyComment[] = commenters.map((a) => ({
          id: uid('cm'),
          videoId,
          author: a,
          content: fallbackComment(),
          likes: randInt(0, 520),
          createdAt: Date.now() - randInt(1, 40) * 60_000,
          replies: [],
        }))
        set((s) => ({ comments: [...s.comments, ...base] }))
        // AI 重写前两条评论，让它符合各自人设
        for (const cm of base.slice(0, 2)) {
          const text = await aiComment(video.description, cm.author, video.author.name)
          set((s) => ({ comments: s.comments.map((c) => (c.id === cm.id ? { ...c, content: text } : c)) }))
        }
      },

      addComment: (videoId, content) => {
        if (!content.trim()) return
        const cm: DyComment = {
          id: uid('cm'),
          videoId,
          author: userAuthor(),
          content: content.trim().slice(0, 80),
          likes: 0,
          createdAt: Date.now(),
          replies: [],
        }
        set((s) => ({
          comments: [cm, ...s.comments],
          videos: s.videos.map((v) =>
            v.id === videoId ? { ...v, stats: { ...v.stats, comments: v.stats.comments + 1 } } : v
          ),
        }))
      },

      likeComment: (id) =>
        set((s) => ({
          comments: s.comments.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)),
        })),

      generateInbox: async (count = randInt(1, 3)) => {
        const now = Date.now()
        if (now - get().lastInboxGenAt < 30_000) return 0
        const pool = get().ensurePool()
        const chars = dyAuthors()
        const myKey = userAuthor().key
        const myVideos = get().videos.filter((v) => v.author.key === myKey).map((v) => v.description)

        // 发送者来源权重：40% 主要 NPC / 45% 路人 / 15% 陌生用户
        const senders: DyAuthor[] = []
        for (let i = 0; i < count; i++) {
          const r = Math.random()
          if (r < 0.4 && chars.length > 0) senders.push(pick(chars))
          else if (r < 0.85) senders.push(pick(pool.filter((p) => p.passerbyTag !== '黑粉')))
          else senders.push({ ...pick(pool), passerbyTag: '陌生用户' })
        }
        const types: DyInboxType[] = []
        for (let i = 0; i < senders.length; i++) {
          let t = randomInboxType()
          // 防重复：同角色同类型不连续生成
          let guard = 0
          while (get().recentInboxKeys.includes(`${senders[i].key}:${t}`) && guard++ < 6) t = randomInboxType()
          types.push(t)
        }

        const ai = await aiInbox(senders, types, myVideos, get().recentInboxTexts)
        const items: DyInboxItem[] = []
        senders.forEach((sender, i) => {
          const type = types[i]
          const hit = ai?.find((r) => String(r.senderKey) === sender.key && r.type === type)
          const content = hit?.content
            ? String(hit.content).slice(0, 60)
            : localInboxContent(type, sender.name, myVideos[0] ?? '')
          items.push({
            id: uid('ib'),
            type,
            sender,
            content,
            createdAt: now - i * 1000,
            isRead: false,
            relatedVideoId: type === 'dm' ? undefined : pick(get().videos)?.id,
          })
        })

        set((s) => ({
          inbox: [...items, ...s.inbox].slice(0, 120),
          lastInboxGenAt: now,
          recentInboxKeys: [...items.map((i) => `${i.sender.key}:${i.type}`), ...s.recentInboxKeys].slice(0, 24),
          recentInboxTexts: [...items.map((i) => i.content), ...s.recentInboxTexts].slice(0, 40),
        }))
        return items.length
      },

      markInboxRead: (id) =>
        set((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, isRead: true } : i)) })),

      markAllInboxRead: () => set((s) => ({ inbox: s.inbox.map((i) => ({ ...i, isRead: true })) })),

      deleteInbox: (id) => set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) })),

      archiveInbox: () => {
        const n = get().inbox.filter((i) => i.isRead).length
        if (n > 0) set((s) => ({ inbox: s.inbox.filter((i) => !i.isRead) }))
        return n
      },

      openGroup: (group) => {
        if ((get().groupMessages[group.id] ?? []).length > 0) return
        const pool = group.members.filter((m) => m.key !== 'user')
        if (pool.length === 0) return
        const seed: DyGroupMessage[] = Array.from({ length: 3 }, (_, i) => ({
          id: uid('gm'),
          sender: pool[i % pool.length],
          content: fallbackComment(),
          createdAt: Date.now() - (3 - i) * 60_000,
        }))
        set((s) => ({ groupMessages: { ...s.groupMessages, [group.id]: seed } }))
      },

      sendGroup: (group, content) => {
        const text = content.trim()
        if (!text) return
        get().openGroup(group)
        const mine: DyGroupMessage = {
          id: uid('gm'),
          sender: userAuthor(),
          content: text.slice(0, 200),
          createdAt: Date.now(),
        }
        set((s) => ({
          groupMessages: { ...s.groupMessages, [group.id]: [...(s.groupMessages[group.id] ?? []), mine] },
        }))
        const pool = group.members.filter((m) => m.key !== 'user')
        if (pool.length === 0) return
        const responder = pick(pool)
        void (async () => {
          const reply = await aiComment(text, responder, userAuthor().name)
          const msg: DyGroupMessage = { id: uid('gm'), sender: responder, content: reply, createdAt: Date.now() }
          set((s) => ({
            groupMessages: { ...s.groupMessages, [group.id]: [...(s.groupMessages[group.id] ?? []), msg] },
          }))
        })()
      },

      followBack: (id) =>
        set((s) => {
          const item = s.inbox.find((i) => i.id === id)
          const key = item?.sender.key
          return {
            inbox: s.inbox.map((i) => (i.id === id ? { ...i, followedBack: true } : i)),
            follows: key && !s.follows.includes(key) ? [key, ...s.follows] : s.follows,
          }
        }),

      openConversation: (peer) => {
        const exist = get().conversations.find((c) => c.peer.key === peer.key)
        if (exist) return exist.id
        const id = uid('cv')
        const conv: DyConversation = { id, peer, messages: [], lastTime: Date.now(), unread: 0 }
        set((s) => ({ conversations: [conv, ...s.conversations] }))
        return id
      },

      sendDm: (peer, content, imageId = null) => {
        if (!content.trim() && !imageId) return
        const id = get().openConversation(peer)
        const msg = {
          id: uid('m'),
          fromMe: true,
          content: content.trim().slice(0, 200),
          createdAt: Date.now(),
          imageId,
        }
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, messages: [...c.messages, msg], lastTime: msg.createdAt } : c
          ),
        }))
        if (!content.trim()) return
        // 有 API 时让角色回一句
        void (async () => {
          const text = await aiComment(content, peer, userAuthor().name)
          get().receiveDm(peer, text)
        })()
      },

      removeDm: (peerKey, msgId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.peer.key === peerKey ? { ...c, messages: c.messages.filter((m) => m.id !== msgId) } : c
          ),
        })),

      receiveDm: (peer, content) => {
        const id = get().openConversation(peer)
        const msg = { id: uid('m'), fromMe: false, content, createdAt: Date.now() }
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, messages: [...c.messages, msg], lastTime: msg.createdAt, unread: c.unread + 1 } : c
          ),
        }))
      },

      readConversation: (peerKey) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.peer.key === peerKey ? { ...c, unread: 0 } : c)),
        })),

      visitProfile: (target, visitor, source = 'recommend') =>
        set((s) => ({
          visitors: [
            { id: uid('vs'), visitor, target, at: Date.now(), source },
            ...s.visitors,
          ].slice(0, 200),
        })),

      ensureProfile: (author) => {
        const cur = get().profiles[author.key]
        if (cur) return cur
        const p = defaultProfile(author)
        set((s) => ({ profiles: { ...s.profiles, [author.key]: p } }))
        return p
      },

      updateProfile: (key, patch) =>
        set((s) => {
          const cur = s.profiles[key]
          if (!cur) return s
          return { profiles: { ...s.profiles, [key]: { ...cur, ...patch } } }
        }),

      setVideoCover: (id, url) =>
        set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, coverImage: url } : v)) })),

      publishVideo: ({ description, tags, coverImageId, bgm, location, filter, visibility, mentions }) => {
        const author = userAuthor()
        const v: DyVideo = {
          id: uid('v'),
          author,
          coverPrompt: description,
          coverImage: coverImageId,
          description: description.trim().slice(0, 80) || '新作品',
          tags: tags.slice(0, 4),
          bgm: bgm ?? { title: '原声', artist: author.name },
          duration: 15,
          createdAt: Date.now(),
          stats: { likes: 0, comments: 0, shares: 0, views: 0 },
          location: location && location !== '不显示' ? location : '',
          style: styleOf(author.persona),
          filter: filter && filter !== 'none' ? filter : undefined,
          visibility: visibility ?? 'public',
          mentions: mentions?.length ? mentions : undefined,
        }
        set((s) => ({ videos: [v, ...s.videos] }))
        return v.id
      },

      addCoins: (n) => set((s) => ({ coins: s.coins + n })),

      spendCoins: (n) => {
        if (get().coins < n) return false
        set((s) => ({ coins: s.coins - n }))
        return true
      },

      reset: () =>
        set({
          videos: [],
          liked: [],
          favorites: [],
          follows: [],
          disliked: [],
          history: [],
          comments: [],
          inbox: [],
          conversations: [],
          visitors: [],
          profiles: {},
          coins: 2000,
          lastInboxGenAt: 0,
          recentInboxKeys: [],
          recentInboxTexts: [],
        }),
    }),
    { name: 'ksc:douyin' }
  )
)

/** 未读数：消息 Tab 红点用 */
export function useDyUnread(): number {
  return useDouyin(
    (s) => s.inbox.filter((i) => !i.isRead).length + s.conversations.reduce((n, c) => n + c.unread, 0)
  )
}

export { authorKeyOf, liveTitleOf }