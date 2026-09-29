import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useClock } from '../hooks'
import { useNotifications } from '../store/notifications'
import { useUI } from '../store/ui'

export default function StatusBar() {
  const now = useClock(10000)
  const [battery, setBattery] = useState<number | null>(null)
  const unread = useNotifications((s) => s.items.filter((i) => !i.read).length)
  const openApp = useUI((s) => s.openApp)

  useEffect(() => {
    let batteryManager: any = null
    const update = () => {
      if (batteryManager) setBattery(Math.round(batteryManager.level * 100))
    }
    if ('getBattery' in navigator) {
      ;(navigator as any).getBattery().then((b: any) => {
        batteryManager = b
        update()
        b.addEventListener('levelchange', update)
        b.addEventListener('chargingchange', update)
      })
    }
    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', update)
        batteryManager.removeEventListener('chargingchange', update)
      }
    }
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')

  return (
    <div
      className="mono no-select"
      style={{
        height: 'var(--statusbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: 11,
        color: 'var(--text-secondary)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="pressable"
          onClick={() => openApp('notifications')}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', color: unread > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          <Bell size={12} />
          {unread > 0 && (
            <span
              className="mono"
              style={{
                position: 'absolute',
                top: -5,
                right: -7,
                minWidth: 12,
                height: 12,
                borderRadius: 6,
                background: '#ff6b6b',
                color: '#fff',
                fontSize: 8,
                lineHeight: '12px',
                textAlign: 'center',
                padding: '0 2px',
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        <span>{battery !== null ? `${battery}%` : '--'}</span>
      </span>
      <span>
        {hh}:{mm}
      </span>
    </div>
  )
}
