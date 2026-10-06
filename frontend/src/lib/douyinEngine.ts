import type { CSSProperties } from 'react'
import { useCharacters } from '../store/characters'
import { useForum } from '../store/forum'
import { getDefaultChatPreset } from '../store/apiPresets'
import { streamChat, type ChatApiMessage } from './api'
import { authorPersona } from './forumEngine'
import { buildCharacterPrompt } from './chatEngine'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type DyAuthorKind = 'character' | 'npc' | 'passerby' | 'user'

export interface DyAuthor {
  /** 展示/存储用唯一键：character:<id> / npc:<id> / passerby:<id> / user */
  key: string
  kind: DyAuthorKind
  id: string
  name: string
  avatarId: string | null
  persona: string
  /** 路人标签：粉丝 / 路人 / 黑粉 / 潜水用户 */
  passerbyTag?: string
}

export interface DyBgm {
  title: string
  artist: string
}

export interface DyVideoStats {
  likes: number
  comments: number
  shares: number
  views: number
}

export type DyVideoStyle = 'dance' | 'talent' | 'funny' | 'academic' | 'sport' | 'life' | 'beauty'

/** 作品可见范围 */
export type DyVisibility = 'public' | 'friends' | 'private'

export const VISIBILITY_META: Record<DyVisibility, { label: string; hint: string }> = {
  public: { label: '公开', hint: '所有人可见' },
  friends: { label: '仅好友', hint: '互相关注的人可见' },
  private: { label: '仅自己', hint: '仅自己可见' },
}

export interface DyVideo {
  id: string
  author: DyAuthor
  /** 供 AI 生图使用的封面描述 */
  coverPrompt: string
  /** 已生成的真实封面图（外链）；为空则用渐变合成占位 */
  coverImage: string | null
  description: string
  tags: string[]
  bgm: DyBgm
  duration: number
  createdAt: number
  stats: DyVideoStats
  location: string
  style: DyVideoStyle
  /** 后期调色滤镜 id（FILTER_PRESETS） */
  filter?: string
  /** 可见范围 */
  visibility?: DyVisibility
  /** @ 的好友 */
  mentions?: string[]
  /** 直播中的视频 */
  live?: DyLiveInfo
}

export type DyLiveType = 'chat' | 'talent' | 'game' | 'commerce'

export interface DyLiveInfo {
  title: string
  viewers: number
  type: DyLiveType
  likes: number
}

export interface DyComment {
  id: string
  videoId: string
  author: DyAuthor
  content: string
  likes: number
  createdAt: number
  replies: { id: string; author: DyAuthor; content: string; createdAt: number }[]
}

export type DyInboxType = 'like' | 'comment' | 'follow' | 'visit' | 'mention' | 'system' | 'dm'

export interface DyInboxItem {
  id: string
  type: DyInboxType
  sender: DyAuthor
  content: string
  createdAt: number
  isRead: boolean
  relatedVideoId?: string
  /** 新粉丝通知是否已回关 */
  followedBack?: boolean
}

export interface DyDm {
  id: string
  fromMe: boolean
  content: string
  createdAt: number
  /** 图片消息（IndexedDB blob id） */
  imageId?: string | null
}

export interface DyConversation {
  id: string
  peer: DyAuthor
  messages: DyDm[]
  lastTime: number
  unread: number
}

export interface DyVisitorRecord {
  id: string
  visitor: DyAuthor
  /** 被访问者键 */
  target: string
  at: number
  source: 'video' | 'comment' | 'search' | 'recommend'
  /** 主页权限：匿名访问不留记录 */
  anonymous?: boolean
}

export interface DyPrivacy {
  ipVisible: boolean
  ipCustom: string
  gender: '男' | '女' | '不显示'
  age: string
  ageVisible: boolean
  birthdayVisible: boolean
  locationVisible: boolean
}

export interface DyProfile {
  key: string
  author: DyAuthor
  nickname: string
  bio: string
  tags: string[]
  avatarId: string | null
  /** 主页背景：外链生图；为空用渐变 */
  bgImage: string | null
  bgPrompt: string
  gender: string
  age: string
  ip: string
  privacy: DyPrivacy
  /** 主题模板 id（THEME_PRESETS） */
  theme: string
  /** 背景滤镜 id（FILTER_PRESETS） */
  filter?: string
  /** 贴纸 / 文字图层 */
  layers?: DyLayer[]
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 文本 prompt → 生图外链（环境内置的 text_to_image 服务） */
export function coverImageUrl(prompt: string, size = 'portrait_16_9'): string {
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`
}

/** 由文案派生稳定的渐变色（渐变占位封面用） */
export function gradientOf(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  const a = h
  const b = (h + 56) % 360
  return [`hsl(${a} 62% 26%)`, `hsl(${b} 58% 12%)`]
}

export function authorKeyOf(a: { kind: DyAuthorKind; id: string }): string {
  return a.kind === 'user' ? 'user' : `${a.kind}:${a.id}`
}

// ---------------------------------------------------------------------------
// 作者池
// ---------------------------------------------------------------------------

/** 全部可当创作者的角色：角色库 + 论坛 NPC */
export function dyAuthors(): DyAuthor[] {
  const chars = useCharacters.getState().characters
  const forum = useForum.getState()
  const out: DyAuthor[] = []
  for (const c of chars) {
    out.push({
      key: `character:${c.id}`,
      kind: 'character',
      id: c.id,
      name: c.name,
      avatarId: c.avatarId,
      persona: buildCharacterPrompt(c),
    })
  }
  for (const n of forum.npcs) {
    if (forum.blockedNpcIds.includes(n.id)) continue
    out.push({
      key: `npc:${n.id}`,
      kind: 'npc',
      id: n.id,
      name: n.name,
      avatarId: n.avatarId,
      persona: authorPersona({ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }),
    })
  }
  return out
}

const PASSERBY_NAMES = [
  '小熊软糖', '不困的猫', '橘子汽水', '晚风便利店', 'nap', '阿May', '十七',
  '海盐柠檬', '会飞的鱼', '南巷', '奶盖不加冰', '隔壁老王', '月半小夜曲',
  'momo', '一颗西柚', '吃瓜前排', '深夜食堂', '柠檬不酸', '路人甲', '夏天的风',
]

const PASSERBY_TAGS = ['粉丝', '路人', '黑粉', '潜水用户']

/** 生成一批路人（会持久化到 store，保证同 id 稳定） */
export function makePasserbies(count: number): DyAuthor[] {
  const out: DyAuthor[] = []
  for (let i = 0; i < count; i++) {
    const tag = pick(PASSERBY_TAGS)
    const id = uid('p')
    out.push({
      key: `passerby:${id}`,
      kind: 'passerby',
      id,
      name: pick(PASSERBY_NAMES),
      avatarId: null,
      persona: `你是抖音上的一个普通用户，身份标签：${tag}。说话随意、口语化，偶尔带点网络梗。`,
      passerbyTag: tag,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// 群聊（由创作者派生的粉丝群）
// ---------------------------------------------------------------------------

export interface DyGroup {
  id: string
  name: string
  members: DyAuthor[]
}

export interface DyGroupMessage {
  id: string
  sender: DyAuthor
  content: string
  createdAt: number
}

/** 基于当前角色库派生 3 个粉丝群，id / 成员稳定；角色库为空时用路人池兜底，保证功能可用 */
export function dyGroups(fallback: DyAuthor[] = []): DyGroup[] {
  const base = dyAuthors()
  const creators = base.length > 0 ? base : fallback
  return creators.slice(0, 3).map((c) => {
    const others = creators.filter((a) => a.key !== c.key).slice(0, 5)
    return { id: `g${c.id}`, name: `${c.name}的粉丝群`, members: [c, ...others] }
  })
}

// ---------------------------------------------------------------------------
// 视频风格：严格跟着人设走
// ---------------------------------------------------------------------------

const STYLE_RULES: { style: DyVideoStyle; words: string[] }[] = [
  { style: 'dance', words: ['舞', '爵士', '街舞', '编舞', '模特', '走秀'] },
  { style: 'talent', words: ['唱', '歌', '乐器', '吉他', '钢琴', '尤克里里', '弹', '音乐'] },
  { style: 'funny', words: ['搞笑', '幽默', '沙雕', '段子', '活泼', '话痨', '吐槽'] },
  { style: 'academic', words: ['学', '研究', '科普', '老师', '博士', '医', '工程师', '代码', '程序员', '理性'] },
  { style: 'sport', words: ['健身', '运动', '篮球', '跑', '球', '瑜伽', '游泳', '户外'] },
  { style: 'beauty', words: ['美妆', '穿搭', '颜值', '化妆', '护肤', '可爱', '甜'] },
  { style: 'life', words: ['美食', '探店', '厨', '吃', '生活', 'vlog', '咖啡', '旅行'] },
]

export function styleOf(persona: string): DyVideoStyle {
  for (const rule of STYLE_RULES) {
    if (rule.words.some((w) => persona.includes(w))) return rule.style
  }
  return 'life'
}

const STYLE_PACK: Record<DyVideoStyle, { desc: string[]; tags: string[]; bgm: DyBgm[] }> = {
  dance: {
    desc: [
      '练了两个晚上的成果，卡点终于顺了 #舞蹈 #卡点',
      '这段谁懂啊，跳完直接喘到说不出话 #编舞日常',
      '随便跳跳，被镜子里自己帅到了 #一镜到底',
    ],
    tags: ['舞蹈', '卡点', '一镜到底', '编舞日常'],
    bgm: [
      { title: 'Midnight Groove', artist: 'KIRA' },
      { title: '心跳节拍', artist: 'NOVA' },
    ],
  },
  talent: {
    desc: [
      '随便弹一段，手有点生了 #吉他弹唱 #live',
      '写了很久的一段旋律，终于录下来了 #原创音乐',
      '今晚的嗓子状态还不错 #翻唱',
    ],
    tags: ['吉他弹唱', '原创音乐', '翻唱', 'live'],
    bgm: [
      { title: '旧巷子的风', artist: '未知' },
      { title: 'Ocean Eyes', artist: '自弹自唱' },
    ],
  },
  funny: {
    desc: [
      '本来想耍帅的结果…算了你们自己看 #日常翻车',
      '我妈看到这条视频可能会打我 #沙雕日常',
      '模仿一下我朋友，他已经知道了 #模仿',
    ],
    tags: ['日常翻车', '沙雕日常', '模仿', '搞笑'],
    bgm: [
      { title: '哈哈哈进行曲', artist: '热门' },
      { title: '喜剧之王', artist: '网络歌手' },
    ],
  },
  academic: {
    desc: [
      '三个误区，90%的人都在踩 #冷知识 #科普',
      '用一杯奶茶的时间讲明白这件事 #知识分享',
      '被问了很多次，今天一次性说清楚 #干货',
    ],
    tags: ['冷知识', '科普', '知识分享', '干货'],
    bgm: [
      { title: 'lo-fi study', artist: 'Chill' },
      { title: '安静的白噪音', artist: '专注' },
    ],
  },
  sport: {
    desc: [
      '今天也没有偷懒，打卡第 47 天 #健身打卡',
      '这条路线推荐给大家，风景真的绝 #户外',
      '三分球手感回来了 #篮球日常',
    ],
    tags: ['健身打卡', '户外', '篮球日常', '运动'],
    bgm: [
      { title: 'Run it', artist: 'BEAST' },
      { title: '燃', artist: '动力引擎' },
    ],
  },
  beauty: {
    desc: [
      '今天这个妆有点上头，出门被夸了三次 #妆容分享',
      '秋冬穿搭参考，通勤也能很好看 #穿搭',
      '早八人五分钟出门妆 #伪素颜',
    ],
    tags: ['妆容分享', '穿搭', '伪素颜', '美妆'],
    bgm: [
      { title: 'Sugar', artist: 'POP' },
      { title: '甜美日常', artist: '轻音乐' },
    ],
  },
  life: {
    desc: [
      '这家店我回购了四次，真的好吃 #探店',
      '今天的晚霞值一张票 #日常记录',
      '一个人的深夜食堂 #夜宵',
    ],
    tags: ['探店', '日常记录', '夜宵', 'vlog'],
    bgm: [
      { title: '傍晚的风', artist: 'Lofi' },
      { title: 'Coffee Time', artist: 'Jazz Cafe' },
    ],
  },
}

const LOCATIONS = ['上海·徐汇', '北京·朝阳', '杭州·西湖', '成都·玉林', '深圳·南山', '广州·天河', '重庆·解放碑', '', '']

/** 发布页位置候选 */
export const DY_LOCATIONS = ['不显示', '上海·徐汇', '北京·朝阳', '杭州·西湖', '成都·玉林', '深圳·南山', '广州·天河', '重庆·解放碑']

/** 创作资源库：内置配乐 */
export const MUSIC_LIBRARY: DyBgm[] = [
  { title: '热浪', artist: '夏日计划' },
  { title: '傍晚的风', artist: 'Lofi' },
  { title: '心跳节拍', artist: 'NOVA' },
  { title: '旧巷子的风', artist: '未知' },
  { title: 'City Lights', artist: 'JEON' },
  { title: 'Sugarcane', artist: 'POP' },
  { title: 'quiet night', artist: 'Chill' },
  { title: '燃', artist: '动力引擎' },
  { title: '温柔陷阱', artist: '南屿' },
  { title: '原声', artist: '自定义' },
]

/** 本地兜底：按人设风格造视频 */
export function localVideos(authors: DyAuthor[], count: number, avoid: string[] = []): DyVideo[] {
  const out: DyVideo[] = []
  const pool = authors.length > 0 ? authors : []
  for (let i = 0; i < count; i++) {
    const author = pool.length > 0 ? pool[i % pool.length] : undefined
    if (!author) break
    const style = styleOf(`${author.persona} ${author.name}`)
    const pack = STYLE_PACK[style]
    const desc = pick(pack.desc.filter((d) => !avoid.includes(d))) || pick(pack.desc)
    const bgm = pick(pack.bgm)
    out.push({
      id: uid('v'),
      author,
      coverPrompt: `${style} 风格短视频封面，${author.name}，${desc.replace(/#[^\s#]+/g, '')}，电影感打光，竖构图`,
      coverImage: null,
      description: desc,
      tags: shuffle(pack.tags).slice(0, 2 + randInt(0, 1)),
      bgm,
      duration: randInt(15, 60),
      createdAt: Date.now() - randInt(0, 72) * 3600_000,
      stats: {
        likes: randInt(120, 96000),
        comments: randInt(8, 3200),
        shares: randInt(0, 900),
        views: randInt(2000, 480000),
      },
      location: pick(LOCATIONS),
      style,
      live:
        Math.random() < 0.12
          ? { title: liveTitleOf(author), viewers: randInt(80, 12800), type: liveTypeOf(author), likes: randInt(200, 90000) }
          : undefined,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// AI 生成
// ---------------------------------------------------------------------------

function apiWrap(sys: string, user: string): ChatApiMessage[] {
  const preset = getDefaultChatPreset()
  const mode = preset?.injectMode ?? 'system'
  if (mode === 'merge-user') {
    return [
      { role: 'user', content: `[系统设定]\n${sys}` },
      { role: 'user', content: user },
    ]
  }
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ]
}

async function callLLM(sys: string, user: string): Promise<string | null> {
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return null
  try {
    const raw = await streamChat(preset, apiWrap(sys, user), { onDelta: () => {} })
    return raw?.trim() || null
  } catch {
    return null
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  const m = raw.match(/[\[{][\s\S]*[\]}]/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

interface AiVideoRow {
  authorKey: string
  coverPrompt: string
  description: string
  tags: string[]
  bgm?: { title: string; artist: string }
  duration?: number
}

/** AI 生成一批视频；无 API 或失败时返回 null（由调用方兜底） */
export async function aiVideos(authors: DyAuthor[], count: number, avoid: string[] = []): Promise<DyVideo[] | null> {
  const picked = shuffle(authors).slice(0, Math.max(1, Math.min(count, 3)))
  if (picked.length === 0) return null
  const sys = `你正在扮演抖音上的多位创作者，为他们各生成一条短视频内容。创作者人设：
${picked.map((a) => `- [${a.key}] ${a.name}：${a.persona}`).join('\n')}

要求：
1. 视频风格必须严格符合各自人设，不要千篇一律（如高冷少言的人不会发沙雕视频）
2. description 是抖音风格的文案，30 字以内，自然带 1-2 个话题标签，可用 emoji
3. coverPrompt 是给 AI 生图用的中文封面描述（画面主体 + 场景 + 光线 + 竖构图）
4. bgm 从该角色喜好的音乐风格里选，给标题和歌手
5. duration 取 15-60 之间的整数
${avoid.length ? `避免与这些已发文案重复：${avoid.slice(0, 6).join(' / ')}` : ''}
严格输出 JSON（不要 markdown 代码块）：{"videos":[{"authorKey":"c:xx","coverPrompt":"","description":"","tags":[""],"bgm":{"title":"","artist":""},"duration":22}]}`

  const rows = parseJson<{ videos: AiVideoRow[] }>(await callLLM(sys, '（系统指令：现在生成视频内容，只输出 JSON。）'))
  if (!rows?.videos?.length) return null
  const byKey = new Map(picked.map((a) => [a.key, a]))
  const out: DyVideo[] = []
  for (const r of rows.videos) {
    const author = byKey.get(String(r.authorKey))
    if (!author || !r.description) continue
    const style = styleOf(`${author.persona} ${r.description}`)
    out.push({
      id: uid('v'),
      author,
      coverPrompt: String(r.coverPrompt || r.description).slice(0, 120),
      coverImage: null,
      description: String(r.description).slice(0, 80),
      tags: (r.tags ?? []).map((t) => String(t).replace(/^#/, '')).slice(0, 4),
      bgm: r.bgm?.title ? { title: String(r.bgm.title), artist: String(r.bgm.artist || '未知') } : pick(STYLE_PACK[style].bgm),
      duration: Math.min(60, Math.max(15, Number(r.duration) || randInt(15, 60))),
      createdAt: Date.now() - randInt(0, 72) * 3600_000,
      stats: { likes: randInt(120, 96000), comments: randInt(8, 3200), shares: randInt(0, 900), views: randInt(2000, 480000) },
      location: pick(LOCATIONS),
      style,
    })
  }
  return out.length ? out : null
}

const FALLBACK_COMMENTS = [
  '哈哈哈哈哈笑死', '这个也太绝了吧', '第一次刷到，关注了', '求bgm！！',
  '前排', '你终于更新了', '已三连', '姐妹这个在哪买的', '看哭了', '同款烦恼',
  '蹲一个后续', '这也太真实了', '有点上头', '路过帮顶', '黑粉已到，开始表演',
]
const FALLBACK_DANMAKU = ['主播好可爱', '来了来了', '哈哈哈哈', '+1', '666', '刚下班来蹲', '刷礼物了', '唱一个！']

export function fallbackComment(): string {
  return pick(FALLBACK_COMMENTS)
}

export function fallbackDanmaku(): string {
  return pick(FALLBACK_DANMAKU)
}

/** AI 生成一条评论（按评论者人设） */
export async function aiComment(videoDesc: string, commenter: DyAuthor, authorName: string): Promise<string> {
  const sys = `${commenter.persona}
【抖音评论任务】你在抖音刷到了一条视频并留下评论。
【作者】${authorName}
【视频文案】${videoDesc}
要求：口语化、像真人随手评论，12 字以内，符合你的人设与说话风格，不要复述文案。
只输出评论内容本身。`
  const raw = await callLLM(sys, '（系统指令：现在写出这条评论，只输出内容。）')
  return raw ? raw.replace(/^["“]|["”]$/g, '').slice(0, 40) : fallbackComment()
}

interface AiInboxRow {
  senderKey: string
  type: DyInboxType
  content: string
}

const INBOX_TYPES_WEIGHTED: DyInboxType[] = [
  ...Array<DyInboxType>(30).fill('like'),
  ...Array<DyInboxType>(25).fill('comment'),
  ...Array<DyInboxType>(20).fill('follow'),
  ...Array<DyInboxType>(15).fill('visit'),
  ...Array<DyInboxType>(10).fill('mention'),
]

export function randomInboxType(): DyInboxType {
  return pick(INBOX_TYPES_WEIGHTED)
}

/** 本地拼一条通知文案 */
export function localInboxContent(type: DyInboxType, senderName: string, videoDesc: string): string {
  const title = videoDesc.replace(/#[^\s#]+/g, '').trim().slice(0, 14) || '你的作品'
  switch (type) {
    case 'like':
      return `${senderName}点赞了你的作品《${title}》`
    case 'comment':
      return `${senderName}评论了你的作品：'${fallbackComment()}'`
    case 'follow':
      return `${senderName}关注了你`
    case 'visit':
      return `${senderName}刚刚访问了你的主页`
    case 'mention':
      return `${senderName}在评论中@了你`
    default:
      return `${senderName}与你互动了`
  }
}

/** AI 生成一批通知消息；返回 null 表示需要兜底 */
export async function aiInbox(
  senders: DyAuthor[],
  types: DyInboxType[],
  myVideos: string[],
  avoid: string[]
): Promise<AiInboxRow[] | null> {
  if (senders.length === 0) return null
  const sys = `你正在扮演抖音上多个不同的用户，为用户的消息中心生成互动通知。发送者人设：
${senders.map((a) => `- [${a.key}] ${a.name}：${a.persona}`).join('\n')}

【用户最近发布的视频】${myVideos.slice(0, 5).join(' / ') || '（暂无）'}
【消息类型】${types.map((t, i) => `${i + 1}. [${senders[i]?.key ?? senders[0].key}] ${t}`).join('\n')}
要求：
1. content 必须完全符合发送者人设的说话风格（黑粉会阴阳怪气，粉丝会热情，潜水用户话很少）
2. 点赞/评论/@提及类要带上视频名；评论类要写出评论正文；关注/访客类只写通知口吻
3. 25 字以内，一次性口语化，不要 emoji 过多
${avoid.length ? `避免与这些重复：${avoid.slice(0, 5).join(' / ')}` : ''}
严格输出 JSON（不要 markdown 代码块）：{"items":[{"senderKey":"npc:xx","type":"like","content":""}]}`

  const rows = parseJson<{ items: AiInboxRow[] }>(await callLLM(sys, '（系统指令：现在生成通知，只输出 JSON。）'))
  if (!rows?.items?.length) return null
  const valid = new Set(senders.map((s) => s.key))
  return rows.items.filter((r) => valid.has(String(r.senderKey)) && r.content)
}

/** 直播标题（按人设风格） */
export function liveTitleOf(author: DyAuthor): string {
  const style = styleOf(`${author.persona} ${author.name}`)
  if (style === 'talent') return '深夜点歌台，想听什么打在公屏'
  if (style === 'dance') return '在线练舞，卡点失败就重来'
  if (style === 'funny') return '进来聊天，今天主打一个废话'
  if (style === 'academic') return '随手答疑间，问什么答什么'
  if (style === 'sport') return '陪我练完这一组就走'
  if (style === 'beauty') return '化妆间闲聊，顺便测评新品'
  return '随便聊聊，路过进来坐坐'
}

// ---------------------------------------------------------------------------
// 直播
// ---------------------------------------------------------------------------

export const LIVE_TYPE_META: Record<DyLiveType, { label: string; icon: string; hint: string }> = {
  chat: { label: '聊天直播', icon: 'chat', hint: '在镜头前随便聊聊' },
  talent: { label: '才艺直播', icon: 'talent', hint: '唱歌 / 跳舞 / 乐器' },
  game: { label: '游戏直播', icon: 'game', hint: '直播打游戏中' },
  commerce: { label: '带货直播', icon: 'commerce', hint: '好物推荐中' },
}

/** 直播类型：由人设风格映射 */
export function liveTypeOf(author: DyAuthor): DyLiveType {
  const s = styleOf(`${author.persona} ${author.name}`)
  if (s === 'talent' || s === 'dance') return 'talent'
  if (s === 'beauty') return 'commerce'
  if (s === 'life') return Math.random() < 0.5 ? 'commerce' : 'chat'
  if (s === 'sport' || s === 'academic') return Math.random() < 0.4 ? 'game' : 'chat'
  return Math.random() < 0.4 ? 'game' : 'chat'
}

const DANMAKU_BY_TYPE: Record<DyLiveType, string[]> = {
  chat: [
    '主播今天心情不错啊', '来了来了', '刚下班，蹲一个', '主播声音好听', '唠点啥呀',
    '哈哈哈笑死', '前排占座', '今天播到几点', '主播吃饭了吗', '路过冒个泡',
    '好家伙我又来了', '主播讲讲你的事呗',
  ],
  talent: [
    '唱一首！', '点歌！', '这段太好听了', '再来一个', '主播嗓子绝了',
    '跳舞跳舞', '乐器是自学的吗', '耳朵怀孕了', '求歌名', '666',
    '安可安可', '这个转音绝了',
  ],
  game: [
    '这波操作可以', '主播别浪了', '这局稳了', '哈哈哈哈翻车了', '666666',
    '主播带带我', '快跑快跑', '这个 boss 好难', '赢了吗赢了吗', '这意识可以啊',
    '再打一把', '上分上分',
  ],
  commerce: [
    '这个多少钱', '已下单', '求链接', '小黄车上几号', '好用吗这个',
    '便宜点吧主播', '我买过，不错', '库存还有吗', '包邮吗', '刚刚抢到了',
    '来一单', '什么尺码合适',
  ],
}

const HOST_LINES_BY_TYPE: Record<DyLiveType, string[]> = {
  chat: ['欢迎新进来的朋友～', '刚看到这条弹幕，说得对', '今天人有点多呀，一个个来', '随便聊聊，别拘束', '谢谢礼物，破费了'],
  talent: ['这首送给刚送礼物的朋友', '想听什么打在公屏上', '嗓子有点哑了，多担待', '再来最后一段', '谢谢每一个陪着的人'],
  game: ['这波稳了别慌', '哎呀刚失误了', '下把一定上分', '兄弟们帮我记一下这个点位', '感谢老板的火箭'],
  commerce: ['这个真的自用款', '三二一上链接！', '库存不多了抓紧', '有需要的扣个 1', '这个价格真的到底了'],
}

/** 本地兜底弹幕 */
export function fallbackDanmakuOf(type: DyLiveType): string {
  return pick(DANMAKU_BY_TYPE[type])
}

/** 本地兜底主播台词 */
export function fallbackHostLine(type: DyLiveType): string {
  return pick(HOST_LINES_BY_TYPE[type])
}

export interface DyDanmaku {
  viewerKey: string
  name: string
  text: string
}

/** AI 生成一批观众弹幕；无 API 或失败时返回 null（由调用方兜底） */
export async function aiLiveDanmaku(
  host: DyAuthor,
  type: DyLiveType,
  title: string,
  recent: string[],
  viewers: DyAuthor[],
  count: number
): Promise<DyDanmaku[] | null> {
  if (viewers.length === 0) return null
  const sys = `你是抖音直播间里的一群观众，正在给主播「${host.name}」发弹幕。
【主播人设】${host.persona}
【直播间】${LIVE_TYPE_META[type].label} · ${title}
要求：
1. 生成 ${count} 条真实、口语化的弹幕，每条 12 字以内
2. 语气要多样：夸赞、玩梗、提问、起哄、路人围观都来一点
3. 不要复述直播间标题，不要带引号
${recent.length ? `避免与这些重复：${recent.slice(0, 6).join(' / ')}` : ''}
严格输出 JSON（不要 markdown 代码块）：{"danmaku":["",""]}`

  const rows = parseJson<{ danmaku: string[] }>(await callLLM(sys, '（系统指令：现在生成弹幕，只输出 JSON。）'))
  if (!rows?.danmaku?.length) return null
  const out: DyDanmaku[] = []
  for (const text of rows.danmaku) {
    const t = String(text).replace(/^["“]|["”]$/g, '').slice(0, 24)
    if (!t) continue
    const v = pick(viewers)
    out.push({ viewerKey: v.key, name: v.name, text: t })
  }
  return out.length ? out : null
}

/** AI 生成一句主播的话（回应弹幕 / 观众 / 连麦）；失败时返回本地兜底 */
export async function aiLiveReply(
  host: DyAuthor,
  type: DyLiveType,
  title: string,
  context: string,
  history: string[]
): Promise<string> {
  const sys = `${host.persona}
【抖音直播】你正在开直播（${LIVE_TYPE_META[type].label}），直播标题：${title}
【刚刚发生的事】${context}
${history.length ? `【最近的直播内容】${history.slice(-4).join(' / ')}` : ''}
要求：用符合你人设、口语化的方式回应，像真的在跟直播间观众讲话，20 字以内。
只输出这句话本身，不要旁白、不要引号。`
  const raw = await callLLM(sys, '（系统指令：现在说出这句话，只输出内容。）')
  return raw ? raw.replace(/^["“]|["”]$/g, '').slice(0, 40) : fallbackHostLine(type)
}

export const GIFT_LIST = [
  { id: 'heart', name: '小心心', coins: 1, icon: 'heart' },
  { id: 'lollipop', name: '棒棒糖', coins: 10, icon: 'candy' },
  { id: 'rocket', name: '小火箭', coins: 88, icon: 'rocket' },
  { id: 'crown', name: '皇冠', coins: 520, icon: 'crown' },
  { id: 'castle', name: '梦幻城堡', coins: 1888, icon: 'castle' },
  { id: 'sportscar', name: '跑车', coins: 666, icon: 'car' },
]

export type DyGift = (typeof GIFT_LIST)[number]

// ---------------------------------------------------------------------------
// 主页装扮：滤镜 / 贴纸 / 文字图层 / 主题模板
// ---------------------------------------------------------------------------

export interface DyLayer {
  id: string
  kind: 'sticker' | 'text'
  /** 文字内容（贴纸为空） */
  content: string
  /** 贴纸图标名（DY_ICONS 的键） */
  icon?: string
  /** 归一化坐标 0~1（相对背景） */
  x: number
  y: number
  scale: number
  rot: number
  color?: string
}

export const FILTER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: 'none', label: '原图', css: 'none' },
  { id: 'film', label: '胶片', css: 'saturate(0.86) contrast(1.08) sepia(0.22)' },
  { id: 'mono', label: '黑白', css: 'grayscale(1) contrast(1.12)' },
  { id: 'warm', label: '暖阳', css: 'saturate(1.25) contrast(1.05) hue-rotate(-8deg) brightness(1.06)' },
  { id: 'cool', label: '冷调', css: 'saturate(1.05) contrast(1.05) hue-rotate(12deg) brightness(0.97)' },
  { id: 'dreamy', label: '梦幻', css: 'saturate(1.2) brightness(1.08) blur(0.5px) contrast(0.95)' },
  { id: 'cyber', label: '赛博', css: 'saturate(1.6) contrast(1.2) hue-rotate(-26deg)' },
]

export const THEME_PRESETS: { id: string; label: string; filter: string; accent: string }[] = [
  { id: 'dark', label: '默认黑', filter: 'none', accent: '#fe2c55' },
  { id: 'film', label: '胶片感', filter: 'film', accent: '#c8975f' },
  { id: 'cute', label: '甜心', filter: 'dreamy', accent: '#ff77aa' },
  { id: 'neon', label: '霓虹', filter: 'cyber', accent: '#7c5cff' },
  { id: 'ink', label: '墨白', filter: 'mono', accent: '#cfd6e4' },
  { id: 'sunny', label: '暖阳', filter: 'warm', accent: '#ffa62b' },
]

export const STICKER_PRESETS: { id: string; icon: string; color: string }[] = [
  { id: 'flower', icon: 'flower', color: '#ff77aa' },
  { id: 'cat', icon: 'cat', color: '#ffa62b' },
  { id: 'cake', icon: 'cake', color: '#ff77aa' },
  { id: 'cookie', icon: 'cookie', color: '#c8975f' },
  { id: 'glasses', icon: 'glasses', color: '#8fd3ff' },
  { id: 'ghost', icon: 'ghost', color: '#cfd6e4' },
  { id: 'cherry', icon: 'cherry', color: '#fe2c55' },
  { id: 'zap', icon: 'zap', color: '#ffcf5c' },
  { id: 'crown', icon: 'crown', color: '#ffcf5c' },
  { id: 'star', icon: 'star', color: '#ffcf5c' },
  { id: 'music', icon: 'music', color: '#7c5cff' },
  { id: 'rocket', icon: 'rocket', color: '#8fd3ff' },
  { id: 'party', icon: 'party', color: '#ff77aa' },
  { id: 'disc', icon: 'disc', color: '#7c5cff' },
  { id: 'clover', icon: 'clover', color: '#2ed573' },
  { id: 'plane', icon: 'plane', color: '#8fd3ff' },
  { id: 'wand', icon: 'wand', color: '#7c5cff' },
  { id: 'sparkles', icon: 'sparkles', color: '#ffcf5c' },
]

export const TEXT_COLORS = ['#ffffff', '#fe2c55', '#ffcf5c', '#7c5cff', '#2ed573', '#8fd3ff']

export function filterCss(id: string | undefined): string {
  return FILTER_PRESETS.find((f) => f.id === (id ?? 'none'))?.css ?? 'none'
}

export function themeAccent(id: string | undefined): string {
  return THEME_PRESETS.find((t) => t.id === (id ?? 'dark'))?.accent ?? '#fe2c55'
}

export function makeLayer(
  kind: 'sticker' | 'text',
  content: string,
  extra?: { icon?: string; color?: string }
): DyLayer {
  return {
    id: `ly${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind,
    content,
    icon: kind === 'sticker' ? extra?.icon ?? 'star' : undefined,
    x: 0.5,
    y: 0.42,
    scale: 1,
    rot: 0,
    color: kind === 'text' ? extra?.color ?? '#ffffff' : extra?.color,
  }
}

export function layerStyle(l: DyLayer): CSSProperties {
  return {
    position: 'absolute',
    left: `${l.x * 100}%`,
    top: `${l.y * 100}%`,
    transform: `translate(-50%, -50%) scale(${l.scale}) rotate(${l.rot}deg)`,
    fontSize: l.kind === 'text' ? 17 : 30,
    color: l.color,
    fontWeight: l.kind === 'text' ? 700 : 400,
    textShadow: l.kind === 'text' ? '0 2px 10px rgba(0,0,0,0.55)' : '0 3px 10px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  }
}

// ---------------------------------------------------------------------------
// 推荐算法
// ---------------------------------------------------------------------------

export interface FeedSignals {
  follows: string[]
  dislikedIds: string[]
  /** 作者权重（来自点赞 / 收藏 / 观看历史） */
  authorAffinity: Record<string, number>
  /** 风格权重 */
  styleAffinity: Record<string, number>
}

export function buildSignals(
  videos: DyVideo[],
  s: { liked: string[]; favorites: string[]; history: string[]; follows: string[]; disliked: string[] }
): FeedSignals {
  const byId = new Map(videos.map((v) => [v.id, v]))
  const authorAffinity: Record<string, number> = {}
  const styleAffinity: Record<string, number> = {}
  const bump = (m: Record<string, number>, k: string, w: number) => {
    m[k] = (m[k] ?? 0) + w
  }
  for (const id of s.liked) {
    const v = byId.get(id)
    if (v) {
      bump(authorAffinity, v.author.key, 3)
      bump(styleAffinity, v.style, 2)
    }
  }
  for (const id of s.favorites) {
    const v = byId.get(id)
    if (v) {
      bump(authorAffinity, v.author.key, 2.5)
      bump(styleAffinity, v.style, 1.6)
    }
  }
  for (const id of s.history) {
    const v = byId.get(id)
    if (v) {
      bump(authorAffinity, v.author.key, 1)
      bump(styleAffinity, v.style, 0.8)
    }
  }
  return { follows: s.follows, dislikedIds: s.disliked, authorAffinity, styleAffinity }
}

/** 对视频流打分排序；推荐页混入探索随机，同城页要求有位置并偏向本地 */
export function rankFeed(
  videos: DyVideo[],
  signals: FeedSignals,
  kind: 'recommend' | 'nearby',
  myIp = ''
): DyVideo[] {
  const byId = new Map(videos.map((v) => [v.id, v]))
  const dislikedAuthors = new Set<string>()
  for (const id of signals.dislikedIds) {
    const v = byId.get(id)
    if (v) dislikedAuthors.add(v.author.key)
  }
  const pool = kind === 'nearby' ? videos.filter((v) => v.location && v.location !== '不显示') : videos
  const now = Date.now()
  return pool
    .map((v) => {
      if (signals.dislikedIds.includes(v.id)) return { v, score: -999 }
      let score = 0
      score += Math.log10(v.stats.likes + v.stats.comments * 2 + v.stats.shares * 3 + 10) * 1.2
      const ageHours = (now - v.createdAt) / 3_600_000
      score += Math.max(0, 3 - ageHours / 24)
      if (signals.follows.includes(v.author.key)) score += 8
      score += (signals.authorAffinity[v.author.key] ?? 0) * 1.5
      score += (signals.styleAffinity[v.style] ?? 0) * 0.9
      if (dislikedAuthors.has(v.author.key)) score -= 6
      if (v.author.key === 'user' || v.author.key.startsWith('mask:')) score += 0.6
      if (v.live) score += 1.5
      if (kind === 'nearby' && myIp && v.location === myIp) score += 6
      score += Math.random() * 2.2
      return { v, score }
    })
    .filter((x) => x.score > -900)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.v)
}

/** 推荐理由（用于展示在视频信息栏） */
export function recommendReason(v: DyVideo, signals: FeedSignals, myIp = ''): string | null {
  if (signals.follows.includes(v.author.key)) return '你关注的创作者'
  if ((signals.authorAffinity[v.author.key] ?? 0) >= 3) return '你可能喜欢这位创作者'
  if ((signals.styleAffinity[v.style] ?? 0) >= 2) return '根据你的兴趣推荐'
  if (myIp && v.location === myIp) return '同城内容'
  if (v.live) return '正在直播'
  return null
}