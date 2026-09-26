import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToast } from '../store/ui'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 320,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="no-select"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 900,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '88%',
          maxHeight: '78%',
          overflowY: 'auto',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          animation: 'modalIn 200ms ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </div>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ToastHost() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 84,
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass timestamp"
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            color: t.kind === 'error' ? '#ff8a8a' : 'var(--text-primary)',
            animation: 'toastIn 200ms ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="pressable"
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--bg-button)',
        border: '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'background var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: checked ? '#000' : 'var(--text-secondary)',
          transition: 'left var(--transition-fast)',
        }}
      />
    </button>
  )
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="mono fs-aux" style={{ color: 'var(--text-primary)' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function EmptyState({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '48px 24px',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: 0.5 }}>{icon}</div>
      <div className="fs-body">{text}</div>
      {hint && <div className="fs-aux" style={{ color: 'var(--text-disabled)' }}>{hint}</div>}
    </div>
  )
}

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14 }}>
      {title && (
        <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

export function Row({
  label,
  sub,
  right,
  onClick,
}: {
  label: string
  sub?: string
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'pressable' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {sub && (
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {right}
    </div>
  )
}
