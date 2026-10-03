import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatParams {
  autoReply: boolean
  streamOutput: boolean
  enterToSend: boolean
  splitThreshold: number
  allowRecall: boolean
  allowOoc: boolean
  typingSpeed: number
  proactive: boolean
  proactivePerDay: number
  quietStart: string
  quietEnd: string
  forumMemory: boolean
  forumMemoryDays: number
}

interface ProactiveCounter {
  date: string
  count: number
  lastSentAt: number
}

interface ChatParamsState extends ChatParams, ProactiveCounter {
  update: (patch: Partial<ChatParams>) => void
  bumpProactive: () => void
}

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useChatParams = create<ChatParamsState>()(
  persist(
    (set, get) => ({
      autoReply: true,
      streamOutput: true,
      enterToSend: true,
      splitThreshold: 120,
      allowRecall: true,
      allowOoc: true,
      typingSpeed: 30,
      proactive: false,
      proactivePerDay: 3,
      quietStart: '00:00',
      quietEnd: '08:00',
      forumMemory: true,
      forumMemoryDays: 3,
      date: '',
      count: 0,
      lastSentAt: 0,
      update: (patch) => set(patch),
      bumpProactive: () => {
        const today = todayStr()
        const s = get()
        if (s.date !== today) set({ date: today, count: 1, lastSentAt: Date.now() })
        else set({ count: s.count + 1, lastSentAt: Date.now() })
      },
    }),
    { name: 'ksc:chat-params' }
  )
)
