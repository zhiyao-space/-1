import { useBlobURL } from '../WallpaperLayer'

export default function Avatar({
  imageId,
  name,
  size = 40,
  shape = 'circle',
}: {
  imageId: string | null | undefined
  name: string
  size?: number
  shape?: 'circle' | 'rounded'
}) {
  const url = useBlobURL(imageId)
  const radius = shape === 'circle' ? '50%' : '28%'
  return (
    <div
      className="no-select"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span
          className="fs-h2"
          style={{ color: 'var(--text-tertiary)', fontSize: Math.max(12, size * 0.42) }}
        >
          {name.slice(0, 1) || '?'}
        </span>
      )}
    </div>
  )
}
