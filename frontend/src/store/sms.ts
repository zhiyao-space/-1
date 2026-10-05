import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SmsType = 'person' | 'spam' | 'system' | 'service' | 'explosive'

export interface SmsMessage {
  id: string
  type: SmsType
  senderId: string
  senderName: string
  /** 角色头像 avatarId（IndexedDB blob key），系统/服务类为 null */
  senderAvatar: string | null
  relationshipTag: string
  content: string
  timestamp: number
  isRead: boolean
  /** true 表示用户发出的回复 */
  outgoing?: boolean
  /** 本条消息命中的世界书运行规制名称 */
  appliedRules?: string[]
}

export type SmsDraft = Omit<SmsMessage, 'id' | 'isRead'>

interface SmsState {
  messages: SmsMessage[]
  addMessages: (list: SmsDraft[]) => SmsMessage[]
  addOutgoing: (senderId: string, senderName: string, content: string) => SmsMessage
  markRead: (id: string) => void
  markThreadRead: (senderId: string) => void
  removeMessage: (id: string) => void
  clearAll: () => void
}

let seq = 0
function uid(): string {
  seq += 1
  return `sms${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

export const useSms = create<SmsState>()(
  persist(
    (set, get) => ({
      messages: [],
      addMessages: (list) => {
        const full = list.map((m) => ({ ...m, id: uid(), isRead: false }))
        set((s) => ({ messages: [...s.messages, ...full] }))
        return full
      },
      addOutgoing: (senderId, senderName, content) => {
        const prev = [...get().messages].reverse().find((m) => m.senderId === senderId)
        const full: SmsMessage = {
          id: uid(),
          type: prev?.type ?? 'person',
          senderId,
          senderName,
          senderAvatar: prev?.senderAvatar ?? null,
          relationshipTag: prev?.relationshipTag ?? '',
          content,
          timestamp: Date.now(),
          isRead: true,
          outgoing: true,
        }
        set((s) => ({ messages: [...s.messages, full] }))
        return full
      },
      markRead: (id) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, isRead: true } : m)) })),
      markThreadRead: (senderId) =>
        set((s) => ({ messages: s.messages.map((m) => (m.senderId === senderId ? { ...m, isRead: true } : m)) })),
      removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
      clearAll: () => set({ messages: [] }),
    }),
    { name: 'ksc:sms' }
  )
)

export function smsUnreadCount(messages: SmsMessage[]): number {
  return messages.filter((m) => !m.isRead && !m.outgoing).length
}

/** 按发送者分组，取出每个会话的最后一条消息（用于列表） */
export function smsThreadLast(messages: SmsMessage[]): SmsMessage[] {
  const map = new Map<string, SmsMessage>()
  for (const m of messages) {
    const cur = map.get(m.senderId)
    if (!cur || m.timestamp >= cur.timestamp) map.set(m.senderId, m)
  }
  return [...map.values()].sort((a, b) => b.timestamp - a.timestamp)
}

export function smsMessagesOf(messages: SmsMessage[], senderId: string): SmsMessage[] {
  return messages.filter((m) => m.senderId === senderId).sort((a, b) => a.timestamp - b.timestamp)
}

export function smsThreadUnread(messages: SmsMessage[], senderId: string): number {
  return messages.filter((m) => m.senderId === senderId && !m.isRead && !m.outgoing).length
}