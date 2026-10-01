import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChainMode = 'global' | 'role'
export type ChainInjectPos = 'system' | 'preset' | 'perTurn'
export type OutputPartKey = 'header' | 'story' | 'status' | 'memory' | 'divider'
export type CheckStrength = 'low' | 'mid' | 'high'

export interface OutputPart {
  key: OutputPartKey
  label: string
  hint: string
  enabled: boolean
}

export interface ChainTemplate {
  name: string
  content: string
}

export interface SummaryItem {
  id: string
  characterId: string
  kind: 'small' | 'big'
  content: string
  time: number
}

export interface SelfCheckLogItem {
  time: number
  characterId: string
  items: string[]
}

interface RuntimeRulesState {
  chainEnabled: boolean
  chainMode: ChainMode
  customChain: string
  roleChains: Record<string, string>
  chainInjectPos: ChainInjectPos
  chainTemplates: ChainTemplate[]

  outputParts: OutputPart[]
  outputTemplate: string
  endMarker: string

  checkWorldbook: boolean
  checkPersona: boolean
  checkFormat: boolean
  selfCheckLogs: SelfCheckLogItem[]

  firewallNoRepeat: boolean
  firewallNoReAsk: boolean
  firewallNoContradict: boolean
  firewallAnswerPending: boolean
  customRules: string
  antiHallucination: CheckStrength

  timeAware: boolean
  timeSyncSystem: boolean
  customTime: string

  summaryEveryNRounds: number
  bigSummaryTrigger: number
  summaries: SummaryItem[]

  maxReplyLength: number
  temperature: number | null
  contextCountOverride: number

  set: (patch: Partial<RuntimeRulesState>) => void
  setOutputPart: (key: OutputPartKey, enabled: boolean) => void
  moveOutputPart: (key: OutputPartKey, dir: -1 | 1) => void
  saveRoleChain: (characterId: string, text: string) => void
  clearRoleChain: (characterId: string) => void
  resetChain: () => void
  addSummary: (characterId: string, kind: 'small' | 'big', content: string) => void
  updateSummary: (id: string, content: string) => void
  removeSummary: (id: string) => void
  pushSelfCheckLog: (characterId: string, items: string[]) => void
  clearSelfCheckLogs: () => void
  cleanupCharacter: (characterId: string) => void
}

export const BUILTIN_CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    name: '强制自检世界书',
    content:
      '【强制自检·世界书】回复前逐条确认：本次剧情涉及的世界观、地点、人物档案、物品设定是否都已读取？若剧情触及世界书内容，必须严格遵循世界书设定，禁止编造与之冲突的细节。',
  },
  {
    name: '格式自检',
    content:
      '【强制自检·格式】输出前检查：是否严格按照系统规定的输出结构组织内容？每一栏是否齐全、顺序是否正确？结尾自查标记是否输出？格式错误则重新组织后再输出。',
  },
  {
    name: '人设一致性检查',
    content:
      '【强制自检·人设】回复前自查：这句话是否符合我的性格核心、沟通风格与当前心情？是否说出了人设禁止说的话？是否擅自替用户做决定或代写用户的心理与台词？发现偏差立即修正。',
  },
  {
    name: 'BEFORE-REPLY 行为准则',
    content:
      '【BEFORE-REPLY】回复之前依次确认：1. 我是否在重复刚才说过的话？2. 我是否在问用户已经回答过的问题？3. 我是否推翻了之前已确认的事实？4. 用户上一条消息里的每个问题是否都有着落？全部通过后再输出。',
  },
]

const DEFAULT_OUTPUT_PARTS: OutputPart[] = [
  { key: 'header', label: '时间地点天气栏', hint: '如「22:14 · 深秋雨夜 · 宿舍阳台」，单独一行', enabled: true },
  { key: 'story', label: '剧情正文', hint: '本回剧情与对话主体', enabled: true },
  { key: 'status', label: '状态栏', hint: '角色当前心情/好感/位置等状态简报', enabled: true },
  { key: 'memory', label: '记忆区', hint: '角色对最近剧情的内心记忆点', enabled: false },
  { key: 'divider', label: '分割线', hint: '各栏之间用「———」分隔', enabled: true },
]

export const FIREWALL_TEXT: Record<string, string> = {
  firewallNoRepeat:
    'NO-REPEAT（拒绝车轱辘话）：禁止换着说法重复自己刚表达过的意思，每轮必须推进新的内容或情绪。',
  firewallNoReAsk: 'NO-RE-ASK（已答不复问）：用户已回答过的问题禁止再问第二遍；不确定时基于已有信息合理行动。',
  firewallNoContradict:
    'NO-CONTRADICT（拒绝吃书反转）：已确认的事实、关系、时间线不可无故推翻或反转；新设定必须与旧设定兼容。',
  firewallAnswerPending: 'ANSWER-PENDING（有问必答）：用户提出的每一个明确问题都必须给出回应，可以角色化地回应，但不可无视。',
}

export const useRuntimeRules = create<RuntimeRulesState>()(
  persist(
    (set) => ({
      chainEnabled: false,
      chainMode: 'global',
      customChain: '',
      roleChains: {},
      chainInjectPos: 'system',
      chainTemplates: BUILTIN_CHAIN_TEMPLATES,

      outputParts: DEFAULT_OUTPUT_PARTS,
      outputTemplate: '',
      endMarker: '',

      checkWorldbook: false,
      checkPersona: false,
      checkFormat: false,
      selfCheckLogs: [],

      firewallNoRepeat: false,
      firewallNoReAsk: false,
      firewallNoContradict: false,
      firewallAnswerPending: false,
      customRules: '',
      antiHallucination: 'mid',

      timeAware: true,
      timeSyncSystem: true,
      customTime: '',

      summaryEveryNRounds: 0,
      bigSummaryTrigger: 0,
      summaries: [],

      maxReplyLength: 0,
      temperature: null,
      contextCountOverride: 0,

      set: (patch) => set(patch),
      setOutputPart: (key, enabled) =>
        set((s) => ({ outputParts: s.outputParts.map((p) => (p.key === key ? { ...p, enabled } : p)) })),
      moveOutputPart: (key, dir) =>
        set((s) => {
          const idx = s.outputParts.findIndex((p) => p.key === key)
          const next = idx + dir
          if (idx < 0 || next < 0 || next >= s.outputParts.length) return {}
          const parts = [...s.outputParts]
          ;[parts[idx], parts[next]] = [parts[next], parts[idx]]
          return { outputParts: parts }
        }),
      saveRoleChain: (characterId, text) =>
        set((s) => ({ roleChains: { ...s.roleChains, [characterId]: text } })),
      clearRoleChain: (characterId) =>
        set((s) => {
          const next = { ...s.roleChains }
          delete next[characterId]
          return { roleChains: next }
        }),
      resetChain: () => set({ customChain: '', roleChains: {}, chainEnabled: false }),
      addSummary: (characterId, kind, content) =>
        set((s) => ({
          summaries: [
            { id: `sm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, characterId, kind, content, time: Date.now() },
            ...s.summaries,
          ],
        })),
      updateSummary: (id, content) =>
        set((s) => ({ summaries: s.summaries.map((m) => (m.id === id ? { ...m, content } : m)) })),
      removeSummary: (id) => set((s) => ({ summaries: s.summaries.filter((m) => m.id !== id) })),
      pushSelfCheckLog: (characterId, items) =>
        set((s) => ({ selfCheckLogs: [{ time: Date.now(), characterId, items }, ...s.selfCheckLogs].slice(0, 50) })),
      clearSelfCheckLogs: () => set({ selfCheckLogs: [] }),
      cleanupCharacter: (characterId) =>
        set((s) => {
          const roleChains = { ...s.roleChains }
          delete roleChains[characterId]
          return {
            roleChains,
            summaries: s.summaries.filter((m) => m.characterId !== characterId),
            selfCheckLogs: s.selfCheckLogs.filter((l) => l.characterId !== characterId),
          }
        }),
    }),
    { name: 'ksc:runtimeRules' }
  )
)
