import { useBlobURL } from '../WallpaperLayer'

export default function Avatar({
  imageId,
  name,
  size = 40,
  shape = 'circle',
  badgeImageId,
}: {
  imageId: string | null | undefined
  name: string
  size?: number
  shape?: 'circle' | 'rounded'
  badgeImageId?: string | null
}) {
  const url = useBlobURL(imageId)
  const badgeUrl = useBlobURL(badgeImageId)
  const radius = shape === 'circle' ? '50%' : '28%'
  return (
    <div
      className="no-select"
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          overflow: 'hidden',
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
      {badgeUrl && (
        <img
          src={badgeUrl}
          alt=""
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: size * 0.42,
            height: size * 0.42,
            objectFit: 'cover',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.25)',
            background: '#0C0C0C',
          }}
        />
      )}
    </div>
  )
}
