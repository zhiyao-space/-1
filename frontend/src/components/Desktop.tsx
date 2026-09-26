import { useRef, useState } from 'react'
import { Plus, Copy, Trash2, RotateCcw, Check, Pencil, Layers, X } from 'lucide-react'
import { useDesktop, WidgetInstance } from '../store/desktop'
import { useSettings } from '../store/settings'
import { useToast } from '../store/ui'
import { WallpaperLayer } from './WallpaperLayer'
import { WidgetInner, widgetBoxStyle } from './widgets'
import { AddWidgetSheet, WidgetEditModal } from './WidgetEditModal'

export default function Desktop() {
  const pages = useDesktop((s) => s.pages)
  const currentPage = useDesktop((s) => s.currentPage)
  const editing = useDesktop((s) => s.editing)
  const selectedId = useDesktop((s) => s.selectedId)
  const setEditing = useDesktop((s) => s.setEditing)
  const select = useDesktop((s) => s.select)
  const setPage = useDesktop((s) => s.setPage)
  const moveWidget = useDesktop((s) => s.moveWidget)
  const removeWidget = useDesktop((s) => s.removeWidget)
  const duplicateWidget = useDesktop((s) => s.duplicateWidget)
  const addPage = useDesktop((s) => s.addPage)
  const removePage = useDesktop((s) => s.removePage)
  const resetLayout = useDesktop((s) => s.resetLayout)

  const parallax = useSettings((s) => s.parallax)
  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const wallpaperFx = useSettings((s) => s.wallpaperFx.desktop)
  const push = useToast((s) => s.push)

  const pagesRef = useRef<HTMLDivElement>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WidgetInstance | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const movedRef = useRef(false)

  const page = pages[Math.min(currentPage, pages.length - 1)]

  const startEditPress = () => {
    cancelEditPress()
    pressTimer.current = setTimeout(() => {
      setEditing(true)
      push('进入编辑模式', 'info')
    }, 550)
  }
  const cancelEditPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const onWidgetPointerDown = (e: React.PointerEvent, w: WidgetInstance) => {
    if (!editing) return
    e.stopPropagation()
    cancelEditPress()
    select(w.id)
    if (w.locked) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    movedRef.current = false
    dragRef.current = { id: w.id, startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y }
  }
  const onWidgetPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true
    moveWidget(d.id, d.origX + dx, d.origY + dy)
  }
  const onWidgetPointerUp = () => {
    dragRef.current = null
  }

  const scrollToPage = (i: number) => {
    const el = pagesRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    setPage(i)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 'var(--statusbar-height)',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 'calc(var(--nav-height) - 28px)', flexShrink: 0 }} />

      <div
        className="no-select"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onPointerDown={startEditPress}
        onPointerUp={cancelEditPress}
        onPointerLeave={cancelEditPress}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-40px',
            transform: parallax ? `translateX(${currentPage * -14}px)` : undefined,
            transition: 'transform 400ms ease-out',
          }}
        >
          <WallpaperLayer imageId={wallpaperId} fx={wallpaperFx} />
        </div>

        <div
          ref={pagesRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            overflowX: editing ? 'hidden' : 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
          }}
          onScroll={(e) => {
            if (editing) return
            const el = e.currentTarget
            const idx = Math.round(el.scrollLeft / el.clientWidth)
            if (idx !== currentPage) setPage(idx)
          }}
        >
          {pages.map((p) => (
            <div
              key={p.id}
              style={{
                width: '100%',
                height: '100%',
                flexShrink: 0,
                position: 'relative',
                scrollSnapAlign: 'start',
              }}
            >
              {p.widgets.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div className="fs-aux" style={{ color: 'var(--text-disabled)', textAlign: 'center', lineHeight: 1.8 }}>
                    长按桌面进入编辑模式
                    <br />
                    添加你的专属组件
                  </div>
                </div>
              )}
              {p.widgets.map((w) => (
                <div
                  key={w.id}
                  onPointerDown={(e) => onWidgetPointerDown(e, w)}
                  onPointerMove={onWidgetPointerMove}
                  onPointerUp={onWidgetPointerUp}
                  onDoubleClick={() => setEditTarget(w)}
                  style={{
                    position: 'absolute',
                    left: w.x,
                    top: w.y,
                    width: w.w,
                    height: w.h,
                    zIndex: selectedId === w.id ? 20 : 5,
                    cursor: editing ? (w.locked ? 'default' : 'grab') : 'pointer',
                    touchAction: editing ? 'none' : 'auto',
                    animation: editing && !w.locked && !dragRef.current ? 'wiggle 0.4s ease-in-out infinite' : undefined,
                    outline: editing && selectedId === w.id ? '1.5px solid var(--accent)' : undefined,
                    outlineOffset: 3,
                  }}
                >
                  <div style={{ width: '100%', height: '100%', ...widgetBoxStyle(w) }}>
                    <WidgetInner
                      w={w}
                      onEdit={(wid) => {
                        const target = pages.flatMap((pg) => pg.widgets).find((x) => x.id === wid)
                        if (target) setEditTarget(target)
                      }}
                    />
                  </div>
                  {editing && selectedId === w.id && (
                    <>
                      <button
                        className="pressable"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeWidget(w.id)
                          push('组件已删除', 'info')
                        }}
                        style={{
                          position: 'absolute',
                          top: -9,
                          left: -9,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#e5484d',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 30,
                        }}
                      >
                        <X size={12} />
                      </button>
                      <button
                        className="pressable"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditTarget(w)
                        }}
                        style={{
                          position: 'absolute',
                          top: -9,
                          right: -9,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          color: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 30,
                        }}
                      >
                        <Pencil size={11} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}

          {editing && (
            <div
              style={{
                width: '100%',
                height: '100%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'start',
              }}
            >
              <button
                className="btn"
                onClick={() => {
                  addPage()
                  push('已新增一页桌面')
                }}
              >
                <Plus size={16} /> 新增桌面页
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0 6px', flexShrink: 0 }}>
        {pages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => scrollToPage(i)}
            style={{
              width: i === currentPage ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentPage ? 'var(--text-primary)' : 'rgba(255,255,255,0.25)',
              transition: 'width var(--transition-fast)',
            }}
          />
        ))}
      </div>

      {editing && (
        <div
          className="glass"
          style={{
            margin: '0 12px 12px',
            borderRadius: 999,
            padding: '8px 12px',
            display: 'flex',
            gap: 6,
            justifyContent: 'space-around',
            flexShrink: 0,
            zIndex: 100,
          }}
        >
          <EditTool icon={<Plus size={16} />} label="添加" onClick={() => setAddOpen(true)} />
          <EditTool
            icon={<Copy size={16} />}
            label="复制"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                duplicateWidget(selectedId)
                push('组件已复制')
              }
            }}
          />
          <EditTool
            icon={<Trash2 size={16} />}
            label="删除"
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) {
                removeWidget(selectedId)
                push('组件已删除', 'info')
              }
            }}
          />
          {page.widgets.length === 0 && pages.length > 1 && (
            <EditTool
              icon={<Layers size={16} />}
              label="删此页"
              onClick={() => {
                removePage(page.id)
                push('页面已移除', 'info')
              }}
            />
          )}
          <EditTool
            icon={<RotateCcw size={16} />}
            label="重置"
            onClick={() => {
              resetLayout()
              push('布局已重置', 'info')
            }}
          />
          <EditTool
            icon={<Check size={16} />}
            label="完成"
            accent
            onClick={() => {
              setEditing(false)
              push('已退出编辑模式')
            }}
          />
        </div>
      )}

      <AddWidgetSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <WidgetEditModal widget={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  )
}

function EditTool({
  icon,
  label,
  onClick,
  disabled,
  accent,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  accent?: boolean
}) {
  return (
    <button
      className="pressable"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        color: disabled ? 'var(--text-disabled)' : accent ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: 10,
        padding: '4px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
