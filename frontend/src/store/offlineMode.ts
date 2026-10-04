import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMode } from './chats'

export type OfflineStyle = 'sour' | 'green' | 'tender' | 'passionate' | 'cold'
export type OfflineLength = 'short' | 'medium' | 'long'
export type OfflinePerson = 'first' | 'third'

export const OFFLINE_STYLES: { key: OfflineStyle; label: string; desc: string }[] = [
  { key: 'sour', label: '酸涩', desc: '克制中藏着钝痛与酸意，遗憾感重，情绪往回收' },
  { key: 'green', label: '青涩', desc: '干净稚拙，心跳加速的紧张感，笨拙又真诚' },
  { key: 'tender', label: '温柔', desc: '轻软细腻，体贴与耐心落在细节里' },
  { key: 'passionate', label: '炽热', desc: '浓烈直接，情绪饱满，张力与占有欲强' },
  { key: 'cold', label: '清冷', desc: '疏离淡漠，冷静克制，情感藏在留白里' },
]

export const OFFLINE_LENGTHS: { key: OfflineLength; label: string; target: number; min: number; max: number }[] = [
  { key: 'short', label: '短', target: 300, min: 200, max: 400 },
  { key: 'medium', label: '中', target: 600, min: 450, max: 750 },
  { key: 'long', label: '长', target: 1000, min: 800, max: 1200 },
]

export const OFFLINE_PERSONS: { key: OfflinePerson; label: string; desc: string }[] = [
  { key: 'first', label: '第一人称', desc: '以角色"我"的视角叙述' },
  { key: 'third', label: '第三人称', desc: '用角色名指代角色，全知视角' },
]

export interface OfflineSettings {
  style: OfflineStyle
  length: OfflineLength
  person: OfflinePerson
  minWords: number
  maxWords: number
  customRules: string
  timeAware: boolean
  timeGapMinutes: number
}

export function defaultOfflineSettings(): OfflineSettings {
  return {
    style: 'tender',
    length: 'medium',
    person: 'third',
    minWords: 450,
    maxWords: 750,
    customRules: '',
    timeAware: true,
    timeGapMinutes: 120,
  }
}

interface OfflineModeState {
  modes: Record<string, ChatMode>
  settings: Record<string, OfflineSettings>
  setMode: (characterId: string, mode: ChatMode) => void
  getMode: (characterId: string) => ChatMode
  updateSettings: (characterId: string, patch: Partial<OfflineSettings>) => void
  applyLengthPreset: (characterId: string, length: OfflineLength) => void
}

export const useOfflineMode = create<OfflineModeState>()(
  persist(
    (set, get) => ({
      modes: {},
      settings: {},
      setMode: (characterId, mode) => set((s) => ({ modes: { ...s.modes, [characterId]: mode } })),
      getMode: (characterId) => get().modes[characterId] ?? 'online',
      updateSettings: (characterId, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [characterId]: { ...defaultOfflineSettings(), ...s.settings[characterId], ...patch },
          },
        })),
      applyLengthPreset: (characterId, length) => {
        const preset = OFFLINE_LENGTHS.find((l) => l.key === length)
        if (!preset) return
        set((s) => ({
          settings: {
            ...s.settings,
            [characterId]: {
              ...defaultOfflineSettings(),
              ...s.settings[characterId],
              length,
              minWords: preset.min,
              maxWords: preset.max,
            },
          },
        }))
      },
    }),
    { name: 'ksc:offline-mode' }
  )
)

export function offlineSettingsFor(characterId: string): OfflineSettings {
  return useOfflineMode.getState().settings[characterId] ?? defaultOfflineSettings()
}
