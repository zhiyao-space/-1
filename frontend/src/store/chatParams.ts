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
}

interface ChatParamsState extends ChatParams {
  update: (patch: Partial<ChatParams>) => void
}

export const useChatParams = create<ChatParamsState>()(
  persist(
    (set) => ({
      autoReply: true,
      streamOutput: true,
      enterToSend: true,
      splitThreshold: 120,
      allowRecall: true,
      allowOoc: true,
      typingSpeed: 30,
      update: (patch) => set(patch),
    }),
    { name: 'ksc:chat-params' }
  )
)
