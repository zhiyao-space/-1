import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronUp, Volume2, VolumeX } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useClock } from '../hooks'
import { WallpaperLayer } from './WallpaperLayer'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const BRAND = 'mulin 小手机'

/** 随机发光文案：帅萌 + 一点点暗色氛围 */
const LINES = [
  '窸窣……像幽灵一样悄悄贴过来。',
  '别怕，我只偷一点点夜色。',
  '幽灵也上夜班，替你守着屏幕。',
  '嗡——小手机正在暗暗发光。',
  '把全世界的吵闹，都调成静音。',
  '黑白之间，藏了一点点可爱。',
  '我在的，别慌。',
  '深夜模式：已就绪。',
  '轻轻一划，就去见他们。',
  '今天的你，也很了不起。',
]

/* ── 幽灵形象（复用「小鬼」的身体曲线，坐镇在小手机后面） ── */
const GHOST_PATH =
  'M32 7c-13.3 0-24 10.7-24 24v20c0 2.8 3.3 4.2 5.4 2.4l1-.9c1.2-1 3-1 4.2 0l1.2 1c1.2 1 3 1 4.2 0l1.2-1c1.2-1 3-1 4.2 0l1.2 1c1.2 1 3 1 4.2 0l1 .9C52.7 55.2 56 53.8 56 51V31c0-13.3-10.7-24-24-24z'
const STAR_PATH = 'M0 -3.4L1 -1L3.4 0L1 1L0 3.4L-1 1L-3.4 0L-1 -1Z'
const HEART_PATH = 'M0 2.4C-3-1.6-8 1.4-4 5.6L0 9.6 4 5.6C8 1.4 3-1.6 0 2.4Z'

/* ── Web Audio 合成音效（无外部资源，跟随用户手势解锁播放） ── */
let audioCtx: AudioContext | null = null

function getAudio(): AudioContext | null {
  if (audioCtx) return audioCtx
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    audioCtx = new AC()
  } catch {
    return null
  }
  return audioCtx
}

function tone(
  c: AudioContext,
  at: number,
  o: { f0: number; f1?: number; dur: number; type?: OscillatorType; gain?: number }
) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(o.f0, at)
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), at + o.dur)
  const peak = o.gain ?? 0.05
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + o.dur + 0.03)
}

function noiseBurst(c: AudioContext, at: number, dur: number, gain = 0.05) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.1
  bp.frequency.setValueAtTime(3200, at)
  bp.frequency.exponentialRampToValueAtTime(700, at + dur)
  const g = c.createGain()
  g.gain.value = gain
  src.connect(bp).connect(g).connect(c.destination)
  src.start(at)
  src.stop(at + dur)
}

type Cue = 'hello' | 'rise' | 'slash' | 'ding' | 'pop' | 'pop2' | 'heart' | 'unlock'

function cue(name: Cue, delay = 0) {
  const c = getAudio()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const t = c.currentTime + 0.02 + delay
  switch (name) {
    case 'hello':
      tone(c, t, { f0: 660, f1: 990, dur: 0.14, gain: 0.05 })
      tone(c, t + 0.1, { f0: 990, dur: 0.18, gain: 0.04 })
      break
    case 'rise':
      tone(c, t, { f0: 200, f1: 640, dur: 0.34, type: 'triangle', gain: 0.04 })
      break
    case 'slash':
      noiseBurst(c, t, 0.16, 0.05)
      tone(c, t, { f0: 900, f1: 300, dur: 0.14, type: 'triangle', gain: 0.035 })
      break
    case 'ding':
      tone(c, t, { f0: 1046, dur: 0.12, gain: 0.05 })
      tone(c, t + 0.09, { f0: 1568, dur: 0.16, gain: 0.04 })
      break
    case 'pop':
      tone(c, t, { f0: 520, f1: 1040, dur: 0.12, gain: 0.05 })
      break
    case 'pop2':
      tone(c, t, { f0: 440, f1: 880, dur: 0.12, gain: 0.05 })
      break
    case 'heart':
      tone(c, t, { f0: 784, dur: 0.14, gain: 0.05 })
      tone(c, t + 0.12, { f0: 1046, dur: 0.14, gain: 0.045 })
      tone(c, t + 0.24, { f0: 1318, dur: 0.24, gain: 0.04 })
      break
    case 'unlock':
      tone(c, t, { f0: 523, dur: 0.1, gain: 0.05 })
      tone(c, t + 0.08, { f0: 784, dur: 0.12, gain: 0.045 })
      tone(c, t + 0.16, { f0: 1046, dur: 0.3, gain: 0.04 })
      break
  }
}

/** 按 5s 动画时间轴排布整段音效 */
function cueShow(delay = 0) {
  cue('rise', delay + 0.1)
  cue('slash', delay + 1.28)
  cue('ding', delay + 2.3)
  cue('pop', delay + 3.3)
  cue('pop2', delay + 3.6)
  cue('heart', delay + 4.5)
}

export default function LockScreen() {
  const unlock = useUI((s) => s.unlock)
  const { wallpapers, wallpaperFx, phoneName, signature } = useSettings()
  const now = useClock(1000)
  const [dragY, setDragY] = useState(0)
  const dragRef = useRef(0)
  const startY = useRef<number | null>(null)

  const [lineIdx, setLineIdx] = useState(() => Math.floor(Math.random() * LINES.length))
  const [soundOn, setSoundOn] = useState(true)
  const greetedRef = useRef(false)
  const [showKey, setShowKey] = useState(0)
  const showRef = useRef<HTMLDivElement>(null)

  // 随机发光文案轮播
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = window.setInterval(() => setLineIdx((i) => (i + 1) % LINES.length), 3200)
    return () => window.clearInterval(t)
  }, [])

  // 每轮 5s 动画结束后，对齐播放整段音效
  useEffect(() => {
    const el = showRef.current
    if (!el || !soundOn) return
    const onIter = () => cueShow(0)
    el.addEventListener('animationiteration', onIter)
    return () => el.removeEventListener('animationiteration', onIter)
  }, [showKey, soundOn])

  // 背景微光颗粒（替代原先尺寸不匹配的 canvas）
  const motes = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: 6 + Math.random() * 86,
        size: 2 + Math.random() * 4,
        dur: 4 + Math.random() * 5,
        delay: Math.random() * 5,
      })),
    []
  )

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY
    const c = getAudio()
    if (c && c.state === 'suspended') void c.resume()
    // 首次触摸：给一声轻轻的问候
    if (!greetedRef.current) {
      greetedRef.current = true
      if (soundOn) cue('hello')
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return
    const dy = e.clientY - startY.current
    if (dy < 0) {
      dragRef.current = dy
      setDragY(dy)
    }
  }
  const onPointerUp = () => {
    if (dragRef.current < -70) {
      if (soundOn) cue('unlock')
      unlock()
    }
    dragRef.current = 0
    setDragY(0)
    startY.current = null
  }

  const onMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowKey((k) => k + 1)
    if (soundOn) cue('hello')
  }

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`
  const sig = signature.trim() || (phoneName.trim() ? `${phoneName.trim()} 的小手机` : '')

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
      <WallpaperLayer imageId={wallpapers.lock} fx={wallpaperFx.lock} />

      {/* 暗角 + 微光颗粒 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 34%, rgba(255,255,255,0.06) 0%, transparent 46%), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {motes.map((m) => (
        <span
          key={m.id}
          className="ls-mote"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.size,
            height: m.size,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}

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
        {/* 时间 */}
        <div style={{ marginTop: '8%' }}>
          <div className="mono fs-hero" style={{ color: 'var(--text-primary)', textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>
            {hh}:{mm}
          </div>
          <div className="mono fs-aux" style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, letterSpacing: '1px' }}>
            {dateStr}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* 幽灵小剧场 · 5s 循环 */}
        <div
          key={showKey}
          ref={showRef}
          className="ls-show"
          onClick={onMascotClick}
          title="点我一下"
          style={{ position: 'relative', width: 176, height: 176, cursor: 'pointer' }}
        >
          <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
            <defs>
              <radialGradient id="ls-body" cx="38%" cy="30%" r="76%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#d2d2d2" />
                <stop offset="100%" stopColor="#6d6d6d" />
              </radialGradient>
              <radialGradient id="ls-halo-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="58%" stopColor="#ffffff" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ls-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#8f8f8f" />
              </linearGradient>
            </defs>

            <circle className="ls-halo" cx="32" cy="32" r="28" fill="url(#ls-halo-grad)" style={{ opacity: 0.3 }} />

            {/* 大手机（背景） */}
            <g className="ls-phone">
              <rect
                x="6"
                y="35"
                width="52"
                height="23"
                rx="7.5"
                fill="rgba(255,255,255,0.03)"
                stroke="url(#ls-stroke)"
                strokeWidth="2.2"
                transform="rotate(-8 32 46.5)"
              />
              <circle cx="51" cy="45" r="1.3" fill="#cfcfcf" transform="rotate(-8 32 46.5)" />
            </g>

            {/* 幽灵本体 */}
            <g className="ls-ghost">
              <path d={GHOST_PATH} fill="url(#ls-body)" />
              <ellipse cx="25" cy="27.5" rx="3.1" ry="3.7" fill="#141414" />
              <ellipse cx="39" cy="27.5" rx="3.1" ry="3.7" fill="#141414" />
              <path d="M29 34.5q3 2.4 6 0" fill="none" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            {/* 配饰一：小剑 + 斩击弧 */}
            <g className="ls-sword">
              <line x1="52" y1="31" x2="60" y2="13" stroke="url(#ls-stroke)" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="48.5" y1="32.5" x2="55.5" y2="29.5" stroke="#ececec" strokeWidth="2" strokeLinecap="round" />
              <line x1="52" y1="31" x2="51" y2="35" stroke="#cfcfcf" strokeWidth="2.2" strokeLinecap="round" />
            </g>
            <path className="ls-slash" d="M43 13A22 22 0 0 1 62 34" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />

            {/* 配饰二：小手机 */}
            <g className="ls-mini">
              <rect x="41" y="0.5" width="13" height="19" rx="3.4" fill="rgba(255,255,255,0.06)" stroke="url(#ls-stroke)" strokeWidth="1.8" />
              <line className="ls-mini-screen" x1="44" y1="6" x2="51" y2="6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
              <line className="ls-mini-screen" x1="44" y1="9.5" x2="49" y2="9.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            </g>

            {/* 配饰三：小猫 / 小狗 */}
            <g transform="translate(3,48)">
              <g className="ls-cat">
                <path d="M4.6 4.6L3 0.6L7.6 3.2Z" fill="url(#ls-stroke)" />
                <path d="M13.4 4.6L15 0.6L10.4 3.2Z" fill="url(#ls-stroke)" />
                <circle cx="9" cy="9.4" r="6" fill="#0e0e0e" stroke="url(#ls-stroke)" strokeWidth="1.6" />
                <circle cx="7" cy="9.2" r="1" fill="#ffffff" />
                <circle cx="11" cy="9.2" r="1" fill="#ffffff" />
                <path d="M7.4 12.2q1.6 1.2 3.2 0" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
              </g>
            </g>
            <g transform="translate(47,48)">
              <g className="ls-dog">
                <ellipse cx="2.6" cy="8.6" rx="2.6" ry="5.2" fill="url(#ls-stroke)" />
                <ellipse cx="15.4" cy="8.6" rx="2.6" ry="5.2" fill="url(#ls-stroke)" />
                <circle cx="9" cy="9.6" r="6.2" fill="#0e0e0e" stroke="url(#ls-stroke)" strokeWidth="1.6" />
                <circle cx="7" cy="9.2" r="1" fill="#ffffff" />
                <circle cx="11" cy="9.2" r="1" fill="#ffffff" />
                <ellipse cx="9" cy="12.4" rx="1.5" ry="1.1" fill="#ffffff" />
              </g>
            </g>

            {/* 星星 / 爱心 */}
            <g transform="translate(11,13)">
              <g className="ls-spark">
                <path d={STAR_PATH} fill="#ffffff" />
              </g>
            </g>
            <g transform="translate(55,17)">
              <g className="ls-spark" style={{ animationDelay: '0.12s' }}>
                <path d={STAR_PATH} fill="#ffffff" transform="scale(0.8)" />
              </g>
            </g>
            <g transform="translate(8,28)">
              <g className="ls-spark" style={{ animationDelay: '0.22s' }}>
                <path d={STAR_PATH} fill="#ffffff" transform="scale(0.7)" />
              </g>
            </g>
            <g transform="translate(50,6)">
              <g className="ls-heart">
                <path d={HEART_PATH} fill="url(#ls-stroke)" />
              </g>
            </g>
          </svg>
        </div>

        {/* 随机发光文案 */}
        <div style={{ height: 34, marginTop: 10, display: 'flex', alignItems: 'center' }}>
          <span
            key={lineIdx}
            className="ls-line fs-aux"
            style={{
              color: 'var(--text-body)',
              letterSpacing: '1px',
              textShadow: '0 0 12px rgba(255,255,255,0.35), 0 0 26px var(--accent)',
            }}
          >
            {LINES[lineIdx]}
          </span>
        </div>

        {/* 品牌名 + 签名 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div className="app-name ls-brand" style={{ fontSize: 'calc(22px * var(--fs-scale))', letterSpacing: 4 }}>
            {BRAND}
          </div>
          {sig && (
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
              {sig}
            </div>
          )}
        </div>

        {/* 上滑解锁 */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ChevronUp size={18} color="var(--text-tertiary)" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>上滑解锁</div>
          <div
            style={{
              marginTop: 4,
              display: 'inline-block',
              width: 46,
              height: 10,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.02)',
              boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: 'linear-gradient(90deg, #fff, var(--accent))',
                animation: 'swipe 2.4s infinite',
              }}
            />
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* 音效开关 */}
      <button
        className="pressable"
        onClick={(e) => {
          e.stopPropagation()
          const next = !soundOn
          setSoundOn(next)
          if (next) cue('ding')
        }}
        title={soundOn ? '关闭音效' : '开启音效'}
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: soundOn ? 'var(--text-secondary)' : 'var(--text-disabled)',
        }}
      >
        {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>

      <style>{`
        @keyframes swipe{0%{transform:translateX(0)}50%{transform:translateX(30px)}100%{transform:translateX(0)}}
      `}</style>
    </div>
  )
}