import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EyeOff,
  Heart,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import { useToast } from '../../store/ui'
import {
  buildSignals,
  coverImageUrl,
  rankFeed,
  recommendReason,
  type DyAuthor,
  type DyComment,
  type DyVideo,
} from '../../lib/douyinEngine'
import { CoverArt, CoverThumb, DyAvatar, DyIcon, DySheet, formatCount } from './parts'

type FeedTab = 'follow' | 'recommend' | 'nearby'

const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'follow', label: '关注' },
  { id: 'recommend', label: '推荐' },
  { id: 'nearby', label: '同城' },
]

export default function FeedView({
  onOpenAuthor,
  onOpenDm,
  onExit,
  onOpenLive,
}: {
  onOpenAuthor: (a: DyAuthor) => void
  onOpenDm: (a: DyAuthor) => void
  onExit: () => void
  onOpenLive?: (v: DyVideo) => void
}) {
  const videos = useDouyin((s) => s.videos)
  const follows = useDouyin((s) => s.follows)
  const liked = useDouyin((s) => s.liked)
  const favorites = useDouyin((s) => s.favorites)
  const history = useDouyin((s) => s.history)
  const disliked = useDouyin((s) => s.disliked)
  const myIp = useDouyin((s) => s.profiles['user']?.ip ?? '')
  const comments = useDouyin((s) => s.comments)
  const generating = useDouyin((s) => s.generating)
  const refreshFeed = useDouyin((s) => s.refreshFeed)
  const toggleLike = useDouyin((s) => s.toggleLike)
  const toggleFavorite = useDouyin((s) => s.toggleFavorite)
  const toggleFollow = useDouyin((s) => s.toggleFollow)
  const recordWatch = useDouyin((s) => s.recordWatch)
  const ensureComments = useDouyin((s) => s.ensureComments)
  const addComment = useDouyin((s) => s.addComment)
  const likeComment = useDouyin((s) => s.likeComment)
  const hideVideo = useDouyin((s) => s.hideVideo)
  const setVideoCover = useDouyin((s) => s.setVideoCover)
  const toast = useToast((s) => s.push)

  const [tab, setTab] = useState<FeedTab>('recommend')
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [popId, setPopId] = useState<number | null>(null)
  const [sheet, setSheet] = useState<'comment' | 'share' | 'more' | null>(null)
  const [draft, setDraft] = useState('')

  const feedRef = useRef<HTMLDivElement | null>(null)
  const clickTimer = useRef<number | null>(null)
  const longTimer = useRef<number | null>(null)
  const longFired = useRef(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  // 用于展示推荐理由（随互动实时更新）
  const signals = useMemo(
    () => buildSignals(videos, { liked, favorites, history, follows, disliked }),
    [videos, liked, favorites, history, follows, disliked]
  )

  // 排序后的视频流：仅在切换 Tab / 内容刷新时重新排序，避免滑动中被重排
  const list = useMemo(() => {
    const s = useDouyin.getState()
    if (tab === 'follow') return videos.filter((v) => s.follows.includes(v.author.key))
    const sig = buildSignals(s.videos, {
      liked: s.liked,
      favorites: s.favorites,
      history: s.history,
      follows: s.follows,
      disliked: s.disliked,
    })
    const ip = s.profiles['user']?.ip ?? ''
    if (tab === 'nearby') return rankFeed(videos, sig, 'nearby', ip)
    return rankFeed(videos, sig, 'recommend')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, videos])

  const current: DyVideo | undefined = list[idx]
  const currentComments = useMemo(
    () => (current ? comments.filter((c) => c.videoId === current.id) : []),
    [comments, current]
  )

  // 首次进入自动铺内容
  useEffect(() => {
    if (videos.length === 0) void refreshFeed()
  }, [videos.length, refreshFeed])

  // 切 Tab 回到顶部
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0
    setIdx(0)
    setPaused(false)
  }, [tab])

  // 记录观看
  useEffect(() => {
    if (current) recordWatch(current.id)
  }, [current, recordWatch])

  // 拉评论区
  useEffect(() => {
    if (sheet === 'comment' && current) void ensureComments(current.id)
  }, [sheet, current, ensureComments])

  const onScroll = () => {
    const el = feedRef.current
    if (!el) return
    const i = Math.round(el.scrollTop / Math.max(1, el.clientHeight))
    if (i !== idx) {
      setIdx(i)
      setPaused(false)
    }
  }

  const doLike = () => {
    if (!current) return
    if (!liked.includes(current.id)) toggleLike(current.id)
    setPopId(Date.now())
    window.setTimeout(() => setPopId(null), 900)
  }

  const handleTap = () => {
    if (longFired.current) {
      longFired.current = false
      return
    }
    if (clickTimer.current) {
      window.clearTimeout(clickTimer.current)
      clickTimer.current = null
      doLike()
      return
    }
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null
      setPaused((p) => !p)
    }, 240)
  }

  const startPress = () => {
    longFired.current = false
    longTimer.current = window.setTimeout(() => {
      longFired.current = true
      setPaused(true)
      setSheet('more')
    }, 520)
  }
  const endPress = () => {
    if (longTimer.current) {
      window.clearTimeout(longTimer.current)
      longTimer.current = null
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
    startPress()
  }
  const onPointerUp = (e: React.PointerEvent) => {
    endPress()
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) < 60 || Math.abs(dy) > 46) return
    if (dx < 0) {
      setSheet('comment')
    } else {
      onExit()
    }
  }

  const generateCover = (video: DyVideo) => {
    setVideoCover(video.id, coverImageUrl(video.coverPrompt))
    toast('正在生成封面，稍等片刻…')
    setSheet(null)
  }

  const share = (label: string) => {
    toast(`已${label}`)
    setSheet(null)
  }

  return (
    <>
      <div className="dy-tabs">
        {FEED_TABS.map((t) => (
          <button
            key={t.id}
            className={`dy-tab pressable${tab === t.id ? ' dy-tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        className="dy-icon-btn pressable"
        style={{ position: 'absolute', right: 12, top: 12, zIndex: 31 }}
        onClick={() => void refreshFeed()}
        title="刷新推荐"
      >
        <RefreshCw size={15} className={generating ? 'dy-spin' : undefined} />
      </button>

      <div className="dy-feed" ref={feedRef} onScroll={onScroll}>
        {list.length === 0 && (
          <div className="dy-video">
            <div className="dy-cover" style={{ background: 'linear-gradient(160deg, #1b1b22, #08080a)' }} />
            <div className="dy-empty" style={{ position: 'absolute', left: 0, right: 0, top: '42%' }}>
              {tab === 'follow' ? '还没有关注的创作者，去推荐页逛逛' : '正在为你生成内容…'}
            </div>
            <button
              className="dy-icon-btn pressable"
              style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translateX(-50%)' }}
              onClick={() => void refreshFeed()}
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        {list.map((v) => (
          <div key={v.id} className={`dy-video${paused && v.id === current?.id ? ' dy-paused' : ''}`}>
            <CoverArt video={v} paused={paused && v.id === current?.id} />
            {v.id === current?.id && (
              <div className="dy-progress">
                <span key={`${v.id}-${paused ? 'p' : 'r'}`} style={{ animationDuration: `${v.duration}s`, animationPlayState: paused ? 'paused' : 'running' }} />
              </div>
            )}
            {v.live && v.id === current?.id && (
              <>
                <div className="dy-live-badge">
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#fff', display: 'inline-block' }} />
                  直播中 · {formatCount(v.live.viewers)}人
                </div>
                <button
                  className="dy-live-probe pressable"
                  onClick={() => onOpenLive?.(v)}
                  style={{ pointerEvents: 'auto' }}
                >
                  <span className="dy-live-probe-title">{v.live.title}</span>
                  <span className="dy-live-probe-cta">点击进入直播间 ›</span>
                </button>
              </>
            )}

            {/* 手势层：点击暂停 / 双击点赞 / 长按菜单 / 左滑评论 / 右滑返回 */}
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 10 }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerLeave={endPress}
              onClick={handleTap}
            />

            {popId && v.id === current?.id && (
              <div className="dy-pop-heart">
                <Heart size={92} color="#fe2c55" fill="#fe2c55" />
              </div>
            )}

            {/* 右侧互动栏 */}
            <div className="dy-rail">
              <button className="dy-rail-avatar pressable" onClick={() => onOpenAuthor(v.author)}>
                <DyAvatar author={v.author} size={46} />
                {!follows.includes(v.author.key) && (
                  <span
                    className="dy-rail-plus"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFollow(v.author.key)
                      toast(`已关注 @${v.author.name}`)
                    }}
                  >
                    <Plus size={11} />
                  </span>
                )}
              </button>

              <button className="dy-rail-btn pressable" onClick={() => toggleLike(v.id)}>
                <Heart
                  size={30}
                  color={liked.includes(v.id) ? '#fe2c55' : '#fff'}
                  fill={liked.includes(v.id) ? '#fe2c55' : 'none'}
                />
                <span className="dy-rail-num">{formatCount(v.stats.likes)}</span>
              </button>

              <button className="dy-rail-btn pressable" onClick={() => setSheet('comment')}>
                <MessageCircle size={28} color="#fff" />
                <span className="dy-rail-num">{formatCount(v.stats.comments)}</span>
              </button>

              <button className="dy-rail-btn pressable" onClick={() => toggleFavorite(v.id)} title="收藏">
                <Star
                  size={27}
                  color={favorites.includes(v.id) ? '#ffcc00' : '#fff'}
                  fill={favorites.includes(v.id) ? '#ffcc00' : 'none'}
                />
                <span className="dy-rail-num">{favorites.includes(v.id) ? '已收藏' : '收藏'}</span>
              </button>

              <button className="dy-rail-btn pressable" onClick={() => setSheet('share')} title="分享">
                <Share2 size={27} color="#fff" />
                <span className="dy-rail-num">{formatCount(v.stats.shares)}</span>
              </button>

              <div className="dy-disc">
                <span className="dy-disc-inner">
                  <Music size={11} color="#ddd" />
                </span>
              </div>
            </div>

            {/* 底部信息栏 */}
            <div className="dy-meta">
              <span className="dy-meta-name">@{v.author.name}</span>
              {tab === 'recommend' &&
                (() => {
                  const reason = recommendReason(v, signals, myIp)
                  return reason ? <span className="dy-meta-reason">{reason}</span> : null
                })()}
              <span className="dy-meta-desc">{v.description}</span>
              <div className="dy-meta-tags">
                {v.tags.map((t) => (
                  <span key={t} className="dy-meta-tag">
                    #{t}
                  </span>
                ))}
                {v.location && (
                  <span className="dy-meta-tag" style={{ opacity: 0.85, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={11} />
                    {v.location}
                  </span>
                )}
              </div>
              <div className="dy-meta-bgm">
                <Music size={13} color="#fff" />
                <span className="dy-meta-bgm-text">
                  <span className="dy-marquee">
                    {v.bgm.title} · {v.bgm.artist}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 评论区 */}
      {sheet === 'comment' && current && (
        <DySheet
          title={`${formatCount(current.stats.comments)} 条评论`}
          onClose={() => setSheet(null)}
          footer={
            <div className="dy-sheet-foot">
              <input
                className="dy-input"
                placeholder="留下你的精彩评论吧"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    addComment(current.id, draft)
                    setDraft('')
                  }
                }}
              />
              <button
                className="dy-send pressable"
                onClick={() => {
                  if (!draft.trim()) return
                  addComment(current.id, draft)
                  setDraft('')
                  toast('评论已发布')
                }}
              >
                <Send size={16} />
              </button>
            </div>
          }
        >
          {currentComments.length === 0 && <div className="dy-empty">还没有评论，来抢首评</div>}
          {currentComments.map((c) => (
            <CommentRow key={c.id} comment={c} onLike={() => likeComment(c.id)} onOpen={() => onOpenAuthor(c.author)} />
          ))}
        </DySheet>
      )}

      {/* 分享面板 */}
      {sheet === 'share' && (
        <DySheet title="分享到" onClose={() => setSheet(null)}>
          <div className="dy-share-grid">
            {[
              { icon: 'chat', label: '微信' },
              { icon: 'users', label: '朋友圈' },
              { icon: 'comment', label: 'QQ' },
              { icon: 'flame', label: '微博' },
              { icon: 'link', label: '复制链接' },
              { icon: 'dm', label: '私信好友' },
              { icon: 'star', label: '收藏' },
              { icon: 'flag', label: '举报' },
            ].map((s) => (
              <button key={s.label} className="dy-share-item pressable" onClick={() => share(s.label)}>
                <span className="dy-share-circle">
                  <DyIcon name={s.icon} size={20} color="#fff" />
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </DySheet>
      )}

      {/* 长按菜单 */}
      {sheet === 'more' && current && (
        <DySheet title="更多操作" onClose={() => setSheet(null)} center>
          <button
            className="dy-sheet-row pressable"
            onClick={() => {
              hideVideo(current.id)
              setSheet(null)
              toast('已减少此类推荐')
            }}
          >
            <span style={{ opacity: 0.7, display: 'inline-flex' }}>
              <EyeOff size={15} />
            </span>{' '}
            不感兴趣
          </button>
          <button className="dy-sheet-row pressable" onClick={() => generateCover(current)}>
            <span style={{ opacity: 0.7, display: 'inline-flex' }}>
              <Sparkles size={15} />
            </span>{' '}
            AI 生成这条视频的封面
          </button>
          <button
            className="dy-sheet-row pressable"
            onClick={() => {
              setSheet(null)
              onOpenDm(current.author)
            }}
          >
            <span style={{ opacity: 0.7, display: 'inline-flex' }}>
              <Mail size={15} />
            </span>{' '}
            私信 @{current.author.name}
          </button>
          <button className="dy-sheet-row pressable" onClick={() => share('已复制链接')}>
            <span style={{ opacity: 0.7, display: 'inline-flex' }}>
              <Link2 size={15} />
            </span>{' '}
            复制链接
          </button>
        </DySheet>
      )}
    </>
  )
}

function CommentRow({ comment, onLike, onOpen }: { comment: DyComment; onLike: () => void; onOpen: () => void }) {
  const [liked, setLiked] = useState(false)
  return (
    <div className="dy-cm">
      <button className="pressable" onClick={onOpen}>
        <DyAvatar author={comment.author} size={34} />
      </button>
      <div className="dy-cm-body">
        <div className="dy-cm-name">
          {comment.author.name}
          {comment.author.passerbyTag && <span className="dy-pill">{comment.author.passerbyTag}</span>}
        </div>
        <div className="dy-cm-text">{comment.content}</div>
      </div>
      <button
        className="dy-cm-like pressable"
        onClick={() => {
          if (liked) return
          setLiked(true)
          onLike()
        }}
      >
        <Heart size={13} color={liked ? '#fe2c55' : 'rgba(255,255,255,0.5)'} fill={liked ? '#fe2c55' : 'none'} />
        {formatCount(comment.likes)}
      </button>
    </div>
  )
}

/** 供「我」页与主页复用的小工具：作品九宫格 */
export function VideoGrid({
  list,
  empty,
  onOpenVideo,
}: {
  list: DyVideo[]
  empty: string
  onOpenVideo?: (v: DyVideo) => void
}) {
  if (list.length === 0) return <div className="dy-empty">{empty}</div>
  return (
    <div className="dy-grid">
      {list.map((v) => (
        <button key={v.id} className="dy-grid-cell pressable" style={{ padding: 0 }} onClick={() => onOpenVideo?.(v)}>
          <CoverThumb video={v} />
        </button>
      ))}
    </div>
  )
}