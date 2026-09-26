import type { Character } from '../store/characters'
import type { ChatMessage } from '../store/chats'
import type { GroupChat, GroupMember } from '../store/groups'
import { useChatParams } from '../store/chatParams'
import { useSettings } from '../store/settings'
import { useSchedule, currentActivity } from '../store/schedule'
import { useMinds } from '../store/interact'
import type { ApiPreset } from '../store/apiPresets'
import type { ChatApiMessage } from './api'
import { streamChat } from './api'
import { BASE_STYLE_SPEC } from './basePrompt'

export function buildCharacterPrompt(c: Character): string {
  const lines: string[] = [BASE_STYLE_SPEC, '', '【你的角色设定】']
  lines.push(`昵称：${c.name}`)
  if (c.identity) lines.push(`身份：${c.identity}`)
  if (c.appearance) lines.push(`外观：${c.appearance}`)
  if (c.personality) lines.push(`性格核心：${c.personality}`)
  if (c.commStyle) lines.push(`沟通风格：${c.commStyle}`)
  if (c.forbidden) lines.push(`禁止事项（必须遵守）：${c.forbidden}`)
  for (const f of c.extraFields) {
    if (f.label && f.value) lines.push(`${f.label}：${f.value}`)
  }
  const mind = useMinds.getState().minds[c.id]
  if (mind) {
    lines.push(`当前状态：心情 ${mind.mood}/100，好感度 ${mind.affection}/100${mind.location ? `，所在位置：${mind.location}` : ''}`)
  }
  return lines.join('\n')
}

export function buildScheduleContext(characterId: string): string {
  const { routines, items } = useSchedule.getState()
  const act = currentActivity(characterId, routines, items)
  const today = useSchedule.getState().items.filter(
    (i) => (i.characterId === characterId || i.characterId === 'global') && i.date === new Date().toISOString().slice(0, 10)
  )
  const parts = [`正在进行：${act.label}`]
  if (today.length > 0) parts.push(`今日安排：${today.map((t) => `${t.start}-${t.end} ${t.label}`).join('、')}`)
  return parts.join('\n')
}

function nowLine(): string {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `当前时间：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function userName(): string {
  return useSettings.getState().phoneName || '我'
}

function historyToApi(
  history: (ChatMessage | { senderType: string; role?: string; type: string; content: string; senderName?: string })[]
): ChatApiMessage[] {
  return history
    .filter((m) => m.type !== 'system')
    .map((m) => {
      if ('senderType' in m) {
        const who = m.senderType === 'user' ? userName() : m.senderName || '某人'
        const tag = m.type === 'ooc' ? '（OOC 导演指令）' : ''
        return { role: 'user', content: `${who}: ${m.content}${tag}` } as ChatApiMessage
      }
      const tag = m.type === 'ooc' ? '（OOC 导演指令）' : ''
      if (m.role === 'user') return { role: 'user', content: `${userName()}: ${m.content}${tag}` }
      return { role: 'assistant', content: m.content }
    })
}

export function buildSingleChatMessages(
  character: Character,
  history: ChatMessage[],
  preset: ApiPreset,
  extraUserInstruction?: string
): ChatApiMessage[] {
  const sys = `${buildCharacterPrompt(character)}\n\n${nowLine()}\n${buildScheduleContext(character.id)}\n对话对象是"${userName()}"（用户本人）。只输出角色要说的话本身，不要输出动作提示、旁白标签、自己的名字前缀。`
  const historyApi = historyToApi(history).slice(-preset.contextCount)
  const instruction: ChatApiMessage | null = extraUserInstruction
    ? { role: 'user', content: extraUserInstruction }
    : null
  const body = instruction ? [...historyApi, instruction] : historyApi
  if (preset.injectMode === 'merge-user') {
    const sysAsUser: ChatApiMessage = { role: 'user', content: `[系统设定]\n${sys}` }
    return [sysAsUser, ...body]
  }
  return [{ role: 'system', content: sys }, ...body]
}

export function buildGroupMemberPrompt(
  member: GroupMember,
  character: Character,
  group: GroupChat
): string {
  const roster = group.members
    .map((m) => `${m.groupNickname}（${m.role === 'owner' ? '群主' : m.role === 'admin' ? '管理员' : '成员'}）`)
    .join('、')
  return `${buildCharacterPrompt(character)}

【群聊情境】
你在群聊"${group.name}"中，群昵称是"${member.groupNickname}"。
群成员：${roster}
${group.announcement ? `群公告：${group.announcement}` : ''}
群消息格式是"发言人昵称: 内容"。回复时只输出你（${member.groupNickname}）要说的话本身，不带名字前缀。
只扮演你自己，不代替其他成员发言。被 @ 提及时优先回应。不想接话时可以只回很短的一句。`
}

export function buildGroupChatMessages(
  member: GroupMember,
  character: Character,
  group: GroupChat,
  history: { senderType: string; senderId?: string; senderName?: string; type: string; content: string }[],
  preset: ApiPreset,
  extraContext: ChatApiMessage[] = []
): ChatApiMessage[] {
  const sys = `${buildGroupMemberPrompt(member, character, group)}\n\n${nowLine()}\n${buildScheduleContext(character.id)}`
  const historyApi = historyToApi(history).slice(-preset.contextCount)
  if (preset.injectMode === 'merge-user') {
    return [{ role: 'user', content: `[系统设定]\n${sys}` }, ...historyApi, ...extraContext]
  }
  return [{ role: 'system', content: sys }, ...historyApi, ...extraContext]
}

export function splitReply(text: string): string[] {
  const threshold = useChatParams.getState().splitThreshold
  const trimmed = text.trim()
  if (!trimmed) return []
  if (threshold <= 0 || trimmed.length <= threshold) return [trimmed]
  const parts = trimmed
    .split(/(?<=[。！？!?~…\n])/)
    .map((s) => s.trim())
    .filter(Boolean)
  const merged: string[] = []
  let cur = ''
  for (const p of parts) {
    if (cur && (cur + p).length > threshold) {
      merged.push(cur)
      cur = p
    } else {
      cur += p
    }
  }
  if (cur) merged.push(cur)
  return merged
}

export function randomTypingDelay(): number {
  const base = useChatParams.getState().typingSpeed
  return 400 + Math.random() * 500 + (base * 10)
}

export async function generateCharacterReply(
  character: Character,
  preset: ApiPreset,
  messages: ChatApiMessage[],
  onDelta: (delta: string) => void
): Promise<string> {
  return streamChat(preset, messages, { onDelta })
}

export function isSleeping(characterId: string, now = new Date()): { asleep: boolean; label: string } {
  const { routines, items } = useSchedule.getState()
  const act = currentActivity(characterId, routines, items, now)
  return { asleep: act.isSleep, label: act.label }
}

export function buildProactiveMessages(
  character: Character,
  history: ChatMessage[],
  preset: ApiPreset
): ChatApiMessage[] {
  return buildSingleChatMessages(
    character,
    history,
    preset,
    '（系统指令：现在由你主动发起一条消息。结合当前时间、你的日程和最近的对话氛围，自然地主动说点什么。只输出消息本身。）'
  )
}

export function buildCheckinMessages(
  character: Character,
  history: ChatMessage[],
  preset: ApiPreset,
  activity: { label: string; progress: number }
): ChatApiMessage[] {
  return buildSingleChatMessages(
    character,
    history,
    preset,
    `（系统指令：用户正在查岗。你正在进行：${activity.label}（进度 ${activity.progress}%）。用角色的口吻发一条报备消息，说说你正在做什么、状态如何。只输出消息本身。）`
  )
}

export function buildReactMessages(
  character: Character,
  history: ChatMessage[],
  preset: ApiPreset,
  trigger: string
): ChatApiMessage[] {
  return buildSingleChatMessages(
    character,
    history,
    preset,
    `（系统指令：${trigger}。用角色的口吻自然回应这件事。只输出消息本身。）`
  )
}

export async function generateMindUpdate(
  character: Character,
  preset: ApiPreset,
  history: ChatMessage[]
): Promise<{ thought: string; location: string; mood: number; affection: number } | null> {
  const sys = `${buildCharacterPrompt(character)}
【心声任务】根据最近的对话，以第一人称输出角色此刻的内心想法。严格输出 JSON（不要 markdown 代码块）：
{"thought":"内心想法，40字以内","location":"所在位置，8字以内","mood":0到100整数,"affection":0到100整数}`
  const recent = historyToApi(history.slice(-8))
  const apiMessages: ChatApiMessage[] =
    preset.injectMode === 'merge-user'
      ? [{ role: 'user', content: `[系统设定]\n${sys}` }, ...recent]
      : [{ role: 'system', content: sys }, ...recent]
  try {
    const raw = await streamChat(preset, apiMessages, { onDelta: () => {} })
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const j = JSON.parse(match[0])
    return {
      thought: String(j.thought ?? '').slice(0, 60),
      location: String(j.location ?? '').slice(0, 12),
      mood: Math.max(0, Math.min(100, Number(j.mood) || 0)),
      affection: Math.max(0, Math.min(100, Number(j.affection) || 0)),
    }
  } catch {
    return null
  }
}
