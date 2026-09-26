import { useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Modal } from '../common'
import Avatar from './Avatar'
import { useCharacters } from '../../store/characters'
import { useGroups, type GroupRole } from '../../store/groups'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'

export default function GroupCreatorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (groupId: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [includeSelf, setIncludeSelf] = useState(true)
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [ownerPick, setOwnerPick] = useState<string>('')
  const characters = useCharacters((s) => s.characters)
  const createGroup = useGroups((s) => s.createGroup)
  const push = useToast((s) => s.push)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setIncludeSelf(true)
      setAvatarId(null)
      setSelected({})
      setOwnerPick('')
    }
  }, [open])

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = { ...s }
      if (id in next) delete next[id]
      else next[id] = characters.find((c) => c.id === id)?.name ?? ''
      return next
    })
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
      setAvatarId(id)
    }
    input.click()
  }

  const create = () => {
    if (!name.trim()) {
      push('群名称必填', 'error')
      return
    }
    const ids = Object.keys(selected)
    if (ids.length === 0) {
      push('至少选择一名成员', 'error')
      return
    }
    if (!includeSelf && !ownerPick) {
      push('仅NPC群需指定群主', 'error')
      return
    }
    const members = ids.map((cid) => {
      const c = characters.find((x) => x.id === cid)!
      let role: GroupRole = 'member'
      if (!includeSelf && ownerPick === cid) role = 'owner'
      return {
        characterId: cid,
        groupNickname: selected[cid] || c.name,
        role,
        muted: false,
        title: '',
        willingness: 80,
      }
    })
    const gid = createGroup({
      name: name.trim(),
      avatarId,
      description: description.trim(),
      announcement: '',
      includeSelf,
      members,
      maxRepliesPerRound: 3,
    })
    push('群聊已创建')
    onCreated(gid)
  }

  return (
    <Modal open={open} onClose={onClose} title="创建群聊" width={360}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <button
          className="pressable"
          onClick={pickAvatar}
          style={{
            width: 56,
            height: 56,
            borderRadius: '28%',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {avatarId ? <GroupAvatarImg id={avatarId} /> : <Camera size={20} color="var(--text-tertiary)" />}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="群名称（必填）"
          maxLength={20}
          style={{ flex: 1 }}
          autoFocus
        />
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="群介绍（可选）"
        maxLength={60}
        style={{ width: '100%', marginBottom: 14 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <ModeBtn active={includeSelf} onClick={() => setIncludeSelf(true)} label="包含自己" />
        <ModeBtn active={!includeSelf} onClick={() => setIncludeSelf(false)} label="仅NPC" />
      </div>

      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', margin: '4px 0 8px' }}>
        选择成员（{Object.keys(selected).length} 人）
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        {characters.length === 0 && (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '12px 0' }}>
            还没有角色，先去通讯录创建
          </div>
        )}
        {characters.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 12,
              background: c.id in selected ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button className="pressable" onClick={() => toggle(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Avatar imageId={c.avatarId} name={c.name} size={32} />
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
            </button>
            {c.id in selected && (
              <input
                value={selected[c.id]}
                onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.value }))}
                placeholder="群昵称"
                maxLength={16}
                style={{ width: 110 }}
              />
            )}
            {c.id in selected && (
              <button className="pressable" onClick={() => toggle(c.id)} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!includeSelf && Object.keys(selected).length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', margin: '4px 0 8px' }}>
            指定群主
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(selected).map((cid) => (
              <ModeBtn
                key={cid}
                active={ownerPick === cid}
                onClick={() => setOwnerPick(cid)}
                label={selected[cid] || characters.find((c) => c.id === cid)?.name || ''}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>
          取消
        </button>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={create}>
          创建群聊
        </button>
      </div>
    </Modal>
  )
}

function GroupAvatarImg({ id }: { id: string }) {
  return <Avatar imageId={id} name="群" size={56} shape="rounded" />
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className="btn pressable"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}
