import { useMemo, useState } from 'react'
import { Heart, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { useSocial, ME, type SocialCharacter } from '../../store/social'
import { useToast } from '../../store/ui'
import { EmptyHint, Pill, Sheet, SocialAvatar } from './SocialParts'

/* 「mu社区恋爱交友软件」· 动态 Tab */

type FeedMode = 'recommend' | 'following' | 'latest'

const MODES: { key: FeedMode; label: string }[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'following', label: '关注' },
  { key: 'latest', label: '最新' },
]

const EMOJIS = ['🌆', '🍜', '🐱', '🎧', '📷', '☕', '🌙', '🏃']

function relativeTime(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

export default function FeedTab({ onOpenCard }: { onOpenCard: (charId: string) => void }) {
  const posts = useSocial((s) => s.posts)
  const characters = useSocial((s) => s.characters)
  const following = useSocial((s) => s.following)
  const profile = useSocial((s) => s.profile)
  const toggleLike = useSocial((s) => s.toggleLike)
  const toggleFollow = useSocial((s) => s.toggleFollow)
  const addComment = useSocial((s) => s.addComment)
  const removePost = useSocial((s) => s.removePost)
  const addPost = useSocial((s) => s.addPost)
  const push = useToast((s) => s.push)

  const [mode, setMode] = useState<FeedMode>('recommend')
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [composing, setComposing] = useState(false)
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const charById = useMemo(() => {
    const m = new Map<string, SocialCharacter>()
    for (const c of characters) m.set(c.id, c)
    return m
  }, [characters])

  const list = useMemo(() => {
    if (mode === 'latest') return [...posts].sort((a, b) => b.timestamp - a.timestamp)
    if (mode === 'following') {
      return posts.filter((p) => p.authorId === ME || following.includes(p.authorId)).sort((a, b) => b.timestamp - a.timestamp)
    }
    // 推荐：亲密度分档（我的帖子视为 100），同档按时间倒序
    const tierOf = (authorId: string) => Math.floor((authorId === ME ? 100 : charById.get(authorId)?.affinity ?? 0) / 10)
    return [...posts].sort((a, b) => {
      const ta = tierOf(a.authorId)
      const tb = tierOf(b.authorId)
      if (ta !== tb) return tb - ta
      return b.timestamp - a.timestamp
    })
  }, [posts, mode, following, charById])

  const nameOf = (authorId: string) => (authorId === ME ? profile.nickname : charById.get(authorId)?.nickname ?? '神秘人')
  const avatarOf = (authorId: string) => (authorId === ME ? profile.avatar : charById.get(authorId)?.avatar ?? '👤')

  const toggleComments = (id: string) => setOpenComments((o) => ({ ...o, [id]: !o[id] }))

  const submitComment = (id: string) => {
    const value = (drafts[id] ?? '').trim()
    if (!value) return
    addComment(id, ME, value)
    setDrafts((d) => ({ ...d, [id]: '' }))
  }

  const toggleEmoji = (emoji: string) =>
    setPicked((p) => (p.includes(emoji) ? p.filter((x) => x !== emoji) : p.length >= 4 ? p : [...p, emoji]))

  const publish = () => {
    const content = text.trim()
    if (!content) return
    addPost(content, picked)
    push('已发布')
    setText('')
    setPicked([])
    setComposing(false)
  }

  return (
    <>
      <div className="fx-tabs" style={{ paddingBottom: 8 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`fx-tab fx-press-soft${mode === m.key ? ' fx-tab--active' : ''}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="fx-scroll">
        {list.length === 0 ? (
          <EmptyHint>{mode === 'following' ? '还没有关注的人，去推荐里认识几个吧' : '还没有动态，点右下角发布第一条吧'}</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((post) => {
              const isMine = post.authorId === ME
              const char = isMine ? undefined : charById.get(post.authorId)
              const liked = post.likes.includes(ME)
              const commentsOpen = !!openComments[post.id]
              const isFollowed = following.includes(post.authorId)
              return (
                <div key={post.id} className="sc-post">
                  <div className="sc-post__head">
                    <SocialAvatar
                      emoji={avatarOf(post.authorId)}
                      size={38}
                      status={char?.onlineStatus}
                      onClick={isMine ? undefined : () => onOpenCard(post.authorId)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'calc(13.5px * var(--fs-scale))', fontWeight: 600, color: 'var(--fx-t1)' }}>
                        {nameOf(post.authorId)}
                      </div>
                      <div className="sc-sub">{relativeTime(post.timestamp)}</div>
                    </div>
                    {isMine ? (
                      <button
                        className="fx-press-soft"
                        onClick={() => {
                          removePost(post.id)
                          push('已删除')
                        }}
                        title="删除"
                        style={{ background: 'none', border: 0, color: 'var(--fx-t3)', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : !isFollowed ? (
                      <Pill onClick={() => toggleFollow(post.authorId)}>关注</Pill>
                    ) : null}
                  </div>

                  <div className="sc-post__text">{post.content}</div>

                  {post.images.length > 0 && (
                    <div className="sc-post__grid">
                      {post.images.slice(0, 4).map((img, i) => (
                        <span key={i}>{img}</span>
                      ))}
                    </div>
                  )}

                  <div className="sc-post__acts">
                    <button
                      className={`sc-act fx-press-soft${liked ? ' sc-act--on' : ''}`}
                      onClick={() => toggleLike(post.id, ME)}
                    >
                      <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {post.likes.length}
                    </button>
                    <button
                      className={`sc-act fx-press-soft${commentsOpen ? ' sc-act--on' : ''}`}
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageCircle size={15} /> {post.comments.length}
                    </button>
                  </div>

                  {post.comments.length > 0 && (
                    <div className="sc-comment">
                      {post.comments.map((c) => (
                        <div key={c.id} className="sc-comment__row">
                          <span className="sc-comment__who">{nameOf(c.authorId)}</span>：{c.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {commentsOpen && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                      <input
                        className="fx-input"
                        value={drafts[post.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitComment(post.id)
                        }}
                        placeholder="说点什么…"
                        style={{ flex: 1, minHeight: 40 }}
                      />
                      <button
                        className="fx-btn fx-btn--accent fx-press"
                        onClick={() => submitComment(post.id)}
                        style={{ minHeight: 40, padding: '0 14px' }}
                      >
                        发送
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button className="sc-fab fx-press" onClick={() => setComposing(true)} title="发布动态">
        <Plus size={24} />
      </button>

      <Sheet open={composing} onClose={() => setComposing(false)} title="发布动态">
        <textarea
          className="fx-textarea"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="分享此刻的心情…"
        />
        <div className="sc-sub" style={{ margin: '12px 0 8px' }}>
          配图（最多 4 张）
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={`sc-pill fx-press-soft${picked.includes(emoji) ? ' sc-pill--on' : ''}`}
              onClick={() => toggleEmoji(emoji)}
              style={{ border: 0, cursor: 'pointer', fontSize: 18, padding: '4px 10px' }}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          className="fx-btn fx-btn--accent fx-press"
          disabled={!text.trim()}
          onClick={publish}
          style={{ width: '100%', marginTop: 16 }}
        >
          发布
        </button>
      </Sheet>
    </>
  )
}