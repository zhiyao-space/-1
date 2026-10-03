import { useEffect, useState } from 'react'
import { useClock } from '../hooks'

export default function StatusBar() {
  const now = useClock(10000)
  const [battery, setBattery] = useState<number | null>(null)

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
        <span>{battery !== null ? `${battery}%` : '--'}</span>
      </span>
      <span>
        {hh}:{mm}
      </span>
    </div>
  )
}
