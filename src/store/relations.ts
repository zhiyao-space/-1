import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 关系类型 */
export type RelationKind =
  | 'family'
  | 'friend'
  | 'lover'
  | 'crush'
  | 'ex'
  | 'colleague'
  | 'rival'
  | 'enemy'
  | 'stranger'

/** 双向实线 / 单向箭头 */
export type RelationDirection = 'both' | 'one-way'
/** 稳定实线 / 暧昧虚线 / 断裂线 */
export type RelationStatus = 'stable' | 'ambiguous' | 'broken'

export interface Relation {
  id: string
  /** 节点键：'user' | 'character:<id>' | 'npc:<id>' */
  fromKey: string
  toKey: string
  kind: RelationKind
  /** 0-100，映射连线粗细 */
  bond: number
  direction: RelationDirection
  status: RelationStatus
  note: string
  updatedAt: number
}

export interface RelationStory {
  id: string
  relationId: string
  content: string
  /** 是否与用户相关，用于时间轴分组 */
  relatedToUser: boolean
  createdAt: number
}

export const KIND_LABEL: Record<RelationKind, string> = {
  family: '亲情',
  friend: '友情',
  lover: '恋人',
  crush: '暗恋',
  ex: '前任',
  colleague: '同事',
  rival: '竞争',
  enemy: '敌对',
  stranger: '陌生',
}

export const KIND_ORDER: RelationKind[] = [
  'family',
  'lover',
  'crush',
  'ex',
  'friend',
  'colleague',
  'rival',
  'enemy',
  'stranger',
]

export const STATUS_LABEL: Record<RelationStatus, string> = {
  stable: '稳定',
  ambiguous: '暧昧',
  broken: '破裂',
}

/** 归一化节点对，保证同一对角色只有一条边 */
export function relationPairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`
}

interface RelationsState {
  relations: Relation[]
  stories: RelationStory[]
  lastRefreshAt: number
  /** 手动编辑过的关系对，自动生成时不再覆盖 */
  pinnedPairs: string[]
  /** 自动刷新间隔（分钟），0 表示关闭 */
  autoMinutes: number

  setAutoMinutes: (n: number) => void
  upsertRelation: (r: Omit<Relation, 'id' | 'updatedAt'> & Partial<Pick<Relation, 'id' | 'updatedAt'>>, opts?: { manual?: boolean }) => string
  updateRelation: (id: string, patch: Partial<Relation>, manual?: boolean) => void
  removeRelation: (id: string) => void
  addStory: (s: Omit<RelationStory, 'id' | 'createdAt'> & Partial<Pick<RelationStory, 'createdAt'>>) => string
  clearStories: (relationId: string) => void
  markRefreshed: () => void
  findRelation: (a: string, b: string) => Relation | undefined
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

export const useRelations = create<RelationsState>()(
  persist(
    (set, get) => ({
      relations: [],
      stories: [],
      lastRefreshAt: 0,
      pinnedPairs: [],
      autoMinutes: 0,

      setAutoMinutes: (n) => set({ autoMinutes: n }),

      upsertRelation: (r, opts) => {
        const state = get()
        const existing = state.relations.find(
          (x) => relationPairKey(x.fromKey, x.toKey) === relationPairKey(r.fromKey, r.toKey)
        )
        if (existing) {
          set((s) => ({
            relations: s.relations.map((x) =>
              x.id === existing.id ? { ...x, ...r, id: x.id, updatedAt: Date.now() } : x
            ),
            pinnedPairs: opts?.manual
              ? Array.from(new Set([...s.pinnedPairs, relationPairKey(r.fromKey, r.toKey)]))
              : s.pinnedPairs,
          }))
          return existing.id
        }
        const id = r.id ?? uid('rel')
        set((s) => ({
          relations: [
            ...s.relations,
            { ...r, id, updatedAt: r.updatedAt ?? Date.now() } as Relation,
          ],
          pinnedPairs: opts?.manual
            ? Array.from(new Set([...s.pinnedPairs, relationPairKey(r.fromKey, r.toKey)]))
            : s.pinnedPairs,
        }))
        return id
      },

      updateRelation: (id, patch, manual) =>
        set((s) => ({
          relations: s.relations.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
          pinnedPairs: manual
            ? Array.from(
                new Set([
                  ...s.pinnedPairs,
                  ...s.relations.filter((r) => r.id === id).map((r) => relationPairKey(r.fromKey, r.toKey)),
                ])
              )
            : s.pinnedPairs,
        })),

      removeRelation: (id) =>
        set((s) => ({
          relations: s.relations.filter((r) => r.id !== id),
          stories: s.stories.filter((st) => st.relationId !== id),
        })),

      addStory: (st) => {
        const id = uid('rst')
        set((s) => ({
          stories: [{ ...st, id, createdAt: st.createdAt ?? Date.now() }, ...s.stories].slice(0, 200),
        }))
        return id
      },

      clearStories: (relationId) => set((s) => ({ stories: s.stories.filter((st) => st.relationId !== relationId) })),

      markRefreshed: () => set({ lastRefreshAt: Date.now() }),

      findRelation: (a, b) => {
        const k = relationPairKey(a, b)
        return get().relations.find((r) => relationPairKey(r.fromKey, r.toKey) === k)
      },
    }),
    {
      name: 'ksc:relations',
      migrate: (persisted) => {
        const s = persisted as Partial<RelationsState>
        return {
          relations: s.relations ?? [],
          stories: s.stories ?? [],
          lastRefreshAt: s.lastRefreshAt ?? 0,
          pinnedPairs: s.pinnedPairs ?? [],
          autoMinutes: s.autoMinutes ?? 0,
        } as RelationsState
      },
    }
  )
)