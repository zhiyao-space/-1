import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/idb'

export interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgContainer: string
  bgPanel: string
  bgButton: string
  textPrimary: string
  textBody: string
  textSecondary: string
  textTertiary: string
  accent: string
  glassOpacity: number
  glassBlur: number
  wallpaperDark: number
}

export interface FontConfig {
  cnFont: 'wenquanyi' | 'puhui' | 'custom'
  enFont: 'inter' | 'jetbrains' | 'dela' | 'custom'
  scale: number
  lsEn: number
  lsCn: number
  titleWeight: number
  bodyWeight: number
}

export interface WallpaperFx {
  dark: number
  blur: number
}

export interface SettingsState {
  phoneName: string
  signature: string
  avatarId: string | null
  colors: ThemeColors
  fonts: FontConfig
  customCss: string
  customFontCnId: string | null
  customFontEnId: string | null
  wallpapers: { desktop: string | null; lock: string | null; chat: string | null }
  wallpaperFx: { desktop: WallpaperFx; lock: WallpaperFx; chat: WallpaperFx }
  desktopIconSize: 24 | 32 | 40
  navIconSize: 20 | 24
  favorites: string[]
  setPhoneName: (name: string) => void
  setSignature: (s: string) => void
  setAvatarId: (id: string | null) => void
  setColors: (c: Partial<ThemeColors>) => void
  setFonts: (f: Partial<FontConfig>) => void
  setCustomCss: (css: string) => void
  setCustomFont: (lang: 'cn' | 'en', id: string | null) => void
  setWallpaper: (target: 'desktop' | 'lock' | 'chat', id: string | null) => void
  setWallpaperFx: (target: 'desktop' | 'lock' | 'chat', fx: Partial<WallpaperFx>) => void
  setDesktopIconSize: (v: 24 | 32 | 40) => void
  setNavIconSize: (v: 20 | 24) => void
  toggleFavorite: (name: string) => void
  applyPreset: (presetName: string) => void
  resetTheme: () => void
}

export const defaultColors: ThemeColors = {
  bgPrimary: '#000000',
  bgSecondary: '#050505',
  bgContainer: '#0c0c0c',
  bgPanel: '#1a1a1a',
  bgButton: '#242424',
  textPrimary: '#ffffff',
  textBody: '#e5e5e5',
  textSecondary: '#a8a8a8',
  textTertiary: '#737373',
  accent: '#ffffff',
  glassOpacity: 0.08,
  glassBlur: 24,
  wallpaperDark: 0.35,
}

const defaultFonts: FontConfig = {
  cnFont: 'puhui',
  enFont: 'inter',
  scale: 1,
  lsEn: 0.02,
  lsCn: 0.04,
  titleWeight: 700,
  bodyWeight: 400,
}

export interface ColorPreset {
  name: string
  colors: ThemeColors
}

export const colorPresets: ColorPreset[] = [
  {
    name: '纯黑极简',
    colors: { ...defaultColors },
  },
  {
    name: '深灰玻璃',
    colors: {
      ...defaultColors,
      bgPrimary: '#0a0a0a',
      bgSecondary: '#0c0c0c',
      bgContainer: '#141414',
      bgPanel: '#1e1e1e',
      accent: '#e5e5e5',
      glassOpacity: 0.1,
    },
  },
  {
    name: '黑白亚系',
    colors: {
      ...defaultColors,
      bgContainer: '#000000',
      bgPanel: '#111111',
      textBody: '#e5e5e5',
      accent: '#ffffff',
      glassOpacity: 0.05,
    },
  },
  {
    name: '深蓝灰',
    colors: {
      ...defaultColors,
      bgPrimary: '#0a0f1a',
      bgSecondary: '#0d1320',
      bgContainer: '#111a2c',
      bgPanel: '#16223a',
      textSecondary: '#9aa7bd',
      accent: '#8fb4ff',
      glassOpacity: 0.1,
      wallpaperDark: 0.4,
    },
  },
]

// 中文字体锁定为项目设定字体栈，移除"系统默认"，避免读取用户手机系统字体
export const CN_FONT_STACKS: Record<Exclude<FontConfig['cnFont'], never>, string> = {
  wenquanyi: "'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei', 'Noto Sans SC', sans-serif",
  puhui: "'Alibaba PuHuiTi 3.0', 'Alibaba PuHuiTi', 'Noto Sans SC', sans-serif",
  custom: "'KSCustomCN', 'Noto Sans SC', sans-serif",
}

// 兼容旧持久化数据中可能残留的 'system' 值
export function cnFontStack(key: FontConfig['cnFont'] | 'system'): string {
  return CN_FONT_STACKS[key as FontConfig['cnFont']] ?? CN_FONT_STACKS.puhui
}

export const EN_FONT_STACKS: Record<FontConfig['enFont'], string> = {
  inter: "'Inter', 'Noto Sans SC', sans-serif",
  jetbrains: "'JetBrains Mono', 'Share Tech Mono', monospace",
  dela: "'Dela Gothic One', 'Noto Sans SC', sans-serif",
  custom: "'KSCustomEN', 'Inter', sans-serif",
}

export function themeToCssVars(s: SettingsState): Record<string, string> {
  const c = s.colors
  const f = s.fonts
  return {
    '--bg-primary': c.bgPrimary,
    '--bg-secondary': c.bgSecondary,
    '--bg-container': c.bgContainer,
    '--bg-panel': c.bgPanel,
    '--bg-button': c.bgButton,
    '--text-primary': c.textPrimary,
    '--text-body': c.textBody,
    '--text-secondary': c.textSecondary,
    '--text-tertiary': c.textTertiary,
    '--text-disabled': '#525252',
    '--accent': c.accent,
    '--glass-alpha': String(c.glassOpacity),
    '--glass-border-alpha': String(Math.min(0.3, c.glassOpacity + 0.04)),
    '--glass-blur': `${c.glassBlur}px`,
    '--wallpaper-dark': String(c.wallpaperDark),
    '--font-body': cnFontStack(f.cnFont),
    '--font-nav': `'${f.enFont === 'jetbrains' ? 'JetBrains Mono' : 'Inter'}', ${cnFontStack(f.cnFont)}`,
    '--fs-scale': String(f.scale),
    '--ls-cn': `${f.lsCn}em`,
    '--ls-en': `${f.lsEn}em`,
    '--fw-title': String(f.titleWeight),
    '--fw-body': String(f.bodyWeight),
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      phoneName: '',
      signature: '',
      avatarId: null,
      colors: { ...defaultColors },
      fonts: { ...defaultFonts },
      customCss: '',
      customFontCnId: null,
      customFontEnId: null,
      wallpapers: { desktop: null, lock: null, chat: null },
      wallpaperFx: {
        desktop: { dark: 0.35, blur: 0 },
        lock: { dark: 0.35, blur: 0 },
        chat: { dark: 0.35, blur: 0 },
      },
      desktopIconSize: 32,
      navIconSize: 24,
      favorites: [],
      setPhoneName: (name) => set({ phoneName: name.trim() || '' }),
      setSignature: (signature) => set({ signature }),
      setAvatarId: (avatarId) => set({ avatarId }),
      setColors: (c) => set((s) => ({ colors: { ...s.colors, ...c } })),
      setFonts: (f) => set((s) => ({ fonts: { ...s.fonts, ...f } })),
      setCustomCss: (customCss) => set({ customCss }),
      setCustomFont: (lang, id) =>
        set(lang === 'cn' ? { customFontCnId: id } : { customFontEnId: id }),
      setWallpaper: (target, id) =>
        set((s) => ({ wallpapers: { ...s.wallpapers, [target]: id } })),
      setWallpaperFx: (target, fx) =>
        set((s) => ({
          wallpaperFx: { ...s.wallpaperFx, [target]: { ...s.wallpaperFx[target], ...fx } },
        })),
      setDesktopIconSize: (desktopIconSize) => set({ desktopIconSize }),
      setNavIconSize: (navIconSize) => set({ navIconSize }),
      toggleFavorite: (name) =>
        set((s) => ({
          favorites: s.favorites.includes(name)
            ? s.favorites.filter((f) => f !== name)
            : [...s.favorites, name],
        })),
      applyPreset: (presetName) => {
        const preset = colorPresets.find((p) => p.name === presetName)
        if (preset) set({ colors: { ...preset.colors } })
      },
      resetTheme: () => set({ colors: { ...defaultColors }, fonts: { ...defaultFonts } }),
    }),
    { name: 'ksc:settings', version: 1, migrate: (persisted) => {
      const s = persisted as Partial<SettingsState>
      const fonts = s.fonts as { cnFont?: string } | undefined
      if (fonts && fonts.cnFont === 'system') {
        s.fonts = { ...fonts, cnFont: 'puhui' } as FontConfig
      }
      return s as SettingsState
    } }
  )
)
