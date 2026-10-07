import { useEffect, useState } from 'react'
import { Plus, Trash2, Camera, ChevronDown, Image as ImageIcon, Wand2, Upload, X } from 'lucide-react'
import { Modal, SectionCard, ImageCropModal } from '../common'
import { useCharacters, type Character, type CharacterSource } from '../../store/characters'
import { useApiPresets, getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { useBlobURL } from '../WallpaperLayer'
import {
  generateProfileFromText,
  generateProfileFromTextFile,
  parseImportedJson,
  deriveTags,
  type CharacterFormData,
} from '../../lib/characterGen'

interface Draft {
  name: string
  identity: string
  appearance: string
  personality: string
  commStyle: string
  forbidden: string
  extraFields: { id: string; label: string; value: string }[]
  avatarId: string | null
  bannerId: string | null
  apiPresetId: string | null
  tags: string[]
}

type CreateMode = 'ai' | 'import' | 'manual'

const emptyDraft: Draft = {
  name: '',
  identity: '',
  appearance: '',
  personality: '',
  commStyle: '',
  forbidden: '',
  extraFields: [],
  avatarId: null,
  bannerId: null,
  apiPresetId: null,
  tags: [],
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
    bannerId: c.bannerId ?? null,
    apiPresetId: c.apiPresetId,
    tags: c.tags ?? [],
  }
}

export default function CharacterEditor({
  open,
  character,
  onClose,
  onCreated,
}: {
  open: boolean
  character: Character | null
  onClose: () => void
  onCreated?: (id: string, suggestNpc: boolean) => void
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [bannerSrc, setBannerSrc] = useState<Blob | null>(null)
  const [mode, setMode] = useState<CreateMode>('ai')
  const [aiText, setAiText] = useState('')
  const [importText, setImportText] = useState('')
  const [busy, setBusy] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [source, setSource] = useState<CharacterSource>('manual')
  const addCharacter = useCharacters((s) => s.addCharacter)
  const updateCharacter = useCharacters((s) => s.updateCharacter)
  const push = useToast((s) => s.push)
  const avatarUrl = useBlobURL(draft.avatarId)
  const chatPresets = useApiPresets((s) => s.presets).filter((p) => p.category === 'chat')

  useEffect(() => {
    if (!open) return
    setDraft(character ? toDraft(character) : emptyDraft)
    setMode(character ? 'manual' : 'ai')
    setSource(character?.source ?? 'manual')
    setAiText('')
    setImportText('')
    setTagInput('')
  }, [open, character])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const resolvePreset = () => (draft.apiPresetId ? getPresetById(draft.apiPresetId) : getDefaultChatPreset())

  const applyForm = (form: CharacterFormData) => {
    setDraft((d) => ({
      ...d,
      name: form.name || d.name,
      identity: form.identity,
      appearance: form.appearance,
      personality: form.personality,
      commStyle: form.commStyle,
      forbidden: form.forbidden,
      extraFields: form.extraFields.map((f) => ({ ...f })),
      tags: form.tags,
    }))
  }

  const runAi = async () => {
    const text = aiText.trim()
    if (!text) return
    const preset = resolvePreset()
    if (!preset) {
      push('请先在设置里配置聊天 API', 'error')
      return
    }
    setBusy(true)
    try {
      const form = await generateProfileFromText(text, preset)
      applyForm(form)
      setSource('textCreation')
      setMode('manual')
      push('已生成角色，请检查后保存')
    } catch (e) {
      push((e as Error).message || 'AI 生成失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const runImportContent = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) {
      push('内容为空', 'error')
      return
    }
    // JSON 文件无需调用 API
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = parseImportedJson(trimmed)
      if (parsed) {
        applyForm(parsed)
        setSource('fileImport')
        setMode('manual')
        push('已解析角色文件，请检查后保存')
      } else {
        push('无法识别该 JSON 文件格式', 'error')
      }
      return
    }
    const preset = resolvePreset()
    if (!preset) {
      push('解析纯文本需要先配置聊天 API', 'error')
      return
    }
    setBusy(true)
    try {
      const form = await generateProfileFromTextFile(trimmed, preset)
      applyForm(form)
      setSource('fileImport')
      setMode('manual')
      push('已解析角色文件，请检查后保存')
    } catch (e) {
      push((e as Error).message || '文件解析失败', 'error')
    } finally {
      setBusy(false)
    }
  }

  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.json,.md,text/plain,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const content = await file.text()
      setImportText(content)
      await runImportContent(content)
    }
    input.click()
  }

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

  const pickBanner = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) setBannerSrc(file)
    }
    input.click()
  }

  const save = () => {
    if (!draft.name.trim()) {
      push('昵称必填', 'error')
      return
    }
    setSaving(true)
    const allText = [
      draft.name,
      draft.identity,
      draft.appearance,
      draft.personality,
      draft.commStyle,
      draft.forbidden,
      ...draft.extraFields.map((f) => f.value),
    ].join(' ')
    const tags = Array.from(new Set([...draft.tags, ...deriveTags(allText)])).slice(0, 8)
    const payload = { ...draft, name: draft.name.trim(), tags, source: character ? character.source ?? source : source }
    try {
      if (character) {
        updateCharacter(character.id, payload)
        push('角色已更新')
        onClose()
      } else {
        const id = addCharacter(payload)
        push('角色已创建')
        onClose()
        onCreated?.(id, source !== 'manual')
      }
    } finally {
      setSaving(false)
    }
  }

  const showModes = !character

  return (
    <Modal open={open} onClose={onClose} title={character ? '编辑角色' : '创建角色'} width={360}>
      {showModes && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <ModeTab active={mode === 'ai'} onClick={() => setMode('ai')} label="AI 描述生成" />
          <ModeTab active={mode === 'import'} onClick={() => setMode('import')} label="导入文件" />
          <ModeTab active={mode === 'manual'} onClick={() => setMode('manual')} label="手动填写" />
        </div>
      )}

      {showModes && mode === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="描述你想要的角色，比如：一个表面冷淡但内心温柔的年上医生……"
            rows={5}
            style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
          />
          <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            简短关键词也可以，AI 会帮你补齐外表、性格、背景、与你的关系和说话风格。
          </div>
          <button
            className="btn btn-accent"
            onClick={runAi}
            disabled={busy || !aiText.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Wand2 size={15} /> {busy ? 'AI 拆解中…' : 'AI 生成角色'}
          </button>
        </div>
      )}

      {showModes && mode === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn"
            onClick={pickFile}
            disabled={busy}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Upload size={15} /> 选择文件（.txt / .json）
          </button>
          <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            支持酒馆（SillyTavern）、Chub 角色卡与通用人设文档，也支持直接粘贴文本。
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="或在此粘贴角色卡文本 / JSON……"
            rows={4}
            style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
          />
          <button
            className="btn btn-accent"
            onClick={() => runImportContent(importText)}
            disabled={busy || !importText.trim()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Upload size={15} /> {busy ? '解析中…' : '解析并导入'}
          </button>
        </div>
      )}

      {(!showModes || mode === 'manual') && (
        <>
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
                角色头像（点击从相册导入）
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <button className="btn btn-sm pressable" onClick={pickBanner}>
                  <ImageIcon size={12} /> {draft.bannerId ? '更换背景' : '导入背景'}
                </button>
                {draft.bannerId && (
                  <button className="btn btn-sm pressable" onClick={() => set({ bannerId: null })} style={{ color: '#ff8a8a' }}>
                    移除
                  </button>
                )}
              </div>
              <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 6 }}>
                {source === 'manual' ? '全部字段由你填写，系统不提供任何预设' : 'AI 已拆解，逐条检查修改后保存'}
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

            <TagsEditor
              tags={draft.tags}
              input={tagInput}
              onInput={setTagInput}
              onAdd={() => {
                const t = tagInput.trim()
                if (!t || draft.tags.includes(t)) return
                set({ tags: [...draft.tags, t] })
                setTagInput('')
              }}
              onRemove={(t) => set({ tags: draft.tags.filter((x) => x !== t) })}
            />

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
            {showModes ? (
              <button className="btn" style={{ flex: 1 }} onClick={() => setMode('ai')}>
                返回
              </button>
            ) : (
              <button className="btn" style={{ flex: 1 }} onClick={onClose}>
                取消
              </button>
            )}
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={save} disabled={saving}>
              {saving ? '保存中…' : character ? '保存修改' : '创建角色'}
            </button>
          </div>
        </>
      )}

      <ImageCropModal
        open={!!bannerSrc}
        src={bannerSrc}
        title="剪切角色背景"
        onClose={() => setBannerSrc(null)}
        onConfirm={async (blob) => {
          set({ bannerId: await putBlob(blob) })
          setBannerSrc(null)
        }}
      />
    </Modal>
  )
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className="btn btn-sm pressable"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '7px 4px',
        background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function TagsEditor({
  tags,
  input,
  onInput,
  onAdd,
  onRemove,
}: {
  tags: string[]
  input: string
  onInput: (v: string) => void
  onAdd: () => void
  onRemove: (t: string) => void
}) {
  return (
    <div>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 5 }}>
        标签（用于分类展示和搜索，自动匹配性格 / 关系 / 设定 / 身份）
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: tags.length ? 8 : 0 }}>
        {tags.map((t) => (
          <span
            key={t}
            className="fs-micro"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'var(--text-secondary)',
            }}
          >
            {t}
            <button className="pressable" onClick={() => onRemove(t)} style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
          placeholder="添加标签"
          style={{ flex: 1 }}
        />
        <button className="btn btn-sm pressable" onClick={onAdd} style={{ flexShrink: 0 }}>
          添加
        </button>
      </div>
    </div>
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