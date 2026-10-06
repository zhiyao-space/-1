import type { CSSProperties, ReactNode } from 'react'
import {
  Banknote,
  BookOpen,
  Brain,
  Cake,
  Calculator,
  CloudSun,
  Coffee,
  Dices,
  FlaskConical,
  Flame,
  Heart,
  Hourglass,
  ListChecks,
  Lock,
  Moon,
  NotebookPen,
  Package,
  Pin,
  Puzzle,
  StickyNote,
  Target,
  Timer,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/** 应用图标名 -> lucide 组件；未知名称回退为拼图 */
const APP_ICONS: Record<string, LucideIcon> = {
  Banknote,
  BookOpen,
  Brain,
  Cake,
  Calculator,
  CloudSun,
  Coffee,
  Dices,
  FlaskConical,
  Flame,
  Heart,
  Hourglass,
  ListChecks,
  Lock,
  Moon,
  NotebookPen,
  Package,
  Pin,
  Puzzle,
  StickyNote,
  Target,
  Timer,
  Zap,
}

/** 按名称渲染应用图标 */
export function AppIcon({ icon, size = 20, color, strokeWidth }: { icon?: string; size?: number; color?: string; strokeWidth?: number }) {
  const Cmp = (icon && APP_ICONS[icon]) || Puzzle
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />
}

/** 应用图标：厚块底座 + lucide 图标，凸起样式 */
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
      }}
    >
      <AppIcon icon={icon} size={Math.round(size * 0.5)} />
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