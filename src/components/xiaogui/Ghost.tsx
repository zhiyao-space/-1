import { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/ui'
import { useXiaogui } from '../../store/xiaogui'
import { useCopy } from '../../store/copy'
import GhostFace from './GhostFace'

/** 桌面悬浮的小鬼：可点击打开对话，可拖拽移动位置 */
export default function Ghost() {
  const storedPos = useXiaogui((s) => s.pos)
  const setStoredPos = useXiaogui((s) => s.setPos)
  const mood = useXiaogui((s) => s.mood)
  const streaming = useXiaogui((s) => s.streaming)
  const setOpen = useUI((s) => s.setXiaoguiOpen)
  const name = useCopy((s) => s.texts.appLabels.xiaogui?.trim() || '小鬼')

  const [pos, setPos] = useState(storedPos)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  useEffect(() => {
    setPos(storedPos)
  }, [storedPos])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el) return
    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement
    if (!parent) return
    const prect = parent.getBoundingClientRect()
    const erect = el.getBoundingClientRect()
    dragRef.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: erect.left - prect.left,
      oy: erect.top - prect.top,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const el = wrapRef.current
    if (!d || !el) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
    if (!d.moved) return
    const parent = (el.offsetParent as HTMLElement | null) ?? el.parentElement
    if (!parent) return
    const prect = parent.getBoundingClientRect()
    const maxX = Math.max(4, prect.width - el.offsetWidth - 4)
    const maxY = Math.max(4, prect.height - el.offsetHeight - 4)
    setPos({ x: Math.max(4, Math.min(d.ox + dx, maxX)), y: Math.max(4, Math.min(d.oy + dy, maxY)) })
  }

  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (d.moved) {
      if (pos) setStoredPos(pos)
    } else {
      setOpen(true)
    }
  }

  return (
    <div
      ref={wrapRef}
      className="no-select"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title={name}
      style={{
        position: 'absolute',
        ...(pos ? { left: pos.x, top: pos.y } : { right: 14, bottom: 152 }),
        width: 68,
        height: 68,
        zIndex: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragRef.current?.moved ? 'grabbing' : 'pointer',
        touchAction: 'none',
      }}
    >
      <span
        className="xg-halo"
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          opacity: 0.3,
        }}
      />
      <span className="xg-float" style={{ position: 'relative', display: 'flex' }}>
        <span className="xg-sway" style={{ display: 'flex' }}>
          <GhostFace size={54} mood={mood} talking={streaming} />
        </span>
      </span>
    </div>
  )
}