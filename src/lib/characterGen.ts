import type { ApiPreset } from '../store/apiPresets'
import type { Character, CustomField } from '../store/characters'
import { streamChat, type ChatApiMessage } from './api'

// ---------------------------------------------------------------------------
// 标签字典：用于从角色数据中自动提取分类标签
// ---------------------------------------------------------------------------

export const PERSONALITY_TAGS = [
  '冷淡型', '温柔型', '腹黑型', '阳光型', '傲娇型', '病娇型', '沉稳型',
  '活泼型', '内向型', '外向型', '毒舌型', '高冷型', '元气型', '忧郁型',
  '强势型', '慵懒型', '理性型', '黏人型',
]

export const RELATION_TAGS = [
  '陌生人', '青梅竹马', '上下级', '邻居', '同事', '死对头', '朋友',
  '家人', '恋人', '师生', '对手', '搭档', '竞争对手',
]

export const SETTING_TAGS = [
  '古代', '现代', '赛博', '奇幻', '末世', '校园', '都市', '星际', '民国', '仙侠',
]

export const IDENTITY_TAGS = [
  '医生', '学生', '老板', '黑客', '作家', '运动员', '警察', '律师', '老师',
  '歌手', '演员', '程序员', '厨师', '军人', '侦探', '记者', '护士',
]

const ALL_TAGS = [...PERSONALITY_TAGS, ...RELATION_TAGS, ...SETTING_TAGS, ...IDENTITY_TAGS]

/** 从任意文本中匹配出标签（性格标签去掉“型”后缀做词干匹配） */
export function deriveTags(text: string): string[] {
  const t = text || ''
  const hits: string[] = []
  for (const tag of ALL_TAGS) {
    const stem = PERSONALITY_TAGS.includes(tag) ? tag.replace(/型$/, '') : tag
    if (stem && t.includes(stem)) hits.push(tag)
  }
  return Array.from(new Set(hits))
}

// ---------------------------------------------------------------------------
// 表单数据结构（与 CharacterEditor 的 Draft 对齐，但只含内容字段）
// ---------------------------------------------------------------------------

export interface CharacterFormData {
  name: string
  identity: string
  appearance: string
  personality: string
  commStyle: string
  forbidden: string
  extraFields: CustomField[]
  tags: string[]
}

function uid(label: string): string {
  return `f${label}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

function s(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => s(x)).filter(Boolean)
}

function joinLines(parts: (string | false)[]): string {
  return parts.filter((p): p is string => !!p).join('\n')
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const ROLE_DECOMPOSE_PROMPT = `你是一位角色设定拆解专家。将用户的自然语言描述拆解为标准化角色档案。

拆解规则：
1. 用户描述模糊时优先推断并补全，不要留空；实在拿不准的填"未知"。
2. 性格必须拆成"表面"和"内在"两层。
3. 关系描述要包含"初次态度"和"发展走向"。
4. 抽象形容词必须翻译成具体表现，例如"冷酷"→"说话从不用语气词、从不主动关心、回复永远不超过两行"。
5. conversationExamples 至少生成 2 组，体现角色的说话风格。
6. tags 从描述中自动提取 3-5 个关键词（性格/关系/设定/身份均可）。

只输出严格 JSON（不要 markdown 代码块、不要任何解释），格式如下：
{
  "name": "由描述推断或AI起名",
  "gender": "男/女/未知",
  "age": "推断年龄或未知",
  "identity": "身份/职业",
  "appearance": { "summary": "外貌一句话概括", "height": "", "hair": "", "eyes": "", "features": [] },
  "personality": { "surface": "表面给人的印象", "inner": "内在真实性格", "tags": ["标签1", "标签2"] },
  "background": { "origin": "出身/家庭背景", "turningPoint": "改变人生的关键事件", "current": "当前生活状态" },
  "relationshipToUser": { "type": "与user的关系类型", "initialAttitude": "初次接触时的态度", "progression": "关系发展的可能走向" },
  "communicationStyle": { "speakingTone": "说话的语气风格", "messagePattern": "线上聊天习惯", "narrativeStyle": "线下叙事风格" },
  "behaviorRules": { "mustAlways": ["必须始终遵守的行为准则"], "neverDo": ["绝对不能做的事"] },
  "emotionalTriggers": { "softSpots": "容易被什么打动", "redLines": "触碰逆鳞时的反应模式" },
  "conversationExamples": [ { "user": "用户示例输入", "char": "角色应该如何回应" } ]
}`

const FILE_PARSE_PROMPT = `你是一位角色设定解析专家。将以下文本拆解为结构化角色数据。

解析规则：
1. 识别文本中的段落结构（是否已有标题/分隔符）。
2. 若已有明确分段（如"性格：""外貌："等），直接提取对应内容。
3. 若为散乱文本，使用语义理解归类到对应字段。
4. 抽象描述翻译成具体表现。
5. 输出严格 JSON（不要 markdown 代码块、不要任何解释）。

输出格式：
{
  "name": "", "gender": "男/女/未知", "age": "", "identity": "",
  "appearance": { "summary": "", "height": "", "hair": "", "eyes": "", "features": [] },
  "personality": { "surface": "", "inner": "", "tags": [] },
  "background": { "origin": "", "turningPoint": "", "current": "" },
  "relationshipToUser": { "type": "", "initialAttitude": "", "progression": "" },
  "communicationStyle": { "speakingTone": "", "messagePattern": "", "narrativeStyle": "" },
  "behaviorRules": { "mustAlways": [], "neverDo": [] },
  "emotionalTriggers": { "softSpots": "", "redLines": "" },
  "conversationExamples": [ { "user": "", "char": "" } ]
}`

const NPC_PROMPT = `根据主角色生成关联NPC，每个NPC独立且差异化。

生成规则：
1. 每个NPC必须彼此差异化，不能有重复定位。
2. 至少包含 1 个正面角色 + 1 个中立/对立角色。
3. 每个NPC都要和主角有具体的"关系锚点"（共同经历/利益冲突/情感纽带等）。
4. NPC的性格要与主角形成互补或映照。

只输出严格 JSON 数组（不要 markdown 代码块、不要任何解释），格式如下：
[
  {
    "name": "",
    "gender": "",
    "age": "",
    "relationship": "与主角的关系",
    "personality": { "surface": "", "inner": "", "tags": [] },
    "roleInStory": "在这个世界中的功能定位",
    "connectionToMainChar": "与主角的关键交集/矛盾点",
    "speakingStyle": "说话风格",
    "appearanceBrief": "外貌简述"
  }
]`

// ---------------------------------------------------------------------------
// JSON 提取
// ---------------------------------------------------------------------------

/** 从 AI 返回 / 文件内容中提取第一个完整的 JSON 对象或数组 */
export function extractJson(raw: string): unknown {
  if (!raw) return null
  let t = raw.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const objStart = t.indexOf('{')
  const arrStart = t.indexOf('[')
  const candidates = [objStart, arrStart].filter((i) => i >= 0)
  if (candidates.length === 0) return null
  const start = Math.min(...candidates)
  const open = t[start]
  const close = open === '{' ? '}' : ']'
  const end = t.lastIndexOf(close)
  if (end <= start) return null
  try {
    return JSON.parse(t.slice(start, end + 1))
  } catch {
    return null
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

// ---------------------------------------------------------------------------
// 结构化档案 -> 表单
// ---------------------------------------------------------------------------

/** 将模块 1.2 的结构化 JSON 映射为表单字段 */
export function profileToForm(profile: unknown): CharacterFormData {
  const p = asRecord(profile)
  const ap = asRecord(p.appearance)
  const pe = asRecord(p.personality)
  const cs = asRecord(p.communicationStyle)
  const bg = asRecord(p.background)
  const rel = asRecord(p.relationshipToUser)
  const br = asRecord(p.behaviorRules)
  const et = asRecord(p.emotionalTriggers)

  const name = s(p.name) || '未命名角色'
  const relType = s(rel.type)
  const identity = s(p.identity) || relType

  const appearance = joinLines([
    s(ap.summary),
    s(ap.height) && `身高：${s(ap.height)}`,
    s(ap.hair) && `发型：${s(ap.hair)}`,
    s(ap.eyes) && `眼睛：${s(ap.eyes)}`,
    arr(ap.features).length > 0 && `特征：${arr(ap.features).join('、')}`,
  ])

  const personality = joinLines([
    s(pe.surface) && `表面：${s(pe.surface)}`,
    s(pe.inner) && `内在：${s(pe.inner)}`,
  ])

  const commStyle = joinLines([
    s(cs.speakingTone) && `语气：${s(cs.speakingTone)}`,
    s(cs.messagePattern) && `线上：${s(cs.messagePattern)}`,
    s(cs.narrativeStyle) && `线下：${s(cs.narrativeStyle)}`,
  ])

  const forbidden = arr(br.neverDo).join('\n')

  const extraFields: CustomField[] = []
  const bgText = joinLines([
    s(bg.origin) && `出身：${s(bg.origin)}`,
    s(bg.turningPoint) && `转折：${s(bg.turningPoint)}`,
    s(bg.current) && `现状：${s(bg.current)}`,
  ])
  if (bgText) extraFields.push({ id: uid('bg'), label: '背景故事', value: bgText })

  const relText = joinLines([
    relType && `关系：${relType}`,
    s(rel.initialAttitude) && `初次态度：${s(rel.initialAttitude)}`,
    s(rel.progression) && `发展走向：${s(rel.progression)}`,
  ])
  if (relText) extraFields.push({ id: uid('rel'), label: '与用户的关系', value: relText })

  const mustAlways = arr(br.mustAlways)
  if (mustAlways.length > 0) extraFields.push({ id: uid('must'), label: '行为准则', value: mustAlways.join('\n') })

  const triggerText = joinLines([
    s(et.softSpots) && `软肋：${s(et.softSpots)}`,
    s(et.redLines) && `逆鳞：${s(et.redLines)}`,
  ])
  if (triggerText) extraFields.push({ id: uid('trig'), label: '情感触发', value: triggerText })

  const examples = Array.isArray(p.conversationExamples) ? p.conversationExamples : []
  const exText = examples
    .map((e) => {
      const r = asRecord(e)
      const u = s(r.user)
      const c = s(r.char)
      if (!u && !c) return ''
      return `用户：${u}\n角色：${c}`
    })
    .filter(Boolean)
    .join('\n\n')
  if (exText) extraFields.push({ id: uid('ex'), label: '对话示例', value: exText })

  const tagText = [name, identity, appearance, personality, commStyle, forbidden, ...extraFields.map((f) => f.value)].join(' ')
  const tags = Array.from(new Set([...arr(pe.tags), ...deriveTags(tagText)])).slice(0, 8)

  return { name, identity, appearance, personality, commStyle, forbidden, extraFields, tags }
}

/** 将 NPC 生成结果映射为表单字段 */
export function npcToForm(npc: unknown): CharacterFormData {
  const n = asRecord(npc)
  const pe = asRecord(n.personality)
  const name = s(n.name) || '未知NPC'
  const relationship = s(n.relationship)
  const roleInStory = s(n.roleInStory)
  const identity = [relationship, roleInStory].filter(Boolean).join(' · ')

  const personality = joinLines([
    s(pe.surface) && `表面：${s(pe.surface)}`,
    s(pe.inner) && `内在：${s(pe.inner)}`,
  ])

  const extraFields: CustomField[] = []
  const conn = s(n.connectionToMainChar)
  if (conn) extraFields.push({ id: uid('conn'), label: '与主角的关联', value: conn })
  const meta = joinLines([s(n.gender) && `性别：${s(n.gender)}`, s(n.age) && `年龄：${s(n.age)}`])
  if (meta) extraFields.push({ id: uid('meta'), label: '基本信息', value: meta })

  const appearance = s(n.appearanceBrief)
  const commStyle = s(n.speakingStyle)
  const tagText = [name, identity, personality, appearance, commStyle, conn].join(' ')
  const tags = Array.from(new Set([...arr(pe.tags), ...deriveTags(tagText)])).slice(0, 8)

  return { name, identity, appearance, personality, commStyle, forbidden: '', extraFields, tags }
}

// ---------------------------------------------------------------------------
// 通用 / 酒馆卡 JSON 解析
// ---------------------------------------------------------------------------

/** 解析用户导入的 JSON 文件（酒馆 SillyTavern / Chub / 通用 / 本模块结构化） */
export function parseImportedJson(content: string): CharacterFormData | null {
  const json = extractJson(content)
  if (json == null) return null
  const obj = asRecord(json)

  // 1) 酒馆卡：{ data: {...} } 或 { spec: 'chara_card_v2', data: {...} }
  const data = asRecord(obj.data)
  if (Object.keys(data).length > 0 && (data.description || data.personality || data.first_mes || data.name || data.character_book)) {
    return tavernToForm(data, obj)
  }

  // 2) 本模块的结构化档案（personality 为对象，或含 relationshipToUser 等字段）
  const hasStructured =
    (obj.personality && typeof obj.personality === 'object') ||
    obj.relationshipToUser ||
    obj.communicationStyle ||
    obj.behaviorRules ||
    (obj.appearance && typeof obj.appearance === 'object')
  if (hasStructured) return profileToForm(obj)

  // 3) 通用扁平格式 { name, description, personality, scenario }
  if (obj.name || obj.description || obj.personality || obj.scenario) return flatToForm(obj)

  return null
}

function tavernToForm(data: Record<string, unknown>, root: Record<string, unknown>): CharacterFormData {
  const extraFields: CustomField[] = []
  const push = (label: string, value: string) => {
    if (value) extraFields.push({ id: uid(label), label, value })
  }
  push('角色描述', s(data.description))
  push('场景', s(data.scenario))
  push('开场白', s(data.first_mes))
  push('对话示例', s(data.mes_example))
  push('系统提示', s(data.system_prompt))
  const name = s(data.name) || s(root.name) || s(root.char_name) || '导入角色'
  const personality = s(data.personality)
  const appearance = s(data.appearance)
  const identity = s(data.scenario)
  const tagText = [name, personality, appearance, identity, ...extraFields.map((f) => f.value)].join(' ')
  const tags = Array.from(new Set([...arr(data.tags), ...deriveTags(tagText)])).slice(0, 8)
  return { name, identity, appearance, personality, commStyle: '', forbidden: '', extraFields, tags }
}

function flatToForm(obj: Record<string, unknown>): CharacterFormData {
  const extraFields: CustomField[] = []
  const push = (label: string, value: string) => {
    if (value) extraFields.push({ id: uid(label), label, value })
  }
  push('角色描述', s(obj.description))
  push('场景', s(obj.scenario))
  push('开场白', s(obj.first_mes))
  push('对话示例', s(obj.mes_example))
  const name = s(obj.name) || s(obj.char_name) || '导入角色'
  const personality = s(obj.personality)
  const appearance = s(obj.appearance)
  const identity = s(obj.scenario) || s(obj.relationship)
  const commStyle = s(obj.commStyle) || s(obj.speakingStyle)
  const forbidden = s(obj.forbidden) || arr(obj.neverDo).join('\n')
  const tagText = [name, personality, appearance, identity, commStyle, forbidden, ...extraFields.map((f) => f.value)].join(' ')
  const tags = Array.from(new Set([...arr(obj.tags), ...deriveTags(tagText)])).slice(0, 8)
  return { name, identity, appearance, personality, commStyle, forbidden, extraFields, tags }
}

// ---------------------------------------------------------------------------
// AI 调用
// ---------------------------------------------------------------------------

function apiMessages(system: string, user: string, preset: ApiPreset): ChatApiMessage[] {
  return preset.injectMode === 'merge-user'
    ? [{ role: 'user', content: `[系统设定]\n${system}` }, { role: 'user', content: user }]
    : [{ role: 'system', content: system }, { role: 'user', content: user }]
}

/** 模块一：文字描述 -> 结构化角色 */
export async function generateProfileFromText(description: string, preset: ApiPreset): Promise<CharacterFormData> {
  const raw = await streamChat(preset, apiMessages(ROLE_DECOMPOSE_PROMPT, `输入：${description}`, preset), { onDelta: () => {} })
  const json = extractJson(raw)
  if (json == null) throw new Error('AI 返回内容无法解析，请重试')
  return profileToForm(json)
}

/** 模块二：非结构化 TXT -> 结构化角色 */
export async function generateProfileFromTextFile(fileContent: string, preset: ApiPreset): Promise<CharacterFormData> {
  const raw = await streamChat(preset, apiMessages(FILE_PARSE_PROMPT, `输入文本：\n${fileContent}`, preset), { onDelta: () => {} })
  const json = extractJson(raw)
  if (json == null) throw new Error('AI 返回内容无法解析，请重试')
  return profileToForm(json)
}

/** 统一入口：自动判断文本是 JSON 还是纯文本 */
export async function parseCharacterText(content: string, preset: ApiPreset): Promise<{ form: CharacterFormData; source: 'fileImport' | 'textCreation' }> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('内容为空')
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = parseImportedJson(trimmed)
    if (parsed) return { form: parsed, source: 'fileImport' }
  }
  const form = await generateProfileFromTextFile(trimmed, preset)
  return { form, source: 'fileImport' }
}

/** 模块三：基于主角色生成关联 NPC */
export async function generateNpcList(mainChar: Character, count: number, preset: ApiPreset): Promise<CharacterFormData[]> {
  const mainJson = JSON.stringify(buildMainCharProfile(mainChar), null, 2)
  const user = `主角色数据：\n${mainJson}\n\nNPC数量：${count}\n\n请输出 ${count} 个差异化 NPC。`
  const raw = await streamChat(preset, apiMessages(NPC_PROMPT, user, preset), { onDelta: () => {} })
  const json = extractJson(raw)
  if (!Array.isArray(json)) throw new Error('AI 返回内容无法解析，请重试')
  return json.map((n) => npcToForm(n)).filter((f) => f.name)
}

/** 将 Character 压缩为本模块结构化 JSON，用于喂给 NPC 生成 Prompt */
export function buildMainCharProfile(c: Character): Record<string, unknown> {
  const extra: Record<string, string> = {}
  for (const f of c.extraFields) if (f.label && f.value) extra[f.label] = f.value
  return {
    name: c.name,
    identity: c.identity,
    appearance: c.appearance,
    personality: c.personality,
    communicationStyle: c.commStyle,
    forbidden: c.forbidden,
    tags: c.tags ?? [],
    extraFields: extra,
  }
}