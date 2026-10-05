/**
 * 项目风格图标：内联 SVG + 黑白线性渐变描边，禁用 emoji 与系统图标。
 * 渐变定义在所有页面共用的 <GradDefs/> 中，仅在 App 根节点渲染一次。
 */
export const GRADIENT_ID = 'ks-grad'

export function GradDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d4d4d4" />
          <stop offset="100%" stopColor="#6b6b6b" />
        </linearGradient>
      </defs>
    </svg>
  )
}

interface IconProps {
  size?: number
  strokeWidth?: number
}

function base(size: number, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: `url(#${GRADIENT_ID})`,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

/** 聊天：两个交错的对话气泡 */
export function ChatIcon({ size = 24, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H9.5L6 16.2V13.5H6a2 2 0 0 1-2-2V7z" />
      <path d="M16.5 10.2h2.2a1.6 1.6 0 0 1 1.6 1.6v3A1.6 1.6 0 0 1 18.7 16.4h-.3v2l-2.4-2h-.1a1.6 1.6 0 0 1-1.4-1.6" />
    </svg>
  )
}

/** 短信：信封造型 */
export function SmsIcon({ size = 24, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
      <path d="M4.6 7.6 12 12.8l7.4-5.2" />
    </svg>
  )
}

/** 电话：经典听筒造型 */
export function PhoneIcon({ size = 24, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M5 5.4c0-1 .8-1.9 1.9-1.9h1.4c.7 0 1.3.5 1.5 1.2l.7 2.3c.2.6 0 1.2-.5 1.6l-1.2 1a12.3 12.3 0 0 0 5 5l1-1.2c.4-.5 1-.7 1.6-.5l2.3.7c.7.2 1.2.8 1.2 1.5v1.4c0 1-.9 1.9-1.9 1.9C12 18.9 5 11.9 5 5.4z" />
    </svg>
  )
}

/** 刷新：圆形箭头 */
export function RefreshIcon({ size = 24, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M4.8 12a7.2 7.2 0 0 1 12.3-5.1" />
      <path d="M17.6 3.4v3.4h-3.4" />
      <path d="M19.2 12a7.2 7.2 0 0 1-12.3 5.1" />
      <path d="M6.4 20.6v-3.4h3.4" />
    </svg>
  )
}

/** 天气：云 */
export function CloudIcon({ size = 24, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .3-7.6 5.2 5.2 0 0 0-9.9-.4 3.9 3.9 0 0 0 .4 8z" />
    </svg>
  )
}

/** 播放 */
export function PlayIcon({ size = 24, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M8 5.5 18.5 12 8 18.5z" />
    </svg>
  )
}

/** 暂停 */
export function PauseIcon({ size = 24, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M9.5 5.5v13M14.5 5.5v13" />
    </svg>
  )
}

/** 音乐：音符 */
export function MusicIcon({ size = 24, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} aria-hidden>
      <path d="M9 18V6.2l9-1.7V16" />
      <circle cx="6.6" cy="18" r="2.6" />
      <circle cx="15.6" cy="16" r="2.6" />
    </svg>
  )
}