import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music as MusicIcon,
  Plus,
  Trash2,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  Sun,
  RefreshCw,
} from 'lucide-react'
import { WidgetInstance, useDesktop, WIDGET_META, WidgetType, Song } from '../store/desktop'
import { useUI, AppId } from '../store/ui'
import { useSettings } from '../store/settings'
import { useBlobURL } from './WallpaperLayer'
import { putBlob, getBlobURL } from '../lib/idb'
import { useClock } from '../hooks'
import { useToast } from '../store/ui'

const APP_ICONS: Record<AppId, string> = {
  settings: '设置',
  about: '关于',
  contacts: '通讯录',
  messages: '信息',
  forum: '论坛',
  moments: '朋友圈',
  music: '音乐',
}

export function widgetBoxStyle(w: WidgetInstance): React.CSSProperties {
  const base: React.CSSProperties = {
    opacity: w.opacity,
    borderRadius: w.radius,
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  }
  switch (w.theme) {
    case 'glass':
      return { ...base, background: 'rgba(255,255,255,var(--glass-alpha))', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid rgba(255,255,255,var(--glass-border-alpha))' }
    case 'solid':
      return { ...base, background: 'var(--bg-panel)', border: '1px solid rgba(255,255,255,0.08)' }
    case 'transparent':
      return base
    case 'border':
      return { ...base, border: '1px solid rgba(255,255,255,0.2)' }
    case 'image':
      return base
    default:
      return base
  }
}

function WidgetBgImage({ id }: { id: string | null }) {
  const url = useBlobURL(id)
  if (!url) return null
  return <img src={url} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
}

const WCODE_MAP: [number[], 'sun' | 'cloud' | 'rain' | 'snow' | 'fog'][] = [
  [[0, 1], 'sun'],
  [[2, 3, 45, 48], 'fog'],
  [[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99], 'rain'],
  [[71, 73, 75, 77, 85, 86], 'snow'],
]

function WeatherIcon({ code, size = 26 }: { code: number; size?: number }) {
  let kind: 'sun' | 'cloud' | 'rain' | 'snow' | 'fog' = 'cloud'
  for (const [codes, k] of WCODE_MAP) {
    if (codes.includes(code)) {
      kind = k
      break
    }
  }
  const color = 'var(--text-primary)'
  if (kind === 'sun') return <Sun size={size} color={color} />
  if (kind === 'rain') return <CloudRain size={size} color={color} />
  if (kind === 'snow') return <CloudSnow size={size} color={color} />
  if (kind === 'fog') return <CloudFog size={size} color={color} />
  return <Cloud size={size} color={color} />
}

function TimeWidget({ w }: { w: WidgetInstance }) {
  const now = useClock(w.config.showSeconds ? 1000 : 10000)
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  if (w.style === 'B') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="mono fs-aux" style={{ color: 'var(--text-secondary)' }}>
          {now.getMonth() + 1}月{now.getDate()}日
        </div>
        <div className="mono fs-h1" style={{ color: 'var(--text-primary)' }}>
          {hh}:{mm}
        </div>
      </div>
    )
  }
  if (w.style === 'C') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="mono fs-aux" style={{ color: 'var(--text-secondary)', letterSpacing: '2px' }}>
          {weekdays[now.getDay()]} {now.getDate()}
        </div>
        <div className="mono fs-h1" style={{ color: 'var(--text-primary)' }}>
          {hh}:{mm}
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span className="mono" style={{ fontSize: 'calc(30px * var(--fs-scale))', fontWeight: 300, color: 'var(--text-primary)' }}>
        {hh}:{mm}
        {w.config.showSeconds && <span style={{ fontSize: '0.5em', color: 'var(--text-secondary)' }}>:{ss}</span>}
      </span>
    </div>
  )
}

function WeatherWidget({ w, onEdit }: { w: WidgetInstance; onEdit: (id: string) => void }) {
  const city = w.config.city
  const [state, setState] = useState<{ temp?: number; code?: number; loading: boolean; error: string }>({
    loading: false,
    error: '',
  })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!city) return
    let alive = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`
    )
      .then((r) => r.json())
      .then((geo) => {
        const loc = geo?.results?.[0]
        if (!loc) throw new Error('未找到城市')
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`
        ).then((r) => r.json())
      })
      .then((data) => {
        if (!alive) return
        setState({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, loading: false, error: '' })
      })
      .catch((e) => {
        if (alive) setState({ loading: false, error: e.message || '天气获取失败' })
      })
    return () => {
      alive = false
    }
  }, [city, tick])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: 12 }}>
      {city ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono fs-micro" style={{ color: 'var(--text-secondary)' }}>{city}</span>
            <button
              className="pressable"
              onClick={(e) => {
                e.stopPropagation()
                setTick((t) => t + 1)
              }}
              style={{ color: 'var(--text-tertiary)' }}
            >
              <RefreshCw size={12} className={state.loading ? 'spin' : ''} />
            </button>
          </div>
          {state.error ? (
            <div className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>{state.error}</div>
          ) : state.temp !== undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <WeatherIcon code={state.code ?? 0} />
              <span className="mono fs-h1" style={{ color: 'var(--text-primary)' }}>{state.temp}°</span>
            </div>
          ) : (
            <div className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>加载中…</div>
          )}
        </>
      ) : (
        <button
          className="pressable"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(w.id)
          }}
          style={{ color: 'var(--text-tertiary)', fontSize: 'calc(12px * var(--fs-scale))', height: '100%' }}
        >
          <Plus size={16} style={{ display: 'block', margin: '0 auto 6px' }} />
          点击配置城市
        </button>
      )}
    </div>
  )
}

function MusicWidget({ w }: { w: WidgetInstance }) {
  const songs = w.config.songs ?? []
  const current = w.config.currentSong ?? 0
  const updateConfig = useDesktop((s) => s.updateWidgetConfig)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const song = songs[current]

  useEffect(() => {
    let alive = true
    setUrl(null)
    setProgress(0)
    if (song) {
      getBlobURL(song.blobId).then((u) => {
        if (alive) setUrl(u ?? null)
      })
    }
    return () => {
      alive = false
    }
  }, [song?.blobId])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !song) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  const step = (dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation()
    if (songs.length === 0) return
    const next = (current + dir + songs.length) % songs.length
    updateConfig(w.id, { currentSong: next })
    setPlaying(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%', padding: '0 12px' }}>
      {song && url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={(e) => {
            const a = e.currentTarget
            if (a.duration) setProgress(a.currentTime / a.duration)
          }}
          onEnded={() => step(1, { stopPropagation: () => {} } as React.MouseEvent)}
        />
      )}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {w.imageUrlId ? <WidgetBgImage id={w.imageUrlId} /> : <MusicIcon size={18} color="var(--text-secondary)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-aux" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {song ? song.name : '未添加歌曲'}
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 2, background: 'var(--accent)', transition: 'width 200ms linear' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {w.style === 'full' && (
          <button className="pressable" onClick={(e) => step(-1, e)} style={{ color: 'var(--text-secondary)', padding: 4 }}>
            <SkipBack size={15} />
          </button>
        )}
        <button className="pressable" onClick={toggle} style={{ color: 'var(--text-primary)', padding: 4 }}>
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button className="pressable" onClick={(e) => step(1, e)} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <SkipForward size={15} />
        </button>
      </div>
    </div>
  )
}

function ShortcutWidget({ w }: { w: WidgetInstance }) {
  const openApp = useUI((s) => s.openApp)
  const iconSize = useSettings((s) => s.desktopIconSize)
  const customIcon = useBlobURL(w.config.iconUrlId ?? null)
  const label = w.config.label || (w.config.appId ? APP_ICONS[w.config.appId as AppId] : '入口')
  return (
    <button
      className="pressable"
      onClick={(e) => {
        e.stopPropagation()
        if (w.config.appId) openApp(w.config.appId as AppId)
      }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}
    >
      <div
        style={{
          width: iconSize + 16,
          height: iconSize + 16,
          borderRadius: iconSize * 0.45,
          background: 'rgba(255,255,255,0.09)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {customIcon ? (
          <img src={customIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="nav-title" style={{ fontSize: iconSize * 0.5, color: 'var(--text-primary)' }}>
            {label.slice(0, 1)}
          </span>
        )}
      </div>
      <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </button>
  )
}

function TextWidget({ w }: { w: WidgetInstance }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: w.config.align === 'left' ? 'flex-start' : w.config.align === 'right' ? 'flex-end' : 'center',
        padding: 10,
      }}
    >
      <span
        style={{
          fontSize: w.config.fontSize ?? 14,
          color: w.config.color ?? 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          width: '100%',
          textAlign: w.config.align ?? 'center',
          lineHeight: 1.5,
        }}
      >
        {w.content}
      </span>
    </div>
  )
}

function AvatarWidget({ w }: { w: WidgetInstance }) {
  const url = useBlobURL(w.config.avatarId ?? null)
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>无头像</span>}
      </div>
      {w.config.label && (
        <span className="fs-aux" style={{ color: 'var(--text-primary)' }}>{w.config.label}</span>
      )}
      {w.content && (
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>{w.content}</span>
      )}
    </div>
  )
}

function SysInfoWidget({ w }: { w: WidgetInstance }) {
  const now = useClock(30000)
  const [battery, setBattery] = useState<number | null>(null)
  useEffect(() => {
    if ('getBattery' in navigator) {
      ;(navigator as any).getBattery().then((b: any) => setBattery(Math.round(b.level * 100)))
    }
  }, [])
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', gap: 4 }}>
      <div className="fs-aux" style={{ color: 'var(--text-primary)' }}>
        {now.getMonth() + 1}月{now.getDate()}日 周{weekdays[now.getDay()]}
      </div>
      <div className="mono fs-micro" style={{ color: 'var(--text-secondary)' }}>
        电量 {battery !== null ? `${battery}%` : '未知'}
      </div>
    </div>
  )
}

export function WidgetInner({ w, onEdit }: { w: WidgetInstance; onEdit?: (id: string) => void }) {
  if (w.theme === 'image' && w.imageUrlId) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <WidgetBgImage id={w.imageUrlId} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="nav-title fs-body" style={{ color: '#fff' }}>{w.config.label || w.content}</span>
        </div>
      </div>
    )
  }
  switch (w.type) {
    case 'time':
      return <TimeWidget w={w} />
    case 'weather':
      return <WeatherWidget w={w} onEdit={onEdit ?? (() => {})} />
    case 'music':
      return <MusicWidget w={w} />
    case 'shortcut':
      return <ShortcutWidget w={w} />
    case 'text':
      return <TextWidget w={w} />
    case 'avatar':
      return <AvatarWidget w={w} />
    case 'sysinfo':
      return <SysInfoWidget w={w} />
    default:
      return null
  }
}
