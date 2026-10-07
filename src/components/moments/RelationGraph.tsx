import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { useProfile } from '../../store/profile'
import { useSettings } from '../../store/settings'
import { useRelations, KIND_LABEL, type Relation } from '../../store/relations'
import { relationNodes, type RelationNode } from '../../lib/relationEngine'
import type { MomentAuthor } from '../../store/moments'
import AuthorAvatar from './AuthorAvatar'

interface Sim {
  x: number
  y: number
  vx: number
  vy: number
  bx: number
  by: number
  pinned: boolean
}

function authorOf(n: RelationNode): MomentAuthor {
  return { type: n.type, id: n.id, name: n.name }
}

function nodeRadius(t: RelationNode['type']): number {
  return t === 'user' ? 24 : t === 'character' ? 19 : 15
}

export default function RelationGraph({
  onOpenNode,
  onSelectRelation,
  minHeight = 320,
}: {
  onOpenNode: (node: RelationNode) => void
  onSelectRelation: (rel: Relation) => void
  minHeight?: number
}) {
  const relations = useRelations((s) => s.relations)
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const blocked = useForum((s) => s.blockedNpcIds)
  const profile = useProfile((s) => s.profile)
  const phoneName = useSettings((s) => s.phoneName)

  const wrapRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<Map<string, Sim>>(new Map())
  const nodeEls = useRef<Map<string, HTMLDivElement>>(new Map())
  const edgeEls = useRef<Map<string, SVGLineElement>>(new Map())
  const dotEls = useRef<Map<string, SVGCircleElement>>(new Map())
  const dragRef = useRef<string | null>(null)
  const movedRef = useRef(false)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [ready, setReady] = useState(false)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)

  const nodes = useMemo(
    () => relationNodes(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [characters, npcs, blocked, profile.bio, phoneName]
  )

  const edges = useMemo(() => {
    const keys = new Set(nodes.map((n) => n.key))
    return relations.filter((r) => keys.has(r.fromKey) && keys.has(r.toKey))
  }, [relations, nodes])

  // 尺寸监听
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: Math.max(minHeight, el.clientHeight) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minHeight])

  // 力学布局 + 持续微动（直接写 DOM，避免每帧 re-render）
  useEffect(() => {
    const { w, h } = size
    if (!w || nodes.length === 0) return
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) * 0.34
    const pos = posRef.current

    // 初始化新增节点：用户居中，其余环绕
    const others = nodes.filter((n) => n.type !== 'user')
    others.forEach((n, i) => {
      if (pos.has(n.key)) return
      const angle = (i / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2
      const jitter = 0.7 + (i % 3) * 0.16
      pos.set(n.key, {
        x: cx + Math.cos(angle) * R * jitter,
        y: cy + Math.sin(angle) * R * jitter,
        vx: 0,
        vy: 0,
        bx: cx + Math.cos(angle) * R * jitter,
        by: cy + Math.sin(angle) * R * jitter,
        pinned: false,
      })
    })
    const user = nodes.find((n) => n.type === 'user')
    if (user && !pos.has(user.key)) {
      pos.set(user.key, { x: cx, y: cy, vx: 0, vy: 0, bx: cx, by: cy, pinned: true })
    }
    for (const key of Array.from(pos.keys())) if (!nodes.find((n) => n.key === key)) pos.delete(key)

    const pairIndex = new Map<string, number>()
    nodes.forEach((n, i) => pairIndex.set(n.key, i))

    let raf = 0
    let frame = 0
    const SETTLE = 220

    const writeDOM = (t: number) => {
      for (const n of nodes) {
        const p = pos.get(n.key)
        if (!p) continue
        const el = nodeEls.current.get(n.key)
        if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`
      }
      for (const e of edges) {
        const a = pos.get(e.fromKey)
        const b = pos.get(e.toKey)
        const line = edgeEls.current.get(e.id)
        if (a && b && line) {
          line.setAttribute('x1', String(a.x))
          line.setAttribute('y1', String(a.y))
          line.setAttribute('x2', String(b.x))
          line.setAttribute('y2', String(b.y))
        }
        const dot = dotEls.current.get(e.id)
        if (a && b && dot && e.status !== 'broken' && e.bond >= 45) {
          const k = ((t / 3600 + pairIndex.get(e.fromKey)! * 0.17) % 1)
          dot.setAttribute('cx', String(a.x + (b.x - a.x) * k))
          dot.setAttribute('cy', String(a.y + (b.y - a.y) * k))
        }
      }
    }

    const step = () => {
      frame += 1
      const alpha = Math.max(0.02, 1 - frame / SETTLE)

      if (frame <= SETTLE) {
        // 斥力
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = pos.get(nodes[i].key)!
            const b = pos.get(nodes[j].key)!
            let dx = b.x - a.x
            let dy = b.y - a.y
            let d2 = dx * dx + dy * dy
            if (d2 < 1) {
              dx = Math.random() - 0.5
              dy = Math.random() - 0.5
              d2 = 1
            }
            const f = (5200 / d2) * alpha
            const d = Math.sqrt(d2)
            const fx = (dx / d) * f
            const fy = (dy / d) * f
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }
        }
        // 弹簧（关系越深，边长越短 → 越紧密）
        for (const e of edges) {
          const a = pos.get(e.fromKey)!
          const b = pos.get(e.toKey)!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.max(1, Math.hypot(dx, dy))
          const target = 150 - Math.min(70, e.bond * 0.6)
          const f = (d - target) * 0.028 * alpha
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        }
        // 向心 + 边界
        for (const n of nodes) {
          const p = pos.get(n.key)!
          if (p.pinned) {
            p.vx = 0
            p.vy = 0
            p.x = p.bx
            p.y = p.by
            continue
          }
          p.vx += (cx - p.x) * 0.014 * alpha
          p.vy += (cy - p.y) * 0.014 * alpha
          p.vx *= 0.84
          p.vy *= 0.84
          p.x += p.vx
          p.y += p.vy
          const pad = 34
          p.x = Math.max(pad, Math.min(w - pad, p.x))
          p.y = Math.max(pad, Math.min(h - pad, p.y))
        }
        if (frame === SETTLE) for (const n of nodes) {
          const p = pos.get(n.key)!
          p.bx = p.x
          p.by = p.y
        }
      } else {
        // 静止后：围绕基准点轻微漂浮，保持「活的」手感
        let i = 0
        for (const n of nodes) {
          const p = pos.get(n.key)!
          const ph = frame * 0.012 + i * 1.7
          p.x = p.bx + Math.sin(ph) * 3.2
          p.y = p.by + Math.cos(ph * 0.9) * 3.2
          i++
        }
      }

      writeDOM(frame)
      if (frame === 2) setReady(true)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [size, nodes, edges])

  // 指针拖拽
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const key = dragRef.current
      if (!key || !wrapRef.current) return
      const rect = wrapRef.current.getBoundingClientRect()
      const p = posRef.current.get(key)
      if (!p) return
      movedRef.current = true
      p.x = e.clientX - rect.left
      p.y = e.clientY - rect.top
      p.bx = p.x
      p.by = p.y
      p.pinned = true
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const activeKey = hoverNode ?? null
  const isEdgeActive = (r: Relation) => {
    if (hoverEdge) return hoverEdge === r.id
    if (activeKey) return r.fromKey === activeKey || r.toKey === activeKey
    return false
  }
  const isNodeActive = (n: RelationNode) => {
    if (hoverNode) return hoverNode === n.key
    if (hoverEdge) {
      const e = edges.find((x) => x.id === hoverEdge)
      return !!e && (e.fromKey === n.key || e.toKey === n.key)
    }
    return false
  }
  const dim = !!activeKey || !!hoverEdge

  const strokeFor = (r: Relation) => {
    const active = isEdgeActive(r)
    const base = r.status === 'broken' ? 0.3 : r.status === 'ambiguous' ? 0.42 : 0.58
    const op = active ? 1 : dim ? base * 0.18 : base
    const width = 1 + r.bond / 22 + (active ? 1.2 : 0)
    return { op, width, active }
  }

  const dashFor = (r: Relation, len: number) => {
    if (r.status === 'ambiguous') return '7 7'
    if (r.status === 'broken') {
      const half = Math.max(4, (len - 22) / 2)
      return `${half} 22 ${half}`
    }
    return undefined
  }

  return (
    <div
      ref={wrapRef}
      className="rel-stage no-select"
      style={{ position: 'relative', height: '100%', minHeight, borderRadius: 18, overflow: 'hidden' }}
    >
      <svg width={size.w} height={size.h} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="relFog" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.11)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="relEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#bdbdbd" />
            <stop offset="100%" stopColor="#6f6f6f" />
          </linearGradient>
          <marker id="relArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#bdbdbd" />
          </marker>
        </defs>

        <rect x="0" y="0" width={size.w} height={size.h} fill="url(#relFog)" />
        <circle cx={size.w / 2} cy={size.h / 2} r={Math.min(size.w, size.h) * 0.2} fill="none" stroke="rgba(255,255,255,0.05)" />
        <circle cx={size.w / 2} cy={size.h / 2} r={Math.min(size.w, size.h) * 0.32} fill="none" stroke="rgba(255,255,255,0.035)" />
        <circle cx={size.w / 2} cy={size.h / 2} r={Math.min(size.w, size.h) * 0.44} fill="none" stroke="rgba(255,255,255,0.02)" />

        {edges.map((r) => {
          const s = strokeFor(r)
          return (
            <line
              key={r.id}
              ref={(el) => {
                if (el) edgeEls.current.set(r.id, el)
                else edgeEls.current.delete(r.id)
              }}
              className={r.status === 'ambiguous' ? 'rel-edge rel-edge-flow' : 'rel-edge'}
              stroke="url(#relEdge)"
              strokeOpacity={s.op}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeDasharray={dashFor(r, 160)}
              markerEnd={r.direction === 'one-way' ? 'url(#relArrow)' : undefined}
              style={{ cursor: 'pointer', transition: 'stroke-opacity .18s' }}
              onMouseEnter={() => setHoverEdge(r.id)}
              onMouseLeave={() => setHoverEdge(null)}
              onClick={() => {
                if (movedRef.current) return
                onSelectRelation(r)
              }}
            >
              <title>{`${KIND_LABEL[r.kind]} · ${r.note}`}</title>
            </line>
          )
        })}

        {edges
          .filter((r) => r.status !== 'broken' && r.bond >= 45)
          .map((r) => (
            <circle
              key={`dot-${r.id}`}
              ref={(el) => {
                if (el) dotEls.current.set(r.id, el)
                else dotEls.current.delete(r.id)
              }}
              r={2}
              fill="#ffffff"
              opacity={isEdgeActive(r) ? 0.95 : 0.5}
              style={{ pointerEvents: 'none' }}
            />
          ))}
      </svg>

      {nodes.map((n) => {
        const small = n.type === 'npc'
        const r = nodeRadius(n.type)
        const label = n.name
        const active = isNodeActive(n)
        return (
          <div
            key={n.key}
            ref={(el) => {
              if (el) nodeEls.current.set(n.key, el)
              else nodeEls.current.delete(n.key)
            }}
            onPointerDown={() => {
              movedRef.current = false
              dragRef.current = n.key
            }}
            onMouseEnter={() => setHoverNode(n.key)}
            onMouseLeave={() => setHoverNode(null)}
            onClick={() => {
              if (movedRef.current) return
              onOpenNode(n)
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'grab',
              touchAction: 'none',
              opacity: !ready ? 0 : dim && !active ? 0.28 : 1,
              transition: ready ? 'opacity .18s' : 'opacity .3s ease',
              zIndex: active ? 5 : n.type === 'user' ? 4 : 2,
            }}
          >
            <div
              className={n.type === 'user' ? 'rel-ring rel-ring-user' : n.type === 'character' ? 'rel-ring rel-ring-char' : 'rel-ring rel-ring-npc'}
              style={{
                padding: 3,
                borderRadius: '50%',
                transform: active ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform .18s ease',
              }}
            >
              <AuthorAvatar author={authorOf(n)} size={r * 2} shape="circle" />
            </div>
            <span
              className="fs-micro"
              style={{
                maxWidth: 74,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: n.type === 'user' ? 'var(--text-primary)' : small ? 'var(--text-disabled)' : 'var(--text-secondary)',
                background: 'rgba(0,0,0,0.45)',
                padding: '1px 5px',
                borderRadius: 999,
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </span>
          </div>
        )
      })}

      {relations.length === 0 && (
        <div
          className="fs-micro"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', pointerEvents: 'none' }}
        >
          还没有关系数据，点上方刷新生成
        </div>
      )}

      <div className="rel-legend">
        <span><i className="rel-ln rel-ln-user" />我</span>
        <span><i className="rel-ln rel-ln-char" />角色</span>
        <span><i className="rel-ln rel-ln-npc" />NPC</span>
        <span><i className="rel-ln rel-ln-both" />双向</span>
        <span><i className="rel-ln rel-ln-one" />单向</span>
        <span><i className="rel-ln rel-ln-amb" />暧昧</span>
        <span><i className="rel-ln rel-ln-broken" />破裂</span>
      </div>
    </div>
  )
}