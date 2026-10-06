import type { CSSProperties, ReactNode } from 'react'
import { ChevronRight, MapPin } from 'lucide-react'
import type { Candle, Landmark, Person, PersonAttrs, TicketKind } from '../../store/mulCity'
import { TICKET_KIND_LABEL } from '../../store/mulCity'

/* ============================================================
   Mul市 · 共享零件
   市籍卡 / 人物头像 / 子页 Tab / 通用卡片与抽屉 / 电子票卡
   ============================================================ */

/** 由字符串派生的稳定色相，用于无头像时的渐变占位 */
function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}

export function avatarBg(name: string): string {
  const hue = hashHue(name)
  return `linear-gradient(150deg, hsl(${hue} 14% 30%) 0%, hsl(${(hue + 40) % 360} 18% 13%) 100%)`
}

export function Avatar({
  person,
  size = 44,
  radius,
  showOnline,
  className,
}: {
  person: { name: string; avatar?: string; isOnline?: boolean; type?: Person['type'] }
  size?: number
  radius?: number
  showOnline?: boolean
  className?: string
}) {
  return (
    <span className="cx-avatar__wrap" style={{ width: size, height: size }}>
      <span
        className={`cx-avatar ${className ?? ''}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius ?? Math.round(size * 0.34),
          background: person.avatar ? undefined : avatarBg(person.name),
          fontSize: Math.round(size * 0.42),
        }}
      >
        {person.avatar ? <img src={person.avatar} alt="" /> : person.name.slice(0, 1)}
      </span>
      {showOnline && person.isOnline && <span className="cx-avatar__online" />}
    </span>
  )
}

/** 市籍身份证 */
export function IdCard({
  person,
  status = 'normal',
}: {
  person: Person
  status?: 'normal' | 'suspended' | 'cancelled'
}) {
  const statusLabel = status === 'normal' ? '正常' : status === 'suspended' ? '暂停' : '注销'
  return (
    <div className={`cx-idcard ${status !== 'normal' ? `cx-idcard--${status}` : ''}`}>
      <div className="cx-idcard__head">
        <span className="cx-idcard__city">Mul市 市籍</span>
        <span className="cx-idcard__badge">{statusLabel}</span>
      </div>
      <div className="cx-idcard__main">
        <span className="cx-idcard__photo">
          {person.avatar ? <img src={person.avatar} alt="" /> : person.name.slice(0, 1)}
        </span>
        <div className="cx-idcard__fields">
          <div>
            <div className="cx-idcard__name">{person.name}</div>
            <div className="cx-idcard__nick">@{person.nickname}</div>
          </div>
          <div className="cx-idcard__field">
            <span>职业</span>
            <b>{person.occupation}</b>
          </div>
          <div className="cx-idcard__field">
            <span>户籍</span>
            <b>{person.address}</b>
          </div>
          <div className="cx-idcard__field">
            <span>等级</span>
            <b>
              LV.{person.attributes.level} · {person.rank}
            </b>
          </div>
        </div>
      </div>
      <div className="cx-idcard__no">
        <span className="cx-tag">市籍编号</span>
        <code>{person.civilId}</code>
        <span className="cx-idcard__stamp">{statusLabel === '正常' ? 'MUL·有效' : 'MUL'}</span>
      </div>
    </div>
  )
}

/** 六维属性面板 */
const ATTR_LABEL: { key: keyof PersonAttrs; label: string }[] = [
  { key: 'intelligence', label: '智商' },
  { key: 'emotional', label: '情商' },
  { key: 'aesthetic', label: '审美' },
  { key: 'courage', label: '魄力' },
  { key: 'fitness', label: '体质' },
  { key: 'luck', label: '运气' },
]

export function AttrGrid({
  attrs,
  onPick,
}: {
  attrs: PersonAttrs
  onPick?: (key: keyof PersonAttrs) => void
}) {
  return (
    <div className="cx-attrs">
      {ATTR_LABEL.map((a) => {
        const value = attrs[a.key] as number
        return onPick ? (
          <button key={a.key} className="cx-attr cx-attr--alloc fx-press" onClick={() => onPick(a.key)}>
            <b>{value}</b>
            <span>{a.label}</span>
          </button>
        ) : (
          <div key={a.key} className="cx-attr">
            <b>{value}</b>
            <span>{a.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 子页 Tab 条 */
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="cx-subtabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`cx-subtab ${value === t.key ? 'cx-subtab--on' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** 通用卡片 */
export function Card({ children, front, style }: { children: ReactNode; front?: boolean; style?: CSSProperties }) {
  return (
    <div className={`cx-card ${front ? 'cx-card--front' : ''}`} style={style}>
      {children}
    </div>
  )
}

/** 通用行 */
export function Row({
  icon,
  title,
  sub,
  right,
  onClick,
  sunken,
  arrow,
  thumb,
}: {
  icon?: ReactNode
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  onClick?: () => void
  sunken?: boolean
  arrow?: boolean
  thumb?: ReactNode
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`cx-row ${sunken ? 'cx-row--sunken' : ''} ${onClick ? 'fx-press' : ''}`} onClick={onClick}>
      {thumb}
      {icon != null && !thumb && <span className="cx-muted">{icon}</span>}
      <span className="cx-row__body">
        <span className="cx-row__title">{title}</span>
        {sub != null && <span className="cx-row__sub">{sub}</span>}
      </span>
      {right != null && <span className="cx-row__right">{right}</span>}
      {arrow && <ChevronRight size={16} className="cx-row__arrow" />}
    </Tag>
  )
}

/** 人物行 */
export function PersonRow({
  person,
  sub,
  right,
  onClick,
  arrow,
}: {
  person: Person
  sub?: ReactNode
  right?: ReactNode
  onClick?: () => void
  arrow?: boolean
}) {
  return (
    <Row
      thumb={<Avatar person={person} size={44} showOnline />}
      title={
        <>
          {person.name}
          {person.isAdmin && <span className="cx-tag cx-tag--on">管理</span>}
        </>
      }
      sub={sub ?? `${person.occupation} · ${person.currentEmotion}`}
      right={right}
      onClick={onClick}
      arrow={arrow}
    />
  )
}

/** 地点行 */
export function LandmarkRow({ landmark, sub, onClick }: { landmark: Landmark; sub?: ReactNode; onClick?: () => void }) {
  return (
    <Row
      icon={<MapPin size={17} />}
      title={landmark.name}
      sub={sub ?? landmark.description}
      onClick={onClick}
      arrow={!!onClick}
      right={<span className="cx-tag">{landmark.type}</span>}
    />
  )
}

/** 底部抽屉 */
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
    <div className="cx-sheet-mask" onClick={onClose}>
      <div className="cx-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cx-sheet__grip" />
        {title != null && <div className="cx-sheet__title">{title}</div>}
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div className="cx-empty">
      <span className="cx-empty__icon">{icon}</span>
      <span>{text}</span>
      {hint && <span style={{ fontSize: 'calc(10.5px * var(--fs-scale))', opacity: 0.72 }}>{hint}</span>}
    </div>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="cx-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <span className="cx-progress" style={{ display: 'block' }}>
      <span className="cx-progress__fill" style={{ width: `${pct}%`, display: 'block' }} />
    </span>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cx-field">
      <span className="cx-field__label">{label}</span>
      {children}
    </div>
  )
}

export function ChipRow({
  options,
  value,
  onToggle,
  single,
}: {
  options: string[]
  value: string[]
  onToggle: (v: string) => void
  single?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button key={o} className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => onToggle(single && on ? '' : o)}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

/** 电子票卡 */
export function TicketCard({
  kind,
  title,
  code,
  route,
  grid,
  foot,
}: {
  kind: TicketKind | 'show'
  title: string
  code: string
  route: { from: string; to: string; fromSub?: string; toSub?: string; mid?: string }
  grid: { value: ReactNode; label: string }[]
  foot?: ReactNode
}) {
  const kindLabel = kind === 'show' ? '电子门票' : TICKET_KIND_LABEL[kind]
  return (
    <div className={`cx-ticket cx-ticket--${kind}`}>
      <div className="cx-ticket__head">
        <span className="cx-ticket__kind">{kindLabel}</span>
        <span className="cx-ticket__no">{code}</span>
      </div>
      <div className="cx-ticket__route">
        <span className="cx-ticket__pt">
          <b>{route.from}</b>
          {route.fromSub && <span>{route.fromSub}</span>}
        </span>
        <span className="cx-ticket__mid">
          {route.mid && <i>{route.mid}</i>}
          <span>⟶</span>
        </span>
        <span className="cx-ticket__pt cx-ticket__pt--to">
          <b>{route.to}</b>
          {route.toSub && <span>{route.toSub}</span>}
        </span>
      </div>
      <div className="cx-ticket__perf" />
      <div className="cx-ticket__grid">
        {grid.map((g, i) => (
          <div className="cx-ticket__cell" key={i}>
            <b>{g.value}</b>
            <span>{g.label}</span>
          </div>
        ))}
      </div>
      {foot && <div className="cx-ticket__foot">{foot}</div>}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="cx-tag">{title}</span>
          <span className="cx-code" />
        </div>
      </div>
    </div>
  )
}

export function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function fmtDateFull(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fmtClock(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fmtWhen(ts: number): string {
  const diff = ts - Date.now()
  const abs = Math.abs(diff)
  if (abs < 3600000) return diff >= 0 ? `${Math.max(1, Math.round(abs / 60000))} 分钟后` : `${Math.round(abs / 60000)} 分钟前`
  if (abs < 86400000) return diff >= 0 ? `${Math.round(abs / 3600000)} 小时后` : `${Math.round(abs / 3600000)} 小时前`
  return diff >= 0 ? `${Math.round(abs / 86400000)} 天后` : `${Math.round(abs / 86400000)} 天前`
}

export { PersonRow as default }

/* ---------- 图表：分时 / K线 / 迷你走势 ---------- */

export function Sparkline({ data, up, width = 62, height = 22 }: { data: number[]; up?: boolean; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / span) * (height - 2) - 1}`)
    .join(' ')
  return (
    <svg className={up === false ? 'cx-down' : 'cx-up'} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export function TrendChart({ data, height = 118 }: { data: number[]; height?: number }) {
  if (data.length < 2) return <div className="cx-chart-empty">暂无分时数据</div>
  const W = 300
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const xy = (v: number, i: number) => `${(i / (data.length - 1)) * W},${(1 - (v - min) / span) * (height - 8) + 4}`
  const line = data.map(xy).join(' ')
  const area = `0,${height} ${line} ${W},${height}`
  const up = data[data.length - 1] >= data[0]
  return (
    <svg className={`cx-trend ${up ? 'cx-up' : 'cx-down'}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height}>
      <polygon points={area} className="cx-trend__area" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function KLineChart({ candles, height = 168, showVolume = true }: { candles: Candle[]; height?: number; showVolume?: boolean }) {
  if (candles.length < 2) return <div className="cx-chart-empty">暂无K线数据</div>
  const W = 300
  const H = height
  const volH = showVolume ? 34 : 0
  const priceH = H - volH - 6
  const max = Math.max(...candles.map((c) => c.h))
  const min = Math.min(...candles.map((c) => c.l))
  const span = max - min || 1
  const cw = (W - 4) / candles.length
  const y = (p: number) => 2 + (1 - (p - min) / span) * priceH
  const maxVol = Math.max(...candles.map((c) => c.v)) || 1
  return (
    <svg className="cx-kline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={2 + f * priceH} y2={2 + f * priceH} className="cx-kline__grid" vectorEffect="non-scaling-stroke" />
      ))}
      {candles.map((c, i) => {
        const x = 2 + i * cw + cw / 2
        const up = c.c >= c.o
        const top = y(Math.max(c.o, c.c))
        const bot = y(Math.min(c.o, c.c))
        const bw = Math.max(1.4, cw * 0.62)
        const vy = 6 + priceH + (c.v / maxVol) * volH
        return (
          <g key={i} className={up ? 'cx-up' : 'cx-down'}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill="currentColor" />
            {showVolume && <rect x={x - bw / 2} y={vy} width={bw} height={Math.max(0.6, H - vy)} fill="currentColor" opacity="0.38" />}
          </g>
        )
      })}
    </svg>
  )
}
