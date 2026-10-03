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
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 4px', flexShrink: 0 }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              className="btn pressable"
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: tab === t.key ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderColor: tab === t.key ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'messages' && <MessagesApp />}
      {tab === 'contacts' && <ContactsApp />}
      {tab === 'me' && <ProfileApp />}
    </div>
  )
}
