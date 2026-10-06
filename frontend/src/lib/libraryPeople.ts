import { useCharacters } from '../store/characters'
import { useForum } from '../store/forum'

/* ============================================================
   角色库 · 共享读取工具
   统一读取「自建角色」与「NPC」，供 Mul市 / mulin 商城等模块复用
   ============================================================ */

/** 归一化后的自建角色 */
export interface LibraryCharacter {
  id: string
  name: string
  identity?: string
  personality?: string
  avatarId?: string | null
}

/** 归一化后的 NPC */
export interface LibraryNpc {
  id: string
  name: string
  persona?: string
  avatarId?: string | null
}

/** 合并去重后的人物，用于各模块统一消费 */
export interface LibraryPerson {
  type: 'character' | 'npc'
  id: string
  name: string
  identity?: string
  personality?: string
  avatarId?: string | null
}

/**
 * 读取自建角色。
 * 优先从 zustand persist store 读取；仅当 store 为空时，才回退解析 localStorage，
 * 以兼容 store 尚未 hydrate 的场景。
 */
export function readCreatedCharacters(): LibraryCharacter[] {
  const stored = useCharacters.getState().characters
  if (stored.length) {
    return stored.map((c) => ({
      id: c.id,
      name: c.name,
      identity: c.identity,
      personality: c.personality,
      avatarId: c.avatarId,
    }))
  }
  try {
    const raw = localStorage.getItem('ksc:characters')
    if (!raw) return []
    const parsed = JSON.parse(raw) as { state?: { characters?: LibraryCharacter[] } }
    return parsed.state?.characters ?? []
  } catch {
    return []
  }
}

/**
 * 读取 NPC：论坛 NPC（useForum.npcs）以及角色库中来源为 npc 的角色卡。
 * chats store 仅保存会话，不持有 NPC 实体，故不在此读取。
 */
export function readNpcs(): LibraryNpc[] {
  const list: LibraryNpc[] = []
  const seen = new Set<string>()
  for (const n of useForum.getState().npcs) {
    const name = n.name?.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    list.push({ id: n.id, name: n.name, persona: n.persona, avatarId: n.avatarId })
  }
  // 角色库中由 NPC 生成的角色卡，同样视为 NPC
  for (const c of useCharacters.getState().characters) {
    const name = c.name?.trim()
    if (c.source !== 'npc' || !name || seen.has(name)) continue
    seen.add(name)
    list.push({ id: c.id, name: c.name, persona: c.personality, avatarId: c.avatarId })
  }
  return list
}

/** 合并角色与 NPC，按 name 去重（角色优先），供 Mul市 / 商城等模块统一使用 */
export function allLibraryPeople(): LibraryPerson[] {
  const result: LibraryPerson[] = []
  const seen = new Set<string>()
  const push = (p: LibraryPerson) => {
    const key = p.name?.trim()
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(p)
  }
  for (const c of readCreatedCharacters()) {
    push({
      type: 'character',
      id: c.id,
      name: c.name,
      identity: c.identity,
      personality: c.personality,
      avatarId: c.avatarId,
    })
  }
  for (const n of readNpcs()) {
    push({ type: 'npc', id: n.id, name: n.name, personality: n.persona, avatarId: n.avatarId })
  }
  return result
}