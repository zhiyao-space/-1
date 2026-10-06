import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ============================================================
   「mu社区恋爱交友软件」数据层
   纯前端模拟恋爱社交：档案 / 角色 / 消息 / 匹配 / 动态 / 圈子 / 情侣空间
   全部 localStorage 持久化（ksc:social）
   ============================================================ */

export type OnlineStatus = 'online' | 'busy' | 'offline'
export type Relationship = 'stranger' | 'friend' | 'crush' | 'couple'
export type MsgType = 'text' | 'image' | 'voice' | 'gift' | 'location'
export type PostVisibility = 'public' | 'friends'

export const ME = 'me'

export interface SocialProfile {
  id: string
  nickname: string
  /** 从相册导入的头像（IndexedDB 图片 id） */
  avatarId?: string
  bio: string
  tags: string[]
  interests: string[]
  skills: string[]
  zodiac: string
  mbti: string
  createdAt: number
  onlineStatus: OnlineStatus
}

export interface SocialCharacter {
  id: string
  nickname: string
  /** 从相册导入的头像（IndexedDB 图片 id） */
  avatarId?: string
  bio: string
  personality: string[]
  skills: string[]
  interests: string[]
  zodiac: string
  mbti: string
  onlineStatus: OnlineStatus
  affinity: number
  relationship: Relationship
  lastActive: number
  metAt: number
  /** 主动来信开关：开启后角色会根据你的动态主动发消息 */
  proactive: boolean
  /** 暂离 */
  muted: boolean
  /** 拉黑 */
  blocked: boolean
  /** 会话置顶 */
  pinned: boolean
  /** 备注名：设置后在会话/资料中优先显示 */
  remark?: string
  /** 已互通到「聊天」模块时，记录对应的聊天角色 id */
  linkedCharacterId?: string
}

export interface SocialMessage {
  id: string
  senderId: string
  text: string
  type: MsgType
  timestamp: number
  read: boolean
  recalled: boolean
  favorited: boolean
  meta?: { gift?: string; place?: string }
}

export interface SocialComment {
  id: string
  authorId: string
  text: string
  timestamp: number
}

export interface SocialPost {
  id: string
  authorId: string
  content: string
  images: string[]
  likes: string[]
  comments: SocialComment[]
  timestamp: number
  visibility: PostVisibility
  /** 所属圈子（社区动态用），为空表示个人动态 */
  circle?: string
}

export interface SocialMatch {
  charId: string
  matchScore: number
  reason: string
  timestamp: number
}

export interface SocialCircle {
  id: string
  name: string
  description: string
}

export interface CoupleDiary {
  id: string
  text: string
  timestamp: number
}
export interface CoupleMilestone {
  id: string
  title: string
  timestamp: number
}
export interface CoupleWish {
  id: string
  text: string
  done: boolean
}
export interface CoupleSpace {
  charId: string | null
  sharedDiary: CoupleDiary[]
  sharedPhotos: string[]
  milestones: CoupleMilestone[]
  wishes: CoupleWish[]
  since: number
}

interface SocialSettings {
  notify: boolean
  theme: 'dark' | 'light'
}

interface SocialState {
  profile: SocialProfile
  characters: SocialCharacter[]
  messages: Record<string, SocialMessage[]>
  matches: SocialMatch[]
  posts: SocialPost[]
  circles: SocialCircle[]
  following: string[]
  coupleSpace: CoupleSpace
  settings: SocialSettings

  patchProfile: (patch: Partial<SocialProfile>) => void
  patchCharacter: (id: string, patch: Partial<SocialCharacter>) => void
  bumpAffinity: (id: string, delta: number) => void

  refreshMatches: () => void

  ensureConversation: (charId: string) => void
  sendMessage: (charId: string, msg: { text: string; type?: MsgType; meta?: SocialMessage['meta'] }) => void
  receiveMessage: (charId: string, msg: { text: string; type?: MsgType; meta?: SocialMessage['meta'] }) => void
  recallMessage: (charId: string, msgId: string) => void
  toggleFavoriteMessage: (charId: string, msgId: string) => void
  removeMessage: (charId: string, msgId: string) => void
  markConversationRead: (charId: string) => void

  togglePin: (charId: string) => void
  toggleMute: (charId: string) => void
  toggleBlock: (charId: string) => void
  toggleProactive: (charId: string) => void
  toggleFollow: (charId: string) => void

  addPost: (content: string, images?: string[], circle?: string) => void
  addCharacterPost: (charId: string, content: string, circle?: string) => void
  toggleLike: (postId: string, who: string) => void
  addComment: (postId: string, who: string, text: string) => void
  removePost: (postId: string) => void

  tickOnline: () => void
  patchSettings: (patch: Partial<SocialSettings>) => void
  resetAll: () => void
}

/* ---------- 工具 ---------- */

let seq = 0
export function sid(prefix = 's'): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

const DAY = 86400000

export function daysSince(ts: number): number {
  return Math.max(1, Math.floor((Date.now() - ts) / DAY) + 1)
}

export function relationshipOf(affinity: number): Relationship {
  if (affinity >= 75) return 'couple'
  if (affinity >= 45) return 'crush'
  if (affinity >= 20) return 'friend'
  return 'stranger'
}

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  stranger: '陌生人',
  friend: '朋友',
  crush: '有好感',
  couple: '情侣',
}

export const ONLINE_LABEL: Record<OnlineStatus, string> = {
  online: '在线',
  busy: '忙碌',
  offline: '离线',
}

/** 显示名：优先备注名，其次昵称 */
export function socialDisplayName(c: { nickname: string; remark?: string }): string {
  return c.remark?.trim() || c.nickname
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const sa = new Set(a)
  const sb = new Set(b)
  let inter = 0
  sa.forEach((x) => {
    if (sb.has(x)) inter += 1
  })
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

function overlapList(a: string[], b: string[]): string[] {
  const sb = new Set(b)
  return a.filter((x) => sb.has(x))
}

/* ---------- 匹配算法 ----------
   性格相似度 35% + 技能互补 20% + 兴趣重合 25% + 随机 10%
   （权重和为 0.9，最终按 0.9 归一到 0~100） */
export const MATCH_WEIGHTS = { personality: 0.35, skill: 0.2, interest: 0.25, random: 0.1 }

export function computeMatch(
  profile: SocialProfile,
  char: SocialCharacter
): { score: number; reason: string } {
  const personaBase = profile.tags.length ? profile.tags : profile.interests
  const personalitySim = jaccard(personaBase, char.personality)
  const skillComp = 1 - jaccard(profile.skills, char.skills)
  const interestOverlap = jaccard(profile.interests, char.interests)
  const rand = Math.random()

  const raw =
    MATCH_WEIGHTS.personality * personalitySim +
    MATCH_WEIGHTS.skill * skillComp +
    MATCH_WEIGHTS.interest * interestOverlap +
    MATCH_WEIGHTS.random * rand
  const score = Math.max(31, Math.min(99, Math.round((raw / 0.9) * 100)))

  const sharedPersona = overlapList(personaBase, char.personality)
  const sharedInterests = overlapList(profile.interests, char.interests)
  const dims: { weight: number; text: string }[] = [
    {
      weight: personalitySim * MATCH_WEIGHTS.personality,
      text: sharedPersona.length
        ? `你们都带着「${sharedPersona.slice(0, 2).join('、')}」的气质，很聊得来`
        : '性格上互补，正好接住彼此的情绪',
    },
    {
      weight: interestOverlap * MATCH_WEIGHTS.interest,
      text: sharedInterests.length
        ? `有 ${sharedInterests.length} 个共同兴趣：${sharedInterests.slice(0, 3).join('、')}`
        : '兴趣圈不太重叠，正好带你看看新的世界',
    },
    {
      weight: skillComp * MATCH_WEIGHTS.skill,
      text: char.skills.length ? `TA 擅长${char.skills.slice(0, 2).join('、')}，和你的技能刚好互补` : '技能上互有长短，配合默契',
    },
  ]
  dims.sort((a, b) => b.weight - a.weight)
  return { score, reason: dims[0].text }
}

/* ---------- 种子数据 ---------- */

const CHARACTER_SEED: Omit<
  SocialCharacter,
  'relationship' | 'metAt' | 'lastActive' | 'proactive' | 'muted' | 'blocked' | 'pinned'
>[] = [
  {
    id: 'char_001',
    nickname: '林知夏',
    bio: '开书店的，喜欢在雨天读诗。不太会主动，但会记住你说过的每句话。',
    personality: ['温柔', '安静', '文艺'],
    skills: ['写作', '咖啡', '烘焙'],
    interests: ['阅读', '电影', '音乐', '美食'],
    zodiac: '双鱼座',
    mbti: 'INFJ',
    onlineStatus: 'online',
    affinity: 42,
  },
  {
    id: 'char_002',
    nickname: '江岁',
    bio: '嘴硬心软，被夸会假装不在意。爱好是抬杠和半夜发奇怪的东西。',
    personality: ['傲娇', '活泼', '有趣'],
    skills: ['游戏', '编程', '摄影'],
    interests: ['游戏', '宠物', '旅行'],
    zodiac: '狮子座',
    mbti: 'ENTP',
    onlineStatus: 'busy',
    affinity: 28,
  },
  {
    id: 'char_003',
    nickname: '陈屿',
    bio: '每天六点起床跑步，相信阳光能治百病。',
    personality: ['阳光', '元气', '温柔'],
    skills: ['跑步', '吉他', '唱歌'],
    interests: ['健身', '音乐', '旅行', '美食'],
    zodiac: '射手座',
    mbti: 'ENFP',
    onlineStatus: 'online',
    affinity: 55,
  },
  {
    id: 'char_004',
    nickname: '沈砚',
    bio: '话很少，但深夜会突然说一句很戳你的话。',
    personality: ['高冷', '安静', '腹黑'],
    skills: ['绘画', '编程'],
    interests: ['阅读', '电影', '游戏'],
    zodiac: '天蝎座',
    mbti: 'INTJ',
    onlineStatus: 'offline',
    affinity: 18,
  },
  {
    id: 'char_005',
    nickname: '苏晚',
    bio: '烘焙爱好者，家里永远有刚出炉的蛋糕味。',
    personality: ['温柔', '治愈', '阳光'],
    skills: ['烘焙', '烹饪', '摄影'],
    interests: ['美食', '宠物', '电影'],
    zodiac: '巨蟹座',
    mbti: 'ISFJ',
    onlineStatus: 'online',
    affinity: 63,
  },
  {
    id: 'char_006',
    nickname: '顾野',
    bio: '骑机车去远方，行李箱里永远有半张没听完的唱片。',
    personality: ['阳光', '有趣', '元气'],
    skills: ['旅行', '吉他', '摄影'],
    interests: ['旅行', '音乐', '健身'],
    zodiac: '白羊座',
    mbti: 'ESTP',
    onlineStatus: 'busy',
    affinity: 34,
  },
  {
    id: 'char_007',
    nickname: '温以宁',
    bio: '在读研，最擅长把复杂的知识讲成故事。',
    personality: ['安静', '文艺', '温柔'],
    skills: ['写作', '学习', '绘画'],
    interests: ['学习', '阅读', '音乐'],
    zodiac: '处女座',
    mbti: 'INTP',
    onlineStatus: 'offline',
    affinity: 25,
  },
  {
    id: 'char_008',
    nickname: '许澜',
    bio: '养了三只猫，朋友圈除了猫还是猫。',
    personality: ['活泼', '治愈', '有趣'],
    skills: ['宠物', '烹饪', '唱歌'],
    interests: ['宠物', '美食', '游戏'],
    zodiac: '双子座',
    mbti: 'ESFP',
    onlineStatus: 'online',
    affinity: 47,
  },
]

export const CIRCLES: SocialCircle[] = [
  { id: 'c_food', name: '美食', description: '深夜放毒、探店、家常菜' },
  { id: 'c_travel', name: '旅行', description: '路线攻略、风景、在路上' },
  { id: 'c_pet', name: '宠物', description: '猫猫狗狗与毛孩子的日常' },
  { id: 'c_game', name: '游戏', description: '开黑、安利、攻略' },
  { id: 'c_study', name: '学习', description: '自习室、备考、读书笔记' },
  { id: 'c_love', name: '情感', description: '心事、恋爱、树洞' },
]

const POST_SEED: { charId: string; content: string; circle?: string }[] = [
  { charId: 'char_001', content: '今天书店没什么客人，把《我们仨》又读了一遍，还是会在最后几页停下来。', circle: 'c_study' },
  { charId: 'char_005', content: '新做的巴斯克出炉了！这次加了海盐，咸甜刚好。', circle: 'c_food' },
  { charId: 'char_008', content: '它今天把我的键盘当床睡，我该怎么工作啊……', circle: 'c_pet' },
  { charId: 'char_003', content: '六点的江边，跑完五公里，风是凉的，天是橘的。', circle: 'c_travel' },
  { charId: 'char_002', content: '打了一把排位，队友的操作让我怀疑人生，但我还是赢了，哼。', circle: 'c_game' },
  { charId: 'char_006', content: '机车到山垭口的时候正好放完一整张专辑，值了。', circle: 'c_travel' },
]

function createSeed() {
  const now = Date.now()
  const profile: SocialProfile = {
    id: 'user_001',
    nickname: '小 M',
    bio: '想认识一个能一起吃饭、聊废话、看日落的人。',
    tags: ['温柔', '文艺'],
    interests: ['美食', '旅行', '电影', '音乐'],
    skills: ['写作', '咖啡'],
    zodiac: '天秤座',
    mbti: 'INFP',
    createdAt: now,
    onlineStatus: 'online',
  }

  const characters: SocialCharacter[] = CHARACTER_SEED.map((c, i) => ({
    ...c,
    relationship: relationshipOf(c.affinity),
    metAt: now - (i + 2) * DAY,
    lastActive: now - (i + 1) * 12 * 60000,
    proactive: false,
    muted: false,
    blocked: false,
    pinned: false,
  }))

  // 预置几段对话，让会话列表不空
  const messages: Record<string, SocialMessage[]> = {
    char_001: [
      { id: sid('m'), senderId: 'char_001', text: '你是先在推荐里看到我的那本《山月记》吗？', type: 'text', timestamp: now - 50 * 60000, read: true, recalled: false, favorited: false },
      { id: sid('m'), senderId: ME, text: '对，那句“我不敢贸然下笔”记了很久。', type: 'text', timestamp: now - 48 * 60000, read: true, recalled: false, favorited: false },
      { id: sid('m'), senderId: 'char_001', text: '那我们有得聊了，改天来店里，请你喝手冲。', type: 'text', timestamp: now - 46 * 60000, read: false, recalled: false, favorited: false },
    ],
    char_005: [
      { id: sid('m'), senderId: 'char_005', text: '刚烤好一炉曲奇，第一个想到你，尝尝？', type: 'text', timestamp: now - 3 * 3600000, read: true, recalled: false, favorited: true },
      { id: sid('m'), senderId: ME, text: '看起来也太香了，我不客气了。', type: 'text', timestamp: now - 3 * 3600000 + 60000, read: true, recalled: false, favorited: false },
      { id: sid('m'), senderId: 'char_005', text: '', type: 'gift', timestamp: now - 2.6 * 3600000, read: false, recalled: false, favorited: false, meta: { gift: '手工曲奇' } },
    ],
    char_008: [
      { id: sid('m'), senderId: 'char_008', text: '救命，我家猫又把我耳机线咬断了。', type: 'text', timestamp: now - 26 * 3600000, read: true, recalled: false, favorited: false },
      { id: sid('m'), senderId: ME, text: '这不叫咬断，这叫帮你换新的。', type: 'text', timestamp: now - 25 * 3600000, read: true, recalled: false, favorited: false },
    ],
    char_003: [
      { id: sid('m'), senderId: 'char_003', text: '明天早上要不要一起晨跑？我带你走江边那条线。', type: 'text', timestamp: now - 30 * 3600000, read: false, recalled: false, favorited: false },
    ],
  }

  const posts: SocialPost[] = POST_SEED.map((p, i) => ({
    id: sid('p'),
    authorId: p.charId,
    content: p.content,
    images: [],
    likes: i % 2 === 0 ? ['char_002', 'char_005'] : ['char_003'],
    comments:
      i === 0
        ? [{ id: sid('cm'), authorId: 'char_007', text: '这本我也很喜欢。', timestamp: now - 20 * 60000 }]
        : [],
    timestamp: now - (i + 1) * 40 * 60000,
    visibility: 'public',
    circle: p.circle,
  }))

  const matches: SocialMatch[] = characters.slice(0, 6).map((c) => {
    const { score, reason } = computeMatch(profile, c)
    return { charId: c.id, matchScore: score, reason, timestamp: now }
  })
  matches.sort((a, b) => b.matchScore - a.matchScore)

  return {
    profile,
    characters,
    messages,
    matches,
    posts,
    circles: CIRCLES,
    following: ['char_001', 'char_005'],
    coupleSpace: { charId: null, sharedDiary: [], sharedPhotos: [], milestones: [], wishes: [], since: 0 } as CoupleSpace,
    settings: { notify: true, theme: 'dark' } as SocialSettings,
  }
}

/* ---------- store ---------- */

export const useSocial = create<SocialState>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      patchProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      patchCharacter: (id, patch) =>
        set((s) => ({
          characters: s.characters.map((c) => {
            if (c.id !== id) return c
            const next = { ...c, ...patch }
            if (patch.affinity !== undefined) next.relationship = relationshipOf(next.affinity)
            return next
          }),
        })),

      bumpAffinity: (id, delta) =>
        set((s) => ({
          characters: s.characters.map((c) =>
            c.id === id
              ? (() => {
                  const affinity = Math.max(0, Math.min(100, c.affinity + delta))
                  return { ...c, affinity, relationship: relationshipOf(affinity), lastActive: Date.now() }
                })()
              : c
          ),
        })),

      refreshMatches: () =>
        set((s) => {
          const pool = s.characters.filter((c) => !c.blocked)
          const list: SocialMatch[] = pool.map((c) => {
            const { score, reason } = computeMatch(s.profile, c)
            return { charId: c.id, matchScore: score, reason, timestamp: Date.now() }
          })
          list.sort((a, b) => b.matchScore - a.matchScore)
          return { matches: list }
        }),

      ensureConversation: (charId) =>
        set((s) => {
          if (s.messages[charId]?.length) return s
          const c = s.characters.find((x) => x.id === charId)
          if (!c) return s
          return {
            messages: {
              ...s.messages,
              [charId]: [
                {
                  id: sid('m'),
                  senderId: charId,
                  text: `嗨，我是${c.nickname}。${c.bio.slice(0, 18)}……先从你好开始？`,
                  type: 'text' as MsgType,
                  timestamp: Date.now(),
                  read: false,
                  recalled: false,
                  favorited: false,
                },
              ],
            },
          }
        }),

      sendMessage: (charId, msg) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: [
              ...(s.messages[charId] ?? []),
              {
                id: sid('m'),
                senderId: ME,
                text: msg.text,
                type: msg.type ?? 'text',
                timestamp: Date.now(),
                read: true,
                recalled: false,
                favorited: false,
                meta: msg.meta,
              },
            ],
          },
          characters: s.characters.map((c) => (c.id === charId ? { ...c, lastActive: Date.now() } : c)),
        })),

      receiveMessage: (charId, msg) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: [
              ...(s.messages[charId] ?? []),
              {
                id: sid('m'),
                senderId: charId,
                text: msg.text,
                type: msg.type ?? 'text',
                timestamp: Date.now(),
                read: false,
                recalled: false,
                favorited: false,
                meta: msg.meta,
              },
            ],
          },
          characters: s.characters.map((c) =>
            c.id === charId
              ? (() => {
                  const affinity = Math.max(0, Math.min(100, c.affinity + 2))
                  return { ...c, affinity, relationship: relationshipOf(affinity), lastActive: Date.now() }
                })()
              : c
          ),
        })),

      recallMessage: (charId, msgId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: (s.messages[charId] ?? []).map((m) => (m.id === msgId ? { ...m, recalled: true, text: '' } : m)),
          },
        })),

      toggleFavoriteMessage: (charId, msgId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: (s.messages[charId] ?? []).map((m) => (m.id === msgId ? { ...m, favorited: !m.favorited } : m)),
          },
        })),

      removeMessage: (charId, msgId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: (s.messages[charId] ?? []).filter((m) => m.id !== msgId),
          },
        })),

      markConversationRead: (charId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [charId]: (s.messages[charId] ?? []).map((m) => ({ ...m, read: true })),
          },
        })),

      togglePin: (charId) =>
        set((s) => ({ characters: s.characters.map((c) => (c.id === charId ? { ...c, pinned: !c.pinned } : c)) })),
      toggleMute: (charId) =>
        set((s) => ({ characters: s.characters.map((c) => (c.id === charId ? { ...c, muted: !c.muted } : c)) })),
      toggleBlock: (charId) =>
        set((s) => ({ characters: s.characters.map((c) => (c.id === charId ? { ...c, blocked: !c.blocked } : c)) })),
      toggleProactive: (charId) =>
        set((s) => ({ characters: s.characters.map((c) => (c.id === charId ? { ...c, proactive: !c.proactive } : c)) })),
      toggleFollow: (charId) =>
        set((s) => ({
          following: s.following.includes(charId) ? s.following.filter((x) => x !== charId) : [...s.following, charId],
        })),

      addPost: (content, images = [], circle) =>
        set((s) => ({
          posts: [
            {
              id: sid('p'),
              authorId: ME,
              content,
              images,
              likes: [],
              comments: [],
              timestamp: Date.now(),
              visibility: 'public',
              circle,
            },
            ...s.posts,
          ],
        })),

      addCharacterPost: (charId, content, circle) =>
        set((s) => ({
          posts: [
            {
              id: sid('p'),
              authorId: charId,
              content,
              images: [],
              likes: [],
              comments: [],
              timestamp: Date.now(),
              visibility: 'public',
              circle,
            },
            ...s.posts,
          ],
        })),

      toggleLike: (postId, who) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, likes: p.likes.includes(who) ? p.likes.filter((x) => x !== who) : [...p.likes, who] }
              : p
          ),
        })),

      addComment: (postId, who, text) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, { id: sid('cm'), authorId: who, text, timestamp: Date.now() }] }
              : p
          ),
        })),

      removePost: (postId) => set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),

      tickOnline: () =>
        set((s) => ({
          characters: s.characters.map((c) => {
            if (c.blocked) return c
            const r = Math.random()
            const onlineStatus: OnlineStatus = r > 0.7 ? 'online' : r > 0.45 ? 'busy' : 'offline'
            return { ...c, onlineStatus }
          }),
        })),

      patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetAll: () => set(() => createSeed()),
    }),
    {
      name: 'ksc:social',
      version: 1,
    }
  )
)

/* ---------- 便捷选择器 ---------- */

export function useCharacter(id: string | null | undefined): SocialCharacter | null {
  return useSocial((s) => (id ? s.characters.find((c) => c.id === id) ?? null : null))
}

export function lastMessageOf(messages: SocialMessage[] | undefined): SocialMessage | null {
  if (!messages || !messages.length) return null
  return messages[messages.length - 1]
}

export function unreadCount(messages: SocialMessage[] | undefined): number {
  if (!messages) return 0
  return messages.filter((m) => m.senderId !== ME && !m.read).length
}

/** 会话列表排序：置顶优先，其次按最后一条消息时间 */
export function sortCharactersByActivity(
  characters: SocialCharacter[],
  messages: Record<string, SocialMessage[]>
): SocialCharacter[] {
  return [...characters].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const ta = lastMessageOf(messages[a.id])?.timestamp ?? a.lastActive
    const tb = lastMessageOf(messages[b.id])?.timestamp ?? b.lastActive
    return tb - ta
  })
}

export function exportSocialData(): string {
  const s = useSocial.getState()
  return JSON.stringify(
    {
      profile: s.profile,
      characters: s.characters,
      messages: s.messages,
      matches: s.matches,
      posts: s.posts,
      following: s.following,
      coupleSpace: s.coupleSpace,
      settings: s.settings,
      exportedAt: Date.now(),
    },
    null,
    2
  )
}

export function importSocialData(json: string): boolean {
  try {
    const data = JSON.parse(json) as Partial<SocialState>
    if (!data || typeof data !== 'object') return false
    useSocial.setState((s) => ({
      profile: data.profile ?? s.profile,
      characters: data.characters ?? s.characters,
      messages: data.messages ?? s.messages,
      matches: data.matches ?? s.matches,
      posts: data.posts ?? s.posts,
      following: data.following ?? s.following,
      coupleSpace: data.coupleSpace ?? s.coupleSpace,
      settings: data.settings ?? s.settings,
    }))
    return true
  } catch {
    return false
  }
}

