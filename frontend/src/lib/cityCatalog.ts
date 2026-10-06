import type {
  Course,
  District,
  GroupChat,
  Job,
  Landmark,
  Person,
  PersonAttrs,
  PersonType,
  Post,
  ScheduleItem,
  ShowEvent,
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
