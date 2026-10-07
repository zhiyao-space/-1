import type { ForumAuthor } from '../store/forum'
import { useForum } from '../store/forum'
import { useCharacters } from '../store/characters'
import { characterAuthor, npcAuthor, authorPersona } from './forumEngine'

export interface MemberRef {
  key: string
  name: string
  persona: string
  author: ForumAuthor
}

export function circleMembersFor(circleId: string, excludeKey?: string): MemberRef[] {
  const forum = useForum.getState()
  const circle = forum.circles.find((c) => c.id === circleId)
  if (!circle) return []
  const out: MemberRef[] = []
  for (const c of useCharacters.getState().characters) {
    if (!circle.memberCharacterIds.includes(c.id)) continue
    const a = characterAuthor(c)
    const key = `character:${c.id}`
    if (key === excludeKey) continue
    out.push({ key, name: c.name, persona: authorPersona(a), author: a })
  }
  for (const n of forum.npcs) {
    if (!circle.memberNpcIds.includes(n.id) || forum.blockedNpcIds.includes(n.id)) continue
    const a = npcAuthor(n)
    const key = `npc:${n.id}`
    if (key === excludeKey) continue
    out.push({ key, name: n.name, persona: authorPersona(a), author: a })
  }
  return out
}
