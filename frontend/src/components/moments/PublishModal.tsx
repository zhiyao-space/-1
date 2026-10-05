import { useEffect, useState } from 'react'
import { X, ImagePlus, MapPin, Music2, Check, Loader2 } from 'lucide-react'
import { Modal } from '../common'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import { useToast } from '../../store/ui'
import { useProfile, displayUserName } from '../../store/profile'
import { useSettings } from '../../store/settings'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { useMusic, currentTrack } from '../../store/music'
import { useMoments, type Moment, type MomentAuthor, type MomentVisibility } from '../../store/moments'
import { compressImage } from '../../lib/image'
import { putBlob } from '../../lib/idb'

const MAX_IMAGES = 9
const QUICK_LOCATIONS = ['上海', '北京', '杭州', '成都', '深圳', '东京', '冰岛', '家里', '路上']

export default function PublishModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Moment | null
}) {
  const push = useToast((s) => s.push)
  const profile = useProfile((s) => s.profile)
  const phoneName = useSettings((s) => s.phoneName)
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const addMoment = useMoments((s) => s.addMoment)
  const updateMoment = useMoments((s) => s.updateMoment)
  const track = useMusic(currentTrack)
  const [content, setContent] = useState('')
  const [imageIds, setImageIds] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState<MomentVisibility>('all')
  const [visibleIds, setVisibleIds] = useState<string[]>([])
  const [musicOn, setMusicOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewerNode, openViewer] = useImageViewer()

  useEffect(() => {
    if (!open) return
    if (editing) {
      setContent(editing.content)
      setImageIds(editing.imageIds)
      setLocation(editing.location)
      setVisibility(editing.visibility)
      setVisibleIds(editing.visibleIds)
      setMusicOn(!!editing.music)
    } else {
      setContent('')
      setImageIds([])
      setLocation(profile.ipLocation || '')
      setVisibility('all')
      setVisibleIds([])
      setMusicOn(false)
    }
  }, [open, editing, profile.ipLocation])

  const members = [
    ...characters.map((c) => ({ key: `character:${c.id}`, name: c.name, author: { type: 'character', id: c.id, name: c.name } as MomentAuthor })),
    ...npcs.map((n) => ({ key: `npc:${n.id}`, name: n.name, author: { type: 'npc', id: n.id, name: n.name } as MomentAuthor })),
  ]

  const addImages = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      setBusy(true)
      const next = [...imageIds]
      for (const f of files) {
        if (next.length >= MAX_IMAGES) {
          push(`最多 ${MAX_IMAGES} 张图`, 'error')
          break
        }
        try {
          const compressed = await compressImage(f, 1440)
          next.push(await putBlob(compressed))
        } catch {
          push('有一张图片处理失败', 'error')
        }
      }
      setImageIds(next)
      setBusy(false)
    }
    input.click()
  }

  const save = () => {
    const text = content.trim()
    if (!text && imageIds.length === 0) {
      push('写点什么或选张图吧', 'error')
      return
    }
    if (editing) {
      updateMoment(editing.id, { content: text, edited: true })
      push('已更新')
      onClose()
      return
    }
    addMoment({
      author: { type: 'user', id: 'user', name: displayUserName(phoneName) || '我' },
      content: text,
      imageIds,
      location: location.trim(),
      visibility,
      visibleIds: visibility === 'custom' ? visibleIds : [],
      music:
        musicOn && track
          ? { title: track.title, artist: track.artist, coverId: track.coverId ?? null }
          : null,
    })
    push('已发表')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑动态' : '发表动态'} width={360}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 500))}
        placeholder="这一刻的想法……"
        rows={4}
        style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
      />
      <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'right', marginTop: 4 }}>
        {content.length}/500
      </div>

      {!editing && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            {imageIds.map((id) => (
              <ImageThumb key={id} id={id} onOpen={openViewer} onRemove={() => setImageIds(imageIds.filter((x) => x !== id))} />
            ))}
            {imageIds.length < MAX_IMAGES && (
              <button
                className="pressable"
                onClick={addImages}
                disabled={busy}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  border: '1px dashed rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  color: 'var(--text-tertiary)',
                }}
              >
                {busy ? <Loader2 size={18} className="spin" /> : <ImagePlus size={18} />}
                <span className="fs-micro">{imageIds.length}/{MAX_IMAGES}</span>
              </button>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <MapPin size={12} /> 定位（可自定义）
            </div>
            <input value={location} onChange={(e) => setLocation(e.target.value.slice(0, 30))} placeholder="所在位置，例如：上海" style={{ width: '100%' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {QUICK_LOCATIONS.map((l) => (
                <button
                  key={l}
                  className="pressable fs-micro"
                  onClick={() => setLocation(l)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: location === l ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: location === l ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>谁可以看</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { v: 'all', label: '公开' },
                { v: 'private', label: '仅自己可见' },
                { v: 'custom', label: '部分可见' },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  className="btn btn-sm pressable"
                  onClick={() => setVisibility(o.v)}
                  style={{
                    flex: 1,
                    background: visibility === o.v ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                    color: visibility === o.v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    borderColor: visibility === o.v ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {visibility === 'custom' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, maxHeight: 130, overflowY: 'auto' }}>
                {members.length === 0 && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>还没有角色可选取。</span>}
                {members.map((m) => {
                  const on = visibleIds.includes(m.key)
                  return (
                    <button
                      key={m.key}
                      className="pressable fs-micro"
                      onClick={() => setVisibleIds(on ? visibleIds.filter((x) => x !== m.key) : [...visibleIds, m.key])}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: on ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {on && <Check size={11} />} {m.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {track && (
            <button
              className="pressable"
              onClick={() => setMusicOn(!musicOn)}
              style={{
                width: '100%',
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 10,
                borderRadius: 12,
                background: musicOn ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Music2 size={15} color="var(--text-tertiary)" />
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <span className="fs-micro" style={{ display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title}
                </span>
                <span className="fs-micro" style={{ display: 'block', color: 'var(--text-tertiary)' }}>{track.artist}</span>
              </span>
              <span className="fs-micro" style={{ color: musicOn ? 'var(--accent)' : 'var(--text-disabled)' }}>
                {musicOn ? '已附上' : '附上音乐'}
              </span>
            </button>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>取消</button>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={save} disabled={busy}>
          {editing ? '保存修改' : '发表'}
        </button>
      </div>

      {viewerNode}
    </Modal>
  )
}

function ImageThumb({ id, onOpen, onRemove }: { id: string; onOpen: (url: string) => void; onRemove: () => void }) {
  const url = useBlobURL(id)
  return (
    <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
      {url && <img src={url} alt="" onClick={() => onOpen(url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <button
        className="pressable"
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <X size={12} />
      </button>
    </div>
  )
}