import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ShadowLevel = 'weak' | 'medium' | 'strong'

export interface ModuleStyles {
  /** 预设 id 或 'custom' */
  presetId: string
  customFrom: string
  customTo: string
  /** 圆角 8-24 */
  borderRadius: number
  /** 模块间距 8-24 */
  spacing: number
  shadow: ShadowLevel
}

export interface ModuleVisibility {
  time: boolean
  monologue: boolean
  recent: boolean
  playing: boolean
}

export interface Monologue {
  text: string
  author: string
  at: number
}

export interface NowPlaying {
  title: string
  artist: string
  coverId: string | null
  /** 0-1 */
  progress: number
  /** 秒 */
  duration: number
  playing: boolean
}

export interface BgPreset {
  id: string
  label: string
  from: string
  to: string
}

export const BG_PRESETS: BgPreset[] = [
  { id: 'dark', label: '暗黑渐变', from: '#1a1a1a', to: '#0d0d10' },
  { id: 'black', label: '纯黑渐变', from: '#121212', to: '#0a0a0a' },
  { id: 'redbrown', label: '暗红棕', from: '#1a1418', to: '#0d0a0c' },
  { id: 'bluegray', label: '暗蓝灰', from: '#14181a', to: '#0a0c0d' },
]

export interface WallpaperPreset {
  id: string
  label: string
  css: string
}

/** 内置暗黑默认壁纸（CSS 渐变 / 抽象纹理），用户未导入图片时使用 */
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: 'none', label: '无', css: 'var(--bg-primary)' },
  { id: 'noir', label: '深夜', css: 'radial-gradient(120% 90% at 20% 0%, #1c1c22 0%, #0a0a0d 55%, #000 100%)' },
  { id: 'ember', label: '余烬', css: 'radial-gradient(120% 90% at 80% 10%, #241418 0%, #0d0a0c 60%, #000 100%)' },
  { id: 'slate', label: '蓝调', css: 'radial-gradient(120% 90% at 30% 0%, #16202a 0%, #0a0e12 60%, #000 100%)' },
  { id: 'lines', label: '纹理', css: 'repeating-linear-gradient(135deg, #101012 0px, #101012 2px, #0a0a0c 2px, #0a0a0c 6px)' },
]

export const DEFAULT_STYLES: ModuleStyles = {
  presetId: 'dark',
  customFrom: '#1a1a1a',
  customTo: '#0d0d10',
  borderRadius: 16,
  spacing: 12,
  shadow: 'medium',
}

export const DEFAULT_VISIBILITY: ModuleVisibility = {
  time: true,
  monologue: true,
  recent: true,
  playing: true,
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** hex 颜色加深，用于自定义色的渐变终点 */
export function darken(hex: string, amount = 0.42): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const num = parseInt(m[1], 16)
  const r = Math.round(((num >> 16) & 255) * (1 - amount))
  const g = Math.round(((num >> 8) & 255) * (1 - amount))
  const b = Math.round((num & 255) * (1 - amount))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function resolveGradient(s: ModuleStyles): { from: string; to: string } {
  if (s.presetId === 'custom') return { from: s.customFrom, to: s.customTo }
  const p = BG_PRESETS.find((x) => x.id === s.presetId) ?? BG_PRESETS[0]
  return { from: p.from, to: p.to }
}

export function shadowCss(level: ShadowLevel): string {
  switch (level) {
    case 'weak':
      return '0 2px 8px rgba(0,0,0,0.25)'
    case 'strong':
      return '0 12px 32px rgba(0,0,0,0.65)'
    default:
      return '0 6px 20px rgba(0,0,0,0.45)'
  }
}

interface DesktopState {
  styles: ModuleStyles
  visibility: ModuleVisibility
  wallpaperPresetId: string
  monologue: Monologue | null
  nowPlaying: NowPlaying | null
  setStyles: (patch: Partial<ModuleStyles>) => void
  setVisibility: (key: keyof ModuleVisibility, v: boolean) => void
  setWallpaperPreset: (id: string) => void
  setMonologue: (m: Monologue) => void
  resetStyles: () => void
  setNowPlaying: (n: NowPlaying | null) => void
  updatePlayback: (patch: Partial<NowPlaying>) => void
}

export const useDesktop = create<DesktopState>()(
  persist(
    (set) => ({
      styles: { ...DEFAULT_STYLES },
      visibility: { ...DEFAULT_VISIBILITY },
      wallpaperPresetId: 'noir',
      monologue: null,
      nowPlaying: null,
      setStyles: (patch) =>
        set((s) => ({
          styles: {
            ...s.styles,
            ...patch,
            borderRadius: patch.borderRadius != null ? clamp(patch.borderRadius, 8, 24) : s.styles.borderRadius,
            spacing: patch.spacing != null ? clamp(patch.spacing, 8, 24) : s.styles.spacing,
          },
        })),
      setVisibility: (key, v) => set((s) => ({ visibility: { ...s.visibility, [key]: v } })),
      setWallpaperPreset: (wallpaperPresetId) => set({ wallpaperPresetId }),
      setMonologue: (monologue) => set({ monologue }),
      resetStyles: () => set({ styles: { ...DEFAULT_STYLES }, visibility: { ...DEFAULT_VISIBILITY } }),
      setNowPlaying: (nowPlaying) => set({ nowPlaying }),
      updatePlayback: (patch) => set((s) => (s.nowPlaying ? { nowPlaying: { ...s.nowPlaying, ...patch } } : {})),
    }),
    { name: 'ksc:desktopModules' }
  )
)

export function wallpaperCss(id: string): string {
  return (WALLPAPER_PRESETS.find((w) => w.id === id) ?? WALLPAPER_PRESETS[0]).css
}