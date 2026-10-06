import { useCharacters, type Character } from '../store/characters'
import { useSettings } from '../store/settings'
import { useWorld, USER_ID, relationId, defaultEmotion, defaultRelation, type Attitude, type RelationRecord, type WorldEvent } from '../store/world'
import { todayStr } from '../store/chatParams'
import { displayUserName } from '../store/profile'

export function emotionOf(characterId: string) {
  return useWorld.getState().emotions[characterId] ?? defaultEmotion()
}

export function getRelation(fromId: string, toId: string): RelationRecord | undefined {
  return useWorld.getState().relations.find((r) => r.id === relationId(fromId, toId))
}

export function ensureRelation(fromId: string, toId: string): RelationRecord {
  const world = useWorld.getState()
  const existing = world.relations.find((r) => r.id === relationId(fromId, toId))
  if (existing) return existing
  const rel = defaultRelation(fromId, toId)
  world.upsertRelation(rel)
  return rel
}

export function displayNameOf(id: string): string {
  if (id === USER_ID) return displayUserName(useSettings.getState().phoneName || '我')
  return useCharacters.getState().characters.find((c) => c.id === id)?.name ?? '某人'
}

export function adjustEmotion(characterId: string, surface: string, intensity: number, reason?: string) {
  const world = useWorld.getState()
  const cur = world.emotions[characterId] ?? defaultEmotion()
  const clamped = Math.max(0, Math.min(100, Math.round(intensity)))
  let deep = cur.deep
  if (clamped >= 70 && surface !== '开心' && surface !== '平静') {
    const existing = cur.deep.find((d) => d.type === surface)
    if (existing) {
      deep = cur.deep.map((d) => (d.type === surface ? { ...d, intensity: Math.min(100, d.intensity + 10) } : d))
    } else {
      deep = [...cur.deep, { type: surface, intensity: clamped, since: Date.now() }]
    }
  }
  world.setEmotion(characterId, { surface, intensity: clamped, deep })
  world.pushEmotionHistory(characterId, surface, clamped)
  if (reason) useWorld.getState().addRelationHistory(relationId(characterId, USER_ID), reason)
}

export function bumpRelation(rel: RelationRecord, delta: number, desc: string) {
  const world = useWorld.getState()
  const intensity = Math.max(0, Math.min(100, rel.intensity + delta))
  let attitude: Attitude = rel.attitude
  if (intensity >= 75 && attitude === '喜欢') attitude = '爱慕'
  else if (intensity >= 60 && attitude === '暧昧') attitude = '喜欢'
  else if (intensity < 22 && attitude === '暧昧') attitude = '无感'
  else if (intensity < 18 && attitude === '喜欢') attitude = '无感'
  else if (intensity < 12 && attitude === '无感') attitude = '讨厌'
  const next: RelationRecord = {
    ...rel,
    intensity,
    attitude,
    history: [...rel.history.slice(-19), { time: Date.now(), desc }],
    lastInteraction: desc,
  }
  world.upsertRelation(next)
}

// 每轮聊天后：情绪自然演化 + 对用户关系微调
export function evolveEmotionAfterChat(characterId: string, userText: string) {
  const cur = emotionOf(characterId)
  const rel = getRelation(characterId, USER_ID)
  let surface = cur.surface
  let intensity = cur.intensity
  if (/喜欢你|爱你|想你|抱抱|亲亲|心疼|开心|谢谢/.test(userText)) {
    if (cur.surface === '低落' || cur.surface === '自卑') {
      intensity = Math.max(0, cur.intensity - 20)
    } else {
      surface = '开心'
      intensity = Math.min(100, cur.intensity + 10)
    }
  } else if (/滚|讨厌你|烦|别理我|闭嘴/.test(userText)) {
    surface = cur.surface === '开心' ? '低落' : cur.surface
    intensity = Math.min(100, cur.intensity + 15)
  } else {
    intensity = Math.max(5, Math.round(cur.intensity * 0.92))
  }
  adjustEmotion(characterId, surface, intensity)
  if (rel) {
    bumpRelation(rel, 1, `和${displayUserName(useSettings.getState().phoneName || '我')}聊了天`)
  }
}

interface EventTemplate {
  type: string
  desc: string
  delta: number
}

const EVENT_POOL: EventTemplate[] = [
  { type: '偶遇', desc: '{a}在便利店门口撞见了{b}，两个人愣了两秒才想起来打招呼。', delta: 8 },
  { type: '误会', desc: '{a}看到{b}和别人走得很近，误会了什么，一整天没给{b}好脸色。', delta: -10 },
  { type: '吵架', desc: '{a}和{b}因为一件小事呛了起来，谁都没让步，不欢而散。', delta: -12 },
  { type: '和好', desc: '{a}主动给{b}带了杯热饮，之前的不愉快就翻篇了。', delta: 10 },
  { type: '吃醋', desc: '{a}发现{b}一直在回别人的消息，心里莫名不是滋味。', delta: -6 },
  { type: '帮衬', desc: '{a}在众人面前帮{b}解了围，{b}把这份人情记下了。', delta: 9 },
  { type: '背后议论', desc: '{a}和别人聊起{b}，语气里带着说不清的意味。', delta: -7 },
  { type: '共同经历', desc: '突发状况让{a}和{b}不得不搭伙处理，配合得意外默契。', delta: 12 },
  { type: '分享', desc: '{a}把藏了很久的心里话讲给{b}听，讲完松了口气。', delta: 11 },
  { type: '冷落', desc: '{a}一整天绕着{b}走，消息也只回了个"嗯"。', delta: -8 },
]

function rollDailyEvent(chars: Character[]): WorldEvent | null {
  if (chars.length < 1) return null
  if (Math.random() > 0.45) return null
  const useUser = chars.length < 2 || Math.random() < 0.3
  const shuffled = chars.slice().sort(() => Math.random() - 0.5)
  const participants = useUser ? [shuffled[0].id, USER_ID] : [shuffled[0].id, shuffled[1].id]
  const pool = useUser ? EVENT_POOL.filter((e) => e.type !== '背后议论') : EVENT_POOL
  const tpl = pool[Math.floor(Math.random() * pool.length)]
  const description = tpl.desc.replace(/\{a\}/g, displayNameOf(participants[0])).replace(/\{b\}/g, displayNameOf(participants[1]))
  if (useUser) {
    bumpRelation(ensureRelation(participants[0], USER_ID), tpl.delta, `因为「${tpl.type}」`)
  } else {
    bumpRelation(ensureRelation(participants[0], participants[1]), tpl.delta, `因为「${tpl.type}」`)
  }
  const world = useWorld.getState()
  const ev: Omit<WorldEvent, 'id' | 'time'> = { date: todayStr(), type: tpl.type, participants, description }
  world.addEvent(ev)
  return { ...ev, id: `e${Date.now()}`, time: Date.now() }
}

// 每日初始化：关系网补全 + 过夜情绪衰减 + 每日一次动态事件
export function ensureWorldDay(): { event: WorldEvent | null } {
  const world = useWorld.getState()
  const chars = useCharacters.getState().characters
  for (const c of chars) {
    ensureRelation(c.id, USER_ID)
    ensureRelation(USER_ID, c.id)
    for (const o of chars) {
      if (o.id !== c.id) ensureRelation(c.id, o.id)
    }
  }
  for (const c of chars) {
    const cur = world.emotions[c.id] ?? defaultEmotion()
    if (Date.now() - cur.updatedAt > 8 * 3600 * 1000) {
      const decayed = Math.max(5, Math.round(cur.intensity * 0.6))
      world.setEmotion(c.id, {
        surface: decayed < 30 ? '平静' : cur.surface,
        intensity: decayed,
        deep: cur.deep.map((d) => ({ ...d, intensity: Math.max(10, Math.round(d.intensity * 0.85)) })),
      })
    }
  }
  if (world.lastEventDate !== todayStr()) {
    world.markEventRolled(todayStr())
    return { event: rollDailyEvent(chars) }
  }
  return { event: null }
}

export function todayEvent(): WorldEvent | null {
  const world = useWorld.getState()
  return world.events.filter((e) => e.date === todayStr()).slice(-1)[0] ?? null
}
