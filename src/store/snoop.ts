import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Character } from './characters'
import {
  DEFAULT_SENSITIVE,
  SECURITY_COST,
  SNOOP_MODULES,
  generateSnoopData,
  hashSeed,
  type SnoopModuleId,
  type SnoopPhoneData,
} from '../lib/snoopEngine'

/* ============================================================
   「查手机」数据层
   密码 / 把柄浓度 / 安全感 / 冷却 / 各角色手机数据快照
   localStorage 持久化（ksc:snoop）
   ============================================================ */

export const LOCK_MS = 24 * 60 * 60 * 1000
export const MODULE_COOLDOWN_MS = 10 * 1000
export const GLOBAL_COOLDOWN_MS = 30 * 1000

/** 由角色 id 稳定派生一个 6 位数字密码 */
function derivePassword(charId: string): string {
  const h = hashSeed(`pw:${charId}`)
  return String(h % 900000 + 100000)
}
/** 由角色 id 稳定派生把柄浓度（0-100） */
function deriveEvidence(charId: string): number {
  return hashSeed(`ev:${charId}`) % 101
}

function moduleMeta(id: SnoopModuleId) {
  return SNOOP_MODULES.find((m) => m.id === id)!
}

/** 模块 id → 手机数据字段名（备忘录是唯一不同名的） */
const MODULE_DATA_KEY: Record<SnoopModuleId, keyof SnoopPhoneData> = {
  wechat: 'wechat',
  memo: 'memos',
  browser: 'browser',
  wallet: 'wallet',
  music: 'music',
  map: 'map',
  games: 'games',
  shopping: 'shopping',
  video: 'video',
  forum: 'forum',
  private: 'private',
}

interface SnoopState {
  passwords: Record<string, string>
  evidence: Record<string, number>
  security: Record<string, number>
  openCount: Record<string, Record<string, number>>
  moduleCooldown: Record<string, number>
  globalCooldown: Record<string, number>
  lockUntil: Record<string, number>
  caught: Record<string, number>
  data: Record<string, SnoopPhoneData>
  /** 自定义敏感词（与预设词库合并使用） */
  customSensitive: string[]

  passwordOf: (charId: string) => string
  evidenceOf: (charId: string) => number
  securityOf: (charId: string) => number
  dataOf: (charId: string) => SnoopPhoneData | null
  isLocked: (charId: string) => boolean
  ensurePhone: (c: Character) => void
  setEvidence: (charId: string, value: number) => void
  resetSecurity: (charId: string) => void
  /** 进入某个 App：扣安全感、记次数、进冷却 */
  enterModule: (c: Character, moduleId: SnoopModuleId) => void
  /** 停留扣减（每秒 -0.2） */
  dwell: (charId: string, seconds: number) => void
  /** 安全感归零 → 锁机 */
  lockNow: (charId: string) => void
  recordCaught: (charId: string) => void
  /** 单模块刷新（10s 冷却） */
  refreshModule: (c: Character, moduleId: SnoopModuleId) => boolean
  /** 一键刷新全部（30s 冷却，并重置安全感） */
  refreshAll: (c: Character) => boolean
  addSensitive: (word: string) => void
  removeSensitive: (word: string) => void
  clearCustomSensitive: () => void
}

export const useSnoop = create<SnoopState>()(
  persist(
    (set, get) => ({
      passwords: {},
      evidence: {},
      security: {},
      openCount: {},
      moduleCooldown: {},
      globalCooldown: {},
      lockUntil: {},
      caught: {},
      data: {},
      customSensitive: [],

      passwordOf: (charId) => {
        const stored = get().passwords[charId]
        if (stored) return stored
        const pw = derivePassword(charId)
        set((s) => ({ passwords: { ...s.passwords, [charId]: pw } }))
        return pw
      },
      evidenceOf: (charId) => get().evidence[charId] ?? deriveEvidence(charId),
      securityOf: (charId) => get().security[charId] ?? 100,
      dataOf: (charId) => get().data[charId] ?? null,
      isLocked: (charId) => (get().lockUntil[charId] ?? 0) > Date.now(),

      ensurePhone: (c) => {
        const s = get()
        const pw = s.passwords[c.id] ?? derivePassword(c.id)
        const ev = s.evidence[c.id] ?? deriveEvidence(c.id)
        const patch: Partial<SnoopState> = {}
        if (!s.passwords[c.id]) patch.passwords = { ...s.passwords, [c.id]: pw }
        if (s.evidence[c.id] === undefined) patch.evidence = { ...s.evidence, [c.id]: ev }
        if (s.security[c.id] === undefined) patch.security = { ...s.security, [c.id]: 100 }
        if (!s.data[c.id]) patch.data = { ...s.data, [c.id]: generateSnoopData(c, ev) }
        if (Object.keys(patch).length) set(patch as SnoopState)
      },

      setEvidence: (charId, value) =>
        set((s) => ({ evidence: { ...s.evidence, [charId]: Math.max(0, Math.min(100, Math.round(value))) } })),

      resetSecurity: (charId) => set((s) => ({ security: { ...s.security, [charId]: 100 } })),

      enterModule: (c, moduleId) => {
        const s = get()
        if ((s.lockUntil[c.id] ?? 0) > Date.now()) return
        const key = `${c.id}:${moduleId}`
        const prevCount = s.openCount[c.id]?.[moduleId] ?? 0
        const cost = SECURITY_COST[moduleMeta(moduleId).tier] * (prevCount > 0 ? 0.5 : 1)
        const nextSecurity = Math.max(0, (s.security[c.id] ?? 100) - cost)
        set({
          security: { ...s.security, [c.id]: nextSecurity },
          openCount: { ...s.openCount, [c.id]: { ...(s.openCount[c.id] ?? {}), [moduleId]: prevCount + 1 } },
          moduleCooldown: { ...s.moduleCooldown, [key]: Date.now() + MODULE_COOLDOWN_MS },
        })
        if (nextSecurity <= 0) get().lockNow(c.id)
      },

      dwell: (charId, seconds) => {
        const s = get()
        if ((s.lockUntil[charId] ?? 0) > Date.now()) return
        const cur = s.security[charId] ?? 100
        const next = Math.max(0, cur - 0.2 * seconds)
        set({ security: { ...s.security, [charId]: next } })
        if (next <= 0) get().lockNow(charId)
      },

      lockNow: (charId) =>
        set((s) => ({ lockUntil: { ...s.lockUntil, [charId]: Date.now() + LOCK_MS } })),

      recordCaught: (charId) => set((s) => ({ caught: { ...s.caught, [charId]: (s.caught[charId] ?? 0) + 1 } })),

      refreshModule: (c, moduleId) => {
        const s = get()
        if ((s.moduleCooldown[`${c.id}:${moduleId}`] ?? 0) > Date.now()) return false
        const ev = s.evidence[c.id] ?? deriveEvidence(c.id)
        const fresh = generateSnoopData(c, ev)
        const prevData = s.data[c.id]
        if (!prevData) return false
        // 只替换该模块的切片，其余保持不变
        const key = MODULE_DATA_KEY[moduleId]
        const merged = { ...prevData, [key]: fresh[key] } as SnoopPhoneData
        set({
          data: { ...s.data, [c.id]: merged },
          moduleCooldown: { ...s.moduleCooldown, [`${c.id}:${moduleId}`]: Date.now() + MODULE_COOLDOWN_MS },
        })
        return true
      },

      refreshAll: (c) => {
        const s = get()
        if ((s.globalCooldown[c.id] ?? 0) > Date.now()) return false
        const ev = s.evidence[c.id] ?? deriveEvidence(c.id)
        set({
          data: { ...s.data, [c.id]: generateSnoopData(c, ev) },
          security: { ...s.security, [c.id]: 100 },
          globalCooldown: { ...s.globalCooldown, [c.id]: Date.now() + GLOBAL_COOLDOWN_MS },
        })
        return true
      },

      addSensitive: (word) => {
        const w = word.trim()
        if (!w) return
        set((s) => (s.customSensitive.includes(w) ? s : { customSensitive: [...s.customSensitive, w] }))
      },
      removeSensitive: (word) => set((s) => ({ customSensitive: s.customSensitive.filter((w) => w !== word) })),
      clearCustomSensitive: () => set({ customSensitive: [] }),
    }),
    { name: 'ksc:snoop' }
  )
)

/** 预设词库 + 自定义词库 */
export function allSensitiveWords(): string[] {
  return Array.from(new Set([...DEFAULT_SENSITIVE, ...useSnoop.getState().customSensitive]))
}

export { DEFAULT_SENSITIVE }
export type { SnoopModuleId, SnoopPhoneData }