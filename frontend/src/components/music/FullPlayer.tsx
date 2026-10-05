import { useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Heart, Pause, Play, Share2, SkipBack, SkipForward } from 'lucide-react'
import { currentTrack, fmtTime, useMusic } from '../../store/music'
import { parseLrc } from '../../lib/netease'
import { TrackCover } from './cover'

/** 全屏播放页：旋转唱片 + 歌词滚动 + 可拖动进度条 */
export default function FullPlayer({ onClose, onShare }: { onClose: () => void; onShare: () => void }) {
  const track = useMusic((s) => currentTrack(s))
  const playing = useMusic((s) => s.playing)
  const currentTime = useMusic((s) => s.currentTime)
  const duration = useMusic((s) => s.duration)
  const lyric = useMusic((s) => s.lyric)
  const lyricFor = useMusic((s) => s.lyricFor)
  const likedIds = useMusic((s) => s.likedIds)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const seek = useMusic((s) => s.seek)
  const toggleLike = useMusic((s) => s.toggleLike)

  const lines = useMemo(() => parseLrc(lyricFor === track?.id ? lyric : ''), [lyric, lyricFor, track?.id])
  const activeIndex = useMemo(() => {
    if (lines.length === 0) return -1
    let idx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime + 0.25) idx = i
      else break
    }
    return idx
  }, [lines, currentTime])

  const lyricBox = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const box = lyricBox.current
    if (!box || activeIndex < 0) return
    const el = box.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`)
    if (!el) return
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
  }, [activeIndex])

  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const liked = track ? likedIds.includes(track.id) : false

  return (
    <div
      className="no-select page-enter"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 610,
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 50% 12%, #1c1c1c 0%, #050505 62%, #000 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', flexShrink: 0 }}>
        <button className="pressable" onClick={onClose} style={{ color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
          <ChevronDown size={22} />
        </button>
        <div className="fs-micro" style={{ flex: 1, textAlign: 'center', color: 'var(--text-tertiary)' }}>正在播放</div>
        <div style={{ width: 30 }} />
      </div>

      {/* 旋转唱片 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', flexShrink: 0 }}>
        <div
          style={{
            width: 212,
            height: 212,
            borderRadius: '50%',
            padding: 10,
            background: 'conic-gradient(from 0deg, #1a1a1a, #050505, #1a1a1a, #050505, #1a1a1a)',
            boxShadow: '0 0 46px rgba(255,255,255,0.10), inset 0 0 22px rgba(0,0,0,0.85)',
            animation: 'ksc-spin 22s linear infinite',
            animationPlayState: playing ? 'running' : 'paused',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            <TrackCoverWrapper />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '12px 24px 6px', flexShrink: 0 }}>
        <div className="fs-h2" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track?.title ?? '未在播放'}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track ? [track.artist, track.album].filter(Boolean).join(' · ') : '去「发现」里找一首歌吧'}
        </div>
      </div>

      {/* 歌词区 */}
      <div
        ref={lyricBox}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 30px', textAlign: 'center', position: 'relative' }}
      >
        {lines.length === 0 ? (
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', paddingTop: 40 }}>
            {track ? '暂无歌词' : ''}
          </div>
        ) : (
          lines.map((l, i) => (
            <div
              key={`${l.time}-${i}`}
              data-line={i}
              className="fs-body"
              style={{
                padding: '7px 0',
                color: i === activeIndex ? 'var(--text-primary)' : 'var(--text-disabled)',
                textShadow: i === activeIndex ? '0 0 14px rgba(255,255,255,0.35)' : 'none',
                transition: 'color var(--transition-fast)',
              }}
            >
              {l.text}
            </div>
          ))
        )}
      </div>

      {/* 进度条 */}
      <div style={{ padding: '2px 22px 0', flexShrink: 0 }}>
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
        <div className="mono fs-micro" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginTop: 4 }}>
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* 控制区 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '14px 0 4px', flexShrink: 0 }}>
        <button className="pressable" onClick={prev} disabled={!track} style={{ color: 'var(--text-secondary)', display: 'flex' }}>
          <SkipBack size={24} />
        </button>
        <button
          className="pressable"
          onClick={toggle}
          disabled={!track}
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: track ? 'var(--accent)' : 'rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {playing ? <Pause size={25} color="#000" /> : <Play size={25} color="#000" />}
        </button>
        <button className="pressable" onClick={next} disabled={!track} style={{ color: 'var(--text-secondary)', display: 'flex' }}>
          <SkipForward size={24} />
        </button>
      </div>

      {/* 功能行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '6px 0 22px', flexShrink: 0 }}>
        <button
          className="pressable"
          onClick={() => track && toggleLike(track.id)}
          disabled={!track}
          style={{ color: liked ? 'var(--text-primary)' : 'var(--text-tertiary)', display: 'flex', filter: liked ? 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' : 'none' }}
        >
          <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button className="pressable" onClick={onShare} disabled={!track} style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
          <Share2 size={20} />
        </button>
      </div>
    </div>
  )
}

/** 唱片内芯封面（独立组件便于使用封面 hook） */
function TrackCoverWrapper() {
  const track = useMusic((s) => currentTrack(s))
  return <TrackCover track={track} size={192} radius={0} />
}