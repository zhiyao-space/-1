import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GroupRole = 'owner' | 'admin' | 'member'

export interface GroupMember {
  characterId: string
  groupNickname: string
  role: GroupRole
  muted: boolean
  title: string
  willingness: number
}

export interface GroupMessage {
  id: string
  senderType: 'user' | 'character' | 'system'
  senderId?: string
  senderName?: string
  type: 'text' | 'image' | 'sticker' | 'ooc' | 'system' | 'redpacket' | 'transfer' | 'voice' | 'dice'
  content: string
  imageId?: string | null
  data?: import('./chats').MessageData
  timestamp: number
  recalled?: boolean
}

export interface GroupChat {
  id: string
  name: string
  avatarId: string | null
  description: string
  announcement: string
  includeSelf: boolean
  spectate?: boolean
  members: GroupMember[]
  messages: GroupMessage[]
  maxRepliesPerRound: number
  createdAt: number
  lastActive: number
}

interface GroupState {
  groups: GroupChat[]
  createGroup: (g: Omit<GroupChat, 'id' | 'messages' | 'createdAt' | 'lastActive'>) => string
  updateGroup: (id: string, patch: Partial<GroupChat>) => void
  updateMember: (groupId: string, characterId: string, patch: Partial<GroupMember>) => void
  addMembers: (groupId: string, members: GroupMember[]) => void
  removeMember: (groupId: string, characterId: string) => void
  addGroupMessage: (groupId: string, msg: Omit<GroupMessage, 'id' | 'timestamp'>) => GroupMessage
  appendToGroupMessage: (groupId: string, msgId: string, delta: string) => void
  updateGroupMessage: (groupId: string, msgId: string, patch: Partial<GroupMessage>) => void
  removeGroupMessage: (groupId: string, msgId: string) => void
  dissolveGroup: (id: string) => void
}

function uid(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const useGroups = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      createGroup: (g) => {
        const id = uid()
        const now = Date.now()
        set((s) => ({ groups: [...s.groups, { ...g, id, messages: [], createdAt: now, lastActive: now }] }))
        return id
      },
      updateGroup: (id, patch) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      updateMember: (groupId, characterId, patch) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: g.members.map((m) =>
                    m.characterId === characterId ? { ...m, ...patch } : m
                  ),
                }
              : g
          ),
        })),
      addMembers: (groupId, members) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  members: [
                    ...g.members,
                    ...members.filter(
                      (m) => !g.members.some((e) => e.characterId === m.characterId)
                    ),
                  ],
                }
              : g
          ),
        })),
      removeMember: (groupId, characterId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m.characterId !== characterId) }
              : g
          ),
        })),
      addGroupMessage: (groupId, msg) => {
        const full: GroupMessage = { ...msg, id: uid(), timestamp: Date.now() }
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, messages: [...g.messages, full], lastActive: Date.now() }
              : g
          ),
        }))
        return full
      },
      appendToGroupMessage: (groupId, msgId, delta) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  messages: g.messages.map((m) =>
                    m.id === msgId ? { ...m, content: m.content + delta } : m
                  ),
                }
              : g
          ),
        })),
      updateGroupMessage: (groupId, msgId, patch) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  messages: g.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)),
                }
              : g
          ),
        })),
      removeGroupMessage: (groupId, msgId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, messages: g.messages.filter((m) => m.id !== msgId) } : g
          ),
        })),
      dissolveGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
    }),
    { name: 'ksc:groups' }
  )
)
