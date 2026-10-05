import { useEffect, useState } from 'react'
import { getBlobURL } from '../lib/idb'
import { WallpaperFx } from '../store/settings'

export function useBlobURL(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!id) {
      setUrl(null)
      return
    }
    getBlobURL(id).then((u) => {
      if (alive) setUrl(u ?? null)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}

export function WallpaperLayer({
  imageId,
  fx,
  children,
  radius,
  fallbackCss,
}: {
  imageId: string | null
  fx: WallpaperFx
  children?: React.ReactNode
  radius?: number
  fallbackCss?: string
}) {
  const url = useBlobURL(imageId)
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: radius,
        overflow: 'hidden',
        background: fallbackCss ?? 'var(--bg-primary)',
      }}
    >
      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: fx.blur > 0 ? `blur(${fx.blur}px)` : undefined,
            transform: fx.blur > 0 ? 'scale(1.06)' : undefined,
          }}
        />
      )}
      {url && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${fx.dark})` }} />}
      {children}
    </div>
  )
}
