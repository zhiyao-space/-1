import type { Character } from '../store/characters'
import type { ChatMessage } from '../store/chats'
import type { GroupChat, GroupMember } from '../store/groups'
import { useChatParams } from '../store/chatParams'
import { useSettings } from '../store/settings'
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
  return lines.join('\n')
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
  preset: ApiPreset
): ChatApiMessage[] {
  const sys = `${buildCharacterPrompt(character)}\n\n${nowLine()}\n对话对象是"${userName()}"（用户本人）。只输出角色要说的话本身，不要输出动作提示、旁白标签、自己的名字前缀。`
  const historyApi = historyToApi(history).slice(-preset.contextCount)
  if (preset.injectMode === 'merge-user') {
    const sysAsUser: ChatApiMessage = { role: 'user', content: `[系统设定]\n${sys}` }
    return [sysAsUser, ...historyApi]
  }
  return [{ role: 'system', content: sys }, ...historyApi]
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
  const sys = `${buildGroupMemberPrompt(member, character, group)}\n\n${nowLine()}`
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
