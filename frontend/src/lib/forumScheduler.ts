import type { ForumAuthor, ForumPost } from '../store/forum'
import { useForum } from '../store/forum'
import { useCharacters } from '../store/characters'
import { getDefaultChatPreset } from '../store/apiPresets'
import { useNotifications, type AppNotification } from '../store/notifications'
import { useMoments, type Moment, type MomentAuthor } from '../store/moments'
import { useSettings } from '../store/settings'
import {
  generateForumPost,
  generateForumReplies,
  generateDmReply,
  generateMomentContent,
  generateMomentReply,
  authorPersona,
  characterAuthor,
  npcAuthor,
} from './forumEngine'
import { splitReply } from './chatEngine'
import { useChats } from '../store/chats'
import { useChatParams } from '../store/chatParams'
import { pickFallbackMoment } from './momentFallback'
import { generateForwardReaction } from './forumEngine'

let running = false
const lastAt: Record<string, number> = {}

// 用户把朋友圈转发到聊天后，对方角色的回应：先回消息，再按概率去点赞
export async function respondToForward(sessionId: string, momentId: string): Promise<void> {
  const moment = useMoments.getState().moments.find((m) => m.id === momentId)
  const session = useChats.getState().sessions.find((s) => s.id === sessionId)
  if (!moment || !session) return
  const character = useCharacters.getState().characters.find((c) => c.id === session.characterId)
  if (!character) return
  await delay(1200 + Math.random() * 1800)
  const reaction = await generateForwardReaction(moment, characterAuthor(character))
  if (reaction) {
    for (const part of splitReply(reaction).slice(0, 2)) {
      useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: part })
      await delay(500)
    }
  }
  if (Math.random() < 0.5) {
    useMoments.getState().addLike(momentId, { type: 'character', id: character.id, name: character.name })
  }
}

function forumAuthorOf(a: MomentAuthor): ForumAuthor {
  return { type: a.type, id: a.id, name: a.name, avatarId: null }
}

// 朋友圈可见受众：可见范围内的角色 + 未拉黑 NPC
function momentAudience(m: Moment): MomentAuthor[] {
  const forum = useForum.getState()
  const chars = useCharacters.getState().characters
  const out: MomentAuthor[] = []
  for (const c of chars) {
    let ok = true
    if (m.visibility === 'custom') ok = m.visibleIds.includes(c.id)
    else if (m.visibility === 'friends') ok = forum.following.includes(`character:${c.id}`)
    if (ok) out.push({ type: 'character', id: c.id, name: c.name })
  }
  if (m.visibility !== 'friends') {
    for (const n of forum.npcs) {
      if (forum.blockedNpcIds.includes(n.id)) continue
      if (m.visibility === 'all' || m.visibleIds.includes(n.id)) {
        out.push({ type: 'npc', id: n.id, name: n.name })
      }
    }
  }
  return out
}

const MOMENT_FREQ_WINDOWS: Record<string, [number, number]> = {
  off: [0, 0],
  low: [25 * 60_000, 40 * 60_000],
  medium: [10 * 60_000, 25 * 60_000],
  high: [5 * 60_000, 12 * 60_000],
}

function momentCooled(): boolean {
  const freq = useChatParams.getState().momentAutoFreq
  if (freq === 'off') return false
  const [minMs, maxMs] = MOMENT_FREQ_WINDOWS[freq] ?? MOMENT_FREQ_WINDOWS.medium
  return cooled('moment', minMs, maxMs)
}

function cooled(key: string, minMs: number, maxMs: number): boolean {
  const now = Date.now()
  const gap = minMs + Math.random() * (maxMs - minMs)
  if ((lastAt[key] ?? 0) + gap > now) return false
  lastAt[key] = now
  return true
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function notify(n: Omit<AppNotification, 'id' | 'time' | 'read'>): void {
  useNotifications.getState().push(n)
}

interface Member {
  key: string
  persona: string
  name: string
  author: ForumAuthor
}

function circleMembers(circleId: string): Member[] {
  const forum = useForum.getState()
  const circle = forum.circles.find((c) => c.id === circleId)
  if (!circle) return []
  const chars = useCharacters.getState().characters.filter((c) => circle.memberCharacterIds.includes(c.id))
  const npcs = forum.npcs.filter((n) => circle.memberNpcIds.includes(n.id) && !forum.blockedNpcIds.includes(n.id))
  const out: Member[] = []
  for (const c of chars) {
    const a = characterAuthor(c)
    out.push({ key: `character:${c.id}`, persona: authorPersona(a), name: c.name, author: a })
  }
  for (const n of npcs) {
    const a = npcAuthor(n)
    out.push({ key: `npc:${n.id}`, persona: authorPersona(a), name: n.name, author: a })
  }
  return out
}

export async function runForumTick(): Promise<void> {
  if (running) return
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return
  if (useForum.getState().circles.length === 0) return
  running = true
  try {
    await tickInner()
  } catch {
    // 单轮调度失败静默处理
  } finally {
    running = false
  }
}

async function tickInner(): Promise<void> {
  const forum = useForum.getState()
  const userName = useSettings.getState().phoneName || '我'
  const now = Date.now()

  // 1) 用户新帖等待回应
  const myPost = forum.posts
    .filter((p) => p.author.type === 'user' && now - p.createdAt < 30 * 60_000 && !p.locked)
    .filter((p) => {
      const cc = useForum.getState().comments.filter((c) => c.postId === p.id)
      return cc.filter((c) => c.author.type !== 'user').length === 0
    })
    .sort((a, b) => b.createdAt - a.createdAt)[0]
  if (myPost && Math.random() < 0.75) {
    await replyToPost(myPost, 2, `用户 ${userName} 刚发了这个帖子，回应它`)
    return
  }

  // 2) 用户等待的私信回复
  const pendingDm = forum.dms
    .filter((d) => d.messages.length > 0 && d.messages[d.messages.length - 1].from === 'user')
    .sort((a, b) => b.lastActive - a.lastActive)[0]
  if (pendingDm && Math.random() < 0.8) {
    const partner = pendingDm.partner
    const reply = await generateDmReply(pendingDm, authorPersona(partner))
    if (reply) {
      for (const part of splitReply(reply).slice(0, 3)) {
        useForum.getState().addDmMessage(pendingDm.id, { from: 'them', content: part, imageId: null, stickerId: null, sharedPostId: null })
        await delay(400)
      }
      notify({
        kind: 'dm',
        title: `${partner.name} 私信`,
        body: reply.slice(0, 40),
        target: { app: 'forum', payload: { view: 'dm', id: pendingDm.id } },
      })
      if (partner.type === 'npc') {
        const npc = useForum.getState().npcs.find((n) => n.id === partner.id)
        if (npc) useForum.getState().updateNpc(npc.id, { familiarity: Math.min(100, npc.familiarity + 1) })
      }
    }
    return
  }

  // 3) 用户朋友圈等待互动（角色 + NPC，延时依次出现，未行动者可能成为访客）
  const myMoment = useMoments
    .getState()
    .moments.filter((m) => m.author.type === 'user' && now - m.createdAt < 30 * 60_000)
    .filter(
      (m) =>
        m.likes.filter((k) => k !== 'user').length === 0 &&
        m.comments.filter((c) => c.author.type !== 'user').length === 0
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0]
  if (myMoment && Math.random() < 0.75) {
    const shuffled = momentAudience(myMoment).sort(() => Math.random() - 0.5)
    const actorCount = Math.min(shuffled.length, 1 + Math.floor(Math.random() * 3))
    const actors = shuffled.slice(0, actorCount)
    const spectators = shuffled.slice(actorCount)
    const momStore = useMoments.getState()
    for (const a of actors) {
      const fresh = useMoments.getState().moments.find((x) => x.id === myMoment.id)
      if (!fresh) break
      const nonUserComments = fresh.comments.filter((c) => c.author.type !== 'user').length
      const roll = Math.random()
      if (roll < 0.4 || (roll < 0.65 && nonUserComments === 0 && Math.random() < 0.5)) {
        momStore.addLike(myMoment.id, a)
        notify({ kind: 'moment-like', title: '朋友圈', body: `${a.name} 赞了你的动态`, target: { app: 'moments' } })
      } else {
        const text = await generateMomentReply(fresh, forumAuthorOf(a), null)
        if (text) {
          momStore.addComment(myMoment.id, {
            author: a,
            content: text,
            parentId: null,
            replyToName: null,
          })
          notify({ kind: 'moment-comment', title: '朋友圈', body: `${a.name} 评论：${text.slice(0, 30)}`, target: { app: 'moments' } })
        }
      }
      await delay(600 + Math.random() * 1200)
    }
    for (const s of spectators) {
      if (s.type === 'character' && Math.random() < 0.35) {
        momStore.recordVisitor(myMoment.id, { type: 'character', id: s.id, name: s.name, time: Date.now() })
      }
    }
    return
  }

  // 3.5) 用户评论等待角色楼中楼回应
  const pendingUserComment = (() => {
    let found: { moment: Moment; commentId: string; authorName: string } | null = null
    for (const m of useMoments.getState().moments) {
      for (const c of m.comments) {
        if (c.author.type !== 'user' || now - c.time > 10 * 60_000) continue
        const answered = m.comments.some((r) => r.author.type !== 'user' && r.time > c.time)
        if (!answered) found = { moment: m, commentId: c.id, authorName: c.author.name }
      }
    }
    return found
  })()
  if (pendingUserComment && Math.random() < 0.75) {
    const { moment: targetMoment, commentId, authorName } = pendingUserComment
    const cur = useMoments.getState().moments.find((x) => x.id === targetMoment.id)
    const userComment = cur?.comments.find((c) => c.id === commentId)
    if (cur && userComment) {
      const parentId = userComment.parentId ?? userComment.id
      const parent = cur.comments.find((c) => c.id === parentId)
      let replier: MomentAuthor | null = parent && parent.author.type !== 'user' ? parent.author : null
      if (!replier) {
        const pool = momentAudience(cur)
        if (pool.length > 0) replier = pool[Math.floor(Math.random() * pool.length)]
      }
      if (replier) {
        const text = await generateMomentReply(cur, forumAuthorOf(replier), authorName)
        if (text) {
          useMoments.getState().addComment(cur.id, { author: replier, content: text, parentId, replyToName: authorName })
          notify({ kind: 'moment-comment', title: '朋友圈', body: `${replier.name} 回复了你的评论：${text.slice(0, 24)}`, target: { app: 'moments' } })
          return
        }
      }
    }
  }

  // 4) 随机生态
  const roll = Math.random()
  if (roll < 0.4 && cooled('post', 4 * 60_000, 8 * 60_000)) {
    await ambientPost()
  } else if (roll < 0.55 && momentCooled()) {
    await ambientMoment()
  } else if (roll < 0.7 && cooled('like', 3 * 60_000, 6 * 60_000)) {
    await ambientLike()
  } else if (roll < 0.78 && cooled('dm', 10 * 60_000, 20 * 60_000)) {
    await ambientDm()
  }
}

type AmbientStyle = 'normal' | 'twitter' | 'insta' | 'fanfic' | 'event' | 'rule' | 'poll'

async function replyToPost(post: ForumPost, count: number, instruction?: string): Promise<void> {
  const members = circleMembers(post.circleId).filter((m) => m.key !== `${post.author.type}:${post.author.id}`)
  if (members.length === 0) return
  const picked = members.sort(() => Math.random() - 0.5).slice(0, count)
  const existing = useForum.getState().comments.filter((c) => c.postId === post.id)
  const replies = await generateForumReplies(post, picked, existing, instruction)
  if (!replies) return
  const forum = useForum.getState()
  for (const r of replies) {
    const actor = picked.find((p) => p.key === r.authorKey)
    if (!actor) continue
    forum.addComment({ postId: post.id, parentId: null, author: actor.author, content: r.content })
    if (actor.author.type === 'npc') {
      const npc = forum.npcs.find((n) => n.id === actor.author.id)
      if (npc) forum.updateNpc(npc.id, { familiarity: Math.min(100, npc.familiarity + 2) })
    }
    await delay(800 + Math.random() * 1200)
  }
  if (post.author.type === 'user') {
    const circle = forum.circles.find((c) => c.id === post.circleId)
    notify({
      kind: 'forum-comment',
      title: '帖子有了新回复',
      body: `${circle?.name ?? ''}：${replies[0]?.content.slice(0, 30) ?? ''}`,
      target: { app: 'forum', payload: { view: 'post', id: post.id } },
    })
  }
}

async function ambientPost(): Promise<void> {
  const forum = useForum.getState()
  const circles = forum.circles.filter((c) => c.memberCharacterIds.length + c.memberNpcIds.length > 0)
  if (circles.length === 0) return
  const circle = circles[Math.floor(Math.random() * circles.length)]
  const members = circleMembers(circle.id)
  if (members.length === 0) return
  const actor = members[Math.floor(Math.random() * members.length)]
  const recent = forum.posts
    .filter((p) => p.circleId === circle.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((p) => p.title || p.content.slice(0, 16))
  const styles: AmbientStyle[] = ['normal', 'normal', 'twitter', 'insta', 'event', 'rule', 'fanfic', 'poll']
  const style = styles[Math.floor(Math.random() * styles.length)]
  const playStyle = style === 'poll' ? 'event' : style
  const gen = await generateForumPost(actor.author, circle, playStyle, recent)
  if (!gen) return
  const post = useForum.getState().addPost({
    circleId: circle.id,
    author: actor.author,
    title: gen.title,
    content: gen.content,
    imageIds: [],
    imageDesc: style === 'insta' ? gen.imageDesc : '',
    tags: gen.tags,
    playStyle,
    threadParts: style === 'twitter' ? gen.threadParts : [],
    quoteOf: null,
    fanficMeta: gen.fanfic,
    type: style === 'poll' || style === 'event' ? 'poll' : style === 'insta' ? 'image' : 'text',
    poll:
      style === 'poll' || style === 'event'
        ? { options: gen.pollOptions.length >= 2 ? gen.pollOptions : ['继续观望', '直接介入'], multi: false, deadline: null, votes: {} }
        : null,
    relay: null,
    anonymous: false,
  })
  const key = `${actor.author.type}:${actor.author.id}`
  if (useForum.getState().following.includes(key)) {
    notify({
      kind: 'forum-post',
      title: `${actor.name} 发布了新帖`,
      body: (gen.title || gen.content).slice(0, 36),
      target: { app: 'forum', payload: { view: 'post', id: post.id } },
    })
  }
}

async function ambientMoment(): Promise<void> {
  const chars = useCharacters.getState().characters
  if (chars.length === 0) return
  const c = chars[Math.floor(Math.random() * chars.length)]
  const gen = await generateMomentContent(characterAuthor(c))
  const content = gen?.content || pickFallbackMoment(c.name)
  useMoments.getState().addCharacterMoment({
    author: { type: 'character', id: c.id, name: c.name },
    content,
    imageIds: [],
    visibility: 'all',
    visibleIds: [],
    music: null,
  })
  if (useForum.getState().following.includes(`character:${c.id}`)) {
    notify({ kind: 'moment-post', title: '朋友圈', body: `${c.name}：${content.slice(0, 30)}`, target: { app: 'moments' } })
  }
}

async function ambientLike(): Promise<void> {
  const forum = useForum.getState()
  const myPosts = forum.posts.filter((p) => p.author.type === 'user' && Date.now() - p.createdAt < 86400_000)
  const targets: { post: ForumPost; member: Member }[] = []
  for (const p of myPosts) {
    for (const m of circleMembers(p.circleId)) {
      if (m.key === 'user:user') continue
      targets.push({ post: p, member: m })
    }
  }
  if (targets.length === 0) return
  const t = targets[Math.floor(Math.random() * targets.length)]
  useForum.getState().updatePost(t.post.id, { upvotes: t.post.upvotes + 1 })
  useForum.getState().bumpKarma('post', 1)
  notify({
    kind: 'forum-like',
    title: '帖子被赞',
    body: `${t.member.name} 赞了你的帖子`,
    target: { app: 'forum', payload: { view: 'post', id: t.post.id } },
  })
}

async function ambientDm(): Promise<void> {
  const forum = useForum.getState()
  const chars = useCharacters.getState().characters
  const candidates = chars.filter(
    (c) => forum.following.includes(`character:${c.id}`) || forum.dms.some((d) => d.partner.type === 'character' && d.partner.id === c.id)
  )
  if (candidates.length === 0) return
  const c = candidates[Math.floor(Math.random() * candidates.length)]
  const author = characterAuthor(c)
  const dmId = useForum.getState().ensureDm(author, false)
  const dm = useForum.getState().dms.find((d) => d.id === dmId)
  if (!dm) return
  const reply = await generateDmReply(dm, authorPersona(author))
  if (!reply) return
  useForum.getState().addDmMessage(dmId, { from: 'them', content: reply, imageId: null, stickerId: null, sharedPostId: null })
  notify({
    kind: 'dm',
    title: `${c.name} 私信`,
    body: reply.slice(0, 40),
    target: { app: 'forum', payload: { view: 'dm', id: dmId } },
  })
}
