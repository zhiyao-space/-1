import { useMemo } from 'react'
import { useRelations, KIND_LABEL, type Relation, type RelationStory } from '../../store/relations'
import { relationNodes } from '../../lib/relationEngine'
import { relativeTime } from '../../store/moments'
import AuthorAvatar from './AuthorAvatar'

export default function RelationTimeline({ onSelectRelation }: { onSelectRelation: (r: Relation) => void }) {
  const stories = useRelations((s) => s.stories)
  const relations = useRelations((s) => s.relations)
  const nodes = useMemo(() => relationNodes(), [])

  const byId = useMemo(() => new Map(relations.map((r) => [r.id, r])), [relations])
  const byKey = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes])

  const mine = stories.filter((s) => s.relatedToUser)
  const theirs = stories.filter((s) => !s.relatedToUser)

  if (stories.length === 0) {
    return <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center', padding: '40px 12px', lineHeight: 1.8 }}>还没有关系故事。点上方刷新，让角色们之间发生点什么。</div>
  }

  const renderGroup = (title: string, list: RelationStory[]) => {
    if (list.length === 0) return null
    return (
      <div style={{ marginBottom: 18 }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: 1 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((s) => {
            const rel = byId.get(s.relationId)
            if (!rel) return null
            const a = byKey.get(rel.fromKey)
            const b = byKey.get(rel.toKey)
            return (
              <button
                key={s.id}
                className="pressable"
                onClick={() => onSelectRelation(rel)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex' }}>
                    <AuthorAvatar author={{ type: a?.type ?? 'character', id: a?.id ?? '?', name: a?.name ?? '未知' }} size={22} shape="circle" />
                    <div style={{ marginLeft: -7 }}>
                      <AuthorAvatar author={{ type: b?.type ?? 'character', id: b?.id ?? '?', name: b?.name ?? '未知' }} size={22} shape="circle" />
                    </div>
                  </div>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                    {a?.name ?? '未知'} · {b?.name ?? '未知'} · {KIND_LABEL[rel.kind]}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-disabled)', marginLeft: 'auto' }}>{relativeTime(s.createdAt)}</span>
                </div>
                <div className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.55 }}>{s.content}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderGroup('与我相关的', mine)}
      {renderGroup('角色之间的', theirs)}
    </div>
  )
}