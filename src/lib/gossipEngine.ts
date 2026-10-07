import { getDefaultChatPreset } from '../store/apiPresets'
import { streamChat } from './api'
import { characterAuthor, npcAuthor } from './forumEngine'
import { useCharacters } from '../store/characters'
import { useChats } from '../store/chats'
import { useForum } from '../store/forum'
import { useMoments } from '../store/moments'
import { useNotifications } from '../store/notifications'
import { useGossip, type GossipChannel, type GossipConfrontChoice, type GossipEvent } from '../store/gossip'

// ---------------------------------------------------------------------------
// 八卦传播系统（跨模块后台驱动）
//
// 与项目既有后台调度（forumScheduler / proactive）保持同一套模式：
//   - 由 App.tsx 的 setInterval 心跳调用 runGossipTick()
//   - running 互斥，单轮内静默失败
//   - 触发点：用户在聊天里给角色发消息时调用 observeUserMessage()
// 传播渠道映射到本项目的真实模块：
//   chat   → 聊天 App（角色私聊质问用户）
//   forum  → 论坛「吃瓜八卦」圈子（匿名帖）
//   moment → 聊天 App 朋友圈 Tab（含沙射影动态）
// ---------------------------------------------------------------------------

/** NPC 关系网节点：角色与论坛 NPC 统一成 actor */
export interface GossipActor {
  key: string
  kind: 'character' | 'npc'
  id: string
  name: string
  persona: string
  avatarId: string | null
}

/** 阻止传播的条件 */
export const BLOCK_CONDITIONS = {
  /** 好感度≥80 时不传播负面信息 */
  highFriendship: 80,
  /** 对消息主角恐惧度≥90 时不敢传（本项目暂无恐惧度，阈值保留） */
  fearThreshold: 90,
}

/** 变形规则 */
export const DISTORTION_RULES = {
  lengthReduction: 0.15,
  detailLoss: 0.2,
  exaggerationAdd: 0.1,
  emotionBias: 0.25,
  reverseProbability: 0.05,
}

export const GOSSIP_CIRCLE_NAME = '吃瓜八卦'

const GOSSIP_KEYWORDS = [
  '八卦', '秘密', '听说', '其实', '偷偷', '别告诉', '不要告诉', '吐槽', '坏话',
  '黑料', '爆料', '小道消息', '内幕', '瓜', '绯闻', '劈腿', '出轨',
]
const EMOTION_RE = /[!！]{1,}|哈哈|呵呵|无语|离谱|恶心|讨厌|气死|烦死|绝了|笑死/
const NEGATIVE_RE = /讨厌|恶心|渣|坏话|黑料|出轨|劈腿|烦|垃圾|离谱|傻|蠢/
const PRIVATE_KEYWORDS = ['秘密', '别告诉', '不要告诉', '偷偷', '千万别说', '只有你', '保密']

const EXAGGERATIONS = ['听说事情可大了', '好几个人都在说', '这事已经传开了', '据说比这还夸张', '反正挺严重的']
const EMOTION_SHIFTS = ['（说得格外气愤）', '（语气里满是同情）', '（一脸嫌弃）', '（压低声音，像是怕人听见）']
const REVERSALS = ['其实也没那么严重', '好像只是误会一场', '听说后来和解了']

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = ((h ^ str.charCodeAt(i)) * 16777619) >>> 0
  return h >>> 0
}

/** 八卦倾向 0-100：越高越管不住嘴 */
export function gossipTraitOf(key: string): number {
  return hash(`g:${key}`) % 101
}

/** 传话可信度 0-100：越低越爱添油加醋 */
export function trustworthinessOf(key: string): number {
  return hash(`t:${key}`) % 101
}

function weightedPick<T>(list: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < list.length; i++) {
    r -= weights[i]
    if (r <= 0) return list[i]
  }
  return list[list.length - 1]
}

// ---------------------------------------------------------------------------
// NPC 关系网
// ---------------------------------------------------------------------------

/** 当前可参与八卦的全部 actor（创建的角色 + 论坛 NPC，排除被屏蔽的） */
export function gossipActors(): GossipActor[] {
  const out: GossipActor[] = []
  for (const c of useCharacters.getState().characters) {
    out.push({
      key: `character:${c.id}`,
      kind: 'character',
      id: c.id,
      name: c.name,
      persona: c.personality || c.identity || '一个普通人',
      avatarId: c.avatarId,
    })
  }
  const forum = useForum.getState()
  for (const n of forum.npcs) {
    if (forum.blockedNpcIds.includes(n.id)) continue
    out.push({
      key: `npc:${n.id}`,
      kind: 'npc',
      id: n.id,
      name: n.name,
      persona: n.persona || '一个普通人',
      avatarId: n.avatarId,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// 触发判定
// ---------------------------------------------------------------------------

export interface GossipDetection {
  isGossip: boolean
  /** 含负面内容 */
  negative: boolean
  /** 含私密内容 */
  privateInfo: boolean
  /** 敏感度 0-5，越大越容易传 */
  intensity: number
  /** 被议论的第三方名字 */
  targetName: string | null
}

/** 判断一句话是否构成八卦素材：关键词 / 涉及第三方 / 语气强烈 */
export function detectGossip(content: string): GossipDetection {
  const text = content.trim()
  let targetName: string | null = null
  for (const a of gossipActors()) {
    if (a.name && text.includes(a.name)) {
      targetName = a.name
      break
    }
  }
  const hitKeyword = GOSSIP_KEYWORDS.some((k) => text.includes(k))
  const emotion = EMOTION_RE.test(text)
  const negative = NEGATIVE_RE.test(text)
  const privateInfo = PRIVATE_KEYWORDS.some((k) => text.includes(k))

  let intensity = 0
  if (hitKeyword) intensity += 2
  if (targetName) intensity += 2
  if (emotion) intensity += 1
  if (negative) intensity += 1

  return { isGossip: intensity >= 2, negative, privateInfo, intensity, targetName }
}

/** 传播判定：结合八卦倾向、好感度、私密性与负面内容 */
export function shouldGossip(actor: GossipActor, det: GossipDetection, friendship: number): boolean {
  let chance = gossipTraitOf(actor.key) / 100
  if (friendship >= BLOCK_CONDITIONS.highFriendship && det.negative) chance *= 0.3
  if (det.privateInfo) chance *= 0.5
  if (det.intensity >= 4) chance = Math.min(1, chance + 0.1)
  return Math.random() < chance
}

// ---------------------------------------------------------------------------
// 内容变形
// ---------------------------------------------------------------------------

function shorten(text: string): string {
  const parts = text.split(/[，,。！!？?；;~…\s]+/).filter(Boolean)
  if (parts.length <= 2) return text
  const keep = Math.max(2, Math.ceil(parts.length * (1 - DISTORTION_RULES.lengthReduction)))
  return parts.slice(0, keep).join('，')
}

/** 规则版变形（无 API 时也能跑） */
export function distortContent(
  content: string,
  distortionLevel: number,
  trustworthiness: number
): { content: string; distortionLevel: number } {
  let out = content
  if (Math.random() < DISTORTION_RULES.detailLoss) out = shorten(out)
  if (Math.random() < DISTORTION_RULES.exaggerationAdd) {
    out = `${out}，${EXAGGERATIONS[Math.floor(Math.random() * EXAGGERATIONS.length)]}`
  }
  if (Math.random() < DISTORTION_RULES.emotionBias) {
    out = `${EMOTION_SHIFTS[Math.floor(Math.random() * EMOTION_SHIFTS.length)]}${out}`
  }
  if (Math.random() < DISTORTION_RULES.reverseProbability) {
    out = REVERSALS[Math.floor(Math.random() * REVERSALS.length)]
  }
  const level = Math.min(100, distortionLevel + (100 - trustworthiness) * 0.1)
  return { content: out, distortionLevel: level }
}

/** AI 版变形：按传播者性格改写，失败返回 null 走规则版 */
async function distortWithAI(actor: GossipActor, ev: GossipEvent): Promise<string | null> {
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return null
  const instruction =
    `你是「${actor.name}」，人设：${actor.persona}。\n` +
    `你正把听来的一件事转述给另一个人。请用你的口吻把下面这句话改写一遍：` +
    `可以遗漏细节、添油加醋或带点情绪，但要让原意基本还能认出来。\n` +
    `只输出改写后的那一句话，不要任何解释或前后缀。\n\n原话：${ev.currentContent}`
  try {
    const raw = await streamChat(preset, [{ role: 'user', content: instruction }], { onDelta: () => {} })
    const line = raw.trim().split('\n').map((s) => s.trim()).filter(Boolean).pop()
    return line && line.length > 1 ? line.slice(0, 140) : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// 渠道注入
// ---------------------------------------------------------------------------

function actorAuthor(actor: GossipActor) {
  if (actor.kind === 'character') {
    const c = useCharacters.getState().characters.find((x) => x.id === actor.id)
    return c ? characterAuthor(c) : { type: 'character' as const, id: actor.id, name: actor.name, avatarId: actor.avatarId }
  }
  const n = useForum.getState().npcs.find((x) => x.id === actor.id)
  return n
    ? npcAuthor(n)
    : { type: 'npc' as const, id: actor.id, name: actor.name, avatarId: actor.avatarId }
}

/** 确保存在「吃瓜八卦」圈子，并把全部角色/NPC 同步为成员 */
function ensureGossipCircle(): string | null {
  const forum = useForum.getState()
  const charIds = useCharacters.getState().characters.map((c) => c.id)
  const npcIds = forum.npcs.filter((n) => !forum.blockedNpcIds.includes(n.id)).map((n) => n.id)
  const existing = forum.circles.find((c) => c.name === GOSSIP_CIRCLE_NAME)
  if (existing) {
    const needMembers =
      charIds.some((id) => !existing.memberCharacterIds.includes(id)) ||
      npcIds.some((id) => !existing.memberNpcIds.includes(id))
    if (needMembers || !existing.userJoined) {
      forum.updateCircle(existing.id, { memberCharacterIds: charIds, memberNpcIds: npcIds, userJoined: true })
    }
    return existing.id
  }
  if (charIds.length === 0 && npcIds.length === 0) return null
  return forum.createCircle({
    name: GOSSIP_CIRCLE_NAME,
    description: '本圈子只负责吃瓜，真假自辨',
    coverId: null,
    isPrivate: false,
    rules: '禁止对号入座',
    ownerId: 'user',
    memberCharacterIds: charIds,
    memberNpcIds: npcIds,
    userJoined: true,
  })
}

/** 渠道一：论坛匿名吃瓜帖 */
function postToForum(actor: GossipActor, ev: GossipEvent): boolean {
  const circleId = ensureGossipCircle()
  if (!circleId) return false
  const title = `【吃瓜】${ev.currentContent.slice(0, 18)}${ev.currentContent.length > 18 ? '…' : ''}`
  useForum.getState().addPost({
    circleId,
    author: actorAuthor(actor),
    title,
    content: `楼主听说了一件事——\n\n${ev.currentContent}`,
    imageIds: [],
    imageDesc: '',
    tags: ['吃瓜', '八卦'],
    playStyle: 'normal',
    threadParts: [],
    quoteOf: null,
    fanficMeta: null,
    type: 'text',
    poll: null,
    relay: null,
    anonymous: true,
  })
  return true
}

/** 渠道二：朋友圈含沙射影动态 */
function postToMoment(actor: GossipActor, ev: GossipEvent): boolean {
  const text = ev.currentContent.slice(0, 40)
  useMoments.getState().addMoment({
    author: { type: actor.kind === 'character' ? 'character' : 'npc', id: actor.id, name: actor.name },
    content: `有些事啊……${text}${ev.currentContent.length > 40 ? '…' : ''}\n#不说也知道`,
    imageIds: [],
    location: '',
    visibility: 'all',
    visibleIds: [],
    music: null,
  })
  return true
}

/** 渠道三：角色在私聊里直接质问用户 */
function confrontUser(actor: GossipActor, ev: GossipEvent): boolean {
  if (actor.kind !== 'character') return false
  const text = `话说……你是不是跟别人说过「${ev.currentContent.slice(0, 24)}」？我听到的版本可不太一样。`
  const sessionId = useChats.getState().getOrCreateSession(actor.id)
  const msg = useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: text })
  useGossip.getState().pushConfront({
    eventId: ev.id,
    questionerKey: actor.key,
    questionerName: actor.name,
    sessionId,
    messageId: msg.id,
    text,
  })
  useNotifications.getState().push({
    kind: 'chat',
    title: `${actor.name} 似乎听说了什么`,
    body: text.slice(0, 40),
    target: { app: 'chat', payload: { kind: 'single', characterId: actor.id } },
  })
  return true
}

/** 渠道选择：嘴碎→论坛；亲近→私聊；变形高→朋友圈 */
function pickChannel(actor: GossipActor, distortionLevel: number): GossipChannel {
  const trait = gossipTraitOf(actor.key)
  const roll = Math.random()
  if (distortionLevel >= 55) return roll < 0.6 ? 'moment' : roll < 0.85 ? 'forum' : 'chat'
  if (trait >= 75) return roll < 0.6 ? 'forum' : roll < 0.85 ? 'chat' : 'moment'
  if (trait <= 35) return roll < 0.6 ? 'chat' : roll < 0.85 ? 'moment' : 'forum'
  return roll < 0.45 ? 'chat' : roll < 0.8 ? 'forum' : 'moment'
}

// ---------------------------------------------------------------------------
// 触发源：用户在聊天里对角色说的话
// ---------------------------------------------------------------------------

/** 观察一条用户消息，判断是否写入八卦事件池 */
export function observeUserMessage(characterId: string, content: string): void {
  const det = detectGossip(content)
  if (!det.isGossip) return
  const speaker = useCharacters.getState().characters.find((c) => c.id === characterId)
  if (!speaker) return
  const actor: GossipActor = {
    key: `character:${speaker.id}`,
    kind: 'character',
    id: speaker.id,
    name: speaker.name,
    persona: speaker.personality || '一个普通人',
    avatarId: speaker.avatarId,
  }
  // 本项目暂无 NPC 好感度系统，用中性值参与判定
  if (!shouldGossip(actor, det, 50)) return
  // 冷却：同一角色 3 分钟内不重复起新瓜
  const recent = useGossip
    .getState()
    .events.find((e) => e.sourceKey === actor.key && Date.now() - e.createdAt < 180_000)
  if (recent) return
  useGossip.getState().addEvent({
    sourceKey: actor.key,
    sourceName: actor.name,
    originalContent: content,
    currentContent: content,
    targetName: det.targetName,
    distortionLevel: 0,
    spreadRadius: 1,
    maxSpread: 3,
    status: 'spreading',
    channels: [],
    listeners: [actor.key],
  })
}

// ---------------------------------------------------------------------------
// tick() 心跳：推进一条正在传播的八卦
// ---------------------------------------------------------------------------

let running = false

export async function runGossipTick(): Promise<void> {
  if (running) return
  const store = useGossip.getState()
  store.pruneEvents()
  const spreading = useGossip.getState().events.filter((e) => e.status === 'spreading')
  if (spreading.length === 0) return

  const ev = spreading[Math.floor(Math.random() * spreading.length)]
  const actors = gossipActors()
  if (actors.length === 0) return

  // 下一跳：排除源头与已听过的人
  const candidates = actors.filter((a) => a.key !== ev.sourceKey && !ev.listeners.includes(a.key))
  if (candidates.length === 0) {
    store.updateEvent(ev.id, { status: 'expired' })
    return
  }
  // 越嘴碎的人越可能成为下一跳
  const listener = weightedPick(candidates, candidates.map((a) => 1 + gossipTraitOf(a.key) / 50))

  running = true
  try {
    const trust = trustworthinessOf(listener.key)
    const ai = await distortWithAI(listener, ev)
    const distorted = ai ?? distortContent(ev.currentContent, ev.distortionLevel, trust).content
    const distortionLevel = Math.min(100, ev.distortionLevel + (100 - trust) * 0.1)
    const channel = pickChannel(listener, distortionLevel)

    const next: GossipEvent = {
      ...ev,
      currentContent: distorted,
      distortionLevel,
      spreadRadius: ev.spreadRadius + 1,
      listeners: [...ev.listeners, listener.key],
    }

    let delivered = false
    if (channel === 'forum') delivered = postToForum(listener, next)
    else if (channel === 'moment') delivered = postToMoment(listener, next)
    else delivered = confrontUser(listener, next)

    const exhausted = next.spreadRadius >= ev.maxSpread || Math.random() < 0.25
    useGossip.getState().updateEvent(ev.id, {
      currentContent: distorted,
      distortionLevel,
      spreadRadius: next.spreadRadius,
      listeners: next.listeners,
      channels: delivered ? Array.from(new Set([...ev.channels, channel])) : ev.channels,
      status: exhausted ? 'expired' : 'spreading',
    })
  } catch {
    // 单轮失败静默，等下一轮心跳
  } finally {
    running = false
  }
}

// ---------------------------------------------------------------------------
// 用户应对：承认 / 否认 / 反问溯源
// ---------------------------------------------------------------------------

export function resolveConfront(confrontId: string, choice: GossipConfrontChoice): void {
  const store = useGossip.getState()
  const cf = store.confronts.find((c) => c.id === confrontId)
  if (!cf || cf.resolvedAt || !cf.sessionId) return
  store.resolveConfront(confrontId, choice)

  const chats = useChats.getState()
  const userText =
    choice === 'admit' ? '……好吧，是我说的。' : choice === 'deny' ? '你听谁说的？我没说过。' : '这是谁告诉你的？'

  const sourceName = useGossip.getState().events.find((e) => e.id === cf.eventId)?.sourceName
  const reply =
    choice === 'admit'
      ? '我就知道。行吧，这事我替你压下去，别再往外说了。'
      : choice === 'deny'
        ? '真的假的……那可能是我听岔了，当我没说。'
        : `是${sourceName ?? '别人'}那边传出来的。你也别去问，越问越乱。`

  chats.addMessage(cf.sessionId, { role: 'user', type: 'text', content: userText })
  const sessionId = cf.sessionId
  window.setTimeout(() => {
    useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: reply })
  }, 600 + Math.random() * 900)
}

// ---------------------------------------------------------------------------
// 引擎全局挂载：window.gossipSystem（与本地后台调度同级，便于调试/观测）
// ---------------------------------------------------------------------------

export interface GossipSystemHandle {
  store: typeof useGossip
  actors: typeof gossipActors
  detect: typeof detectGossip
  observe: typeof observeUserMessage
  tick: typeof runGossipTick
  resolve: typeof resolveConfront
  gossipTraitOf: typeof gossipTraitOf
  trustworthinessOf: typeof trustworthinessOf
}

export function mountGossipSystem(): void {
  ;(window as unknown as { gossipSystem?: GossipSystemHandle }).gossipSystem = {
    store: useGossip,
    actors: gossipActors,
    detect: detectGossip,
    observe: observeUserMessage,
    tick: runGossipTick,
    resolve: resolveConfront,
    gossipTraitOf,
    trustworthinessOf,
  }
}
