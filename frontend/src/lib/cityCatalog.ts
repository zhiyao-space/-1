import type {
  BrowseResult,
  BrowserBookmark,
  BrowserTab,
  Candle,
  CalendarItem,
  CityMeta,
  Course,
  District,
  EventChoice,
  EventTemplate,
  GameEvent,
  GameEventType,
  GroupChat,
  Job,
  Landmark,
  MicroblogCommunity,
  MicroblogPost,
  MicroblogSpace,
  NewsCategory,
  NewsItem,
  OrderBook,
  Person,
  PersonAttrs,
  PersonType,
  Post,
  QuickLink,
  ScheduleItem,
  ShowEvent,
  Stock,
  StockIndex,
  StockNews,
  TrendingTopic,
  WebPage,
  WorldEvent,
} from '../store/mulCity'
import { rankLevel } from '../store/mulCity'

/* ============================================================
   Mul市 · 静态目录与本地生成
   区域 / 地标 / 职业 / 地铁 / 姓名词池
   无 AI 时的本地兜底：人物、事件、演出、动态、群聊
   本文件对 store 只做类型引用，避免运行时循环依赖
   ============================================================ */

let seq = 0
export function cityId(prefix = 'c'): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function pickSome<T>(list: T[], n: number): T[] {
  const copy = [...list]
  const out: T[] = []
  for (let i = 0; i < n && copy.length; i += 1) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}

/* ---------- 区域 ---------- */

export const DISTRICTS: District[] = [
  { id: 'd_center', name: '市中心', description: 'Mul市的心脏，广场与钟塔在地图正中。', landmarks: ['lm_square', 'lm_library', 'lm_clock'], crimeRate: 4, cleanliness: 92, population: 18400 },
  { id: 'd_old', name: '老城区', description: '旧巷、茶馆与城墙遗址，时间走得慢一些。', landmarks: ['lm_teahouse', 'lm_photo', 'lm_wall'], crimeRate: 12, cleanliness: 71, population: 9600 },
  { id: 'd_biz', name: '商业区', description: '百货、便利店与创客空间，灯一直亮着。', landmarks: ['lm_dept', 'lm_conv', 'lm_maker'], crimeRate: 7, cleanliness: 88, population: 12300 },
  { id: 'd_res', name: '住宅区', description: '梧桐里与社区公园，傍晚最热闹。', landmarks: ['lm_wutong', 'lm_park', 'lm_lateshop'], crimeRate: 3, cleanliness: 90, population: 26800 },
  { id: 'd_culture', name: '文化区', description: '剧场、美术馆与独立书店挤在一条街上。', landmarks: ['lm_theater', 'lm_gallery', 'lm_bookstore'], crimeRate: 2, cleanliness: 94, population: 6400 },
  { id: 'd_hub', name: '交通枢纽', description: '机场、火车站与地铁总站交汇于此。', landmarks: ['lm_airport', 'lm_railway', 'lm_metrohub'], crimeRate: 9, cleanliness: 80, population: 5100 },
  { id: 'd_seaside', name: '海滨', description: '栈桥与灯塔，风里带咸味。', landmarks: ['lm_pier', 'lm_lighthouse', 'lm_tidecafe'], crimeRate: 5, cleanliness: 89, population: 4200 },
  { id: 'd_mountain', name: '山区', description: '半山观景台与竹林步道，安静得能听见风。', landmarks: ['lm_deck', 'lm_bamboo', 'lm_observatory'], crimeRate: 1, cleanliness: 97, population: 2100 },
]

/* ---------- 地标（含地图坐标 0-100） ---------- */

export const LANDMARKS: Landmark[] = [
  { id: 'lm_square', name: '中央广场', type: '广场', districtId: 'd_center', description: '全城活动都在这里开场。', x: 54, y: 41, capacity: 3000 },
  { id: 'lm_library', name: '市立图书馆', type: '文化', districtId: 'd_center', description: '穹顶很高，午后有光柱。', x: 46, y: 36, capacity: 600 },
  { id: 'lm_clock', name: '城市钟塔', type: '地标', districtId: 'd_center', description: '整点会响，全城都听得见。', x: 61, y: 47, capacity: 200 },

  { id: 'lm_teahouse', name: '老街茶馆', type: '餐饮', districtId: 'd_old', description: '一壶茶能坐一下午。', x: 33, y: 27, capacity: 120 },
  { id: 'lm_photo', name: '旧巷照相馆', type: '店铺', districtId: 'd_old', description: '还在用胶片，冲洗要等三天。', x: 27, y: 34, capacity: 40 },
  { id: 'lm_wall', name: '老城墙遗址', type: '遗迹', districtId: 'd_old', description: '剩下的一段墙，砖上有刻字。', x: 38, y: 21, capacity: 500 },

  { id: 'lm_dept', name: '星光百货', type: '商场', districtId: 'd_biz', description: '顶楼有个能看全城的露台。', x: 77, y: 29, capacity: 5000 },
  { id: 'lm_conv', name: '24h 便利店', type: '店铺', districtId: 'd_biz', description: '凌晨三点也亮着。', x: 84, y: 36, capacity: 60 },
  { id: 'lm_maker', name: '创客空间', type: '办公', districtId: 'd_biz', description: '很多人在这里做自己的东西。', x: 71, y: 37, capacity: 150 },

  { id: 'lm_wutong', name: '梧桐里社区', type: '住宅', districtId: 'd_res', description: '楼道里总有饭菜香。', x: 66, y: 59, capacity: 900 },
  { id: 'lm_park', name: '社区公园', type: '公园', districtId: 'd_res', description: '晚上有人在这里弹吉他。', x: 73, y: 66, capacity: 1200 },
  { id: 'lm_lateshop', name: '深夜食堂', type: '餐饮', districtId: 'd_res', description: '只开到凌晨一点，老板话不多。', x: 62, y: 68, capacity: 70 },

  { id: 'lm_theater', name: 'Mul 剧场', type: '演出', districtId: 'd_culture', description: '座位不多，但音响很好。', x: 39, y: 58, capacity: 480 },
  { id: 'lm_gallery', name: '现代美术馆', type: '展览', districtId: 'd_culture', description: '常换展，门票不贵。', x: 45, y: 64, capacity: 800 },
  { id: 'lm_bookstore', name: '独立书店', type: '书店', districtId: 'd_culture', description: '选书很挑，老板会跟你聊。', x: 33, y: 65, capacity: 90 },

  { id: 'lm_airport', name: 'Mul 国际机场', type: '机场', districtId: 'd_hub', description: '飞往八个城市。', x: 14, y: 68, capacity: 8000 },
  { id: 'lm_railway', name: '中央火车站', type: '车站', districtId: 'd_hub', description: '绿皮和高铁都从这儿走。', x: 22, y: 75, capacity: 6000 },
  { id: 'lm_metrohub', name: '地铁总站', type: '地铁', districtId: 'd_hub', description: '三条线的交汇点。', x: 27, y: 68, capacity: 4000 },

  { id: 'lm_pier', name: '海风栈桥', type: '景点', districtId: 'd_seaside', description: '走到尽头就没有路了，只有海。', x: 84, y: 80, capacity: 700 },
  { id: 'lm_lighthouse', name: '灯塔', type: '地标', districtId: 'd_seaside', description: '晚上会转，光扫过海面。', x: 90, y: 86, capacity: 100 },
  { id: 'lm_tidecafe', name: '潮汐咖啡馆', type: '餐饮', districtId: 'd_seaside', description: '窗边能看见退潮。', x: 79, y: 87, capacity: 60 },

  { id: 'lm_deck', name: '半山观景台', type: '景点', districtId: 'd_mountain', description: '能看到整个 Mul市的灯。', x: 16, y: 18, capacity: 300 },
  { id: 'lm_bamboo', name: '竹林步道', type: '步道', districtId: 'd_mountain', description: '走完全程要一个小时。', x: 9, y: 25, capacity: 200 },
  { id: 'lm_observatory', name: '山顶天文台', type: '地标', districtId: 'd_mountain', description: '晴夜开放，需要预约。', x: 21, y: 10, capacity: 80 },
]

export const WEATHERS = ['晴', '多云', '阴', '小雨', '薄雾', '阵雨', '晴转多云', '微风']

/* ---------- 地铁线路 ---------- */

export const METRO_LINES: { id: string; name: string; color: string; stations: string[] }[] = [
  { id: 'm1', name: '1 号线 · 山海线', color: '#9dc0e6', stations: ['lm_observatory', 'lm_deck', 'lm_wall', 'lm_square', 'lm_dept', 'lm_park', 'lm_pier'] },
  { id: 'm2', name: '2 号线 · 环城线', color: '#9fd8c4', stations: ['lm_railway', 'lm_teahouse', 'lm_library', 'lm_clock', 'lm_maker', 'lm_wutong', 'lm_gallery'] },
  { id: 'm3', name: '3 号线 · 快线', color: '#e8c07d', stations: ['lm_airport', 'lm_metrohub', 'lm_square', 'lm_theater', 'lm_lateshop'] },
]

/* ---------- 职业 ---------- */

export const JOBS: Job[] = [
  { id: 'job_barista', title: '咖啡师', salary: 6200, levelReq: 1, skillReq: '咖啡', creditReq: 80, desc: '早班多，能学到手冲。', tags: ['门店', '早班'] },
  { id: 'job_clerk', title: '便利店店员', salary: 5200, levelReq: 1, skillReq: '', creditReq: 80, desc: '三班倒，夜班有补贴。', tags: ['轮班', '门槛低'] },
  { id: 'job_photo', title: '摄影师', salary: 8800, levelReq: 2, skillReq: '摄影', creditReq: 100, desc: '接单自由，看作品说话。', tags: ['自由', '作品制'] },
  { id: 'job_teacher', title: '培训机构讲师', salary: 9600, levelReq: 3, skillReq: '音乐', creditReq: 110, desc: '周末最忙。', tags: ['教学', '周末班'] },
  { id: 'job_chef', title: '主厨', salary: 12000, levelReq: 3, skillReq: '烹饪', creditReq: 105, desc: '深夜食堂缺人。', tags: ['餐饮', '高压'] },
  { id: 'job_designer', title: '平面设计师', salary: 10500, levelReq: 2, skillReq: '', creditReq: 100, desc: '远程为主，按项目结算。', tags: ['远程', '项目制'] },
  { id: 'job_curator', title: '美术馆策展助理', salary: 9200, levelReq: 3, skillReq: '', creditReq: 115, desc: '接触展览一线。', tags: ['文化', '体面'] },
  { id: 'job_engineer', title: '城市系统工程师', salary: 16800, levelReq: 5, skillReq: '编程', creditReq: 130, desc: '维护 Mul市 的底层系统。', tags: ['高薪', '高压'] },
  { id: 'job_guide', title: '城市向导', salary: 7400, levelReq: 2, skillReq: '', creditReq: 95, desc: '带人逛 Mul市，认识很多人。', tags: ['自由', '社交'] },
  { id: 'job_medic', title: '社区医生', salary: 13400, levelReq: 4, skillReq: '医疗', creditReq: 125, desc: '社区中心坐诊。', tags: ['稳定', '受尊敬'] },
]

/* ---------- 姓名 / 属性词池 ---------- */

const SURNAMES = ['林', '苏', '程', '沈', '周', '陈', '许', '江', '顾', '秦', '叶', '谢', '温', '宋', '陆', '白', '夏', '钟', '贺', '简']
const GIVEN = ['晚', '叙', '南', '岸', '知', '屿', '淮', '川', '澄', '野', '时', '临', 'астра', '宁', '禾', '苓', '听', '屿', '眠', '序', '屿', '禾', '望', '津', '槐', '棠', '屿']
const NICKNAMES = ['小晚', '阿叙', '南南', '岸岸', '知知', '小屿', '阿淮', '川川', '澄澄', '野子', '时时', '临临', '小禾子', '宁宁', '阿苓']
const ZODIACS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼']
const MBTIS = ['INTJ', 'INFP', 'ENFP', 'INFJ', 'ENTP', 'ISFP', 'ISTJ', 'ESFJ', 'ISTP', 'ENFJ', 'ESTP', 'ISFJ']
export const EMOTIONS = ['平静', '雀跃', '疲惫', '专注', '慵懒', '期待', '有点低落', '心不在焉', '愉快', '若有所思']
export const PERSONALITY_TAGS = ['温柔', '慢热', '话少', '毒舌', '体贴', '固执', '浪漫', '理性', '敏感', '乐观', '安静', '好奇心重']
export const HOBBY_TAGS = ['咖啡', '摄影', '看电影', '爬山', '听歌', '做饭', '养猫', '看书', '骑行', '手作', '逛展', '夜跑']
export const SKILL_POOL = ['咖啡', '摄影', '烹饪', '音乐', '手工', '编程', '医疗', '写作', '驾驶']

export const OCCUPATIONS = [
  '咖啡师', '书店店员', '自由摄影师', '插画师', '中学教师', '糕点师', '心理咨询师',
  '城市规划师', '手作职人', '节目编导', '程序员', '花艺师', '录音师', '货车司机', '护士', '待业',
]

/* ---------- 本地生成人物 ---------- */

function attrs(input?: Partial<PersonAttrs>): PersonAttrs {
  const base: PersonAttrs = {
    intelligence: randInt(35, 85),
    emotional: randInt(35, 85),
    aesthetic: randInt(35, 85),
    courage: randInt(35, 85),
    fitness: randInt(35, 85),
    luck: randInt(35, 85),
    socialCredit: randInt(85, 130),
    level: 1,
    cityContribution: randInt(0, 60),
  }
  const merged = { ...base, ...input }
  return { ...merged, level: merged.level ?? rankLevel(merged) }
}

export function localPerson(input: Partial<Person> & { name?: string; type?: PersonType }): Person {
  const now = Date.now()
  const name = (input.name ?? `${pick(SURNAMES)}${pick(GIVEN)}`).replace(/[^\u4e00-\u9fa5A-Za-z]/g, '') || `居民${randInt(100, 999)}`
  const type: PersonType = input.type ?? 'npc'
  const occupation = input.occupation ?? pick(OCCUPATIONS)
  const homeLandmark = input.lastSeenLocation ?? pick(LANDMARKS).id
  const hobbies = input.hobbies?.length ? input.hobbies : pickSome(HOBBY_TAGS, randInt(2, 4))
  const schedule: ScheduleItem[] = [
    { id: cityId('sch'), time: '08:00', activity: '通勤', locationId: 'lm_metrohub', duration: 1, repeat: 'daily' },
    { id: cityId('sch'), time: '10:00', activity: occupation, locationId: homeLandmark, duration: 6, repeat: 'daily' },
    { id: cityId('sch'), time: '19:30', activity: pick(['散步', '看书', '见朋友', '回家做饭', '逛便利店']), locationId: pick(LANDMARKS).id, duration: 2, repeat: 'daily' },
  ]
  return {
    id: input.id ?? cityId('person'),
    type,
    name,
    nickname: input.nickname ?? pick(NICKNAMES),
    avatar: input.avatar ?? '',
    civilId: input.civilId ?? `MUL-2026-${String(randInt(1, 9999)).padStart(4, '0')}`,
    gender: input.gender ?? pick(['male', 'female', 'other'] as const),
    age: input.age ?? randInt(18, 46),
    birthday: input.birthday ?? `${randInt(1, 12)}-${String(randInt(1, 28)).padStart(2, '0')}`,
    birthPlace: input.birthPlace ?? `${pick(DISTRICTS).name}`,
    address: input.address ?? `${pick(DISTRICTS).name}一带`,
    occupation,
    phone: input.phone ?? `13${randInt(100000000, 999999999)}`,
    bio: input.bio ?? pick(['在这里生活了很久。', '刚搬来不久，还在熟悉路。', '不太爱说话，但很好相处。', '喜欢在夜里出门走走。', '把日子过得很慢。']),
    zodiac: input.zodiac ?? pick(ZODIACS),
    mbti: input.mbti ?? pick(MBTIS),
    hobbies,
    attributes: attrs(input.attributes),
    relationships: input.relationships ?? [],
    schedule: input.schedule ?? schedule,
    dailyTasks: input.dailyTasks ?? [],
    mood: input.mood ?? randInt(40, 90),
    energy: input.energy ?? randInt(45, 95),
    health: input.health ?? randInt(70, 100),
    rank: input.rank ?? '',
    isAdmin: input.isAdmin ?? false,
    bankAccount: input.bankAccount ?? randInt(800, 60000),
    monthlyIncome: input.monthlyIncome ?? randInt(3000, 16000),
    monthlyExpenses: input.monthlyExpenses ?? randInt(2000, 9000),
    skills: input.skills?.length ? input.skills : pickSome(SKILL_POOL, randInt(1, 3)),
    wardrobe: input.wardrobe ?? [],
    inventory: input.inventory ?? pickSome(['地铁卡', '雨伞', '记事本', '保温杯', '旧相机'], randInt(1, 3)),
    family: input.family ?? [],
    memory: input.memory ?? [],
    lastSeenLocation: homeLandmark,
    lastActive: now - randInt(0, 3600000),
    sleepSchedule: input.sleepSchedule ?? { wakeHour: randInt(6, 9), sleepHour: randInt(22, 26), isNightOwl: Math.random() > 0.7 },
    isOnline: input.isOnline ?? Math.random() > 0.45,
    currentEmotion: input.currentEmotion ?? pick(EMOTIONS),
    createdAt: now,
  }
}

/* ---------- 种子人物 ---------- */

export function buildSeedPeople(): Person[] {
  const now = Date.now()
  const me: Person = {
    ...localPerson({
      id: 'person_me',
      type: 'user',
      name: '林晚',
      nickname: '小晚',
      gender: 'female',
      age: 23,
      occupation: '自由职业',
      bio: '在 Mul市 租了一间朝南的小房子，日子过得不算快。',
      zodiac: '天秤',
      mbti: 'INFP',
      hobbies: ['咖啡', '看电影', '散步'],
      address: '住宅区 梧桐里 3 幢 502',
      lastSeenLocation: 'lm_wutong',
      skills: ['咖啡', '写作'],
      bankAccount: 12800,
      monthlyIncome: 8000,
      monthlyExpenses: 4200,
      attributes: { intelligence: 68, emotional: 74, aesthetic: 81, courage: 55, fitness: 60, luck: 66, socialCredit: 118, level: 3, cityContribution: 120 },
      isOnline: true,
      currentEmotion: '平静',
    }),
    civilId: 'MUL-2026-0001',
    rank: '稳定居民',
  }

  const roster: Partial<Person>[] = [
    { name: '苏叙', nickname: '阿叙', gender: 'male', age: 27, occupation: '咖啡师', hobbies: ['咖啡', '骑行', '听歌'], lastSeenLocation: 'lm_lateshop', bio: '深夜食堂的常客，做咖啡很认真。', zodiac: '天蝎', mbti: 'ISFP', attributes: { intelligence: 62, emotional: 70, aesthetic: 76, courage: 68, fitness: 72, luck: 58, socialCredit: 124, level: 4, cityContribution: 180 } },
    { name: '程知', nickname: '知知', gender: 'female', age: 31, occupation: '市立图书馆馆员', hobbies: ['看书', '写作'], lastSeenLocation: 'lm_library', bio: '管着一整层书，记得每本书的位置。', attributes: { intelligence: 88, emotional: 66, aesthetic: 74, courage: 52, fitness: 48, luck: 60, socialCredit: 140, level: 5, cityContribution: 260 }, isAdmin: true },
    { name: '沈岸', nickname: '岸岸', gender: 'male', age: 24, occupation: '自由摄影师', hobbies: ['摄影', '爬山'], lastSeenLocation: 'lm_photo', bio: '还在用胶片，冲洗要等三天。', zodiac: '射手', mbti: 'ENFP', attributes: { intelligence: 66, emotional: 72, aesthetic: 89, courage: 77, fitness: 70, luck: 63, socialCredit: 108, level: 3, cityContribution: 95 } },
    { name: '顾南', nickname: '南南', gender: 'female', age: 29, occupation: '美术馆策展人', hobbies: ['逛展', '看电影'], lastSeenLocation: 'lm_gallery', bio: '一年里有一半时间在布展。', attributes: { intelligence: 82, emotional: 68, aesthetic: 90, courage: 60, fitness: 55, luck: 57, socialCredit: 132, level: 5, cityContribution: 240 } },
    { name: '江野', nickname: '野子', gender: 'male', age: 35, occupation: '深夜食堂主厨', hobbies: ['做饭', '养猫'], lastSeenLocation: 'lm_lateshop', bio: '话不多，但会记得你上次点了什么。', attributes: { intelligence: 58, emotional: 80, aesthetic: 62, courage: 70, fitness: 66, luck: 61, socialCredit: 126, level: 5, cityContribution: 220 } },
    { name: '叶澄', nickname: '澄澄', gender: 'female', age: 21, occupation: '独立书店店员', hobbies: ['看书', '咖啡'], lastSeenLocation: 'lm_bookstore', bio: '刚毕业，书店里最年轻的那个。', zodiac: '双鱼', mbti: 'INFP', attributes: { intelligence: 71, emotional: 83, aesthetic: 78, courage: 45, fitness: 52, luck: 74, socialCredit: 102, level: 2, cityContribution: 60 } },
    { name: '温时', nickname: '时时', gender: 'male', age: 33, occupation: '城市系统工程师', hobbies: ['编程', '夜跑'], lastSeenLocation: 'lm_maker', bio: '维护 Mul市 的底层系统，很少露面。', attributes: { intelligence: 94, emotional: 50, aesthetic: 58, courage: 64, fitness: 74, luck: 55, socialCredit: 128, level: 6, cityContribution: 320 }, isAdmin: true },
    { name: '许苓', nickname: '阿苓', gender: 'female', age: 26, occupation: '花艺师', hobbies: ['手作', '养猫'], lastSeenLocation: 'lm_park', bio: '在社区公园边上开了间小花店。', attributes: { intelligence: 64, emotional: 78, aesthetic: 86, courage: 58, fitness: 60, luck: 69, socialCredit: 116, level: 3, cityContribution: 110 } },
    { name: '周眠', nickname: '眠眠', gender: 'female', age: 19, occupation: '学生', hobbies: ['听歌', '逛展'], lastSeenLocation: 'lm_metrohub', bio: '每天坐 3 号线穿过半个城市上学。', attributes: { intelligence: 76, emotional: 70, aesthetic: 72, courage: 50, fitness: 58, luck: 66, socialCredit: 95, level: 1, cityContribution: 20 } },
    { name: '陆听', nickname: '听听', gender: 'male', age: 41, occupation: '城市向导', hobbies: ['爬山', '骑车'], lastSeenLocation: 'lm_deck', bio: '能把 Mul市 每条小路讲成故事。', attributes: { intelligence: 70, emotional: 74, aesthetic: 66, courage: 80, fitness: 84, luck: 62, socialCredit: 134, level: 6, cityContribution: 300 } },
    { name: '白序', nickname: '序序', gender: 'female', age: 38, occupation: '社区医生', hobbies: ['做饭', '看书'], lastSeenLocation: 'lm_wutong', bio: '社区中心坐诊，认识大半条街的人。', attributes: { intelligence: 85, emotional: 76, aesthetic: 60, courage: 72, fitness: 68, luck: 59, socialCredit: 138, level: 6, cityContribution: 340 } },
    { name: '贺津', nickname: '津津', gender: 'male', age: 22, occupation: '便利店店员', hobbies: ['看电影', '夜跑'], lastSeenLocation: 'lm_conv', bio: '上夜班，凌晨三点也在。', attributes: { intelligence: 60, emotional: 68, aesthetic: 64, courage: 62, fitness: 71, luck: 70, socialCredit: 98, level: 2, cityContribution: 45 } },
  ]

  const others = roster.map((r) => localPerson({ type: Math.random() > 0.5 ? 'character' : 'npc', ...r }))
  // 让每个人都与“我”有初始关系
  const people = [me, ...others]
  people.forEach((p, i) => {
    if (i === 0) return
    const t = pick(['friend', 'colleague', 'classmate', 'stranger', 'crush'] as const)
    const affinity = t === 'stranger' ? randInt(0, 25) : randInt(30, 78)
    me.relationships.push({ personId: p.id, type: t, affinity, memories: [] })
    p.relationships.push({ personId: me.id, type: t, affinity: Math.max(0, affinity - randInt(-10, 10)), memories: [] })
  })
  me.relationships.push({ personId: me.id, type: 'self', affinity: 100, memories: [] })
  people.forEach((p) => {
    p.rank = rankLevel(p.attributes) >= 6 ? '城市名流' : rankLevel(p.attributes) >= 4 ? '资深市民' : rankLevel(p.attributes) >= 2 ? '稳定居民' : '新晋市民'
    p.lastActive = now - randInt(0, 1800000)
  })
  return people
}

/* ---------- 种子事件 / 动态 / 群聊 ---------- */

const EVENT_TEMPLATES: { title: string; type: string; desc: string }[] = [
  { title: 'Mul市 夏季音乐节开票', type: '节日庆典', desc: '海滨栈桥连开三晚，全城都在等开票。' },
  { title: '老城区夜市限时回归', type: '商业活动', desc: '老街茶馆到城墙遗址，摆满一百多个摊子。' },
  { title: '地铁 3 号线临时检修', type: '突发事件', desc: '晚高峰会延误，向导们已经在群里提醒。' },
  { title: '美术馆新展《雾与钟塔》开幕', type: '商业活动', desc: '展期两个月，首周半价。' },
  { title: '半山观景台流星观测夜', type: '节日庆典', desc: '山顶天文台开放预约，名额不多。' },
  { title: '中央广场旧书交换市集', type: '商业活动', desc: '带一本书来，换一本书走。' },
  { title: '深夜食堂老板生日', type: '意外/偶遇', desc: '据说当天到店的人都能分到一块蛋糕。' },
]

/* ---------- 自转活动文案（城市自己运转时用） ---------- */

/** 一位居民移动到某地标时的动态文案，随时段变化 */
export function localMoveLine(name: string, landmarkName: string, cityTime: number): string {
  const h = new Date(cityTime).getHours()
  const lines =
    h >= 23 || h < 5
      ? [`${name} 还醒着，一个人在${landmarkName}`, `${name} 从${landmarkName}慢慢往回走`, `${name} 在${landmarkName}待到了深夜`]
      : h < 11
        ? [`${name} 一早就到了${landmarkName}`, `${name} 路过${landmarkName}，脚步很快`, `${name} 在${landmarkName}开始今天`]
        : h >= 18
          ? [`${name} 下班后去了${landmarkName}`, `${name} 在${landmarkName}待到天黑`, `${name} 绕路去了${landmarkName}`]
          : [`${name} 出现在${landmarkName}`, `${name} 在${landmarkName}待了一会儿`, `${name} 去${landmarkName}办事`]
  return pick(lines)
}

/** 两位居民在同一地点相遇的文案 */
export function localMeetLine(a: string, b: string, landmarkName: string): string {
  return pick([
    `${a} 在${landmarkName}碰到了${b}，两个人站着聊了几句`,
    `${b} 在${landmarkName}被${a}叫住，一起走了一段`,
    `${a} 和 ${b} 在${landmarkName}刚好遇上`,
    `${a} 在${landmarkName}给${b}打了个招呼`,
  ])
}

export function localWorldEvent(people: Person[], input?: { title?: string; type?: string; description?: string; locationId?: string }): WorldEvent {
  const tpl = pick(EVENT_TEMPLATES)
  const involved = pickSome(people.filter((p) => p.type !== 'user'), randInt(1, 3)).map((p) => p.id)
  return {
    id: cityId('evt'),
    title: input?.title ?? tpl.title,
    type: input?.type ?? tpl.type,
    locationId: input?.locationId ?? pick(LANDMARKS).id,
    time: Date.now() + randInt(1, 72) * 3600000,
    involvedPersons: involved,
    description: input?.description ?? tpl.desc,
    outcome: '',
    createdAt: Date.now(),
  }
}

export function buildSeedWorldEvents(people: Person[]): WorldEvent[] {
  return [
    localWorldEvent(people, { title: 'Mul市 夏季音乐节开票', type: '节日庆典', description: '海滨栈桥连开三晚，全城都在等开票。', locationId: 'lm_pier' }),
    localWorldEvent(people, { title: '老城区夜市限时回归', type: '商业活动', description: '老街茶馆到城墙遗址，摆满一百多个摊子。', locationId: 'lm_wall' }),
    localWorldEvent(people, { title: '地铁 3 号线临时检修', type: '突发事件', description: '晚高峰会延误，向导们已经在群里提醒。', locationId: 'lm_metrohub' }),
  ]
}

export function buildSeedPosts(people: Person[]): Post[] {
  const now = Date.now()
  const pickPerson = (name: string) => people.find((p) => p.name === name) ?? people[1]
  const drafts: { by: string; text: string; tags: string[]; likes: number; at: number }[] = [
    { by: '苏叙', text: '今天的手冲换了新豆子，酸质很亮。有人来试吗？', tags: ['咖啡', '日常'], likes: 6, at: now - 3600000 },
    { by: '程知', text: '图书馆四楼靠窗的位置今天空着，我替你们占到了。', tags: ['阅读', 'Mul市'], likes: 12, at: now - 7200000 },
    { by: '沈岸', text: '冲洗出来的第一卷，有一张是海边的黄昏。', tags: ['摄影', '随手记'], likes: 9, at: now - 10800000 },
    { by: '顾南', text: '新展布到一半，墙上那道光比作品还好看。', tags: ['展览'], likes: 15, at: now - 14400000 },
    { by: '江野', text: '今晚多煮了一锅汤，来的人自己盛。', tags: ['深夜食堂'], likes: 21, at: now - 18000000 },
    { by: '叶澄', text: '书店来了一批旧版诗集，封面很好看。', tags: ['书店', '碎碎念'], likes: 4, at: now - 21600000 },
  ]
  return drafts.map((d) => ({
    id: cityId('post'),
    personId: pickPerson(d.by).id,
    text: d.text,
    images: [],
    tags: d.tags,
    likes: Array.from({ length: d.likes }, () => cityId('g')),
    comments: [],
    at: d.at,
  }))
}

export function buildSeedGroups(people: Person[]): GroupChat[] {
  const byName = (n: string) => people.find((p) => p.name === n)?.id ?? people[1].id
  const now = Date.now()
  return [
    {
      id: cityId('grp'),
      name: '梧桐里夜聊',
      memberIds: ['person_me', byName('苏叙'), byName('许苓'), byName('贺津')],
      topics: ['夜宵', '附近新店', '散步'],
      messages: [
        { id: cityId('gm'), personId: byName('苏叙'), text: '有人现在还在外面吗？', at: now - 5400000 },
        { id: cityId('gm'), personId: byName('许苓'), text: '在公园这，风挺舒服的。', at: now - 5200000 },
      ],
      createdAt: now - 86400000 * 12,
    },
    {
      id: cityId('grp'),
      name: 'Mul市文化组',
      memberIds: ['person_me', byName('顾南'), byName('程知'), byName('叶澄')],
      topics: ['展览', '书单', '放映'],
      messages: [{ id: cityId('gm'), personId: byName('顾南'), text: '周五预展，给你们留了位子。', at: now - 9000000 }],
      createdAt: now - 86400000 * 30,
    },
  ]
}

/* ---------- 演出 ---------- */

const CONCERT_TITLES = ['夏夜回声 · 巡演 Mul市站', '小雨乐队专场', '城市噪音 · 电子夜', '海边民谣夜', '午夜合成器']
const THEATER_TITLES = ['话剧《钟塔下的等待》', '音乐剧《雾季》', '脱口秀 · 老城区夜场', '舞剧《潮汐》']
const EXHIBITION_TITLES = ['《雾与钟塔》当代艺术展', '胶片摄影联展', '漫展 · Mul市 06', '科技与手工的边界']
const VENUES = ['Mul 剧场', '现代美术馆', '中央广场露天舞台', '海滨栈桥剧场', '星光百货顶层露台']

export function buildSeedShows(): ShowEvent[] {
  const now = Date.now()
  const drafts: { kind: ShowEvent['kind']; title: string; artist: string; venue: string; inHours: number; min: number; max: number; total: number }[] = [
    { kind: 'concert', title: CONCERT_TITLES[0], artist: '夏夜回声', venue: VENUES[0], inHours: 26, min: 280, max: 880, total: 480 },
    { kind: 'concert', title: CONCERT_TITLES[1], artist: '小雨乐队', venue: VENUES[2], inHours: 74, min: 120, max: 420, total: 1200 },
    { kind: 'theater', title: THEATER_TITLES[0], artist: 'Mul 话剧社', venue: VENUES[0], inHours: 12, min: 160, max: 520, total: 480 },
    { kind: 'theater', title: THEATER_TITLES[2], artist: '老城喜剧团', venue: VENUES[3], inHours: 50, min: 90, max: 260, total: 300 },
    { kind: 'exhibition', title: EXHIBITION_TITLES[0], artist: '顾南 策展', venue: VENUES[1], inHours: 6, min: 45, max: 120, total: 3000 },
    { kind: 'exhibition', title: EXHIBITION_TITLES[1], artist: '沈岸 等', venue: VENUES[1], inHours: 120, min: 40, max: 80, total: 2000 },
  ]
  return drafts.map((d) => ({
    id: cityId('show'),
    kind: d.kind,
    title: d.title,
    artist: d.artist,
    venue: d.venue,
    startAt: now + d.inHours * 3600000,
    endAt: now + (d.inHours + (d.kind === 'exhibition' ? 240 : 3)) * 3600000,
    priceMin: d.min,
    priceMax: d.max,
    seatsTotal: d.total,
    seatsLeft: Math.round(d.total * (0.25 + Math.random() * 0.7)),
    description: pick(['现场比录音好太多。', '一年只有这一次。', '票不多，手慢无。', '适合一个人来看。']),
    saleAt: now - (Math.random() > 0.35 ? 3600000 : -3600000),
    createdAt: now,
  }))
}

/* ---------- 出行目的地与线路 ---------- */

export const DESTINATIONS = ['东京', '巴黎', '纽约', '首尔', '伦敦', '大理', '成都', '新加坡']
export const AIRLINES = ['Mul 航空', '云上航空', '南方航空', '极光航空']
export const AIRCRAFTS = ['A320', 'B737-800', 'A350', 'B787-9']
export const CITIES_CN = ['大理', '成都', '杭州', '西安', '厦门', '青岛', '长沙', '昆明']
export const TRAIN_SEATS = ['硬座', '硬卧', '软卧', '无座']
export const HS_SEATS = ['二等座', '一等座', '商务座']

/* ---------- 课程 ---------- */

export const COURSE_SEED: Omit<Course, 'id'>[] = [
  { title: '手冲咖啡入门', skill: '咖啡', level: 1, price: 299, weeks: 2, teacher: '苏叙' },
  { title: '胶片摄影基础', skill: '摄影', level: 1, price: 480, weeks: 4, teacher: '沈岸' },
  { title: '家常菜进阶', skill: '烹饪', level: 2, price: 360, weeks: 3, teacher: '江野' },
  { title: '吉他弹唱', skill: '音乐', level: 1, price: 520, weeks: 6, teacher: '陆听' },
  { title: '城市速写', skill: '写作', level: 1, price: 260, weeks: 2, teacher: '程知' },
]

/* ============================================================
   Tab9 · 新闻资讯
   ============================================================ */

export const NEWS_CATEGORIES: NewsCategory[] = ['Mul市要闻', '财经', '科技', '娱乐', '体育', '社会', '国际']

const NEWS_SOURCES: Record<NewsCategory, string[]> = {
  Mul市要闻: ['Mul市新闻中心', '城市晚报'],
  财经: ['财经观察', 'Mul市商报'],
  科技: ['科技前哨', '创客周刊'],
  娱乐: ['娱乐星报', '现场报道'],
  体育: ['城市体育报'],
  社会: ['社会纪实', '居民通讯'],
  国际: ['环球视野'],
}

interface NewsSeed {
  title: string
  summary: string
}

const NEWS_SEEDS: Record<NewsCategory, NewsSeed[]> = {
  Mul市要闻: [
    { title: '中央广场钟塔修缮完工，整点报时今晚恢复', summary: '停了两周的钟声将在今晚 20:00 重新响起，广场上已经有人提前等候。' },
    { title: 'Mul市拟新增两条夜间公交线，覆盖老城区与海滨', summary: '市政部门表示，线路方案将公示七天，居民可在社区中心提出意见。' },
    { title: '{P} 向市籍.程行系统提交了城市公共艺术提案', summary: '提案计划在地铁总站与梧桐里之间设置一组可互动装置。' },
    { title: '住宅区新增三处口袋公园，下月起陆续开放', summary: '社区公园东侧的地块已开始平整，预计秋天前完工。' },
  ],
  财经: [
    { title: 'Mul市综指收涨，科技与消费板块领跑', summary: '全天成交额较前一交易日放大，机构资金主要流向成长股。' },
    { title: '星光百货公布季度业绩，线下客流回升明显', summary: '管理层称顶层露台的夜间市集带动了整体客流。' },
    { title: 'Mul市经济景气度小幅上行，居民消费信心回暖', summary: '餐饮、演出与出行三项支出同比上升。' },
    { title: '地铁发布票价优化方案，通勤族或将受益', summary: '方案拟对月票与换乘优惠做出调整。' },
  ],
  科技: [
    { title: '创客空间发布开源项目「里世界时钟」，可同步城市时间', summary: '项目上线当天就收到了几十份社区提交的补丁。' },
    { title: 'Mul市城市系统完成一次静默升级，居民无感知', summary: '负责维护的工程师表示，这次升级主要优化了夜间调度。' },
    { title: '本地团队做出可在旧手机上运行的城市模拟器', summary: '演示里，整座 Mul市 在一部小手机里自行运转。' },
    { title: '独立书店引入电子借阅柜，扫码即可取书', summary: '首批上线两百本，涵盖小说与城市史。' },
  ],
  娱乐: [
    { title: '{P} 的新作品在美术馆预展上首次公开', summary: '现场排队的人从展厅一直绕到了台阶下。' },
    { title: '夏夜回声巡演 Mul市站开票，内场十分钟售罄', summary: '主办方称正在协调加场。' },
    { title: '深夜食堂老板上了本地节目，聊了聊二十年的一锅汤', summary: '节目播出后，小店门口排起了长队。' },
    { title: '独立放映周公布片单，多部胶片作品入选', summary: '放映地点在 Mul 剧场的小厅。' },
  ],
  体育: [
    { title: '环城骑行赛报名开启，路线沿滨海与山区展开', summary: '全程约 42 公里，设有三个补给点。' },
    { title: '竹林步道秋季登高活动名额已过半', summary: '活动要求结伴上山，山顶天文台当晚开放。' },
    { title: '{P} 在半程马拉松里跑出了个人最好成绩', summary: '终点设在中央广场，冲线时有人喊了他的名字。' },
    { title: '社区公园夜跑团扩招，新增两条路线', summary: '组织者提醒新人注意配速与补水。' },
  ],
  社会: [
    { title: '梧桐里一位居民在楼道里放了共享工具箱', summary: '箱子里有螺丝刀、胶带和一把旧雨伞，写着“用完放回”。' },
    { title: '{P} 连续三年在社区中心做志愿者', summary: '她说只是顺手，邻居们却说整条街都因此松快了些。' },
    { title: '老城区茶馆的常客们自发组织了一场旧物交换', summary: '换出去的多是旧书和旧唱片。' },
    { title: '深夜便利店的留言墙被写满了，店长说不会擦掉', summary: '上面大多是加班的人写给自己的一句话。' },
  ],
  国际: [
    { title: '多地出现类似的“城市自转”系统，引发讨论', summary: '研究者认为，这是一种新的城市叙事方式。' },
    { title: '跨城市高铁网络扩容，Mul市 被列入下一批节点', summary: '具体通车时间尚未公布。' },
    { title: '国际艺术双年展公布主题：雾与钟塔', summary: '多位 Mul市 创作者收到邀请。' },
    { title: '全球模型爱好者社区关注到一部小手机里的城市', summary: '他们把这种现象称作“里世界”。' },
  ],
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function fillTokens(text: string, people: Person[], city?: CityMeta): string {
  const others = people.filter((p) => p.type !== 'user')
  const person = others.length ? pick(others) : people[0]
  const lm = city?.landmarks?.length ? pick(city.landmarks) : pick(LANDMARKS)
  return text.replace(/\{P\}/g, person?.name ?? '一位居民').replace(/\{L\}/g, lm.name)
}

export function localNewsItem(people: Person[], city: CityMeta, category?: NewsCategory): NewsItem {
  const cat = category ?? pick(NEWS_CATEGORIES)
  const seed = pick(NEWS_SEEDS[cat])
  const lm = pick(city.landmarks.length ? city.landmarks : LANDMARKS)
  const person = pick(people.filter((p) => p.type !== 'user')) ?? people[0]
  const title = fillTokens(seed.title, people, city)
  const summary = fillTokens(seed.summary, people, city)
  const at = Date.now() - randInt(0, 10) * 3600000
  const body = [
    summary,
    `据${pick(NEWS_SOURCES[cat])}了解，这件事最早是从${lm.name}一带传开的。${pick([`${person?.name ?? '一位居民'}是当事人之一。`, '现场聚集了不少围观的居民。', '相关方尚未给出更多回应。'])}`,
    pick([
      '有居民表示，这样的变化让人对 Mul市 的日常多了一点期待。',
      '也有人认为，真正重要的不是结果，而是过程里那些被记住的瞬间。',
      '目前情况仍在持续，界面新闻将持续关注。',
      '熟悉这一带的人说，事情最后多半会以一种安静的方式收场。',
    ]),
  ].join('\n\n')
  return {
    id: cityId('nws'),
    title,
    summary,
    body,
    category: cat,
    source: pick(NEWS_SOURCES[cat]),
    author: pick(['本报记者', '通讯员', '编辑部', '特约撰稿']),
    images: [],
    at,
    expiresAt: at + 3 * 86400000,
    views: randInt(120, 9800),
    likes: [],
    dislikes: [],
    comments: [],
    relatedPersons: person ? [person.id] : [],
    landmarkId: lm.id,
  }
}

export function localNews(people: Person[], city: CityMeta, count = 10): NewsItem[] {
  const cats: NewsCategory[] = pickSome(NEWS_CATEGORIES, 3)
  const out: NewsItem[] = []
  for (let i = 0; i < count; i += 1) out.push(localNewsItem(people, city, cats[i % cats.length]))
  return out
}

export function buildSeedNews(people: Person[]): NewsItem[] {
  const city: CityMeta = { name: 'Mul市', districts: DISTRICTS, landmarks: LANDMARKS, weather: '晴', year: 2026, cityTime: Date.now(), timeScale: 1, lastTickAt: Date.now() }
  const cats: NewsCategory[] = ['Mul市要闻', '财经', '娱乐', '科技', '社会', '体育']
  return cats.map((c) => localNewsItem(people, city, c))
}

const TREND_LABELS = ['热', '沸', '新', '爆', '']

export function localTrendingTopics(people: Person[]): TrendingTopic[] {
  const others = people.filter((p) => p.type !== 'user')
  const names = others.map((p) => p.name)
  const pool = [
    'Mul市 夏季音乐节',
    '钟塔整点报时恢复',
    '地铁 3 号线',
    '深夜食堂',
    '梧桐里共享工具箱',
    '环城骑行赛',
    '美术馆新展',
    '老城区夜市',
    '城市系统升级',
    '海边日落',
    ...names.map((n) => `${n}`),
    ...names.slice(0, 5).map((n) => `${n} 的新作品`),
  ]
  const pickedUnique = Array.from(new Set(pool))
  return pickSome(pickedUnique, 10).map((title, i) => ({
    id: cityId('tr'),
    title,
    heat: Math.round((100 - i * 7) * 1000 + randInt(0, 6000)),
    label: i < 3 ? pick(TREND_LABELS.slice(0, 3)) : pick(TREND_LABELS),
    at: Date.now() - i * 1800000,
  }))
}

export const buildSeedTrending = localTrendingTopics

/* ============================================================
   Tab10 · 微博
   ============================================================ */

function microblogContent(person: Person, meName: string, affinity: number): string {
  const job = person.occupation
  const hobby = person.hobbies[0] ?? '散步'
  const warm = [
    `和 ${meName} 聊了会儿，忽然觉得 ${hobby} 这件事还是要有个人一起才好玩。`,
    `${meName} 今天又出现在我常去的地方，假装是巧合。`,
    `今天第 ${randInt(2, 7)} 杯咖啡，写 ${job} 的人大概都这样。`,
  ]
  const cool = [
    `做 ${job} 的第七年，还是会在下班路上多看两眼这座城市。`,
    `今天去${pick(LANDMARKS).name}走了走，人不多，风刚刚好。`,
    `把 ${hobby} 这件小事坚持下来，居然也有点成就感。`,
  ]
  const neut = [
    `Mul市 的傍晚真的很适合发呆。`,
    `${pick(LANDMARKS).name} 今天人有点多，但气氛很好。`,
    `睡前一问：你们最近在听什么？`,
  ]
  if (affinity > 60) return pick(warm)
  if (affinity >= 30) return pick(cool)
  return pick(neut)
}

export function localMicroblogPost(person: Person, meName: string, affinity: number, _cityTime: number): MicroblogPost {
  const likes = Array.from({ length: randInt(1, 60) }, () => cityId('g'))
  const commentCount = randInt(0, 4)
  const commenters = pickSome(person.hobbies.length ? [] : [], 0)
  void commenters
  return {
    id: cityId('mb'),
    authorId: person.id,
    content: microblogContent(person, meName, affinity),
    images: [],
    type: 'text',
    createdAt: Date.now() - randInt(0, 8) * 3600000,
    likes,
    reposts: [],
    comments: Array.from({ length: commentCount }, () => ({
      id: cityId('mc'),
      authorId: person.id,
      content: pick(['同感。', '哈哈哈哈哈。', '下次一起。', '这条我存了。', '说得真好。']),
      at: Date.now() - randInt(0, 6) * 3600000,
      likes: [],
    })),
    views: randInt(80, 4200),
    location: Math.random() > 0.5 ? pick(LANDMARKS).name : '',
    isAnonymous: false,
    tags: pickSome(person.hobbies, 1),
    isSensitive: false,
    bookmarks: [],
  }
}

export function buildSeedMicroblog(people: Person[]): MicroblogPost[] {
  const others = people.filter((p) => p.type !== 'user')
  const byName = (n: string) => others.find((p) => p.name === n) ?? others[0]
  const now = Date.now()
  const drafts: { by: string; content: string; tags: string[]; likes: number; type?: MicroblogPost['type']; poll?: string[]; loc?: string }[] = [
    { by: '苏叙', content: '新豆子到了，浅烘，尾段有股柑橘味。今晚店里见。', tags: ['咖啡', '深夜食堂'], likes: 42, loc: '深夜食堂' },
    { by: '程知', content: '图书馆四楼的光今天特别好，靠窗那排全被人占了。', tags: ['阅读'], likes: 68 },
    { by: '顾南', content: '布展到最后一天，墙上那道影子比作品还好看。明天见。', tags: ['展览', 'Mul市'], likes: 113 },
    { by: '沈岸', content: '第一卷一整卷都是海边，冲出来才知道哪几张能留。', tags: ['摄影'], likes: 77 },
    { by: '江野', content: '投票：今晚多煮的那锅汤，你们想喝清汤还是浓汤？', tags: ['深夜食堂'], likes: 31, type: 'poll', poll: ['清汤', '浓汤', '都来一碗'] },
    { by: '周眠', content: '3 号线今天又晚点，但车窗外的黄昏值回票价。', tags: ['日常', 'Mul市'], likes: 19 },
    { by: '陆听', content: '带人走了一趟山路，第一次发现竹林步道尽头有片湖。', tags: ['爬山'], likes: 54, loc: '竹林步道' },
    { by: '叶澄', content: '书店新到一批旧版诗集，封面都旧得好看。', tags: ['书店'], likes: 33 },
  ]
  return drafts.map((d) => {
    const person = byName(d.by)
    const poll = d.poll
      ? d.poll.map((text, i) => ({ id: `po_${i}_${cityId('o')}`, text, votes: Array.from({ length: randInt(3, 40) }, () => cityId('v')) }))
      : undefined
    return {
      id: cityId('mb'),
      authorId: person.id,
      content: d.content,
      images: [],
      type: d.type ?? 'text',
      createdAt: now - randInt(1, 12) * 3600000,
      likes: Array.from({ length: d.likes }, () => cityId('g')),
      reposts: Array.from({ length: Math.round(d.likes / 6) }, () => cityId('g')),
      comments: [],
      views: d.likes * randInt(8, 30),
      location: d.loc ?? '',
      isAnonymous: false,
      tags: d.tags,
      isSensitive: false,
      poll,
      bookmarks: [],
    }
  })
}

export const buildSeedHotSearch = localTrendingTopics

export function buildSeedSpaces(people: Person[]): MicroblogSpace[] {
  const others = people.filter((p) => p.type !== 'user')
  const at = (n: string) => (others.find((p) => p.name === n) ?? others[0]).id
  const now = Date.now()
  return [
    {
      id: cityId('sp'),
      title: '深夜连麦 · 城市里最安静的那个小时',
      topic: '你所在的城市此刻是什么样子',
      hostId: at('苏叙'),
      guestIds: [at('江野'), at('贺津')],
      startAt: now + 1800000,
      live: false,
      online: randInt(120, 900),
      reactions: randInt(200, 3000),
      subtitles: [],
    },
    {
      id: cityId('sp'),
      title: '展览幕后：一场展是怎么布起来的',
      topic: '策展人的一天',
      hostId: at('顾南'),
      guestIds: [at('沈岸')],
      startAt: now + 86400000,
      live: false,
      online: randInt(60, 400),
      reactions: randInt(100, 1500),
      subtitles: [],
    },
    {
      id: cityId('sp'),
      title: '早起的人都在做什么',
      topic: '六点的 Mul市',
      hostId: at('陆听'),
      guestIds: [at('程知')],
      startAt: now - 1800000,
      live: true,
      online: randInt(200, 1200),
      reactions: randInt(500, 6000),
      subtitles: ['要不要现在开始？', '我这边天刚亮。', '声音很清楚。'],
    },
  ]
}

export function buildSeedCommunities(people: Person[]): MicroblogCommunity[] {
  const others = people.filter((p) => p.type !== 'user')
  const at = (n: string) => (others.find((p) => p.name === n) ?? others[0]).id
  const now = Date.now()
  const mk = (name: string, desc: string, owner: string, members: string[]): MicroblogCommunity => ({
    id: cityId('cmt'),
    name,
    desc,
    ownerId: at(owner),
    memberIds: ['person_me', ...members.map(at)],
    posts: [
      {
        id: cityId('cp'),
        authorId: at(owner),
        content: `${name} 第 ${randInt(2, 40)} 次约活动，这次人应该能凑齐。`,
        images: [],
        type: 'text',
        createdAt: now - randInt(1, 40) * 3600000,
        likes: Array.from({ length: randInt(3, 30) }, () => cityId('g')),
        reposts: [],
        comments: [],
        views: randInt(50, 900),
        location: '',
        isAnonymous: false,
        tags: [name],
        isSensitive: false,
        bookmarks: [],
      },
    ],
    createdAt: now - randInt(30, 400) * 86400000,
  })
  return [
    mk('梧桐里生活群', '住在梧桐里的人都在这儿。', '许苓', ['苏叙', '贺津', '周眠']),
    mk('Mul市胶片社', '只聊胶卷、冲扫和光。', '沈岸', ['顾南', '叶澄']),
    mk('夜跑小队', '每晚九点，公园门口集合。', '温时', ['陆听', '贺津']),
  ]
}

/* ============================================================
   Tab11 · 浏览器
   ============================================================ */

export function buildSeedQuickLinks(): QuickLink[] {
  return [
    { id: cityId('ql'), title: 'Mul市门户', url: 'mul.city/portal', desc: '城市公告与政务服务' },
    { id: cityId('ql'), title: 'Mul市新闻', url: 'mul.city/news', desc: '要闻 · 财经 · 社会' },
    { id: cityId('ql'), title: '微博广场', url: 'mul.city/microblog', desc: '热搜与实时动态' },
    { id: cityId('ql'), title: 'Mul市证券', url: 'mul.city/stock', desc: '大盘 · 个股 · 资讯' },
    { id: cityId('ql'), title: '本地搜索', url: 'mul.city/local', desc: '搜人 / 搜地点 / 搜事件' },
    { id: cityId('ql'), title: '城市图书馆', url: 'mul.city/library', desc: '藏书与借阅' },
  ]
}

export function buildSeedBookmarks(): BrowserBookmark[] {
  const now = Date.now()
  return [
    { id: cityId('bm'), title: 'Mul市门户', url: 'mul.city/portal', folder: '常用', at: now - 86400000 },
    { id: cityId('bm'), title: 'Mul市证券行情', url: 'mul.city/stock', folder: '常用', at: now - 43200000 },
    { id: cityId('bm'), title: '城市图书馆', url: 'mul.city/library', folder: '阅读', at: now - 172800000 },
  ]
}

export function buildSeedBrowserTabs(): BrowserTab[] {
  return [{ id: cityId('tab'), title: '新标签页', url: '', kind: 'home', query: '', results: [] }]
}

export function localBrowseResults(query: string, people: Person[]): BrowseResult[] {
  const q = query.trim() || 'Mul市'
  const others = people.filter((p) => p.type !== 'user')
  const person = pick(others.length ? others : people)
  const lm = pick(LANDMARKS)
  const results: BrowseResult[] = [
    { id: cityId('sr'), title: `Mul市门户 · 关于「${q}」`, url: `mul.city/portal?q=${encodeURIComponent(q)}`, summary: `Mul市官方门户汇总了与「${q}」相关的政务公告、城市活动与公共服务入口。`, site: 'mul.city' },
    { id: cityId('sr'), title: `${q} - Mul市新闻专题`, url: `mul.city/news/topic/${encodeURIComponent(q)}`, summary: `新闻中心已为「${q}」建立专题页，收录近期相关报道与居民来稿。`, site: 'mul.city' },
    { id: cityId('sr'), title: `${person.name} 的主页 · 微博`, url: `mul.city/microblog/u/${person.id}`, summary: `${person.name}，${person.occupation}。最近在聊「${q}」，主页有 ${randInt(20, 400)} 条微博。`, site: 'mul.city' },
    { id: cityId('sr'), title: `${lm.name} · 城市地图词条`, url: `mul.city/map/${lm.id}`, summary: `${lm.name}（${lm.type}）：${lm.description}`, site: 'mul.city' },
    { id: cityId('sr'), title: `「${q}」相关行情 · Mul市证券`, url: `mul.city/stock/search?q=${encodeURIComponent(q)}`, summary: `与「${q}」可能相关的上市公司与板块，附实时行情与资讯。`, site: 'mul.city' },
  ]
  return pickSome(results, randInt(3, 5))
}

export function localWebPage(query: string, people: Person[]): WebPage {
  const q = query.trim() || 'Mul市'
  const others = people.filter((p) => p.type !== 'user')
  const person = pick(others.length ? others : people)
  const lm = pick(LANDMARKS)
  const url = q.startsWith('mul.city') ? q : `mul.city/search?q=${encodeURIComponent(q)}`
  const isStock = /stock|股|行情|证券/.test(q)
  const isNews = /news|新闻|快讯/.test(q)
  const isMicro = /microblog|微博|热搜/.test(q)
  const title = isStock ? 'Mul市证券 · 行情中心' : isNews ? 'Mul市新闻 · 专题' : isMicro ? 'Mul市微博 · 广场' : `${q} · Mul市门户`
  const site = url.split('/')[0]
  const blocks = [
    { type: 'h' as const, text: title },
    { type: 'p' as const, text: `这是 Mul市 内部网络的一页。你搜索的是「${q}」。${pick(['页面加载得很快，像这座城市的节奏。', '页脚写着：Mul市网络中心维护。', '没有广告，只有城市自己的内容。'])}` },
    { type: 'h' as const, text: '相关内容' },
    {
      type: 'list' as const,
      items: [
        `${lm.name}：${lm.description}`,
        `${person.name}（${person.occupation}）最近提到过「${q}」`,
        `热搜：${q} 正在 Mul市 被讨论`,
      ],
    },
    { type: 'quote' as const, text: pick(['“城市不需要被解释，它只需要被生活。”', '“里世界也是世界。”', '“每一条街都记得走过的人。”']) },
    { type: 'p' as const, text: '本页面由 Mul市 AI 内容引擎模拟生成，仅用于城市内部浏览。' },
  ]
  return { title, url, site, blocks }
}

/* ============================================================
   Tab12 · 股市与经济
   ============================================================ */

export const SECTORS = ['科技', '消费', '金融', '医药', '娱乐', '能源']

const STOCK_SEED: { symbol: string; name: string; sector: string; price: number; pe: number }[] = [
  { symbol: 'MUL001', name: 'Mul市科技', sector: '科技', price: 42.6, pe: 38 },
  { symbol: 'MUL002', name: '云雾数据', sector: '科技', price: 88.3, pe: 52 },
  { symbol: 'MUL003', name: '星轨半导体', sector: '科技', price: 156.4, pe: 61 },
  { symbol: 'MUL101', name: '深夜食品', sector: '消费', price: 23.8, pe: 22 },
  { symbol: 'MUL102', name: '梧桐里百货', sector: '消费', price: 31.2, pe: 18 },
  { symbol: 'MUL103', name: '潮汐咖啡', sector: '消费', price: 18.9, pe: 27 },
  { symbol: 'MUL201', name: 'Mul市银行', sector: '金融', price: 12.4, pe: 9 },
  { symbol: 'MUL202', name: '港湾保险', sector: '金融', price: 27.5, pe: 12 },
  { symbol: 'MUL203', name: '城信证券', sector: '金融', price: 19.6, pe: 15 },
  { symbol: 'MUL301', name: '社区医药', sector: '医药', price: 35.7, pe: 29 },
  { symbol: 'MUL302', name: '白序生物', sector: '医药', price: 64.1, pe: 44 },
  { symbol: 'MUL401', name: '夏夜文娱', sector: '娱乐', price: 29.3, pe: 33 },
  { symbol: 'MUL402', name: 'Mul 剧场', sector: '娱乐', price: 15.8, pe: 24 },
  { symbol: 'MUL403', name: '胶片影业', sector: '娱乐', price: 47.2, pe: 40 },
  { symbol: 'MUL501', name: '灯塔能源', sector: '能源', price: 22.1, pe: 11 },
  { symbol: 'MUL502', name: '海风电力', sector: '能源', price: 33.4, pe: 14 },
  { symbol: 'MUL503', name: '半山燃气', sector: '能源', price: 17.9, pe: 10 },
  { symbol: 'MUL601', name: '城市交通', sector: '金融', price: 9.8, pe: 8 },
]

export function genCandles(base: number, days = 30): Candle[] {
  const now = Date.now()
  const out: Candle[] = []
  let p = base * (0.86 + Math.random() * 0.18)
  for (let i = days - 1; i >= 0; i -= 1) {
    const o = p
    const drift = (Math.random() - 0.47) * 0.036
    const c = Math.max(0.5, o * (1 + drift))
    out.push({
      t: now - i * 86400000,
      o: r2(o),
      h: r2(Math.max(o, c) * (1 + Math.random() * 0.02)),
      l: r2(Math.min(o, c) * (1 - Math.random() * 0.02)),
      c: r2(c),
      v: randInt(180000, 3200000),
    })
    p = c
  }
  const last = out[out.length - 1]
  const k = base / last.c
  out.forEach((cd) => {
    cd.o = r2(cd.o * k)
    cd.h = r2(cd.h * k)
    cd.l = r2(cd.l * k)
    cd.c = r2(cd.c * k)
  })
  return out
}

export function genOrderBook(price: number): OrderBook {
  const bids: [number, number][] = []
  const asks: [number, number][] = []
  for (let i = 1; i <= 5; i += 1) {
    bids.push([r2(price - i * price * 0.002), randInt(100, 4200)])
    asks.push([r2(price + i * price * 0.002), randInt(100, 4200)])
  }
  return { bids, asks }
}

export function buildSeedStocks(): Stock[] {
  return STOCK_SEED.map((s) => {
    const history = genCandles(s.price, 30)
    const prevClose = history.length > 1 ? history[history.length - 2].c : s.price
    const change = r2(s.price - prevClose)
    const sharesOut = randInt(2, 40) * 100000000
    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: s.price,
      prevClose,
      change,
      changePct: r2((change / prevClose) * 100),
      volume: randInt(300000, 8000000),
      marketCap: Math.round(s.price * sharesOut),
      peRatio: s.pe,
      eps: r2(s.price / s.pe),
      high52w: r2(Math.max(...history.map((c) => c.h)) * 1.05),
      low52w: r2(Math.min(...history.map((c) => c.l)) * 0.95),
      history,
      orderBook: genOrderBook(s.price),
      relatedNews: [],
      alert: '',
    }
  })
}

export function buildSeedIndices(): StockIndex[] {
  const mk = (id: string, name: string, value: number): StockIndex => ({
    id,
    name,
    value,
    prevClose: value,
    change: 0,
    changePct: 0,
    volume: randInt(10000000, 90000000),
    history: Array.from({ length: 30 }, () => r2(value * (0.97 + Math.random() * 0.06))),
  })
  return [mk('ix_mul', 'MUL综指', 3241.66), mk('ix_tech', '科技指数', 1876.42), mk('ix_cons', '消费指数', 2140.08)]
}

export function localStockNews(stocks: Stock[]): StockNews[] {
  const pickStocks = pickSome(stocks, Math.min(5, stocks.length))
  return pickStocks.map((s, i) => ({
    id: cityId('sn'),
    title: pick([
      `${s.name}（${s.symbol}）发布季度经营数据，营收同比${pick(['增长', '回落'])}`,
      `${s.name} 获机构调研，${s.sector}板块受关注`,
      `${s.name} 公告：拟投入新项目`,
      `${s.name} 今日出现大宗交易`,
    ]),
    symbol: s.symbol,
    impact: pick(['good', 'bad', 'neutral'] as const),
    at: Date.now() - i * 1800000,
  }))
}

/* ============================================================
   事件引擎
   ============================================================ */

interface EventTpl extends EventTemplate {
  choices: EventChoice[]
  chainTo?: string
}

const EVENT_TPL: EventTpl[] = [
  {
    id: 'tpl_schedule',
    type: '日程事件',
    title: '下班后的邀约',
    description: '{P} 问你要不要一起去{L}走走，说最近有件小事想聊聊。',
    triggerType: 'time',
    weight: 10,
    choices: [
      { text: '一起去', consequence: '你们在{L}聊了很久，关系近了一些。', effects: { affinity: 8, mood: 6 } },
      { text: '改天吧', consequence: '对方说好，语气里有一点失落。', effects: { affinity: -3 } },
    ],
  },
  {
    id: 'tpl_random',
    type: '随机事件',
    title: '在{L}捡到一样东西',
    description: '你在{L}的地上捡到一个旧相机，镜头盖还开着，里面好像还有胶卷。',
    triggerType: 'location',
    weight: 8,
    choices: [
      { text: '交给管理员', consequence: '管理员记下了你的市籍号，社信小幅提升。', effects: { socialCredit: 3 } },
      { text: '自己留着', consequence: '你把相机收进包里，心里有点不踏实。', effects: { mood: 2, socialCredit: -1 } },
      { text: '拍两张再交', consequence: '你按了两下快门，然后把它交给了管理员。', effects: { socialCredit: 2, mood: 4 } },
    ],
  },
  {
    id: 'tpl_social',
    type: '社交事件',
    title: '{P} 和 {P2} 闹了点别扭',
    description: '两个人因为一件小事僵住了，都希望你能说句话。',
    triggerType: 'condition',
    weight: 9,
    choices: [
      { text: '各劝一句', consequence: '你两边都说了话，事情缓和了下来。', effects: { socialCredit: 2, affinity: 3 } },
      { text: '站在一边', consequence: '你选了一边，另一边记在了心里。', effects: { affinity: -2, socialCredit: -1 } },
      { text: '装作没看见', consequence: '你走开了，气氛留在原地。', effects: { mood: -3 } },
    ],
  },
  {
    id: 'tpl_economy',
    type: '经济事件',
    title: 'Mul市 经济数据公布',
    description: '本季度经济景气度出炉，市场对{L}一带的消费复苏看法不一。',
    triggerType: 'time',
    weight: 7,
    choices: [
      { text: '加仓看多', consequence: '你选择了相信这座城市，市场情绪随之上扬。', effects: { economy: 2, money: -800 } },
      { text: '观望', consequence: '你按兵不动，等待更清晰的信号。', effects: { mood: 1 } },
      { text: '减仓避险', consequence: '你把风险控制在了手里。', effects: { money: 400, economy: -1 } },
    ],
  },
  {
    id: 'tpl_special',
    type: '特殊事件',
    title: '{L} 的临时演出',
    description: '有人在{L}搭起了简易舞台，说今晚有一场没有预告的演出。',
    triggerType: 'probability',
    weight: 6,
    choices: [
      { text: '留下来听', consequence: '你在人群里站了两个小时，散场时耳朵还在响。', effects: { mood: 10, money: -60 } },
      { text: '拍照就走', consequence: '你拍了几张照片，发到了微博上。', effects: { mood: 3 } },
    ],
    chainTo: 'tpl_random',
  },
  {
    id: 'tpl_user',
    type: '用户相关事件',
    title: '{P} 想找你帮个忙',
    description: '{P} 说他最近在{L}遇到点麻烦，想到的第一个人是你。',
    triggerType: 'interaction',
    weight: 9,
    choices: [
      { text: '答应', consequence: '你答应了，对方明显松了口气。', effects: { affinity: 10, mood: -2 } },
      { text: '先问清楚', consequence: '你把事情问清楚了才决定帮忙，对方说你靠谱。', effects: { affinity: 6, socialCredit: 1 } },
      { text: '委婉拒绝', consequence: '你说自己最近也忙，对方说理解。', effects: { affinity: -5 } },
    ],
  },
  {
    id: 'tpl_npc',
    type: '社交事件',
    title: '{P} 在{L}办了一场小型分享会',
    description: '主题是「怎么把日子过慢一点」，来了十几个人，坐得满满当当。',
    triggerType: 'time',
    weight: 7,
    choices: [
      { text: '去听听', consequence: '你听完之后，忽然想给自己放个假。', effects: { mood: 8, affinity: 5 } },
      { text: '帮忙张罗', consequence: '你在现场忙前忙后，认识了好几个人。', effects: { socialCredit: 4, affinity: 6, mood: 3 } },
    ],
  },
]

export function buildSeedGameTemplates(): EventTemplate[] {
  return EVENT_TPL.map(({ choices: _c, chainTo: _t, ...t }) => t)
}

export function localGameEvent(
  people: Person[],
  opts?: { type?: GameEventType; hint?: string; locationId?: string }
): GameEvent {
  const pool = opts?.type ? EVENT_TPL.filter((t) => t.type === opts.type) : EVENT_TPL
  const tplRaw = pool.length ? pick(pool) : EVENT_TPL[0]
  const others = people.filter((p) => p.type !== 'user')
  const picked = pickSome(others.length ? others : people, randInt(1, 2))
  const p1 = picked[0]?.name ?? '一位居民'
  const p2 = picked[1]?.name ?? p1
  const lm = opts?.locationId ? (LANDMARKS.find((l) => l.id === opts.locationId) ?? pick(LANDMARKS)) : pick(LANDMARKS)
  const fill = (s: string) => s.replace(/\{P2\}/g, p2).replace(/\{P\}/g, p1).replace(/\{L\}/g, lm.name)
  const chainTpl = tplRaw.chainTo ? EVENT_TPL.find((t) => t.id === tplRaw.chainTo) : undefined
  const choices: EventChoice[] = tplRaw.choices.map((c, i) => ({
    ...c,
    text: fill(c.text),
    consequence: fill(c.consequence),
    nextEventId: chainTpl && i === 0 ? chainTpl.id : undefined,
  }))
  return {
    id: cityId('gev'),
    type: tplRaw.type,
    title: fill(tplRaw.title),
    description: fill(tplRaw.description),
    triggerType: tplRaw.triggerType,
    triggerCondition: opts?.hint ?? '',
    involvedPersons: picked.map((p) => p.id),
    locationId: lm.id,
    time: Date.now() + randInt(-2, 6) * 3600000,
    duration: randInt(1, 4),
    outcome: '',
    choices,
    consequences: [],
    isResolved: false,
    source: 'npc',
    createdAt: Date.now(),
  }
}

export function buildSeedCalendar(): CalendarItem[] {
  const now = Date.now()
  const drafts: { title: string; kind: string; inHours: number; locationId: string }[] = [
    { title: '中央广场周末市集', kind: '市集', inHours: 40, locationId: 'lm_square' },
    { title: '美术馆新展预展', kind: '展览', inHours: 18, locationId: 'lm_gallery' },
    { title: '海滨栈桥日落演出', kind: '演出', inHours: 62, locationId: 'lm_pier' },
    { title: '竹林步道登高日', kind: '活动', inHours: 120, locationId: 'lm_bamboo' },
    { title: '老城区夜市', kind: '市集', inHours: 8, locationId: 'lm_wall' },
    { title: '山顶天文台开放夜', kind: '活动', inHours: 96, locationId: 'lm_observatory' },
  ]
  return drafts.map((d) => ({
    id: cityId('cal'),
    title: d.title,
    kind: d.kind,
    at: now + d.inHours * 3600000,
    locationId: d.locationId,
    joined: false,
    done: false,
  }))
}
