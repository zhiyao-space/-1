import { useRef, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useProfile } from '../../store/profile'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { DyAvatar, DySheet } from './parts'
import type { DyAuthor } from '../../lib/douyinEngine'

function asAuthor(key: string, name: string, avatarId: string | null): DyAuthor {
  return { key, kind: 'user', id: key, name, avatarId, persona: '' }
}

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile)
  const activateMask = useProfile((s) => s.activateMask)
  const addMask = useProfile((s) => s.addMask)
  const removeMask = useProfile((s) => s.removeMask)
  const toast = useToast((s) => s.push)

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [persona, setPersona] = useState('')
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const activeId = profile.masks.find((m) => m.active)?.id ?? null
  const mainName = profile.nickname.trim() || '主账号'

  const switchTo = (id: string | null, label: string) => {
    activateMask(id)
    toast(id ? `已切换为「${label}」` : '已切回主账号')
    onClose()
  }

  const create = () => {
    if (!name.trim()) {
      toast('给这个账号起个名字吧')
      return
    }
    addMask({ name: name.trim(), avatarId, persona: persona.trim() })
    toast(`账号「${name.trim()}」已创建`)
    setCreating(false)
    setName('')
    setPersona('')
    setAvatarId(null)
  }

  const uploadAvatar = async (file: File) => {
    try {
      const blob = await compressImage(file, 512)
      setAvatarId(await putBlob(blob))
      toast('头像已选择')
    } catch {
      toast('头像处理失败')
    }
  }

  const Row = ({
    id,
    label,
    avatarId: av,
    sub,
    onDelete,
  }: {
    id: string | null
    label: string
    avatarId: string | null
    sub: string
    onDelete?: () => void
  }) => {
    const on = activeId === id
    return (
      <div className="dy-acct">
        <button className="dy-acct-main pressable" onClick={() => switchTo(id, label)}>
          <DyAvatar author={asAuthor(id ?? 'user', label, av)} size={44} />
          <span className="dy-acct-info">
            <span className="dy-acct-name">{label}</span>
            <span className="dy-acct-sub">{sub}</span>
          </span>
          {on ? (
            <span className="dy-acct-on">
              <Check size={14} /> 当前
            </span>
          ) : (
            <span className="dy-acct-switch">切换</span>
          )}
        </button>
        {onDelete && (
          <button
            className="dy-acct-del pressable"
            onClick={() => {
              onDelete()
              toast(`已删除账号「${label}」`)
            }}
            title="删除账号"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    )
  }

  return (
    <DySheet title="切换账号" onClose={onClose}>
      <Row id={null} label={mainName} avatarId={profile.avatarId} sub="主账号 · 手机号绑定" />
      {profile.masks.map((m) => (
        <Row
          key={m.id}
          id={m.id}
          label={m.name.trim() || '未命名小号'}
          avatarId={m.avatarId}
          sub={m.persona.trim() ? m.persona.trim().slice(0, 18) : '小号'}
          onDelete={() => removeMask(m.id)}
        />
      ))}

      {!creating ? (
        <button className="dy-sheet-row pressable" style={{ marginTop: 8 }} onClick={() => setCreating(true)}>
          <Plus size={15} /> 新建账号
        </button>
      ) : (
        <div className="dy-acct-form">
          <div className="dy-card-title">新账号</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <DyAvatar author={asAuthor('new', name || '新', avatarId)} size={44} />
            <button className="dy-btn dy-btn--ghost pressable" style={{ flex: 0, padding: '0 14px' }} onClick={() => fileRef.current?.click()}>
              选择头像
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadAvatar(f)
                e.target.value = ''
              }}
            />
          </div>
          <input className="dy-input" style={{ width: '100%', marginBottom: 8 }} placeholder="账号昵称" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            className="dy-textarea"
            maxLength={60}
            placeholder="这个账号的人设 / 简介（可选）"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="dy-btn dy-btn--primary pressable" onClick={create}>
              创建
            </button>
            <button className="dy-btn dy-btn--ghost pressable" onClick={() => setCreating(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', padding: '10px 4px 0', lineHeight: 1.6 }}>
        切换账号后，「我」页、作品、私信都会以该账号的身份呈现，互不影响。
      </div>
    </DySheet>
  )
}