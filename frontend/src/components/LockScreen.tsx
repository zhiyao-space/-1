import { useRef, useState, useEffect } from 'react'
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

  const lines = [
    '夜色缓步，不必急着回应。',
    '收起喧嚣，留一隅给自己。',
    '轻柔提醒：呼吸，放慢。',
    '此刻只属于你的小确幸。',
    '浅色月影，淡淡的仪式感。',
  ]
  const [dynText, setDynText] = useState(lines[0])
  const dynIdx = useRef(1)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<any[]>([])

  useEffect(() => {
    const preferReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!preferReduced) {
      const t = setInterval(() => {
        setDynText(lines[dynIdx.current % lines.length])
        dynIdx.current += 1
      }, 4000)
      return () => clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    function resize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 34 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.7 + Math.random() * 2.8,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: 0.08 + Math.random() * 0.18,
    }))
    particlesRef.current = particles

    function tick() {
      ctx.clearRect(0, 0, w, h)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8)
        g.addColorStop(0, `rgba(150,160,255,${p.alpha})`)
        g.addColorStop(1, 'rgba(150,160,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(p.x - p.r * 8, p.y - p.r * 8, p.r * 16, p.r * 16)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

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

  const iconRef = useRef<HTMLImageElement | null>(null)
  const bumpIcon = () => {
    if (!iconRef.current) return
    iconRef.current.style.transform = 'translateY(-8px) scale(1.02)'
    setTimeout(() => {
      if (iconRef.current) iconRef.current.style.transform = ''
    }, 450)
  }

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
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'screen', opacity: 0.22, pointerEvents: 'none' }} />
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
        <div style={{ marginTop: '12%' }}>
          <div className="mono fs-hero" style={{ color: 'var(--text-primary)', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
            {hh}:{mm}
          </div>
          <div className="mono fs-aux" style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, letterSpacing: '1px' }}>
            {dateStr}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ChevronUp size={18} color="var(--text-tertiary)" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>上滑解锁</div>
        </div>

        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: '0 0 88px',
              height: 88,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              <img
                ref={iconRef}
                src="/lock-icon.svg"
                alt="锁屏图标"
                style={{ width: 64, height: 64, filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.6))', transition: 'transform .45s cubic-bezier(.2,.9,.3,1)' }}
                onClick={bumpIcon}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
              <div className="app-name" style={{ fontSize: 'calc(20px * var(--fs-scale))', color: 'var(--accent)' }}>{phoneName}</div>
              {signature ? (
                <div className="fs-aux" style={{ color: 'var(--text-secondary)', letterSpacing: '1px' }}>{signature}</div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.6px' }}>{dynText}</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 28, fontSize: 12, color: 'rgba(200,200,210,0.6)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'inline-block', width: 44, height: 10, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.5)', position: 'relative' }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: 'linear-gradient(90deg,#fff,#c6c8ff)', transform: 'translateX(0)', animation: 'swipe 2.4s infinite' }} />
          </div>
          <div>向上滑动解锁 · 轻触查看通知</div>
        </div>
      </div>

      <style>{`
        @keyframes swipe{0%{transform:translateX(0)}50%{transform:translateX(26px)}100%{transform:translateX(0)}}
        @media (prefers-reduced-motion:reduce){
          .mono, .fs-hero { transition: none !important }
        }
      `}</style>
    </div>
  )
}
