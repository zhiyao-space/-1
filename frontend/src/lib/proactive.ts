import { useChatParams, todayStr } from '../store/chatParams'
import { useChats } from '../store/chats'
import { useCharacters } from '../store/characters'
import { getDefaultChatPreset } from '../store/apiPresets'
import { buildProactiveMessages, splitReply, randomTypingDelay, isSleeping } from './chatEngine'
import { streamChat } from './api'
import { useUI } from '../store/ui'

let running = false

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x) || 0)
  return h * 60 + m
}

function inQuietHours(now: Date, start: string, end: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes()
  const a = toMinutes(start)
  const b = toMinutes(end)
  if (a === b) return false
  if (a < b) return cur >= a && cur < b
  return cur >= a || cur < b
}

const MIN_GAP_MS = 10 * 60 * 1000

export async function runProactiveTick(): Promise<void> {
  if (running) return
  const params = useChatParams.getState()
  if (!params.proactive) return
  const now = new Date()
  if (inQuietHours(now, params.quietStart, params.quietEnd)) return
  if (params.date === todayStr(now) && params.count >= params.proactivePerDay) return
  if (Date.now() - params.lastSentAt < MIN_GAP_MS) return
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return
  const characters = useCharacters.getState().characters
  const sessions = useChats.getState().sessions
  const candidates = sessions.filter((s) => {
    if (s.messages.length === 0) return false
    const c = characters.find((x) => x.id === s.characterId)
    return !!c && !isSleeping(c.id).asleep
  })
  if (candidates.length === 0) return

  const session = candidates[Math.floor(Math.random() * candidates.length)]
  const character = characters.find((c) => c.id === session.characterId)
  if (!character) return

  running = true
  try {
    const apiMessages = buildProactiveMessages(character, session.messages, preset)
    const raw = await streamChat(preset, apiMessages, { onDelta: () => {} })
    const parts = splitReply(raw)
    if (parts.length === 0) return
    const { addMessage } = useChats.getState()
    for (let i = 0; i < parts.length; i++) {
      addMessage(session.id, { role: 'assistant', type: 'text', content: parts[i] })
      if (i < parts.length - 1) await new Promise((r) => setTimeout(r, randomTypingDelay()))
    }
    useChatParams.getState().bumpProactive()
    useUI.getState().setBanner({ characterId: character.id, characterName: character.name, text: parts[0] })
  } catch {
    // 本轮失败，静默等待下一次调度
  } finally {
    running = false
  }
}
