import type { ForumAuthor, ForumPost } from '../store/forum'
import { useForum } from '../store/forum'
import { useCharacters } from '../store/characters'
import { getDefaultChatPreset } from '../store/apiPresets'
import { useNotifications, type AppNotification } from '../store/notifications'
import { useSettings } from '../store/settings'
import {
  generateForumPost,
  generateForumReplies,
  generateDmReply,
  authorPersona,
  characterAuthor,
  npcAuthor,
} from './forumEngine'
import { splitReply } from './chatEngine'

let running = false
const lastAt: Record<string, number> = {}

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

export interface ForumTickResult {
  ok: boolean
  reason?: 'no-api' | 'no-actors'
}

// 确保论坛有一个可用的圈子：没有任何圈子时自动创建默认圈子并加入全部角色
function ensureDefaultCircle(): boolean {
  const forum = useForum.getState()
  if (forum.circles.length > 0) return true
  const chars = useCharacters.getState().characters
  if (chars.length === 0) return false
  forum.createCircle({
    name: '日常闲聊',
    description: '大家随便聊聊的公共圈子',
    coverId: null,
    isPrivate: false,
    rules: '',
    ownerId: 'user',
    memberCharacterIds: chars.map((c) => c.id),
    memberNpcIds: [],
    userJoined: true,
  })
  return true
}

export async function runForumTick(opts?: { force?: boolean }): Promise<ForumTickResult> {
  if (running) return { ok: true }
  const preset = getDefaultChatPreset()
  if (!preset?.baseUrl) return { ok: false, reason: 'no-api' }
  if (!ensureDefaultCircle()) return { ok: false, reason: 'no-actors' }
  running = true
  try {
    await tickInner(opts?.force ?? false)
    return { ok: true }
  } catch {
    // 单轮调度失败静默处理
    return { ok: true }
  } finally {
    running = false
  }
}

async function tickInner(force: boolean): Promise<void> {
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

  // 3) 随机生态（用户手动刷新时强制产出一个新帖，避免刷新无反应）
  if (force) {
    await ambientPost()
    return
  }
  const roll = Math.random()
  if (roll < 0.4 && cooled('post', 4 * 60_000, 8 * 60_000)) {
    await ambientPost()
  } else if (roll < 0.55 && cooled('like', 3 * 60_000, 6 * 60_000)) {
    await ambientLike()
  } else if (roll < 0.7 && cooled('dm', 10 * 60_000, 20 * 60_000)) {
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
