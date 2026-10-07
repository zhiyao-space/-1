import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 传播渠道：私聊 / 论坛 / 朋友圈 */
export type GossipChannel = 'chat' | 'forum' | 'moment'
/** 八卦生命周期状态 */
export type GossipStatus = 'spreading' | 'stopped' | 'expired'
/** 用户面对质问的应对方式：承认 / 否认 / 反问溯源 */
export type GossipConfrontChoice = 'admit' | 'deny' | 'trace'

/** 一条正在传播的八卦 */
export interface GossipEvent {
  id: string
  /** 原始消息来源 actor key：character:<id> / npc:<id> */
  sourceKey: string
  sourceName: string
  /** 用户说的原始内容 */
  originalContent: string
  /** 当前传播中的内容（每传一手会变形） */
  currentContent: string
  /** 被议论的第三方名字（未识别到则 null） */
  targetName: string | null
  /** 变形程度 0-100 */
  distortionLevel: number
  /** 已传播跳数 */
  spreadRadius: number
  /** 最大传播跳数 */
  maxSpread: number
  status: GossipStatus
  createdAt: number
  /** 已经用过的传播渠道 */
  channels: GossipChannel[]
  /** 听过这条八卦的 actor key（防止回传/重复） */
  listeners: string[]
}

/** 一次「被质问」事件，挂在聊天会话里等用户应对 */
export interface GossipConfront {
  id: string
  eventId: string
  questionerKey: string
  questionerName: string
  /** 送达的聊天会话（仅角色能私聊质问） */
  sessionId: string | null
  /** 送达的消息 id，用于在聊天里定位 */
  messageId: string | null
  text: string
  choice: GossipConfrontChoice | null
  resolvedAt: number | null
  createdAt: number
}

interface GossipState {
  events: GossipEvent[]
  confronts: GossipConfront[]
  addEvent: (e: Omit<GossipEvent, 'id' | 'createdAt'>) => GossipEvent
  updateEvent: (id: string, patch: Partial<GossipEvent>) => void
  pushConfront: (c: Omit<GossipConfront, 'id' | 'createdAt' | 'choice' | 'resolvedAt'>) => GossipConfront
  resolveConfront: (id: string, choice: GossipConfrontChoice) => void
  /** 清理已结束/过期的八卦与被处理完的质问 */
  pruneEvents: () => void
  clearAll: () => void
}

let seq = 0

function uid(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`
}

const KEEP_MS = 6 * 3600_000

export const useGossip = create<GossipState>()(
  persist(
    (set) => ({
      events: [],
      confronts: [],

      addEvent: (e) => {
        const ev: GossipEvent = { ...e, id: uid('gp'), createdAt: Date.now() }
        set((s) => ({ events: [ev, ...s.events].slice(0, 60) }))
        return ev
      },
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      pushConfront: (c) => {
        const cf: GossipConfront = { ...c, id: uid('gc'), createdAt: Date.now(), choice: null, resolvedAt: null }
        set((s) => ({ confronts: [cf, ...s.confronts].slice(0, 40) }))
        return cf
      },
      resolveConfront: (id, choice) =>
        set((s) => ({
          confronts: s.confronts.map((c) => (c.id === id && !c.resolvedAt ? { ...c, choice, resolvedAt: Date.now() } : c)),
        })),

      pruneEvents: () =>
        set((s) => ({
          events: s.events
            .filter((e) => e.status === 'spreading' || Date.now() - e.createdAt < KEEP_MS)
            .slice(0, 60),
          confronts: s.confronts
            .filter((c) => !c.resolvedAt || Date.now() - c.resolvedAt < KEEP_MS)
            .slice(0, 40),
        })),

      clearAll: () => set({ events: [], confronts: [] }),
    }),
    { name: 'ksc:gossip' }
  )
)
