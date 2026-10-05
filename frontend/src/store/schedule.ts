import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ScheduleItem {
  id: string
  characterId: string | 'global'
  date: string | null
  start: string
  end: string
  label: string
  isSleep: boolean
}

export interface Routine {
  id: string
  characterId: string | 'global'
  start: string
  end: string
  label: string
  isSleep: boolean
}

export type AutoScheduleType = '日常' | '学习' | '社交' | '独处' | '打工' | '娱乐' | '互动' | '睡眠'

export interface AutoItem {
  id: string
  start: string
  end: string
  label: string
  type: AutoScheduleType
  isSleep: boolean
  moment: string
}

export interface AutoDay {
  characterId: string
  date: string
  items: AutoItem[]
  generatedAt: number
}

export interface ReportRecord {
  id: string
  characterId: string
  kind: 'checkin' | 'reverse'
  text: string
  time: number
}

interface ScheduleState {
  items: ScheduleItem[]
  routines: Routine[]
  reports: ReportRecord[]
  autoDays: Record<string, AutoDay>
  addItem: (i: Omit<ScheduleItem, 'id'>) => void
  removeItem: (id: string) => void
  addRoutine: (r: Omit<Routine, 'id'>) => void
  removeRoutine: (id: string) => void
  addReport: (r: Omit<ReportRecord, 'id' | 'time'>) => void
  setAutoDay: (day: AutoDay) => void
}

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function inWindow(now: Date, start: string, end: string): boolean {
  const cur = now.getHours() * 60 + now.getMinutes()
  const s = minutes(start)
  const e = minutes(end)
  if (s <= e) return cur >= s && cur <= e
  return cur >= s || cur <= e
}

export function windowProgress(now: Date, start: string, end: string): number {
  const cur = now.getHours() * 60 + now.getMinutes()
  let s = minutes(start)
  let e = minutes(end)
  let c = cur
  if (e < s) {
    if (c < s) c += 1440
    e += 1440
  }
  if (e === s) return 0
  return Math.max(0, Math.min(100, Math.round(((c - s) / (e - s)) * 100)))
}

export function currentActivity(
  characterId: string,
  routines: Routine[],
  items: ScheduleItem[],
  now = new Date(),
  autoItems?: AutoItem[]
): { label: string; progress: number; isSleep: boolean; source: 'routine' | 'item' | 'auto' | 'free' } {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const mine = (id: string | 'global') => id === 'global' || id === characterId
  for (const it of items) {
    if (it.date === today && mine(it.characterId) && inWindow(now, it.start, it.end)) {
      return { label: it.label, progress: windowProgress(now, it.start, it.end), isSleep: it.isSleep, source: 'item' }
    }
  }
  if (autoItems) {
    for (const it of autoItems) {
      if (inWindow(now, it.start, it.end)) {
        return { label: it.label, progress: windowProgress(now, it.start, it.end), isSleep: it.isSleep, source: 'auto' }
      }
    }
  }
  for (const r of routines) {
    if (mine(r.characterId) && inWindow(now, r.start, r.end)) {
      return { label: r.label, progress: windowProgress(now, r.start, r.end), isSleep: r.isSleep, source: 'routine' }
    }
  }
  return { label: '空闲', progress: 0, isSleep: false, source: 'free' }
}

export const useSchedule = create<ScheduleState>()(
  persist(
    (set) => ({
      items: [],
      routines: [],
      reports: [],
      autoDays: {},
      addItem: (i) =>
        set((s) => ({ items: [...s.items, { ...i, id: `sc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      addRoutine: (r) =>
        set((s) => ({ routines: [...s.routines, { ...r, id: `rt${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }] })),
      removeRoutine: (id) => set((s) => ({ routines: s.routines.filter((x) => x.id !== id) })),
      addReport: (r) =>
        set((s) => ({
          reports: [...s.reports.slice(-199), { ...r, id: `rp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, time: Date.now() }],
        })),
      setAutoDay: (day) =>
        set((s) => {
          const key = `${day.characterId}_${day.date}`
          const entries = Object.entries(s.autoDays).filter(([k]) => k !== key)
          entries.push([key, day])
          entries.sort((a, b) => a[1].generatedAt - b[1].generatedAt)
          const pruned = entries.slice(-60)
          return { autoDays: Object.fromEntries(pruned) }
        }),
    }),
    { name: 'ksc:schedule' }
  )
)
