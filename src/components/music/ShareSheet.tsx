import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { useCharacters } from '../../store/characters'
import type { Track } from '../../store/music'
import { shareSongToCharacter } from '../../lib/shareSong'
import { useBlobURL } from '../WallpaperLayer'
import { TrackCover } from './cover'

function CharacterRow({ id, name, avatarId, onPick }: { id: string; name: string; avatarId: string | null; onPick: () => void }) {
  const avatar = useBlobURL(avatarId)
  return (
    <button
      className="pressable"
      onClick={onPick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', textAlign: 'left' }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #2a2a2a 0%, #0a0a0a 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {avatar && <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </span>
      <span className="fs-body" style={{ flex: 1, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <Send size={15} color="var(--text-tertiary)" />
    </button>
  )
}

/** 把当前歌曲分享给某个角色 */
export default function ShareSheet({ track, onClose }: { track: Track; onClose: () => void }) {
  const characters = useCharacters((s) => s.characters)
  const [note, setNote] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const pick = async (id: string) => {
    await shareSongToCharacter(id, track, note)
    setSentTo(id)
    setTimeout(onClose, 520)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 620, display: 'flex', alignItems: 'flex-end' }}>
      <div className="no-select" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div
        className="glass page-enter"
        style={{
          position: 'relative',
          width: '100%',
          maxHeight: '78%',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '16px 18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'rgba(14,14,14,0.86)',
          backdropFilter: 'blur(var(--glass-blur))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>分享给角色</span>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrackCover track={track} size={44} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fs-body" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.title}
            </div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{track.artist}</div>
          </div>
        </div>

        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="附一句话（可选）" />

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {characters.length === 0 ? (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '14px 0', textAlign: 'center' }}>
              还没有角色，先去「聊天」里创建一个吧。
            </div>
          ) : (
            characters.map((c) => (
              <CharacterRow
                key={c.id}
                id={c.id}
                name={sentTo === c.id ? `${c.name} · 已发送` : c.name}
                avatarId={c.avatarId}
                onPick={() => void pick(c.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}