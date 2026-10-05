import type { ChatApiMessage } from './api'
import { streamChat } from './api'
import { getDefaultChatPreset } from '../store/apiPresets'
import {
  ME,
  RELATIONSHIP_LABEL,
  type SocialCharacter,
  type SocialMessage,
  type SocialProfile,
} from '../store/social'

/* ============================================================
   「mu社区恋爱交友软件」AI 引擎
   角色回信 / 角色发动态 / 主动来信
   有可用 LLM 预设时真实生成；否则走本地模板兜底，保证纯离线也能玩
   ============================================================ */

export function hasSocialAi(): boolean {
  return !!getDefaultChatPreset()
}

/** 去掉围栏、多余引号与「角色名：」这类扮演标记 */
function clean(text: string): string {
  let t = text.trim()
  const fence = /```[a-zA-Z0-9_+#.-]*\r?\n([\s\S]*?)```/.exec(t)
  if (fence) t = fence[1].trim()
  t = t.replace(/^["“'「]/, '').replace(/["”'」]$/, '')
  t = t.replace(/^[^\s：:]{1,6}[：:]\s*/, '')
  t = t.replace(/\n{2,}/g, '\n').trim()
  return t
}

function personaBrief(c: SocialCharacter): string {
  return [
    `名字：${c.nickname}`,
    `简介：${c.bio}`,
    `性格：${c.personality.join('、')}${c.personality.length ? '' : '（未设定）'}`,
    `兴趣：${c.interests.join('、') || '无'}`,
    `擅长：${c.skills.join('、') || '无'}`,
    `星座：${c.zodiac}，MBTI：${c.mbti}`,
  ].join('\n')
}

function stageBrief(c: SocialCharacter, profile: SocialProfile): string {
  const stage = RELATIONSHIP_LABEL[c.relationship]
  return [
    `你与「${profile.nickname}」当前关系：${stage}（好感度 ${c.affinity}/100）`,
    c.affinity >= 75
      ? '你们已经是情侣，语气亲昵自然，可以关心对方生活、偶尔撒娇或规划一起做的事。'
      : c.affinity >= 45
        ? '你已对 TA 有明显好感，会主动找话题、回应更热情，但仍保留一点分寸感。'
        : c.affinity >= 20
          ? '你们是聊得来的朋友，语气轻松，会开玩笑也会认真听。'
          : '你们才刚认识，语气礼貌、略微克制，带着好奇。',
  ].join('\n')
}

const COMMON_RULES = `写作要求：
1. 只输出这一条消息本身，不要任何解释、旁白、动作描写或括号里的心理活动。
2. 不要加引号，不要在开头写自己的名字。
3. 中文，口语化，长度控制在一两句、约 40 字以内。
4. 可以偶尔用一个 emoji，但不要每句都用。
5. 严格保持角色人设，不要跳出角色。`

/* ---------- 角色回信 ---------- */

export async function generateReply(opts: {
  character: SocialCharacter
  profile: SocialProfile
  history: SocialMessage[]
  userText: string
  signal?: AbortSignal
}): Promise<string> {
  const { character, profile, history, userText } = opts
  const preset = getDefaultChatPreset()
  if (!preset) return localReply(character, userText)

  const recent = history.slice(-10)
  const messages: ChatApiMessage[] = [
    {
      role: 'system',
      content: `你在扮演一个恋爱社交软件里的虚拟角色，正在和用户「${profile.nickname}」聊天。\n\n${personaBrief(character)}\n\n${stageBrief(character, profile)}\n\n用户档案：${profile.bio}（标签：${profile.tags.join('、') || '无'}；兴趣：${profile.interests.join('、') || '无'}）\n\n${COMMON_RULES}`,
    },
    ...recent.map<ChatApiMessage>((m) => ({
      role: m.senderId === ME ? 'user' : 'assistant',
      content: m.recalled ? '（对方撤回了一条消息）' : m.text,
    })),
    { role: 'user', content: userText },
  ]

  try {
    const full = await streamChat(preset, messages, { onDelta: () => {}, signal: opts.signal })
    const text = clean(full)
    return text || localReply(character, userText)
  } catch {
    return localReply(character, userText)
  }
}

/* ---------- 角色发动态 ---------- */

export async function generatePost(opts: {
  character: SocialCharacter
  profile: SocialProfile
  recentMine: string[]
  signal?: AbortSignal
}): Promise<string> {
  const { character, profile, recentMine } = opts
  const preset = getDefaultChatPreset()
  if (!preset) return localPost(character, profile)

  const mentionUser = character.affinity >= 60 && recentMine.length > 0
  const messages: ChatApiMessage[] = [
    {
      role: 'system',
      content: `你在扮演恋爱社交软件里的虚拟角色「${character.nickname}」，现在要发一条个人动态（类似朋友圈/推特）。\n\n${personaBrief(character)}\n\n${stageBrief(character, profile)}\n\n${
        mentionUser
          ? `你最近看到「${profile.nickname}」发过：${recentMine
              .slice(0, 3)
              .map((x) => `「${x}」`)
              .join('、')}，可以自然地提一句与 TA 有关的内容，但不要直接 @ 或写名字。`
          : '这条动态只写你自己的日常，不要提到用户。'
      }\n\n写作要求：\n1. 只输出动态正文，不要引号、不要标题、不要话题标签。\n2. 中文，第一人称，20-60 字，像真人随手发的那种。\n3. 贴合角色的人设与兴趣，不要跳出角色。`,
    },
    { role: 'user', content: '发一条今天的动态。' },
  ]

  try {
    const full = await streamChat(preset, messages, { onDelta: () => {}, signal: opts.signal })
    const text = clean(full)
    return text || localPost(character, profile)
  } catch {
    return localPost(character, profile)
  }
}

/* ---------- 角色主动来信 ---------- */

export async function generateProactive(opts: {
  character: SocialCharacter
  profile: SocialProfile
  recentMine: string[]
  signal?: AbortSignal
}): Promise<string> {
  const { character, profile, recentMine } = opts
  const preset = getDefaultChatPreset()
  if (!preset) return localProactive(character, profile)

  const messages: ChatApiMessage[] = [
    {
      role: 'system',
      content: `你在扮演恋爱社交软件里的虚拟角色「${character.nickname}」，现在主动给「${profile.nickname}」发一条消息（主动来信）。\n\n${personaBrief(character)}\n\n${stageBrief(character, profile)}\n\n${
        recentMine.length ? `你最近注意到 TA 发了：${recentMine.slice(0, 2).map((x) => `「${x}」`).join('、')}，可以借这个自然开场。` : ''
      }\n\n${COMMON_RULES}`,
    },
    { role: 'user', content: '（启动一次主动来信，直接写出你要发给对方的那句话）' },
  ]

  try {
    const full = await streamChat(preset, messages, { onDelta: () => {}, signal: opts.signal })
    const text = clean(full)
    return text || localProactive(character, profile)
  } catch {
    return localProactive(character, profile)
  }
}

/* ---------- 本地兜底 ---------- */

const TONE_POOL: Record<string, string[]> = {
  温柔: ['今天过得怎么样呀？突然有点想听你说说话。', '刚泡了杯热的，要是你也在旁边就好了。', '别太累啦，记得按时吃饭。'],
  安静: ['在忙吗？没事，就是想问一句。', '刚才想到你说过的一句话，笑了好久。', '外面下雨了，你那边的天气呢？'],
  文艺: ['读到一个句子，第一反应是想发给你。', '今晚的月亮很好看，替你也看了一眼。', '有些话写在纸上才敢说，可惜现在只能打字。'],
  活泼: ['在干嘛在干嘛！带我玩一个！', '刷到一个超好笑的，笑到我原地转圈。', '快猜猜我今天遇到什么离谱事了。'],
  阳光: ['今天天气超好，出来走走嘛！', '刚跑完步，心情好到想分享给你。', '给你打个气，今天也要开开心心的。'],
  治愈: ['今天也辛苦啦，抱一个。', '不用逞强也可以的，我在这。', '给你留了一块甜的，心情不好就来拿。'],
  傲娇: ['哼，谁要主动找你，是手滑。', '才不是特意等你的消息呢。', '……你要是再不回我，我就真的不理你了。'],
  高冷: ['在。', '没什么事，随便问问。', '……刚才那件事，你做得很对。'],
  腹黑: ['猜猜我在想什么？猜对了有奖励。', '你这么好骗，我都不忍心了。', '刚发现一个只有我知道的你的小习惯。'],
  有趣: ['报告，我发现一个超适合你的宝藏。', '我们打个赌吧，输的人请吃饭。', '认真问你一个问题：如果明天不用上班……'],
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]
}

function toneOf(c: SocialCharacter): string {
  for (const p of c.personality) if (TONE_POOL[p]) return p
  return '温柔'
}

export function localReply(c: SocialCharacter, userText: string): string {
  const base = pick(TONE_POOL[toneOf(c)])
  if (c.affinity >= 60 && Math.random() > 0.55) {
    return `${base}${userText.length <= 12 ? `（顺便说，你上一条“${userText}”我记住了）` : ''}`
  }
  return base
}

export function localPost(c: SocialCharacter, profile: SocialProfile): string {
  const interest = c.interests.length ? pick(c.interests) : '日常'
  const mine = pick([
    '今天也在认真生活，虽然有点累。',
    '看到好看的晚霞，拍下来了。',
    '突然想吃点甜的。',
    '有点想念某个人，但是不说。',
  ])
  if (c.affinity >= 60) {
    return pick([
      `最近因为一些小事心情很好，${interest}这件事好像突然变得更有意思了。`,
      `有人跟我说过一句很治愈的话，今天${interest}的时候又想起来了。`,
    ])
  }
  return `${interest}相关的一天：${mine}`
}

export function localProactive(c: SocialCharacter, profile: SocialProfile): string {
  const pool = [
    ...TONE_POOL[toneOf(c)],
    `突然想到你，${profile.nickname}今天还好吗？`,
  ]
  return pick(pool)
}