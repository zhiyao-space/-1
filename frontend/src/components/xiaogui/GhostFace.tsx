import type { Mood } from '../../store/xiaogui'

/** 黑白渐变发光小幽灵的脸 + 身体（纯 SVG，无外部资源） */
export default function GhostFace({
  size = 56,
  mood = 'idle',
  talking = false,
}: {
  size?: number
  mood?: Mood
  talking?: boolean
}) {
  const dark = '#141414'

  const eyes = (() => {
    switch (mood) {
      case 'thinking':
        return (
          <>
            <ellipse cx="25" cy="27.5" rx="3.1" ry="3.6" fill={dark} />
            <ellipse cx="41" cy="27.5" rx="3.1" ry="3.6" fill={dark} />
            <circle cx="25.9" cy="26.3" r="1" fill="#fff" />
            <circle cx="41.9" cy="26.3" r="1" fill="#fff" />
          </>
        )
      case 'coding':
        return (
          <>
            <rect x="19" y="26.5" width="10" height="4.6" rx="2.3" fill={dark} />
            <rect x="35" y="26.5" width="10" height="4.6" rx="2.3" fill={dark} />
            <rect x="29" y="28" width="6" height="1.8" rx="0.9" fill={dark} />
          </>
        )
      case 'done':
        return (
          <>
            <path d="M20.5 29.5q4-5.5 8 0" fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M35.5 29.5q4-5.5 8 0" fill="none" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
          </>
        )
      case 'error':
        return (
          <>
            <ellipse cx="24.5" cy="29" rx="4.4" ry="4.8" fill="#fff" stroke={dark} strokeWidth="1.6" />
            <ellipse cx="39.5" cy="29" rx="4.4" ry="4.8" fill="#fff" stroke={dark} strokeWidth="1.6" />
            <circle cx="24.8" cy="29.6" r="1.9" fill={dark} />
            <circle cx="39.8" cy="29.6" r="1.9" fill={dark} />
            <ellipse cx="17.5" cy="34" rx="3.2" ry="1.8" fill="#c98a8a" opacity="0.45" />
            <ellipse cx="46.5" cy="34" rx="3.2" ry="1.8" fill="#c98a8a" opacity="0.45" />
          </>
        )
      default:
        return (
          <>
            <ellipse cx="24.5" cy="29" rx="3.3" ry="3.9" fill={dark} />
            <ellipse cx="39.5" cy="29" rx="3.3" ry="3.9" fill={dark} />
            <circle cx="25.4" cy="27.7" r="1.1" fill="#fff" />
            <circle cx="40.4" cy="27.7" r="1.1" fill="#fff" />
          </>
        )
    }
  })()

  const mouth = (() => {
    if (talking) return <ellipse className="xg-mouth-anim" cx="32" cy="38.5" rx="3.4" ry="3" fill={dark} />
    switch (mood) {
      case 'thinking':
        return <circle cx="32" cy="38.5" r="2.1" fill={dark} />
      case 'coding':
        return <rect x="28" y="37.8" width="8" height="1.8" rx="0.9" fill={dark} />
      case 'done':
        return <path d="M27 36.5q5 7 10 0z" fill={dark} />
      case 'error':
        return <circle cx="32" cy="38.5" r="2.6" fill={dark} />
      default:
        return <path d="M28.5 37.5q3.5 3 7 0" fill="none" stroke={dark} strokeWidth="2" strokeLinecap="round" />
    }
  })()

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="xg-body-grad" cx="50%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#cfcfcf" />
          <stop offset="100%" stopColor="#6f6f6f" />
        </radialGradient>
      </defs>
      <path
        d="M32 7c-13.3 0-24 10.7-24 24v20c0 2.8 3.3 4.2 5.4 2.4l1-.9c1.2-1 3-1 4.2 0l1.2 1c1.2 1 3 1 4.2 0l1.2-1c1.2-1 3-1 4.2 0l1.2 1c1.2 1 3 1 4.2 0l1.2-1c1.2-1 3-1 4.2 0l1 .9C52.7 55.2 56 53.8 56 51V31c0-13.3-10.7-24-24-24z"
        fill="url(#xg-body-grad)"
        opacity="0.96"
      />
      <ellipse cx="32" cy="20" rx="15" ry="9" fill="#ffffff" opacity="0.22" />
      {eyes}
      {mouth}
    </svg>
  )
}