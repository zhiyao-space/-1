import type { CSSProperties, ReactNode } from 'react'
import {
  AtSign,
  Bell,
  Bike,
  BookOpen,
  Cake,
  Candy,
  Car,
  Castle,
  Cat,
  Cherry,
  Clover,
  Cookie,
  Crown,
  Disc3,
  Dumbbell,
  Eye,
  Flag,
  Flame,
  Flower2,
  Gamepad2,
  Ghost,
  Gift,
  Glasses,
  Guitar,
  Heart,
  Laugh,
  Link2,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic2,
  Music,
  Palette,
  PartyPopper,
  Pause,
  PersonStanding,
  Plane,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import Avatar from '../chat/Avatar'
import { useBlobURL } from '../WallpaperLayer'
import { filterCss, gradientOf, type DyAuthor, type DyLayer, type DyVideo, type DyVideoStyle } from '../../lib/douyinEngine'

/** 图标注册表：全模块统一用矢量图标，禁止 emoji 充当图标 / 样式字符 */
export const DY_ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  candy: Candy,
  rocket: Rocket,
  crown: Crown,
  castle: Castle,
  car: Car,
  gift: Gift,
  chat: MessageCircle,
  comment: MessageSquare,
  talent: Mic2,
  game: Gamepad2,
  commerce: ShoppingBag,
  like: Heart,
  follow: UserPlus,
  visit: Eye,
  mention: AtSign,
  system: Bell,
  dm: Mail,
  user: User,
  users: Users,
  flame: Flame,
  link: Link2,
  star: Star,
  flag: Flag,
  dance: PersonStanding,
  music: Music,
  guitar: Guitar,
  laugh: Laugh,
  academic: BookOpen,
  sport: Dumbbell,
  life: UtensilsCrossed,
  beauty: Palette,
  flower: Flower2,
  cat: Cat,
  cake: Cake,
  cookie: Cookie,
  glasses: Glasses,
  ghost: Ghost,
  cherry: Cherry,
  zap: Zap,
  clover: Clover,
  plane: Plane,
  wand: Wand2,
  disc: Disc3,
  party: PartyPopper,
  bike: Bike,
  sparkles: Sparkles,
}

export function DyIcon({
  name,
  size = 20,
  color,
  className,
  style,
  strokeWidth = 2,
}: {
  name: string
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}) {
  const C = DY_ICONS[name] ?? Star
  return <C size={size} color={color} className={className} style={style} strokeWidth={strokeWidth} />
}

export const STYLE_ICON: Record<DyVideoStyle, string> = {
  dance: 'dance',
  talent: 'guitar',
  funny: 'laugh',
  academic: 'academic',
  sport: 'sport',
  life: 'life',
  beauty: 'beauty',
}

export const STYLE_LABEL: Record<DyVideoStyle, string> = {
  dance: '舞蹈',
  talent: '音乐才艺',
  funny: '搞笑',
  academic: '知识科普',
  sport: '运动健身',
  life: '生活日常',
  beauty: '美妆穿搭',
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function DyAvatar({ author, size = 40 }: { author: DyAuthor; size?: number }) {
  return <Avatar imageId={author.avatarId} name={author.name} size={size} />
}

/** 封面图源：外链直用，本地图片走 IndexedDB */
export function useCoverSrc(coverImage: string | null): string | null {
  const isRemote = !!coverImage && /^https?:/.test(coverImage)
  const blob = useBlobURL(isRemote ? null : coverImage)
  return isRemote ? coverImage : blob
}

export function CoverArt({ video, paused }: { video: DyVideo; paused?: boolean }) {
  const src = useCoverSrc(video.coverImage)
  const [a, b] = gradientOf(`${video.description}${video.author.key}`)
  const filt = filterCss(video.filter)
  return (
    <>
      <div
        className="dy-cover"
        style={src ? { filter: filt } : { background: `linear-gradient(158deg, ${a}, ${b})`, filter: filt }}
      />
      {src ? <img className="dy-cover-img" src={src} alt="" style={{ filter: filt }} /> : null}
      {!src && <div className="dy-cover-anim" />}
      <div className="dy-cover-emoji">
        <DyIcon name={STYLE_ICON[video.style]} size={78} color="#fff" strokeWidth={1.4} />
      </div>
      <div className="dy-cover-title">{video.description.replace(/#[^\s#]+/g, '').trim()}</div>
      <div className="dy-video-foot" />
      {paused && (
        <div className="dy-pause-tag">
          <Pause size={26} color="rgba(255,255,255,0.6)" />
        </div>
      )}
    </>
  )
}

/** 作品九宫格用的封面缩略（渐变或生图） */
export function CoverThumb({ video, children }: { video: DyVideo; children?: ReactNode }) {
  const src = useCoverSrc(video.coverImage)
  const [a, b] = gradientOf(`${video.description}${video.author.key}`)
  const filt = filterCss(video.filter)
  return (
    <div className="dy-grid-cell" style={src ? undefined : { background: `linear-gradient(150deg, ${a}, ${b})`, filter: filt }}>
      {src ? <img src={src} alt="" style={{ filter: filt }} /> : (
        <span className="dy-cover-emoji" style={{ top: '38%' }}>
          <DyIcon name={STYLE_ICON[video.style]} size={34} color="#fff" strokeWidth={1.5} />
        </span>
      )}
      <div className="dy-grid-cap">{video.description.replace(/#[^\s#]+/g, '').trim()}</div>
      {children}
    </div>
  )
}

/** 主页装扮图层的渲染内容：贴纸用矢量图标，文字用文本 */
export function LayerContent({ layer }: { layer: DyLayer }) {
  if (layer.kind === 'sticker') {
    return <DyIcon name={layer.icon ?? 'star'} size={30} color={layer.color} strokeWidth={2.2} />
  }
  return <>{layer.content}</>
}

/** 底部半屏面板 */
export function DySheet({
  title,
  onClose,
  children,
  footer,
  center,
}: {
  title?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  center?: boolean
}) {
  return (
    <div className="dy-sheet-mask" onClick={onClose}>
      <div className={center ? 'dy-sheet dy-sheet--center' : 'dy-sheet'} onClick={(e) => e.stopPropagation()}>
        {title !== undefined && (
          <div className="dy-sheet-head">
            <span>{title}</span>
            <button className="pressable" onClick={onClose} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              关闭
            </button>
          </div>
        )}
        <div className="dy-sheet-body">{children}</div>
        {footer}
      </div>
    </div>
  )
}