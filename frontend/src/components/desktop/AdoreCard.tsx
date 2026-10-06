import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Heart } from 'lucide-react'
import Avatar from '../chat/Avatar'
import { useSettings } from '../../store/settings'
import { useCharacters, type Character } from '../../store/characters'
import { useChats } from '../../store/chats'
import { useSms } from '../../store/sms'
import { useCalls } from '../../store/calls'
import { useUI } from '../../store/ui'
import { useCopy } from '../../store/copy'
import { useProfile, displayUserName } from '../../store/profile'
import type { ModuleStyles } from '../../store/desktopModules'
import { cardStyle } from './moduleStyle'
import '../../styles/adore.css'

/** 仰慕文案：逐字发光显影 */
const LOVE_LINE = '如果你是星星，那肯定是我的满天星'

/** 星空底纹：发光星点 + 缓慢游走的星连线 + 偶发流星 */
function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 1
    let h = 1
    const stars = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.5,
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      warm: Math.random() < 0.32,
    }))
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)

      // 星与星之间的发光连线（位置缓慢漂移，连线随之移动）
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i]
          const b = stars[j]
          const d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h)
          if (d > 76) continue
          const alpha = (1 - d / 76) * 0.34 * (0.62 + 0.38 * Math.sin(t / 900 + a.ph))
          const g = ctx.createLinearGradient(a.x * w, a.y * h, b.x * w, b.y * h)
          g.addColorStop(0, `rgba(196,208,255,${alpha})`)
          g.addColorStop(1, `rgba(255,206,238,${alpha})`)
          ctx.strokeStyle = g
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.moveTo(a.x * w, a.y * h)
          ctx.lineTo(b.x * w, b.y * h)
          ctx.stroke()
        }
      }

      // 星星本体 + 呼吸辉光
      for (const s of stars) {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0 || s.x > 1) s.vx *= -1
        if (s.y < 0 || s.y > 1) s.vy *= -1
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t / 700) * s.sp + s.ph))
        const x = s.x * w
        const y = s.y * h
        const rgb = s.warm ? '255,214,238' : '214,224,255'
        const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 6)
        halo.addColorStop(0, `rgba(${rgb},${0.9 * tw})`)
        halo.addColorStop(0.4, `rgba(${rgb},${0.22 * tw})`)
        halo.addColorStop(1, `rgba(${rgb},0)`)
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(x, y, s.r * 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255,255,255,${0.85 * tw})`
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 偶发流星
      if (!shoot && Math.random() < 0.004) {
        shoot = {
          x: Math.random() * w * 0.5,
          y: Math.random() * h * 0.4,
          vx: 1.4 + Math.random(),
          vy: 0.7 + Math.random() * 0.5,
          life: 1,
        }
      }
      if (shoot) {
        shoot.x += shoot.vx * 3
        shoot.y += shoot.vy * 3
        shoot.life -= 0.012
        if (shoot.life <= 0 || shoot.x > w + 40 || shoot.y > h + 40) {
          shoot = null
        } else {
          const tx = shoot.x - (shoot.vx * 46) / 3
          const ty = shoot.y - (shoot.vy * 46) / 3
          const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty)
          g.addColorStop(0, `rgba(255,255,255,${0.75 * shoot.life})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(shoot.x, shoot.y)
          ctx.lineTo(tx, ty)
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [canvasRef])
}

export default function AdoreCard({ styles }: { styles: ModuleStyles }) {
  const characters = useCharacters((s) => s.characters)
  const sessions = useChats((s) => s.sessions)
  const sms = useSms((s) => s.messages)
  const calls = useCalls((s) => s.records)
  const openApp = useUI((s) => s.openApp)
  const setPendingChat = useUI((s) => s.setPendingChat)
  const title = useCopy((s) => s.texts.recentTitle)
  const emptyRecent = useCopy((s) => s.texts.emptyRecent)
  const userAvatarId = useProfile((s) => s.profile.masks.find((m) => m.active)?.avatarId ?? s.profile.avatarId)
  const phoneName = useSettings((s) => s.phoneName)
  const userName = displayUserName(phoneName) || '我'

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useStarfield(canvasRef)

  const [revealKey, setRevealKey] = useState(0)
  const [burstKey, setBurstKey] = useState(0)

  const items = useMemo(() => {
    const lastActive = new Map<string, number>()
    for (const s of sessions) {
      lastActive.set(s.characterId, Math.max(lastActive.get(s.characterId) ?? 0, s.lastActive))
    }
    return characters
      .map((c) => ({
        c,
        at: lastActive.get(c.id) ?? c.createdAt,
        unread:
          sms.filter((m) => m.senderId === c.id && !m.isRead && !m.outgoing).length +
          calls.filter((r) => r.callerId === c.id && r.callType === 'missed' && !r.isRead).length,
      }))
      .sort((a, b) => b.at - a.at)
  }, [characters, sessions, sms, calls])

  const focus: Character | null = items[0]?.c ?? null
  const others = items.slice(1, 7)

  // 自动互动：定期冒出星屑
  useEffect(() => {
    const t = window.setInterval(() => setBurstKey((k) => k + 1), 7000)
    return () => window.clearInterval(t)
  }, [])

  const poke = () => {
    setRevealKey((k) => k + 1)
    setBurstKey((k) => k + 1)
  }

  const sparks = useMemo(() => {
    if (burstKey === 0) return []
    return Array.from({ length: 15 }, () => {
      const ang = Math.random() * Math.PI * 2
      const dist = 26 + Math.random() * 62
      return {
        tx: `${Math.cos(ang) * dist}px`,
        ty: `${Math.sin(ang) * dist - 18}px`,
        d: `${Math.random() * 0.16}s`,
      }
    })
  }, [burstKey])

  const hearts = useMemo(() => {
    if (burstKey === 0) return []
    return Array.from({ length: 3 }, (_, i) => ({
      tx: `${(i - 1) * 22 + (Math.random() * 12 - 6)}px`,
      ty: `${-72 - Math.random() * 34}px`,
      d: `${i * 0.12}s`,
    }))
  }, [burstKey])

  const openChat = (id: string) => {
    setPendingChat({ kind: 'single', characterId: id })
    openApp('chat')
  }

  return (
    <div className="no-select adore-card" style={cardStyle(styles)}>
      <canvas ref={canvasRef} className="adore-canvas" aria-hidden />
      <div className="adore-veil" aria-hidden />

      <div className="adore-body">
        <span className="adore-title">{title}</span>

        <div className="adore-pair">
          {focus ? (
            <button className="adore-ava pressable" onClick={() => openChat(focus.id)}>
              <span className="adore-ring">
                <Avatar imageId={focus.avatarId} name={focus.name} size={48} />
              </span>
              <span className="adore-name">{focus.name}</span>
            </button>
          ) : (
            <div className="adore-ava">
              <span className="adore-ring">
                <Avatar imageId={null} name="?" size={48} />
              </span>
            </div>
          )}

          <div className="adore-link">
            <svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="adoreLinkGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(200,212,255,0.15)" />
                  <stop offset="50%" stopColor="rgba(255,224,244,0.85)" />
                  <stop offset="100%" stopColor="rgba(255,186,220,0.15)" />
                </linearGradient>
              </defs>
              <path
                className="adore-flow"
                d="M2 23 C 30 12, 70 34, 98 23"
                fill="none"
                stroke="url(#adoreLinkGrad)"
                strokeWidth="1"
              />
              <path
                className="adore-dash"
                d="M2 23 C 30 12, 70 34, 98 23"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1"
                strokeDasharray="4 7"
              />
            </svg>
            <button className="adore-heart pressable" onClick={poke} aria-label="互动">
              <Heart size={13} color="#ffd8ec" fill="#ffd8ec" />
            </button>
          </div>

          <div className="adore-ava">
            <span className="adore-ring adore-ring--user">
              <Avatar imageId={userAvatarId} name={userName} size={48} />
            </span>
            <span className="adore-name">{userName}</span>
          </div>
        </div>

        <span key={revealKey} className="adore-line">
          {Array.from(LOVE_LINE).map((ch, i) => (
            <span key={i} style={{ '--d': `${i * 0.07}s` } as CSSProperties}>
              {ch}
            </span>
          ))}
        </span>

        {others.length > 0 && (
          <div className="adore-mini">
            {others.map(({ c, unread }) => (
              <button key={c.id} className="adore-mini-btn" onClick={() => openChat(c.id)} title={c.name}>
                <Avatar imageId={c.avatarId} name={c.name} size={26} />
                {unread > 0 && <span className="adore-dot" />}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 && <div className="adore-empty">{emptyRecent}</div>}
      </div>

      {burstKey > 0 && (
        <div key={burstKey} className="adore-fx" aria-hidden>
          {sparks.map((s, i) => (
            <span key={`s${i}`} className="adore-spark" style={{ '--tx': s.tx, '--ty': s.ty, '--d': s.d } as CSSProperties} />
          ))}
          {hearts.map((h, i) => (
            <span key={`h${i}`} className="adore-rise" style={{ '--tx': h.tx, '--ty': h.ty, '--d': h.d } as CSSProperties}>
              ♥
            </span>
          ))}
        </div>
      )}
    </div>
  )
}