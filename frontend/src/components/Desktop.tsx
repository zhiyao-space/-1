import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

/** 每页放多少个功能应用图标（4 列 × 3 行），不硬挤 */
const ICONS_PER_PAGE = 12
/** 每页放几个活的小组件卡片 */
const WIDGETS_PER_PAGE = 2

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function AppGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'flex-start', gap: '18px 0' }}>
      {children}
    </div>
  )
}

function AppIcon({ icon, label, size, onClick }: { icon: ReactNode; label: string; size: number; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{ width: '25%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '4px 0' }}
    >
      <span
        className="glass"
        style={{
          width: size * 2,
          height: size * 2,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          fontSize: size * 0.92,
          lineHeight: 1,
        }}
      >
        {icon}
      </span>
      <span
        className="fs-micro"
        style={{ color: 'var(--text-secondary)', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
      >
        {label}
      </span>
    </button>
  )
}

export default function Desktop() {
  const openApp = useUI((s) => s.openApp)
  const setXiaoguiOpen = useUI((s) => s.setXiaoguiOpen)
  const setRunningApp = useUI((s) => s.setRunningApp)
  const apps = useFactory((s) => s.apps)
  // 小组件尺寸的应用直接以活的卡片嵌在桌面上；其余以图标呈现
  const widgetApps = useMemo(() => apps.filter((a) => a.isVisibleOnDesktop && a.size === 'small'), [apps])
  const desktopApps = useMemo(() => apps.filter((a) => a.isVisibleOnDesktop && a.size !== 'small'), [apps])
  const labels = useCopy((s) => s.texts.appLabels)
  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const wallpaperFx = useSettings((s) => s.wallpaperFx.desktop)
  const iconSize = useSettings((s) => s.desktopIconSize)
  const wallpaperPresetId = useDesktop((s) => s.wallpaperPresetId)

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [page, setPage] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<number | null>(null)
  const drag = useRef<{ x: number; base: number; active: boolean } | null>(null)

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

  const openMenuAt = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  /* ---------- 分页 ---------- */

  const pages = useMemo(() => {
    const list: { key: string; title?: string; body: ReactNode }[] = []

    // 第一页：桌面小组件 + 内置应用
    list.push({
      key: 'main',
      body: (
        <>
          <DesktopModules />
          <AppGrid>
            {APPS.map((app) => {
              const Icon = app.icon
              return (
                <AppIcon
                  key={app.id}
                  icon={<Icon size={iconSize} strokeWidth={1.8} />}
                  label={labels[app.id]?.trim() || app.name}
                  size={iconSize}
                  onClick={() => openApp(app.id)}
                />
              )
            })}
          </AppGrid>
        </>
      ),
    })

    // 后续页：制造厂生成的小组件（活的卡片）
    chunk(widgetApps, WIDGETS_PER_PAGE).forEach((group, i) => {
      list.push({
        key: `widget_${i}`,
        title: '小组件',
        body: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.map((app) => (
              <div key={app.id} className="glass" style={{ position: 'relative', height: 188, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
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
        ),
      })
    })

    // 后续页：制造厂生成的功能应用图标
    chunk(desktopApps, ICONS_PER_PAGE).forEach((group, i) => {
      list.push({
        key: `apps_${i}`,
        title: '功能',
        body: (
          <AppGrid>
            {group.map((app) => (
              <AppIcon key={app.id} icon={app.icon} label={app.name} size={iconSize} onClick={() => setRunningApp(app.id)} />
            ))}
          </AppGrid>
        ),
      })
    })

    return list
  }, [widgetApps, desktopApps, labels, iconSize, openApp, setRunningApp])

  const total = pages.length

  const goPage = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.max(0, Math.min(total - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setPage(next)
  }

  // 页面数量变化（增删应用）时回到有效页
  useEffect(() => {
    if (page <= total - 1) return
    const next = total - 1
    setPage(next)
    const el = scrollerRef.current
    if (el) el.scrollTo({ left: next * el.clientWidth })
  }, [total, page])

  /* ---------- 鼠标拖动翻页（触屏由原生横向滚动处理） ---------- */

  const onDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = scrollerRef.current
    if (!el) return
    // 拖动期间临时关闭 scroll-snap，否则浏览器会不断把页面吸回原处
    el.style.scrollSnapType = 'none'
    drag.current = { x: e.clientX, base: Math.round(el.scrollLeft / (el.clientWidth || 1)), active: true }
  }

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = scrollerRef.current
    if (!d?.active || !el) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6) {
      el.scrollLeft = d.base * el.clientWidth - dx
      clearPress()
    }
  }

  const finishDrag = (clientX: number | null) => {
    const d = drag.current
    const el = scrollerRef.current
    drag.current = null
    if (!d?.active || !el) return
    el.style.scrollSnapType = 'x mandatory'
    if (clientX == null) {
      el.scrollTo({ left: d.base * el.clientWidth })
      return
    }
    const dx = clientX - d.x
    if (Math.abs(dx) > 50) goPage(d.base + (dx < 0 ? 1 : -1))
    else el.scrollTo({ left: d.base * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <WallpaperLayer imageId={wallpaperId} fx={wallpaperFx} fallbackCss={wallpaperCss(wallpaperPresetId)} />
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current
          if (!el) return
          const idx = Math.round(el.scrollLeft / (el.clientWidth || 1))
          if (idx !== page) setPage(idx)
        }}
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={(e) => finishDrag(e.clientX)}
        onPointerCancel={() => finishDrag(null)}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {pages.map((p) => (
          <div
            key={p.key}
            className="no-select"
            onPointerDown={startPress}
            onPointerUp={clearPress}
            onPointerLeave={clearPress}
            onPointerMove={clearPress}
            onContextMenu={openMenuAt}
            style={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              padding: 'calc(var(--nav-height) + 10px) 16px 130px',
            }}
          >
            {p.title && (
              <div className="fs-micro" style={{ color: 'var(--text-secondary)', letterSpacing: '1px', margin: '0 0 10px 2px' }}>
                {p.title}
              </div>
            )}
            {p.body}
          </div>
        ))}
      </div>

      {total > 1 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 106, display: 'flex', justifyContent: 'center', gap: 7, zIndex: 20 }}>
          {pages.map((p, i) => (
            <button
              key={p.key}
              aria-label={`第 ${i + 1} 页`}
              className="pressable"
              onClick={() => goPage(i)}
              style={{
                width: i === page ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === page ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)',
                transition: 'width .2s ease, background .2s ease',
              }}
            />
          ))}
        </div>
      )}

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
