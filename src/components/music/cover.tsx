import { useEffect, useState } from 'react'
import { Music } from 'lucide-react'
import { resolvePic, type NcmSong } from '../../lib/netease'
import { useBlobURL } from '../WallpaperLayer'
import type { Track } from '../../store/music'

/** 纯展示的封面盒子：无图时用黑白渐变占位 */
export function CoverBox({ src, size, radius = 10 }: { src: string | null; size: number; radius?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(160deg, #2a2a2a 0%, #0a0a0a 100%)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Music size={Math.max(12, size * 0.42)} strokeWidth={1.5} />
      )}
    </span>
  )
}

/** 网易云歌曲封面（搜索结果只有 picId，需要异步解析） */
export function SongCover({ song, size, radius = 10 }: { song: NcmSong; size: number; radius?: number }) {
  const [src, setSrc] = useState<string | null>(song.cover)
  useEffect(() => {
    let alive = true
    if (song.cover) {
      setSrc(song.cover)
      return
    }
    setSrc(null)
    resolvePic(song.picId, Math.max(120, size * 2)).then((u) => {
      if (alive) setSrc(u)
    })
    return () => {
      alive = false
    }
  }, [song.id, song.cover, song.picId, size])
  return <CoverBox src={src} size={size} radius={radius} />
}

/** 播放队列 / 曲库曲目封面（本地 blob / 在线直链 / 网易云 picId） */
export function TrackCover({
  track,
  size,
  radius = 10,
  fallbackIdbId = null,
}: {
  track: Track | null
  size: number
  radius?: number
  fallbackIdbId?: string | null
}) {
  const blobUrl = useBlobURL(track?.coverId ?? (track ? null : fallbackIdbId))
  const [pic, setPic] = useState<string | null>(track?.coverUrl ?? null)

  useEffect(() => {
    let alive = true
    if (track?.coverUrl) {
      setPic(track.coverUrl)
      return
    }
    if (track?.picId) {
      setPic(null)
      resolvePic(track.picId, Math.max(120, size * 2)).then((u) => {
        if (alive) setPic(u)
      })
    } else {
      setPic(null)
    }
    return () => {
      alive = false
    }
  }, [track?.id, track?.coverUrl, track?.picId, size])

  const fallback = useBlobURL(fallbackIdbId)
  return <CoverBox src={blobUrl ?? pic ?? fallback} size={size} radius={radius} />
}