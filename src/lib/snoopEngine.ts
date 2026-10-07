import type { Character } from '../store/characters'
import { getDefaultChatPreset } from '../store/apiPresets'
import { streamChat } from './api'
import { buildCharacterPrompt, splitReply } from './chatEngine'
import { useChats } from '../store/chats'

/* ============================================================
   「查手机」内容生成引擎
   按角色生成一整套手机数据快照（微信/备忘录/浏览器/钱包/音乐/定位/
   私密空间/游戏/购物/视频/小号），并把柄浓度、性格影响生成倾向
   ============================================================ */

export type SnoopModuleId =
  | 'wechat'
  | 'memo'
  | 'browser'
  | 'wallet'
  | 'music'
  | 'map'
  | 'games'
  | 'shopping'
  | 'video'
  | 'forum'
  | 'private'

export type ModuleTier = 'private' | 'medium' | 'light'

export interface SnoopModuleMeta {
  id: SnoopModuleId
  name: string
  emoji: string
  tier: ModuleTier
  /** 一句话简介 */
  hint: string
}

export const SNOOP_MODULES: SnoopModuleMeta[] = [
  { id: 'wechat', name: '微信 / QQ', emoji: '💬', tier: 'private', hint: '聊天记录 · 联系人' },
  { id: 'memo', name: '备忘录', emoji: '📝', tier: 'private', hint: '公开 / 私密笔记' },
  { id: 'browser', name: '浏览器', emoji: '🌐', tier: 'private', hint: '搜索 / 书签 / 下载' },
  { id: 'wallet', name: '钱包账单', emoji: '💰', tier: 'medium', hint: '余额 / 收支明细' },
  { id: 'music', name: '音乐', emoji: '🎵', tier: 'light', hint: '最近播放 / 歌单' },
  { id: 'map', name: '地图定位', emoji: '📍', tier: 'medium', hint: '今日到访地点' },
  { id: 'games', name: '游戏库', emoji: '🎮', tier: 'medium', hint: '段位 / 队友 / 战绩' },
  { id: 'shopping', name: '购物', emoji: '🛒', tier: 'light', hint: '浏览 / 订单 / 收藏' },
  { id: 'video', name: '视频', emoji: '📺', tier: 'light', hint: '观看 / 收藏 / 弹幕' },
  { id: 'forum', name: '社交小号', emoji: '👤', tier: 'private', hint: '隐藏账号 / 发帖' },
  { id: 'private', name: '私密空间', emoji: '🔒', tier: 'private', hint: '隐藏相册 / 私密对话' },
]

export const SECURITY_COST: Record<ModuleTier, number> = { private: 15, medium: 8, light: 5 }

/** 预设敏感词库：暧昧 / 骂人 / 秘密 各 20 条 */
export const DEFAULT_SENSITIVE: string[] = [
  // 暧昧
  '宝贝', '亲爱的', '想你', '晚安', '抱抱', '亲亲', '心动', '暗恋', '约会', '暧昧',
  '撒娇', '小可爱', '老婆', '老公', '么么', '牵手', '接吻', '告白', '前任', '在一起',
  // 骂人
  '滚', '烦死了', '讨厌', '笨蛋', '闭嘴', '神经病', '有病', '恶心', '废物', '垃圾',
  '别烦我', '关你什么事', '无语', '离谱', '过分', '幼稚', '可笑', '烦人', '欠揍', '拉黑',
  // 秘密
  '不能说', '保密', '别告诉', '偷偷', '瞒着', '秘密', '隐藏', '删掉', '别被发现', '小心点',
  '私下', '悄悄', '别让人知道', '藏起来', '匿名', '小号', '开房', '酒店', '凌晨', '瞒',
]

/* ---------------- 随机工具 ---------------- */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function picks<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}
function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}
/** 由字符串派生稳定伪随机（用于密码等需要固定的值） */
export function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ---------------- 数据结构 ---------------- */

export interface SnoopContact {
  id: string
  name: string
  tag?: '置顶' | '公众号' | '其他NPC'
  last: string
  time: string
  unread: number
  blocked?: boolean
  muted?: boolean
  secret?: boolean
}
export interface SnoopChatMsg {
  id: string
  from: 'me' | 'other'
  text: string
  time: string
  type: 'text' | 'emoji' | 'image' | 'voice' | 'transfer'
  sensitive?: boolean
}
export interface SnoopMemo {
  id: string
  title: string
  body: string
  updated: string
  locked?: boolean
}
export interface SnoopSearch {
  word: string
  time: string
  sensitive?: boolean
}
export interface SnoopBookmark {
  folder: string
  title: string
}
export interface SnoopDownload {
  name: string
  time: string
  size: string
}
export interface SnoopBill {
  id: string
  kind: '消费' | '收入' | '转账'
  amount: number
  target: string
  time: string
  status: '成功' | '处理中'
  flag?: 'game' | 'suspicious' | 'big'
}
export interface SnoopTrack {
  name: string
  artist: string
  plays: number
}
export interface SnoopPlace {
  name: string
  arrive: string
  leave: string
  stay: string
  kind: 'normal' | 'unusual'
}
export interface SnoopGame {
  id: string
  name: string
  rank: string
  hours: number
  lastPlay: string
  teammates: { name: string; tag?: '异性' | '常玩' }[]
  chats: string[]
  night?: boolean
}
export interface SnoopItem {
  id: string
  name: string
  price?: string
  time: string
  views?: number
  gift?: boolean
}
export interface SnoopOrder {
  id: string
  kind: '外卖' | '网购' | '二手'
  shop: string
  detail: string
  address: string
  time: string
  price: string
  status: string
  offAddress?: boolean
  gift?: boolean
}
export interface SnoopVideo {
  id: string
  title: string
  progress: string
  time: string
}
export interface SnoopAccount {
  id: string
  platform: string
  name: string
  fans: number
  posts: string[]
  dms: string[]
  browsed: string[]
}
export interface SnoopPhoneData {
  device: { battery: number; charging: boolean; used: number; total: number; screenMin: number; network: string }
  wechat: { contacts: SnoopContact[]; chats: Record<string, SnoopChatMsg[]> }
  memos: SnoopMemo[]
  browser: { searches: SnoopSearch[]; bookmarks: SnoopBookmark[]; downloads: SnoopDownload[] }
  wallet: { balance: number; bills: SnoopBill[] }
  music: { recent: SnoopTrack[]; playlists: { name: string; songs: SnoopTrack[] }[]; nowPlaying: SnoopTrack; loop?: string }
  map: { places: SnoopPlace[]; current: string }
  games: SnoopGame[]
  shopping: { history: SnoopItem[]; orders: SnoopOrder[]; favorites: SnoopItem[] }
  video: { history: SnoopVideo[]; favorites: SnoopVideo[]; later: SnoopVideo[]; danmaku: string[]; comments: string[] }
  forum: SnoopAccount[]
  private: { photos: string[]; chats: SnoopChatMsg[]; memos: SnoopMemo[] }
  evidence: number
}

/* ---------------- 词库 ---------------- */

const NAMES = ['小雅', '阿哲', 'Kiki', '阿凯', '晓雯', 'Leo', '思思', '大熊', 'Nico', '月月', '老周', '阿May', '子豪', '琪琪', '阿杰']
const OFFICIAL = ['订阅号助手', '城市热榜', '外卖券管家', '健身打卡']
const WOMEN = ['小雅', 'Kiki', '晓雯', '思思', 'Nico', '月月', '阿May', '琪琪']
const MEN = ['阿哲', '阿凯', 'Leo', '大熊', '老周', '子豪', '阿杰']

const AMBIGUOUS = [
  '今天有点想你',
  '晚安，做个好梦～',
  '你是不是对谁都这么好',
  '刚刚路过你家楼下',
  '明天有空吗，想请你吃饭',
  '这首歌让我想起你',
  '你在我心里是不一样的',
]
const DAILY = ['在忙吗', '吃了吗', '明天记得带伞', '会议改到几点了', '文件发你了', '哈哈哈哈哈', '知道了', '晚点说', '收到', '这个周末一起？']
const COLD = ['嗯。', '在忙。', '再说吧。', '知道了。', '没什么。', '随便。']
const HIDDEN = ['没事，别问了', '这件事先别告诉别人', '我晚点跟你解释', '别让他知道', '就当我们没聊过', '删了吧，别被发现']

const MEMO_PUBLIC = [
  { title: '待办', body: '明天记得交电费\n下班顺路取快递' },
  { title: '想买', body: '那双白色的鞋，纠结好久了' },
  { title: '周末', body: '去看展 / 剪头发 / 睡到自然醒' },
  { title: '购物清单', body: '牛奶、鸡蛋、洗衣液、猫粮' },
  { title: '工作', body: '周三前把方案初稿发出去' },
]
const MEMO_SECRET = [
  { title: '深夜想法', body: '我是不是喜欢上他了\n明明不该这样的' },
  { title: '那天', body: '那天没说实话，其实是去见了一个人' },
  { title: '纠结', body: '要不要结束这段关系，可是舍不得' },
  { title: '抱歉', body: '对不起，我又撒谎了' },
  { title: '如果', body: '如果当初没有答应就好了' },
]

const SEARCH_NORMAL = ['附近好吃的', '怎么修图', '明天天气', '地铁末班车几点', '感冒吃什么药', 'Excel 技巧', '机票比价']
const SEARCH_SECRET = ['怎么拒绝一个人', '分手后怎么走出来', '被发现了怎么办', '异地恋怎么维持', '他到底喜不喜欢我', '怎么删除聊天记录', '开房记录能查到吗']
const BOOKMARK_FOLDERS = ['学习', '购物', '娱乐', '工具', '收藏夹']
const DOWNLOAD_NAMES = ['旅行攻略.pdf', '表情包.zip', '合同.docx', '旅行照.jpg', '体检报告.pdf', '课程视频.mp4']

const MUSIC_HAPPY = [
  { name: '晴天', artist: '周杰伦' },
  { name: '小幸运', artist: '田馥甄' },
  { name: '海阔天空', artist: 'Beyond' },
  { name: '起风了', artist: '买辣椒也用券' },
]
const MUSIC_SAD = [
  { name: '后来', artist: '刘若英' },
  { name: '慢冷', artist: '梁静茹' },
  { name: '孤勇者', artist: '陈奕迅' },
  { name: '说散就散', artist: '袁娅维' },
  { name: '我怀念的', artist: '孙燕姿' },
]
const PLAYLIST_NAMES = ['通勤循环', '深夜emo', '他不懂', '算了吧', '一个人的时候', '不想说话']

const PLACES_HOME = ['家', '公司', '学校', '健身房', '常去的便利店']
const PLACES_UNUSUAL = ['XX酒店', 'KTV 金座', '某小区楼下', '酒吧街', '深夜烧烤摊', '陌生公寓']

const GAMES = ['王者荣耀', '和平精英', '原神', '英雄联盟', '蛋仔派对', '第五人格']

const SHOP_ITEMS = ['无线耳机', '机械键盘', '猫粮 2kg', '白衬衫', '香薰蜡烛', '旅行背包', '充电宝']
const GIFTS = ['打火机', '香水', '项链', '口红', '围巾', '手链']

const VIDEO_TITLES = ['深夜食堂', '爱在黎明破晓前', '孤独的美食家', '脱口秀大会', '三体', '海边的曼彻斯特', '乐队的夏天']
const DANMAKU = ['哈哈哈哈哈', '笑死', '这也太真实了', '呜呜呜', '破防了', '泪目', '前排', '考古的来了']

/* ---------------- 生成器 ---------------- */

function timeStr(): string {
  return `${String(randInt(0, 23)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}`
}

/** 把柄浓度 → 敏感内容出现概率 */
function evidenceRate(evidence: number): number {
  return 0.15 + (evidence / 100) * 0.75
}

export function scanSensitive(text: string, words: string[]): string[] {
  const hits: string[] = []
  for (const w of words) if (w && text.includes(w)) hits.push(w)
  return hits
}

/** 判断角色是否为「没安全感 / 心虚 / 愤怒」型，用于锁机文案 */
export function personalityBucket(c: Character): 'anxious' | 'guilty' | 'angry' {
  const t = `${c.personality} ${c.commStyle} ${(c.tags ?? []).join(' ')}`
  if (/高冷|冷淡|强势|暴躁|脾气|毒舌|愤怒|凶/.test(t)) return 'angry'
  if (/敏感|多疑|焦虑|没安全感|粘人|患得患失|内向/.test(t)) return 'anxious'
  return 'guilty'
}

function makeContacts(c: Character, evidence: number): { contacts: SnoopContact[]; chats: Record<string, SnoopChatMsg[]> } {
  const rate = evidenceRate(evidence)
  const useWomen = /女|她|女友|老婆|姐姐|妹/.test(`${c.identity} ${c.appearance}`)
  const pool = useWomen ? MEN : WOMEN
  const contacts: SnoopContact[] = []
  const chats: Record<string, SnoopChatMsg[]> = {}

  // 常规联系人
  const normals = picks(NAMES, randInt(4, 6))
  for (const name of normals) contacts.push({ id: `c_${name}`, name, last: pick(DAILY), time: timeStr(), unread: 0 })
  // 置顶
  contacts.unshift({ id: 'c_pin', name: pick(pool), tag: '置顶', last: pick(rate > 0.5 ? AMBIGUOUS : DAILY), time: timeStr(), unread: randInt(0, 3), secret: Math.random() < rate })
  // 公众号
  contacts.push({ id: `c_off_${randInt(1, 9)}`, name: pick(OFFICIAL), tag: '公众号', last: '今日推文已更新', time: timeStr(), unread: 0 })
  // 其他 NPC
  contacts.push({ id: `c_npc_${randInt(1, 9)}`, name: pick(NAMES), tag: '其他NPC', last: pick(DAILY), time: timeStr(), unread: 0 })
  // 可疑小号
  if (Math.random() < rate) {
    contacts.push({ id: 'c_secret', name: pick(pool), last: pick(AMBIGUOUS), time: '凌晨 ' + timeStr(), unread: randInt(1, 5), secret: true })
  }
  if (Math.random() < rate) contacts.push({ id: 'c_block', name: pick(pool), last: '对方已开启好友验证', time: timeStr(), unread: 0, blocked: true })
  if (Math.random() < 0.4) contacts.push({ id: 'c_mute', name: pick(NAMES), last: pick(DAILY), time: timeStr(), unread: 0, muted: true })

  // 给部分联系人生成聊天记录
  for (const ct of contacts) {
    if (ct.tag === '公众号') continue
    const n = randInt(4, 8)
    const msgs: SnoopChatMsg[] = []
    for (let i = 0; i < n; i++) {
      const from: 'me' | 'other' = Math.random() < 0.5 ? 'me' : 'other'
      let text: string
      const r = Math.random()
      if (ct.secret && r < rate) text = pick([...AMBIGUOUS, ...HIDDEN])
      else if (ct.blocked) text = '你已被对方拉黑'
      else if (r < 0.2) text = pick(COLD)
      else text = pick([...DAILY, ...AMBIGUOUS])
      const type: SnoopChatMsg['type'] = r < 0.08 ? 'image' : r < 0.14 ? 'voice' : r < 0.18 ? 'transfer' : r < 0.24 ? 'emoji' : 'text'
      if (type === 'transfer') text = `¥${randInt(52, 520)}`
      if (type === 'image') text = '[图片]'
      if (type === 'voice') text = `[语音 ${randInt(2, 18)}"]`
      if (type === 'emoji') text = pick(['😂', '🙄', '🥰', '😅'])
      msgs.push({ id: `m${i}`, from, text, time: timeStr(), type })
    }
    chats[ct.id] = msgs
  }
  return { contacts, chats }
}

function makeMemos(evidence: number): SnoopMemo[] {
  const rate = evidenceRate(evidence)
  const list: SnoopMemo[] = picks(MEMO_PUBLIC, randInt(2, 3)).map((m, i) => ({
    id: `pub${i}`,
    title: m.title,
    body: m.body,
    updated: timeStr(),
  }))
  if (Math.random() < 0.5 + rate * 0.5) {
    const s = pick(MEMO_SECRET)
    list.push({ id: 'sec0', title: '🔒 已锁定', body: s.body, updated: timeStr(), locked: true })
  }
  return list
}

function makeBrowser(evidence: number): SnoopPhoneData['browser'] {
  const rate = evidenceRate(evidence)
  const searches: SnoopSearch[] = []
  const pool = Math.random() < rate ? [...SEARCH_NORMAL.slice(0, 3), ...picks(SEARCH_SECRET, randInt(1, 3))] : SEARCH_NORMAL
  for (const w of picks(pool, randInt(4, 6))) searches.push({ word: w, time: timeStr() })
  const bookmarks: SnoopBookmark[] = picks(BOOKMARK_FOLDERS, randInt(3, 5)).map((f) => ({ folder: f, title: pick(SEARCH_NORMAL) }))
  const downloads: SnoopDownload[] = picks(DOWNLOAD_NAMES, randInt(2, 4)).map((n) => ({ name: n, time: timeStr(), size: `${(Math.random() * 200 + 1).toFixed(1)}MB` }))
  return { searches, bookmarks, downloads }
}

function makeWallet(evidence: number): SnoopPhoneData['wallet'] {
  const rate = evidenceRate(evidence)
  const bills: SnoopBill[] = []
  const n = randInt(6, 9)
  for (let i = 0; i < n; i++) {
    const kind: SnoopBill['kind'] = pick(['消费', '收入', '转账'])
    const amount = pick([12.5, 38, 68, 128, 199, 328, 648, 1024])
    const target = kind === '转账' ? pick(NAMES) : pick(['美团外卖', '星巴克', '京东', '地铁', '便利店', '电影院', '王者荣耀', '某酒店'])
    const bill: SnoopBill = { id: `b${i}`, kind, amount, target, time: `今天 ${timeStr()}`, status: Math.random() < 0.15 ? '处理中' : '成功' }
    if (/王者|游戏/.test(target)) bill.flag = 'game'
    if (kind === '转账' && Math.random() < rate) bill.flag = 'suspicious'
    if (amount >= 500) bill.flag = bill.flag ?? 'big'
    bills.push(bill)
  }
  return { balance: randInt(200, 9800) + Math.random(), bills }
}

function makeMusic(c: Character, evidence: number): SnoopPhoneData['music'] {
  const sad = Math.random() < evidenceRate(evidence)
  const base = sad ? MUSIC_SAD : MUSIC_HAPPY
  const recent: SnoopTrack[] = picks([...base, ...MUSIC_HAPPY, ...MUSIC_SAD], randInt(4, 6)).map((t) => ({ ...t, plays: randInt(3, 120) }))
  const playlists = picks(PLAYLIST_NAMES, randInt(2, 3)).map((name) => ({ name, songs: picks([...MUSIC_HAPPY, ...MUSIC_SAD], 3).map((t) => ({ ...t, plays: randInt(1, 50) })) }))
  const nowPlaying = pick(recent)
  const loop = Math.random() < 0.35 ? nowPlaying.name : undefined
  return { recent, playlists, nowPlaying, loop }
}

function makeMap(evidence: number): SnoopPhoneData['map'] {
  const rate = evidenceRate(evidence)
  const places: SnoopPlace[] = []
  for (const name of picks(PLACES_HOME, randInt(1, 2))) {
    places.push({ name, arrive: timeStr(), leave: timeStr(), stay: `${randInt(1, 3)}h`, kind: 'normal' })
  }
  const unusual = Math.random() < rate ? picks(PLACES_UNUSUAL, randInt(1, 2)) : []
  for (const name of unusual) {
    places.push({ name, arrive: timeStr(), leave: timeStr(), stay: `${randInt(30, 180)}min`, kind: 'unusual' })
  }
  return { places: places.sort(() => Math.random() - 0.5), current: pick(places).name }
}

function makeGames(evidence: number): SnoopGame[] {
  const rate = evidenceRate(evidence)
  return picks(GAMES, randInt(2, 3)).map((name, i) => {
    const night = Math.random() < 0.4
    const tmCount = randInt(1, 3)
    const useWomen = Math.random() < 0.9
    return {
      id: `g${i}`,
      name,
      rank: pick(['黄金', '铂金', '钻石', '星耀', '王者', '大师']),
      hours: randInt(20, 800),
      lastPlay: night ? `昨天 23:${String(randInt(10, 59))}` : `今天 ${timeStr()}`,
      night,
      teammates: picks(useWomen ? WOMEN : MEN, tmCount).map((n) => ({ name: n, tag: Math.random() < rate ? '异性' : '常玩' })),
      chats: picks(['今晚还约吗', '打野让给我', '别送啊', '上分上分', '你声音真好听', '带我一把'], randInt(2, 4)),
    }
  })
}

function makeShopping(evidence: number): SnoopPhoneData['shopping'] {
  const rate = evidenceRate(evidence)
  const history: SnoopItem[] = picks(SHOP_ITEMS, randInt(4, 6)).map((name, i) => ({ id: `h${i}`, name, time: timeStr(), views: randInt(1, 12) }))
  const favorites: SnoopItem[] = picks([...SHOP_ITEMS, ...GIFTS], randInt(4, 6)).map((name, i) => ({ id: `f${i}`, name, price: `¥${randInt(29, 899)}`, time: timeStr(), gift: GIFTS.includes(name) }))
  const orders: SnoopOrder[] = []
  const n = randInt(3, 5)
  for (let i = 0; i < n; i++) {
    const kind = pick(['外卖', '网购', '二手'] as const)
    const off = Math.random() < rate
    orders.push({
      id: `o${i}`,
      kind,
      shop: kind === '外卖' ? pick(['川菜馆', '日料屋', '米粉店', '肯德基']) : pick(['京东', '淘宝', '闲鱼']),
      detail: kind === '外卖' ? pick(['麻辣香锅 x1', '寿司套餐 x1', '牛肉粉 x2']) : pick(SHOP_ITEMS),
      address: off ? pick(['XX酒店大堂', '某小区 3 栋', '公司前台']) : '家（默认地址）',
      time: `今天 ${timeStr()}`,
      price: `¥${randInt(18, 699)}`,
      status: pick(['已送达', '运输中', '待发货', '已完成']),
      offAddress: off,
      gift: Math.random() < rate * 0.6,
    })
  }
  return { history, favorites, orders }
}

function makeVideo(evidence: number): SnoopPhoneData['video'] {
  const rate = evidenceRate(evidence)
  const history: SnoopVideo[] = picks(VIDEO_TITLES, randInt(4, 6)).map((t, i) => ({ id: `v${i}`, title: t, progress: `${randInt(10, 100)}%`, time: timeStr() }))
  const favorites: SnoopVideo[] = picks(VIDEO_TITLES, randInt(3, 5)).map((t, i) => ({ id: `vf${i}`, title: t, progress: '已看完', time: timeStr() }))
  const later: SnoopVideo[] = picks(VIDEO_TITLES, randInt(2, 4)).map((t, i) => ({ id: `vl${i}`, title: t, progress: '未开始', time: timeStr() }))
  const danmaku = picks(DANMAKU, randInt(2, 5))
  const comments = picks(['这也太好看了', '已三刷', '强烈推荐', '有点无聊', '看哭了'], randInt(2, 4))
  if (Math.random() < rate) comments.push(pick(SEARCH_SECRET))
  return { history, favorites, later, danmaku, comments }
}

function makeForum(evidence: number): SnoopAccount[] {
  const rate = evidenceRate(evidence)
  const plats = ['微博', '小红书', '豆瓣', '贴吧']
  return picks(plats, randInt(1, 2)).map((p, i) => ({
    id: `a${i}`,
    platform: p,
    name: pick(['夜航船', '匿名的小 A', '不想上班', '晚风', 'momo']),
    fans: randInt(3, 4200),
    posts: picks(['今天也是emo的一天', '有人懂这种感觉吗', '说不出口的话', '算了，睡吧', '成年人的崩溃'], randInt(2, 4)),
    dms: Math.random() < rate ? picks(HIDDEN, randInt(1, 3)) : picks(['在吗', '你好', '谢谢关注'], randInt(1, 2)),
    browsed: picks(['情感区', '树洞', '分手挽回', '匿名吐槽'], randInt(2, 4)),
  }))
}

function makePrivate(c: Character, evidence: number): SnoopPhoneData['private'] {
  const rate = evidenceRate(evidence)
  const photos = picks(['截图_聊天记录.png', 'IMG_2201.jpg', '夜景.jpg', '两个人的影子.jpg', '酒店走廊.png', '礼物.jpg'], randInt(3, 5))
  const chats: SnoopChatMsg[] = []
  for (let i = 0; i < randInt(4, 7); i++) {
    chats.push({
      id: `p${i}`,
      from: Math.random() < 0.5 ? 'me' : 'other',
      text: pick([...AMBIGUOUS, ...HIDDEN, ...COLD]),
      time: timeStr(),
      type: 'text',
    })
  }
  const memos: SnoopMemo[] = picks(MEMO_SECRET, randInt(1, 3)).map((m, i) => ({ id: `pm${i}`, title: m.title, body: m.body, updated: timeStr() }))
  return { photos, chats, memos }
}

/** 生成整套手机数据快照 */
export function generateSnoopData(c: Character, evidence: number): SnoopPhoneData {
  const { contacts, chats } = makeContacts(c, evidence)
  return {
    device: {
      battery: randInt(12, 96),
      charging: Math.random() < 0.4,
      used: randInt(48, 118),
      total: 128,
      screenMin: randInt(120, 480),
      network: pick(['WiFi · home_5G', '4G', '5G', 'WiFi · office']),
    },
    wechat: { contacts, chats },
    memos: makeMemos(evidence),
    browser: makeBrowser(evidence),
    wallet: makeWallet(evidence),
    music: makeMusic(c, evidence),
    map: makeMap(evidence),
    games: makeGames(evidence),
    shopping: makeShopping(evidence),
    video: makeVideo(evidence),
    forum: makeForum(evidence),
    private: makePrivate(c, evidence),
    evidence,
  }
}

/** 锁机文案：按角色性格分型 */
export function lockMessage(c: Character): string {
  const bucket = personalityBucket(c)
  if (bucket === 'anxious') return '你在看我手机？'
  if (bucket === 'angry') return '我们得聊聊。'
  return '谁让你翻我手机的！'
}

/** 被抓时的质问消息 */
export function caughtMessage(c: Character): string {
  const bucket = personalityBucket(c)
  if (bucket === 'anxious') return '你是不是在翻我手机…？我不安了。'
  if (bucket === 'angry') return '我看到你动我手机了，给我解释一下。'
  return '等等…你刚才是不是翻我手机了？'
}

/* ---------------- 对峙：把质问发进聊天并让角色回应 ---------------- */

export function confrontInChat(c: Character, quote: { name: string; content: string }, claim: string): void {
  const sid = useChats.getState().getOrCreateSession(c.id)
  useChats.getState().addMessage(sid, {
    role: 'user',
    type: 'text',
    content: `你手机里这条「${quote.content}」是怎么回事？${claim}`,
    data: { quote },
  })
  void respondToConfront(sid, c, quote, claim)
}

async function callLLM(sys: string, user: string): Promise<string | null> {
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return null
  try {
    const raw = await streamChat(preset, [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ], { onDelta: () => {} })
    return raw?.trim() || null
  } catch {
    return null
  }
}

async function respondToConfront(
  sessionId: string,
  c: Character,
  quote: { name: string; content: string },
  claim: string
): Promise<void> {
  const guilty = /暧昧|宝贝|想你|开房|酒店|偷偷|别被发现|秘密|凌晨/.test(`${quote.content} ${claim}`)
  let texts: string[] = []
  const sys = `${buildCharacterPrompt(c)}
【场景】对方翻看了你的手机，拿着一条记录来质问你。
【被质问的记录】来自：${quote.name}｜内容：${quote.content}
【你此刻的处境】${guilty ? '你确实有说不清的地方，心里发虚。' : '这条记录其实没什么，你被误会了。'}
【任务】用你自己的语气回应质问，发 1-2 条短消息（30 字内）。
${guilty ? '先慌乱辩解，可能嘴硬也可能松口，不要直接全盘承认。' : '理直气壮，可以反过来质疑对方翻你手机。'}
只输出聊天内容本身，多条之间换行分隔。`
  const raw = await callLLM(sys, '（系统指令：现在写出你的回应。）')
  if (raw) texts = splitReply(raw).slice(0, 2)
  if (texts.length === 0) texts = [guilty ? '你…你怎么翻我手机啊？' : '这有什么好问的，你想多了。']
  for (const t of texts) {
    useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: t })
    await new Promise((r) => setTimeout(r, 420))
  }
}