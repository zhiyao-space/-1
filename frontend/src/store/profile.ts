import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WorkItem {
  id: string
  title: string
  desc: string
  imageId: string | null
}

export interface Mask {
  id: string
  name: string
  avatarId: string | null
  persona: string
  active: boolean
}

export interface UserProfile {
  nickname: string
  avatarId: string | null
  backgroundId: string | null
  bio: string
  tags: string[]
  gender: string
  age: string
  ipLocation: string
  following: number
  followers: number
  mutuals: number
  works: WorkItem[]
  masks: Mask[]
}

interface ProfileState {
  profile: UserProfile
  updateProfile: (patch: Partial<UserProfile>) => void
  addWork: (w: Omit<WorkItem, 'id'>) => void
  updateWork: (id: string, patch: Partial<WorkItem>) => void
  removeWork: (id: string) => void
  addMask: (m: Omit<Mask, 'id' | 'active'>) => void
  updateMask: (id: string, patch: Partial<Omit<Mask, 'id'>>) => void
  removeMask: (id: string) => void
  activateMask: (id: string | null) => void
}

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export const emptyProfile: UserProfile = {
  nickname: '',
  avatarId: null,
  backgroundId: null,
  bio: '',
  tags: [],
  gender: '',
  age: '',
  ipLocation: '',
  following: 0,
  followers: 0,
  mutuals: 0,
  works: [],
  masks: [],
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      addWork: (w) => set((s) => ({ profile: { ...s.profile, works: [...s.profile.works, { ...w, id: uid('wk') }] } })),
      updateWork: (id, patch) =>
        set((s) => ({
          profile: { ...s.profile, works: s.profile.works.map((w) => (w.id === id ? { ...w, ...patch } : w)) },
        })),
      removeWork: (id) =>
        set((s) => ({ profile: { ...s.profile, works: s.profile.works.filter((w) => w.id !== id) } })),
      addMask: (m) =>
        set((s) => ({
          profile: { ...s.profile, masks: [...s.profile.masks, { ...m, id: uid('mk'), active: false }] },
        })),
      updateMask: (id, patch) =>
        set((s) => ({
          profile: { ...s.profile, masks: s.profile.masks.map((m) => (m.id === id ? { ...m, ...patch } : m)) },
        })),
      removeMask: (id) =>
        set((s) => ({ profile: { ...s.profile, masks: s.profile.masks.filter((m) => m.id !== id) } })),
      activateMask: (id) =>
        set((s) => ({
          profile: { ...s.profile, masks: s.profile.masks.map((m) => ({ ...m, active: m.id === id })) },
        })),
    }),
    { name: 'ksc:profile' }
  )
)

export function activeMask(): Mask | null {
  return useProfile.getState().profile.masks.find((m) => m.active) ?? null
}

export function displayUserName(phoneName: string): string {
  const p = useProfile.getState().profile
  const mask = p.masks.find((m) => m.active)
  if (mask && mask.name.trim()) return mask.name.trim()
  if (p.nickname.trim()) return p.nickname.trim()
  return phoneName || '我'
}

export function buildUserPersona(phoneName: string): string {
  const p = useProfile.getState().profile
  const mask = p.masks.find((m) => m.active)
  const parts: string[] = []
  parts.push(`用户昵称：${displayUserName(phoneName)}`)
  if (mask) {
    parts.push(`用户当前佩戴的面具身份：${mask.name}（用户正以此身份与你互动，请自然地按这个身份认知用户）`)
    if (mask.persona.trim()) parts.push(`该身份设定：${mask.persona.trim()}`)
  }
  if (p.gender.trim()) parts.push(`性别：${p.gender.trim()}`)
  if (p.age.trim()) parts.push(`年龄：${p.age.trim()}`)
  if (p.ipLocation.trim()) parts.push(`IP属地：${p.ipLocation.trim()}`)
  if (p.tags.length > 0) parts.push(`标签：${p.tags.join('、')}`)
  if (p.bio.trim()) parts.push(`个性简介：${p.bio.trim()}`)
  return parts.length > 1 ? `【关于对话对象（用户）】\n${parts.join('\n')}` : ''
}
