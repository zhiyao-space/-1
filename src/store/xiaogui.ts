import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/idb'

export type Mood = 'idle' | 'thinking' | 'coding' | 'done' | 'error'

export interface XiaoguiMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: number
}

interface XiaoguiState {
  messages: XiaoguiMsg[]
  /** 选中的对话模型预设 id，null 表示跟随默认 */
  presetId: string | null
  guideSeen: boolean
  /** 悬浮位置（相对手机容器左上角，px） */
  pos: { x: number; y: number } | null
  mood: Mood
  streaming: boolean
  addMessage: (role: XiaoguiMsg['role'], text?: string) => string
  updateMessage: (id: string, patch: Partial<Pick<XiaoguiMsg, 'text'>>) => void
  appendMessage: (id: string, delta: string) => void
  clear: () => void
  setPresetId: (id: string | null) => void
  setGuideSeen: (v: boolean) => void
  setPos: (pos: { x: number; y: number }) => void
  setMood: (m: Mood) => void
  setStreaming: (v: boolean) => void
}

export const useXiaogui = create<XiaoguiState>()(
  persist(
    (set) => ({
      messages: [],
      presetId: null,
      guideSeen: false,
      pos: null,
      mood: 'idle',
      streaming: false,
      addMessage: (role, text = '') => {
        const id = genId()
        set((s) => ({ messages: [...s.messages, { id, role, text, at: Date.now() }] }))
        return id
      },
      updateMessage: (id, patch) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      appendMessage: (id, delta) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)) })),
      clear: () => set({ messages: [], streaming: false, mood: 'idle' }),
      setPresetId: (presetId) => set({ presetId }),
      setGuideSeen: (guideSeen) => set({ guideSeen }),
      setPos: (pos) => set({ pos }),
      setMood: (mood) => set({ mood }),
      setStreaming: (streaming) => set({ streaming }),
    }),
    {
      name: 'ksc:xiaogui',
      partialize: (s) => ({
        messages: s.messages,
        presetId: s.presetId,
        guideSeen: s.guideSeen,
        pos: s.pos,
      }),
    }
  )
)