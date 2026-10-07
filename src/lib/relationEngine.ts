import { useCharacters } from '../store/characters'
import { useForum } from '../store/forum'
import { useProfile, displayUserName } from '../store/profile'
import { useSettings } from '../store/settings'
import { getDefaultChatPreset } from '../store/apiPresets'
import { useNotifications } from '../store/notifications'
import { streamChat, type ChatApiMessage } from './api'
import { buildCharacterPrompt } from './chatEngine'
import { authorPersona } from './forumEngine'
import {
  useRelations,
  relationPairKey,
  KIND_LABEL,
  type RelationKind,
  type RelationDirection,
  type RelationStatus,
  type Relation,
} from '../store/relations'

export type RelationNodeType = 'user' | 'character' | 'npc'

export interface RelationNode {
  key: string
  type: RelationNodeType
  id: string
  name: string
  persona: string
}

/** 图谱节点：用户 + 全部角色 + 未拉黑 NPC */
export function relationNodes(): RelationNode[] {
  const characters = useCharacters.getState().characters
  const forum = useForum.getState()
  const profile = useProfile.getState().profile
  const phoneName = useSettings.getState().phoneName

  const nodes: RelationNode[] = [
    {
      key: 'user',
      type: 'user',
      id: 'user',
      name: displayUserName(phoneName) || '我',
      persona: `你是「${displayUserName(phoneName) || '我'}」，${profile.bio || '一个普通但内心丰富的人'}。`,
    },
  ]
  for (const c of characters) {
    nodes.push({ key: `character:${c.id}`, type: 'character', id: c.id, name: c.name, persona: buildCharacterPrompt(c) })
  }
  for (const n of forum.npcs) {
    if (forum.blockedNpcIds.includes(n.id)) continue
    nodes.push({
      key: `npc:${n.id}`,
      type: 'npc',
      id: n.id,
      name: n.name,
      persona: authorPersona({ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }),
    })
  }
  return nodes
}

const KIND_BOND: Record<RelationKind, [number, number]> = {
  family: [70, 95],
  lover: [80, 100],
  crush: [50, 80],
  ex: [40, 70],
  friend: [55, 90],
  colleague: [35, 70],
  rival: [30, 60],
  enemy: [20, 60],
  stranger: [5, 25],
}

const FALLBACK_NOTES: Record<RelationKind, string[]> = {
  family: ['从小一起长大，彼此最熟悉', '血缘的牵绊，吵不散'],
  lover: ['最近走得很近，眼里只有对方', '在一起了，但还没公开'],
  crush: ['偷偷在意了很久，没说出口', '总是忍不住多看几眼'],
  ex: ['曾经很好，后来走散了', '和平分手，偶尔还会想起'],
  friend: ['认识很久的老朋友', '无话不谈的朋友'],
  colleague: ['工作上经常打交道', '同一圈子里认识的'],
  rival: ['暗暗较劲，谁也不服谁', '竞争关系，面上过得去'],
  enemy: ['有过节，见面气氛微妙', '立场对立，互不待见'],
  stranger: ['只在同一个圈子见过几面', '听过名字，没真正聊过'],
}

const STORY_FALLBACK = [
  '{a}和{b}因为一件小事闹了点别扭，谁也没先低头。',
  '{a}深夜给{b}发了一条消息，又撤回了。',
  '{a}和{b}一起去了趟老地方，聊到很晚才回。',
  '{a}在朋友圈给{b}点了赞，却什么也没说。',
  '{a}和{b}因为同一个话题争论起来，最后都笑了。',
  '{b}遇到麻烦时，第一个想到的是{a}。',
  '{a}嘴上说着不在意{b}，行动却很诚实。',
  '{a}和{b}约好下次一起吃饭，但都没定具体时间。',
  '{a}听说{b}最近状态不好，犹豫了很久要不要开口。',
  '{a}和{b}的关系似乎在这一天悄悄变了。',
]

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function apiWrap(sys: string, user: string): ChatApiMessage[] {
  const preset = getDefaultChatPreset()
  const mode = preset?.injectMode ?? 'system'
  if (mode === 'merge-user') {
    return [
      { role: 'user', content: `[系统设定]\n${sys}` },
      { role: 'user', content: user },
    ]
  }
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ]
}

async function callLLM(sys: string, user: string): Promise<string | null> {
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return null
  try {
    const raw = await streamChat(preset, apiWrap(sys, user), { onDelta: () => {} })
    return raw?.trim() || null
  } catch {
    return null
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as T
  } catch {
    return null
  }
}

function clampBond(kind: RelationKind, v: unknown): number {
  const [lo, hi] = KIND_BOND[kind]
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return randInt(lo, hi)
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function normalizeKind(v: unknown): RelationKind {
  const s = String(v ?? '')
  return (Object.keys(KIND_BOND) as RelationKind[]).includes(s as RelationKind) ? (s as RelationKind) : 'stranger'
}

function normalizeStatus(v: unknown, kind: RelationKind): RelationStatus {
  const s = String(v ?? '')
  if (s === 'stable' || s === 'ambiguous' || s === 'broken') {
    if (s === 'broken' && (kind === 'lover' || kind === 'family')) return 'ambiguous'
    return s
  }
  if (kind === 'stranger' || kind === 'crush') return 'ambiguous'
  return 'stable'
}

/** 生成一对角色的关系（LLM 优先，失败走兜底随机） */
export async function generateRelation(nodeA: RelationNode, nodeB: RelationNode): Promise<Omit<Relation, 'id' | 'updatedAt'>> {
  const sys = `${nodeA.persona}

${nodeB.persona}

【任务】判断「${nodeA.name}」与「${nodeB.name}」之间的关系，用于生成一张关系地图。
严格输出 JSON（无 markdown 代码块）：
{"kind":"family|friend|lover|crush|ex|colleague|rival|enemy|stranger","bond":0-100,"direction":"both|one-way","status":"stable|ambiguous|broken","note":"一句话关系描述，24字内"}
bond 表示关系深度（越深连线越粗）；direction 为 both（双向）或 one-way（单向箭头）；status 为 stable/ambiguous/broken。`
  const j = parseJson<Record<string, unknown>>(await callLLM(sys, '（系统指令：现在只输出这段关系的 JSON。）'))
  const kind = normalizeKind(j?.kind)
  const notes = FALLBACK_NOTES[kind]
  return {
    fromKey: nodeA.key,
    toKey: nodeB.key,
    kind,
    bond: clampBond(kind, j?.bond),
    direction: (String(j?.direction ?? '') === 'one-way' ? 'one-way' : 'both') as RelationDirection,
    status: normalizeStatus(j?.status, kind),
    note: typeof j?.note === 'string' && j.note.trim() ? j.note.trim().slice(0, 40) : notes[randInt(0, notes.length - 1)],
  }
}

function fallbackRelation(nodeA: RelationNode, nodeB: RelationNode): Omit<Relation, 'id' | 'updatedAt'> {
  const kinds: RelationKind[] = ['family', 'friend', 'lover', 'crush', 'ex', 'colleague', 'rival', 'enemy', 'stranger']
  const kind = kinds[randInt(0, kinds.length - 1)]
  const notes = FALLBACK_NOTES[kind]
  const [lo, hi] = KIND_BOND[kind]
  return {
    fromKey: nodeA.key,
    toKey: nodeB.key,
    kind,
    bond: randInt(lo, hi),
    direction: Math.random() < 0.22 ? 'one-way' : 'both',
    status: normalizeStatus(undefined, kind),
    note: notes[randInt(0, notes.length - 1)],
  }
}

/** 为一段关系生成一条互动故事 */
export async function generateRelationStory(relation: Relation, nodeA: RelationNode, nodeB: RelationNode): Promise<string> {
  const sys = `${nodeA.persona}

${nodeB.persona}

【已知关系】${nodeA.name} 与 ${nodeB.name}：${KIND_LABEL[relation.kind]}（${relation.note}）
【任务】写一小段两人的互动故事，40 字以内，具体、有画面感、符合人设与关系状态。
只输出故事正文，不要引号、不要解释。`
  const raw = await callLLM(sys, '（系统指令：现在写出这段故事。只输出正文。）')
  if (raw) return raw.replace(/^["“]|["”]$/g, '').slice(0, 120)
  const t = STORY_FALLBACK[randInt(0, STORY_FALLBACK.length - 1)]
  return t.replace(/\{a\}/g, nodeA.name).replace(/\{b\}/g, nodeB.name)
}

export interface RelationRefreshResult {
  newRelations: number
  updatedRelations: number
  stories: number
  warmup: boolean
}

/**
 * 刷新关系地图：
 * 1) 优先补齐「还没有关系」的节点对（每轮最多 2 对，冷启动最多 3 对）
 * 2) 随机挑一条关系生成一段互动故事
 * 3) 手编过的关系对不会被覆盖
 */
export async function runRelationRefresh(): Promise<RelationRefreshResult> {
  const result: RelationRefreshResult = { newRelations: 0, updatedRelations: 0, stories: 0, warmup: false }
  const nodes = relationNodes()
  if (nodes.length < 2) return result

  const store = useRelations.getState()
  const pinned = new Set(store.pinnedPairs)
  const existingPairs = new Set(store.relations.map((r) => relationPairKey(r.fromKey, r.toKey)))

  // 所有候选对
  const allPairs: [RelationNode, RelationNode][] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) allPairs.push([nodes[i], nodes[j]])
  }
  const missing = shuffle(allPairs.filter(([a, b]) => !existingPairs.has(relationPairKey(a.key, b.key))))

  let quota = store.relations.length < 3 ? 3 : 2
  if (store.relations.length < 3) result.warmup = true
  const presetReady = !!getDefaultChatPreset()?.baseUrl

  for (const [a, b] of missing) {
    if (quota <= 0) break
    const data = presetReady ? await generateRelation(a, b) : fallbackRelation(a, b)
    useRelations.getState().upsertRelation(data)
    result.newRelations += 1
    quota -= 1
    await delay(presetReady ? 400 : 160)
  }

  // 随机让一条既有关系「发生变化」或产生新故事
  const rels = useRelations.getState().relations
  if (rels.length > 0) {
    const pick = shuffle(rels).find((r) => {
      const pairKey = relationPairKey(r.fromKey, r.toKey)
      return !pinned.has(pairKey)
    })
    if (pick) {
      const nodeA = nodes.find((n) => n.key === pick.fromKey)
      const nodeB = nodes.find((n) => n.key === pick.toKey)
      if (nodeA && nodeB) {
        const text = await generateRelationStory(pick, nodeA, nodeB)
        useRelations.getState().addStory({
          relationId: pick.id,
          content: text,
          relatedToUser: pick.fromKey === 'user' || pick.toKey === 'user',
        })
        result.stories += 1

        // 有 30% 概率关系深度/状态发生一次小变化
        if (Math.random() < 0.3) {
          const drift = randInt(-6, 8)
          const nextBond = Math.max(5, Math.min(100, pick.bond + drift))
          const nextStatus: RelationStatus = nextBond >= 45 ? 'stable' : 'ambiguous'
          useRelations.getState().updateRelation(pick.id, { bond: nextBond, status: nextStatus })
          result.updatedRelations += 1
        }
      }
    }
  }

  useRelations.getState().markRefreshed()

  if (result.newRelations > 0 || result.stories > 0) {
    useNotifications.getState().push({
      kind: 'moment-comment',
      title: '关系地图有更新',
      body: `新增 ${result.newRelations} 条关系${result.stories ? `、${result.stories} 段故事` : ''}`,
      target: { app: 'chat', payload: { view: 'moment', id: 'relations' } },
    })
  }

  return result
}