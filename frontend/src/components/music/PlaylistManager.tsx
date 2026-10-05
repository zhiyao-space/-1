import { useRef, useState } from 'react'
import { ImagePlus, Link2, Music, Trash2, Upload } from 'lucide-react'
import { compressImage } from '../../lib/image'
import { putBlob } from '../../lib/idb'
import { useToast } from '../../store/ui'
import { useMusic, type Track } from '../../store/music'
import { useBlobURL } from '../WallpaperLayer'

/** 单个曲目的封面缩略图 */
function Cover({ track, size = 40 }: { track: Track; size?: number }) {
  const url = useBlobURL(track.coverId)
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(160deg, #2a2a2a 0%, #0a0a0a 100%)',
        border: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888888',
      }}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Music size={size * 0.45} strokeWidth={1.6} />}
    </span>
  )
}

/** 歌单管理：上传本地音频 / 填写在线 URL / 更换封面 */
export default function PlaylistManager() {
  const tracks = useMusic((s) => s.tracks)
  const defaultCoverId = useMusic((s) => s.defaultCoverId)
  const addTracks = useMusic((s) => s.addTracks)
  const updateTrack = useMusic((s) => s.updateTrack)
  const removeTrack = useMusic((s) => s.removeTrack)
  const setDefaultCover = useMusic((s) => s.setDefaultCover)
  const push = useToast((s) => s.push)

  const audioRef = useRef<HTMLInputElement>(null)
  const defaultCoverRef = useRef<HTMLInputElement>(null)
  const coverRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [urlTitle, setUrlTitle] = useState('')
  const [urlArtist, setUrlArtist] = useState('')
  const [url, setUrl] = useState('')

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const items: Omit<Track, 'id'>[] = []
      for (const f of Array.from(files)) {
        const id = await putBlob(f)
        items.push({
          title: f.name.replace(/\.[^.]+$/, '') || '未命名',
          artist: '本地音频',
          src: `idb:${id}`,
          coverId: null,
        })
      }
      addTracks(items)
      push(`已添加 ${items.length} 首本地音频`)
    } catch {
      push('音频读取失败', 'error')
    }
  }

  const onAddUrl = () => {
    const u = url.trim()
    if (!u) {
      push('请填写音频地址', 'error')
      return
    }
    addTracks([{ title: urlTitle.trim() || '在线音频', artist: urlArtist.trim() || '网络来源', src: u, coverId: null }])
    setUrlTitle('')
    setUrlArtist('')
    setUrl('')
    push('已添加在线音频')
  }

  const onCover = async (id: string, f: File | undefined) => {
    if (!f) return
    try {
      const blob = await compressImage(f, 256)
      const blobId = await putBlob(blob)
      updateTrack(id, { coverId: blobId })
      push('封面已更新')
    } catch {
      push('图片处理失败', 'error')
    }
  }

  const onDefaultCover = async (f: File | undefined) => {
    if (!f) return
    try {
      const blob = await compressImage(f, 256)
      setDefaultCover(await putBlob(blob))
      push('默认封面已更新')
    } catch {
      push('图片处理失败', 'error')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => audioRef.current?.click()}>
          <Upload size={13} /> 上传本地音频
        </button>
        <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => defaultCoverRef.current?.click()}>
          <ImagePlus size={13} /> 默认封面
        </button>
      </div>
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          void onUpload(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={defaultCoverRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          void onDefaultCover(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {defaultCoverId && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 10 }}>
          已设置默认封面（用于未单独设置封面的曲目）
          <button
            className="pressable"
            style={{ color: 'var(--text-secondary)', marginLeft: 8, textDecoration: 'underline' }}
            onClick={() => setDefaultCover(null)}
          >
            清除
          </button>
        </div>
      )}

      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>添加在线音频 URL</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} placeholder="歌名" style={{ flex: 1 }} />
        <input value={urlArtist} onChange={(e) => setUrlArtist(e.target.value)} placeholder="歌手" style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://.../song.mp3" style={{ flex: 1 }} />
        <button className="btn btn-sm pressable" onClick={onAddUrl}>
          <Link2 size={13} /> 添加
        </button>
      </div>

      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>
        歌单（{tracks.length}）
      </div>
      {tracks.length === 0 ? (
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '8px 0' }}>
          还没有曲目，上传本地音频或添加在线地址。
        </div>
      ) : (
        tracks.map((t) => (
          <div
            key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Cover track={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={t.title}
                onChange={(e) => updateTrack(t.id, { title: e.target.value })}
                style={{ padding: '4px 8px', fontSize: 'calc(13px * var(--fs-scale))', marginBottom: 4 }}
              />
              <input
                value={t.artist}
                onChange={(e) => updateTrack(t.id, { artist: e.target.value })}
                placeholder="歌手"
                style={{ padding: '4px 8px', fontSize: 'calc(12px * var(--fs-scale))' }}
              />
            </div>
            <button className="btn btn-sm pressable" onClick={() => coverRefs.current[t.id]?.click()}>
              换封面
            </button>
            <button
              className="pressable"
              onClick={() => removeTrack(t.id)}
              title="删除"
              style={{ color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}
            >
              <Trash2 size={15} />
            </button>
            <input
              ref={(el) => {
                coverRefs.current[t.id] = el
              }}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                void onCover(t.id, e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        ))
      )}
    </div>
  )
}