import { Pause, Play } from 'lucide-react'
import type { MessageData } from '../../store/chats'
import { currentTrack, useMusic } from '../../store/music'
import { playSongCard } from '../../lib/shareSong'
import { CoverBox } from '../music/cover'

/** 聊天里的歌曲卡片：可播放，播放中显示「一起听」状态 */
export default function MusicCardBubble({ data }: { data: MessageData }) {
  const trackId = data.songNcmId ? `ncm-${data.songNcmId}` : null
  const isCurrent = useMusic((s) => (trackId ? currentTrack(s)?.id === trackId : false))
  const playing = useMusic((s) => s.playing)
  const toggle = useMusic((s) => s.toggle)
  const together = isCurrent && playing

  return (
    <div
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 'var(--radius-md)',
        width: 248,
        border: together ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <CoverBox src={data.songCover ?? null} size={52} radius={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-body" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.songTitle ?? '未知歌曲'}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.songArtist ?? ''}
        </div>
        {together && (
          <div className="fs-micro" style={{ color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="music-together-dot" />
            正在一起听
          </div>
        )}
      </div>
      <button
        className="pressable"
        onClick={() => (isCurrent ? toggle() : playSongCard(data))}
        title={together ? '暂停' : '播放'}
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
        {together ? <Pause size={15} color="#000" /> : <Play size={15} color="#000" />}
      </button>
    </div>
  )
}