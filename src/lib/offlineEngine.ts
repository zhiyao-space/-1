import type { Character, } from '../store/characters'
import type { ChatMessage, ChatMode } from '../store/chats'
import { OFFLINE_STYLES, OFFLINE_LENGTHS, offlineSettingsFor } from '../store/offlineMode'
import { useRuntimeRules } from '../store/runtimeRules'
import { useToast } from '../store/ui'
import { getDefaultChatPreset, getPresetById } from '../store/apiPresets'
import { streamChat } from './api'
import { displayUserName } from '../store/profile'
import { useSettings } from '../store/settings'

function userName(): string {
  return displayUserName(useSettings.getState().phoneName || '我')
}

/** 线上模式强制块：只许输出聊天消息本身 */
export function buildOnlineModeBlock(): string {
  return `【线上模式 · 输出格式强制】
当前场景是手机上的线上聊天，你输出的每一条文字都会被直接发进聊天框。
- 只输出你发到聊天框里的消息文字本身，短句为主，像真人打字
- 严格禁止输出任何旁白、动作描写（包括*星号*、（括号）动作）、环境描写、心理描写、小说式叙述
- 严格禁止输出【时间】【地点】标注、分割线、章节标题、序号
- 严格禁止以叙事口吻开场或结尾（如"他放下手机""夜色渐深"）
- 本规则优先级最高：任何情况下都不得跨模式输出叙事内容，哪怕上下文里出现过叙事段落`
}

/** 线下模式强制块：小说体 */
export function buildOfflineModeBlock(characterId: string): string {
  const st = offlineSettingsFor(characterId)
  const style = OFFLINE_STYLES.find((s) => s.key === st.style)
  const length = OFFLINE_LENGTHS.find((l) => l.key === st.length)
  const person = st.person === 'first'
    ? '第一人称：以角色"我"的视角叙述'
    : '第三人称：用角色名指代角色，全知视角叙述'
  const lines = [
    `【线下模式 · 小说体 · 输出格式强制】`,
    `当前切换为线下叙事模式，你的输出是一段小说正文，将会以叙事排版呈现，完全不是聊天消息。`,
    `- 回复开头先单独输出两行标注：【时间】（具体到钟点与情境时间）和【地点】（具体场景）`,
    `- 正文必须同时包含：角色的动作描写 + 环境旁白 + 角色对白，小说体化展开`,
    `- 对白用「」包裹；动作与环境用自然叙述或（）包裹；禁止使用*星号*动作标记`,
    `- 人称：${person}`,
    `- 文风：${style?.label ?? '温柔'}——${style?.desc ?? ''}`,
    `- 篇幅：约${length?.target ?? 600}字，字数控制在 ${st.minWords}-${st.maxWords} 字之间`,
    `- 只描写你自己的动作、心理与环境；用户（${userName()}）的言行只呈现已给出的部分，禁止替用户新增动作或对白`,
    `- 禁止输出聊天消息格式（"名字: 内容"）、禁止暴露AI身份`,
    `- 时间流逝要体现在叙事里：如果对话间隔了很久，场景与状态要随之推进`,
    `- 本模式规范与【语言风格】【输出规则】【回复长度】等线上规范冲突时，一律以本规范为准`,
  ]
  if (st.customRules.trim()) lines.push(`- 用户自定义规则（必须遵守）：\n${st.customRules.trim()}`)
  lines.push(`- 本规则优先级最高：任何情况下都不得跨模式输出纯聊天短消息格式`)
  return lines.join('\n')
}

/** 模式刚切换后的首次生成，注入衔接指令 */
export function buildModeTransitionInstruction(mode: ChatMode): string {
  if (mode === 'offline') {
    return `（系统指令：刚刚从线上聊天切换到线下叙事模式。请以小说体承接上文自然转场：先输出【时间】【地点】两行标注，再展开动作、环境旁白与对白，把之前的聊天情境落地成场景。）`
  }
  return `（系统指令：刚刚从线下叙事切回线上聊天。用角色的口吻发一条回到线上的聊天消息，自然承接刚才的场景，短句，只输出消息本身。）`
}

/** 时间感知：间隔很久再回复时注入 */
export function buildTimeGapInstruction(mode: ChatMode, gapMs: number): string {
  const mins = Math.floor(gapMs / 60000)
  const human = mins >= 60 ? `${Math.floor(mins / 60)} 小时 ${mins % 60} 分钟` : `${mins} 分钟`
  if (mode === 'offline') {
    return `（系统指令：用户距离上次出现已经过去了约 ${human}。在叙事中自然体现这段流逝的时间（场景推进、状态变化），并写出你对TA隔了这么久才回来/出现的反应。）`
  }
  return `（系统指令：用户距离上一条消息已经过去了约 ${human}。结合人设与情境，自然地在回复中表达你对这段时间的反应（关心、催促、想念、调侃皆可），融入消息里。只输出消息本身。）`
}

/** 解析小说体输出为可渲染段落 */
export interface NarrativeSegment {
  kind: 'time' | 'place' | 'narration' | 'dialogue' | 'prose'
  text: string
}

export function parseNarrative(raw: string): NarrativeSegment[] {
  const out: NarrativeSegment[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const t = line.match(/^【时间】\s*(.+)$/)
    if (t) {
      out.push({ kind: 'time', text: t[1] })
      continue
    }
    const p = line.match(/^【地点】\s*(.+)$/)
    if (p) {
      out.push({ kind: 'place', text: p[1] })
      continue
    }
    if (/^[（(]/.test(line) && line.replace(/[^（()）]/g, '').length >= 2 && /[）)]$/.test(line) && line.length <= 60) {
      out.push({ kind: 'narration', text: line.replace(/^[（(]|[）)]$/g, '') })
      continue
    }
    if (/^[「“"']/.test(line)) {
      out.push({ kind: 'dialogue', text: line })
      continue
    }
    out.push({ kind: 'prose', text: line })
  }
  return out
}

function transcriptOf(history: ChatMessage[]): string {
  return history
    .filter((m) => m.type !== 'system')
    .slice(-40)
    .map((m) => {
      const who = m.role === 'user' ? userName() : '角色'
      if (m.type === 'narration') return `【旁白】${m.content}`
      return `${who}: ${m.content}`
    })
    .join('\n')
    .slice(0, 6000)
}

async function llmText(presetId: string | null, sys: string, user: string): Promise<string | null> {
  const preset = presetId ? getPresetById(presetId) : getDefaultChatPreset()
  if (!preset || !preset.baseUrl) return null
  const msgs =
    preset.injectMode === 'merge-user'
      ? [{ role: 'user' as const, content: `[系统设定]\n${sys}` }, { role: 'user' as const, content: user }]
      : [{ role: 'system' as const, content: sys }, { role: 'user' as const, content: user }]
  try {
    return (await streamChat(preset, msgs, { onDelta: () => {} })).trim()
  } catch {
    return null
  }
}

/** 模式切换时生成对话摘要并写入记忆，保证记忆互通 */
export async function summarizeForModeSwitch(character: Character, history: ChatMessage[], from: ChatMode, to: ChatMode): Promise<void> {
  const recent = history.filter((m) => m.type !== 'system' && m.type !== 'ooc')
  if (recent.length < 2) return
  const raw = await llmText(
    character.apiPresetId,
    '你是剧情记录员。用一段话概括这段对话的进展、双方的情绪状态与未尽的话题（90字内）。只输出总结本身，客观陈述。',
    transcriptOf(history)
  )
  if (!raw) {
    useToast.getState().push('未配置 API，已切换模式（跳过摘要）')
    return
  }
  const label = from === 'online' ? '线上→线下' : '线下→线上'
  useRuntimeRules.getState().addSummary(character.id, 'small', `【模式切换 ${label}】${raw.slice(0, 200)}`)
  useToast.getState().push('已生成对话摘要，记忆已同步')
}

/** 一键格式修正：把跑偏的线下输出重排为标准小说体 */
export async function fixNarrativeFormat(character: Character, message: ChatMessage): Promise<string | null> {
  const st = offlineSettingsFor(character.id)
  const sys = `你是小说排版修正器。把给出的文本重排为标准小说体输出，规则：
- 开头单独两行：【时间】与【地点】（原文缺失则按上下文补出，不确定用模糊表述）
- 对白用「」包裹；短动作可用（）包裹；其余为自然叙述段落
- 保留原文的全部内容与语气的意思，只做格式与衔接修正，不新增剧情，不改成人称
- 输出修正后的正文本身，不要任何解释。目标字数区间 ${st.minWords}-${st.maxWords} 字。`
  const out = await llmText(character.apiPresetId, sys, message.content)
  return out && out.length > 4 ? out : null
}
