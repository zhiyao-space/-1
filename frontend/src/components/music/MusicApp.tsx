import { useState } from 'react'
import { ChevronDown, ChevronUp, Music, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { currentTrack, fmtTime, useMusic } from '../../store/music'
import { useBlobURL } from '../WallpaperLayer'
import PlaylistManager from './PlaylistManager'

export default function MusicApp() {
  const tracks = useMusic((s) => s.tracks)
  const index = useMusic((s) => s.index)
  const track = useMusic((s) => currentTrack(s))
  const playing = useMusic((s) => s.playing)
  const currentTime = useMusic((s) => s.currentTime)
  const duration = useMusic((s) => s.duration)
  const volume = useMusic((s) => s.volume)
  const defaultCoverId = useMusic((s) => s.defaultCoverId)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const seek = useMusic((s) => s.seek)
  const playIndex = useMusic((s) => s.playIndex)
  const setVolume = useMusic((s) => s.setVolume)

  const [manage, setManage] = useState(false)
  const coverUrl = useBlobURL(track?.coverId ?? defaultCoverId)
  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="nav-title fs-h2" style={{ padding: '16px 20px 8px', color: 'var(--text-primary)' }}>
        音乐
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                overflow: 'hidden',
                flexShrink: 0,
                background: 'linear-gradient(160deg, #2a2a2a 0%, #0a0a0a 100%)',
                border: '1px solid #2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
              }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Music size={30} strokeWidth={1.6} />
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="fs-h2" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track?.title ?? '未在播放'}
              </div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                {track?.artist || (tracks.length ? '未知歌手' : '在下方歌单管理中添加音频')}
              </div>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(ratio * 1000)}
            disabled={!track || duration <= 0}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            style={{ width: '100%', height: 4 }}
          />
          <div className="mono fs-micro" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginTop: 6 }}>
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 12 }}>
            <button className="pressable" onClick={prev} disabled={tracks.length === 0} style={{ color: 'var(--text-secondary)' }}>
              <SkipBack size={20} />
            </button>
            <button
              className="pressable"
              onClick={toggle}
              disabled={tracks.length === 0}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: tracks.length === 0 ? 'rgba(255,255,255,0.15)' : 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {playing ? <Pause size={22} color="#000" /> : <Play size={22} color="#000" />}
            </button>
            <button className="pressable" onClick={next} disabled={tracks.length === 0} style={{ color: 'var(--text-secondary)' }}>
              <SkipForward size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <Volume2 size={15} color="var(--text-tertiary)" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              style={{ flex: 1, height: 4 }}
            />
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 14 }}>
          {tracks.length === 0 ? (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: 16, textAlign: 'center' }}>
              歌单为空
            </div>
          ) : (
            tracks.map((t, i) => {
              const active = i === index
              return (
                <button
                  key={t.id}
                  className="pressable"
                  onClick={() => playIndex(i)}
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
                    {active && playing ? <Pause size={15} /> : <Play size={15} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="fs-body" style={{ display: 'block', color: active ? 'var(--text-primary)' : 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                    <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{t.artist}</span>
                  </span>
                  {active && <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{fmtTime(currentTime)}</span>}
                </button>
              )
            })
          )}
        </div>

        <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16 }}>
          <button
            className="pressable"
            onClick={() => setManage((v) => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)' }}
          >
            <span className="fs-body">歌单管理</span>
            {manage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {manage && <div style={{ marginTop: 14 }}><PlaylistManager /></div>}
        </div>
      </div>
    </div>
  )
}