import { useUI, type AppId } from '../../store/ui'
import { useSms, smsUnreadCount } from '../../store/sms'
import { useCalls, callUnreadCount } from '../../store/calls'
import { useCopy } from '../../store/copy'
import { ChatIcon, SmsIcon, PhoneIcon } from './DockIcons'

interface DockItem {
  id: AppId
  label: string
  Icon: (p: { size?: number; strokeWidth?: number }) => JSX.Element
}

const ITEMS: DockItem[] = [
  { id: 'chat', label: '聊天', Icon: ChatIcon },
  { id: 'sms', label: '短信', Icon: SmsIcon },
  { id: 'phone', label: '电话', Icon: PhoneIcon },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="mono"
      style={{
        position: 'absolute',
        top: -3,
        right: -3,
        minWidth: 17,
        height: 17,
        padding: '0 4px',
        borderRadius: 999,
        background: '#ff3b30',
        color: '#fff',
        fontSize: 10,
        lineHeight: '17px',
        textAlign: 'center',
        fontWeight: 600,
        boxShadow: '0 2px 6px rgba(255,59,48,0.5)',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Dock() {
  const openApp = useUI((s) => s.openApp)
  const smsBadge = useSms((s) => smsUnreadCount(s.messages))
  const callBadge = useCalls((s) => callUnreadCount(s.records))
  const labels = useCopy((s) => s.texts.appLabels)
  const badges: Partial<Record<AppId, number>> = { sms: smsBadge, phone: callBadge }

  return (
    <div
      className="no-select"
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        zIndex: 90,
      }}
    >
      <div
        className="glass"
        style={{
          display: 'flex',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 8px',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="pressable"
            onClick={() => openApp(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span style={{ position: 'relative', display: 'flex', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={34} strokeWidth={1.6} />
              <Badge count={badges[id] ?? 0} />
            </span>
            <span className="fs-aux" style={{ color: 'var(--text-secondary)', letterSpacing: '2px' }}>
              {labels[id]?.trim() || label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}