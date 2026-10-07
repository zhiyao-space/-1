import { useCharacters, type Character } from '../store/characters'
import { useMinds } from '../store/interact'
import type { CallDraft, CallType } from '../store/calls'
import { deriveTone, isNight, tagOf } from './smsEngine'
import { collectRules } from './ruleEngine'

export interface CallScript {
  topic: string
  lines: string[]
  summary: string
  appliedRules: string[]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 角色来电/去电对话脚本：按人设语气生成 */
export function buildCallScript(c: Character): CallScript {
  const tone = deriveTone(c)
  const night = isNight()
  const directives = collectRules({ type: 'call', characterId: c.id, characterName: c.name })

  const topics = night
    ? ['深夜的失眠', '最近的烦心事', '突然的想念']
    : ['今天的日常', '最近的状态', '想约你见面', '一件小事']
  const topic = pick(topics)

  const openers =
    tone === 'cold'
      ? ['喂。', '在吗。', '嗯，是我。']
      : tone === 'warm'
        ? ['喂～是我呀！', '在忙吗？想跟你说个事～', '好久没听到你声音了！']
        : tone === 'classic'
          ? ['喂，是我。', '别来无恙？', '有件事，想同君说。']
          : tone === 'tsundere'
            ? ['喂……不是特意打给你的。', '在吗，随便问问。']
            : tone === 'clingy'
              ? ['喂～你终于接了', '在干嘛呀，想你了']
              : ['喂，是我。', '在忙吗？']

  const middles =
    night
      ? ['睡不着，翻来覆去的', '白天的事一直堵在心里', '就想听听你的声音']
      : ['今天遇到点事，想跟你说说', '没什么大事，就是想你了', '问你个事儿，别嫌我烦']

  const closers =
    tone === 'cold'
      ? ['……就这样吧。', '没事了，挂了。']
      : tone === 'warm'
        ? ['好啦，听你说完我放心多了！', '那说定啦，回头见～']
        : tone === 'classic'
          ? ['如此，便好。', '夜深了，早些歇息。']
          : tone === 'tsundere'
            ? ['……我才没有很开心。', '行了行了，挂了啊。']
            : tone === 'clingy'
              ? ['那你早点休息嘛，别熬夜', '再陪你聊一会儿好不好']
              : ['那就这样，回头聊。', '好，你也早点休息。']

  const lines = [pick(openers), pick(middles), pick(closers)]
  const toneWord =
    tone === 'cold' ? '语气淡淡的' : tone === 'warm' ? '聊得很热络' : tone === 'classic' ? '语气斯文' : tone === 'tsundere' ? '嘴上不饶人' : tone === 'clingy' ? '黏着不肯挂' : '有一搭没一搭'
  const summary = `围绕「${topic}」${toneWord}，聊了约几件事。`

  return { topic, lines, summary, appliedRules: directives.appliedNames }
}

const UNKNOWN: { from: string; kind: string; answerable: boolean; lines: string[]; summary: string }[] = [
  {
    from: '房产中介',
    kind: '推销',
    answerable: true,
    lines: ['您好，请问是机主本人吗？', '这边有个新开盘的楼盘，均价很合适……', '好的，那就不打扰了，祝您生活愉快。'],
    summary: '房产推销来电，介绍了新楼盘，已婉拒。',
  },
  {
    from: '外卖骑手',
    kind: '服务',
    answerable: true,
    lines: ['您好，您的外卖到了，在楼下门口。', '放门口还是等您下来？', '好嘞，那我先放前台了。'],
    summary: '外卖来电，告知餐品已送达前台。',
  },
  {
    from: '未知号码',
    kind: '诈骗',
    answerable: true,
    lines: ['您好，这里是XX客服中心。', '您的账户存在异常，需要您配合核实身份信息。', '（对方语速很快，催促你提供验证码）'],
    summary: '疑似诈骗电话，自称客服索要验证码，已挂断。',
  },
  {
    from: '未知号码',
    kind: '骚扰',
    answerable: false,
    lines: [],
    summary: '无声来电，接通后无人应答即挂断。',
  },
  {
    from: '400-***-1234',
    kind: '推销',
    answerable: true,
    lines: ['您好，请问是目前使用该号码的用户吗？', '我们最近有个回馈活动想邀请您参加……'],
    summary: '400 开头的推销来电，邀请参加活动，已拒绝。',
  },
]

/** 角色接听概率：与好感度正相关、与低落情绪负相关 */
export function answerChance(c: Character): number {
  const mind = useMinds.getState().minds[c.id]
  const affection = mind?.affection ?? 20
  const mood = mind?.mood ?? 50
  return Math.max(0.25, Math.min(0.95, 0.4 + (affection / 100) * 0.5 + ((mood - 50) / 200)))
}

/** 生成一条陌生来电记录 */
function unknownRecord(callType: CallType): CallDraft {
  const u = pick(UNKNOWN)
  const answered = callType === 'incoming' && u.answerable
  const script = u.lines.length > 0 ? buildUnknownScript(u.lines) : null
  return {
    callerId: `unknown_${u.from}`,
    receiverId: 'me',
    callerName: u.from,
    callerAvatar: null,
    relationshipTag: u.kind,
    timestamp: Date.now(),
    duration: answered ? 20 + Math.floor(Math.random() * 120) : 0,
    callType,
    summary: callType === 'missed' ? `未接来电（${u.kind}）：${u.summary}` : u.summary,
    isUnknown: true,
    isRead: false,
  }
}

function buildUnknownScript(lines: string[]): string[] {
  return lines
}

/**
 * 生成一批来电记录（1-2 条）：角色来电按好感度权重，少量陌生来电
 * 2% 极低概率触发炸裂来电（内容可由世界书规制定义）
 */
export function generateCallBatch(): CallDraft[] {
  const chars = useCharacters.getState().characters
  const directives = collectRules({ type: 'call' })
  const explosivePool =
    directives.rules.flatMap((r) => (/炸裂/.test(r.name + r.triggerCondition) ? r.ruleContent.split('\n') : [])).map((s) => s.trim()).filter((s) => s.length >= 4 && s.length <= 80)
  const explosiveAllowed = !(directives.probabilityOverrides.explosive === 0)

  const count = 1 + (Math.random() < 0.4 ? 1 : 0)
  const out: CallDraft[] = []
  for (let i = 0; i < count; i += 1) {
    // 炸裂来电：极低概率（2%）
    if (explosiveAllowed && explosivePool.length > 0 && Math.random() < 0.02) {
      const content = pick(explosivePool)
      const c = chars.length > 0 ? pick(chars) : null
      out.push({
        callerId: c?.id ?? 'unknown_explosive',
        receiverId: 'me',
        callerName: c?.name ?? '未知号码',
        callerAvatar: c?.avatarId ?? null,
        relationshipTag: c ? tagOf(c) : '未知',
        timestamp: Date.now(),
        duration: 0,
        callType: 'missed',
        summary: content,
        isUnknown: !c,
        isRead: false,
      })
      continue
    }

    // 30% 陌生来电
    if (chars.length === 0 || Math.random() < 0.3) {
      out.push(unknownRecord(Math.random() < 0.7 ? 'missed' : 'incoming'))
      continue
    }

    const c = chars[Math.floor(Math.random() * chars.length)]
    const answered = Math.random() < answerChance(c)
    if (!answered) {
      out.push({
        callerId: c.id,
        receiverId: 'me',
        callerName: c.name,
        callerAvatar: c.avatarId,
        relationshipTag: tagOf(c),
        timestamp: Date.now(),
        duration: 0,
        callType: 'missed',
        summary: `${c.name} 的未接来电`,
        isUnknown: false,
        isRead: false,
      })
    } else {
      const script = buildCallScript(c)
      out.push({
        callerId: c.id,
        receiverId: 'me',
        callerName: c.name,
        callerAvatar: c.avatarId,
        relationshipTag: tagOf(c),
        timestamp: Date.now(),
        duration: 30 + Math.floor(Math.random() * 240),
        callType: 'incoming',
        summary: script.summary,
        isUnknown: false,
        isRead: false,
      })
    }
  }
  return out
}

export { UNKNOWN }