import type { Character } from '../store/characters'
import { useCharacters } from '../store/characters'
import type { ForumAuthor, ForumCircle, ForumComment, ForumDM, ForumNPC, ForumPost, PlayStyle } from '../store/forum'
import { PLAY_STYLE_LABEL } from '../store/forum'
import { useForum } from '../store/forum'
import { useMoments, type Moment } from '../store/moments'
import { useChatParams } from '../store/chatParams'
import { useSettings } from '../store/settings'
import { getDefaultChatPreset } from '../store/apiPresets'
import { buildCharacterPrompt } from './chatEngine'
import { streamChat } from './api'
import type { ChatApiMessage } from './api'

export function characterAuthor(c: Character): ForumAuthor {
  return { type: 'character', id: c.id, name: c.name, avatarId: c.avatarId }
}

export function npcAuthor(n: ForumNPC): ForumAuthor {
  return { type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }
}

export function aliasAuthor(name: string): ForumAuthor {
  return { type: 'alias', id: `alias:${name}`, name, avatarId: null }
}

function npcPersona(n: ForumNPC): string {
  const fam = n.familiarity > 60 ? '你们已经很熟了' : n.familiarity > 30 ? '你们打过几次照面' : '你们还是陌生人'
  return `熟悉度 ${n.familiarity}/100（${fam}）`
}

export function authorPersona(a: ForumAuthor): string {
  if (a.type === 'character') {
    const c = useCharacters.getState().characters.find((x) => x.id === a.id)
    if (c) return buildCharacterPrompt(c)
  }
  if (a.type === 'npc') {
    const n = useForum.getState().npcs.find((x) => x.id === a.id)
    if (n) return `【你的角色设定】\n昵称：${n.name}\n${n.persona || '一位普通路人'}\n${npcPersona(n)}`
  }
  return '【你的角色设定】一位普通论坛用户，说话自然口语化'
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
    return await streamChat(preset, apiWrap(sys, user), { onDelta: () => {} })
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

const PLAY_SPEC: Record<PlayStyle, string> = {
  normal: '普通帖子，内容自然。',
  twitter: 'Twitter 体短帖：正文不超过 280 字，口语碎碎念，可拆成 2-3 条连发（thread）。',
  insta: 'Instagram 体视觉帖：以图片为主导，配文极简（20 字内），有氛围感。',
  fanfic: '同人文帖：写一段同人正文，需要给出大纲、CP、预计字数、文风、结局走向。',
  event: '沉浸式推演帖：描述一个正在发酵的事件，并给出 2-4 个后续处理方式供投票选择。',
  rule: '规则怪谈帖：列出若干条诡异规则，引导读者提问推理真相；真相可以误导但绝不直接说谎。',
}

export interface GeneratedPost {
  title: string
  content: string
  tags: string[]
  type: 'text' | 'image' | 'poll' | 'relay'
  imageDesc: string
  threadParts: string[]
  pollOptions: string[]
  fanfic: { outline: string; cp: string; words: string; style: string; ending: string } | null
}

export async function generateForumPost(
  author: ForumAuthor,
  circle: ForumCircle,
  playStyle: PlayStyle,
  recentTitles: string[]
): Promise<GeneratedPost | null> {
  const sys = `${authorPersona(author)}
【发帖任务】你是论坛"${circle.name}"的成员，现在要发一帖。帖子玩法：${PLAY_SPEC[playStyle]}（${PLAY_STYLE_LABEL[playStyle]}）
${circle.rules ? `圈规（必须遵守）：${circle.rules}` : ''}
${circle.description ? `圈子简介：${circle.description}` : ''}
${recentTitles.length ? `最近已有话题（避开重复）：${recentTitles.join('、')}` : ''}
严格输出 JSON（无 markdown 代码块）：
{"title":"标题，20字内","content":"正文","tags":["话题标签1"],"type":"text|image|poll|relay","imageDesc":"若为图片/视觉帖，写一段图片内容描述，否则空串","thread":["若为Twitter连发，每条一个元素，否则空数组"],"pollOptions":["若为投票/推演帖，给出2-4个选项，否则空数组"],"fanfic":null}
fanfic 仅同人文帖时输出：{"outline":"大纲","cp":"CP","words":"字数","style":"文风","ending":"结局走向"}`
  const raw = await callLLM(sys, '（系统指令：现在生成这条帖子。只输出 JSON。）')
  const j = parseJson<Partial<GeneratedPost> & { fanfic: GeneratedPost['fanfic']; thread?: string[] }>(raw)
  if (!j || !j.content) return null
  return {
    title: (j.title || '').slice(0, 40),
    content: j.content,
    tags: (j.tags || []).slice(0, 4).map((t) => String(t).replace(/^#/, '')).slice(0, 4),
    type: (['text', 'image', 'poll', 'relay'] as const).includes(j.type as 'text') ? (j.type as GeneratedPost['type']) : 'text',
    imageDesc: String(j.imageDesc || '').slice(0, 200),
    threadParts: (j.thread || []).slice(0, 3).map((s) => String(s).slice(0, 280)),
    pollOptions: (j.pollOptions || []).slice(0, 4).map((s) => String(s).slice(0, 30)),
    fanfic: j.fanfic ?? null,
  }
}

export interface GeneratedReply {
  authorKey: string
  content: string
}

export async function generateForumReplies(
  post: ForumPost,
  repliers: { key: string; persona: string; name: string }[],
  existing: ForumComment[],
  extraInstruction?: string
): Promise<GeneratedReply[] | null> {
  const sys = `你正在扮演一个论坛里的多个用户，为一个帖子写回复。每位回复者的人设如下：
${repliers.map((r) => `- [${r.key}] ${r.name}：${r.persona}`).join('\n')}

【原帖】
标题：${post.title || '（无标题）'}
正文：${post.content.slice(0, 600)}
${post.relay ? `这是接力帖，规则：${post.relay.rules}。已有接力 ${post.relay.parts.length} 段，请按规则往下接力。` : ''}
${post.playStyle === 'rule' ? '这是规则怪谈帖：回复者通过提问或推理逼近真相，发帖人不在场，你们只能根据帖子内容推测，不得编造帖子中不存在的事实。' : ''}
${post.playStyle === 'event' ? '这是沉浸式推演帖：回复者讨论事件走向、站队或分析。' : ''}
${post.fanficMeta ? '这是同人文帖：回复者可以催更、点评、许愿番外。' : ''}
${existing.length ? `已有评论（接住上下文，避免重复）：\n${existing.slice(-6).map((c) => `${c.author.name}: ${c.content}`).join('\n')}` : ''}
${extraInstruction ? `额外要求：${extraInstruction}` : ''}

严格输出 JSON（无 markdown 代码块）：
{"replies":[{"key":"回复者key","content":"回复内容"}]}`
  const user = `（系统指令：为这个帖子生成 ${repliers.length} 条回复，每条都不超过 120 字，符合各自人设，口语化。只输出 JSON。）`
  const j = parseJson<{ replies: { key: string; content: string }[] }>(await callLLM(sys, user))
  if (!j?.replies?.length) return null
  const valid = new Set(repliers.map((r) => r.key))
  return j.replies
    .filter((r) => valid.has(r.key) && r.content)
    .map((r): GeneratedReply => ({ authorKey: r.key, content: String(r.content).slice(0, 300) }))
}

export async function generateCommentReply(
  post: ForumPost,
  target: ForumComment | null,
  author: ForumAuthor,
  extraInstruction?: string
): Promise<string | null> {
  const sys = `${authorPersona(author)}
【评论任务】你在论坛帖子下方写一条回复评论。
【原帖】${post.title ? `《${post.title}》` : ''}${post.content.slice(0, 400)}
${target ? `【你回复的对象】${target.author.name} 说：“${target.content.slice(0, 200)}”，可用 @${target.author.name} 开头。` : ''}
${extraInstruction ? `额外要求：${extraInstruction}` : ''}
只输出评论内容本身，120 字以内，口语化。`
  const raw = await callLLM(sys, '（系统指令：现在写出你的评论。只输出评论本身。）')
  return raw ? raw.trim().slice(0, 300) : null
}

export async function generateDmReply(dm: ForumDM, partnerPersona: string): Promise<string | null> {
  const history = dm.messages
    .slice(-10)
    .map((m) => `${m.from === 'user' ? '我' : '对方'}: ${m.sharedPostId ? '（转发了帖子卡片）' : ''}${m.content}`)
    .join('\n')
  const sys = `${partnerPersona}
【私信任务】你正在和用户私聊。根据最近的私信内容，自然地回复一条消息。
${history ? `最近对话：\n${history}` : '你们还没有对话，由你自然地开启话题。'}
只输出消息本身，80 字以内。`
  const raw = await callLLM(sys, '（系统指令：现在写出你的私信。只输出消息本身。）')
  return raw ? raw.trim().slice(0, 200) : null
}

export async function generateMomentContent(author: ForumAuthor): Promise<{ content: string; imageDesc: string } | null> {
  const sys = `${authorPersona(author)}
【朋友圈任务】以你的身份发一条朋友圈动态。内容贴近你的人设和当下的状态，口语化，60 字以内。可以配一张图。
严格输出 JSON（无 markdown 代码块）：{"content":"动态文字","imageDesc":"配图内容描述，没有则空串"}`
  const j = parseJson<{ content: string; imageDesc: string }>(
    await callLLM(sys, '（系统指令：现在生成这条朋友圈。只输出 JSON。）')
  )
  if (!j?.content) return null
  return { content: j.content.slice(0, 200), imageDesc: String(j.imageDesc || '').slice(0, 120) }
}

export async function generateMomentReply(
  moment: Moment,
  author: ForumAuthor,
  replyTo: string | null
): Promise<string | null> {
  const sys = `${authorPersona(author)}
【朋友圈评论任务】你在评论用户的朋友圈。
动态内容：${moment.content.slice(0, 200)}
${replyTo ? `你在回复 ${replyTo} 的评论，可用 @ 开头。` : ''}
只输出评论内容本身，60 字以内，符合人设口吻。`
  const raw = await callLLM(sys, '（系统指令：现在写出你的评论。只输出评论本身。）')
  return raw ? raw.trim().slice(0, 150) : null
}

export async function generateForwardReaction(
  moment: Moment,
  author: ForumAuthor
): Promise<string | null> {
  const userName = useSettings.getState().phoneName || '用户'
  const sys = `${authorPersona(author)}
【转发回应任务】${userName} 把一条朋友圈转发到了和你的聊天里。请以聊天口吻自然回应这条朋友圈。
动态内容：${moment.content.slice(0, 200)}
只输出回应本身，40 字以内，口语化，符合人设。`
  const raw = await callLLM(sys, '（系统指令：现在写出你对这条朋友圈的回应。只输出回应本身。）')
  return raw ? raw.trim().slice(0, 120) : null
}

// ---------- 记忆互通 ----------

export function buildForumMemory(characterId: string): string | null {
  const days = useChatParams.getState().forumMemoryDays
  if (days <= 0) return null
  const cutoff = Date.now() - days * 86400_000
  const { posts, comments, dms, circles } = useForum.getState()
  const userName = useSettings.getState().phoneName || '我'
  const lines: string[] = []

  for (const p of posts) {
    if (p.createdAt < cutoff) continue
    if (p.author.type === 'character' && p.author.id === characterId) {
      const circle = circles.find((c) => c.id === p.circleId)
      lines.push(`你在论坛「${circle?.name ?? '?'}」发帖《${p.title || p.content.slice(0, 20)}》：${p.content.slice(0, 60)}`)
    } else if (p.author.type === 'user' && circles.find((c) => c.id === p.circleId)?.memberCharacterIds.includes(characterId)) {
      lines.push(`${userName} 在论坛发帖《${p.title || p.content.slice(0, 20)}》：${p.content.slice(0, 50)}`)
    }
  }
  for (const c of comments) {
    if (c.createdAt < cutoff) continue
    if (c.author.type === 'character' && c.author.id === characterId) {
      const p = posts.find((x) => x.id === c.postId)
      if (p) lines.push(`你在帖子《${p.title || p.content.slice(0, 16)}》下评论过：${c.content.slice(0, 40)}`)
    }
  }
  for (const d of dms) {
    if (d.lastActive < cutoff) continue
    if (d.partner.type === 'character' && d.partner.id === characterId && d.messages.length > 0) {
      lines.push(`你和 ${userName} 最近私聊过`)
    }
  }
  const moments = useMoments.getState().moments
  for (const m of moments) {
    if (m.createdAt < cutoff) continue
    if (m.author.type === 'character' && m.author.id === characterId) {
      lines.push(`你发了朋友圈：${m.content.slice(0, 40)}`)
    } else if (m.author.type === 'user') {
      if (m.comments.some((c) => c.author.type === 'character' && c.author.id === characterId)) {
        lines.push(`你评论过 ${userName} 的朋友圈`)
      }
    }
  }
  if (lines.length === 0) return null
  return `【论坛与朋友圈近况】（最近 ${days} 天，聊天中可以自然提及）\n${lines.slice(-8).map((l) => `- ${l}`).join('\n')}`
}
