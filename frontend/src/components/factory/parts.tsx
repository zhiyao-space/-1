import type { CSSProperties, ReactNode } from 'react'

/** 应用图标：厚块底座 + emoji，凸起样式 */
export function AppGlyph({ icon, size = 46, level = 'front' }: { icon: string; size?: number; level?: 'front' | 'mid' }) {
  return (
    <span
      className={`fx-block ${level === 'front' ? 'fx-front' : 'fx-mid'}`}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.46,
        lineHeight: 1,
      }}
    >
      {icon || '🧩'}
    </span>
  )
}

export function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      className={`fx-press-soft ${active ? 'fx-sunken' : 'fx-block fx-back'}`}
      onClick={onClick}
      style={{
        flexShrink: 0,
        minHeight: 30,
        padding: '0 12px',
        border: 0,
        borderRadius: 999,
        fontSize: 'calc(11px * var(--fs-scale))',
        color: active ? 'var(--fx-t1, #fff)' : 'var(--fx-t3, #999)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function EmptyBlock({ icon, text, hint, action }: { icon: ReactNode; text: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="fx-sunken fx-in" style={{ padding: '32px 20px', textAlign: 'center', marginTop: 8 }}>
      <div style={{ color: 'var(--fx-t3, #999)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <div className="fs-body" style={{ color: 'var(--fx-t2, #ddd)' }}>
        {text}
      </div>
      {hint && (
        <div className="fs-micro" style={{ color: 'var(--fx-t3, #999)', marginTop: 6, lineHeight: 1.6 }}>
          {hint}
        </div>
      )}
      {action && <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>{action}</div>}
    </div>
  )
}

/** 表单字段：标签 + 凹陷输入 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="fs-micro" style={{ color: 'var(--fx-t3, #999)', marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #3a3a3a, transparent)', margin: '14px 0', ...style }} />
}