import { useEffect, useState } from 'react'
import { Home, Users, Mail, User, Plus, Trash2 } from 'lucide-react'
import { useForum, type ForumPost } from '../../store/forum'
import { useUI, useToast } from '../../store/ui'
import FeedView, { FeedTabs, type FeedTab } from './FeedView'
import CirclesView, { CircleDetail } from './CirclesView'
import PostDetail from './PostDetail'
import Composer from './Composer'
import DmView from './DmView'
import ProfileView from './ProfileView'

type View =
  | { name: 'feed' }
  | { name: 'trending' }
  | { name: 'circles' }
  | { name: 'circle'; id: string }
  | { name: 'post'; id: string }
  | { name: 'dm'; id: string | null }
  | { name: 'me' }

export default function ForumApp() {
  const pendingForum = useUI((s) => s.pendingForum)
  const setPendingForum = useUI((s) => s.setPendingForum)
  const posts = useForum((s) => s.posts)
  const circles = useForum((s) => s.circles)
  const removePost = useForum((s) => s.removePost)
  const push = useToast((s) => s.push)
  const [tab, setTab] = useState<'home' | 'circles' | 'dm' | 'me'>('home')
  const [feedTab, setFeedTab] = useState<FeedTab>('recommend')
  const [stack, setStack] = useState<View[]>([])
  const [composerOpen, setComposerOpen] = useState(false)
  const [quoteOf, setQuoteOf] = useState<ForumPost | null>(null)
  const [defaultCircleId, setDefaultCircleId] = useState<string | null>(null)

  const fallback: View = tab === 'home' ? { name: 'feed' } : tab === 'circles' ? { name: 'circles' } : tab === 'dm' ? { name: 'dm', id: null } : { name: 'me' }
  const view = stack[stack.length - 1] ?? fallback

  useEffect(() => {
    if (!pendingForum) return
    setPendingForum(null)
    if (pendingForum.view === 'post') setStack([{ name: 'post', id: pendingForum.id }])
    else if (pendingForum.view === 'circle') {
      setTab('circles')
      setStack([{ name: 'circle', id: pendingForum.id }])
    } else if (pendingForum.view === 'dm') {
      setTab('dm')
      setStack([{ name: 'dm', id: pendingForum.id }])
    } else if (pendingForum.view === 'profile') {
      setTab('me')
      setStack([])
    }
  }, [pendingForum, setPendingForum])

  const go = (v: View) => setStack((s) => [...s, v])
  const back = () => setStack((s) => s.slice(0, -1))
  const popToRoot = () => setStack([])

  const openPost = (id: string) => go({ name: 'post', id })
  const openDm = (id: string) => go({ name: 'dm', id })
  const openQuote = (post: ForumPost) => {
    setQuoteOf(post)
    setComposerOpen(true)
  }

  const currentPost = view.name === 'post' ? posts.find((p) => p.id === (view as { id: string }).id) : null
  const currentCircle = view.name === 'circle' ? circles.find((c) => c.id === (view as { id: string }).id) : null

  const showFab = view.name === 'feed' || view.name === 'circles' || view.name === 'circle'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* 顶部栏 */}
      {view.name === 'feed' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px 0', flexShrink: 0 }}>
            <span className="nav-title fs-h1" style={{ color: 'var(--text-primary)', flex: 1 }}>论坛</span>
          </div>
          <FeedTabs tab={feedTab} setTab={setFeedTab} />
        </>
      )}
      {view.name === 'circles' && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px 0', flexShrink: 0 }}>
          <span className="nav-title fs-h1" style={{ color: 'var(--text-primary)', flex: 1 }}>圈子</span>
        </div>
      )}
      {view.name === 'me' && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px 0', flexShrink: 0 }}>
          <span className="nav-title fs-h1" style={{ color: 'var(--text-primary)', flex: 1 }}>我的</span>
        </div>
      )}

      {/* 主体 */}
      {view.name === 'feed' && <FeedView key={feedTab} onOpenPost={openPost} onCompose={() => { setQuoteOf(null); setComposerOpen(true) }} />}
      {view.name === 'circles' && <CirclesView onOpenCircle={(id) => go({ name: 'circle', id })} />}
      {view.name === 'circle' &&
        (currentCircle ? (
          <CircleDetail circle={currentCircle} onOpenPost={openPost} onBack={back} />
        ) : (
          <Center text="圈子不存在或已被删除" />
        ))}
      {view.name === 'post' &&
        (currentPost ? (
          <PostDetail post={currentPost} onBack={back} onQuote={openQuote} onOpenDm={openDm} />
        ) : (
          <Center text="帖子不存在或已被删除" />
        ))}
      {view.name === 'dm' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
          <DmView
            initialDmId={(view as { id: string | null }).id}
            onClearInitial={() => setStack((s) => (s.length ? s.map((v) => (v.name === 'dm' ? { name: 'dm', id: null } : v)) : s))}
            onOpenPost={openPost}
          />
        </div>
      )}
      {view.name === 'me' && <ProfileView onOpenPost={openPost} />}

      {/* FAB */}
      {showFab && (
        <button
          className="btn btn-accent pressable"
          onClick={() => {
            setDefaultCircleId(view.name === 'circle' ? (view as { id: string }).id : null)
            setQuoteOf(null)
            setComposerOpen(true)
          }}
          style={{ position: 'absolute', right: 16, bottom: 74, width: 52, height: 52, borderRadius: '50%', padding: 0, boxShadow: '0 6px 24px rgba(0,0,0,0.5)', zIndex: 120 }}
          title="发帖"
        >
          <Plus size={22} />
        </button>
      )}

      {/* 底部导航 */}
      <div className="glass" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', zIndex: 110, borderRadius: 0 }}>
        {(
          [
            ['home', '首页', Home],
            ['circles', '圈子', Users],
            ['dm', '私信', Mail],
            ['me', '我的', User],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            className="pressable"
            onClick={() => {
              if (tab === k) popToRoot()
              setTab(k)
              setStack([])
            }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === k && stack.length === 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            <Icon size={19} />
            <span style={{ fontSize: 'calc(10px * var(--fs-scale))' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* 帖子详情里的删除快捷入口 */}
      {view.name === 'post' && currentPost?.author.type === 'user' && (
        <button
          className="pressable"
          onClick={() => {
            removePost(currentPost.id)
            push('帖子已删除')
            back()
          }}
          style={{ position: 'absolute', top: 8, right: 52, zIndex: 130, color: '#ff8a8a', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 7 }}
          title="删除帖子"
        >
          <Trash2 size={15} />
        </button>
      )}

      <Composer open={composerOpen} onClose={() => { setComposerOpen(false); setQuoteOf(null) }} quoteOf={quoteOf} defaultCircleId={defaultCircleId} />
    </div>
  )
}

function Center({ text }: { text: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>{text}</span>
    </div>
  )
}
