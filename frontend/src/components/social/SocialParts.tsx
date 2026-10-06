import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useBlobURL } from '../WallpaperLayer'
import type { OnlineStatus } from '../../store/social'

/* 「mu社区恋爱交友软件」通用小件 */

export function SocialAvatar({
  avatarId,
  name,
  size = 46,
  status,
  onClick,
}: {
  /** IndexedDB 中的头像图片 id，为空时显示名字首字 */
  avatarId?: string | null
  name: string
  size?: number
  status?: OnlineStatus
  onClick?: () => void
}) {
  const url = useBlobURL(avatarId)
  return (
    <button
      className="sc-avatar"
      onClick={onClick}
      style={{ width: size, height: size, fontSize: size * 0.42, padding: 0, border: 0, cursor: onClick ? 'pointer' : 'default' }}
    >
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        <span style={{ lineHeight: 1, fontWeight: 600 }}>{name.slice(0, 1) || '?'}</span>
      )}
      {status && <span className={`sc-online-dot sc-online-dot--${status}`} />}
    </button>
  )
}

export function SocialCover({
  avatarId,
  name,
  height = 92,
}: {
  /** IndexedDB 中的封面图片 id，为空时显示名字首字 */
  avatarId?: string | null
  name: string
  height?: number
}) {
  const url = useBlobURL(avatarId)
  return (
    <div className="sc-card__cover" style={{ height, overflow: 'hidden' }}>
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 30, fontWeight: 600, color: 'var(--fx-t3)' }}>{name.slice(0, 1) || '?'}</span>
      )}
    </div>
  )
}

export function AffinityBar({ value }: { value: number }) {
  return (
    <div className="sc-affinity">
      <div className="sc-affinity__fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Pill({
  children,
  on,
  onClick,
}: {
  children: ReactNode
  on?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className={`sc-pill ${on ? 'sc-pill--on' : ''}`}
      onClick={onClick}
      style={{ border: 0, cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </button>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 9px' }}>
      <span className="sc-sub" style={{ letterSpacing: '1px' }}>
        {children}
      </span>
      {right}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sc-mask" onClick={onClose}>
      <div className="sc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sc-sheet__handle" />
        {title !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 10px', flexShrink: 0 }}>
            <span className="sc-title">{title}</span>
            <button className="fx-press-soft" onClick={onClose} style={{ background: 'none', border: 0, color: 'var(--fx-t3)', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        )}
        <div className="sc-sheet__scroll">{children}</div>
      </div>
    </div>
  )
}

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="sc-mask" onClick={onClose} style={{ justifyContent: 'center' }}>
      <div className="sc-dialog" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="sc-empty">{children}</div>
}