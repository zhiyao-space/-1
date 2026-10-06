import type { ApiPreset } from '../store/apiPresets'
import { getPresetById, getDefaultChatPreset } from '../store/apiPresets'
import type { Character } from '../store/characters'
import type { GameSession, TrpgState, TurtleState } from '../store/games'
import { useGames } from '../store/games'
import { buildCharacterPrompt } from './chatEngine'
import { streamChat, type ChatApiMessage } from './api'
import { localTurn, localTurtleTurn, FALLBACK_TURTLES } from './gameFallback'

export interface TrpgPreset {
  id: string
  name: string
  world: string
  role: string
  items: string[]
}

export const trpgPresets: TrpgPreset[] = [
  {
    id: 'apocalypse',
    name: '废土末世',
    world: '病毒爆发后的第三年，城市沦为废墟，幸存者在辐射与掠夺者之间挣扎求生，传闻北方有一座尚未沦陷的庇护所。',
    role: '一名带着半张旧地图的流浪者',
    items: ['半瓶净水', '手电筒'],
  },
  {
    id: 'xianxia',
    name: '修仙问途',
    world: '青云山脉脚下的小城，凡人与修士混居。每十年一次的仙门收徒大典将至，人人都在寻找改变命运的机会。',
    role: '一名身怀微弱灵根的凡人少年',
    items: ['粗布包袱', '半块灵石'],
  },
  {
    id: 'campus',
    name: '悬疑校园',
    world: '临海的南屿高中，传说中深夜的教学楼会出现「第十三级台阶」，最近学校里接连发生无法解释的小事。',
    role: '一名刚转学来的高二学生',
    items: ['学生证', '旧手机'],
  },
  {
    id: 'cthulhu',
    name: '克苏鲁怪谈',
    world: '1920 年代美国港口小城印斯茅斯，浓雾常年不散。你受人之托来调查一桩失踪案，镇上居民的言行透着说不出的诡异。',
    role: '一名受委托的私家侦探',
    items: ['笔记本', '左轮手枪'],
  },
  {
    id: 'fantasy',
    name: '西幻佣兵',
    world: '艾尔多王国的边境小镇，龙灾过后的第三个月，佣兵公会的告示板上贴满了悬赏任务，据说遗迹深处藏着龙的心脏。',
    role: '一名刚出师的新手佣兵',
    items: ['铁剑', '冒险者徽章'],
  },
]

function roll20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback
  return Math.min(max, Math.max(min, n))
}

export function resolveGamePreset(character: Character): ApiPreset | null {
  const preset = character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()
  if (!preset || !preset.baseUrl) return null
  return preset
}

export function parseGameBlock(raw: string): Record<string, unknown> | null {
  const matches = [...raw.matchAll(/```game\s*([\s\S]*?)```/g)]
  if (matches.length === 0) return null
  const body = matches[matches.length - 1][1].trim()
  try {
    const obj = JSON.parse(body)
    return typeof obj === 'object' && obj !== null ? (obj as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const TRPG_PROTOCOL = `【回复格式（必须严格遵守）】
先输出叙述正文（2-5 段，用你的性格和口吻讲述，画面感强，允许对玩家说话）。
正文之后必须输出一个 game 代码块同步状态：
\`\`\`game
{"act":"当前幕名","scene":"当前场景一句话","hp":8,"items":["道具1"],"flags":{},"progress":25}
\`\`\`
progress 为冒险进度 0-100，到达 100 时请在正文里写出结局；hp 归 0 时写出失败结局。
骰子判定：玩家行动的成败以系统给出的骰点为准（1-20，≥11 成功），你负责把成败编织进叙述，可以解释成技巧、运气或意外。`

const TURTLE_PROTOCOL = `【回复格式（必须严格遵守）】
你负责主持海龟汤：出题、判定提问、控制节奏，用你的性格和口吻说话。
判定玩家提问时，正文先以「是」「不是」「无关」「接近了」开头（配合一句角色口吻的短评），然后输出状态块：
\`\`\`game
{"verdict":"yes|no|irrelevant|close","solved":false,"revealed":null}
\`\`\`
当玩家完整还原真相时，solved 置 true、revealed 填写汤底全文，并在正文里揭晓真相。
出题开局时输出：
\`\`\`game
{"puzzle":"汤面（表面故事，1-3 句）","truth":"汤底（完整真相，逻辑自洽可推理）"}
\`\`\`
汤面绝不能泄露汤底关键词；汤底要有反转但必须能被问出来。`

function logContext(session: GameSession): string {
  const recent = session.log.slice(-8)
  if (recent.length === 0) return '（开局）'
  return recent
    .map((l) => `${l.who === 'player' ? '玩家' : '主持人'}：${l.text}`)
    .join('\n')
}

async function callLLM(preset: ApiPreset, messages: ChatApiMessage[]): Promise<string> {
  return streamChat(preset, messages, { onDelta: () => {} })
}

export interface StartGameConfig {
  world?: string
  role?: string
  difficulty?: 'easy' | 'normal' | 'hard'
  theme?: string
}

export async function startGame(
  session: GameSession,
  character: Character,
  config: StartGameConfig
): Promise<{ narrative: string; offline: boolean }> {
  const preset = resolveGamePreset(character)
  const offline = !preset
  const patch: Partial<TrpgState> & Partial<TurtleState> = {}

  if (session.type === 'trpg') {
    const base = trpgPresets.find((p) => p.name === config.world) ?? null
    const world = config.world || base?.world || '一个未知的世界'
    patch.world = world
    patch.role = config.role || base?.role || '一名旅人'
    patch.act = '第一章'
    patch.scene = '起点'
    patch.hp = 10
    patch.items = base?.items ?? []
    patch.flags = {}
    patch.progress = 0
  } else {
    patch.difficulty = config.difficulty ?? 'normal'
  }
  useGames.getState().patchState(session.id, patch)
  const fresh = useGames.getState().games.find((g) => g.id === session.id) ?? session

  if (offline) {
    let narrative: string
    if (session.type === 'trpg') {
      const st = fresh.trpg as TrpgState
      narrative = `（离线模式）冒险开始。\n世界：${st.world}\n身份：${st.role}\n\n你在「${st.scene}」睁开了眼睛，行囊里装着${st.items.join('、') || '无几样东西'}。\n${pickOpeningOffline()}`
    } else {
      const t = FALLBACK_TURTLES[Math.floor(Math.random() * FALLBACK_TURTLES.length)]
      useGames.getState().patchState(session.id, { puzzle: t.puzzle, truth: t.truth })
      narrative = `（离线模式）好，我出一个谜题，你来还原真相。\n\n【汤面】\n${t.puzzle}\n\n可以随便问我「是 / 不是 / 无关」能回答的问题，觉得想通了就把真相讲给我听。`
    }
    useGames.getState().pushLog(session.id, 'gm', narrative.slice(0, 120))
    return { narrative, offline: true }
  }

  const system = [buildCharacterPrompt(character), '', session.type === 'trpg' ? TRPG_PROTOCOL : TURTLE_PROTOCOL].join('\n')
  let userMsg: string
  if (session.type === 'trpg') {
    userMsg = `【游戏开局设定】\n世界观：${fresh.trpg?.world}\n玩家身份：${fresh.trpg?.role}\n\n请你以主持人（DM）身份开场：描绘玩家醒来的第一个场景、交代世界的危机感，并给出第一个可选的行动方向。按协议输出叙述与 game 块。`
  } else {
    const diffLabel = fresh.turtle?.difficulty === 'hard' ? '烧脑（需要多层反转）' : fresh.turtle?.difficulty === 'easy' ? '简单（单层因果）' : '普通'
    userMsg = `【海龟汤开局】\n难度：${diffLabel}${config.theme ? `\n主题偏好：${config.theme}` : ''}\n\n请你出一道全新的海龟汤谜题（禁止使用经典原题），按协议输出汤面介绍与 game 块（含 puzzle 与 truth）。`
  }

  const raw = await callLLM(preset, [
    { role: 'system', content: system },
    { role: 'user', content: userMsg },
  ])
  const block = parseGameBlock(raw)
  const narrative = stripGameBlock(raw)
  if (block) {
    if (session.type === 'trpg') {
      useGames.getState().patchState(session.id, {
        act: strOr(block.act, fresh.trpg?.act ?? '第一章'),
        scene: strOr(block.scene, fresh.trpg?.scene ?? '起点'),
      })
    } else {
      const puzzle = strOr(block.puzzle, '')
      const truth = strOr(block.truth, '')
      if (puzzle && truth) useGames.getState().patchState(session.id, { puzzle, truth })
      else throw new Error('开局数据不完整，请重试')
    }
  } else if (session.type === 'turtle') {
    throw new Error('开局数据不完整，请重试')
  }
  useGames.getState().pushLog(session.id, 'gm', narrative.slice(0, 120))
  return { narrative, offline: false }
}

function pickOpeningOffline(): string {
  const lines = [
    '风从北边吹来，带着一股焦糊味。你攥紧了行囊，路的尽头传来几声犬吠。',
    '四周安静得反常，只有你自己的脚步声。前方的岔路口立着一块歪斜的木牌。',
    '你听到远处有人争吵，声音时断时续。天色不早了，你得尽快决定去向。',
  ]
  return lines[Math.floor(Math.random() * lines.length)]
}

function strOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function stripGameBlock(raw: string): string {
  return raw.replace(/```game\s*[\s\S]*?```/g, '').trim()
}

export async function handleGameTurn(
  session: GameSession,
  character: Character,
  userText: string
): Promise<{ narrative: string; ended?: string }> {
  useGames.getState().pushLog(session.id, 'player', userText.slice(0, 120))
  const st = useGames.getState().games.find((g) => g.id === session.id) ?? session
  const snapshot = JSON.stringify({ trpg: st.trpg, turtle: st.turtle })
  const preset = resolveGamePreset(character)

  if (!preset) {
    if (session.type === 'trpg') {
      const { narrative, patch } = localTurn(st, userText)
      useGames.getState().patchState(session.id, patch)
      useGames.getState().pushLog(session.id, 'gm', narrative.slice(0, 120))
      const progress = (patch.progress ?? 0) >= 100
      const dead = (patch.hp ?? 10) <= 0
      const ended = progress ? '冒险抵达了终点。' : dead ? '冒险失败，你倒在了半途。' : undefined
      if (ended) useGames.getState().endGame(session.id, ended)
      return { narrative, ended }
    }
    const { narrative, patch, solved } = localTurtleTurn(st, userText)
    useGames.getState().patchState(session.id, patch)
    useGames.getState().pushLog(session.id, 'gm', narrative.slice(0, 120))
    if (solved) {
      const ended = '真相揭晓，你猜对了。'
      useGames.getState().endGame(session.id, ended)
      return { narrative: narrative + `\n\n【汤底】\n${st.turtle?.truth}`, ended }
    }
    return { narrative }
  }

  const system = [buildCharacterPrompt(character), '', session.type === 'trpg' ? TRPG_PROTOCOL : TURTLE_PROTOCOL].join('\n')
  const stateJson =
    session.type === 'trpg'
      ? JSON.stringify({ ...st.trpg, dice: roll20(), diceTarget: 11 })
      : JSON.stringify({ ...st.turtle, truth: undefined })
  const userMsg = `【当前游戏状态】\n${stateJson}\n\n【最近事件】\n${logContext(st)}\n\n【玩家输入】\n${userText}\n\n请按协议推进：叙述 + game 块。${session.type === 'trpg' ? '骰点已给出，成败以骰点为准。' : '先判断这条输入是「提问」还是「猜真相」。'}`

  let raw: string
  try {
    raw = await callLLM(preset, [
      { role: 'system', content: system },
      { role: 'user', content: userMsg },
    ])
  } catch (e) {
    const snap = JSON.parse(snapshot)
    useGames.getState().patchState(session.id, session.type === 'trpg' ? (snap.trpg ?? {}) : (snap.turtle ?? {}))
    throw e
  }

  const block = parseGameBlock(raw)
  const narrative = stripGameBlock(raw)
  let ended: string | undefined
  if (block) {
    if (session.type === 'trpg' && st.trpg) {
      const prev = st.trpg
      const nextHp = clampInt(block.hp, 0, 10, prev.hp)
      const nextProgress = clampInt(block.progress, 0, 100, prev.progress)
      const items = Array.isArray(block.items) ? (block.items as unknown[]).filter((x) => typeof x === 'string').slice(0, 12) : prev.items
      const flags = typeof block.flags === 'object' && block.flags !== null ? (block.flags as Record<string, boolean>) : prev.flags
      useGames.getState().patchState(session.id, {
        act: strOr(block.act, prev.act),
        scene: strOr(block.scene, prev.scene),
        hp: nextHp,
        items: items as string[],
        flags,
        progress: nextProgress,
      })
      if (nextProgress >= 100) ended = '冒险抵达了终点。'
      else if (nextHp <= 0) ended = '冒险失败，你倒在了半途。'
    } else if (session.type === 'turtle' && st.turtle) {
      const verdict = ['yes', 'no', 'irrelevant', 'close'].includes(String(block.verdict)) ? (block.verdict as TurtleState['qa'][number]['verdict']) : 'irrelevant'
      useGames.getState().patchState(session.id, {
        qa: [...st.turtle.qa, { q: userText, verdict, at: Date.now() }].slice(-30),
        solved: block.solved === true,
        revealed: typeof block.revealed === 'string' ? block.revealed : st.turtle.revealed,
      })
      if (block.solved === true) ended = '真相揭晓，你猜对了。'
    }
  }
  useGames.getState().pushLog(session.id, 'gm', narrative.slice(0, 120))
  if (ended) useGames.getState().endGame(session.id, ended)
  return { narrative, ended }
}

export async function handleGameHint(session: GameSession, character: Character): Promise<string> {
  const st = useGames.getState().games.find((g) => g.id === session.id) ?? session
  if (session.type === 'turtle' && st.turtle && st.turtle.hints >= 3) {
    return '提示已经用完了，接下来只能靠你自己。'
  }
  useGames.getState().patchState(session.id, { hints: (st.turtle?.hints ?? 0) + 1 })
  const preset = resolveGamePreset(character)
  if (!preset || session.type !== 'turtle' || !st.turtle) {
    const truth = st.turtle?.truth ?? ''
    return `（离线模式）提示：${truth.slice(0, Math.min(14, truth.length))}……方向就在这几个字里。`
  }
  const system = [buildCharacterPrompt(character), '', TURTLE_PROTOCOL].join('\n')
  const userMsg = `【当前汤面】\n${st.turtle.puzzle}\n\n【已提问】\n${st.turtle.qa.map((x) => `${x.q} → ${x.verdict}`).join('\n') || '（暂无）'}\n\n玩家请求一条提示。请在正文里给出一条逐步逼近真相的提示（禁止直接说出汤底核心），无需输出 game 块。`
  const raw = await callLLM(preset, [
    { role: 'system', content: system },
    { role: 'user', content: userMsg },
  ])
  return stripGameBlock(raw) || raw
}
