import { useEffect, useState } from 'react'
import { Plus, Trash2, Camera, ChevronDown } from 'lucide-react'
import { Modal, SectionCard } from '../common'
import { useCharacters, type Character } from '../../store/characters'
import { useApiPresets } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { useBlobURL } from '../WallpaperLayer'

interface Draft {
  name: string
  identity: string
  appearance: string
  personality: string
  commStyle: string
  forbidden: string
  extraFields: { id: string; label: string; value: string }[]
  avatarId: string | null
  apiPresetId: string | null
}

const emptyDraft: Draft = {
  name: '',
  identity: '',
  appearance: '',
  personality: '',
  commStyle: '',
  forbidden: '',
  extraFields: [],
  avatarId: null,
  apiPresetId: null,
}

function toDraft(c: Character): Draft {
  return {
    name: c.name,
    identity: c.identity,
    appearance: c.appearance,
    personality: c.personality,
    commStyle: c.commStyle,
    forbidden: c.forbidden,
    extraFields: c.extraFields.map((f) => ({ ...f })),
    avatarId: c.avatarId,
    apiPresetId: c.apiPresetId,
  }
}

export default function CharacterEditor({
  open,
  character,
  onClose,
}: {
  open: boolean
  character: Character | null
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const addCharacter = useCharacters((s) => s.addCharacter)
  const updateCharacter = useCharacters((s) => s.updateCharacter)
  const push = useToast((s) => s.push)
  const avatarUrl = useBlobURL(draft.avatarId)
  const chatPresets = useApiPresets((s) => s.presets).filter((p) => p.category === 'chat')

  useEffect(() => {
    if (open) setDraft(character ? toDraft(character) : emptyDraft)
  }, [open, character])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const pickAvatar = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const compressed = await compressImage(file, 512)
      const id = await putBlob(compressed)
      set({ avatarId: id })
    }
    input.click()
  }

  const save = () => {
    if (!draft.name.trim()) {
      push('昵称必填', 'error')
      return
    }
    setSaving(true)
    const payload = { ...draft, name: draft.name.trim() }
    try {
      if (character) {
        updateCharacter(character.id, payload)
        push('角色已更新')
      } else {
        addCharacter(payload)
        push('角色已创建')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={character ? '编辑角色' : '创建角色'} width={360}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button
          className="pressable"
          onClick={pickAvatar}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            position: 'relative',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Camera size={22} color="var(--text-tertiary)" />
          )}
        </button>
        <div style={{ flex: 1 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>
            角色头像（可选）
          </div>
          <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            全部字段由你填写，系统不提供任何预设
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="昵称（必填）" value={draft.name} onChange={(v) => set({ name: v })} placeholder="角色的名字" maxLength={20} />
        <Field label="身份" value={draft.identity} onChange={(v) => set({ identity: v })} placeholder="职业 / 与你的关系 / 社会角色" />
        <Area label="外观" value={draft.appearance} onChange={(v) => set({ appearance: v })} placeholder="长相、穿着、气质……" />
        <Area label="性格核心" value={draft.personality} onChange={(v) => set({ personality: v })} placeholder="性格特质、说话态度、行为逻辑……" />
        <Area label="沟通风格" value={draft.commStyle} onChange={(v) => set({ commStyle: v })} placeholder="打字习惯、语气、常用词……" />
        <Area label="禁止事项" value={draft.forbidden} onChange={(v) => set({ forbidden: v })} placeholder="角色绝对不做 / 不说的事，每行一条" />

        {draft.extraFields.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={f.label}
              onChange={(e) => {
                const next = [...draft.extraFields]
                next[i] = { ...f, label: e.target.value }
                set({ extraFields: next })
              }}
              placeholder="字段名"
              style={{ width: 96, flexShrink: 0 }}
            />
            <input
              value={f.value}
              onChange={(e) => {
                const next = [...draft.extraFields]
                next[i] = { ...f, value: e.target.value }
                set({ extraFields: next })
              }}
              placeholder="内容"
              style={{ flex: 1 }}
            />
            <button
              className="pressable"
              onClick={() => set({ extraFields: draft.extraFields.filter((x) => x.id !== f.id) })}
              style={{ color: 'var(--text-tertiary)', padding: 6 }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          className="btn"
          onClick={() =>
            set({
              extraFields: [...draft.extraFields, { id: `f${Date.now().toString(36)}`, label: '', value: '' }],
            })
          }
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={15} /> 添加自定义字段
        </button>

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            绑定聊天 API 预设 <ChevronDown size={12} />
          </div>
          <select
            value={draft.apiPresetId ?? ''}
            onChange={(e) => set({ apiPresetId: e.target.value || null })}
            style={{ width: '100%' }}
          >
            <option value="">使用默认聊天 API</option>
            {chatPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}（{p.model || '未选模型'}）
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>
          取消
        </button>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={save} disabled={saving}>
          {saving ? '保存中…' : character ? '保存修改' : '创建角色'}
        </button>
      </div>
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  maxLength?: number
}) {
  return (
    <label style={{ display: 'block' }}>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 5 }}>
        {label}
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={{ width: '100%' }} />
    </label>
  )
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 5 }}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
      />
    </label>
  )
}

export { SectionCard }
