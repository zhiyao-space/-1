import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DISTRICTS,
  EMOTIONS,
  LANDMARKS,
  JOBS,
  METRO_LINES,
  NEWS_CATEGORIES,
  WEATHERS,
  buildSeedBookmarks,
  buildSeedBrowserTabs,
  buildSeedCalendar,
  buildSeedCommunities,
  buildSeedGameTemplates,
  buildSeedGroups,
  buildSeedHotSearch,
  buildSeedIndices,
  buildSeedMicroblog,
  buildSeedNews,
  buildSeedPeople,
  buildSeedPosts,
  buildSeedQuickLinks,
  buildSeedShows,
  buildSeedSpaces,
  buildSeedStocks,
  buildSeedTrending,
  buildSeedWorldEvents,
  cityId,
  genCandles,
  genOrderBook,
  localGameEvent,
  localMeetLine,
  localMicroblogPost,
  localMoveLine,
  localNews,
  localPerson,
  localStockNews,
  localTrendingTopics,
  localWorldEvent,
  pick,
  pickSome,
  randInt,
} from '../lib/cityCatalog'
import { allLibraryPeople } from '../lib/libraryPeople'

/* ============================================================
   Mul市 · 数据层
   城市 / 市籍 / 出行 / 演出 / 公共服务 / 社交 / 工作 / 管理
   全部 localStorage 持久化；与商城、恋爱 App 数据互通
   ============================================================ */

export type PersonType = 'user' | 'character' | 'npc'
export type RelationType =
  | 'self'
  | 'family'
  | 'friend'
  | 'colleague'
  | 'classmate'
  | 'crush'
  | 'couple'
  | 'enemy'
  | 'stranger'
export type Gender = 'male' | 'female' | 'other'
export type Repeat = 'daily' | 'weekly' | 'once'
export type TicketKind = 'flight' | 'train' | 'high-speed' | 'metro'
export type TicketStatus = 'booked' | 'ongoing' | 'done'
export type ShowKind = 'concert' | 'theater' | 'exhibition'
export type ShowTicketStatus = 'upcoming' | 'used' | 'expired'
export type AdminPermission =
  | 'createPerson'
  | 'editPerson'
  | 'deletePerson'
  | 'createEvent'
  | 'manageTicket'
  | 'manageRegistry'
  | 'resetWorld'

export interface PersonAttrs {
  intelligence: number
  emotional: number
  aesthetic: number
  courage: number
  fitness: number
  luck: number
  socialCredit: number
  level: number
  cityContribution: number
}

export interface Relation {
  personId: string
  type: RelationType
  affinity: number
  memories: string[]
}

export interface ScheduleItem {
  id: string
  time: string
  activity: string
  locationId: string
  duration: number
  repeat: Repeat
}

export interface TaskItem {
  id: string
  text: string
  done: boolean
  rewardExp: number
  rewardMoney: number
}

export interface Person {
  id: string
  type: PersonType
  name: string
  nickname: string
  avatar: string
  /** 自定义头像（从相册导入后存入 IndexedDB 的图片 id） */
  avatarId?: string
  /** 自定义封面大图（IndexedDB 的图片 id） */
  coverId?: string
  civilId: string
  gender: Gender
  age: number
  birthday: string
  birthPlace: string
  address: string
  occupation: string
  phone: string
  bio: string
  zodiac: string
  mbti: string
  hobbies: string[]
  attributes: PersonAttrs
  relationships: Relation[]
  schedule: ScheduleItem[]
  dailyTasks: TaskItem[]
  mood: number
  energy: number
  health: number
  rank: string
  isAdmin: boolean
  bankAccount: number
  monthlyIncome: number
  monthlyExpenses: number
  skills: string[]
  wardrobe: string[]
  inventory: string[]
  family: string[]
  memory: string[]
  lastSeenLocation: string
  lastActive: number
  sleepSchedule: { wakeHour: number; sleepHour: number; isNightOwl: boolean }
  isOnline: boolean
  currentEmotion: string
  createdAt: number
}

export interface District {
  id: string
  name: string
  description: string
  landmarks: string[]
  crimeRate: number
  cleanliness: number
  population: number
}

export interface Landmark {
  id: string
  name: string
  type: string
  districtId: string
  description: string
  /** 地图坐标，0-100 */
  x: number
  y: number
  /** 当前在此处的人（由人物 lastSeenLocation 派生展示） */
  capacity: number
}

export interface WorldEvent {
  id: string
  title: string
  type: string
  locationId: string
  time: number
  involvedPersons: string[]
  description: string
  outcome: string
  createdAt: number
}

export interface TransportTicket {
  id: string
  kind: TicketKind
  from: string
  to: string
  departAt: number
  arriveAt: number
  seat: string
  gate: string
  price: number
  code: string
  passengerId: string
  status: TicketStatus
  createdAt: number
}

export interface ShowEvent {
  id: string
  kind: ShowKind
  title: string
  artist: string
  venue: string
  startAt: number
  endAt: number
  priceMin: number
  priceMax: number
  seatsTotal: number
  seatsLeft: number
  description: string
  /** 开售时间；晚于当前时间则为待抢票 */
  saleAt: number
  createdAt: number
}

export interface ShowTicket {
  id: string
  showId: string
  zone: string
  seat: string
  price: number
  personId: string
  status: ShowTicketStatus
  createdAt: number
}

export interface MedicalRecord {
  id: string
  personId: string
  dept: string
  symptom: string
  diagnosis: string
  prescription: string[]
  cost: number
  at: number
}

export interface Loan {
  id: string
  kind: 'mortgage' | 'car' | 'credit'
  principal: number
  rate: number
  months: number
  remaining: number
  at: number
}

export interface Bill {
  id: string
  title: string
  amount: number
  dueAt: number
  paid: boolean
}

export interface BankProfile {
  personId: string
  balance: number
  creditLimit: number
  loans: Loan[]
  bills: Bill[]
}

export interface Course {
  id: string
  title: string
  skill: string
  level: number
  price: number
  weeks: number
  teacher: string
}

export interface CourseEnroll {
  id: string
  courseId: string
  personId: string
  progress: number
  done: boolean
  score: number | null
}

export interface Letter {
  id: string
  fromId: string
  toId: string
  kind: 'letter' | 'parcel'
  content: string
  at: number
}

export interface Job {
  id: string
  title: string
  salary: number
  levelReq: number
  skillReq: string
  creditReq: number
  desc: string
  tags: string[]
}

export interface PostComment {
  id: string
  personId: string
  text: string
  at: number
}

export interface Post {
  id: string
  personId: string
  text: string
  images: string[]
  tags: string[]
  likes: string[]
  comments: PostComment[]
  at: number
}

export interface GroupMessage {
  id: string
  personId: string
  text: string
  at: number
}

export interface GroupChat {
  id: string
  name: string
  memberIds: string[]
  topics: string[]
  messages: GroupMessage[]
  createdAt: number
}

export interface Encounter {
  id: string
  personId: string
  locationId: string
  text: string
  relationType: RelationType
  at: number
}

/** 城市自转产生的实时动态 */
export type ActivityKind = 'move' | 'meet' | 'event'
export interface ActivityItem {
  id: string
  kind: ActivityKind
  text: string
  at: number
  landmarkId: string
  personIds: string[]
}

/* ============================================================
   新闻资讯 / 微博 / 浏览器 / 股市 / 事件引擎
   ============================================================ */

export type NewsCategory = 'Mul市要闻' | '财经' | '科技' | '娱乐' | '体育' | '社会' | '国际'

export interface NewsComment {
  id: string
  personId: string
  text: string
  at: number
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  body: string
  category: NewsCategory
  source: string
  author: string
  images: string[]
  at: number
  expiresAt: number
  views: number
  likes: string[]
  dislikes: string[]
  comments: NewsComment[]
  /** 收藏该新闻的居民 / 用户 */
  bookmarks?: string[]
  /** 关联居民 / 地标，便于一键跳转 */
  relatedPersons: string[]
  landmarkId: string
}

export interface TrendingTopic {
  id: string
  title: string
  heat: number
  label: string
  at: number
}

export interface NewsState {
  headlines: NewsItem[]
  categories: NewsCategory[]
  trendingTopics: TrendingTopic[]
  subscriptions: NewsCategory[]
  pushedAt: number
}

export type MicroblogType = 'text' | 'image' | 'video' | 'repost' | 'poll'

export interface PollOption {
  id: string
  text: string
  votes: string[]
}

export interface MicroblogComment {
  id: string
  authorId: string
  content: string
  at: number
  likes: string[]
  /** 楼中楼：回复的评论 id */
  replyTo?: string
}

export interface MicroblogPost {
  id: string
  authorId: string
  content: string
  images: string[]
  type: MicroblogType
  createdAt: number
  likes: string[]
  reposts: string[]
  comments: MicroblogComment[]
  views: number
  location: string
  isAnonymous: boolean
  tags: string[]
  isSensitive: boolean
  poll?: PollOption[]
  /** 转推的源微博 id */
  repostOf?: string
  quote?: string
  bookmarks: string[]
}

export interface MicroblogSpace {
  id: string
  title: string
  topic: string
  hostId: string
  guestIds: string[]
  startAt: number
  live: boolean
  online: number
  reactions: number
  subtitles: string[]
}

export interface MicroblogCommunity {
  id: string
  name: string
  desc: string
  ownerId: string
  memberIds: string[]
  posts: MicroblogPost[]
  createdAt: number
}

export interface MicroblogTrend {
  id: string
  tag: string
  heat: number
  count: number
}

export interface AssistantComment {
  id: string
  postId: string
  text: string
  at: number
}

export interface DirectMessage {
  id: string
  fromId: string
  toId: string
  text: string
  at: number
}

export type MicroblogTheme = 'mono' | 'color' | 'real'

export interface MicroblogState {
  posts: MicroblogPost[]
  hotSearch: TrendingTopic[]
  spaces: MicroblogSpace[]
  communities: MicroblogCommunity[]
  trends: MicroblogTrend[]
  assistantComments: AssistantComment[]
  /** 我关注的人 */
  following: string[]
  messages: DirectMessage[]
  theme: MicroblogTheme
  /** 静音的话题标签 */
  muted: string[]
}

export interface QuickLink {
  id: string
  title: string
  url: string
  desc: string
}

export interface BrowserBookmark {
  id: string
  title: string
  url: string
  folder: string
  at: number
}

export interface BrowserHistory {
  id: string
  title: string
  url: string
  at: number
}

export type BrowserTabKind = 'home' | 'search' | 'page' | 'local'

export interface BrowserTab {
  id: string
  title: string
  url: string
  kind: BrowserTabKind
  query: string
  /** 结果列表缓存在 tab 上，便于前进/后退 */
  results: BrowseResult[]
}

export interface BrowserDownload {
  id: string
  name: string
  kind: string
  progress: number
  done: boolean
  at: number
}

export interface BrowserState {
  bookmarks: BrowserBookmark[]
  history: BrowserHistory[]
  tabs: BrowserTab[]
  activeTabId: string
  searchEngine: string
  quickLinks: QuickLink[]
  night: boolean
  downloads: BrowserDownload[]
}

/** 浏览器搜索结果 */
export interface BrowseResult {
  id: string
  title: string
  url: string
  summary: string
  site: string
}

export interface WebBlock {
  type: 'h' | 'p' | 'list' | 'quote'
  text?: string
  items?: string[]
}

export interface WebPage {
  title: string
  url: string
  site: string
  blocks: WebBlock[]
}

export interface Candle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface OrderBook {
  bids: [number, number][]
  asks: [number, number][]
}

export interface StockNews {
  id: string
  title: string
  symbol: string
  impact: 'good' | 'bad' | 'neutral'
  at: number
}

export interface Stock {
  symbol: string
  name: string
  sector: string
  price: number
  prevClose: number
  change: number
  changePct: number
  volume: number
  marketCap: number
  peRatio: number
  eps: number
  high52w: number
  low52w: number
  history: Candle[]
  orderBook: OrderBook
  relatedNews: string[]
  /** 突发消息（利好/利空） */
  alert: string
}

export interface StockIndex {
  id: string
  name: string
  value: number
  prevClose: number
  change: number
  changePct: number
  volume: number
  history: number[]
}

export interface Position {
  symbol: string
  shares: number
  avgCost: number
}

export interface TradeRecord {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'limit' | 'market'
  price: number
  shares: number
  amount: number
  at: number
}

export interface StockState {
  stocks: Stock[]
  indices: StockIndex[]
  portfolio: Position[]
  cash: number
  frozen: number
  trades: TradeRecord[]
  news: StockNews[]
  initialCapital: number
  /** Mul市经济景气度 0-100 */
  economy: number
  lastTickAt: number
}

export type GameEventType = '日程事件' | '随机事件' | '社交事件' | '经济事件' | '特殊事件' | '用户相关事件'
export type EventTriggerType = 'time' | 'condition' | 'probability' | 'location' | 'interaction' | 'chain'

export interface EventEffects {
  affinity?: number
  socialCredit?: number
  money?: number
  mood?: number
  economy?: number
}

export interface EventChoice {
  text: string
  consequence: string
  nextEventId?: string
  effects?: EventEffects
}

export interface GameEvent {
  id: string
  type: GameEventType
  title: string
  description: string
  triggerType: EventTriggerType
  triggerCondition: string
  involvedPersons: string[]
  locationId: string
  time: number
  duration: number
  outcome: string
  choices: EventChoice[]
  consequences: string[]
  isResolved: boolean
  source: 'npc' | 'user' | 'system' | 'ai'
  parentId?: string
  createdAt: number
}

export interface EventTemplate {
  id: string
  type: GameEventType
  title: string
  description: string
  triggerType: EventTriggerType
  weight: number
}

export interface CalendarItem {
  id: string
  title: string
  kind: string
  at: number
  locationId: string
  joined: boolean
  done: boolean
}

export interface EventTimeline {
  id: string
  at: number
  title: string
  text: string
}

export interface EventState {
  active: GameEvent[]
  completed: GameEvent[]
  templates: EventTemplate[]
  npcGenerated: GameEvent[]
  userTriggered: GameEvent[]
  calendar: CalendarItem[]
  history: EventTimeline[]
}

/** 事件登记用的草稿（管理端） */
export interface GameEventDraft {
  type: GameEventType
  title: string
  description: string
  triggerType: EventTriggerType
  locationId: string
  involvedPersons: string[]
  choices: EventChoice[]
}

export interface AdminGrant {
  personId: string
  permissions: AdminPermission[]
  grantedBy: string
  grantedAt: number
}

export interface CustomEventDraft {
  title: string
  type: string
  locationId: string
  time: number
  involvedPersons: string[]
  description: string
}

export interface CityMeta {
  name: string
  districts: District[]
  landmarks: Landmark[]
  weather: string
  year: number
  /** 城市当前时间（毫秒） */
  cityTime: number
  /** 相对真实时间的流速：0 暂停 / 1 实时 / 2 / 5 */
  timeScale: number
  lastTickAt: number
}

export type CityTabKey =
  | 'city'
  | 'civil'
  | 'travel'
  | 'show'
  | 'service'
  | 'social'
  | 'work'
  | 'admin'
  | 'news'
  | 'microblog'
  | 'browser'
  | 'stock'

/* ---------- store ---------- */

interface MulCityState {
  city: CityMeta
  people: Person[]
  admins: AdminGrant[]
  worldEvents: WorldEvent[]
  transportTickets: TransportTicket[]
  shows: ShowEvent[]
  showTickets: ShowTicket[]
  medicalRecords: MedicalRecord[]
  banks: BankProfile[]
  courses: Course[]
  courseEnrolls: CourseEnroll[]
  letters: Letter[]
  jobs: Job[]
  work: { personId: string; jobId: string | null; salary: number; hiredAt: number; tasks: TaskItem[] }
  posts: Post[]
  groups: GroupChat[]
  encounters: Encounter[]
  activities: ActivityItem[]
  civilRecords: { id: string; text: string; at: number }[]
  lastEncounterAt: number
  lastSimRealAt: number

  /* 五大新增模块 */
  news: NewsState
  microblog: MicroblogState
  browser: BrowserState
  stockMarket: StockState
  events: EventState

  /* 时间 */
  tick: () => void
  setTimeScale: (v: number) => void
  setWeather: (w: string) => void
  setYear: (y: number) => void
  advanceHours: (h: number) => void
  /** 推进一步城市自转：居民移动 / 相遇 / 偶遇 / 自发事件与动态 */
  simulate: () => void

  /* 人物 */
  createPerson: (input: Partial<Person> & { name: string; type?: PersonType }) => string
  createNpcs: (count: number, opts?: { districtId?: string; occupation?: string }) => string[]
  updatePerson: (id: string, patch: Partial<Person>) => void
  removePerson: (id: string) => void
  initAttrs: (id: string, attrs: Partial<PersonAttrs>) => void
  importCharacters: () => number
  /** 幂等同步角色库（自建角色 + NPC）到 Mul市居民，返回本次新增数量 */
  syncLibraryPeople: () => number
  movePerson: (id: string, landmarkId: string) => void

  /* 关系 */
  setRelation: (fromId: string, toId: string, type: RelationType, affinity?: number) => void
  bumpAffinity: (fromId: string, toId: string, delta: number, memory?: string) => void
  addEncounter: (personId: string, locationId: string, text: string) => void

  /* 管理 */
  grantAdmin: (personId: string, permissions: AdminPermission[]) => void
  revokeAdmin: (personId: string) => void
  pushCivilRecord: (text: string) => void
  addWorldEvent: (input: CustomEventDraft & { outcome?: string }) => string
  removeWorldEvent: (id: string) => void
  resolveWorldEvent: (id: string, outcome: string) => void

  /* 出行 */
  buyTransportTicket: (input: Omit<TransportTicket, 'id' | 'createdAt' | 'status' | 'code'>) => string
  advanceTicket: (id: string) => void
  removeTicket: (id: string) => void

  /* 演出 */
  addShow: (input: Omit<ShowEvent, 'id' | 'createdAt'>) => string
  buyShowTicket: (showId: string, zone: string, seat: string, price: number) => { ok: boolean; reason?: string; id?: string }
  useShowTicket: (id: string) => void

  /* 公共服务 */
  addMedical: (input: Omit<MedicalRecord, 'id' | 'at'>) => string
  ensureBank: (personId: string) => void
  bankDeposit: (personId: string, amount: number) => void
  bankWithdraw: (personId: string, amount: number) => boolean
  applyLoan: (personId: string, kind: Loan['kind'], principal: number) => { ok: boolean; reason?: string }
  applyCreditCard: (personId: string, limit: number) => void
  payBill: (personId: string, billId: string) => void
  enrollCourse: (courseId: string) => { ok: boolean; reason?: string }
  finishCourse: (enrollId: string) => void
  sendLetter: (toId: string, kind: Letter['kind'], content: string) => void

  /* 工作 */
  takeJob: (jobId: string) => { ok: boolean; reason?: string }
  quitJob: () => void
  doTask: (taskId: string) => void
  refreshDailyTasks: () => void
  monthlySettle: () => void

  /* 社交 */
  addPost: (text: string, tags: string[], images?: string[]) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void
  createGroup: (name: string, memberIds: string[]) => string
  sendGroupMessage: (groupId: string, text: string) => void
  generateNpcPost: () => void

  /* 新闻资讯 */
  refreshNews: (items?: NewsItem[]) => void
  readNews: (id: string) => void
  toggleNewsLike: (id: string) => void
  dislikeNews: (id: string) => void
  toggleNewsBookmark: (id: string) => void
  addNewsComment: (id: string, text: string) => void
  toggleSubscribe: (c: NewsCategory) => void
  refreshTrending: () => void
  /** 重大事件触发即时新闻推送 */
  pushBreakingNews: (title: string, summary: string, category?: NewsCategory) => string

  /* 微博 */
  addMicroblogPost: (input: Partial<MicroblogPost> & { content: string }) => string
  toggleMicroblogLike: (id: string) => void
  toggleMicroblogBookmark: (id: string) => void
  viewMicroblog: (id: string) => void
  addMicroblogComment: (id: string, content: string, replyTo?: string) => void
  votePoll: (postId: string, optionId: string) => void
  repostMicroblog: (id: string, quote?: string) => void
  removeMicroblog: (id: string) => void
  followPerson: (id: string) => void
  unfollowPerson: (id: string) => void
  generateNpcMicroblog: () => void
  askAssistant: (postId: string) => string
  sendDm: (toId: string, text: string) => void
  createSpace: (title: string, topic: string) => string
  joinSpace: (id: string) => void
  createCommunity: (name: string, desc: string) => string
  joinCommunity: (id: string) => void
  leaveCommunity: (id: string) => void
  addCommunityPost: (id: string, content: string) => void
  setMicroblogTheme: (t: MicroblogTheme) => void
  toggleMuteTopic: (tag: string) => void
  refreshHotSearch: () => void

  /* 浏览器 */
  openBrowserTab: (init?: Partial<BrowserTab>) => string
  closeBrowserTab: (id: string) => void
  activateBrowserTab: (id: string) => void
  setBrowserTab: (id: string, patch: Partial<BrowserTab>) => void
  browserVisit: (tabId: string, url: string, title: string) => void
  addBookmark: (title: string, url: string, folder?: string) => void
  removeBookmark: (id: string) => void
  clearHistory: () => void
  setSearchEngine: (engine: string) => void
  setBrowserNight: (v: boolean) => void
  startDownload: (name: string, kind: string) => void
  finishDownload: (id: string) => void
  removeDownload: (id: string) => void

  /* 股市与经济 */
  refreshMarket: (stocks?: Stock[]) => void
  marketTick: () => void
  tradeStock: (symbol: string, side: 'buy' | 'sell', shares: number, orderType: 'limit' | 'market', limitPrice?: number) => { ok: boolean; reason?: string; price?: number }
  setInitialCapital: (amount: number) => void
  pushStockNews: (title: string, symbol?: string, impact?: StockNews['impact']) => void
  setEconomy: (v: number) => void

  /* 事件引擎 */
  addGameEvent: (input: Partial<GameEvent> & { title: string; description: string }) => string
  resolveGameEvent: (id: string, choiceIndex: number) => { ok: boolean; text?: string }
  dismissGameEvent: (id: string) => void
  triggerNpcEvent: () => void
  triggerEventByLocation: (landmarkId: string) => string | null
  joinCalendar: (id: string) => void
  refreshCalendar: () => void

  resetWorld: () => void
}

export const ME_ID = 'person_me'
export const CITY_NAME = 'Mul市'
/** 城市自转的真实时间节流：每 12 秒推进一小步（暂停时不动） */
const SIM_REAL_MS = 12000
/** 五大模块联动的真实时间节流：股市 / 热搜 / 新闻 */
const LINK_MARKET_MS = 24000
const LINK_HOT_MS = 45000
const LINK_NEWS_MS = 90000
let lastMarketRealAt = 0
let lastHotRealAt = 0
let lastNewsRealAt = 0

export const RELATION_LABEL: Record<RelationType, string> = {
  self: '本人',
  family: '亲友',
  friend: '朋友',
  colleague: '同事',
  classmate: '同学',
  crush: '暗恋',
  couple: '恋人',
  enemy: '敌对',
  stranger: '陌生人',
}

export const TICKET_KIND_LABEL: Record<TicketKind, string> = {
  flight: '机票',
  train: '火车票',
  'high-speed': '高铁票',
  metro: '地铁票',
}

export const SHOW_KIND_LABEL: Record<ShowKind, string> = {
  concert: '演唱会',
  theater: '剧场',
  exhibition: '展览',
}

export const ADMIN_PERMISSION_LABEL: Record<AdminPermission, string> = {
  createPerson: '创建人物',
  editPerson: '编辑人物',
  deletePerson: '删除人物',
  createEvent: '创建事件',
  manageTicket: '管理票务',
  manageRegistry: '管理市籍',
  resetWorld: '重置世界',
}

export const TASK_POOL = [
  { text: '完成今日岗位工作', rewardExp: 12, rewardMoney: 180 },
  { text: '到社区中心签到', rewardExp: 6, rewardMoney: 40 },
  { text: '和一位居民互动', rewardExp: 8, rewardMoney: 0 },
  { text: '在 Mul市走一走', rewardExp: 4, rewardMoney: 0 },
  { text: '锻炼 30 分钟', rewardExp: 7, rewardMoney: 20 },
]

/* ---------- 工具 ---------- */

export function cityNow(city: CityMeta): number {
  return city.cityTime
}

export function fmtCityTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtCityClock(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export function personById(people: Person[], id: string | null | undefined): Person | null {
  if (!id) return null
  return people.find((p) => p.id === id) ?? null
}

export function landmarkById(city: CityMeta, id: string | null | undefined): Landmark | null {
  if (!id) return null
  return city.landmarks.find((l) => l.id === id) ?? null
}

export function districtById(city: CityMeta, id: string): District | null {
  return city.districts.find((d) => d.id === id) ?? null
}

export function relationOf(from: Person, toId: string): Relation {
  return from.relationships.find((r) => r.personId === toId) ?? { personId: toId, type: 'stranger', affinity: 0, memories: [] }
}

export function rankOf(level: number): string {
  if (level >= 9) return '城市名流'
  if (level >= 7) return '资深市民'
  if (level >= 4) return '稳定居民'
  if (level >= 2) return '新晋市民'
  return '初来报到'
}

function normalizeRelations(list: Relation[]): Relation[] {
  return list.map((r) => ({ ...r, affinity: Math.max(0, Math.min(100, Math.round(r.affinity))) }))
}

function buildTasks(): TaskItem[] {
  return TASK_POOL.map((t) => ({ id: cityId('task'), text: t.text, done: false, rewardExp: t.rewardExp, rewardMoney: t.rewardMoney }))
}

/* ---------- 种子 ---------- */

function createSeed() {
  const now = Date.now()
  const people = buildSeedPeople()
  const me = people.find((p) => p.id === ME_ID)!
  const shows = buildSeedShows()
  const jobs = JOBS
  const posts = buildSeedPosts(people)
  const groups = buildSeedGroups(people)
  const worldEvents = buildSeedWorldEvents(people)
  const banks: BankProfile[] = people.slice(0, 8).map((p) => ({
    personId: p.id,
    balance: p.bankAccount,
    creditLimit: Math.round(3000 + p.attributes.socialCredit * 40),
    loans: [],
    bills: [
      { id: cityId('bill'), title: '本月房租', amount: 1800 + randInt(0, 900), dueAt: now + 86400000 * 6, paid: false },
      { id: cityId('bill'), title: '水电燃气', amount: 120 + randInt(0, 180), dueAt: now + 86400000 * 8, paid: false },
    ],
  }))

  return {
    city: {
      name: CITY_NAME,
      districts: DISTRICTS,
      landmarks: LANDMARKS,
      weather: pick(WEATHERS),
      year: 2026,
      cityTime: now,
      timeScale: 1,
      lastTickAt: now,
    } as CityMeta,
    people,
    admins: [
      {
        personId: ME_ID,
        permissions: ['createPerson', 'editPerson', 'deletePerson', 'createEvent', 'manageTicket', 'manageRegistry', 'resetWorld'] as AdminPermission[],
        grantedBy: 'system',
        grantedAt: now,
      },
    ] as AdminGrant[],
    worldEvents,
    transportTickets: [] as TransportTicket[],
    shows,
    showTickets: [] as ShowTicket[],
    medicalRecords: [] as MedicalRecord[],
    banks,
    courses: buildSeedCourses(),
    courseEnrolls: [] as CourseEnroll[],
    letters: [] as Letter[],
    jobs,
    work: { personId: ME_ID, jobId: jobs[0]?.id ?? null, salary: jobs[0]?.salary ?? 0, hiredAt: now, tasks: buildTasks() },
    posts,
    groups,
    encounters: [] as Encounter[],
    activities: [] as ActivityItem[],
    civilRecords: [{ id: cityId('cr'), text: `${me.name} 完成市籍登记`, at: now }],
    lastEncounterAt: 0,
    lastSimRealAt: 0,
    ...buildSeedModules(people, me, now),
  }
}

function buildSeedModules(people: Person[], me: Person, now: number): Pick<MulCityState, 'news' | 'microblog' | 'browser' | 'stockMarket' | 'events'> {
  const peopleIds = people.map((p) => p.id)
  const stocks = buildSeedStocks()
  const browserTabs = buildSeedBrowserTabs()

  // 事件：拉开三件正在发生的事，其中一件与「我」相关
  const activeEvents: GameEvent[] = [
    localGameEvent(people, { type: '用户相关事件', hint: `围绕 ${me.name} 展开` }),
    localGameEvent(people, { type: '社交事件' }),
    localGameEvent(people, { type: '经济事件' }),
  ]

  return {
    news: {
      headlines: buildSeedNews(people),
      categories: NEWS_CATEGORIES,
      trendingTopics: buildSeedTrending(people),
      subscriptions: ['Mul市要闻', '财经'],
      pushedAt: now,
    },
    microblog: {
      posts: buildSeedMicroblog(people),
      hotSearch: buildSeedHotSearch(people),
      spaces: buildSeedSpaces(people),
      communities: buildSeedCommunities(people),
      trends: people.slice(1, 7).map((p) => ({ id: cityId('trd'), tag: `${p.occupation}`, heat: randInt(1200, 98000), count: randInt(20, 860) })),
      assistantComments: [],
      following: peopleIds.slice(1, 6),
      messages: [],
      theme: 'mono',
      muted: [],
    },
    browser: {
      bookmarks: buildSeedBookmarks(),
      history: [],
      tabs: browserTabs,
      activeTabId: browserTabs[0]?.id ?? '',
      searchEngine: 'mulSearch',
      quickLinks: buildSeedQuickLinks(),
      night: false,
      downloads: [],
    },
    stockMarket: {
      stocks,
      indices: buildSeedIndices(),
      portfolio: [],
      cash: 100000,
      frozen: 0,
      trades: [],
      news: localStockNews(stocks),
      initialCapital: 100000,
      economy: randInt(52, 74),
      lastTickAt: now,
    },
    events: {
      active: activeEvents,
      completed: [],
      templates: buildSeedGameTemplates(),
      npcGenerated: [],
      userTriggered: [],
      calendar: buildSeedCalendar(),
      history: [],
    },
  }
}

function buildSeedCourses(): Course[] {
  return [
    { id: cityId('crs'), title: '手冲咖啡入门', skill: '咖啡', level: 1, price: 299, weeks: 2, teacher: '程老师' },
    { id: cityId('crs'), title: '胶片摄影基础', skill: '摄影', level: 1, price: 480, weeks: 4, teacher: '苏老师' },
    { id: cityId('crs'), title: '家常菜进阶', skill: '烹饪', level: 2, price: 360, weeks: 3, teacher: '阿禾' },
    { id: cityId('crs'), title: '吉他弹唱', skill: '音乐', level: 1, price: 520, weeks: 6, teacher: '老周' },
    { id: cityId('crs'), title: '陶艺手作', skill: '手工', level: 1, price: 420, weeks: 3, teacher: '青姨' },
  ]
}

/* ---------- store ---------- */

export const useMulCity = create<MulCityState>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      tick: () => {
        const { city } = get()
        if (!city.timeScale) {
          set({ city: { ...city, lastTickAt: Date.now() } })
          return
        }
        const now = Date.now()
        const delta = (now - city.lastTickAt) * city.timeScale
        if (delta < 1000) return
        set({ city: { ...city, cityTime: city.cityTime + delta, lastTickAt: now } })
        // 城市自转：按真实时间节流推进，保证即便 1× 也能看到里世界在动
        if (now - (get().lastSimRealAt || 0) >= SIM_REAL_MS) {
          set({ lastSimRealAt: now })
          get().simulate()
        }
      },

      setTimeScale: (v) => {
        get().tick()
        set((s) => ({ city: { ...s.city, timeScale: v, lastTickAt: Date.now() } }))
      },

      setWeather: (w) => set((s) => ({ city: { ...s.city, weather: w } })),

      setYear: (y) => set((s) => ({ city: { ...s.city, year: y } })),

      advanceHours: (h) => {
        set((s) => ({ city: { ...s.city, cityTime: s.city.cityTime + h * 3600000 } }))
        // 快速推进时按小时补足自转步数，让「快进」真的产生剧情
        const steps = Math.min(5, Math.max(1, Math.round(h)))
        for (let i = 0; i < steps; i += 1) get().simulate()
      },

      simulate: () => {
        const s = get()
        const others = s.people.filter((p) => p.type !== 'user')
        if (!others.length) return
        const me = s.people.find((p) => p.id === ME_ID)
        const now = s.city.cityTime
        const acts: ActivityItem[] = []
        const marks = new Map<string, string>()

        // 1) 随机几位居民在城里移动
        const movers = pickSome(others, randInt(1, 3))
        movers.forEach((p) => {
          const lm = pick(LANDMARKS.filter((l) => l.id !== p.lastSeenLocation))
          marks.set(p.id, lm.id)
          acts.push({
            id: cityId('act'),
            kind: 'move',
            text: localMoveLine(p.name, lm.name, now),
            at: now,
            landmarkId: lm.id,
            personIds: [p.id],
          })
        })

        // 2) 移动的居民在地标相遇 → NPC 之间的互动
        const byLandmark = new Map<string, Person[]>()
        movers.forEach((p) => {
          const lmId = marks.get(p.id)!
          byLandmark.set(lmId, [...(byLandmark.get(lmId) ?? []), p])
        })
        byLandmark.forEach((group, lmId) => {
          if (group.length < 2) return
          const lm = LANDMARKS.find((l) => l.id === lmId)
          if (!lm) return
          acts.push({
            id: cityId('act'),
            kind: 'meet',
            text: localMeetLine(group[0].name, group[1].name, lm.name),
            at: now,
            landmarkId: lmId,
            personIds: [group[0].id, group[1].id],
          })
        })

        // 3) 有居民正好走到「我」所在的地方 → 偶遇 + 好感变化
        const newEncounters: Encounter[] = []
        const relationChanges: { from: string; to: string; delta: number; memory: string }[] = []
        if (me) {
          const arrived = movers.filter((p) => marks.get(p.id) === me.lastSeenLocation)
          if (arrived.length) {
            const who = arrived[0]
            const lm = LANDMARKS.find((l) => l.id === me.lastSeenLocation)
            const text = localMeetLine(who.name, me.name, lm?.name ?? '街上')
            acts.push({
              id: cityId('act'),
              kind: 'meet',
              text,
              at: now,
              landmarkId: me.lastSeenLocation,
              personIds: [who.id, me.id],
            })
            newEncounters.push({ id: cityId('enc'), personId: who.id, locationId: me.lastSeenLocation, text, relationType: 'stranger', at: now })
            relationChanges.push({ from: ME_ID, to: who.id, delta: randInt(1, 4), memory: text })
            relationChanges.push({ from: who.id, to: ME_ID, delta: randInt(1, 4), memory: text })
          }
        }

        // 4) 推进每个人的状态：位置 / 昼夜在线 / 心情精力 / 情绪
        const hour = new Date(now).getHours()
        const people = s.people.map((p) => {
          if (p.type === 'user') return p
          const lmId = marks.get(p.id)
          const awake = hour >= p.sleepSchedule.wakeHour && hour < p.sleepSchedule.sleepHour % 24
          let rel = p.relationships
          relationChanges
            .filter((r) => r.from === p.id)
            .forEach((r) => {
              const found = rel.find((x) => x.personId === r.to)
              const next: Relation = found
                ? { ...found, affinity: Math.max(0, Math.min(100, found.affinity + r.delta)), memories: [...found.memories, r.memory].slice(-6) }
                : { personId: r.to, type: 'stranger', affinity: 20, memories: [r.memory] }
              rel = [...rel.filter((x) => x.personId !== r.to), next]
            })
          return {
            ...p,
            lastSeenLocation: lmId ?? p.lastSeenLocation,
            isOnline: Math.random() < (awake ? 0.7 : 0.16),
            mood: Math.max(0, Math.min(100, p.mood + randInt(-6, 6))),
            energy: Math.max(0, Math.min(100, p.energy + randInt(-8, 5))),
            currentEmotion: pick(EMOTIONS),
            lastActive: lmId || Math.random() < 0.5 ? now : p.lastActive,
            relationships: rel,
          }
        })

        set({
          people,
          activities: [...acts, ...(s.activities ?? [])].slice(0, 60),
          encounters: newEncounters.length ? [...newEncounters, ...s.encounters].slice(0, 30) : s.encounters,
          lastEncounterAt: newEncounters.length ? now : s.lastEncounterAt,
        })

        // 5) 小概率自发世界事件
        if (Math.random() < 0.05) {
          const e = localWorldEvent(people)
          get().addWorldEvent({
            title: e.title,
            type: e.type,
            locationId: e.locationId,
            time: e.time,
            involvedPersons: e.involvedPersons,
            description: e.description,
          })
        }
        // 6) 小概率有居民自己发动态
        if (Math.random() < 0.22) get().generateNpcPost()

        /* 7) 事件引擎 = 发动机：城市自转同时驱动新闻 / 微博 / 股市 / 事件 */
        const realNow = Date.now()
        // NPC 自主事件（日程 / 随机 / 社交 / 经济）
        if (Math.random() < 0.09) get().triggerNpcEvent()
        // NPC 主动发微博
        if (Math.random() < 0.3) get().generateNpcMicroblog()
        // 股市随城市推进波动（并可能推送快讯 / 财经新闻）
        if (realNow - lastMarketRealAt >= LINK_MARKET_MS) {
          lastMarketRealAt = realNow
          get().marketTick()
        }
        // 热搜榜刷新
        if (realNow - lastHotRealAt >= LINK_HOT_MS) {
          lastHotRealAt = realNow
          get().refreshHotSearch()
        }
        // 新闻滚动生成（本地，避免在自转中调用 AI）
        if (realNow - lastNewsRealAt >= LINK_NEWS_MS) {
          lastNewsRealAt = realNow
          get().refreshNews()
          get().refreshTrending()
        }
      },

      /* ---------- 人物 ---------- */

      createPerson: (input) => {
        const person = localPerson(input)
        set((s) => ({ people: [...s.people, person] }))
        get().pushCivilRecord(`${person.name} 完成市籍登记（${person.civilId}）`)
        return person.id
      },

      createNpcs: (count, opts) => {
        const made: Person[] = []
        for (let i = 0; i < count; i += 1) {
          const district = opts?.districtId
            ? s0(get().city.districts.find((d) => d.id === opts.districtId))
            : undefined
          const p = localPerson({
            type: 'npc',
            occupation: opts?.occupation,
            address: district ? `${district.name}一带` : undefined,
            lastSeenLocation: district?.landmarks[randInt(0, Math.max(0, district.landmarks.length - 1))],
          })
          made.push(p)
        }
        set((s) => ({ people: [...s.people, ...made] }))
        get().pushCivilRecord(`批量生成 ${made.length} 位居民`)
        return made.map((p) => p.id)
      },

      updatePerson: (id, patch) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          admins: s.admins.filter((a) => a.personId !== id),
          showTickets: s.showTickets.filter((t) => t.personId !== id),
        })),

      initAttrs: (id, attrs) =>
        set((s) => ({
          people: s.people.map((p) =>
            p.id === id ? { ...p, attributes: { ...p.attributes, ...attrs, level: rankLevel({ ...p.attributes, ...attrs }) } } : p
          ),
        })),

      importCharacters: () => get().syncLibraryPeople(),

      syncLibraryPeople: () => {
        const existing = new Set(get().people.map((p) => p.name))
        const made: Person[] = []
        for (const lib of allLibraryPeople()) {
          if (!lib.name || existing.has(lib.name)) continue
          existing.add(lib.name)
          made.push(
            localPerson({
              type: lib.type,
              name: lib.name,
              occupation: lib.identity || undefined,
              bio: lib.personality || undefined,
              avatarId: lib.avatarId || undefined,
            })
          )
        }
        if (made.length) {
          set((s) => ({ people: [...s.people, ...made] }))
          get().pushCivilRecord(`从角色库同步 ${made.length} 位角色 / NPC`)
        }
        return made.length
      },

      movePerson: (id, landmarkId) =>
        set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, lastSeenLocation: landmarkId, lastActive: Date.now() } : p)) })),

      /* ---------- 关系 ---------- */

      setRelation: (fromId, toId, type, affinity) =>
        set((s) => ({
          people: s.people.map((p) => {
            if (p.id !== fromId) return p
            const rest = p.relationships.filter((r) => r.personId !== toId)
            return {
              ...p,
              relationships: normalizeRelations([...rest, { personId: toId, type, affinity: affinity ?? 20, memories: [] }]),
            }
          }),
        })),

      bumpAffinity: (fromId, toId, delta, memory) =>
        set((s) => ({
          people: s.people.map((p) => {
            if (p.id !== fromId) return p
            const found = p.relationships.find((r) => r.personId === toId)
            const next: Relation = found
              ? { ...found, affinity: found.affinity + delta, memories: memory ? [...found.memories, memory].slice(-6) : found.memories }
              : { personId: toId, type: 'stranger', affinity: Math.max(0, 20 + delta), memories: memory ? [memory] : [] }
            const rest = p.relationships.filter((r) => r.personId !== toId)
            return { ...p, relationships: normalizeRelations([...rest, next]) }
          }),
        })),

      addEncounter: (personId, locationId, text) =>
        set((s) => ({
          encounters: [{ id: cityId('enc'), personId, locationId, text, relationType: 'stranger' as const, at: Date.now() }, ...s.encounters].slice(0, 30),
          lastEncounterAt: Date.now(),
          people: s.people.map((p) => (p.id === personId ? { ...p, lastSeenLocation: locationId, lastActive: Date.now() } : p)),
        })),

      /* ---------- 管理 ---------- */

      grantAdmin: (personId, permissions) => {
        set((s) => ({
          admins: [...s.admins.filter((a) => a.personId !== personId), { personId, permissions, grantedBy: ME_ID, grantedAt: Date.now() }],
          people: s.people.map((p) => (p.id === personId ? { ...p, isAdmin: true } : p)),
        }))
        const p = personById(get().people, personId)
        get().pushCivilRecord(`授予 ${p?.name ?? personId} 管理员权限`)
      },

      revokeAdmin: (personId) => {
        set((s) => ({
          admins: s.admins.filter((a) => a.personId !== personId),
          people: s.people.map((p) => (p.id === personId ? { ...p, isAdmin: false } : p)),
        }))
      },

      pushCivilRecord: (text) => set((s) => ({ civilRecords: [{ id: cityId('cr'), text, at: Date.now() }, ...s.civilRecords].slice(0, 40) })),

      addWorldEvent: (input) => {
        const id = cityId('evt')
        set((s) => ({
          worldEvents: [
            { ...input, id, outcome: input.outcome ?? '', createdAt: Date.now() },
            ...s.worldEvents,
          ].slice(0, 60),
        }))
        return id
      },

      removeWorldEvent: (id) => set((s) => ({ worldEvents: s.worldEvents.filter((e) => e.id !== id) })),

      resolveWorldEvent: (id, outcome) =>
        set((s) => ({ worldEvents: s.worldEvents.map((e) => (e.id === id ? { ...e, outcome } : e)) })),

      /* ---------- 出行 ---------- */

      buyTransportTicket: (input) => {
        const id = cityId('tk')
        const code = `${input.kind.slice(0, 2).toUpperCase()}${randInt(100000, 999999)}`
        set((s) => ({
          transportTickets: [{ ...input, id, code, status: 'booked', createdAt: Date.now() }, ...s.transportTickets],
        }))
        return id
      },

      advanceTicket: (id) =>
        set((s) => ({
          transportTickets: s.transportTickets.map((t) =>
            t.id === id ? { ...t, status: t.status === 'booked' ? 'ongoing' : 'done' } : t
          ),
        })),

      removeTicket: (id) => set((s) => ({ transportTickets: s.transportTickets.filter((t) => t.id !== id) })),

      /* ---------- 演出 ---------- */

      addShow: (input) => {
        const id = cityId('show')
        set((s) => ({ shows: [{ ...input, id, createdAt: Date.now() }, ...s.shows] }))
        return id
      },

      buyShowTicket: (showId, zone, seat, price) => {
        const show = get().shows.find((x) => x.id === showId)
        if (!show) return { ok: false, reason: '演出不存在' }
        if (show.seatsLeft <= 0) return { ok: false, reason: '已售罄' }
        if (Date.now() < show.saleAt) return { ok: false, reason: '还没开售' }
        const id = cityId('stk')
        set((s) => ({
          showTickets: [{ id, showId, zone, seat, price, personId: ME_ID, status: 'upcoming', createdAt: Date.now() }, ...s.showTickets],
          shows: s.shows.map((x) => (x.id === showId ? { ...x, seatsLeft: Math.max(0, x.seatsLeft - 1) } : x)),
        }))
        return { ok: true, id }
      },

      useShowTicket: (id) =>
        set((s) => ({ showTickets: s.showTickets.map((t) => (t.id === id ? { ...t, status: 'used' } : t)) })),

      /* ---------- 公共服务 ---------- */

      addMedical: (input) => {
        const id = cityId('med')
        set((s) => ({ medicalRecords: [{ ...input, id, at: Date.now() }, ...s.medicalRecords] }))
        if (input.prescription.length) {
          set((s) => ({
            people: s.people.map((p) =>
              p.id === input.personId ? { ...p, inventory: [...p.inventory, ...input.prescription] } : p
            ),
          }))
        }
        return id
      },

      ensureBank: (personId) =>
        set((s) => {
          if (s.banks.some((b) => b.personId === personId)) return s
          const p = personById(s.people, personId)
          return {
            banks: [
              ...s.banks,
              {
                personId,
                balance: p?.bankAccount ?? 0,
                creditLimit: Math.round(3000 + (p?.attributes.socialCredit ?? 100) * 40),
                loans: [],
                bills: [],
              },
            ],
          }
        }),

      bankDeposit: (personId, amount) =>
        set((s) => ({
          banks: s.banks.map((b) => (b.personId === personId ? { ...b, balance: b.balance + amount } : b)),
          people: s.people.map((p) => (p.id === personId ? { ...p, bankAccount: p.bankAccount + amount } : p)),
        })),

      bankWithdraw: (personId, amount) => {
        const bank = get().banks.find((b) => b.personId === personId)
        if (!bank || bank.balance < amount) return false
        set((s) => ({
          banks: s.banks.map((b) => (b.personId === personId ? { ...b, balance: b.balance - amount } : b)),
          people: s.people.map((p) => (p.id === personId ? { ...p, bankAccount: p.bankAccount - amount } : p)),
        }))
        return true
      },

      applyLoan: (personId, kind, principal) => {
        const p = personById(get().people, personId)
        if (!p) return { ok: false, reason: '人物不存在' }
        const cap = kind === 'credit' ? 3000 + p.attributes.socialCredit * 40 : 200000
        if (principal > cap) return { ok: false, reason: `额度不足，最高 ¥${cap}` }
        if (p.attributes.level < 2) return { ok: false, reason: '等级不足（需 LV.2）' }
        const rate = kind === 'credit' ? 0.12 : 0.045
        set((s) => ({
          banks: s.banks.map((b) =>
            b.personId === personId
              ? {
                  ...b,
                  balance: b.balance + principal,
                  loans: [
                    { id: cityId('loan'), kind, principal, rate, months: kind === 'mortgage' ? 240 : 36, remaining: principal, at: Date.now() },
                    ...b.loans,
                  ],
                }
              : b
          ),
          people: s.people.map((x) => (x.id === personId ? { ...x, bankAccount: x.bankAccount + principal } : x)),
        }))
        return { ok: true }
      },

      applyCreditCard: (personId, limit) =>
        set((s) => ({
          banks: s.banks.map((b) => (b.personId === personId ? { ...b, creditLimit: Math.max(b.creditLimit, limit) } : b)),
        })),

      payBill: (personId, billId) =>
        set((s) => ({
          banks: s.banks.map((b) =>
            b.personId === personId
              ? {
                  ...b,
                  balance: b.balance - (b.bills.find((x) => x.id === billId)?.amount ?? 0),
                  bills: b.bills.map((x) => (x.id === billId ? { ...x, paid: true } : x)),
                }
              : b
          ),
        })),

      enrollCourse: (courseId) => {
        const s = get()
        if (s.courseEnrolls.some((e) => e.courseId === courseId && e.personId === ME_ID && !e.done)) {
          return { ok: false, reason: '已经报名过了' }
        }
        const course = s.courses.find((c) => c.id === courseId)
        if (!course) return { ok: false, reason: '课程不存在' }
        if (s.banks.find((b) => b.personId === ME_ID)!.balance < course.price) return { ok: false, reason: '余额不足' }
        set((st) => ({
          courseEnrolls: [{ id: cityId('enr'), courseId, personId: ME_ID, progress: 0, done: false, score: null }, ...st.courseEnrolls],
          banks: st.banks.map((b) => (b.personId === ME_ID ? { ...b, balance: b.balance - course.price } : b)),
        }))
        return { ok: true }
      },

      finishCourse: (enrollId) =>
        set((s) => {
          const enr = s.courseEnrolls.find((e) => e.id === enrollId)
          if (!enr) return s
          const course = s.courses.find((c) => c.id === enr.courseId)
          const score = randInt(60, 99)
          return {
            courseEnrolls: s.courseEnrolls.map((e) => (e.id === enrollId ? { ...e, progress: 100, done: true, score } : e)),
            people: s.people.map((p) =>
              p.id === enr.personId && course && !p.skills.includes(course.skill)
                ? { ...p, skills: [...p.skills, course.skill] }
                : p
            ),
          }
        }),

      sendLetter: (toId, kind, content) =>
        set((s) => ({ letters: [{ id: cityId('ltr'), fromId: ME_ID, toId, kind, content, at: Date.now() }, ...s.letters] })),

      /* ---------- 工作 ---------- */

      takeJob: (jobId) => {
        const s = get()
        const job = s.jobs.find((j) => j.id === jobId)
        if (!job) return { ok: false, reason: '职位不存在' }
        const me = personById(s.people, ME_ID)!
        if (me.attributes.level < job.levelReq) return { ok: false, reason: `等级不足（需 LV.${job.levelReq}）` }
        if (me.attributes.socialCredit < job.creditReq) return { ok: false, reason: `社信不足（需 ${job.creditReq}）` }
        if (job.skillReq && !me.skills.includes(job.skillReq)) return { ok: false, reason: `需要技能：${job.skillReq}` }
        set({
          work: { personId: ME_ID, jobId, salary: job.salary, hiredAt: Date.now(), tasks: buildTasks() },
          people: s.people.map((p) => (p.id === ME_ID ? { ...p, occupation: job.title, monthlyIncome: job.salary } : p)),
        })
        return { ok: true }
      },

      quitJob: () =>
        set((s) => ({
          work: { ...s.work, jobId: null, salary: 0 },
          people: s.people.map((p) => (p.id === ME_ID ? { ...p, occupation: '待业', monthlyIncome: 0 } : p)),
        })),

      doTask: (taskId) => {
        const s = get()
        const task = s.work.tasks.find((t) => t.id === taskId)
        if (!task || task.done) return
        set((st) => ({
          work: { ...st.work, tasks: st.work.tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t)) },
          people: st.people.map((p) =>
            p.id === ME_ID
              ? {
                  ...p,
                  bankAccount: p.bankAccount + task.rewardMoney,
                  attributes: {
                    ...p.attributes,
                    cityContribution: p.attributes.cityContribution + task.rewardExp,
                    level: rankLevel({ ...p.attributes, cityContribution: p.attributes.cityContribution + task.rewardExp }),
                  },
                }
              : p
          ),
          banks: st.banks.map((b) => (b.personId === ME_ID ? { ...b, balance: b.balance + task.rewardMoney } : b)),
        }))
      },

      refreshDailyTasks: () => set((s) => ({ work: { ...s.work, tasks: buildTasks() } })),

      monthlySettle: () =>
        set((s) => {
          const income = s.work.salary
          const expense = 1800 + randInt(300, 900)
          return {
            people: s.people.map((p) => (p.id === ME_ID ? { ...p, bankAccount: p.bankAccount + income - expense, monthlyExpenses: expense } : p)),
            banks: s.banks.map((b) => (b.personId === ME_ID ? { ...b, balance: b.balance + income - expense } : b)),
          }
        }),

      /* ---------- 社交 ---------- */

      addPost: (text, tags, images) =>
        set((s) => ({ posts: [{ id: cityId('post'), personId: ME_ID, text, images: images ?? [], tags, likes: [], comments: [], at: Date.now() }, ...s.posts] })),

      toggleLike: (postId) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, likes: p.likes.includes(ME_ID) ? p.likes.filter((x) => x !== ME_ID) : [...p.likes, ME_ID] }
              : p
          ),
        })),

      addComment: (postId, text) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, { id: cityId('cm'), personId: ME_ID, text, at: Date.now() }] }
              : p
          ),
        })),

      createGroup: (name, memberIds) => {
        const id = cityId('grp')
        set((s) => ({
          groups: [
            { id, name, memberIds: [ME_ID, ...memberIds], topics: ['日常', '闲聊'], messages: [], createdAt: Date.now() },
            ...s.groups,
          ],
        }))
        return id
      },

      sendGroupMessage: (groupId, text) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, messages: [...g.messages, { id: cityId('gm'), personId: ME_ID, text, at: Date.now() }] }
              : g
          ),
        }))
        // 让一位群成员顺着回复
        const g = get().groups.find((x) => x.id === groupId)
        if (!g) return
        const others = g.memberIds.filter((x) => x !== ME_ID)
        if (!others.length) return
        const who = pick(others)
        const person = personById(get().people, who)
        window.setTimeout(() => {
          set((s) => ({
            groups: s.groups.map((x) =>
              x.id === groupId
                ? {
                    ...x,
                    messages: [
                      ...x.messages,
                      { id: cityId('gm'), personId: who, text: `${person?.name ?? '有人'}：${pick(['嗯嗯，我在。', '这个我熟，算我一个。', '晚点细说，正好有空。', '哈哈哈哈真的假的。', '我也这么觉得。']) }`, at: Date.now() },
                    ],
                  }
                : x
            ),
          }))
        }, 900)
      },

      generateNpcPost: () => {
        const s = get()
        const me = personById(s.people, ME_ID)!
        const others = s.people.filter((p) => p.id !== ME_ID && p.type !== 'user')
        if (!others.length) return
        const who = pick(others)
        const affinity = relationOf(me, who.id).affinity
        const lines =
          affinity > 60
            ? [`和 ${me.name} 待了一下午，时间过得好快。`, `今天又被 ${me.name} 逗笑了。`, `${me.name} 说下次一起去海边，记下了。`]
            : affinity >= 30
              ? [`路过时碰到了 ${me.name}，聊了两句。`, `${me.name} 今天看起来心情不错。`, `和 ${me.name} 打了个照面。`]
              : [`今天天气很好，出门走了走。`, `在常去的那家店坐了很久。`, `新买的东西到了，很满意。`]
        const post: Post = {
          id: cityId('post'),
          personId: who.id,
          text: pick(lines),
          images: [],
          tags: [pick(['日常', '随手记', '碎碎念', 'Mul市'])],
          likes: [],
          comments: [],
          at: Date.now(),
        }
        set({ posts: [post, ...s.posts] })
      },

      /* ============================================================
         新闻资讯
         ============================================================ */

      refreshNews: (items) => {
        const s = get()
        const fresh = items?.length ? items : localNews(s.people, s.city, 10)
        const keepWindow = 3 * 86400000
        const kept = s.news.headlines.filter((h) => Date.now() - h.at < keepWindow)
        set({ news: { ...s.news, headlines: [...fresh, ...kept].slice(0, 60), pushedAt: Date.now() } })
      },

      readNews: (id) =>
        set((s) => ({ news: { ...s.news, headlines: s.news.headlines.map((h) => (h.id === id ? { ...h, views: h.views + 1 } : h)) } })),

      toggleNewsLike: (id) =>
        set((s) => ({
          news: {
            ...s.news,
            headlines: s.news.headlines.map((h) =>
              h.id === id ? { ...h, likes: h.likes.includes(ME_ID) ? h.likes.filter((x) => x !== ME_ID) : [...h.likes, ME_ID] } : h
            ),
          },
        })),

      dislikeNews: (id) =>
        set((s) => ({
          news: {
            ...s.news,
            headlines: s.news.headlines.map((h) =>
              h.id === id ? { ...h, dislikes: h.dislikes.includes(ME_ID) ? h.dislikes : [...h.dislikes, ME_ID] } : h
            ),
          },
        })),

      toggleNewsBookmark: (id) =>
        set((s) => ({
          news: {
            ...s.news,
            headlines: s.news.headlines.map((h) =>
              h.id === id
                ? { ...h, bookmarks: (h.bookmarks ?? []).includes(ME_ID) ? (h.bookmarks ?? []).filter((x) => x !== ME_ID) : [...(h.bookmarks ?? []), ME_ID] }
                : h
            ),
          },
        })),

      addNewsComment: (id, text) => {
        set((s) => ({
          news: {
            ...s.news,
            headlines: s.news.headlines.map((h) =>
              h.id === id ? { ...h, comments: [...h.comments, { id: cityId('nc'), personId: ME_ID, text, at: Date.now() }] } : h
            ),
          },
        }))
        // 偶尔有居民跟着评论
        const s = get()
        const item = s.news.headlines.find((h) => h.id === id)
        if (!item || Math.random() > 0.6) return
        const others = s.people.filter((p) => p.id !== ME_ID && p.type !== 'user')
        if (!others.length) return
        const who = pick(others)
        window.setTimeout(() => {
          set((st) => ({
            news: {
              ...st.news,
              headlines: st.news.headlines.map((h) =>
                h.id === id
                  ? {
                      ...h,
                      comments: [
                        ...h.comments,
                        { id: cityId('nc'), personId: who.id, text: pick(['说得挺在理。', '我也听说了，当时就在附近。', '希望能有个说法。', '这事没那么简单。', '关注后续。']), at: Date.now() },
                      ],
                    }
                  : h
              ),
            },
          }))
        }, 900)
      },

      toggleSubscribe: (c) =>
        set((s) => ({
          news: { ...s.news, subscriptions: s.news.subscriptions.includes(c) ? s.news.subscriptions.filter((x) => x !== c) : [...s.news.subscriptions, c] },
        })),

      refreshTrending: () => set((s) => ({ news: { ...s.news, trendingTopics: localTrendingTopics(s.people) } })),

      pushBreakingNews: (title, summary, category = 'Mul市要闻') => {
        const item: NewsItem = {
          id: cityId('nws'),
          title,
          summary,
          body: `${summary}\n\n（Mul市新闻中心 快讯）本条为即时推送，更多细节正在核实中。`,
          category,
          source: 'Mul市新闻中心',
          author: '快讯',
          images: [],
          at: Date.now(),
          expiresAt: Date.now() + 3 * 86400000,
          views: randInt(200, 1200),
          likes: [],
          dislikes: [],
          comments: [],
          relatedPersons: [],
          landmarkId: '',
        }
        set((s) => ({ news: { ...s.news, headlines: [item, ...s.news.headlines].slice(0, 60), pushedAt: Date.now() } }))
        return item.id
      },

      /* ============================================================
         微博
         ============================================================ */

      addMicroblogPost: (input) => {
        const id = cityId('mb')
        const poll = input.poll
        const post: MicroblogPost = {
          id,
          authorId: input.authorId ?? ME_ID,
          content: input.content,
          images: input.images ?? [],
          type: input.type ?? (poll?.length ? 'poll' : input.images?.length ? 'image' : 'text'),
          createdAt: Date.now(),
          likes: [],
          reposts: [],
          comments: [],
          views: randInt(20, 260),
          location: input.location ?? '',
          isAnonymous: input.isAnonymous ?? false,
          tags: input.tags ?? [],
          isSensitive: input.isSensitive ?? false,
          poll,
          repostOf: input.repostOf,
          quote: input.quote,
          bookmarks: [],
        }
        set((s) => ({ microblog: { ...s.microblog, posts: [post, ...s.microblog.posts].slice(0, 200) } }))

        // 居民会看到并互动（关注的人更积极）
        const s = get()
        const others = s.people.filter((p) => p.id !== ME_ID && p.type !== 'user')
        const fans = others.filter((p) => s.microblog.following.includes(p.id) || relationOf(s.people.find((x) => x.id === ME_ID)!, p.id).affinity > 40)
        const pool = fans.length ? fans : others
        if (pool.length && Math.random() < 0.85) {
          const who = pick(pool)
          const likeDelay = randInt(600, 1600)
          window.setTimeout(() => {
            set((st) => ({
              microblog: { ...st.microblog, posts: st.microblog.posts.map((p) => (p.id === id ? { ...p, likes: [...p.likes, who.id], views: p.views + randInt(3, 40) } : p)) },
            }))
          }, likeDelay)
          if (Math.random() < 0.6) {
            window.setTimeout(() => {
              set((st) => ({
                microblog: {
                  ...st.microblog,
                  posts: st.microblog.posts.map((p) =>
                    p.id === id
                      ? {
                          ...p,
                          comments: [
                            ...p.comments,
                            { id: cityId('mc'), authorId: who.id, content: pick(['这条我转了。', '太真实了。', '哈哈哈哈哈。', '下次带我一个。', '同感。', '在哪？我也想去。']), at: Date.now(), likes: [] },
                          ],
                        }
                      : p
                  ),
                },
              }))
            }, likeDelay + randInt(700, 2200))
          }
        }
        return id
      },

      toggleMicroblogLike: (id) =>
        set((s) => ({
          microblog: {
            ...s.microblog,
            posts: s.microblog.posts.map((p) =>
              p.id === id ? { ...p, likes: p.likes.includes(ME_ID) ? p.likes.filter((x) => x !== ME_ID) : [...p.likes, ME_ID] } : p
            ),
          },
        })),

      toggleMicroblogBookmark: (id) =>
        set((s) => ({
          microblog: {
            ...s.microblog,
            posts: s.microblog.posts.map((p) =>
              p.id === id ? { ...p, bookmarks: p.bookmarks.includes(ME_ID) ? p.bookmarks.filter((x) => x !== ME_ID) : [...p.bookmarks, ME_ID] } : p
            ),
          },
        })),

      viewMicroblog: (id) =>
        set((s) => ({
          microblog: { ...s.microblog, posts: s.microblog.posts.map((p) => (p.id === id ? { ...p, views: p.views + 1 } : p)) },
        })),

      addMicroblogComment: (id, content, replyTo) => {
        set((s) => ({
          microblog: {
            ...s.microblog,
            posts: s.microblog.posts.map((p) =>
              p.id === id
                ? { ...p, comments: [...p.comments, { id: cityId('mc'), authorId: ME_ID, content, at: Date.now(), likes: [], replyTo }] }
                : p
            ),
          },
        }))
        const s = get()
        const post = s.microblog.posts.find((p) => p.id === id)
        if (!post || Math.random() > 0.55) return
        const author = post.authorId !== ME_ID ? post.authorId : pick(s.people.filter((p) => p.id !== ME_ID).map((p) => p.id))
        if (!author) return
        window.setTimeout(() => {
          set((st) => ({
            microblog: {
              ...st.microblog,
              posts: st.microblog.posts.map((p) =>
                p.id === id
                  ? { ...p, comments: [...p.comments, { id: cityId('mc'), authorId: author, content: pick(['收到。', '嗯嗯，我懂你的意思。', '有道理，我再想想。', '哈哈哈哈你太会说了。', '我也是这么觉得的。']), at: Date.now(), likes: [] }] }
                  : p
              ),
            },
          }))
        }, 1000)
      },

      votePoll: (postId, optionId) =>
        set((s) => ({
          microblog: {
            ...s.microblog,
            posts: s.microblog.posts.map((p) =>
              p.id === postId && p.poll
                ? {
                    ...p,
                    poll: p.poll.map((o) => (o.id === optionId ? { ...o, votes: o.votes.includes(ME_ID) ? o.votes : [...o.votes, ME_ID] } : { ...o, votes: o.votes.filter((v) => v !== ME_ID) })),
                  }
                : p
            ),
          },
        })),

      repostMicroblog: (id, quote) => {
        set((s) => ({ microblog: { ...s.microblog, posts: s.microblog.posts.map((p) => (p.id === id ? { ...p, reposts: [...p.reposts, ME_ID] } : p)) } }))
        if (quote && quote.trim()) get().addMicroblogPost({ content: quote.trim(), type: 'repost', repostOf: id })
      },

      removeMicroblog: (id) => set((s) => ({ microblog: { ...s.microblog, posts: s.microblog.posts.filter((p) => p.id !== id) } })),

      followPerson: (id) =>
        set((s) => ({
          microblog: { ...s.microblog, following: s.microblog.following.includes(id) ? s.microblog.following : [...s.microblog.following, id] },
        })),

      unfollowPerson: (id) => set((s) => ({ microblog: { ...s.microblog, following: s.microblog.following.filter((x) => x !== id) } })),

      generateNpcMicroblog: () => {
        const s = get()
        const others = s.people.filter((p) => p.id !== ME_ID && p.type !== 'user')
        if (!others.length) return
        const who = pick(others)
        const affinity = relationOf(s.people.find((p) => p.id === ME_ID)!, who.id).affinity
        const post = localMicroblogPost(who, s.people.find((p) => p.id === ME_ID)?.name ?? '我', affinity, s.city.cityTime)
        set((st) => ({ microblog: { ...st.microblog, posts: [post, ...st.microblog.posts].slice(0, 200) } }))
      },

      askAssistant: (postId) => {
        const s = get()
        const post = s.microblog.posts.find((p) => p.id === postId)
        const author = post ? personById(s.people, post.authorId) : null
        const text = pick([
          `@论坛助手：这条发得像 ${author?.name ?? '这位'} 本人在现场直播，细节拉满。`,
          `@论坛助手：一看就是 ${author?.name ?? '他'} 的手笔——情绪比逻辑先到。`,
          `@论坛助手：别的不说，Mul市 的日常被 ${author?.name ?? '你'} 写活了。`,
          `@论坛助手：这条我给 8 分，剩下 2 分怕你骄傲。`,
        ])
        set((st) => ({
          microblog: { ...st.microblog, assistantComments: [{ id: cityId('as'), postId, text, at: Date.now() }, ...st.microblog.assistantComments].slice(0, 60) },
        }))
        return text
      },

      sendDm: (toId, text) => {
        set((s) => ({ microblog: { ...s.microblog, messages: [...s.microblog.messages, { id: cityId('dm'), fromId: ME_ID, toId, text, at: Date.now() }] } }))
        const s = get()
        const person = personById(s.people, toId)
        if (!person) return
        window.setTimeout(() => {
          const reply = pick([
            '在的，怎么了？',
            '刚看到，你说。',
            '嗯……我想想。',
            '这个我有空，回头细聊。',
            '哈哈哈你也这么觉得？',
            '好，那就这么说定了。',
          ])
          set((st) => ({ microblog: { ...st.microblog, messages: [...st.microblog.messages, { id: cityId('dm'), fromId: toId, toId: ME_ID, text: reply, at: Date.now() }] } }))
        }, randInt(900, 2000))
      },

      createSpace: (title, topic) => {
        const id = cityId('sp')
        set((s) => ({
          microblog: {
            ...s.microblog,
            spaces: [
              { id, title, topic, hostId: ME_ID, guestIds: pickSome(s.people.filter((p) => p.id !== ME_ID && p.type !== 'user').map((p) => p.id), 2), startAt: Date.now() + 1800000, live: false, online: 0, reactions: 0, subtitles: [] },
              ...s.microblog.spaces,
            ],
          },
        }))
        return id
      },

      joinSpace: (id) =>
        set((s) => ({
          microblog: {
            ...s.microblog,
            spaces: s.microblog.spaces.map((sp) => (sp.id === id ? { ...sp, online: sp.online + 1, subtitles: [...sp.subtitles, '（你进入了语音空间）'] } : sp)),
          },
        })),

      createCommunity: (name, desc) => {
        const id = cityId('cmt')
        set((s) => ({
          microblog: {
            ...s.microblog,
            communities: [{ id, name, desc, ownerId: ME_ID, memberIds: [ME_ID], posts: [], createdAt: Date.now() }, ...s.microblog.communities],
          },
        }))
        return id
      },

      joinCommunity: (id) =>
        set((s) => ({
          microblog: { ...s.microblog, communities: s.microblog.communities.map((c) => (c.id === id && !c.memberIds.includes(ME_ID) ? { ...c, memberIds: [...c.memberIds, ME_ID] } : c)) },
        })),

      leaveCommunity: (id) =>
        set((s) => ({
          microblog: { ...s.microblog, communities: s.microblog.communities.map((c) => (c.id === id ? { ...c, memberIds: c.memberIds.filter((m) => m !== ME_ID) } : c)) },
        })),

      addCommunityPost: (id, content) => {
        set((s) => ({
          microblog: {
            ...s.microblog,
            communities: s.microblog.communities.map((c) =>
              c.id === id ? { ...c, posts: [{ id: cityId('cp'), authorId: ME_ID, content, images: [], type: 'text' as const, createdAt: Date.now(), likes: [], reposts: [], comments: [], views: 0, location: '', isAnonymous: false, tags: [], isSensitive: false, bookmarks: [] }, ...c.posts] } : c
            ),
          },
        }))
      },

      setMicroblogTheme: (t) => set((s) => ({ microblog: { ...s.microblog, theme: t } })),

      toggleMuteTopic: (tag) =>
        set((s) => ({ microblog: { ...s.microblog, muted: s.microblog.muted.includes(tag) ? s.microblog.muted.filter((x) => x !== tag) : [...s.microblog.muted, tag] } })),

      refreshHotSearch: () => set((s) => ({ microblog: { ...s.microblog, hotSearch: localTrendingTopics(s.people) } })),

      /* ============================================================
         浏览器
         ============================================================ */

      openBrowserTab: (init) => {
        const id = cityId('tab')
        set((s) => ({
          browser: {
            ...s.browser,
            tabs: [...s.browser.tabs, { id, title: init?.title ?? '新标签页', url: init?.url ?? '', kind: init?.kind ?? 'home', query: init?.query ?? '', results: init?.results ?? [] }],
            activeTabId: id,
          },
        }))
        return id
      },

      closeBrowserTab: (id) =>
        set((s) => {
          const tabs = s.browser.tabs.filter((t) => t.id !== id)
          const nextTabs = tabs.length ? tabs : [{ id: cityId('tab'), title: '新标签页', url: '', kind: 'home' as const, query: '', results: [] }]
          const activeTabId = s.browser.activeTabId === id ? nextTabs[nextTabs.length - 1].id : s.browser.activeTabId
          return { browser: { ...s.browser, tabs: nextTabs, activeTabId } }
        }),

      activateBrowserTab: (id) => set((s) => ({ browser: { ...s.browser, activeTabId: id } })),

      setBrowserTab: (id, patch) =>
        set((s) => ({ browser: { ...s.browser, tabs: s.browser.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) } })),

      browserVisit: (tabId, url, title) =>
        set((s) => ({
          browser: {
            ...s.browser,
            history: [{ id: cityId('bh'), title, url, at: Date.now() }, ...s.browser.history].slice(0, 200),
            tabs: s.browser.tabs.map((t) => (t.id === tabId ? { ...t, url, title, kind: t.kind === 'home' ? 'page' : t.kind } : t)),
          },
        })),

      addBookmark: (title, url, folder = '默认') =>
        set((s) => ({
          browser: {
            ...s.browser,
            bookmarks: s.browser.bookmarks.some((b) => b.url === url) ? s.browser.bookmarks : [{ id: cityId('bm'), title, url, folder, at: Date.now() }, ...s.browser.bookmarks],
          },
        })),

      removeBookmark: (id) => set((s) => ({ browser: { ...s.browser, bookmarks: s.browser.bookmarks.filter((b) => b.id !== id) } })),

      clearHistory: () => set((s) => ({ browser: { ...s.browser, history: [] } })),

      setSearchEngine: (engine) => set((s) => ({ browser: { ...s.browser, searchEngine: engine } })),

      setBrowserNight: (v) => set((s) => ({ browser: { ...s.browser, night: v } })),

      startDownload: (name, kind) => {
        const id = cityId('dl')
        set((s) => ({ browser: { ...s.browser, downloads: [{ id, name, kind, progress: 0, done: false, at: Date.now() }, ...s.browser.downloads] } }))
        const timer = window.setInterval(() => {
          const cur = get().browser.downloads.find((d) => d.id === id)
          if (!cur || cur.done) {
            window.clearInterval(timer)
            return
          }
          const next = Math.min(100, cur.progress + randInt(12, 34))
          set((st) => ({ browser: { ...st.browser, downloads: st.browser.downloads.map((d) => (d.id === id ? { ...d, progress: next, done: next >= 100 } : d)) } }))
          if (next >= 100) window.clearInterval(timer)
        }, 700)
      },

      finishDownload: (id) => set((s) => ({ browser: { ...s.browser, downloads: s.browser.downloads.map((d) => (d.id === id ? { ...d, progress: 100, done: true } : d)) } })),

      removeDownload: (id) => set((s) => ({ browser: { ...s.browser, downloads: s.browser.downloads.filter((d) => d.id !== id) } })),

      /* ============================================================
         股市与经济
         ============================================================ */

      refreshMarket: (stocks) => {
        const s = get()
        const next = stocks?.length ? stocks : buildSeedStocks()
        set({ stockMarket: { ...s.stockMarket, stocks: next, indices: buildSeedIndices(), lastTickAt: Date.now(), news: localStockNews(next) } })
      },

      marketTick: () => {
        const s = get()
        const now = s.city.cityTime
        const economy = s.stockMarket.economy
        const drift = ((economy - 50) / 50) * 0.0035
        const breaking: StockNews[] = []
        const stocks = s.stockMarket.stocks.map((st) => {
          const vol = st.sector === '科技' ? 0.022 : st.sector === '能源' ? 0.016 : 0.013
          let r = drift + (Math.random() - 0.5) * vol * 2
          let alert = st.alert
          if (Math.random() < 0.02) {
            const good = Math.random() < 0.5
            r += good ? 0.06 : -0.06
            alert = good ? '利好：机构上调评级' : '利空：业绩不及预期'
            breaking.push({ id: cityId('sn'), title: `${st.name}（${st.symbol}）${alert}`, symbol: st.symbol, impact: good ? 'good' : 'bad', at: now })
          }
          const price = Math.max(0.5, Number((st.price * (1 + r)).toFixed(2)))
          const candle: Candle = {
            t: now,
            o: st.price,
            h: Number((Math.max(st.price, price) * (1 + Math.random() * 0.01)).toFixed(2)),
            l: Number((Math.min(st.price, price) * (1 - Math.random() * 0.01)).toFixed(2)),
            c: price,
            v: Math.round(st.volume * (0.5 + Math.random())),
          }
          const prevClose = st.price
          const change = Number((price - prevClose).toFixed(2))
          return {
            ...st,
            price,
            prevClose,
            change,
            changePct: Number(((change / prevClose) * 100).toFixed(2)),
            volume: Math.round(st.volume * (0.7 + Math.random() * 0.6)),
            high52w: Math.max(st.high52w, price),
            low52w: Math.min(st.low52w, price),
            history: [...st.history, candle].slice(-90),
            orderBook: genOrderBook(price),
            alert,
            relatedNews: breaking.some((b) => b.symbol === st.symbol) ? [breaking.find((b) => b.symbol === st.symbol)!.title, ...st.relatedNews].slice(0, 5) : st.relatedNews,
          }
        })

        // 指数跟随成分股
        const avgPct = (pred: (st: Stock) => boolean, fallback: number) => {
          const list = stocks.filter(pred)
          if (!list.length) return fallback
          return list.reduce((a, st) => a + st.changePct, 0) / list.length
        }
        const indices = s.stockMarket.indices.map((ix) => {
          const pct = ix.id === 'ix_tech' ? avgPct((st) => st.sector === '科技', ix.changePct) : ix.id === 'ix_cons' ? avgPct((st) => st.sector === '消费' || st.sector === '娱乐', ix.changePct) : avgPct(() => true, ix.changePct)
          const value = Number((ix.value * (1 + pct / 100)).toFixed(2))
          return { ...ix, prevClose: ix.value, value, change: Number((value - ix.value).toFixed(2)), changePct: Number(pct.toFixed(2)), volume: Math.round(ix.volume * (0.8 + Math.random() * 0.5)), history: [...ix.history, value].slice(-60) }
        })

        set({
          stockMarket: {
            ...s.stockMarket,
            stocks,
            indices,
            lastTickAt: now,
            news: breaking.length ? [...breaking, ...s.stockMarket.news].slice(0, 40) : s.stockMarket.news,
          },
        })

        // 大盘异动 → 触发经济事件 / 快讯
        if (breaking.length && Math.random() < 0.4) {
          get().pushBreakingNews('Mul市股市异动', breaking[0].title, '财经')
        }
      },

      tradeStock: (symbol, side, shares, orderType, limitPrice) => {
        const s = get()
        const st = s.stockMarket.stocks.find((x) => x.symbol === symbol)
        if (!st) return { ok: false, reason: '股票不存在' }
        if (!Number.isFinite(shares) || shares <= 0) return { ok: false, reason: '股数无效' }
        const price = st.price
        if (orderType === 'limit') {
          if (limitPrice == null) return { ok: false, reason: '请填写限价' }
          if (side === 'buy' && price > limitPrice) return { ok: false, reason: `当前价 ¥${price} 高于限价，未成交` }
          if (side === 'sell' && price < limitPrice) return { ok: false, reason: `当前价 ¥${price} 低于限价，未成交` }
        }
        const amount = Number((price * shares).toFixed(2))
        const me = personById(s.people, ME_ID)

        if (side === 'buy') {
          if (s.stockMarket.cash < amount) return { ok: false, reason: '资金余额不足' }
          const pos = s.stockMarket.portfolio.find((p) => p.symbol === symbol)
          const portfolio = pos
            ? s.stockMarket.portfolio.map((p) => (p.symbol === symbol ? { ...p, shares: p.shares + shares, avgCost: Number(((p.avgCost * p.shares + amount) / (p.shares + shares)).toFixed(3)) } : p))
            : [...s.stockMarket.portfolio, { symbol, shares, avgCost: price }]
          set({
            stockMarket: {
              ...s.stockMarket,
              cash: Number((s.stockMarket.cash - amount).toFixed(2)),
              portfolio,
              trades: [{ id: cityId('td'), symbol, side, orderType, price, shares, amount, at: Date.now() }, ...s.stockMarket.trades].slice(0, 120),
            },
            people: me ? s.people.map((p) => (p.id === ME_ID ? { ...p, attributes: { ...p.attributes, cityContribution: p.attributes.cityContribution + 1 } } : p)) : s.people,
          })
          set((cur) => ({ stockMarket: { ...cur.stockMarket, economy: Math.max(0, Math.min(100, cur.stockMarket.economy + 0.1)) } }))
          return { ok: true, price }
        }

        // 卖出
        const pos = s.stockMarket.portfolio.find((p) => p.symbol === symbol)
        if (!pos || pos.shares < shares) return { ok: false, reason: '持仓不足' }
        const realized = Number(((price - pos.avgCost) * shares).toFixed(2))
        const portfolio = pos.shares === shares ? s.stockMarket.portfolio.filter((p) => p.symbol !== symbol) : s.stockMarket.portfolio.map((p) => (p.symbol === symbol ? { ...p, shares: p.shares - shares } : p))
        set({
          stockMarket: {
            ...s.stockMarket,
            cash: Number((s.stockMarket.cash + amount).toFixed(2)),
            portfolio,
            trades: [{ id: cityId('td'), symbol, side, orderType, price, shares, amount, at: Date.now() }, ...s.stockMarket.trades].slice(0, 120),
          },
          // 已实现盈亏计入钱包，打通股市与经济系统
          banks: s.banks.map((b) => (b.personId === ME_ID ? { ...b, balance: b.balance + realized } : b)),
          people: s.people.map((p) => (p.id === ME_ID ? { ...p, bankAccount: p.bankAccount + realized } : p)),
        })
        return { ok: true, price }
      },

      setInitialCapital: (amount) =>
        set((s) => ({ stockMarket: { ...s.stockMarket, initialCapital: amount, cash: amount, portfolio: [], trades: [], frozen: 0 } })),

      pushStockNews: (title, symbol = '', impact = 'neutral') =>
        set((s) => ({ stockMarket: { ...s.stockMarket, news: [{ id: cityId('sn'), title, symbol, impact, at: Date.now() }, ...s.stockMarket.news].slice(0, 40) } })),

      setEconomy: (v) => set((s) => ({ stockMarket: { ...s.stockMarket, economy: Math.max(0, Math.min(100, Math.round(v))) } })),

      /* ============================================================
         事件引擎
         ============================================================ */

      addGameEvent: (input) => {
        const id = input.id ?? cityId('gev')
        const source = input.source ?? 'system'
        const ev: GameEvent = {
          id,
          type: input.type ?? '随机事件',
          title: input.title,
          description: input.description,
          triggerType: input.triggerType ?? 'probability',
          triggerCondition: input.triggerCondition ?? '',
          involvedPersons: input.involvedPersons ?? [],
          locationId: input.locationId ?? pick(LANDMARKS).id,
          time: input.time ?? Date.now(),
          duration: input.duration ?? 2,
          outcome: input.outcome ?? '',
          choices: input.choices ?? [],
          consequences: input.consequences ?? [],
          isResolved: input.isResolved ?? false,
          source,
          parentId: input.parentId,
          createdAt: Date.now(),
        }
        set((s) => ({
          events: {
            ...s.events,
            active: [ev, ...s.events.active].slice(0, 40),
            npcGenerated: source === 'npc' || source === 'ai' ? [ev, ...s.events.npcGenerated].slice(0, 40) : s.events.npcGenerated,
            userTriggered: source === 'user' ? [ev, ...s.events.userTriggered].slice(0, 40) : s.events.userTriggered,
          },
        }))
        return id
      },

      resolveGameEvent: (id, choiceIndex) => {
        const s = get()
        const ev = s.events.active.find((e) => e.id === id)
        if (!ev) return { ok: false }
        const choice = ev.choices[choiceIndex]
        const eff = choice?.effects ?? {}
        const me = personById(s.people, ME_ID)
        let people = s.people
        if (me) {
          people = people.map((p) =>
            p.id === ME_ID
              ? {
                  ...p,
                  mood: Math.max(0, Math.min(100, p.mood + (eff.mood ?? 0))),
                  bankAccount: p.bankAccount + (eff.money ?? 0),
                  attributes: {
                    ...p.attributes,
                    socialCredit: Math.max(0, p.attributes.socialCredit + (eff.socialCredit ?? 0)),
                  },
                }
              : p
          )
        }
        // 好感度作用于事件相关居民
        if (eff.affinity) {
          const targets = ev.involvedPersons.filter((pid) => pid !== ME_ID)
          targets.forEach((pid) => {
            people = people.map((p) => {
              if (p.id !== pid) return p
              const found = p.relationships.find((r) => r.personId === ME_ID)
              const next: Relation = found
                ? { ...found, affinity: Math.max(0, Math.min(100, found.affinity + eff.affinity!)), memories: [...found.memories, `事件：${ev.title}`].slice(-6) }
                : { personId: ME_ID, type: 'stranger', affinity: Math.max(0, 20 + eff.affinity!), memories: [`事件：${ev.title}`] }
              return { ...p, relationships: [...p.relationships.filter((r) => r.personId !== ME_ID), next] }
            })
          })
        }

        const text = choice ? `${choice.text} → ${choice.consequence}` : ev.outcome || '事件已结束'
        const resolved: GameEvent = { ...ev, outcome: choice?.consequence ?? ev.outcome, isResolved: true, consequences: [...ev.consequences, choice?.consequence ?? ''] }

        set({
          people,
          stockMarket: eff.economy ? { ...s.stockMarket, economy: Math.max(0, Math.min(100, s.stockMarket.economy + eff.economy)) } : s.stockMarket,
          events: {
            ...s.events,
            active: s.events.active.filter((e) => e.id !== id),
            completed: [resolved, ...s.events.completed].slice(0, 60),
            history: [{ id: cityId('tl'), at: Date.now(), title: ev.title, text }, ...s.events.history].slice(0, 80),
          },
        })

        // 事件链：触发下一个事件
        if (choice?.nextEventId) {
          const nextTpl = s.events.templates.find((t) => t.id === choice.nextEventId)
          if (nextTpl) {
            get().addGameEvent({
              type: nextTpl.type,
              title: nextTpl.title,
              description: nextTpl.description,
              triggerType: 'chain',
              source: 'system',
              parentId: ev.id,
              involvedPersons: ev.involvedPersons,
              locationId: ev.locationId,
            })
          }
        }
        return { ok: true, text }
      },

      dismissGameEvent: (id) =>
        set((s) => {
          const ev = s.events.active.find((e) => e.id === id)
          if (!ev) return s
          return {
            events: {
              ...s.events,
              active: s.events.active.filter((e) => e.id !== id),
              completed: [{ ...ev, isResolved: true, outcome: ev.outcome || '未参与' }, ...s.events.completed].slice(0, 60),
            },
          }
        }),

      triggerNpcEvent: () => {
        const s = get()
        const ev = localGameEvent(s.people)
        get().addGameEvent({ ...ev, source: 'npc', triggerType: 'probability' })
      },

      triggerEventByLocation: (landmarkId) => {
        const s = get()
        const lm = landmarkById(s.city, landmarkId)
        if (!lm) return null
        if (Math.random() > 0.55) return null
        const ev = localGameEvent(s.people, { locationId: landmarkId })
        const id = get().addGameEvent({ ...ev, source: 'npc', triggerType: 'location' })
        get().pushCivilRecord(`${lm.name} 触发了事件：${ev.title}`)
        return id
      },

      joinCalendar: (id) => set((s) => ({ events: { ...s.events, calendar: s.events.calendar.map((c) => (c.id === id ? { ...c, joined: !c.joined } : c)) } })),

      refreshCalendar: () => set((s) => ({ events: { ...s.events, calendar: buildSeedCalendar() } })),

      resetWorld: () => set(() => createSeed()),
    }),
    {
      name: 'ksc:mulcity',
      version: 3,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<MulCityState>
        const seed = createSeed()
        return {
          ...state,
          activities: state.activities ?? [],
          lastSimRealAt: state.lastSimRealAt ?? 0,
          // 老版本存档补上新增模块
          news: state.news ?? seed.news,
          microblog: state.microblog ?? seed.microblog,
          browser: state.browser ?? seed.browser,
          stockMarket: state.stockMarket ?? seed.stockMarket,
          events: state.events ?? seed.events,
        } as MulCityState
      },
    }
  )
)

/** 六维属性加权出等级（1-10） */
export function rankLevel(attrs: Partial<PersonAttrs>): number {
  const total =
    (attrs.intelligence ?? 50) +
    (attrs.emotional ?? 50) +
    (attrs.aesthetic ?? 50) +
    (attrs.courage ?? 50) +
    (attrs.fitness ?? 50) +
    (attrs.luck ?? 50)
  return Math.max(1, Math.min(10, Math.round(total / 60)))
}

function s0<T>(v: T | undefined): T | undefined {
  return v
}

/* ---------- 选择器 ---------- */

export function useMe(): Person {
  return useMulCity((s) => s.people.find((p) => p.id === ME_ID) ?? s.people[0])
}

export function useMeId(): string {
  return ME_ID
}

/** 当前城市时间（订阅 cityTime，随 tick 更新） */
export function useCityNow(): number {
  return useMulCity((s) => s.city.cityTime)
}

export function adminsOf(state: MulCityState): Person[] {
  return state.people.filter((p) => state.admins.some((a) => a.personId === p.id))
}

export function visiblePeople(people: Person[], filter: { type?: PersonType | 'all'; districtId?: string; keyword?: string }): Person[] {
  return people.filter((p) => {
    if (filter.type && filter.type !== 'all' && p.type !== filter.type) return false
    if (filter.districtId) {
      const lm = LANDMARKS.find((l) => l.id === p.lastSeenLocation)
      if (!lm || lm.districtId !== filter.districtId) return false
    }
    if (filter.keyword && !p.name.includes(filter.keyword) && !p.nickname.includes(filter.keyword)) return false
    return true
  })
}

export { DISTRICTS, LANDMARKS, JOBS, METRO_LINES, WEATHERS, localPerson, localWorldEvent, cityId }
