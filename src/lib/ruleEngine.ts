import { useWorldRules, sortedRules, type WorldRule } from '../store/worldRules'

export type RuleEventType = 'message' | 'call' | 'behavior'

export interface RuleEvent {
  type: RuleEventType
  characterId?: string
  characterName?: string
  /** 待检测文本（短信内容 / 通话主题等） */
  text?: string
}

export type RuleCategory = 'person' | 'spam' | 'system' | 'service' | 'explosive'

export interface RuleDirectives {
  /** 命中的规制（已按优先级排序） */
  rules: WorldRule[]
  appliedNames: string[]
  /** 概率覆盖：0-1 的权重覆盖值 */
  probabilityOverrides: Partial<Record<RuleCategory, number>>
  /** 被拦截（概率置 0）的类别 */
  blocked: RuleCategory[]
}

const EVENT_TOKENS: Record<string, RuleEventType> = {
  消息: 'message',
  短信: 'message',
  聊天: 'message',
  发消息: 'message',
  来电: 'call',
  电话: 'call',
  通话: 'call',
  行为: 'behavior',
  决策: 'behavior',
  行动: 'behavior',
}

const CATEGORY_TOKENS: Record<string, RuleCategory> = {
  炸裂: 'explosive',
  骚扰: 'spam',
  垃圾: 'spam',
  垃圾短信: 'spam',
  系统: 'system',
  服务: 'service',
  真人: 'person',
  短信: 'person',
}

/** 判断单条规制是否命中事件 */
function ruleMatches(rule: WorldRule, event: RuleEvent): boolean {
  const cond = rule.triggerCondition.trim()
  if (!cond) return true // 留空 = 全局
  const tokens = cond.split(/[\s,，;；、\n]+/).map((t) => t.trim()).filter(Boolean)
  if (tokens.length === 0) return true
  const text = event.text ?? ''
  for (const token of tokens) {
    const bare = token.replace(/^事件[:：]/, '')
    const mapped = EVENT_TOKENS[bare]
    if (mapped) {
      if (mapped === event.type) return true
      continue
    }
    if (event.characterName && (event.characterName === token || event.characterName.includes(token))) return true
    if (text && text.includes(token)) return true
  }
  return false
}

/** 取出当前事件命中的启用规制，按优先级 / 更新时间降序 */
export function matchRules(event: RuleEvent): WorldRule[] {
  const enabled = useWorldRules.getState().rules.filter((r) => r.isEnabled)
  return sortedRules(enabled.filter((r) => ruleMatches(r, event)))
}

/** 解析规制内容里的概率指令，得到权重覆盖与被拦截类别 */
export function buildDirectives(rules: WorldRule[]): RuleDirectives {
  const overrides: Partial<Record<RuleCategory, number>> = {}
  const blocked: RuleCategory[] = []
  for (const r of rules) {
    const content = r.ruleContent
    // 概率覆盖：如「炸裂=15%」或「骚扰:0%」
    const re = /(炸裂|骚扰|垃圾|系统|服务|真人|短信)\s*[=:：]\s*(\d+)\s*%?/g
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const cat = CATEGORY_TOKENS[m[1]]
      if (!cat) continue
      const pct = Math.max(0, Math.min(100, Number(m[2])))
      overrides[cat] = pct / 100
      if (pct === 0 && !blocked.includes(cat)) blocked.push(cat)
    }
    // 拦截指令：如「拦截骚扰」
    const reBlock = /拦截\s*(炸裂|骚扰|垃圾|系统|服务)/g
    while ((m = reBlock.exec(content)) !== null) {
      const cat = CATEGORY_TOKENS[m[1]]
      if (!cat) continue
      overrides[cat] = 0
      if (!blocked.includes(cat)) blocked.push(cat)
    }
  }
  return { rules, appliedNames: rules.map((r) => r.name), probabilityOverrides: overrides, blocked }
}

/** 一步获取命中的规制及可用指令 */
export function collectRules(event: RuleEvent): RuleDirectives {
  return buildDirectives(matchRules(event))
}

/** 从命中的规制里提取用户自定义的炸裂内容池（名称或触发条件含「炸裂」时的规则内容行） */
export function explosivePoolFromRules(rules: WorldRule[]): string[] {
  const out: string[] = []
  for (const r of rules) {
    if (!/炸裂/.test(r.name + r.triggerCondition)) continue
    for (const line of r.ruleContent.split('\n')) {
      const t = line.trim()
      if (t.length >= 4 && t.length <= 80) out.push(t)
    }
  }
  return out
}