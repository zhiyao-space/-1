import { useEffect, useState } from 'react'
import { MessageCircle, BookUser, CircleUserRound } from 'lucide-react'
import { useUI } from '../../store/ui'
import MessagesApp from './MessagesApp'
import ContactsApp from './ContactsApp'
import ProfileApp from '../profile/ProfileApp'

type HubTab = 'messages' | 'contacts' | 'me'

const TABS: { key: HubTab; label: string; icon: typeof MessageCircle }[] = [
  { key: 'messages', label: '消息', icon: MessageCircle },
  { key: 'contacts', label: '通讯录', icon: BookUser },
  { key: 'me', label: '我', icon: CircleUserRound },
]

export default function ChatHub() {
  const [tab, setTab] = useState<HubTab>('messages')
  const pendingChat = useUI((s) => s.pendingChat)

  useEffect(() => {
    if (pendingChat) setTab('messages')
  }, [pendingChat])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'messages' && <MessagesApp />}
        {tab === 'contacts' && <ContactsApp />}
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
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="fs-micro" style={{ letterSpacing: 1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
