import { useState } from 'react'
import { Bookmark, Heart, MapPin, MessageCircle, Repeat2, Send, Sparkles, Eye } from 'lucide-react'
import { ME_ID, personById, useMulCity, type MicroblogPost } from '../../store/mulCity'
import { Avatar, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Mul市 · 微博零件
   帖子卡片（信息流 / 详情 / 主页 / 社群通用）
   ============================================================ */

/** 把 #话题# 与 @人名 渲染成高亮片段 */
export function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  const re = /(#([^#\s]+)#)|(@[\u4e00-\u9fa5A-Za-z0-9_]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1]) {
      nodes.push(
        <span key={k++} className="cx-mb-tag">
          {m[1]}
        </span>
      )
    } else {
      nodes.push(
        <span key={k++} className="cx-mb-mention">
          {m[0]}
        </span>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes}</>
}

export function MicroPostCard({ post, onOpen, compact }: { post: MicroblogPost; onOpen?: () => void; compact?: boolean }) {
  const people = useMulCity((s) => s.people)
  const following = useMulCity((s) => s.microblog.following)
  const toggleLike = useMulCity((s) => s.toggleMicroblogLike)
  const toggleBookmark = useMulCity((s) => s.toggleMicroblogBookmark)
  const repost = useMulCity((s) => s.repostMicroblog)
  const vote = useMulCity((s) => s.votePoll)
  const view = useMulCity((s) => s.viewMicroblog)
  const assistants = useMulCity((s) => s.microblog.assistantComments)
  const posts = useMulCity((s) => s.microblog.posts)
  const nav = useCityNav()
  const [revealed, setRevealed] = useState(false)
  const [burst, setBurst] = useState(false)

  const author = personById(people, post.authorId)
  if (!author) return null
  const liked = post.likes.includes(ME_ID)
  const bookmarked = post.bookmarks.includes(ME_ID)
  const isFollowing = following.includes(post.authorId)
  const quoted = post.repostOf ? posts.find((p) => p.id === post.repostOf) : undefined
  const quotedAuthor = quoted ? personById(people, quoted.authorId) : null
  const assistant = assistants.find((a) => a.postId === post.id)
  const totalVotes = post.poll?.reduce((n, o) => n + o.votes.length, 0) ?? 0

  const open = () => {
    view(post.id)
    if (onOpen) onOpen()
    else nav.push({ view: 'post', id: post.id })
  }

  const masked = post.isSensitive && !revealed

  return (
    <div className={`cx-mb-post ${compact ? 'cx-mb-post--compact' : ''}`}>
      <button className="cx-mb-post__head" onClick={() => nav.push({ view: 'profile', id: post.authorId })}>
        <Avatar person={author} size={40} showOnline />
        <span className="cx-mb-post__id">
          <span className="cx-mb-post__name">
            {post.isAnonymous ? '匿名居民' : author.name}
            {isFollowing && <span className="cx-tag cx-tag--on">互关</span>}
          </span>
          <span className="cx-mb-post__meta">
            @{post.isAnonymous ? 'anonymous' : author.nickname} · {fmtWhen(post.createdAt)}
            {post.location && (
              <>
                {' '}
                <MapPin size={10} /> {post.location}
              </>
            )}
          </span>
        </span>
      </button>

      {post.type === 'repost' && !post.repostOf && <div className="cx-mb-post__flag">转推</div>}

      {masked ? (
        <button className="cx-mb-mask" onClick={() => setRevealed(true)}>
          该内容被标记为敏感，点击查看
        </button>
      ) : (
        <>
          {post.content && (
            <div className="cx-mb-post__body" onClick={open}>
              <RichText text={post.content} />
            </div>
          )}

          {quoted && (
            <div className="cx-mb-quote" onClick={() => nav.push({ view: 'post', id: quoted.id })}>
              <div className="cx-mb-quote__name">@{quotedAuthor?.name ?? '居民'}</div>
              <div className="cx-mb-quote__text">{quoted.content}</div>
            </div>
          )}

          {post.images.length > 0 && (
            <div className={`cx-mb-media cx-mb-media--${Math.min(post.images.length, 9)}`} onClick={open}>
              {post.images.slice(0, 9).map((img, i) =>
                img ? <img key={i} src={img} alt="" /> : <span key={i} className="cx-mb-media__ph" />
              )}
            </div>
          )}

          {post.poll && (
            <div className="cx-mb-poll">
              {post.poll.map((o) => {
                const pct = totalVotes ? Math.round((o.votes.length / totalVotes) * 100) : 0
                const mine = o.votes.includes(ME_ID)
                return (
                  <button key={o.id} className={`cx-mb-poll__opt ${mine ? 'cx-mb-poll__opt--on' : ''}`} onClick={() => vote(post.id, o.id)}>
                    <span className="cx-mb-poll__fill" style={{ width: `${pct}%` }} />
                    <span className="cx-mb-poll__text">{o.text}</span>
                    <b>{pct}%</b>
                  </button>
                )
              })}
              <div className="cx-mb-poll__foot">{totalVotes} 人参与</div>
            </div>
          )}

          {assistant && (
            <div className="cx-mb-assistant">
              <Sparkles size={12} /> {assistant.text}
            </div>
          )}

          <div className="cx-mb-acts">
            <button
              className={`cx-mb-act ${liked ? 'cx-mb-act--like' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleLike(post.id)
                if (!liked) {
                  setBurst(true)
                  window.setTimeout(() => setBurst(false), 620)
                }
              }}
            >
              <Heart size={15} fill={liked ? 'currentColor' : 'none'} className={burst ? 'cx-mb-heart-burst' : ''} />
              {post.likes.length || ''}
            </button>
            <button className="cx-mb-act" onClick={open}>
              <MessageCircle size={15} /> {post.comments.length || ''}
            </button>
            <button className="cx-mb-act" onClick={() => repost(post.id)}>
              <Repeat2 size={15} /> {post.reposts.length || ''}
            </button>
            <button className={`cx-mb-act ${bookmarked ? 'cx-mb-act--on' : ''}`} onClick={() => toggleBookmark(post.id)}>
              <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? '已收藏' : '收藏'}
            </button>
            <span className="cx-mb-act cx-mb-act--static">
              <Eye size={14} /> {post.views}
            </span>
            <button className="cx-mb-act" onClick={() => nav.goTab('microblog')} title="分享到 Mul市朋友圈">
              <Send size={14} /> 分享
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default MicroPostCard
