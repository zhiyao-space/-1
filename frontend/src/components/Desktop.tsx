import { useMemo, useRef, useState } from 'react'
import { Factory, Ghost, Globe, Heart, Map, Maximize2, MessageCircle, Music, Settings, Store } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI, AppId } from '../store/ui'
import { useCopy } from '../store/copy'
import { useDesktop, wallpaperCss } from '../store/desktopModules'
import { useFactory } from '../store/factory'
import { WallpaperLayer } from './WallpaperLayer'
import DesktopModules from './desktop/DesktopModules'
import Dock from './desktop/Dock'
import Preview from './factory/Preview'

const APPS: { id: AppId; name: string; icon: typeof Music }[] = [
  { id: 'chat', name: '聊天', icon: MessageCircle },
  { id: 'forum', name: '论坛', icon: Globe },
  { id: 'social', name: 'mu社区', icon: Heart },
  { id: 'mall', name: 'mulin 商城', icon: Store },
  { id: 'city', name: 'Mul市', icon: Map },
  { id: 'music', name: '音乐', icon: Music },
  { id: 'factory', name: '制造厂', icon: Factory },
  { id: 'settings', name: '设置', icon: Settings },
]

export default function Desktop() {
  const openApp = useUI((s) => s.openApp)
  const setXiaoguiOpen = useUI((s) => s.setXiaoguiOpen)
  const setRunningApp = useUI((s) => s.setRunningApp)
  const apps = useFactory((s) => s.apps)
  // 小组件尺寸的应用直接以活的卡片嵌在桌面上；其余以小尺寸以外的图标呈现
  const widgetApps = useMemo(() => apps.filter((a) => a.isVisibleOnDesktop && a.size === 'small'), [apps])
  const desktopApps = useMemo(() => apps.filter((a) => a.isVisibleOnDesktop && a.size !== 'small'), [apps])
  const labels = useCopy((s) => s.texts.appLabels)
  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const wallpaperFx = useSettings((s) => s.wallpaperFx.desktop)
  const iconSize = useSettings((s) => s.desktopIconSize)
  const wallpaperPresetId = useDesktop((s) => s.wallpaperPresetId)

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const pressTimer = useRef<number | null>(null)

  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  // 长按桌面空白处弹出菜单
  const startPress = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    clearPress()
    pressTimer.current = window.setTimeout(() => {
      setMenu({ x, y })
      navigator.vibrate?.(10)
    }, 500)
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <WallpaperLayer imageId={wallpaperId} fx={wallpaperFx} fallbackCss={wallpaperCss(wallpaperPresetId)} />
      <div
        className="no-select"
        onPointerDown={startPress}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerMove={clearPress}
        onScroll={clearPress}
        onContextMenu={(e) => {
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          padding: 'calc(var(--nav-height) + 10px) 16px 130px',
        }}
      >
        <DesktopModules />

        {widgetApps.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="fs-micro" style={{ color: 'var(--text-secondary)', letterSpacing: '1px', margin: '0 0 8px 2px' }}>
              小组件
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {widgetApps.map((app) => (
                <div
                  key={app.id}
                  className="glass"
                  style={{ position: 'relative', height: 188, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
                >
                  <Preview appId={app.id} app={{ name: app.name, html: app.html, css: app.css, js: app.js }} device="tablet" />
                  <button
                    className="pressable"
                    onClick={() => setRunningApp(app.id)}
                    title={`打开「${app.name}」`}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.45)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  {labels[app.id]?.trim() || app.name}
                </span>
              </button>
            )
          })}
          {desktopApps.map((app) => (
            <button
              key={app.id}
              className="pressable"
              onClick={() => setRunningApp(app.id)}
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
                  fontSize: iconSize * 0.92,
                  lineHeight: 1,
                }}
              >
                {app.icon}
              </span>
              <span className="fs-micro" style={{ color: 'var(--text-secondary)', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {app.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <Dock />

      {menu && (
        <div
          onClick={() => setMenu(null)}
          style={{ position: 'absolute', inset: 0, zIndex: 300 }}
        >
          <div
            className="glass page-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: Math.max(8, Math.min(menu.x, 270)),
              top: Math.max(8, Math.min(menu.y, 640)),
              width: 168,
              borderRadius: 16,
              padding: 6,
            }}
          >
            <button
              className="pressable"
              onClick={() => {
                setMenu(null)
                setXiaoguiOpen(true)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 12px',
                borderRadius: 12,
                textAlign: 'left',
                color: 'var(--text-primary)',
              }}
            >
              <Ghost size={17} />
              <span className="fs-body">{labels.xiaogui?.trim() || '小鬼'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}