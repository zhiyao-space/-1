import { MessagesSquare, BookUser, Globe, Camera, Bell, Music, Settings, Smartphone } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI, AppId } from '../store/ui'
import { WallpaperLayer } from './WallpaperLayer'

const APPS: { id: AppId; name: string; icon: typeof Bell }[] = [
  { id: 'messages', name: '信息', icon: MessagesSquare },
  { id: 'contacts', name: '通讯录', icon: BookUser },
  { id: 'forum', name: '论坛', icon: Globe },
  { id: 'moments', name: '朋友圈', icon: Camera },
  { id: 'notifications', name: '通知中心', icon: Bell },
  { id: 'music', name: '音乐', icon: Music },
  { id: 'settings', name: '设置', icon: Settings },
  { id: 'about', name: '关于', icon: Smartphone },
]

export default function Desktop() {
  const openApp = useUI((s) => s.openApp)
  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const wallpaperFx = useSettings((s) => s.wallpaperFx.desktop)
  const iconSize = useSettings((s) => s.desktopIconSize)

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <WallpaperLayer imageId={wallpaperId} fx={wallpaperFx} />
      <div
        className="no-select"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          justifyContent: 'flex-start',
          gap: '18px 0',
          padding: 'calc(var(--nav-height) + 8px) 18px 24px',
          overflowY: 'auto',
        }}
      >
        {APPS.map((app) => {
          const Icon = app.icon
          return (
            <button
              key={app.id}
              className="pressable"
              onClick={() => openApp(app.id)}
              style={{
                width: '25%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
              }}
            >
              <span
                className="glass"
                style={{
                  width: iconSize * 2,
                  height: iconSize * 2,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                }}
              >
                <Icon size={iconSize} strokeWidth={1.8} />
              </span>
              <span className="fs-micro" style={{ color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                {app.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
