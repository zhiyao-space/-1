import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WidgetType =
  | 'time'
  | 'weather'
  | 'music'
  | 'shortcut'
  | 'text'
  | 'avatar'
  | 'sysinfo'

export interface Song {
  id: string
  blobId: string
  name: string
}

export interface WidgetInstance {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  content: string
  imageUrlId: string | null
  opacity: number
  radius: number
  theme: 'glass' | 'solid' | 'transparent' | 'image' | 'border'
  locked: boolean
  style: string
  config: {
    showSeconds?: boolean
    city?: string
    songs?: Song[]
    currentSong?: number
    appId?: string
    label?: string
    iconUrlId?: string | null
    fontSize?: number
    color?: string
    align?: 'left' | 'center' | 'right'
    avatarId?: string | null
  }
}

export interface DesktopPage {
  id: string
  widgets: WidgetInstance[]
}

interface DesktopState {
  pages: DesktopPage[]
  currentPage: number
  editing: boolean
  selectedId: string | null
  setEditing: (v: boolean) => void
  select: (id: string | null) => void
  setPage: (i: number) => void
  addWidget: (type: WidgetType, pageId?: string) => string
  updateWidget: (id: string, patch: Partial<WidgetInstance>) => void
  updateWidgetConfig: (id: string, patch: Partial<WidgetInstance['config']>) => void
  moveWidget: (id: string, x: number, y: number) => void
  removeWidget: (id: string) => void
  duplicateWidget: (id: string) => void
  addPage: () => void
  removePage: (pageId: string) => void
  resetLayout: () => void
}

export const WIDGET_META: Record<WidgetType, { name: string; w: number; h: number }> = {
  time: { name: '时间', w: 160, h: 90 },
  weather: { name: '天气', w: 150, h: 120 },
  music: { name: '音乐', w: 200, h: 84 },
  shortcut: { name: '快捷入口', w: 64, h: 84 },
  text: { name: '自定义文案', w: 180, h: 80 },
  avatar: { name: '角色头像框', w: 96, h: 130 },
  sysinfo: { name: '系统信息', w: 150, h: 64 },
}

function makeWidget(type: WidgetType): WidgetInstance {
  const meta = WIDGET_META[type]
  return {
    id: genWidgetId(),
    type,
    x: 24,
    y: 24,
    w: meta.w,
    h: meta.h,
    content: '',
    imageUrlId: null,
    opacity: 1,
    radius: 18,
    theme: 'glass',
    locked: false,
    style: 'default',
    config: {},
  }
}

let widgetSeq = 0
function genWidgetId(): string {
  widgetSeq += 1
  return `w${Date.now().toString(36)}${widgetSeq}`
}

function genPageId(): string {
  return `page${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export const useDesktop = create<DesktopState>()(
  persist(
    (set, get) => ({
      pages: [{ id: 'page1', widgets: [] }],
      currentPage: 0,
      editing: false,
      selectedId: null,
      setEditing: (v) => set({ editing: v, selectedId: v ? get().selectedId : null }),
      select: (id) => set({ selectedId: id }),
      setPage: (i) => set({ currentPage: i }),
      addWidget: (type, pageId) => {
        const widget = makeWidget(type)
        set((s) => {
          const pages = s.pages.map((p) =>
            p.id === (pageId ?? s.pages[s.currentPage].id)
              ? { ...p, widgets: [...p.widgets, widget] }
              : p
          )
          return { pages, selectedId: widget.id }
        })
        return widget.id
      },
      updateWidget: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => ({
            ...p,
            widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
          })),
        })),
      updateWidgetConfig: (id, patch) =>
        set((s) => ({
          pages: s.pages.map((p) => ({
            ...p,
            widgets: p.widgets.map((w) =>
              w.id === id ? { ...w, config: { ...w.config, ...patch } } : w
            ),
          })),
        })),
      moveWidget: (id, x, y) =>
        set((s) => ({
          pages: s.pages.map((p) => ({
            ...p,
            widgets: p.widgets.map((w) =>
              w.id === id ? { ...w, x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) } : w
            ),
          })),
        })),
      removeWidget: (id) =>
        set((s) => ({
          pages: s.pages.map((p) => ({ ...p, widgets: p.widgets.filter((w) => w.id !== id) })),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),
      duplicateWidget: (id) =>
        set((s) => {
          const pages = s.pages.map((p) => {
            const w = p.widgets.find((w) => w.id === id)
            if (w) {
              const copy: WidgetInstance = {
                ...w,
                id: genWidgetId(),
                x: w.x + 16,
                y: w.y + 16,
                locked: false,
              }
              return { ...p, widgets: [...p.widgets, copy] }
            }
            return p
          })
          return { pages }
        }),
      addPage: () =>
        set((s) => ({
          pages: [...s.pages, { id: genPageId(), widgets: [] }],
          currentPage: s.pages.length,
        })),
      removePage: (pageId) =>
        set((s) => {
          if (s.pages.length <= 1) return {}
          const idx = s.pages.findIndex((p) => p.id === pageId)
          const pages = s.pages.filter((p) => p.id !== pageId)
          return {
            pages,
            currentPage: Math.min(s.currentPage, pages.length - 1),
          }
        }),
      resetLayout: () => set({ pages: [{ id: 'page1', widgets: [] }], currentPage: 0, editing: false }),
    }),
    { name: 'ksc:desktop' }
  )
)
