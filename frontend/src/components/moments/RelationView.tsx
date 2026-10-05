import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, Network, ListTree } from 'lucide-react'
import { useToast } from '../../store/ui'
import { useRelations, type Relation } from '../../store/relations'
import { runRelationRefresh, relationNodes, type RelationNode } from '../../lib/relationEngine'
import type { MomentAuthor } from '../../store/moments'
import RelationGraph from './RelationGraph'
import RelationTimeline from './RelationTimeline'
import RelationSheet from './RelationSheet'

const AUTO_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '关闭' },
  { value: 5, label: '5分' },
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
]

export default function RelationView({ onOpenProfile }: { onOpenProfile: (author: MomentAuthor) => void }) {
  const push = useToast((s) => s.push)
  const relations = useRelations((s) => s.relations)
  const autoMinutes = useRelations((s) => s.autoMinutes)
  const setAutoMinutes = useRelations((s) => s.setAutoMinutes)

  const [mode, setMode] = useState<'graph' | 'timeline'>('graph')
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<Relation | null>(null)
  const didSeed = useRef(false)

  const doRefresh = useCallback(
    async (auto = false) => {
      setRefreshing(true)
      try {
        const r = await runRelationRefresh()
        if (!auto) {
          if (r.newRelations === 0 && r.stories === 0) {
            push('至少需要两个角色才能生成关系', 'info')
          } else {
            push(`已更新：${r.newRelations} 条新关系 · ${r.stories} 段故事`)
          }
        }
      } catch {
        if (!auto) push('刷新失败，请重试', 'error')
      } finally {
        setRefreshing(false)
      }
    },
    [push]
  )

  // 首次进入且无数据时自动铺一批，避免空图
  useEffect(() => {
    if (didSeed.current) return
    didSeed.current = true
    if (relations.length === 0 && relationNodes().length >= 2) void doRefresh(true)
  }, [doRefresh, relations.length])

  // 定时刷新
  useEffect(() => {
    if (!autoMinutes) return
    const id = window.setInterval(() => void doRefresh(true), autoMinutes * 60 * 1000)
    return () => window.clearInterval(id)
  }, [autoMinutes, doRefresh])

  const nodeCount = useMemo(() => relationNodes().length, [relations.length])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 6px' }}>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          <Seg active={mode === 'graph'} onClick={() => setMode('graph')} icon={<Network size={14} />} label="关系图谱" />
          <Seg active={mode === 'timeline'} onClick={() => setMode('timeline')} icon={<ListTree size={14} />} label="故事时间轴" />
        </div>
        <select
          value={autoMinutes}
          onChange={(e) => setAutoMinutes(Number(e.target.value))}
          title="定时刷新"
          style={{ width: 'auto', padding: '6px 10px', borderRadius: 999, fontSize: 12 }}
        >
          {AUTO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label === '关闭' ? '自动:关' : o.label}</option>
          ))}
        </select>
        <button
          className="pressable"
          onClick={() => doRefresh(false)}
          disabled={refreshing}
          title="刷新关系"
          style={{ color: 'var(--text-secondary)', padding: 6, flexShrink: 0 }}
        >
          {refreshing ? <Loader2 size={19} className="spin" /> : <RefreshCw size={19} />}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: mode === 'graph' ? 'hidden' : 'auto',
          padding: mode === 'graph' ? '6px 16px 14px' : '6px 16px 24px',
        }}
      >
        {nodeCount < 2 ? (
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center', padding: '60px 12px', lineHeight: 1.8 }}>
            关系地图需要至少两个角色（角色或 NPC）。<br />先去创建角色，再回来刷新。
          </div>
        ) : mode === 'graph' ? (
          <RelationGraph onOpenNode={(n: RelationNode) => onOpenProfile({ type: n.type, id: n.id, name: n.name })} onSelectRelation={setSelected} />
        ) : (
          <RelationTimeline onSelectRelation={setSelected} />
        )}
      </div>

      {selected && <RelationSheet relation={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Seg({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      className="btn btn-sm pressable"
      onClick={onClick}
      style={{
        background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {icon}
      {label}
    </button>
  )
}