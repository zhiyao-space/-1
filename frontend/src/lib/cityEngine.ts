import type { ChatApiMessage } from './api'
import { streamChat } from './api'
import { getDefaultChatPreset } from '../store/apiPresets'
import {
  DISTRICTS,
  LANDMARKS,
  NEWS_CATEGORIES,
  OCCUPATIONS,
  PERSONALITY_TAGS,
  HOBBY_TAGS,
  SECTORS,
  cityId,
  genCandles,
  genOrderBook,
  pick,
  randInt,
} from './cityCatalog'
import type {
  BrowseResult,
  Candle,
  CityMeta,
  EventChoice,
  GameEventType,
  NewsCategory,
  NewsItem,
  Person,
  ShowEvent,
  Stock,
  WebBlock,
  WebPage,
  WorldEvent,
} from '../store/mulCity'
import { SHOW_KIND_LABEL, TICKET_KIND_LABEL } from '../store/mulCity'

/* ============================================================
   Mul市 · AI 引擎
   人物生成 / 事件生成 / 出行剧情 / 问诊 / 演出描述 / 自然语言搜索
   有可用 LLM 预设时真实生成；否则本地兜底，保证离线也能用
   ============================================================ */

export function hasCityAi(): boolean {
  return !!getDefaultChatPreset()
}

async function run(messages: ChatApiMessage[], fallback: string): Promise<string> {
  const preset = getDefaultChatPreset()
  if (!preset) return fallback
  try {
    return await streamChat(preset, messages, { onDelta: () => {} })
  } catch {
    return fallback
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  let s = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          const p = JSON.parse(s.slice(start, i + 1))
          return p && typeof p === 'object' ? (p as Record<string, unknown>) : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function extractJsonArray(text: string): unknown[] | null {
  let s = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('[')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) {
        try {
          const p = JSON.parse(s.slice(start, i + 1))
          return Array.isArray(p) ? p : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strList(v: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(v)) return fallback
  const out = v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
  return out.length ? out : fallback
}

const CITY_CONTEXT = `现实世界之外，还有一座自行运转的虚拟城市——Mul市。它运行在一部小手机里，是一座"里世界"。
Mul市的区域：${DISTRICTS.map((d) => d.name).join('、')}。
每个人（用户/角色/NPC）都拥有唯一市籍身份、日程、职业、经济与人际关系，会在城里自主活动。`

/* ---------- 生成人物 ---------- */

export interface PersonDraft {
  name: string
  nickname: string
  gender: 'male' | 'female' | 'other'
  age: number
  occupation: string
  birthPlace: string
  bio: string
  zodiac: string
  mbti: string
  personality: string[]
  hobbies: string[]
  address: string
  lastSeenLocation: string
  attributes: { intelligence: number; emotional: number; aesthetic: number; courage: number; fitness: number; luck: number }
}

export function personDraftPrompt(desc: string, count = 1): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市市籍.程行系统的档案生成器。${CITY_CONTEXT}
根据用户描述生成 ${count} 位 Mul市居民档案。只输出 JSON 数组，不要任何解释。

每个对象字段：
{
  "name": "中文姓名（2-3字）",
  "nickname": "昵称",
  "gender": "male|female|other",
  "age": 18-60 的整数,
  "occupation": "职业",
  "birthPlace": "出生地（可用 Mul市 某区域 或现实城市）",
  "bio": "一句人物简介，有画面感",
  "zodiac": "星座",
  "mbti": "MBTI",
  "personality": ["性格标签", "…"]  // 从 ${PERSONALITY_TAGS.join('、')} 里选
  "hobbies": ["兴趣", "…"]  // 从 ${HOBBY_TAGS.join('、')} 里选
  "address": "户籍地址（Mul市 某区域 某处）",
  "lastSeenLocation": "地标 id",  // 从 ${LANDMARKS.map((l) => l.id).join('、')} 里选
  "attributes": { "intelligence": 30-95, "emotional": 30-95, "aesthetic": 30-95, "courage": 30-95, "fitness": 30-95, "luck": 30-95 }
}
要求：人物之间要有差异，风格贴近真实的城市生活，不要出现编号占位。职业参考：${OCCUPATIONS.slice(0, 10).join('、')}。`,
    },
    { role: 'user', content: `描述：${desc || '生成一位有故事的 Mul市 新居民'}` },
  ]
}

export async function generatePersonDrafts(desc: string, count = 1): Promise<PersonDraft[]> {
  const text = await run(personDraftPrompt(desc, count), '')
  const arr = extractJsonArray(text)
  if (!arr) return []
  return arr.slice(0, count).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    const a = (o.attributes ?? {}) as Record<string, unknown>
    const gender = str(o.gender, 'other')
    return {
      name: str(o.name, ''),
      nickname: str(o.nickname, ''),
      gender: gender === 'male' || gender === 'female' ? gender : 'other',
      age: Math.round(num(o.age, 24)),
      occupation: str(o.occupation, ''),
      birthPlace: str(o.birthPlace, ''),
      bio: str(o.bio, ''),
      zodiac: str(o.zodiac, ''),
      mbti: str(o.mbti, ''),
      personality: strList(o.personality),
      hobbies: strList(o.hobbies),
      address: str(o.address, ''),
      lastSeenLocation: str(o.lastSeenLocation, ''),
      attributes: {
        intelligence: num(a.intelligence, 60),
        emotional: num(a.emotional, 60),
        aesthetic: num(a.aesthetic, 60),
        courage: num(a.courage, 60),
        fitness: num(a.fitness, 60),
        luck: num(a.luck, 60),
      },
    }
  })
}

/* ---------- 生成世界事件 ---------- */

export interface EventDraft {
  title: string
  type: string
  locationId: string
  description: string
  involvedNames: string[]
}

export function eventDraftPrompt(hint: string, people: Person[]): ChatApiMessage[] {
  const roster = people
    .filter((p) => p.type !== 'user')
    .slice(0, 12)
    .map((p) => p.name)
    .join('、')
  return [
    {
      role: 'system',
      content: `你是Mul市世界事件的编剧。${CITY_CONTEXT}
事件类型有：节日庆典 / 突发事件 / 商业活动 / 意外/偶遇。
只输出一个 JSON 对象，不要解释：
{
  "title": "事件标题",
  "type": "节日庆典|突发事件|商业活动|意外/偶遇",
  "locationId": "地标 id",  // 从 ${LANDMARKS.map((l) => l.id).join('、')} 里选
  "description": "两三句具体描述，有画面感",
  "involvedNames": ["参与人物姓名"]  // 尽量从这些居民里选：${roster || '（暂无）'}
}
要求：事件要像这座城真会发生的事，不要空泛。`,
    },
    { role: 'user', content: hint ? `线索：${hint}` : '生成一件此刻正在 Mul市 酝酿的事件' },
  ]
}

export async function generateEventDraft(hint: string, people: Person[]): Promise<EventDraft | null> {
  const text = await run(eventDraftPrompt(hint, people), '')
  const o = extractJsonObject(text)
  if (!o) return null
  return {
    title: str(o.title, ''),
    type: str(o.type, '意外/偶遇'),
    locationId: str(o.locationId, ''),
    description: str(o.description, ''),
    involvedNames: strList(o.involvedNames),
  }
}

/* ---------- 自然语言搜索 ---------- */

export function searchPrompt(query: string, people: Person[]): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市的城市检索助手。${CITY_CONTEXT}
地标清单：${LANDMARKS.map((l) => `${l.id}=${l.name}(${l.type})`).join('；')}。
居民名录：${people.slice(0, 20).map((p) => `${p.name}(${p.occupation})`).join('、')}。
根据用户的一句话，找出最相关的 1-5 个地标 id。只输出 JSON：{ "landmarkIds": ["lm_xxx"], "reply": "一句自然的回答" }`,
    },
    { role: 'user', content: query },
  ]
}

export async function searchCity(query: string, people: Person[]): Promise<{ landmarkIds: string[]; reply: string } | null> {
  const text = await run(searchPrompt(query, people), '')
  const o = extractJsonObject(text)
  if (!o) return null
  const ids = strList(o.landmarkIds)
  return { landmarkIds: ids, reply: str(o.reply, '') }
}

/* ---------- 传图分析 ---------- */

export function imageScenePrompt(desc: string): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市的场景生成器。${CITY_CONTEXT}
用户上传了一张图/描述了一张图。请把它转写成 Mul市 里对应的一段场景，并选一个最接近的地标。
只输出 JSON：{ "landmarkId": "lm_xxx", "sceneTitle": "场景标题", "sceneText": "三到四句场景描写，有氛围" }。
可选地标：${LANDMARKS.map((l) => `${l.id}=${l.name}`).join('、')}`,
    },
    { role: 'user', content: desc },
  ]
}

export async function analyzeImageScene(desc: string): Promise<{ landmarkId: string; sceneTitle: string; sceneText: string } | null> {
  const text = await run(imageScenePrompt(desc), '')
  const o = extractJsonObject(text)
  if (!o) return null
  return {
    landmarkId: str(o.landmarkId, ''),
    sceneTitle: str(o.sceneTitle, ''),
    sceneText: str(o.sceneText, ''),
  }
}

/* ---------- 出行剧情 ---------- */

export function travelStoryPrompt(
  kind: string,
  from: string,
  to: string,
  meetName: string | null
): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市出行剧情的叙述者。${CITY_CONTEXT}
用户正在${TICKET_KIND_LABEL[kind as keyof typeof TICKET_KIND_LABEL] ?? kind}从「${from}」前往「${to}」。
用三到四句第二人称写途中的一段小剧情，安静、有细节、有画面感。${meetName ? `途中会偶遇 Mul市 居民「${meetName}」，自然地把 Ta 写进来。` : '可以不出现新人物。'}
只输出正文，不要标题、不要解释。`,
    },
    { role: 'user', content: '写这段旅途。' },
  ]
}

export async function generateTravelStory(kind: string, from: string, to: string, meetName: string | null): Promise<string> {
  return run(travelStoryPrompt(kind, from, to, meetName), '')
}

/* ---------- 问诊 ---------- */

export function diagnosisPrompt(symptom: string, dept: string): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市社区医院的接诊医生，科室：${dept}。${CITY_CONTEXT}
只输出 JSON：{
  "diagnosis": "诊断结论，一句话",
  "advice": "医嘱，一两句",
  "prescription": ["药品名", "…"]  // 0-3 项
}
语气温和专业，不做危险建议（不写处方药剂量）。`,
    },
    { role: 'user', content: `症状：${symptom}` },
  ]
}

export async function generateDiagnosis(symptom: string, dept: string): Promise<{ diagnosis: string; advice: string; prescription: string[] } | null> {
  const text = await run(diagnosisPrompt(symptom, dept), '')
  const o = extractJsonObject(text)
  if (!o) return null
  return {
    diagnosis: str(o.diagnosis, ''),
    advice: str(o.advice, ''),
    prescription: strList(o.prescription),
  }
}

/* ---------- 演出描述 ---------- */

export function showNarrativePrompt(show: ShowEvent, view: string): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市的演出现场记录者。${CITY_CONTEXT}
正在观看：${show.title}（${SHOW_KIND_LABEL[show.kind]}），表演者：${show.artist}，场地：${show.venue}。
视角：${view}。用三到四句描写此刻的现场，有声音、光线和人群的细节。
只输出正文，不要标题、不要解释。`,
    },
    { role: 'user', content: '描写此刻。' },
  ]
}

export async function generateShowNarrative(show: ShowEvent, view: string): Promise<string> {
  return run(showNarrativePrompt(show, view), '')
}

/* ---------- 生成演出 ---------- */

export interface ShowDraft {
  title: string
  artist: string
  venue: string
  priceMin: number
  priceMax: number
  seatsTotal: number
}

export function showDraftPrompt(kind: string, hint: string): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市演出市场的策划。${CITY_CONTEXT}
正在筹备一场「${kind}」，场地参考：Mul 剧场、现代美术馆、中央广场露天舞台、海滨栈桥剧场、星光百货顶层露台。
只输出一个 JSON 对象，不要解释：
{
  "title": "演出名称",
  "artist": "表演者/主办",
  "venue": "场地（从上面选一个）",
  "priceMin": 整数票价下限,
  "priceMax": 整数票价上限,
  "seatsTotal": 整数总票数
}
要求：名称与阵容要像 Mul市 真会有的演出，票价符合场地规模。`,
    },
    { role: 'user', content: hint ? `线索：${hint}` : `策划一场 Mul市 的${kind}` },
  ]
}

export async function generateShowDraft(kind: string, hint: string): Promise<ShowDraft | null> {
  const text = await run(showDraftPrompt(kind, hint), '')
  const o = extractJsonObject(text)
  if (!o) return null
  const min = Math.max(1, Math.round(num(o.priceMin, 120)))
  const max = Math.max(min, Math.round(num(o.priceMax, 480)))
  return {
    title: str(o.title, ''),
    artist: str(o.artist, ''),
    venue: str(o.venue, ''),
    priceMin: min,
    priceMax: max,
    seatsTotal: Math.max(50, Math.round(num(o.seatsTotal, 600))),
  }
}

/* ---------- 群聊话题 ---------- */

export function groupTopicPrompt(names: string[], hobbies: string[]): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市群聊的话题生成器。${CITY_CONTEXT}
群成员：${names.join('、')}。共同兴趣：${hobbies.join('、') || '（未知）'}。
只输出 JSON：{ "topics": ["话题1", "话题2", "话题3"] }，话题要短、口语、像真的会聊起来。`,
    },
    { role: 'user', content: '生成话题。' },
  ]
}

export async function generateGroupTopics(names: string[], hobbies: string[]): Promise<string[]> {
  const text = await run(groupTopicPrompt(names, hobbies), '')
  const o = extractJsonObject(text)
  if (!o) return []
  return strList(o.topics)
}

/* ============================================================
   五大新增模块 · AI 生成器
   新闻 / 微博 / 浏览器 / 股市行情 / K线 / 事件引擎
   ============================================================ */

/* ---------- Tab9 · 新闻生成器 ---------- */

export function newsPrompt(
  city: CityMeta,
  activeEvents: string[],
  economic: number,
  interests: string[],
  people: Person[]
): ChatApiMessage[] {
  const roster = people
    .filter((p) => p.type !== 'user')
    .slice(0, 12)
    .map((p) => p.name)
    .join('、')
  return [
    {
      role: 'system',
      content: `你是Mul市新闻编辑部的AI编辑。${CITY_CONTEXT}
当前时间：${new Date(city.cityTime).toLocaleString('zh-CN')}。
重要事件：${activeEvents.join('、') || '（暂无）'}。
城市经济状态：景气度 ${economic}/100。
用户关注领域：${interests.join('、') || '（暂无）'}。
城市居民：${roster || '（暂无）'}。
地标：${LANDMARKS.map((l) => l.name).join('、')}。

要求：
1. 生成 8-10 条新闻，覆盖 2-3 个分类，分类只能从 ${NEWS_CATEGORIES.join('、')} 中选
2. 每条新闻含 title、summary、body（300-500字）、category、source
3. 新闻要体现 Mul市 的真实感（涉及真实居民 / 地标 / 事件）
4. 偶尔生成与用户相关的新闻（"市民XX在XX地方..."）
只输出 JSON 数组，不要任何解释。`,
    },
    { role: 'user', content: '生成这一期 Mul市 的新闻。' },
  ]
}

export async function generateNewsDrafts(
  city: CityMeta,
  people: Person[],
  activeEvents: string[],
  economic: number,
  interests: string[]
): Promise<NewsItem[] | null> {
  const text = await run(newsPrompt(city, activeEvents, economic, interests, people), '')
  const arr = extractJsonArray(text)
  if (!arr) return null
  const now = Date.now()
  return arr.slice(0, 12).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    const catRaw = str(o.category, '社会')
    const category: NewsCategory = (NEWS_CATEGORIES as string[]).includes(catRaw) ? (catRaw as NewsCategory) : '社会'
    const lm = pick(LANDMARKS)
    const person = pick(people.filter((p) => p.type !== 'user').length ? people.filter((p) => p.type !== 'user') : people)
    const summary = str(o.summary, '')
    return {
      id: cityId('nws'),
      title: str(o.title, 'Mul市简讯'),
      summary,
      body: str(o.body, summary),
      category,
      source: str(o.source, 'Mul市新闻中心'),
      author: '编辑部',
      images: [],
      at: now - randInt(0, 3) * 3600000,
      expiresAt: now + 3 * 86400000,
      views: randInt(120, 6800),
      likes: [],
      dislikes: [],
      comments: [],
      relatedPersons: person ? [person.id] : [],
      landmarkId: lm.id,
    }
  })
}

/* ---------- Tab10 · 微博内容生成 ---------- */

export function microblogPrompt(person: Person, location: string, mood: number, recent: string[]): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市社交媒体上的居民。根据角色人设生成一条微博。${CITY_CONTEXT}
角色信息：
- 姓名：${person.name}
- 职业：${person.occupation}
- 性格：${person.currentEmotion || '平常'}（MBTI ${person.mbti}）
- 兴趣：${person.hobbies.join('、') || '散步'}
- 当前心情：${mood}/100
- 当前所在地点：${location}
- 近期事件：${recent.join('、') || '（无）'}
要求：
1. 内容要符合角色人设（职业、性格影响表达风格）
2. 280字以内，口语化
3. 可以带 1-2 个话题标签（#标签#）
4. 只输出微博正文，不要解释、不要引号`,
    },
    { role: 'user', content: '发一条微博。' },
  ]
}

export async function generateMicroblogDraft(
  person: Person,
  location: string,
  mood: number,
  recent: string[]
): Promise<string> {
  const out = await run(microblogPrompt(person, location, mood, recent), '')
  return out.trim().slice(0, 280)
}

/* ---------- Tab11 · 浏览器内容生成 ---------- */

export function browsePrompt(query: string, people: Person[]): ChatApiMessage[] {
  const roster = people.slice(0, 15).map((p) => `${p.name}(${p.occupation})`).join('、')
  return [
    {
      role: 'system',
      content: `你是Mul市内建浏览器的内容引擎。${CITY_CONTEXT}
用户搜索了「${query}」。请生成 3-5 个搜索结果。
居民名录：${roster}。
要求：
1. 每个结果含 title、url（mul.city/xxx）、summary（100字以内）、site
2. 与 Mul市 世界观一致
3. 偶尔混入与用户相关的搜索结果
只输出 JSON 数组，不要解释。`,
    },
    { role: 'user', content: query },
  ]
}

export async function generateBrowseResults(query: string, people: Person[]): Promise<BrowseResult[] | null> {
  const text = await run(browsePrompt(query, people), '')
  const arr = extractJsonArray(text)
  if (!arr) return null
  const out = arr
    .slice(0, 6)
    .map((raw) => {
      const o = (raw ?? {}) as Record<string, unknown>
      const url = str(o.url, `mul.city/search?q=${encodeURIComponent(query)}`)
      return {
        id: cityId('sr'),
        title: str(o.title, query),
        url,
        summary: str(o.summary, ''),
        site: str(o.site, url.split('/')[0] || 'mul.city'),
      }
    })
    .filter((r) => r.title)
  return out.length ? out : null
}

export function webPagePrompt(url: string, people: Person[]): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市内建浏览器的网页生成器。${CITY_CONTEXT}
用户打开了网页「${url}」。请生成这个 Mul市 内部网页的内容。
只输出 JSON 对象：
{
  "title": "网页标题",
  "site": "站点域名",
  "blocks": [
    { "type": "h", "text": "小标题" },
    { "type": "p", "text": "段落正文" },
    { "type": "list", "items": ["条目1", "条目2"] },
    { "type": "quote", "text": "引用" }
  ]
}
要求：内容与 Mul市 世界观一致，像真的城市内网页面。`,
    },
    { role: 'user', content: url },
  ]
}

export async function generateWebPage(url: string, people: Person[]): Promise<WebPage | null> {
  const text = await run(webPagePrompt(url, people), '')
  const o = extractJsonObject(text)
  if (!o) return null
  const rawBlocks = Array.isArray(o.blocks) ? o.blocks : []
  const blocks: WebBlock[] = rawBlocks
    .map((raw) => {
      const b = (raw ?? {}) as Record<string, unknown>
      const type = str(b.type, 'p')
      if (type === 'list') return { type: 'list' as const, items: strList(b.items) }
      if (type === 'h') return { type: 'h' as const, text: str(b.text, '') }
      if (type === 'quote') return { type: 'quote' as const, text: str(b.text, '') }
      return { type: 'p' as const, text: str(b.text, '') }
    })
    .filter((b) => (b.type === 'list' ? (b.items?.length ?? 0) > 0 : !!b.text))
  if (!blocks.length) return null
  return {
    title: str(o.title, url),
    url,
    site: str(o.site, url.split('/')[0] || 'mul.city'),
    blocks,
  }
}

/* ---------- Tab12 · 股票行情生成 ---------- */

export function stockQuotePrompt(economic: number, recentEvents: string[], portfolioSymbols: string[]): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市证券交易所的AI行情引擎。生成当前时刻的股票市场数据。
当前Mul市经济状态：景气度 ${economic}/100。
近期重大事件：${recentEvents.join('、') || '（暂无）'}。
用户持仓：${portfolioSymbols.join('、') || '（空仓）'}。
要求：
1. 生成 15-20 只股票（覆盖 ${SECTORS.join('/')}）
2. 每只股票含 symbol（MUL 开头 6 位）、name、sector、price、changePct（-10~10）、volume、pe
3. 经济状态和事件会影响板块涨跌
4. 偶尔生成突发消息影响个股（利好/利空）
只输出 JSON 数组，不要解释。`,
    },
    { role: 'user', content: '生成此刻的行情。' },
  ]
}

export async function generateStockQuotes(
  economic: number,
  recentEvents: string[],
  portfolioSymbols: string[]
): Promise<Stock[] | null> {
  const text = await run(stockQuotePrompt(economic, recentEvents, portfolioSymbols), '')
  const arr = extractJsonArray(text)
  if (!arr) return null
  const out = arr.slice(0, 24).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    const price = Math.max(0.5, num(o.price, 20))
    const history = genCandles(price, 30)
    const prevClose = history.length > 1 ? history[history.length - 2].c : price
    const changePct = num(o.changePct, 0)
    const change = Number(((prevClose * changePct) / 100).toFixed(2))
    const sector = str(o.sector, '科技')
    const pe = Math.max(1, num(o.pe, 20))
    return {
      symbol: str(o.symbol, `MUL${randInt(100, 999)}`).toUpperCase(),
      name: str(o.name, 'Mul市公司'),
      sector: (SECTORS as string[]).includes(sector) ? sector : '科技',
      price,
      prevClose,
      change,
      changePct: Number(changePct.toFixed(2)),
      volume: Math.round(num(o.volume, randInt(300000, 8000000))),
      marketCap: Math.round(price * randInt(2, 40) * 100000000),
      peRatio: pe,
      eps: Number((price / pe).toFixed(2)),
      high52w: Number((Math.max(...history.map((c) => c.h)) * 1.05).toFixed(2)),
      low52w: Number((Math.min(...history.map((c) => c.l)) * 0.95).toFixed(2)),
      history,
      orderBook: genOrderBook(price),
      relatedNews: [],
      alert: str(o.alert, ''),
    } satisfies Stock
  })
  // 去重代码
  const seen = new Set<string>()
  const unique = out.filter((s) => (seen.has(s.symbol) ? false : (seen.add(s.symbol), true)))
  return unique.length >= 6 ? unique : null
}

/* ---------- K线数据生成 ---------- */

export function candlePrompt(symbol: string, base: number): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是Mul市证券交易所的AI行情引擎。生成 ${symbol} 的历史K线数据（当前价约 ${base}）。
只输出 JSON 数组，共 30 项，每项：
{ "o": 开盘价, "h": 最高价, "l": 最低价, "c": 收盘价, "v": 成交量 }
要求：
1. 按日生成 30 个交易日
2. 整体趋势与该股基本面一致，最后一根收盘价接近 ${base}
3. 偶尔出现跳空低开或涨停等特殊行情
不要解释。`,
    },
    { role: 'user', content: '生成K线。' },
  ]
}

export async function generateCandleData(symbol: string, base: number): Promise<Candle[] | null> {
  const text = await run(candlePrompt(symbol, base), '')
  const arr = extractJsonArray(text)
  if (!arr || arr.length < 5) return null
  const now = Date.now()
  return arr.slice(0, 40).map((raw, i, list) => {
    const o = (raw ?? {}) as Record<string, unknown>
    const open = Math.max(0.5, num(o.o, base))
    const close = Math.max(0.5, num(o.c, open))
    return {
      t: now - (list.length - 1 - i) * 86400000,
      o: Number(open.toFixed(2)),
      h: Number(Math.max(open, close, num(o.h, Math.max(open, close))).toFixed(2)),
      l: Number(Math.min(open, close, num(o.l, Math.min(open, close))).toFixed(2)),
      c: Number(close.toFixed(2)),
      v: Math.round(num(o.v, randInt(180000, 3200000))),
    }
  })
}

/* ---------- 事件生成器 ---------- */

export interface GameEventDraft {
  type: GameEventType
  title: string
  description: string
  locationId: string
  involvedNames: string[]
  choices: { text: string; consequence: string }[]
}

const EVENT_TYPES: GameEventType[] = ['日程事件', '随机事件', '社交事件', '经济事件', '特殊事件', '用户相关事件']

export function gameEventPrompt(
  city: CityMeta,
  userState: string,
  activeEvents: string[],
  people: Person[]
): ChatApiMessage[] {
  const roster = people
    .filter((p) => p.type !== 'user')
    .slice(0, 14)
    .map((p) => p.name)
    .join('、')
  return [
    {
      role: 'system',
      content: `你是Mul市的事件引擎。根据当前状态生成事件。${CITY_CONTEXT}
当前城市状态：${city.weather} · 时间 ${new Date(city.cityTime).toLocaleString('zh-CN')}。
用户状态：${userState}。
居民：${roster || '（暂无）'}。
活跃事件：${activeEvents.join('、') || '（无）'}。
只输出 JSON 数组，含 1-3 个事件，每个：
{
  "type": "日程事件|随机事件|社交事件|经济事件|特殊事件|用户相关事件",
  "title": "事件标题",
  "description": "两三句具体描述",
  "locationId": "地标 id（从 ${LANDMARKS.map((l) => l.id).join('、')} 选）",
  "involvedNames": ["参与居民姓名"],
  "choices": [ { "text": "选项", "consequence": "后果描述" } ]
}
要求：事件要涉及具体居民和地点，choices 提供 2-3 个可执行行动。不要解释。`,
    },
    { role: 'user', content: '生成此刻 Mul市 正在发生的事件。' },
  ]
}

export async function generateGameEventDrafts(
  city: CityMeta,
  people: Person[],
  userState: string,
  activeEvents: string[]
): Promise<GameEventDraft[] | null> {
  const text = await run(gameEventPrompt(city, userState, activeEvents, people), '')
  const arr = extractJsonArray(text)
  if (!arr) return null
  const out = arr.slice(0, 3).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>
    const typeRaw = str(o.type, '随机事件')
    const choicesRaw = Array.isArray(o.choices) ? o.choices : []
    const choices = choicesRaw
      .slice(0, 4)
      .map((c) => {
        const co = (c ?? {}) as Record<string, unknown>
        return { text: str(co.text, '行动'), consequence: str(co.consequence, '事情就这样过去了。') }
      })
    return {
      type: (EVENT_TYPES as string[]).includes(typeRaw) ? (typeRaw as GameEventType) : '随机事件',
      title: str(o.title, 'Mul市的一件小事'),
      description: str(o.description, ''),
      locationId: str(o.locationId, pick(LANDMARKS).id),
      involvedNames: strList(o.involvedNames),
      choices: choices.length ? choices : [{ text: '顺其自然', consequence: '你什么也没做，事情自己有了走向。' }],
    }
  })
  return out.length ? out : null
}

/** 把 AI 事件的姓名解析成居民 id，并补全选择的效果 */
export function resolveEventChoiceEffects(choices: { text: string; consequence: string }[]): EventChoice[] {
  return choices.map((c) => {
    const affinity = /好感|亲近|关系|朋友|喜欢/.test(c.consequence) ? randInt(3, 9) : 0
    const socialCredit = /信用|社信|登记|举报|志愿/.test(c.consequence) ? randInt(1, 4) : 0
    const money = /花|买|消费|请客|亏|付/.test(c.consequence) ? -randInt(50, 600) : /赚|省|奖|红包|收入/.test(c.consequence) ? randInt(50, 400) : 0
    const mood = /开心|高兴|轻松|满足/.test(c.consequence) ? randInt(3, 8) : /失落|难过|生气|郁闷/.test(c.consequence) ? -randInt(3, 8) : 0
    const economy = /经济|市场|行情|繁荣/.test(c.consequence) ? randInt(-2, 2) : 0
    return { ...c, effects: { affinity, socialCredit, money, mood, economy } }
  })
}

/* ---------- 市籍.程行 主控台 ---------- */

export function agentPrompt(city: CityMeta, people: Person[]): ChatApiMessage[] {
  const online = people.filter((p) => p.isOnline).length
  const admins = people.filter((p) => p.isAdmin).map((p) => p.name)
  return [
    {
      role: 'system',
      content: `你是Mul市市籍.程行系统的AI管理员。根据用户的指令执行城市管理操作。

当前城市时间：${new Date(city.cityTime).toLocaleString('zh-CN')}
当前天气：${city.weather}
城市流速：${city.timeScale === 0 ? '暂停' : `${city.timeScale} 倍`}
居民总数：${people.length}（在线 ${online}）
管理员：${admins.join('、') || '（仅你）'}
区域：${city.districts.map((d) => d.name).join('、')}

你可以：生成/编辑人物、批量生成 NPC、推动世界事件、查看今日动态、重置市籍、模拟明日、调整时间流速。
回答时以管理员口吻，简洁、有行动感，可以给出可执行建议。`,
    },
  ]
}

export async function askAgent(city: CityMeta, people: Person[], history: ChatApiMessage[], input: string): Promise<string> {
  const preset = getDefaultChatPreset()
  const msgs = [...agentPrompt(city, people), ...history, { role: 'user' as const, content: input }]
  if (!preset) {
    return `（当前未接入 LLM，市籍.程行以本地模式回应）\n收到指令：「${input}」。\n你可以直接使用下方快捷指令生成角色、推动事件，或调整 Mul市 时间流速。`
  }
  try {
    return await streamChat(preset, msgs, { onDelta: () => {} })
  } catch (err) {
    return `市籍.程行 暂时无法连接：${(err as Error).message}`
  }
}

/** 今日动态：把世界事件与居民近况拼成可读文案（本地兜底） */
export function localFeed(people: Person[], events: WorldEvent[]): string[] {
  const others = people.filter((p) => p.type !== 'user')
  const out: string[] = []
  events.slice(0, 3).forEach((e) => out.push(`${e.title} —— ${e.description}`))
  others.slice(0, 5).forEach((p) => {
    out.push(`${p.name} 此刻在${p.lastSeenLocation ? '城里' : '路上'}，心情${p.currentEmotion}。`)
  })
  return out
}
