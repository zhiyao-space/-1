import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 世界书运行规制
 * - triggerCondition：触发条件（多行文本，支持关键词 / 角色名 / 事件类型；留空 = 全局生效）
 * - ruleContent：规制内容（自由书写，可含概率指令，如「炸裂=15%」「拦截骚扰」）
 * - priority：优先级，越大越高；相同优先级按 updatedAt 降序执行
 */
export interface WorldRule {
  id: string
  name: string
  triggerCondition: string
  ruleContent: string
  priority: number
  isEnabled: boolean
  createdAt: number
  updatedAt: number
}

export type RuleUpsert = Omit<WorldRule, 'id' | 'createdAt' | 'updatedAt'>

export type ImportMode = 'merge' | 'overwrite' | 'smart'

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

interface WorldRulesState {
  rules: WorldRule[]
  addRule: (r: RuleUpsert) => string
  updateRule: (id: string, patch: Partial<RuleUpsert>) => void
  removeRule: (id: string) => void
  setEnabled: (id: string, enabled: boolean) => void
  importRules: (incoming: WorldRule[], mode: ImportMode) => ImportResult
  exportRules: (ids?: string[]) => void
}

let seq = 0
function uid(): string {
  seq += 1
  return `wr${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

/** 校验并规整外部导入的单条规制数据，非法返回 null */
export function normalizeRule(raw: unknown): WorldRule | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const ruleContent = typeof o.ruleContent === 'string' ? o.ruleContent : ''
  if (!name && !ruleContent) return null
  const now = Date.now()
  return {
    id: typeof o.id === 'string' && o.id ? o.id : uid(),
    name: name || '未命名规制',
    triggerCondition: typeof o.triggerCondition === 'string' ? o.triggerCondition : '',
    ruleContent,
    priority: Number.isFinite(Number(o.priority)) ? Math.trunc(Number(o.priority)) : 0,
    isEnabled: o.isEnabled !== false,
    createdAt: Number.isFinite(Number(o.createdAt)) ? Number(o.createdAt) : now,
    updatedAt: Number.isFinite(Number(o.updatedAt)) ? Number(o.updatedAt) : now,
  }
}

/** 从任意 JSON 结构中提取规制数组（兼容 {rules:[...]} 或直接数组） */
export function extractRules(json: unknown): WorldRule[] {
  const arr = Array.isArray(json)
    ? json
    : json && typeof json === 'object' && Array.isArray((json as { rules?: unknown }).rules)
      ? ((json as { rules: unknown[] }).rules)
      : []
  return arr.map(normalizeRule).filter((x): x is WorldRule => !!x)
}

export const useWorldRules = create<WorldRulesState>()(
  persist(
    (set, get) => ({
      rules: [],
      addRule: (r) => {
        const id = uid()
        const now = Date.now()
        set((s) => ({ rules: [...s.rules, { ...r, id, createdAt: now, updatedAt: now }] }))
        return id
      },
      updateRule: (id, patch) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
        })),
      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
      setEnabled: (id, enabled) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, isEnabled: enabled, updatedAt: Date.now() } : r)),
        })),
      importRules: (incoming, mode) => {
        const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
        if (mode === 'overwrite') {
          const list = incoming.map((r) => ({ ...r }))
          set({ rules: list })
          result.added = list.length
          return result
        }
        set((s) => {
          const rules = [...s.rules]
          for (const inc of incoming) {
            const idx = rules.findIndex((r) => r.id === inc.id)
            const nameIdx = rules.findIndex((r) => r.name === inc.name)
            if (idx >= 0) {
              rules[idx] = { ...inc, updatedAt: Date.now() }
              result.updated += 1
            } else if (nameIdx >= 0 && mode === 'smart') {
              // 智能合并：同名则合并内容（保留更长内容）并取较高优先级
              const existing = rules[nameIdx]
              rules[nameIdx] = {
                ...existing,
                triggerCondition: existing.triggerCondition || inc.triggerCondition,
                ruleContent: existing.ruleContent.length >= inc.ruleContent.length ? existing.ruleContent : inc.ruleContent,
                priority: Math.max(existing.priority, inc.priority),
                updatedAt: Date.now(),
              }
              result.updated += 1
            } else {
              rules.push({ ...inc })
              result.added += 1
            }
          }
          return { rules }
        })
        return result
      },
      exportRules: (ids) => {
        const all = get().rules
        const data = ids && ids.length > 0 ? all.filter((r) => ids.includes(r.id)) : all
        const payload = { app: 'kongshiji', kind: 'worldRules', version: 1, exportedAt: Date.now(), rules: data }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const d = new Date()
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
        const a = document.createElement('a')
        a.href = url
        a.download = `worldRules-${stamp}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      },
    }),
    { name: 'ksc:worldRules' }
  )
)

/** 按优先级降序、更新时间为次降序返回启用中的规制 */
export function sortedRules(rules: WorldRule[]): WorldRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
}