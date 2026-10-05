import { useEffect, useState } from 'react'
import { MessageCircle, BookUser, CircleUserRound, Images } from 'lucide-react'
import { useUI } from '../../store/ui'
import { useMoments } from '../../store/moments'
import MessagesApp from './MessagesApp'
import ContactsApp from './ContactsApp'
import ProfileApp from '../profile/ProfileApp'
import MomentsApp from '../moments/MomentsApp'

type HubTab = 'messages' | 'contacts' | 'moments' | 'me'

const TABS: { key: HubTab; label: string; icon: typeof MessageCircle }[] = [
  { key: 'messages', label: '消息', icon: MessageCircle },
  { key: 'contacts', label: '通讯录', icon: BookUser },
  { key: 'moments', label: '朋友圈', icon: Images },
  { key: 'me', label: '我', icon: CircleUserRound },
]

export default function ChatHub() {
  const [tab, setTab] = useState<HubTab>('messages')
  const pendingChat = useUI((s) => s.pendingChat)
  const pendingHubTab = useUI((s) => s.pendingHubTab)
  const setPendingHubTab = useUI((s) => s.setPendingHubTab)
  const unread = useMoments((s) => s.unread)

  useEffect(() => {
    if (pendingChat) setTab('messages')
  }, [pendingChat])

  useEffect(() => {
    if (pendingHubTab) {
      setTab(pendingHubTab)
      setPendingHubTab(null)
    }
  }, [pendingHubTab, setPendingHubTab])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'messages' && <MessagesApp />}
        {tab === 'contacts' && <ContactsApp />}
        {tab === 'moments' && <MomentsApp />}
        {tab === 'me' && <ProfileApp />}
      </div>

      <div
        className="no-select"
        style={{
          flexShrink: 0,
          display: 'flex',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,10,12,0.92)',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          const showBadge = t.key === 'moments' && unread > 0 && !active
          return (
            <button
              key={t.key}
              className="pressable"
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '8px 0 7px',
                color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                position: 'relative',
              }}
            >
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {showBadge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      minWidth: 15,
                      height: 15,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: '#ff4d4f',
                      color: '#fff',
                      fontSize: 9,
                      lineHeight: '15px',
                      textAlign: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span className="fs-micro" style={{ letterSpacing: 1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}