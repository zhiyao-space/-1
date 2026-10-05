import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Modal } from '../common'
import { useCharacters } from '../../store/characters'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { generateNpcList, type CharacterFormData } from '../../lib/characterGen'

export default function NpcGeneratorModal({
  open,
  mainCharacterId,
  onClose,
}: {
  open: boolean
  mainCharacterId: string | null
  onClose: () => void
}) {
  const characters = useCharacters((s) => s.characters)
  const addCharacter = useCharacters((s) => s.addCharacter)
  const updateCharacter = useCharacters((s) => s.updateCharacter)
  const push = useToast((s) => s.push)
  const [mainId, setMainId] = useState('')
  const [count, setCount] = useState(3)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<CharacterFormData[]>([])

  useEffect(() => {
    if (!open) return
    setMainId(mainCharacterId ?? '')
    setCount(3)
    setResults([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mainCharacterId])

  const main = characters.find((c) => c.id === mainId) ?? null

  const run = async () => {
    if (!main) {
      push('请先选择主角色', 'error')
      return
    }
    const preset = main.apiPresetId ? getPresetById(main.apiPresetId) : getDefaultChatPreset()
    if (!preset) {
      push('请先在设置里配置聊天 API', 'error')
      return
    }
    setBusy(true)
    try {
      const list = await generateNpcList(main, count, preset)
      if (list.length === 0) throw new Error('未生成任何 NPC，请重试')
      setResults(list.slice(0, 5))
      push(`已生成 ${Math.min(list.length, 5)} 个 NPC 候选`)
    } catch (e) {
      push((e as Error).message || 'NPC 生成失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const createAll = () => {
    if (!main || results.length === 0) return
    const newIds: string[] = []
    for (const f of results) {
      const id = addCharacter({
        name: f.name,
        identity: f.identity,
        appearance: f.appearance,
        personality: f.personality,
        commStyle: f.commStyle,
        forbidden: f.forbidden,
        extraFields: f.extraFields.map((x) => ({ ...x })),
        avatarId: null,
        bannerId: null,
        apiPresetId: main.apiPresetId,
        tags: f.tags,
        source: 'npc',
        npcRelations: [],
      })
      newIds.push(id)
    }
    const allIds = [main.id, ...newIds]
    newIds.forEach((id) => updateCharacter(id, { npcRelations: allIds.filter((x) => x !== id) }))
    updateCharacter(main.id, { npcRelations: Array.from(new Set([...(main.npcRelations ?? []), ...newIds])) })
    push(`已加入 ${newIds.length} 个关联 NPC`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="生成关联 NPC" width={360}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>
            主角色
          </div>
          <select value={mainId} onChange={(e) => setMainId(e.target.value)} style={{ width: '100%' }}>
            <option value="">请选择主角色</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>
            NPC 数量
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                className="btn btn-sm pressable"
                onClick={() => setCount(n)}
                style={{
                  flex: 1,
                  background: count === n ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                  color: count === n ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderColor: count === n ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {n} 个
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-accent"
          onClick={run}
          disabled={busy || !main}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
          {busy ? '生成中…' : results.length > 0 ? '重新生成' : 'AI 生成关联 NPC'}
        </button>

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div
                key={`${r.name}-${i}`}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
                <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{r.identity || '未填写关系'}</div>
                <div className="fs-micro" style={{ color: 'var(--text-secondary)', marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {r.personality || '—'}
                </div>
                {r.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {r.tags.map((t) => (
                      <span key={t} className="fs-micro" style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'var(--text-tertiary)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>
            取消
          </button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={createAll} disabled={results.length === 0}>
            全部加入通讯录
          </button>
        </div>
      </div>
    </Modal>
  )
}