import { useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useDesktop, type NowPlaying } from '../../store/desktopModules'
import { MusicIcon, PlayIcon, PauseIcon } from '../desktop/DockIcons'

interface Track {
  title: string
  artist: string
  duration: number
}

/**
 * 本地曲库（占位音源）。
 * 说明：当前项目未接入网易云等外部音源，此播放器为本地模拟播放，
 * 仅驱动桌面「正在播放」模块的曲目 / 进度展示。
 */
const TRACKS: Track[] = [
  { title: '空蚀', artist: 'Nightfall', duration: 214 },
  { title: '雨夜列车', artist: 'Quiet Room', duration: 188 },
  { title: '沉默的频率', artist: 'Static', duration: 236 },
  { title: '无人应答', artist: 'Void', duration: 201 },
  { title: '凌晨三点', artist: 'Afterglow', duration: 245 },
]

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MusicApp() {
  const nowPlaying = useDesktop((s) => s.nowPlaying)
  const setNowPlaying = useDesktop((s) => s.setNowPlaying)
  const updatePlayback = useDesktop((s) => s.updatePlayback)

  // 播放推进：仅在 playing 时逐秒前进，播完自动下一首
  useEffect(() => {
    if (!nowPlaying?.playing) return
    const timer = window.setInterval(() => {
      const cur = useDesktop.getState().nowPlaying
      if (!cur || !cur.playing) return
      const next = cur.progress + 1 / Math.max(1, cur.duration)
      if (next >= 1) {
        const idx = TRACKS.findIndex((t) => t.title === cur.title)
        const nx = TRACKS[(idx + 1) % TRACKS.length]
        const payload: NowPlaying = { ...nx, coverId: null, progress: 0, playing: true }
        setNowPlaying(payload)
      } else {
        updatePlayback({ progress: next })
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [nowPlaying?.playing, nowPlaying?.title, setNowPlaying, updatePlayback])

  const play = (t: Track) => setNowPlaying({ ...t, coverId: null, progress: 0, playing: true })

  const step = (dir: 1 | -1) => {
    const cur = nowPlaying?.title
    const idx = Math.max(0, TRACKS.findIndex((t) => t.title === cur))
    const nx = TRACKS[(idx + dir + TRACKS.length) % TRACKS.length]
    play(nx)
  }

  const current = nowPlaying
  const elapsed = current ? current.progress * current.duration : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="nav-title fs-h2" style={{ padding: '16px 20px 8px', color: 'var(--text-primary)' }}>
        音乐
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <div
          className="glass"
          style={{ borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14, textAlign: 'center' }}
        >
          <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <MusicIcon size={34} />
          </div>
          <div className="fs-h2" style={{ color: 'var(--text-primary)' }}>
            {current?.title ?? '未在播放'}
          </div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
            {current?.artist ?? '选择下方曲目开始播放'}
          </div>

          <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.12)', margin: '14px 0 6px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, (current?.progress ?? 0) * 100))}%`, height: '100%', background: 'var(--accent)' }} />
          </div>
          <div className="mono fs-micro" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
            <span>{fmt(elapsed)}</span>
            <span>{fmt(current?.duration ?? 0)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 14 }}>
            <button className="pressable" onClick={() => step(-1)} style={{ color: 'var(--text-secondary)' }}>
              <SkipBack size={20} />
            </button>
            <button
              className="pressable"
              onClick={() => (current ? updatePlayback({ playing: !current.playing }) : play(TRACKS[0]))}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {current?.playing ? <Pause size={22} color="#000" /> : <Play size={22} color="#000" />}
            </button>
            <button className="pressable" onClick={() => step(1)} style={{ color: 'var(--text-secondary)' }}>
              <SkipForward size={20} />
            </button>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {TRACKS.map((t) => {
            const active = current?.title === t.title
            return (
              <button
                key={t.title}
                className="pressable"
                onClick={() => play(t)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', width: 18, color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {active && current?.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fs-body" style={{ display: 'block', color: active ? 'var(--text-primary)' : 'var(--text-body)' }}>
                    {t.title}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{t.artist}</span>
                </span>
                <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)' }}>{fmt(t.duration)}</span>
              </button>
            )
          })}
        </div>

        <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center', marginTop: 12 }}>
          本地模拟播放（项目暂未接入网易云等外部音源）
        </div>
      </div>
    </div>
  )
}