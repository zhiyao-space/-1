import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useRuntimeRules } from './runtimeRules'

export interface CustomField {
  id: string
  label: string
  value: string
}

export interface Character {
  id: string
  name: string
  identity: string
  appearance: string
  personality: string
  commStyle: string
  forbidden: string
  extraFields: CustomField[]
  avatarId: string | null
  apiPresetId: string | null
  createdAt: number
}

interface CharacterState {
  characters: Character[]
  addCharacter: (c: Omit<Character, 'id' | 'createdAt'>) => string
  updateCharacter: (id: string, patch: Partial<Character>) => void
  removeCharacter: (id: string) => void
}

function uid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export const useCharacters = create<CharacterState>()(
  persist(
    (set) => ({
      characters: [],
      addCharacter: (c) => {
        const id = uid()
        set((s) => ({ characters: [...s.characters, { ...c, id, createdAt: Date.now() }] }))
        return id
      },
      updateCharacter: (id, patch) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCharacter: (id) =>
        set((s) => ({ characters: s.characters.filter((c) => c.id !== id) })),
    }),
    { name: 'ksc:characters' }
  )
)

// 角色删除后同步清理各关联 store（思维链/总结/世界书绑定等）
export function removeCharacterEverywhere(id: string): void {
  useCharacters.getState().removeCharacter(id)
  useRuntimeRules.getState().cleanupCharacter(id)
}
