import { MessageCircle, Globe, Music, Settings } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI, AppId } from '../store/ui'
import { useDesktop, wallpaperCss } from '../store/desktopModules'
import { WallpaperLayer } from './WallpaperLayer'
import DesktopModules from './desktop/DesktopModules'
import Dock from './desktop/Dock'

const APPS: { id: AppId; name: string; icon: typeof Music }[] = [
  { id: 'chat', name: '聊天', icon: MessageCircle },
  { id: 'forum', name: '论坛', icon: Globe },
  { id: 'music', name: '音乐', icon: Music },
  { id: 'settings', name: '设置', icon: Settings },
]

export default function Desktop() {
  const openApp = useUI((s) => s.openApp)
  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const wallpaperFx = useSettings((s) => s.wallpaperFx.desktop)
  const iconSize = useSettings((s) => s.desktopIconSize)
  const wallpaperPresetId = useDesktop((s) => s.wallpaperPresetId)

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <WallpaperLayer imageId={wallpaperId} fx={wallpaperFx} fallbackCss={wallpaperCss(wallpaperPresetId)} />
      <div
        className="no-select"
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          padding: 'calc(var(--nav-height) + 10px) 16px 130px',
        }}
      >
        <DesktopModules />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            justifyContent: 'flex-start',
            gap: '18px 0',
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
      <Dock />
    </div>
  )
}