import { useEffect, useRef, useState } from 'react'
import { Compass, Heart, LayoutGrid, MessageCircle, User } from 'lucide-react'
import { useSocial, ME } from '../../store/social'
import { useToast } from '../../store/ui'
import { generateProactive, localPost } from '../../lib/socialEngine'
import MessagesTab from './MessagesTab'
import MatchTab from './MatchTab'
import FeedTab from './FeedTab'
import CommunityTab from './CommunityTab'
import MeTab from './MeTab'
import ChatView from './ChatView'
import CharacterCard from './CharacterCard'
import '../../styles/factory.css'
import '../../styles/social.css'

type STab = 'messages' | 'match' | 'feed' | 'community' | 'me'

const TABS: { key: STab; label: string; icon: typeof Heart }[] = [
  { key: 'messages', label: '消息', icon: MessageCircle },
  { key: 'match', label: '匹配', icon: Heart },
  { key: 'feed', label: '动态', icon: LayoutGrid },
  { key: 'community', label: '社区', icon: Compass },
  { key: 'me', label: '我的', icon: User },
]

export default function SocialApp() {
  const [tab, setTab] = useState<STab>('messages')
  const [chatId, setChatId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)

  const characters = useSocial((s) => s.characters)
  const messages = useSocial((s) => s.messages)
  const posts = useSocial((s) => s.posts)
  const theme = useSocial((s) => s.settings.theme)
  const tickOnline = useSocial((s) => s.tickOnline)
  const receiveMessage = useSocial((s) => s.receiveMessage)
  const addCharacterPost = useSocial((s) => s.addCharacterPost)
  const push = useToast((s) => s.push)

  const unread = Object.entries(messages).reduce((acc, [cid, list]) => {
    const c = characters.find((x) => x.id === cid)
    if (!c || c.blocked || c.muted) return acc
    return acc + list.filter((m) => m.senderId !== ME && !m.read).length
  }, 0)

  // 在线状态随机变化
  useEffect(() => {
    const t = window.setInterval(() => tickOnline(), 45000)
    return () => window.clearInterval(t)
  }, [tickOnline])

  // 主动来信：仅对开启开关的角色生效
  const proactiveBusy = useRef(false)
  useEffect(() => {
    const t = window.setInterval(async () => {
      if (proactiveBusy.current) return
      const s = useSocial.getState()
      const pool = s.characters.filter((c) => c.proactive && !c.blocked && !c.muted)
      if (!pool.length) return
      if (Math.random() > 0.4) return
      proactiveBusy.current = true
      const c = pool[Math.floor(Math.random() * pool.length)]
      try {
        const recentMine = s.posts.filter((p) => p.authorId === ME).slice(0, 3).map((p) => p.content)
        const text = await generateProactive({ character: c, profile: s.profile, recentMine })
        useSocial.getState().receiveMessage(c.id, { text })
        push(`${c.nickname} 给你发来一条消息`)
      } catch {
        /* 忽略 */
      } finally {
        proactiveBusy.current = false
      }
    }, 75000)
    return () => window.clearInterval(t)
  }, [push])

  // 角色按人设发日常
  const postBusy = useRef(false)
  useEffect(() => {
    const t = window.setInterval(async () => {
      if (postBusy.current) return
      const s = useSocial.getState()
      const pool = s.characters.filter((c) => !c.blocked)
      if (!pool.length) return
      if (Math.random() > 0.34) return
      postBusy.current = true
      const c = pool[Math.floor(Math.random() * pool.length)]
      try {
        const text = localPost(c, s.profile)
        useSocial.getState().addCharacterPost(c.id, text)
      } catch {
        /* 忽略 */
      } finally {
        postBusy.current = false
      }
    }, 150000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div className={`fx-root sc-root${theme === 'light' ? ' sc-light' : ''}`}>
      {chatId ? (
        <ChatView charId={chatId} onBack={() => setChatId(null)} onOpenCard={setCardId} />
      ) : (
        <>
          <div
            className="no-select"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px 2px' }}
          >
            <Heart size={14} color="var(--fx-accent)" fill="var(--fx-accent)" />
            <span className="sc-title" style={{ fontSize: 14 }}>
              mu社区恋爱交友软件
            </span>
            <span className="sc-sub" style={{ marginLeft: 'auto' }}>
              模拟恋爱社交
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {tab === 'messages' && <MessagesTab onOpenChat={setChatId} onOpenCard={setCardId} />}
            {tab === 'match' && <MatchTab onOpenCard={setCardId} onOpenChat={setChatId} />}
            {tab === 'feed' && <FeedTab onOpenCard={setCardId} />}
            {tab === 'community' && <CommunityTab onOpenCard={setCardId} />}
            {tab === 'me' && <MeTab onOpenCard={setCardId} />}
          </div>

          <nav className="sc-nav no-select">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  className={`sc-nav__item${active ? ' sc-nav__item--active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.key === 'messages' && unread > 0 && (
                    <span className="sc-nav__badge">{unread > 99 ? '99+' : unread}</span>
                  )}
                  <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ fontSize: 10.5, letterSpacing: '0.5px' }}>{t.label}</span>
                </button>
              )
            })}
          </nav>
        </>
      )}

      <CharacterCard
        charId={cardId}
        onClose={() => setCardId(null)}
        onOpenChat={(id) => {
          setCardId(null)
          useSocial.getState().ensureConversation(id)
          setChatId(id)
        }}
      />
    </div>
  )
}