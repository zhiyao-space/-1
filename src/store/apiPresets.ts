export interface ApiPreset {
  id: string
  name: string
  category: 'chat' | 'image' | 'voice' | 'vision'
  baseUrl: string
  apiKey: string
  model: string
  contextCount: number
  temperature: number
  injectMode: 'system' | 'merge-user'
  isDefault: boolean
}

interface ApiPresetState {
  presets: ApiPreset[]
  addPreset: (p: Omit<ApiPreset, 'id'>) => string
  updatePreset: (id: string, patch: Partial<ApiPreset>) => void
  removePreset: (id: string) => void
  setDefault: (id: string) => void
}

function uid(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useApiPresets = create<ApiPresetState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (p) => {
        const id = uid()
        set((s) => ({
          presets: [
            ...s.presets.map((x) => (p.isDefault ? { ...x, isDefault: false } : x)),
            { ...p, id },
          ],
        }))
        return id
      },
      updatePreset: (id, patch) =>
        set((s) => ({
          presets: s.presets.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...patch,
                  ...(patch.isDefault
                    ? Object.fromEntries(s.presets.map((y) => [y.id, { ...y, isDefault: y.id === id }]))
                    : {}),
                }
              : x
          ),
        })),
      removePreset: (id) => set((s) => ({ presets: s.presets.filter((x) => x.id !== id) })),
      setDefault: (id) =>
        set((s) => ({
          presets: s.presets.map((x) => ({ ...x, isDefault: x.id === id })),
        })),
    }),
    { name: 'ksc:api-presets' }
  )
)

export function getDefaultChatPreset(): ApiPreset | null {
  const presets = useApiPresets.getState().presets.filter((p) => p.category === 'chat')
  return presets.find((p) => p.isDefault) ?? presets[0] ?? null
}

export function getPresetById(id: string | null): ApiPreset | null {
  if (!id) return null
  return useApiPresets.getState().presets.find((p) => p.id === id) ?? null
}
