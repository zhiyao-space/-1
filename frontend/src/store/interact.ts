import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Transaction {
  id: string
  kind: 'transfer-out' | 'transfer-in' | 'redpacket-out' | 'redpacket-in' | 'topup'
  amount: number
  withId?: string
  withName?: string
  note: string
  time: number
}

interface WalletState {
  balance: number
  characterBalances: Record<string, number>
  transactions: Transaction[]
  topup: (amount: number) => void
  transferOut: (characterId: string, name: string, amount: number, note: string) => boolean
  redpacketOut: (characterId: string | null, name: string, amount: number, note: string) => boolean
  characterClaim: (characterId: string, name: string, amount: number, kind: 'redpacket-in' | 'transfer-in', note: string) => void
}

function tid(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 0,
      characterBalances: {},
      transactions: [],
      topup: (amount) => {
        if (amount <= 0) return
        set((s) => ({
          balance: s.balance + amount,
          transactions: [...s.transactions.slice(-199), { id: tid(), kind: 'topup', amount, note: '充值', time: Date.now() }],
        }))
      },
      transferOut: (characterId, name, amount, note) => {
        if (amount <= 0) return false
        if (get().balance < amount) return false
        set((s) => ({
          balance: s.balance - amount,
          characterBalances: { ...s.characterBalances, [characterId]: (s.characterBalances[characterId] ?? 0) + amount },
          transactions: [...s.transactions.slice(-199), { id: tid(), kind: 'transfer-out', amount, withId: characterId, withName: name, note, time: Date.now() }],
        }))
        return true
      },
      redpacketOut: (characterId, name, amount, note) => {
        if (amount <= 0) return false
        if (get().balance < amount) return false
        set((s) => ({
          balance: s.balance - amount,
          transactions: [...s.transactions.slice(-199), { id: tid(), kind: 'redpacket-out', amount, withId: characterId ?? undefined, withName: name, note, time: Date.now() }],
        }))
        return true
      },
      characterClaim: (characterId, name, amount, kind, note) => {
        set((s) => ({
          transactions: [
            ...s.transactions.slice(-199),
            { id: tid(), kind: kind === 'transfer-in' ? 'transfer-in' : 'redpacket-in', amount, withId: characterId, withName: name, note, time: Date.now() },
          ],
        }))
      },
    }),
    { name: 'ksc:wallet' }
  )
)

export interface MindState {
  mood: number
  health: number
  sanity: number
  affection: number
  location: string
  thought: string
  history: { mood: number; text: string; time: number }[]
  updatedAt: number
}

interface MindsState {
  minds: Record<string, MindState>
  ensure: (characterId: string) => MindState
  update: (characterId: string, patch: Partial<MindState>) => void
  pushThought: (characterId: string, text: string, mood: number, location?: string) => void
}

function defaultMind(): MindState {
  return {
    mood: 50,
    health: 80,
    sanity: 70,
    affection: 20,
    location: '',
    thought: '',
    history: [],
    updatedAt: 0,
  }
}

export const useMinds = create<MindsState>()(
  persist(
    (set, get) => ({
      minds: {},
      ensure: (characterId) => get().minds[characterId] ?? defaultMind(),
      update: (characterId, patch) =>
        set((s) => ({
          minds: {
            ...s.minds,
            [characterId]: { ...(s.minds[characterId] ?? defaultMind()), ...patch, updatedAt: Date.now() },
          },
        })),
      pushThought: (characterId, text, mood, location) =>
        set((s) => {
          const cur = s.minds[characterId] ?? defaultMind()
          return {
            minds: {
              ...s.minds,
              [characterId]: {
                ...cur,
                thought: text,
                mood,
                location: location ?? cur.location,
                history: [...cur.history.slice(-29), { mood, text, time: Date.now() }],
                updatedAt: Date.now(),
              },
            },
          }
        }),
    }),
    { name: 'ksc:minds' }
  )
)

export interface Branch {
  id: string
  sessionId: string
  name: string
  parentMessageId: string
  createdAt: number
  messages: import('./chats').ChatMessage[]
}

interface BranchState {
  branches: Branch[]
  activeBranchId: Record<string, string | null>
  createBranch: (b: Omit<Branch, 'id' | 'createdAt'>) => string
  removeBranch: (id: string) => void
  setActive: (sessionId: string, branchId: string | null) => void
  appendToBranch: (branchId: string, msg: import('./chats').ChatMessage) => void
  updateBranchMessage: (branchId: string, msgId: string, patch: Partial<import('./chats').ChatMessage>) => void
  removeBranchMessage: (branchId: string, msgId: string) => void
}

export const useBranches = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      activeBranchId: {},
      createBranch: (b) => {
        const id = `br${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
        set((s) => ({
          branches: [...s.branches, { ...b, id, createdAt: Date.now() }],
          activeBranchId: { ...s.activeBranchId, [b.sessionId]: id },
        }))
        return id
      },
      removeBranch: (id) => set((s) => ({ branches: s.branches.filter((b) => b.id !== id) })),
      setActive: (sessionId, branchId) =>
        set((s) => ({ activeBranchId: { ...s.activeBranchId, [sessionId]: branchId } })),
      appendToBranch: (branchId, msg) =>
        set((s) => ({
          branches: s.branches.map((b) => (b.id === branchId ? { ...b, messages: [...b.messages, msg] } : b)),
        })),
      updateBranchMessage: (branchId, msgId, patch) =>
        set((s) => ({
          branches: s.branches.map((b) =>
            b.id === branchId
              ? { ...b, messages: b.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }
              : b
          ),
        })),
      removeBranchMessage: (branchId, msgId) =>
        set((s) => ({
          branches: s.branches.map((b) =>
            b.id === branchId ? { ...b, messages: b.messages.filter((m) => m.id !== msgId) } : b
          ),
        })),
    }),
    { name: 'ksc:branches' }
  )
)

export interface BubbleCustom {
  meBg: string
  meText: string
  otherBg: string
  otherText: string
  radius: number
  bordered: boolean
}

export const DEFAULT_BUBBLE_CUSTOM: BubbleCustom = {
  meBg: '#f5f5f5',
  meText: '#111111',
  otherBg: '#262626',
  otherText: '#f0f0f0',
  radius: 16,
  bordered: false,
}

export type BubbleStyle = 'default' | 'ink-white' | 'ink-black' | 'mono' | 'minimal' | 'pill' | 'glass' | 'flat' | 'custom'

export interface ChatAppearance {
  bubbleStyle: BubbleStyle
  customBubble: BubbleCustom
  avatarShape: 'circle' | 'rounded'
  avatarSize: 28 | 32 | 40
  fontSize: number
  timestampStyle: 'outside' | 'hidden'
  simpleMode: boolean
  badgeImageId: string | null
}

interface AppearanceState extends ChatAppearance {
  update: (patch: Partial<ChatAppearance>) => void
}

export const useChatAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      bubbleStyle: 'default',
      customBubble: DEFAULT_BUBBLE_CUSTOM,
      avatarShape: 'circle',
      avatarSize: 32,
      fontSize: 1,
      timestampStyle: 'outside',
      simpleMode: false,
      badgeImageId: null,
      update: (patch) => set(patch),
    }),
    { name: 'ksc:chat-appearance' }
  )
)
