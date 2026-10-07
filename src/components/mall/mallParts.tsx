import type { CSSProperties, ReactNode } from 'react'
import {
  BookOpen,
  Brush,
  CakeSlice,
  Check,
  Coffee,
  Gamepad2,
  Gift,
  Hammer,
  Headphones,
  Shirt,
  ShoppingBag,
  Soup,
  Sprout,
  Star,
  Store,
  ToyBrick,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { MallTheme } from '../../store/mall'

/* ============================================================
   mulin 商城 MALLÉ · 共享零件
   缩略图（无需外链图片）/ 星级 / 价格 / 底部抽屉 / 小控件
   ============================================================ */

/** 把模块主题注入为 CSS 变量，随内容区级联 */
export function moduleVars(theme: MallTheme): CSSProperties {
  return {
    '--ml-accent': theme.accentColor,
    '--ml-radius': `${theme.borderRadius}px`,
    '--ml-gap': `${theme.spacing}px`,
  } as CSSProperties
}

/** 由字符串派生的稳定色相，用于无图商品的渐变占位 */
export function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

export function thumbBg(name: string, seed = 0): string {
  const hue = (hashHue(name) + seed * 17) % 360
  return `linear-gradient(150deg, hsl(${hue} 16% 27%) 0%, hsl(${(hue + 34) % 360} 20% 13%) 100%)`
}

/** 数据层以 lucide 图标名保存模块 / 店铺图标，这里统一映射为组件 */
const MALL_ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  Soup,
  Zap,
  Gift,
  Shirt,
  Headphones,
  Hammer,
  Store,
  BookOpen,
  ToyBrick,
  CakeSlice,
  Coffee,
  Brush,
  Sprout,
  Gamepad2,
}

export function MallIcon({
  name,
  size = 16,
  color,
  className,
  strokeWidth,
}: {
  name?: string
  size?: number
  color?: string
  className?: string
  strokeWidth?: number
}) {
  const Icon = (name && MALL_ICONS[name]) || ShoppingBag
  return <Icon size={size} color={color} className={className} strokeWidth={strokeWidth} />
}

export function Thumb({
  name,
  image,
  size,
  className,
  style,
  badge,
  rarity,
}: {
  name: string
  image?: string
  /** 宽高比，如 '1 / 1'、'3 / 4' */
  size?: string
  className?: string
  style?: CSSProperties
  badge?: ReactNode
  rarity?: string
}) {
  return (
    <div
      className={`ml-thumb ${className ?? ''}`}
      style={{ aspectRatio: size ?? '1 / 1', background: thumbBg(name), ...style }}
    >
      {image ? (
        <img className="ml-thumb__img" src={image} alt="" />
      ) : (
        <span className="ml-thumb__char">{name.slice(0, 1)}</span>
      )}
      {badge != null && <span className="ml-thumb__badge">{badge}</span>}
      {rarity && <span className="ml-thumb__rarity">{rarity}</span>}
    </div>
  )
}

export function Stars({ rating, size = 10 }: { rating: number; size?: number }) {
  const full = Math.round(rating)
  return (
    <span className="ml-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill={i < full ? 'currentColor' : 'none'} strokeWidth={1.6} />
      ))}
    </span>
  )
}

export function Price({ value, original, size }: { value: number; original?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', minWidth: 0 }}>
      <span className="ml-price" style={size ? { fontSize: `${size}px` } : undefined}>
        <small>¥</small>
        {value.toFixed(value % 1 === 0 ? 0 : 2)}
      </span>
      {original != null && original > value && <span className="ml-origin">¥{original.toFixed(0)}</span>}
    </span>
  )
}

export function CheckBox({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`ml-check${on ? ' ml-check--on' : ''}`} onClick={onClick} aria-label="选择">
      <Check size={14} strokeWidth={3} />
    </button>
  )
}

/** 底部抽屉：绝对定位于 App 容器内 */
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
  if (!open) return null
  return (
    <div className="ml-sheet-mask" onClick={onClose}>
      <div className="ml-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ml-sheet__grip" />
        {title != null && <div className="ml-sheet__title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <span className="ml-stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="减少">
        −
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label="增加">
        +
      </button>
    </span>
  )
}

export function Empty({
  icon,
  text,
  hint,
}: {
  icon: ReactNode
  text: string
  hint?: string
}) {
  return (
    <div className="ml-empty">
      <span className="ml-empty__icon">{icon}</span>
      <span style={{ fontSize: 'calc(13px * var(--fs-scale))' }}>{text}</span>
      {hint && <span style={{ fontSize: 'calc(10.5px * var(--fs-scale))', opacity: 0.7 }}>{hint}</span>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ml-field">
      <span className="ml-field__label">{label}</span>
      {children}
    </div>
  )
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
