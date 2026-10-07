import { useMemo, useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Modal } from '../common'
import { useToast } from '../../store/ui'
import { relativeTime } from '../../store/moments'
import {
  useRelations,
  KIND_LABEL,
  KIND_ORDER,
  STATUS_LABEL,
  type Relation,
  type RelationKind,
  type RelationStatus,
} from '../../store/relations'
import { relationNodes, type RelationNode } from '../../lib/relationEngine'
import AuthorAvatar from './AuthorAvatar'

function authorOf(n?: RelationNode) {
  return n ? { type: n.type, id: n.id, name: n.name } : { type: 'character' as const, id: '?', name: '未知' }
}

export default function RelationSheet({ relation, onClose }: { relation: Relation; onClose: () => void }) {
  const push = useToast((s) => s.push)
  const stories = useRelations((s) => s.stories)
  const updateRelation = useRelations((s) => s.updateRelation)
  const removeRelation = useRelations((s) => s.removeRelation)

  const nodes = useMemo(() => relationNodes(), [])
  const a = nodes.find((n) => n.key === relation.fromKey)
  const b = nodes.find((n) => n.key === relation.toKey)

  const [editing, setEditing] = useState(false)
  const [kind, setKind] = useState<RelationKind>(relation.kind)
  const [bond, setBond] = useState(relation.bond)
  const [status, setStatus] = useState<RelationStatus>(relation.status)
  const [direction, setDirection] = useState(relation.direction)
  const [note, setNote] = useState(relation.note)

  const mine = stories.filter((s) => s.relationId === relation.id)

  const save = () => {
    updateRelation(relation.id, { kind, bond, status, direction, note: note.trim() }, true)
    push('已保存关系')
    setEditing(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="关系档案" width={360}>
      {/* 关系双方 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <AuthorAvatar author={authorOf(a)} size={46} shape="circle" />
          <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{a?.name ?? '未知'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="fs-aux" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{KIND_LABEL[relation.kind]}</span>
          <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            {relation.direction === 'one-way' ? '单向' : '双向'} · {STATUS_LABEL[relation.status]}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <AuthorAvatar author={authorOf(b)} size={46} shape="circle" />
          <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>{b?.name ?? '未知'}</span>
        </div>
      </div>

      {/* 关系深度 */}
      <div style={{ marginBottom: 12 }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span>关系深度</span>
          <span>{relation.bond}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${relation.bond}%`, height: '100%', background: 'linear-gradient(90deg, #ffffff, #8a8a8a)' }} />
        </div>
      </div>

      {relation.note && (
        <div className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.6, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 12 }}>
          {relation.note}
        </div>
      )}

      {/* 故事 */}
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>关联故事 {mine.length}</div>
      {mine.length === 0 ? (
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '10px 0 14px' }}>还没有故事，刷新后可能会发生点什么。</div>
      ) : (
        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {mine.map((s) => (
            <div key={s.id} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.55 }}>{s.content}</div>
              <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 4 }}>{relativeTime(s.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑 */}
      {editing ? (
        <div style={{ marginTop: 6 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>关系类型</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                className="pressable fs-micro"
                onClick={() => setKind(k)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: kind === k ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: kind === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 4 }}>深度 {bond}</div>
          <input type="range" min={0} max={100} value={bond} onChange={(e) => setBond(Number(e.target.value))} />

          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 6 }}>状态 / 方向</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['stable', 'ambiguous', 'broken'] as RelationStatus[]).map((st) => (
              <button
                key={st}
                className="btn btn-sm pressable"
                onClick={() => setStatus(st)}
                style={{
                  flex: 1,
                  background: status === st ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                  color: status === st ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            {(['both', 'one-way'] as const).map((d) => (
              <button
                key={d}
                className="btn btn-sm pressable"
                onClick={() => setDirection(d)}
                style={{
                  flex: 1,
                  background: direction === d ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                  color: direction === d ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {d === 'both' ? '双向' : '单向'}
              </button>
            ))}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 40))}
            placeholder="一句话关系描述"
            style={{ width: '100%', marginTop: 10 }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setEditing(false)}>取消</button>
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={save}>保存</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn pressable" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} onClick={() => setEditing(true)}>
            <Pencil size={14} /> 编辑关系
          </button>
          <button
            className="btn pressable"
            style={{ flexShrink: 0, color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onClick={() => {
              removeRelation(relation.id)
              push('已删除关系')
              onClose()
            }}
          >
            <Trash2 size={14} /> 删除
          </button>
        </div>
      )}
    </Modal>
  )
}