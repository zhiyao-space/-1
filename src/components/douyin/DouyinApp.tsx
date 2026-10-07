import { useMemo, useState, type ReactNode } from 'react'
import { Coins, Home, MessageCircle, Plus } from 'lucide-react'
import '../../styles/douyin.css'
import { useDouyin, useDyUnread, userAuthor } from '../../store/douyin'
import { useProfile } from '../../store/profile'
import { useToast, useUI } from '../../store/ui'
import FeedView from './FeedView'
import MessageView from './MessageView'
import ProfileView from './ProfileView'
import DmView from './DmView'
import LiveRoom from './LiveRoom'
import PublishView from './PublishView'
import { DyAvatar } from './parts'
import type { DyAuthor, DyVideo } from '../../lib/douyinEngine'

type Tab = 'home' | 'message' | 'publish' | 'me'
type Overlay =
  | { kind: 'profile'; author: DyAuthor }
  | { kind: 'dm'; peer: DyAuthor }
  | { kind: 'live'; video: DyVideo }
  | null

function NavBtn({
  on,
  icon,
  label,
  badge,
  onClick,
}: {
  on: boolean
  icon: ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button className={`dy-nav-btn pressable${on ? ' dy-nav-btn--on' : ''}`} onClick={onClick}>
      {badge && badge > 0 ? <span className="dy-nav-dot" /> : null}
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function DouyinApp() {
  const closeApp = useUI((s) => s.closeApp)
  const toast = useToast((s) => s.push)
  const unread = useDyUnread()
  const coins = useDouyin((s) => s.coins)
  const addCoins = useDouyin((s) => s.addCoins)
  // 订阅账号状态，切换小号后「我」页立即刷新
  const accountSig = useProfile((s) =>
    [
      s.profile.nickname,
      s.profile.avatarId ?? '',
      ...s.profile.masks.map((m) => `${m.id}:${m.active ? 1 : 0}:${m.name}:${m.avatarId ?? ''}`),
    ].join('|')
  )
  const me = useMemo(() => userAuthor(), [accountSig])
  const [tab, setTab] = useState<Tab>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)

  const openAuthor = (a: DyAuthor) => setOverlay({ kind: 'profile', author: a })
  const openDm = (a: DyAuthor) => setOverlay({ kind: 'dm', peer: a })
  const openLive = (v: DyVideo) => setOverlay({ kind: 'live', video: v })

  return (
    <div className="dy-root">
      <div className="dy-body">
        {tab === 'home' && (
          <FeedView
            onOpenAuthor={openAuthor}
            onOpenDm={openDm}
            onExit={closeApp}
            onOpenLive={openLive}
          />
        )}
        {tab === 'message' && <MessageView onOpenAuthor={openAuthor} embedded />}
        {tab === 'publish' && <PublishView onDone={() => setTab('home')} />}
        {tab === 'me' && (
          <ProfileView author={me} onOpenAuthor={openAuthor} onOpenDm={openDm} />
        )}
      </div>

      <nav className="dy-nav">
        <NavBtn on={tab === 'home'} icon={<Home size={21} />} label="首页" onClick={() => setTab('home')} />
        <NavBtn
          on={tab === 'message'}
          icon={<MessageCircle size={21} />}
          label="消息"
          badge={unread}
          onClick={() => setTab('message')}
        />
        <button className="dy-nav-btn pressable" onClick={() => setTab('publish')} aria-label="发布">
          <span className="dy-nav-plus">
            <Plus size={19} />
          </span>
        </button>
        <NavBtn
          on={tab === 'me'}
          icon={<DyAvatar author={me} size={22} />}
          label="我"
          onClick={() => setTab('me')}
        />
      </nav>

      {overlay && (
        <div className="dy-overlay">
          {overlay.kind === 'profile' && (
            <ProfileView
              author={overlay.author}
              onBack={() => setOverlay(null)}
              onOpenAuthor={openAuthor}
              onOpenDm={openDm}
            />
          )}
          {overlay.kind === 'dm' && (
            <DmView peer={overlay.peer} onBack={() => setOverlay(null)} onOpenAuthor={openAuthor} />
          )}
          {overlay.kind === 'live' && (
            <LiveRoom video={overlay.video} onClose={() => setOverlay(null)} onOpenAuthor={openAuthor} />
          )}
        </div>
      )}

      {/* 金币余额（点击充值） */}
      {!overlay && tab === 'home' && (
        <button
          className="dy-coin-float pressable"
          onClick={() => {
            addCoins(1000)
            toast('充值成功，金币 +1000')
          }}
          title="点击充值 1000 金币"
        >
          <Coins size={13} /> {coins}
        </button>
      )}
    </div>
  )
}