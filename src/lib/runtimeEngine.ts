import { useRuntimeRules, FIREWALL_TEXT, type OutputPart, type ChainInjectPos } from '../store/runtimeRules'
import type { Character } from '../store/characters'
import { streamChat } from './api'
import { getDefaultChatPreset } from '../store/apiPresets'
import { useWorldbook } from '../store/worldbook'

async function callLLM(sys: string, user: string): Promise<string | null> {
  const preset = getDefaultChatPreset()
  if (!preset) return null
  const msgs: { role: 'system' | 'user'; content: string }[] = [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ]
  return await streamChat(preset, msgs, { onDelta: () => {} })
}

const ANTI_HALLUCINATION_TEXT: Record<string, string> = {
  low: '宁可承认不确定，也不编造具体细节。',
  mid: '禁止编造不存在的设定、地名、人物与数据；不确定的内容用模糊说法带过，或如实承认不知道。',
  high: '严格基于已给出设定与历史对话输出。禁止编造任何设定、细节、引文、数据；凡不确定者一律不提；与设定冲突的记忆以设定为准并在剧情中自洽处理。',
}

const PART_HINT: Record<OutputPart['key'], string> = {
  header: '时间地点天气栏',
  story: '剧情正文',
  status: '状态栏',
  memory: '记忆区',
  divider: '分割线（———）',
}

export interface RuntimeSections {
  chainBlock: string
  perTurnChain: string
  chainInjectPos: ChainInjectPos
  outputBlock: string
  timeBlock: string
  rulesBlock: string
  memoryBlock: string
  selfCheckItems: string[]
}

function formatCustomTime(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return `当前时间：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function buildRuntimeSections(characterId: string): RuntimeSections {
  const r = useRuntimeRules.getState()
  const sections: RuntimeSections = { chainBlock: '', perTurnChain: '', chainInjectPos: r.chainInjectPos, outputBlock: '', timeBlock: '', rulesBlock: '', memoryBlock: '', selfCheckItems: [] }

  // 思维链：角色专属优先于全局
  if (r.chainEnabled) {
    const global = r.customChain.trim()
    const role = r.roleChains[characterId]?.trim()
    const active = role
      ? { label: '角色专属思维链指令', text: role }
      : global
        ? { label: '全局思维链指令', text: global }
        : null
    if (active) {
      sections.chainBlock += `【${active.label}】\n${active.text}\n`
      if (r.chainInjectPos === 'perTurn') {
        sections.perTurnChain = '（回复前先按思维链指令自查，再输出正文）'
      }
    }
  }

  // 时间感知
  if (r.timeAware) {
    if (r.timeSyncSystem) {
      sections.timeBlock = '__NOW__' // 占位：由 chatEngine 的 nowLine() 填充
    } else if (r.customTime.trim()) {
      sections.timeBlock = formatCustomTime(r.customTime)
    }
  }

  // 输出规则
  const parts = r.outputParts.filter((p) => p.enabled)
  if (parts.length > 0) {
    const order = parts.map((p) => PART_HINT[p.key]).join(' → ')
    const lines = [`【输出规则】每轮回复按以下结构组织：${order}。`]
    for (const p of parts) {
      if (p.key !== 'story' && p.hint) lines.push(`· ${PART_HINT[p.key]}：${p.hint}`)
    }
    if (r.outputTemplate.trim()) lines.push(`自定义格式模板（必须遵循）：\n${r.outputTemplate.trim()}`)
    if (r.endMarker.trim()) lines.push(`完成全部内容后，在回复最末尾单独一行输出自查标记：${r.endMarker.trim()}`)
    sections.outputBlock = lines.join('\n')
  }

  // 行为准则 + 自检 + 防幻觉
  const rules: string[] = []
  const firewalls: string[] = []
  if (r.firewallNoRepeat) firewalls.push(FIREWALL_TEXT.firewallNoRepeat)
  if (r.firewallNoReAsk) firewalls.push(FIREWALL_TEXT.firewallNoReAsk)
  if (r.firewallNoContradict) firewalls.push(FIREWALL_TEXT.firewallNoContradict)
  if (r.firewallAnswerPending) firewalls.push(FIREWALL_TEXT.firewallAnswerPending)
  if (firewalls.length > 0) rules.push('【逻辑防火墙】\n' + firewalls.join('\n'))
  if (r.customRules.trim()) rules.push(`【自定义行为准则】\n${r.customRules.trim()}`)
  rules.push(`【防幻觉强度 · ${r.antiHallucination === 'low' ? '低' : r.antiHallucination === 'mid' ? '中' : '高'}】${ANTI_HALLUCINATION_TEXT[r.antiHallucination]}`)

  if (r.maxReplyLength > 0) rules.push(`【回复长度】本次回复不超过 ${r.maxReplyLength} 字。`)

  const checks: string[] = []
  if (r.checkWorldbook) checks.push('世界书自检：确认本轮是否读取并遵循了相关世界书条目。')
  if (r.checkPersona) checks.push('人设自检：确认本回复与人设、沟通风格、当前心情一致。')
  if (r.checkFormat) checks.push('格式自检：确认输出结构符合输出规则。')
  if (checks.length > 0) {
    rules.push('【回复前自检】在内部依次完成，正文里体现结果即可：\n' + checks.map((c, i) => `${i + 1}. ${c}`).join('\n'))
    sections.selfCheckItems = checks
  }
  sections.rulesBlock = rules.join('\n\n')

  // 记忆总结注入
  const summaries = r.summaries.filter((m) => m.characterId === characterId).slice(0, 8)
  if (summaries.length > 0) {
    sections.memoryBlock = `【既往记忆总结】\n${summaries.map((m) => `- ${m.content}`).join('\n')}`
  }

  return sections
}

// ---------- 记忆同步 ----------

async function summarizeHistory(character: Character, history: { senderType: string; senderName?: string; content: string; type?: string }[], rounds: number, kind: 'small' | 'big'): Promise<string | null> {
  const recent = history.filter((m) => m.type !== 'system').slice(-rounds)
  if (recent.length === 0) return null
  const transcript = recent
    .map((m) => `${m.senderType === 'user' ? '用户' : m.senderName || '角色'}: ${m.content}`)
    .join('\n')
    .slice(0, 6000)
  const scope = kind === 'small' ? `对最近 ${rounds} 轮对话做简洁小结（100字内）` : `对最近 ${rounds} 轮对话做深度大总结：关键事件、关系变化、重要承诺与伏笔（250字内）`
  const sys = `你是剧情记录员。${scope}。只输出总结内容本身，客观陈述，保留专有名词。`
  const raw = await callLLM(sys, transcript)
  return raw ? raw.trim() : null
}

export async function generateSmallSummary(character: Character, history: { senderType: string; senderName?: string; content: string }[]): Promise<boolean> {
  const n = useRuntimeRules.getState().summaryEveryNRounds
  if (n <= 0) return false
  const text = await summarizeHistory(character, history, n, 'small')
  if (!text) return false
  useRuntimeRules.getState().addSummary(character.id, 'small', text)
  writeSummaryToWorldbook(character.name, text)
  return true
}

export async function generateBigSummary(character: Character, history: { senderType: string; senderName?: string; content: string }[]): Promise<boolean> {
  const r = useRuntimeRules.getState()
  const n = r.bigSummaryTrigger > 0 ? r.bigSummaryTrigger : Math.max(20, r.summaryEveryNRounds * 4 || 20)
  const text = await summarizeHistory(character, history, n, 'big')
  if (!text) return false
  r.addSummary(character.id, 'big', text)
  writeSummaryToWorldbook(character.name, text)
  return true
}

export async function maybeAutoSummarize(character: Character, history: { role?: string; content: string; type?: string }[]): Promise<void> {
  try {
    const r = useRuntimeRules.getState()
    if (r.summaryEveryNRounds <= 0) return
    const userRounds = history.filter((m) => m.role === 'user' && m.type !== 'system').length
    if (userRounds === 0 || userRounds % r.summaryEveryNRounds !== 0) return
    const ok = await generateSmallSummary(
      character,
      history.map((m) => ({ senderType: m.role === 'user' ? 'user' : 'char', senderName: undefined, content: m.content }))
    )
    if (!ok) return
    const cur = useRuntimeRules.getState()
    const smalls = cur.summaries.filter((s) => s.characterId === character.id && s.kind === 'small')
    if (smalls.length >= cur.bigSummaryTrigger) {
      await generateBigSummary(
        character,
        history.map((m) => ({ senderType: m.role === 'user' ? 'user' : 'char', senderName: undefined, content: m.content }))
      )
      smalls.forEach((s) => useRuntimeRules.getState().removeSummary(s.id))
    }
  } catch {
    // 总结失败静默跳过，不影响聊天主流程
  }
}

export function writeSummaryToWorldbook(characterName: string, content: string): string {
  const wb = useWorldbook.getState()
  const bookName = `记忆库 · ${characterName}`
  let book = wb.books.find((b) => b.name === bookName)
  if (!book) {
    const id = wb.createBook(bookName, '记忆库')
    useWorldbook.getState().updateBook(id, { scope: 'local' })
    book = useWorldbook.getState().books.find((b) => b.id === id)
  }
  if (!book) return ''
  wb.addEntry(book.id, { name: `总结 ${new Date().toLocaleDateString()}`, content, keywords: [], depth: 'context', priority: 5, mount: 'always' })
  return book.id
}
