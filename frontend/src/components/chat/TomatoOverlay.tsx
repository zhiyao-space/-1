import { useEffect, useRef, useState } from 'react'
import { X, Pause, Play } from 'lucide-react'
import { beep, whiteNoiseStart } from './PayAndTools'

export default function TomatoOverlay({
  characterName,
  seconds,
  noise,
  onTick,
  onFinish,
  onCancel,
}: {
  characterName: string
  seconds: number
  noise: boolean
  onTick?: (elapsed: number) => void
  onFinish?: (completed: boolean) => void
  onCancel: () => void
}) {
  const [remain, setRemain] = useState(seconds)
  const [paused, setPaused] = useState(false)
  const finishRef = useRef(onFinish)
  finishRef.current = onFinish

  useEffect(() => {
    if (!noise) return
    const stop = whiteNoiseStart()
    return () => stop()
  }, [noise])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          clearInterval(t)
          beep(3)
          finishRef.current?.(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [paused])

  const mm = String(Math.floor(remain / 60)).padStart(2, '0')
  const ss = String(remain % 60).padStart(2, '0')
  const progress = 1 - remain / seconds

  return (
    <div className="page-enter" style={{ position: 'absolute', inset: 0, zIndex: 340, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', letterSpacing: 2 }}>FOCUS · 一起专注</div>
      <div
        style={{
          width: 168,
          height: 168,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `conic-gradient(var(--accent-color) ${progress * 360}deg, rgba(255,255,255,0.07) 0deg)`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mono" style={{ fontSize: 34, color: 'var(--text-primary)' }}>{mm}:{ss}</span>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{characterName} 陪你专注中</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? '继续' : '暂停'}
        </button>
        <button
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => {
            beep(1)
            finishRef.current?.(false)
            onCancel()
          }}
        >
          <X size={14} /> 结束
        </button>
      </div>
    </div>
  )
}
