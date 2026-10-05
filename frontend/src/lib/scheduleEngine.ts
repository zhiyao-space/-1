import { useCharacters, type Character } from '../store/characters'
import { useSettings } from '../store/settings'
import { useSchedule, type AutoDay, type AutoItem, type AutoScheduleType } from '../store/schedule'

interface PersonaProfile {
  extrovert: number
  student: boolean
  worker: boolean
  homebody: boolean
  artistic: boolean
  nightOwl: number
}

interface EventTemplate {
  label: string
  moment: string
}

function detectPersona(c: Character): PersonaProfile {
  const text = `${c.personality} ${c.identity} ${c.commStyle}`
  const p: PersonaProfile = { extrovert: 0.35, student: false, worker: false, homebody: false, artistic: false, nightOwl: 0.2 }
  if (/外向|活泼|开朗|话痨|社牛|热情|爱笑|自来熟/.test(text)) p.extrovert += 0.3
  if (/内向|安静|高冷|冷淡|社恐|独来独往|孤僻|沉默|寡言|慢热/.test(text)) p.extrovert -= 0.25
  if (/学生|上课|校园|学霸|社团|高中生|大学生|逃课/.test(text)) p.student = true
  if (/上班|打工|工作|职员|社畜|老板|创业|值班|兼职/.test(text)) p.worker = true
  if (/宅|游戏|动漫|网瘾|电竞|家里蹲/.test(text)) { p.homebody = true; p.extrovert -= 0.1 }
  if (/画|音乐|写|文艺|摄影|阅读|吉他|钢琴|诗人/.test(text)) p.artistic = true
  if (/熬夜|夜猫|失眠|晚睡/.test(text)) p.nightOwl = 0.8
  p.extrovert = Math.max(0.05, Math.min(0.95, p.extrovert))
  return p
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function jitter(base: number, max: number): number {
  return Math.max(0, base + Math.floor(Math.random() * (max * 2 + 1)) - max)
}

function fmtTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function fill(t: string, name: string, peer: string): string {
  return t.replace(/\{name\}/g, name).replace(/\{peer\}/g, peer)
}

const DAILY_EVENTS: EventTemplate[] = [
  { label: '吃早餐', moment: '面包还冒着热气，{name}一边啃一边刷手机，顺便给消息框点了个赞。' },
  { label: '吃午餐', moment: '食堂窗口前排了会儿队，最后选了常吃的那份，味道和昨天一样。' },
  { label: '吃晚饭', moment: '晚饭吃得慢，碗见底的时候窗外的天已经黑透了。' },
  { label: '午休', moment: '趴了一会儿，半梦半醒间好像梦到了谁，醒来忘了。' },
]

const LEARN_EVENTS: EventTemplate[] = [
  { label: '上课', moment: '教授在上面讲，{name}走神了一小会儿，笔尖在草稿纸角落画了个圈。' },
  { label: '图书馆自习', moment: '翻书页的声音很轻，起身接水的时候顺手看了眼手机。' },
  { label: '赶作业', moment: '死线就在眼前，{name}咬着笔杆把最后一道题糊完了。' },
  { label: '复习笔记', moment: '笔记翻到一半发现之前的字迹潦草得认不出，无奈叹气重写。' },
  { label: '背单词', moment: '背到第几十个的时候开始走神，重新从 A 开头数了一遍。' },
]

const SOCIAL_EVENTS: EventTemplate[] = [
  { label: '和朋友逛街', moment: '试了两件都没买，店员的脸色有点微妙，和朋友笑作一团。' },
  { label: '社团活动', moment: '活动比想象中热闹，散场时被拉住聊了好几分钟。' },
  { label: '和{peer}聚餐', moment: '饭桌上聊了些有的没的，{peer}讲的那件事{name}记了一下午。' },
  { label: '和{peer}聊天', moment: '从无聊小事聊到深夜话题，{peer}发来的最后一句看了好几遍。' },
  { label: '和{peer}散步', moment: '绕着老路走了一圈，谁都没提那件事，气氛却意外地松快。' },
]

const ALONE_EVENTS: EventTemplate[] = [
  { label: '听歌发呆', moment: '单曲循环了十几遍，歌词越听越像在说自己的事。' },
  { label: '看剧', moment: '追了两集，弹幕比剧情好笑，笑出声又觉得有点傻。' },
  { label: '刷手机', moment: '无意识地刷了很久，回过神来屏幕上的时间跳了一大截。' },
  { label: '看小说', moment: '看到主角的独白时停了下来，觉得那句好像写给自己。' },
  { label: '整理房间', moment: '翻出一件旧东西，拿着发了几分钟呆又原样放了回去。' },
]

const ART_EVENTS: EventTemplate[] = [
  { label: '画画', moment: '颜色叠了很多层，最后成稿和最初想的完全不一样，反而更好。' },
  { label: '写点东西', moment: '写了删删了写，最后留下的那句自己看了很久。' },
  { label: '练琴', moment: '同一段练到手指发酸，终于顺畅的那一刻心情很好。' },
  { label: '拍照', moment: '为一片光影等了很久，快门按下的瞬间觉得值了。' },
]

const WORK_EVENTS: EventTemplate[] = [
  { label: '上班/上课', moment: '例会开得冗长，笔记记了一半开始画结构图。' },
  { label: '兼职值班', moment: '店里没什么人，站着发呆数了小时的顾客。' },
  { label: '赶方案', moment: '改到第五版的时候突然通了，一口气全弄完了。' },
  { label: '跑腿办事', moment: '在外面跑了一下午，风吹得脑子清醒了不少。' },
]

const FUN_EVENTS: EventTemplate[] = [
  { label: '打游戏', moment: '连赢两把手感正好，第三把队友挂机，气笑了一声。' },
  { label: '打球运动', moment: '出了一身汗，回家路上风一吹整个人都松了。' },
  { label: '看电影', moment: '结尾的镜头值得回味，走出影厅还在想。' },
  { label: ' K 歌', moment: '唱到嗓子哑，最满意的是那首一直没敢在别人面前唱的。' },
]

const BOND_EVENTS: EventTemplate[] = [
  { label: '找{peer}借笔记', moment: '{peer}的字很好认，借来的笔记里还夹了张小纸条。' },
  { label: '帮{peer}占座', moment: '占的座被别人抢了，{name}据理力争了两分钟赢了回来。' },
  { label: '和{peer}视频', moment: '信号有点卡，但谁都没先挂，聊到电量报警。' },
  { label: '陪{peer}处理事情', moment: '事情办完在路边坐了会儿，{peer}难得说了句真心话。' },
  { label: '和{peer}闹别扭', moment: '一整天谁都没搭理谁，晚上看到{peer}的动态心里堵了一下。' },
]

function poolFor(type: AutoScheduleType): EventTemplate[] {
  switch (type) {
    case '学习': return LEARN_EVENTS
    case '社交': return SOCIAL_EVENTS
    case '独处': return ALONE_EVENTS
    case '打工': return WORK_EVENTS
    case '娱乐': return FUN_EVENTS
    case '互动': return BOND_EVENTS
    default: return DAILY_EVENTS
  }
}

function mainTypes(p: PersonaProfile): AutoScheduleType[] {
  const weights: [AutoScheduleType, number][] = [
    ['学习', p.student ? 3 : 0.6],
    ['打工', p.worker ? 3 : 0.4],
    ['社交', p.extrovert * 3],
    ['独处', (1 - p.extrovert) * 2 + (p.homebody ? 1 : 0)],
    ['娱乐', 1.2],
    ['互动', p.extrovert * 1.5],
  ]
  if (p.artistic) weights.push(['独处', 1.5])
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [t, w] of weights) {
    r -= w
    if (r <= 0) return [t]
  }
  return ['独处']
}

function eventFor(type: AutoScheduleType, peers: string[]): EventTemplate {
  const pool = poolFor(type)
  if ((type === '社交' || type === '互动') && peers.length > 0 && Math.random() < 0.55) {
    const withPeer = pool.filter((e) => e.label.includes('{peer}'))
    if (withPeer.length > 0) return pick(withPeer)
  }
  return pick(pool)
}

export function generateTodaySchedule(character: Character, date: string, now = new Date()): AutoDay {
  const p = detectPersona(character)
  const all = useCharacters.getState().characters.filter((c) => c.id !== character.id)
  const peers = all.slice().sort(() => Math.random() - 0.5).slice(0, 2).map((c) => c.name)
  const name = useSettings.getState().phoneName || '我'
  const nightShift = p.nightOwl > 0.5 ? jitter(60, 40) : jitter(0, 15)

  const wake = jitter(420, 25) + nightShift * 0.3
  const items: AutoItem[] = []
  const push = (start: number, end: number, tpl: EventTemplate, type: AutoScheduleType, isSleep = false) => {
    items.push({
      id: `auto${date.replace(/-/g, '')}${start.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      start: fmtTime(start),
      end: fmtTime(end),
      label: fill(tpl.label, name, peers[0] || '朋友'),
      type,
      isSleep,
      moment: fill(tpl.moment, name, peers[0] || '朋友'),
    })
  }

  push(wake, wake + jitter(35, 8), { label: '起床洗漱', moment: '闹钟响了三遍才起来，洗完脸人才彻底醒过来。' }, '日常')
  const morning = mainTypes(p)
  push(wake + 45, jitter(690, 20) + nightShift * 0.2, eventFor(morning[0], peers), morning[0])
  push(jitter(710, 15), jitter(790, 20), DAILY_EVENTS[1], '日常')
  const afternoon = mainTypes(p)
  push(jitter(830, 20), jitter(1040, 20), eventFor(afternoon[0], peers), afternoon[0])
  push(jitter(1075, 15), jitter(1140, 20), DAILY_EVENTS[2], '日常')
  const evening = mainTypes(p)
  push(jitter(1180, 15), jitter(1290, 20), eventFor(evening[0], peers), evening[0])
  push(jitter(1315, 15), jitter(1395, 20), ALONE_EVENTS[0], '独处')
  const sleepAt = Math.min(1425, jitter(1395, 20) + nightShift)
  push(sleepAt, sleepAt + 440, { label: '睡觉', moment: '灯关上之后天花板上有窗外透进来的光斑，看着看着就睡着了。' }, '睡眠', true)

  return { characterId: character.id, date, items, generatedAt: now.getTime() }
}

export function ensureTodaySchedule(character: Character, force = false): AutoDay {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const key = `${character.id}_${date}`
  const existing = useSchedule.getState().autoDays[key]
  if (existing && !force) return existing
  const day = generateTodaySchedule(character, date, now)
  useSchedule.getState().setAutoDay(day)
  return day
}

export function autoItemStatus(it: AutoItem, now = new Date()): 'done' | 'active' | 'todo' {
  const cur = now.getHours() * 60 + now.getMinutes()
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const s = toMin(it.start)
  const e = toMin(it.end)
  if (e < s) return cur >= s || cur <= e ? 'active' : 'done'
  if (cur < s) return 'todo'
  if (cur > e) return 'done'
  return 'active'
}
