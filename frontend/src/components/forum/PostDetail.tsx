import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowBigUp, ArrowBigDown, Star, Share2, RefreshCw, Flag, CornerDownRight, Lock, BadgeCheck, Pin, MessageSquare, Send, Scissors, Ban } from 'lucide-react'
import { useForum, type ForumComment, type ForumPost } from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { Modal } from '../common'
import { AuthorAvatar, VoteButtons, PostImages, TimeAgo, fmtCount, EmptyBlock, pollPercent } from './shared'
import { circleMembersFor } from '../../lib/members'

interface Props {
  post: ForumPost
  onBack: () => void
  onQuote: (post: ForumPost) => void
  onOpenDm: (dmId: string) => void
}

export default function PostDetail({ post, onBack, onQuote, onOpenDm }: Props) {
  const comments = useForum((s) => s.comments)
  const addComment = useForum((s) => s.addComment)
  const votePost = useForum((s) => s.votePost)
  const voteComment = useForum((s) => s.voteComment)
  const favoritePost = useForum((s) => s.favoritePost)
  const sharePost = useForum((s) => s.sharePost)
  const bumpKarma = useForum((s) => s.bumpKarma)
  const updatePost = useForum((s) => s.updatePost)
  const removePost = useForum((s) => s.removePost)
  const removeComment = useForum((s) => s.removeComment)
  const toggleBlockNpc = useForum((s) => s.toggleBlockNpc)
  const push = useToast((s) => s.push)

  const [replyText, setReplyText] = useState('')
  const [replyTo, setReplyTo] = useState<ForumComment | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const myComments = useMemo(() => comments.filter((c) => c.postId === post.id).sort((a, b) => a.createdAt - b.createdAt), [comments, post.id])
  const roots = myComments.filter((c) => !c.parentId)

  const sendReply = () => {
    const text = replyText.trim()
    if (!text) return
    if (post.locked) {
      push('帖子已被封，无法回复', 'error')
      return
    }
    addComment({ postId: post.id, parentId: replyTo?.id ?? null, author: { type: 'user', id: 'user', name: '', avatarId: null }, content: text })
    setReplyText('')
    setReplyTo(null)
  }

  const towerRefresh = async () => {
    if (post.locked) {
      push('帖子已被封，无法盖楼', 'error')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const { generateForumReplies } = await import('../../lib/forumEngine')
      const members = circleMembersFor(post.circleId, `${post.author.type}:${post.author.id}`)
      if (members.length === 0) {
        push('圈子里还没有可回应的角色或 NPC，先去邀请成员', 'error')
        return
      }
      const picked = members.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 4))
      const replies = await generateForumReplies(post, picked, myComments)
      if (!replies) {
        push('生成失败，请检查 设置 → API 配置', 'error')
        return
      }
      const store = useForum.getState()
      for (const r of replies) {
        const actor = picked.find((p) => p.key === r.authorKey)
        if (!actor) continue
        store.addComment({ postId: post.id, parentId: null, author: actor.author, content: r.content })
      }
      if (post.author.type === 'user' && Math.random() < 0.5) {
        const cur = useForum.getState().posts.find((x) => x.id === post.id)
        store.updatePost(post.id, { upvotes: (cur?.upvotes ?? 0) + 1 })
        store.bumpKarma('post', 1)
      }
      push(`盖楼成功，新增 ${replies.length} 条回复`)
    } finally {
      setBusy(false)
    }
  }

  const relayContinue = () => {
    const text = replyText.trim()
    if (!text || !post.relay) return
    const parts = [...post.relay.parts, { authorKey: 'user:user', authorName: '我', text, time: Date.now() }]
    updatePost(post.id, { relay: { ...post.relay, parts } })
    setReplyText('')
    push('已接力，等着下一位接棒')
  }

  const castVote = (idx: number) => {
    if (!post.poll) return
    if (post.poll.deadline && Date.now() > post.poll.deadline) {
      push('投票已截止', 'error')
      return
    }
    const votes = { ...post.poll.votes }
    const mine = votes['user'] ?? []
    votes['user'] = post.poll.multi ? (mine.includes(idx) ? mine.filter((x) => x !== idx) : [...mine, idx]) : mine.includes(idx) ? [] : [idx]
    updatePost(post.id, { poll: { ...post.poll, votes } })
  }

  const report = (target: string) => push(`已举报${target}，感谢维护社区环境`)
  const totalVotes = post.poll ? Object.values(post.poll.votes).reduce((n, arr) => n + arr.length, 0) : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 6 }}>
          <ChevronLeft size={20} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>帖子详情</span>
        {post.author.type === 'user' && (
          <button
            className="pressable"
            onClick={() => {
              removePost(post.id)
              push('帖子已删除')
              onBack()
            }}
            style={{ color: '#ff8a8a', padding: 6 }}
            title="删除帖子"
          >
            <Scissors size={16} />
          </button>
        )}
        <button className="pressable" onClick={towerRefresh} disabled={busy} style={{ color: 'var(--text-secondary)', padding: 6 }} title="刷新盖楼">
          <RefreshCw size={17} className={busy ? 'spin' : ''} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 120px' }}>
        <div className="glass" style={{ borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <AuthorAvatar author={post.author} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{post.author.name}</span>
                {post.anonymous && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>匿名马甲</span>}
              </div>
              <TimeAgo t={post.createdAt} />
            </div>
            {post.pinned && <Pin size={14} color="var(--accent)" />}
            {post.essence && <BadgeCheck size={15} color="var(--accent)" />}
            {post.locked && <Lock size={14} color="#ff8a8a" />}
          </div>

          {post.title && <div className="fs-h1" style={{ color: 'var(--text-primary)', marginTop: 10, lineHeight: 1.4 }}>{post.title}</div>}
          <div className="fs-body" style={{ color: 'var(--text-body)', marginTop: 8, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.content}</div>

          {post.threadParts.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {post.threadParts.map((part, i) => (
                <div key={i} style={{ borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: 10 }}>
                  <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{i + 2}/</span>
                  <span className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.6 }}>{part}</span>
                </div>
              ))}
            </div>
          )}

          <PostImages imageIds={post.imageIds} desc={post.imageDesc || undefined} />

          {post.fanficMeta && (
            <div className="fs-micro" style={{ marginTop: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              【同人文】大纲：{post.fanficMeta.outline || '未填'} · CP：{post.fanficMeta.cp || '未填'} · 字数：{post.fanficMeta.words || '未填'} · 文风：{post.fanficMeta.style || '未填'} · 结局：{post.fanficMeta.ending || '未填'}
            </div>
          )}
          {post.playStyle === 'rule' && (
            <div className="fs-micro" style={{ marginTop: 10, color: 'var(--text-tertiary)' }}>规则怪谈：评论区提问推理，楼主不直接说谎但可以误导</div>
          )}

          {post.poll && (
            <div style={{ marginTop: 12 }}>
              {post.poll.options.map((o, i) => {
                const pct = pollPercent(post, i)
                const mine = (post.poll?.votes['user'] ?? []).includes(i)
                return (
                  <button
                    key={i}
                    className="pressable"
                    onClick={() => castVote(i)}
                    style={{ position: 'relative', width: '100%', marginBottom: 6, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', textAlign: 'left', border: mine ? '1px solid var(--accent)' : '1px solid transparent' }}
                  >
                    <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(255,255,255,0.12)' }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', padding: '0 12px' }}>
                      <span className="fs-aux" style={{ color: mine ? 'var(--accent)' : 'var(--text-body)' }}>{o}{mine ? ' ✓' : ''}</span>
                      <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
                    </div>
                  </button>
                )
              })}
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                {totalVotes} 人投票{post.poll.multi ? ' · 多选' : ''}
                {post.poll.deadline ? ` · 截止 ${new Date(post.poll.deadline).toLocaleDateString()}` : ''}
              </div>
            </div>
          )}

          {post.relay && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (post.relay.parts.length / Math.max(1, post.relay.target)) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>接力进度 {post.relay.parts.length}/{post.relay.target}</span>
              </div>
              {post.relay.rules && <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>规则：{post.relay.rules}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {post.relay.parts.map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
                    <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{i + 1}. {p.authorName}</span>
                    <div className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.6 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.tags.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {post.tags.map((t) => (
                <span key={t} className="fs-micro" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '3px 10px' }}>#{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            <VoteButtons post={post} onVote={(v) => votePost(post.id, v)} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
              <MessageSquare size={14} /> <span className="fs-micro">{myComments.length}</span>
            </span>
            <button className="pressable" onClick={() => favoritePost(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: post.myFavorite ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              <Star size={14} fill={post.myFavorite ? 'var(--accent)' : 'none'} /> <span className="fs-micro">{fmtCount(post.favorites)}</span>
            </button>
            <button className="pressable" onClick={() => { sharePost(post.id); setShareOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
              <Share2 size={14} /> <span className="fs-micro">{fmtCount(post.shares)}</span>
            </button>
            <button className="pressable" onClick={() => onQuote(post)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
              <CornerDownRight size={14} /> <span className="fs-micro">引用转发</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 2px 8px' }}>
          <span className="fs-aux" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>评论 {myComments.length}</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm pressable" onClick={towerRefresh} disabled={busy}>
            <RefreshCw size={13} className={busy ? 'spin' : ''} /> 刷新盖楼
          </button>
        </div>

        {roots.length === 0 ? (
          <EmptyBlock text="还没有评论。写一条，或点「刷新盖楼」让圈子里的角色与 NPC 来聊聊" />
        ) : (
          roots.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              all={myComments}
              depth={1}
              onReply={() => setReplyTo(c)}
              onVote={voteComment}
              onReport={report}
              onBlockNpc={(id) => {
                toggleBlockNpc(id)
                push('已拉黑该 NPC，TA 不会再出现在你的圈子里')
              }}
              onRemoveMy={() => {
                removeComment(c.id)
                push('评论已删除')
              }}
            />
          ))
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px 16px', background: 'linear-gradient(to top, var(--bg-primary) 70%, transparent)' }}>
        {post.relay ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="写下你的接力…" maxLength={80} />
            <button className="btn btn-accent pressable" style={{ padding: '0 16px' }} onClick={relayContinue}>
              <Send size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {replyTo && (
              <button className="pressable" onClick={() => setReplyTo(null)} style={{ color: 'var(--text-tertiary)', fontSize: 'calc(11px * var(--fs-scale))', whiteSpace: 'nowrap' }}>
                回复 {replyTo.author.name} ✕
              </button>
            )}
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendReply()} placeholder={post.locked ? '帖子已被封' : replyTo ? `回复 @${replyTo.author.name}…` : '写下回复…'} disabled={post.locked} maxLength={500} />
            <button className="btn btn-accent pressable" style={{ padding: '0 16px' }} onClick={sendReply} disabled={post.locked}>
              <Send size={15} />
            </button>
          </div>
        )}
      </div>

      {shareOpen && (
        <ShareSheet
          post={post}
          onClose={() => setShareOpen(false)}
          onForward={(dmId) => {
            setShareOpen(false)
            onOpenDm(dmId)
          }}
        />
      )}
    </div>
  )
}

function CommentNode({
  comment,
  all,
  depth,
  onReply,
  onVote,
  onReport,
  onBlockNpc,
  onRemoveMy,
}: {
  comment: ForumComment
  all: ForumComment[]
  depth: number
  onReply: () => void
  onVote: (id: string, v: 1 | -1) => void
  onReport: (target: string) => void
  onBlockNpc: (npcId: string) => void
  onRemoveMy: () => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const children = all.filter((c) => c.parentId === comment.id)
  const isNpc = comment.author.type === 'npc'
  return (
    <div style={{ marginLeft: depth > 1 ? 18 : 0, paddingLeft: depth > 1 ? 10 : 0, borderLeft: depth > 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <AuthorAvatar author={comment.author} size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="fs-micro" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{comment.author.name}</span>
            <TimeAgo t={comment.createdAt} />
          </div>
          <div className="fs-body" style={{ color: 'var(--text-body)', marginTop: 3, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{comment.content}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button className="pressable" onClick={() => onVote(comment.id, 1)} style={{ display: 'flex', alignItems: 'center', gap: 3, color: comment.myVote === 1 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              <ArrowBigUp size={13} fill={comment.myVote === 1 ? 'var(--accent)' : 'none'} /> <span className="fs-micro">{fmtCount(comment.upvotes)}</span>
            </button>
            <button className="pressable" onClick={() => onVote(comment.id, -1)} style={{ display: 'flex', alignItems: 'center', gap: 3, color: comment.myVote === -1 ? '#ff8a8a' : 'var(--text-tertiary)' }}>
              <ArrowBigDown size={13} fill={comment.myVote === -1 ? '#ff8a8a' : 'none'} />
            </button>
            {depth < 3 && (
              <button className="pressable" onClick={onReply} style={{ color: 'var(--text-tertiary)' }}>
                <span className="fs-micro">回复</span>
              </button>
            )}
            <button className="pressable" onClick={() => onReport(`@${comment.author.name} 的评论`)} style={{ color: 'var(--text-disabled)' }} title="举报">
              <Flag size={11} />
            </button>
            {isNpc && (
              <button className="pressable" onClick={() => onBlockNpc(comment.author.id)} style={{ color: 'var(--text-disabled)' }} title="拉黑该 NPC">
                <Ban size={11} />
              </button>
            )}
            {comment.author.type === 'user' && (
              <button className="pressable" onClick={onRemoveMy} style={{ color: 'var(--text-disabled)' }} title="删除">
                <Scissors size={11} />
              </button>
            )}
          </div>

          {children.length > 0 && (
            <>
              <button className="pressable" onClick={() => setExpanded((v) => !v)} style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>
                <span className="fs-micro">{expanded ? '收起回复' : `展开 ${children.length} 条回复`}</span>
                <ChevronRight size={10} style={{ transform: expanded ? 'rotate(90deg)' : 'none', verticalAlign: 'middle' }} />
              </button>
              {expanded &&
                children.map((child) => (
                  <CommentNode key={child.id} comment={child} all={all} depth={depth + 1} onReply={() => onReply()} onVote={onVote} onReport={onReport} onBlockNpc={onBlockNpc} onRemoveMy={onRemoveMy} />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareSheet({ post, onClose, onForward }: { post: ForumPost; onClose: () => void; onForward: (dmId: string) => void }) {
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const dms = useForum((s) => s.dms)
  const ensureDm = useForum((s) => s.ensureDm)
  const addDmMessage = useForum((s) => s.addDmMessage)
  const push = useToast((s) => s.push)

  const forward = (type: 'character' | 'npc', id: string, name: string, avatarId: string | null) => {
    const dmId = ensureDm({ type, id, name, avatarId }, false)
    addDmMessage(dmId, { from: 'user', content: '', imageId: null, stickerId: null, sharedPostId: post.id })
    push(`已转发给 ${name}，等 TA 的反应`)
    onForward(dmId)
  }

  return (
    <Modal open onClose={onClose} title="转发到私信">
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {characters.length + npcs.length === 0 && <EmptyBlock text="还没有可私信的对象。先创建角色或 NPC" />}
        {characters.map((c) => {
          const dm = dms.find((d) => d.partner.type === 'character' && d.partner.id === c.id)
          return (
            <button key={c.id} className="pressable" onClick={() => forward('character', c.id, c.name, c.avatarId)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', textAlign: 'left' }}>
              <AuthorAvatar author={{ type: 'character', id: c.id, name: c.name, avatarId: c.avatarId }} size={34} />
              <div style={{ flex: 1 }}>
                <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                {dm && <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{dm.messages.length} 条私信</div>}
              </div>
              <ChevronRight size={14} color="var(--text-disabled)" />
            </button>
          )
        })}
        {npcs.map((n) => (
          <button key={n.id} className="pressable" onClick={() => forward('npc', n.id, n.name, n.avatarId)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', textAlign: 'left' }}>
            <AuthorAvatar author={{ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }} size={34} />
            <div style={{ flex: 1 }}>
              <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{n.name}</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>NPC</div>
            </div>
            <ChevronRight size={14} color="var(--text-disabled)" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
