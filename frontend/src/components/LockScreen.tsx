import { useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useClock } from '../hooks'
import { WallpaperLayer } from './WallpaperLayer'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function LockScreen() {
  const unlock = useUI((s) => s.unlock)
  const { wallpapers, wallpaperFx, phoneName, signature } = useSettings()
  const now = useClock(1000)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return
    const dy = e.clientY - startY.current
    if (dy < 0) setDragY(dy)
  }
  const onPointerUp = () => {
    if (dragY < -70) {
      unlock()
    }
    setDragY(0)
    startY.current = null
  }

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`

  return (
    <div
      className="no-select"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        top: 'var(--statusbar-height)',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        touchAction: 'none',
      }}
    >
      <WallpaperLayer imageId={wallpapers.lock} fx={wallpaperFx.lock} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${dragY * 0.5}px)`,
          opacity: 1 + dragY / 240,
          transition: startY.current === null ? 'transform 300ms ease-out, opacity 300ms ease-out' : 'none',
        }}
      >
        <div style={{ marginTop: '18%' }}>
          <div
            className="mono fs-hero"
            style={{ color: 'var(--text-primary)', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
          >
            {hh}:{mm}
          </div>
          <div
            className="mono fs-aux"
            style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, letterSpacing: '1px' }}
          >
            {dateStr}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ChevronUp size={18} color="var(--text-tertiary)" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>上滑解锁</div>
        </div>

        <div
          style={{
            marginBottom: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div className="app-name" style={{ fontSize: 'calc(26px * var(--fs-scale))' }}>
            {phoneName}
          </div>
          {signature && (
            <div className="fs-aux" style={{ color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              {signature}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
