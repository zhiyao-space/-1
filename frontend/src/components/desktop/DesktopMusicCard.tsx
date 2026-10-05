import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useUI } from '../../store/ui'
import { currentTrack, fmtTime, useMusic } from '../../store/music'
import type { ModuleStyles } from '../../store/desktopModules'
import { cardStyle } from './moduleStyle'
import { TrackCover } from '../music/cover'

/**
 * 桌面音乐组件：位于「最近互动」卡片下方、底部图标栏上方。
 * 封面缩略图（默认黑白渐变占位）+ 歌名/歌手 + 播放暂停 + 上一曲/下一曲 + 可拖拽进度条。
 */
export default function DesktopMusicCard({ styles }: { styles: ModuleStyles }) {
  const track = useMusic((s) => currentTrack(s))
  const hasTracks = useMusic((s) => s.queue.length > 0)
  const playing = useMusic((s) => s.playing)
  const currentTime = useMusic((s) => s.currentTime)
  const duration = useMusic((s) => s.duration)
  const defaultCoverId = useMusic((s) => s.defaultCoverId)
  const toggle = useMusic((s) => s.toggle)
  const next = useMusic((s) => s.next)
  const prev = useMusic((s) => s.prev)
  const seek = useMusic((s) => s.seek)
  const openApp = useUI((s) => s.openApp)

  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <div className="no-select" style={{ ...cardStyle(styles), padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="pressable" onClick={() => openApp('music')} title="打开音乐" style={{ display: 'flex' }}>
          <TrackCover track={track} size={44} radius={10} fallbackIdbId={defaultCoverId} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fs-body" style={{ color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track?.title ?? '未在播放'}
          </div>
          <div className="fs-micro" style={{ color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track?.artist || (hasTracks ? '未知歌手' : '去添加本地音乐或在线音频')}
          </div>
        </div>

        <button className="pressable" onClick={prev} disabled={!hasTracks} title="上一曲" style={{ color: hasTracks ? '#e0e0e0' : '#525252', padding: 5, display: 'flex' }}>
          <SkipBack size={17} />
        </button>
        <button
          className="pressable"
          onClick={() => (hasTracks ? toggle() : openApp('music'))}
          title={playing ? '暂停' : '播放'}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {playing ? <Pause size={16} color="#000" /> : <Play size={16} color="#000" />}
        </button>
        <button className="pressable" onClick={next} disabled={!hasTracks} title="下一曲" style={{ color: hasTracks ? '#e0e0e0' : '#525252', padding: 5, display: 'flex' }}>
          <SkipForward size={17} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span className="mono fs-micro" style={{ color: '#666666', minWidth: 30 }}>{fmtTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(ratio * 1000)}
          disabled={!hasTracks || duration <= 0}
          onChange={(e) => seek(Number(e.target.value) / 1000)}
          style={{ flex: 1, height: 4 }}
        />
        <span className="mono fs-micro" style={{ color: '#666666', minWidth: 30, textAlign: 'right' }}>{fmtTime(duration)}</span>
      </div>
    </div>
  )
}