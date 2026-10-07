import { useCharacters, type Character } from '../store/characters'
import { useMinds } from '../store/interact'
import { useSettings } from '../store/settings'
import { useSchedule, currentActivity } from '../store/schedule'
import { displayUserName } from '../store/profile'
import type { SmsDraft, SmsType } from '../store/sms'
import { collectRules, explosivePoolFromRules, type RuleDirectives } from './ruleEngine'

type Tone = 'cold' | 'warm' | 'classic' | 'tsundere' | 'clingy' | 'normal'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function userName(): string {
  return displayUserName(useSettings.getState().phoneName || '我')
}

function fill(text: string): string {
  return text.replace(/\{user\}/g, userName())
}

/** 根据角色「性格 / 沟通风格」推导语气，用于生成个性化消息 */
export function deriveTone(c: Character): Tone {
  const s = `${c.personality} ${c.commStyle}`
  if (/古风|文言|诗|文雅|儒|公子|阁下/.test(s)) return 'classic'
  if (/毒舌|傲娇|嘴硬|别扭|别扭/.test(s)) return 'tsundere'
  if (/黏人|撒娇|依赖|粘人|黏/.test(s)) return 'clingy'
  if (/冷淡|高冷|寡言|沉默|话少|疏离|清冷/.test(s)) return 'cold'
  if (/热情|活泼|开朗|话痨|健谈|外向|元气/.test(s)) return 'warm'
  return 'normal'
}

function flavor(text: string, tone: Tone): string {
  switch (tone) {
    case 'cold':
      return text.replace(/[~～!！。.]+$/g, '')
    case 'warm':
      return /[~～!！?？]$/.test(text) ? text : `${text}～`
    case 'classic':
      return `${text.replace(/你/g, '君').replace(/我/g, '吾')}。`
    case 'tsundere':
      return `${text}…哼。`
    case 'clingy':
      return `${text}嘛～`
    default:
      return text
  }
}

function activityOf(characterId: string): string {
  const { routines, items, autoDays } = useSchedule.getState()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const auto = autoDays[`${characterId}_${today}`]
  return currentActivity(characterId, routines, items, now, auto?.items).label
}

export function tagOf(c: Character): string {
  return c.identity.trim() || '好友'
}

const DAILY = [
  '在干嘛',
  '吃了吗',
  '刚醒 头还是疼的',
  '今天好累啊',
  '外面下雨了',
  '睡了没',
  '突然想起你',
  '在忙吗 回个话',
  '无聊死了',
  '这周有空吗',
]
const SHARE = [
  '刚听到一首歌 想到你了',
  '给你看个东西 [图片]',
  '这个视频笑死我了 [链接]',
  '路过你说的那家店 拍给你看 [图片]',
  '刷到个帖子 好像你会喜欢',
]
const ASK = ['在干嘛呢', '忙吗', '晚上有事吗', '今天怎么没回我', '你是不是在忙']
const EMO = [
  '今天好烦',
  '没什么 就是有点低落',
  '有点想哭 但说不清为什么',
  '别管我 我缓缓就好',
  '最近越来越提不起劲了',
]
const JEALOUS = [
  '你昨天跟谁出去的',
  '看不出来你人缘挺好啊',
  '算了 当我没问',
  '你那个朋友是谁',
  '哦 你忙你的吧',
]
const SHORT = ['嗯', '哦', '行', '好', '知道了', '……']
const ABSTRACT = ['asdfghjkl', '哈哈哈哈哈哈哈哈', '？？？', '啊啊啊啊', '在的', '不知道 反正']
const RECALL = ['（对方撤回了一条消息）']
const NIGHT = ['睡了吗…', '又失眠了', '这个点还没睡的人 大概都不太开心吧', '突然很想找个人说话', '白天装得太累了']
const ACTIVITY = ['还在{activity} 有点无聊', '刚从{activity}下来 好累', '正在{activity} 待会儿找你', '今天一整天都在{activity}']

const SPAM: { from: string; content: string }[] = [
  { from: '955**', content: '【XX银行】您的账户异常，请点击 t.cn/kh2f 验证身份，逾期将冻结' },
  { from: '106****8888', content: '尊敬的用户，您已获得 ￥88888 元大奖，回复 1 领取，过期作废' },
  { from: '未知号码', content: '您有一份快递因地址不详被退回，请联系 400-xxx-xxxx 处理' },
  { from: '活动中心', content: '【中奖通知】恭喜您被抽中 iPhone 一部，点击链接填写收货信息' },
  { from: '贷款专员', content: '低息贷款，秒批秒到，额度最高 50 万，回复 TD 退订' },
  { from: '积分商城', content: '【积分提醒】您的积分即将过期，点击兑换精美礼品' },
  { from: '兼职招聘', content: '兼职刷单日入过千，加 V 详聊，学生党优先' },
]

const SYSTEM: { from: string; content: string }[] = [
  { from: '系统服务中心', content: '【系统】存储空间不足，请及时清理缓存' },
  { from: '系统服务中心', content: '【系统】系统更新已完成，本次优化了运行性能' },
  { from: '系统服务中心', content: '【电量提醒】电量低于 20%，建议尽快充电' },
  { from: '系统服务中心', content: '【日历】15:00 有日程提醒：会议' },
  { from: '系统服务中心', content: '【安全中心】检测到新设备登录，如非本人操作请修改密码' },
  { from: '系统服务中心', content: '【流量提醒】本月流量已使用 90%' },
]

const SERVICE: { from: string; content: string }[] = [
  { from: '丰巢速递', content: '【快递】您的快递已到达丰巢，取件码 8-2-3-1' },
  { from: '外卖平台', content: '【外卖】您的外卖已送达，感谢下单，期待再次光临' },
  { from: '支付助手', content: '【支付】您有一笔 ￥28.00 的扣款成功' },
  { from: '通讯录', content: '【好友申请】"小雨" 请求添加你为好友' },
  { from: '群聊通知', content: '【群聊】您已被拉入群聊"周末聚餐"' },
  { from: '订单中心', content: '【订单】您的订单已发货，预计明日送达' },
  { from: '验证码', content: '【验证码】您的验证码是 863629，5 分钟内有效。请勿泄露' },
]

const EXPLOSIVE = [
  '其实那天我没有走',
  '你还记得三年前那个雨夜吗',
  '我一直在骗你，从第一天开始',
  '来天台，现在，别问为什么',
  '如果我消失了，你会找我吗',
  '别信你身边那个人',
]

/** 角色权重：好感度越高越可能发消息 */
function weightedCharacter(characters: Character[]): Character | null {
  if (characters.length === 0) return null
  const minds = useMinds.getState()
  const weights = characters.map((c) => Math.max(1, (minds.minds[c.id]?.affection ?? 20) + 10))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < characters.length; i += 1) {
    r -= weights[i]
    if (r <= 0) return characters[i]
  }
  return characters[characters.length - 1]
}

function buildPersonContent(c: Character, night: boolean): string {
  const tone = deriveTone(c)
  const roll = Math.random()
  if (night && Math.random() < 0.6) return flavor(fill(pick(NIGHT)), tone)
  if (roll < 0.22) return flavor(fill(pick(DAILY)), tone)
  if (roll < 0.42) return flavor(fill(pick(ACTIVITY)).replace('{activity}', activityOf(c.id)), tone)
  if (roll < 0.58) return flavor(fill(pick(ASK)), tone)
  if (roll < 0.7) return flavor(fill(pick(SHARE)), tone)
  if (roll < 0.82) return flavor(fill(pick(EMO)), tone)
  if (roll < 0.92) return flavor(fill(pick(JEALOUS)), tone)
  if (roll < 0.97) return fill(pick(SHORT))
  if (roll < 0.99) return pick(ABSTRACT)
  return pick(RECALL)
}

/** 生成单条角色回复（用于短信详情内的对话） */
export function generatePersonReply(c: Character, night = isNight()): SmsDraft {
  const tone = deriveTone(c)
  const roll = Math.random()
  const base = roll < 0.5 ? pick(SHORT) : roll < 0.8 ? pick(DAILY) : pick(ASK)
  const content = roll < 0.5 ? fill(base) : flavor(fill(base), tone)
  return {
    type: 'person',
    senderId: c.id,
    senderName: c.name,
    senderAvatar: c.avatarId,
    relationshipTag: tagOf(c),
    content,
    timestamp: Date.now(),
    appliedRules: [],
  }
}

function isNight(d = new Date()): boolean {
  const h = d.getHours()
  return h >= 23 || h < 6
}

function weightedTypePick(weights: Record<SmsType, number>): SmsType {
  const entries = Object.entries(weights) as [SmsType, number][]
  const total = entries.reduce((a, [, w]) => a + Math.max(0, w), 0)
  if (total <= 0) return 'system'
  let r = Math.random() * total
  for (const [k, w] of entries) {
    r -= Math.max(0, w)
    if (r <= 0) return k
  }
  return entries[entries.length - 1][0]
}

function draftFromTemplate(
  type: SmsType,
  from: string,
  tag: string,
  content: string,
  appliedRules: string[]
): SmsDraft {
  return {
    type,
    senderId: type === 'explosive' ? `ex_${from}` : `t_${from}`,
    senderName: from,
    senderAvatar: null,
    relationshipTag: tag,
    content,
    timestamp: Date.now(),
    appliedRules,
  }
}

/**
 * 生成一批短信（1-3 条）
 * 60% 真人 / 15% 骚扰 / 10% 系统 / 10% 服务 / 5% 炸裂，受世界书运行规制覆盖
 */
export function generateSmsBatch(): SmsDraft[] {
  const chars = useCharacters.getState().characters
  const directives: RuleDirectives = collectRules({ type: 'message' })
  const weights: Record<SmsType, number> = {
    person: 0.6,
    spam: 0.15,
    system: 0.1,
    service: 0.1,
    explosive: 0.05,
  }
  for (const [cat, val] of Object.entries(directives.probabilityOverrides)) {
    weights[cat as SmsType] = val as number
  }

  const night = isNight()
  const count = 1 + Math.floor(Math.random() * 3)
  const out: SmsDraft[] = []
  const explosivePool = [...EXPLOSIVE, ...explosivePoolFromRules(directives.rules)]
  const applied = directives.appliedNames

  for (let i = 0; i < count; i += 1) {
    let type = weightedTypePick(weights)
    if (type === 'person' && chars.length === 0) type = weightedTypePick({ ...weights, person: 0, service: 0.15 })
    if (type === 'person') {
      const c = weightedCharacter(chars)
      if (!c) {
        const s = pick(SERVICE)
        out.push(draftFromTemplate('service', s.from, '服务', fill(s.content), applied))
        continue
      }
      out.push({
        type: 'person',
        senderId: c.id,
        senderName: c.name,
        senderAvatar: c.avatarId,
        relationshipTag: tagOf(c),
        content: buildPersonContent(c, night),
        timestamp: Date.now(),
        appliedRules: applied,
      })
    } else if (type === 'spam') {
      const s = pick(SPAM)
      out.push(draftFromTemplate('spam', s.from, '推广', fill(s.content), applied))
    } else if (type === 'system') {
      const s = pick(SYSTEM)
      out.push(draftFromTemplate('system', s.from, '系统', fill(s.content), applied))
    } else if (type === 'service') {
      const s = pick(SERVICE)
      out.push(draftFromTemplate('service', s.from, '服务', fill(s.content), applied))
    } else {
      // 炸裂信息
      const c = chars.length > 0 ? weightedCharacter(chars) : null
      const content = fill(pick(explosivePool))
      if (c) {
        out.push({
          type: 'explosive',
          senderId: c.id,
          senderName: c.name,
          senderAvatar: c.avatarId,
          relationshipTag: tagOf(c),
          content,
          timestamp: Date.now(),
          appliedRules: applied,
        })
      } else {
        out.push(draftFromTemplate('explosive', '未知号码', '未知', content, applied))
      }
    }
  }
  return out
}

export { isNight }