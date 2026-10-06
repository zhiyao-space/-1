import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DISTRICTS,
  EMOTIONS,
  LANDMARKS,
  JOBS,
  METRO_LINES,
  WEATHERS,
  buildSeedPeople,
  buildSeedShows,
  buildSeedWorldEvents,
  buildSeedPosts,
  buildSeedGroups,
  cityId,
  localMeetLine,
  localMoveLine,
  localPerson,
  localWorldEvent,
  pick,
  pickSome,
  randInt,
} from '../lib/cityCatalog'

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

  resetWorld: () => void
}

export const ME_ID = 'person_me'
export const CITY_NAME = 'Mul市'
/** 城市自转的真实时间节流：每 12 秒推进一小步（暂停时不动） */
const SIM_REAL_MS = 12000

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

      importCharacters: () => {
        const existing = new Set(get().people.map((p) => p.name))
        let added = 0
        try {
          const raw = localStorage.getItem('ksc:characters')
          if (!raw) return 0
          const parsed = JSON.parse(raw) as { state?: { characters?: { id: string; name: string; identity?: string; personality?: string; avatarId?: string | null }[] } }
          const list = parsed.state?.characters ?? []
          const made: Person[] = []
          for (const c of list) {
            if (!c.name || existing.has(c.name)) continue
            made.push(
              localPerson({
                type: 'character',
                name: c.name,
                occupation: c.identity || undefined,
                bio: c.personality || '',
                avatar: c.avatarId || '',
              })
            )
            added += 1
          }
          if (made.length) {
            set((s) => ({ people: [...s.people, ...made] }))
            get().pushCivilRecord(`从恋爱 App 导入 ${made.length} 位角色`)
          }
        } catch {
          return 0
        }
        return added
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

      resetWorld: () => set(() => createSeed()),
    }),
    {
      name: 'ksc:mulcity',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<MulCityState>
        return {
          ...state,
          activities: state.activities ?? [],
          lastSimRealAt: state.lastSimRealAt ?? 0,
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
