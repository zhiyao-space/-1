import { useCharacters } from '../store/characters'
import { useForum } from '../store/forum'
import { getDefaultChatPreset } from '../store/apiPresets'
import { useNotifications } from '../store/notifications'
import {
  useMoments,
  momentAuthorKey,
  type Moment,
  type MomentAuthor,
  type MomentComment,
} from '../store/moments'
import { streamChat, type ChatApiMessage } from './api'
import { authorPersona } from './forumEngine'
import { buildCharacterPrompt, splitReply } from './chatEngine'
import { useChats } from '../store/chats'

export interface MomentActor {
  key: string
  author: MomentAuthor
  persona: string
  name: string
}

const LOCATIONS = ['上海', '北京', '杭州', '成都', '深圳', '广州', '东京', '伦敦', '纽约', '冰岛', '家里', '公司', '路上', '咖啡店']

export function randomLocation(): string {
  return LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
}

/** 候选互动者：全部角色 + 未拉黑的 NPC */
export function momentActors(): MomentActor[] {
  const chars = useCharacters.getState().characters
  const forum = useForum.getState()
  const out: MomentActor[] = []
  for (const c of chars) {
    const author: MomentAuthor = { type: 'character', id: c.id, name: c.name }
    out.push({ key: momentAuthorKey(author), author, persona: buildCharacterPrompt(c), name: c.name })
  }
  for (const n of forum.npcs) {
    if (forum.blockedNpcIds.includes(n.id)) continue
    const author: MomentAuthor = { type: 'npc', id: n.id, name: n.name }
    out.push({
      key: momentAuthorKey(author),
      author,
      persona: authorPersona({ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }),
      name: n.name,
    })
  }
  return out
}

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

// ---------------------------------------------------------------------------
// 文案池兜底（无 API 时保证不是摆设）
// ---------------------------------------------------------------------------

export const MOMENT_FALLBACK_POOL = [
  '今天也是普通但还不错的一天。',
  '有点累，但看到晚霞就治愈了。',
  '突然很想吃小时候那家店的味道。',
  '窗外下雨了，适合发呆。',
  '今天效率奇高，值得记一笔。',
  '被一句歌词戳中了，单曲循环到现在。',
  '谁懂啊，这个点还没睡。',
  '早起的空气真好，虽然起得很痛苦。',
  '把房间收拾干净了，心情也跟着亮了。',
  '今天遇到一件小事，突然就笑了。',
  '有点想见见很久没联系的人。',
  '天气转凉，记得加衣服。',
  '新买的东西到了，开心。',
  '今天的心情是：平静中带一点点期待。',
  '路过一家店，香味让我停了三秒。',
  '最近在学一件新东西，进度缓慢但上瘾。',
  '看到很好看的云，可惜拍不出那种感觉。',
  '今天不想说话，只想安安静静待着。',
  '突然觉得，慢一点也没关系。',
  '被朋友投喂了，幸福感+1。',
  '深夜emo时间到，但明天会好的。',
  '今天的咖啡格外好喝。',
  '值夜班的第 N 天，习惯了。',
  '想出去走走，但又懒得动。',
  '记录一下，今天有好好吃饭。',
  '有点想念某个地方的风。',
  '刚刚完成一件拖了很久的事，松口气。',
]

const FALLBACK_COMMENTS = [
  '哈哈哈哈哈',
  '羡慕了',
  '拍得真好看',
  '好有氛围感',
  '想去了',
  '你最近还好吗',
  '同款心情',
  '注意身体呀',
  '这也太可爱了吧',
  '等你更新',
  '不错不错',
  '求同款',
]

function pickFallbackMoment(name: string): string {
  const t = MOMENT_FALLBACK_POOL[Math.floor(Math.random() * MOMENT_FALLBACK_POOL.length)]
  return t.replace(/\{name\}/g, name)
}

function pickFallbackComment(): string {
  return FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)]
}

// ---------------------------------------------------------------------------
// LLM 调用
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 生成角色朋友圈正文
// ---------------------------------------------------------------------------

export async function generateMomentContent(actor: MomentActor, recent: string[] = []): Promise<string> {
  const sys = `${actor.persona}
【朋友圈任务】你正在发布一条微信朋友圈。要求：
- 第一人称，生活化、有情绪、有细节，像真人随手记录，不要像作文
- 40 字以内，可以带 1-2 个 emoji
- 可以提到天气、心情、工作、吃喝、路上见闻等日常
- 不要重复最近已发过的内容
${recent.length ? `最近发过（避开）：${recent.join(' / ')}` : ''}
只输出朋友圈正文本身，不要引号、不要解释。`
  const raw = await callLLM(sys, '（系统指令：现在写出这条朋友圈。只输出正文。）')
  if (raw) return raw.replace(/^["“]|["”]$/g, '').slice(0, 120)
  return pickFallbackMoment(actor.name)
}

// ---------------------------------------------------------------------------
// 生成角色之间的互动
// ---------------------------------------------------------------------------

export interface MomentInteraction {
  key: string
  action: 'like' | 'comment'
  content?: string
}

export async function generateMomentInteractions(mom: Moment, actors: MomentActor[]): Promise<MomentInteraction[]> {
  const candidates = actors.filter((a) => a.key !== momentAuthorKey(mom.author))
  if (candidates.length === 0) return []
  const picked = shuffle(candidates).slice(0, 1 + Math.floor(Math.random() * 3))

  const commenters = picked.filter(() => Math.random() < 0.45)
  const result: MomentInteraction[] = []
  for (const p of picked) {
    if (commenters.includes(p)) continue
    if (Math.random() < 0.8) result.push({ key: p.key, action: 'like' })
  }

  if (commenters.length > 0) {
    const sys = `你正在扮演多个角色，为一则朋友圈写评论。每位评论者人设：
${commenters.map((c) => `- [${c.key}] ${c.name}：${c.persona}`).join('\n')}

【朋友圈作者】${mom.author.name}
【正文】${mom.content.slice(0, 200)}
${mom.comments.length ? `已有评论（可接话，避免重复）：\n${mom.comments.slice(-4).map((c) => `${c.author.name}: ${c.content}`).join('\n')}` : ''}
严格输出 JSON（无 markdown 代码块）：{"comments":[{"key":"评论者key","content":"评论内容"}]}
每条 30 字以内，口语化，符合各自人设。`
    const j = parseJson<{ comments: { key: string; content: string }[] }>(
      await callLLM(sys, '（系统指令：现在生成评论，只输出 JSON。）')
    )
    const valid = new Set(commenters.map((c) => c.key))
    if (j?.comments?.length) {
      for (const c of j.comments) {
        if (valid.has(c.key) && c.content) result.push({ key: c.key, action: 'comment', content: String(c.content).slice(0, 120) })
      }
    } else {
      for (const c of commenters) result.push({ key: c.key, action: 'comment', content: pickFallbackComment() })
    }
  }
  return result
}

/** 回复某条评论（楼中楼） */
export async function generateMomentReply(mom: Moment, target: MomentComment, actor: MomentActor): Promise<string> {
  const sys = `${actor.persona}
【朋友圈任务】你朋友圈的一条评论需要你回应。
【你的动态】${mom.content.slice(0, 200)}
【对方评论】${target.author.name}：“${target.content.slice(0, 120)}”
只输出回复内容本身，40 字以内，口语化，可用 @${target.author.name} 开头。`
  const raw = await callLLM(sys, '（系统指令：现在写出你的回复。只输出内容。）')
  return raw ? raw.slice(0, 120) : pickFallbackComment()
}

/** 角色转发一条朋友圈到自己主页 */
export function buildRepostContent(mom: Moment): string {
  const head = `//@${mom.author.name}：`
  return `${head}${mom.content}`.slice(0, 400)
}

// ---------------------------------------------------------------------------
// 刷新：角色发圈 + 角色之间互动 + 回复 + 访客
// ---------------------------------------------------------------------------

export interface RefreshResult {
  newMoments: number
  interactions: number
  visitors: number
  warmup: boolean
}

function isOnMyMoment(mom: Moment): boolean {
  return mom.author.type === 'user'
}

/** 一次性刷新：产出角色动态与他们之间的互动 */
export async function runMomentsRefresh(): Promise<RefreshResult> {
  const result: RefreshResult = { newMoments: 0, interactions: 0, visitors: 0, warmup: false }
  const actors = momentActors()
  if (actors.length === 0) return result

  const store = useMoments.getState()
  const presetReady = !!getDefaultChatPreset()?.baseUrl

  // 空朋友圈时，先铺一批角色动态，避免打开是空的
  const existing = useMoments.getState().moments
  let posterCount = 1 + Math.floor(Math.random() * 2)
  if (existing.length < 3) {
    posterCount = Math.min(actors.length, 3)
    result.warmup = true
  }

  // 1) 角色发布新动态
  const posters = shuffle(actors).slice(0, posterCount)
  const recentContents = existing.slice(0, 6).map((m) => m.content.slice(0, 20))
  for (const a of posters) {
    const content = await generateMomentContent(a, recentContents)
    if (!content) continue
    useMoments.getState().addMoment({
      author: a.author,
      content,
      imageIds: [],
      location: randomLocation(),
      visibility: 'all',
      visibleIds: [],
      music: null,
    })
    result.newMoments += 1
    await delay(presetReady ? 400 : 200)
  }

  // 2) 角色之间互相互动（含用户的动态）
  const targets = shuffle(useMoments.getState().moments).slice(0, 3)
  for (const mom of targets) {
    const fresh = useMoments.getState().moments.find((m) => m.id === mom.id)
    if (!fresh) continue
    const acts = await generateMomentInteractions(fresh, actors)
    for (const act of acts) {
      const actor = actors.find((a) => a.key === act.key)
      if (!actor) continue
      if (act.action === 'like') {
        if (!useMoments.getState().moments.find((m) => m.id === mom.id)?.likes.includes(act.key)) {
          useMoments.getState().toggleLike(mom.id, act.key)
        }
      } else if (act.content) {
        const parent = useMoments.getState().moments.find((m) => m.id === mom.id)?.comments
        const rootId = parent && parent.length > 0 && Math.random() < 0.35 ? parent[parent.length - 1].id : null
        useMoments.getState().addComment(mom.id, {
          author: actor.author,
          content: act.content,
          parentId: rootId,
          replyToName: rootId ? parent?.find((c) => c.id === rootId)?.author.name ?? null : null,
        })
      }
      result.interactions += 1
      if (isOnMyMoment(mom)) useMoments.getState().bumpUnread(1)
      await delay(400 + Math.random() * 800)
    }

    // 未行动的角色有一定几率偷偷来访（仅用户动态）
    if (isOnMyMoment(mom)) {
      const lurkers = shuffle(actors.filter((a) => a.key !== momentAuthorKey(mom.author))).slice(0, 2)
      for (const l of lurkers) {
        if (Math.random() < 0.35) {
          useMoments.getState().recordVisitor(mom.id, { key: l.key, name: l.name, time: Date.now() })
          useMoments.getState().bumpUnread(1)
          result.visitors += 1
        }
      }
    }
  }

  // 3) 角色回复用户在他们动态下的评论
  const withMyComment = useMoments.getState().moments.filter(
    (m) =>
      m.author.type !== 'user' &&
      m.comments.some((c) => c.author.type === 'user') &&
      !m.comments.some((c) => c.author.type !== 'user' && c.parentId)
  )
  for (const mom of shuffle(withMyComment).slice(0, 2)) {
    const authorActor = actors.find((a) => a.key === momentAuthorKey(mom.author))
    if (!authorActor) continue
    const myComment = [...mom.comments].reverse().find((c) => c.author.type === 'user')
    if (!myComment) continue
    const reply = await generateMomentReply(mom, myComment, authorActor)
    if (!reply) continue
    useMoments.getState().addComment(mom.id, {
      author: mom.author,
      content: reply,
      parentId: myComment.id,
      replyToName: myComment.author.name,
    })
    result.interactions += 1
    await delay(500)
  }

  // 4) 通知（仅针对用户自己的动态）
  if (result.interactions > 0 || result.visitors > 0) {
    useNotifications.getState().push({
      kind: 'moment-comment',
      title: '朋友圈有新互动',
      body: `新增 ${result.interactions} 条互动${result.visitors ? `、${result.visitors} 位访客` : ''}`,
      target: { app: 'chat', payload: { view: 'moment', id: 'top' } },
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// 转发到聊天：角色回应
// ---------------------------------------------------------------------------

export async function respondToForward(sessionId: string, momentId: string, characterId: string): Promise<void> {
  const mom = useMoments.getState().moments.find((m) => m.id === momentId)
  const char = useCharacters.getState().characters.find((c) => c.id === characterId)
  if (!char) return

  let texts: string[] = []
  if (mom) {
    const sys = `${buildCharacterPrompt(char)}
【场景】用户把一条朋友圈转发给了你。
【被转发的朋友圈】作者：${mom.author.name}｜内容：${mom.content.slice(0, 200)}
【任务】用你自己的语气，发 1-2 条聊天消息回应这条转发（可以点评、吐槽、共鸣、提问），符合你的人设，每条约 30 字内。
只输出聊天内容本身，多条之间用换行分隔。`
    const raw = await callLLM(sys, '（系统指令：现在写出你的回应。）')
    if (raw) texts = splitReply(raw).slice(0, 2)
  }
  if (texts.length === 0) texts = ['这条我看到啦，挺有意思的。']

  for (const t of texts) {
    useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: t })
    await delay(450)
  }
  // 50% 概率去点赞这条动态
  if (mom && Math.random() < 0.5) {
    const key = `character:${characterId}`
    if (!useMoments.getState().moments.find((m) => m.id === momentId)?.likes.includes(key)) {
      useMoments.getState().toggleLike(momentId, key)
    }
  }
}