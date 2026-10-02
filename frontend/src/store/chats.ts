import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MessageType = 'text' | 'image' | 'sticker' | 'ooc' | 'system' | 'redpacket' | 'transfer' | 'voice' | 'dice' | 'moment-card'

export interface MessageData {
  amount?: number
  note?: string
  kind?: 'exclusive' | 'normal' | 'password'
  password?: string
  claimState?: 'open' | 'claimed' | 'expired'
  claimedBy?: string
  claimAmount?: number
  claimedAt?: number
  voiceId?: string
  seconds?: number
  value?: number
  cover?: string
  momentId?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  type: MessageType
  content: string
  imageId?: string | null
  data?: MessageData
  timestamp: number
  recalled?: boolean
}

export interface ChatSession {
  id: string
  characterId: string
  messages: ChatMessage[]
  lastActive: number
}

interface ChatState {
  sessions: ChatSession[]
  getOrCreateSession: (characterId: string) => string
  addMessage: (sessionId: string, msg: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  appendToMessage: (sessionId: string, msgId: string, delta: string) => void
  updateMessage: (sessionId: string, msgId: string, patch: Partial<ChatMessage>) => void
  removeMessage: (sessionId: string, msgId: string) => void
  clearMessages: (sessionId: string) => void
  removeSession: (sessionId: string) => void
}

function uid(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const useChats = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      getOrCreateSession: (characterId) => {
        const existing = get().sessions.find((s) => s.characterId === characterId)
        if (existing) return existing.id
        const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
        set((s) => ({ sessions: [...s.sessions, { id, characterId, messages: [], lastActive: Date.now() }] }))
        return id
      },
      addMessage: (sessionId, msg) => {
        const full: ChatMessage = { ...msg, id: uid(), timestamp: Date.now() }
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages: [...sess.messages, full], lastActive: Date.now() }
              : sess
          ),
        }))
        return full
      },
      appendToMessage: (sessionId, msgId, delta) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((m) =>
                    m.id === msgId ? { ...m, content: m.content + delta } : m
                  ),
                }
              : sess
          ),
        })),
      updateMessage: (sessionId, msgId, patch) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
                }
              : sess
          ),
        })),
      removeMessage: (sessionId, msgId) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages: sess.messages.filter((m) => m.id !== msgId) }
              : sess
          ),
        })),
      clearMessages: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, messages: [] } : sess
          ),
        })),
      removeSession: (sessionId) =>
        set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== sessionId) })),
    }),
    { name: 'ksc:chats' }
  )
)
