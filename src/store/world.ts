import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { todayStr } from './chatParams'

export type Attitude = '讨厌' | '无感' | '喜欢' | '爱慕' | '暧昧'

export const USER_ID = 'user'

export interface DeepEmotion {
  type: string
  intensity: number
  since: number
}

export interface EmotionState {
  surface: string
  intensity: number
  deep: DeepEmotion[]
  updatedAt: number
  history: { surface: string; intensity: number; time: number }[]
}

export interface RelationRecord {
  id: string
  fromId: string
  toId: string
  attitude: Attitude
  intensity: number
  isSecret: boolean
  history: { time: number; desc: string }[]
  lastInteraction?: string
}

export interface DiaryEntry {
  id: string
  characterId: string
  date: string
  content: string
  mood: string
  mentions: string[]
  createdAt: number
}

export interface InnerVoice {
  id: string
  characterId: string
  text: string
  time: number
}

export interface WorldEvent {
  id: string
  date: string
  type: string
  participants: string[]
  description: string
  time: number
}

export interface PrivateMsg {
  id: string
  senderId: string
  content: string
  time: number
}

export interface PrivateThread {
  key: string
  messages: PrivateMsg[]
  updatedAt: number
}

function rid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function relationId(fromId: string, toId: string): string {
  return `${fromId}__${toId}`
}

export function privateKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`
}

export function defaultEmotion(): EmotionState {
  return { surface: '平静', intensity: 20, deep: [], updatedAt: Date.now(), history: [] }
}

export function defaultRelation(fromId: string, toId: string): RelationRecord {
  const r = Math.random()
  const attitude: Attitude = r < 0.62 ? '无感' : r < 0.78 ? '喜欢' : r < 0.88 ? '暧昧' : r < 0.95 ? '讨厌' : '爱慕'
  return {
    id: relationId(fromId, toId),
    fromId,
    toId,
    attitude,
    intensity: 25 + Math.floor(Math.random() * 30),
    isSecret: Math.random() < 0.15,
    history: [],
  }
}

interface WorldState {
  emotions: Record<string, EmotionState>
  relations: RelationRecord[]
  diaries: DiaryEntry[]
  innerVoices: InnerVoice[]
  events: WorldEvent[]
  privateThreads: Record<string, PrivateThread>
  lastEventDate: string
  setEmotion: (characterId: string, patch: Partial<EmotionState>) => void
  pushEmotionHistory: (characterId: string, surface: string, intensity: number) => void
  upsertRelation: (rel: RelationRecord) => void
  addRelationHistory: (relId: string, desc: string, lastInteraction?: string) => void
  addDiary: (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => void
  addInnerVoice: (characterId: string, text: string) => void
  addEvent: (ev: Omit<WorldEvent, 'id' | 'time'>) => void
  savePrivateThread: (key: string, messages: PrivateMsg[]) => void
  markEventRolled: (date: string) => void
}

export const useWorld = create<WorldState>()(
  persist(
    (set) => ({
      emotions: {},
      relations: [],
      diaries: [],
      innerVoices: [],
      events: [],
      privateThreads: {},
      lastEventDate: '',
      setEmotion: (characterId, patch) =>
        set((s) => ({
          emotions: {
            ...s.emotions,
            [characterId]: { ...(s.emotions[characterId] ?? defaultEmotion()), ...patch, updatedAt: Date.now() },
          },
        })),
      pushEmotionHistory: (characterId, surface, intensity) =>
        set((s) => {
          const cur = s.emotions[characterId] ?? defaultEmotion()
          return {
            emotions: {
              ...s.emotions,
              [characterId]: { ...cur, history: [...cur.history.slice(-39), { surface, intensity, time: Date.now() }] },
            },
          }
        }),
      upsertRelation: (rel) =>
        set((s) => {
          const idx = s.relations.findIndex((r) => r.id === rel.id)
          if (idx === -1) return { relations: [...s.relations, rel] }
          const next = s.relations.slice()
          next[idx] = rel
          return { relations: next }
        }),
      addRelationHistory: (relId, desc, lastInteraction) =>
        set((s) => ({
          relations: s.relations.map((r) =>
            r.id === relId
              ? { ...r, history: [...r.history.slice(-19), { time: Date.now(), desc }], lastInteraction: lastInteraction ?? r.lastInteraction }
              : r
          ),
        })),
      addDiary: (entry) =>
        set((s) => ({ diaries: [...s.diaries.slice(-199), { ...entry, id: rid('d'), createdAt: Date.now() }] })),
      addInnerVoice: (characterId, text) =>
        set((s) => ({
          innerVoices: [...s.innerVoices.slice(-99), { id: rid('v'), characterId, text, time: Date.now() }],
        })),
      addEvent: (ev) =>
        set((s) => ({ events: [...s.events.slice(-59), { ...ev, id: rid('e'), time: Date.now() }] })),
      savePrivateThread: (key, messages) =>
        set((s) => ({ privateThreads: { ...s.privateThreads, [key]: { key, messages, updatedAt: Date.now() } } })),
      markEventRolled: (date) => set({ lastEventDate: date }),
    }),
    { name: 'ksc:world' }
  )
)

export { todayStr }
