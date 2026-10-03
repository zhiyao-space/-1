import { useMemo, useState } from 'react'
import { ArrowBigDown, ArrowBigUp, Star, MessageSquare, Share2, BadgeCheck, Eye } from 'lucide-react'
import { useForum, heatOf, type ForumAuthor, type ForumPost } from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useSettings } from '../../store/settings'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import { useToast } from '../../store/ui'

export function useAuthorDisplay(a: ForumAuthor): { name: string; url: string | null; sub: string } {  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const aliases = useForum((s) => s.aliases)
  const phoneName = useSettings((s) => s.phoneName)
  return useMemo(() => {
    if (a.type === 'user') return { name: phoneName || '我', url: null, sub: 'UP主' }
    if (a.type === 'character') {
      const c = characters.find((x) => x.id === a.id)
      return { name: a.name, url: null, sub: c?.identity || '角色' }
    }
    if (a.type === 'npc') {
      const n = npcs.find((x) => x.id === a.id)
      return { name: a.name, url: null, sub: n ? n.persona.slice(0, 14) || '路人' : '路人' }
    }
    const alias = aliases.find((x) => `alias:${x.name}` === a.id)
    return { name: a.name, url: null, sub: alias ? '马甲' : '匿名' }
  }, [a, characters, npcs, aliases, phoneName])
}

export function useAuthorAvatarId(a: ForumAuthor): string | null {
  const charAvatarId = useCharacters((s) => (a.type === 'character' ? s.characters.find((c) => c.id === a.id)?.avatarId ?? null : null))
  const npcAvatarId = useForum((s) => (a.type === 'npc' ? s.npcs.find((n) => n.id === a.id)?.avatarId ?? null : null))
  const userAvatarId = useForum((s) => (a.type === 'user' ? s.profile.avatarId : null))
  if (a.type === 'character') return charAvatarId
  if (a.type === 'npc') return npcAvatarId
  if (a.type === 'user') return userAvatarId
  return null
}

export function AuthorAvatar({ author, size = 36 }: { author: ForumAuthor; size?: number }) {
  const info = useAuthorDisplay(author)
  const avatarId = useAuthorAvatarId(author)
  const url = useBlobURL(avatarId)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>{info.name.slice(0, 1)}</span>
      )}
    </div>
  )
}

export function fmtCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

export function fmtAgo(t: number): string {
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

export function TimeAgo({ t }: { t: number }) {
  return <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{fmtAgo(t)}</span>
}

export function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="page-enter" style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div className="fs-body" style={{ color: 'var(--text-tertiary)', lineHeight: 1.9 }}>{text}</div>
    </div>
  )
}

export function PostImages({ imageIds, desc, compact }: { imageIds: string[]; desc?: string; compact?: boolean }) {
  const [viewer, openViewer] = useImageViewer()
  const [showDesc, setShowDesc] = useState(false)
  return (
    <>
      {imageIds.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: imageIds.length === 1 ? '1fr' : '1fr 1fr 1fr', gap: 4, marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
          {imageIds.map((id) => (
            <ImageCell key={id} imageId={id} big={imageIds.length === 1} compact={compact} openViewer={openViewer} />
          ))}
        </div>
      )}
      {desc && (
        <button
          className="pressable"
          onClick={() => setShowDesc((v) => !v)}
          style={{ marginTop: 6, color: 'var(--text-tertiary)', textAlign: 'left' }}
        >
          <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{showDesc ? '收起图片描述' : '点击查看图片描述'}</span>
          {showDesc && <span className="fs-micro" style={{ display: 'block', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.6 }}>{desc}</span>}
        </button>
      )}
      {viewer}
    </>
  )
}

function ImageCell({ imageId, big, compact, openViewer }: { imageId: string; big?: boolean; compact?: boolean; openViewer: (url: string | null) => void }) {
  const url = useBlobURL(imageId)
  const h = big ? 190 : compact ? 64 : 96
  return (
    <button onClick={() => openViewer(url)} style={{ height: h, borderRadius: big ? 12 : 6, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}

export function VoteButtons({ post, onVote }: { post: ForumPost; onVote: (v: 1 | -1) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <button
        className="pressable"
        onClick={(e) => {
          e.stopPropagation()
          onVote(1)
        }}
        style={{ display: 'flex', alignItems: 'center', color: post.myVote === 1 ? 'var(--accent)' : 'var(--text-tertiary)', padding: 3 }}
      >
        <ArrowBigUp size={16} fill={post.myVote === 1 ? 'var(--accent)' : 'none'} />
      </button>
      <span className="fs-micro mono" style={{ color: post.myVote !== 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', minWidth: 22, textAlign: 'center' }}>
        {fmtCount(post.upvotes - post.downvotes)}
      </span>
      <button
        className="pressable"
        onClick={(e) => {
          e.stopPropagation()
          onVote(-1)
        }}
        style={{ display: 'flex', alignItems: 'center', color: post.myVote === -1 ? '#ff8a8a' : 'var(--text-tertiary)', padding: 3 }}
      >
        <ArrowBigDown size={16} fill={post.myVote === -1 ? '#ff8a8a' : 'none'} />
      </button>
    </div>
  )
}

export function PostCard({
  post,
  onOpen,
  showCircle,
  showQuote,
}: {
  post: ForumPost
  onOpen: () => void
  showCircle?: boolean
  showQuote?: boolean
}) {
  const circle = useForum((s) => s.circles.find((c) => c.id === post.circleId))
  const commentCount = useForum((s) => s.comments.filter((c) => c.postId === post.id).length)
  const quote = useForum((s) => (post.quoteOf ? s.posts.find((p) => p.id === post.quoteOf) : null))
  const votePost = useForum((s) => s.votePost)
  const favoritePost = useForum((s) => s.favoritePost)
  const push = useToast((s) => s.push)

  return (
    <button
      className="glass pressable"
      onClick={onOpen}
      style={{ width: '100%', textAlign: 'left', borderRadius: 16, padding: 13, marginBottom: 10, display: 'block' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AuthorAvatar author={post.author} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="fs-aux" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.author.name}
            </span>
            {post.anonymous && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>匿名</span>}
            <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>·</span>
            <TimeAgo t={post.createdAt} />
          </div>
          {showCircle && circle && (
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>圈：{circle.name}</div>
          )}
        </div>
        {post.pinned && <span className="fs-micro" style={{ color: 'var(--accent)' }}>置顶</span>}
        {post.essence && <BadgeCheck size={13} color="var(--accent)" />}
        {post.locked && <span className="fs-micro" style={{ color: '#ff8a8a' }}>封帖</span>}
      </div>

      {post.title && (
        <div className="fs-h2" style={{ color: 'var(--text-primary)', marginTop: 8, lineHeight: 1.4 }}>{post.title}</div>
      )}
      <div className="fs-body" style={{ color: 'var(--text-body)', marginTop: 5, lineHeight: 1.65, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {post.content}
      </div>
      {post.threadParts.length > 0 && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>连续发帖 {post.threadParts.length + 1} 条 ↓</div>
      )}
      <PostImages imageIds={post.imageIds} desc={post.imageDesc || undefined} compact />

      {showQuote && quote && (
        <div style={{ marginTop: 8, borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: 8 }}>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>@{quote.author.name}：</span>
          <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{quote.content.slice(0, 80)}</span>
        </div>
      )}

      {post.poll && (
        <div style={{ marginTop: 8 }}>
          {post.poll.options.slice(0, 3).map((o, i) => (
            <PollRowPreview key={i} label={o} percent={pollPercent(post, i)} />
          ))}
          {post.poll.options.length > 3 && (
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>共 {post.poll.options.length} 个选项</div>
          )}
        </div>
      )}

      {post.relay && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (post.relay.parts.length / Math.max(1, post.relay.target)) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
          </div>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>接力 {post.relay.parts.length}/{post.relay.target}</span>
        </div>
      )}

      {post.tags.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {post.tags.map((t) => (
            <span key={t} className="fs-micro" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '2px 8px' }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 9 }}>
        <VoteButtons post={post} onVote={(v) => votePost(post.id, v)} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
          <MessageSquare size={13} /> <span className="fs-micro">{fmtCount(commentCount)}</span>
        </span>
        <button
          className="pressable"
          onClick={(e) => {
            e.stopPropagation()
            favoritePost(post.id)
            push(post.myFavorite ? '已取消收藏' : '已收藏')
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: post.myFavorite ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <Star size={13} fill={post.myFavorite ? 'var(--accent)' : 'none'} /> <span className="fs-micro">{fmtCount(post.favorites)}</span>
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
          <Share2 size={12} /> <span className="fs-micro">{fmtCount(post.shares)}</span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-disabled)' }}>
          <Eye size={12} /> <span className="fs-micro">{fmtCount(post.views)}</span>
        </span>
      </div>
    </button>
  )
}

export function pollPercent(post: ForumPost, idx: number): number {
  if (!post.poll) return 0
  const total = Object.values(post.poll.votes).reduce((n, arr) => n + arr.length, 0)
  if (total === 0) return 0
  const mine = Object.values(post.poll.votes).filter((arr) => arr.includes(idx)).length
  return Math.round((mine / total) * 100)
}

function PollRowPreview({ label, percent }: { label: string; percent: number }) {
  return (
    <div style={{ position: 'relative', marginBottom: 4, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${percent}%`, background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', padding: '0 10px' }}>
        <span className="fs-micro" style={{ color: 'var(--text-body)' }}>{label}</span>
        <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{percent}%</span>
      </div>
    </div>
  )
}

export function trendingTags(posts: ForumPost[], commentCounts: Record<string, number>): { tag: string; heat: number; discussions: number; views: number }[] {
  const map = new Map<string, { heat: number; discussions: number; views: number }>()
  for (const p of posts) {
    const cc = commentCounts[p.id] ?? 0
    const h = heatOf(p, cc)
    for (const tag of p.tags) {
      const cur = map.get(tag) ?? { heat: 0, discussions: 0, views: 0 }
      cur.heat += h
      cur.discussions += 1 + cc
      cur.views += p.views
      map.set(tag, cur)
    }
  }
  return [...map.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 10)
}
