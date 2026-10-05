import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CallType = 'incoming' | 'outgoing' | 'missed'

export interface CallRecord {
  id: string
  callerId: string
  receiverId: string
  callerName: string
  /** 角色头像 avatarId（IndexedDB blob key），陌生号码为 null */
  callerAvatar: string | null
  relationshipTag: string
  timestamp: number
  /** 通话时长（秒），未接为 0 */
  duration: number
  callType: CallType
  summary: string
  isUnknown: boolean
  /** 是否已查看（用于未接来电角标） */
  isRead: boolean
}

export type CallDraft = Omit<CallRecord, 'id'>

interface CallsState {
  records: CallRecord[]
  addRecord: (r: CallDraft) => CallRecord
  updateRecord: (id: string, patch: Partial<Omit<CallRecord, 'id'>>) => void
  markAllRead: () => void
  removeRecord: (id: string) => void
  clearAll: () => void
}

let seq = 0
function uid(): string {
  seq += 1
  return `call${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

export const useCalls = create<CallsState>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (r) => {
        const full: CallRecord = { ...r, id: uid() }
        set((s) => ({ records: [...s.records, full] }))
        return full
      },
      updateRecord: (id, patch) =>
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      markAllRead: () => set((s) => ({ records: s.records.map((r) => ({ ...r, isRead: true })) })),
      removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
      clearAll: () => set({ records: [] }),
    }),
    { name: 'ksc:calls' }
  )
)

/** 未接来电且未查看的数量 */
export function callUnreadCount(records: CallRecord[]): number {
  return records.filter((r) => !r.isRead && r.callType === 'missed').length
}

export function sortedCallRecords(records: CallRecord[]): CallRecord[] {
  return [...records].sort((a, b) => b.timestamp - a.timestamp)
}