import { useState } from 'react'
import {
  Pencil,
  Plus,
  Trash2,
  ImagePlus,
  X,
  Check,
  UserRound,
  Cake,
  MapPin,
  VenetianMask as MaskIcon,
} from 'lucide-react'
import { useProfile, type UserProfile, type WorkItem, type Mask } from '../../store/profile'
import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { Modal, EmptyState } from '../common'

export default function ProfileApp() {
  const profile = useProfile((s) => s.profile)
  const activateMask = useProfile((s) => s.activateMask)
  const removeMask = useProfile((s) => s.removeMask)
  const phoneName = useSettings((s) => s.phoneName)
  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState<'works' | 'masks'>('works')
  const [workTarget, setWorkTarget] = useState<WorkItem | 'new' | null>(null)
  const [maskTarget, setMaskTarget] = useState<Mask | 'new' | null>(null)

  const displayName = profile.nickname.trim() || phoneName || '我'
  const activeMk = profile.masks.find((m) => m.active) ?? null

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
      {/* 背景图 */}
      <Banner />

      <div style={{ padding: '0 16px' }}>
        {/* 头像 + 名字（保持正常文档流，避免背景图折叠遮挡头像栏） */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 14 }}>
          <AvatarPick />
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="fs-h2" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{displayName}</span>
              <button className="pressable" onClick={() => setEditOpen(true)} style={{ color: 'var(--text-tertiary)' }}>
                <Pencil size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 标签 */}
        {profile.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {profile.tags.map((t) => (
              <span key={t} className="fs-micro" style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* 简介 */}
        <div className="fs-body" style={{ color: profile.bio ? 'var(--text-body)' : 'var(--text-disabled)', marginTop: 10, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {profile.bio || '点击右上角铅笔，编辑你的个人资料'}
        </div>

        {/* 性别 / 年龄 / IP属地 */}
        {(profile.gender || profile.age || profile.ipLocation) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {profile.gender && (
              <span className="fs-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                <UserRound size={11} /> {profile.gender}
              </span>
            )}
            {profile.age && (
              <span className="fs-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                <Cake size={11} /> {profile.age}岁
              </span>
            )}
            {profile.ipLocation && (
              <span className="fs-micro" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                <MapPin size={11} /> {profile.ipLocation}
              </span>
            )}
          </div>
        )}

        {/* 数据栏 */}
        <button
          className="glass pressable"
          onClick={() => setEditOpen(true)}
          style={{ width: '100%', marginTop: 14, borderRadius: 14, padding: '12px 8px', display: 'flex' }}
        >
          {(
            [
              ['关注', profile.following],
              ['粉丝', profile.followers],
              ['互关', profile.mutuals],
              ['作品', profile.works.length],
            ] as [string, number][]
          ).map(([label, v]) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div className="fs-h2 mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </button>

        {/* 面具状态提示 */}
        <div className="glass" style={{ marginTop: 12, borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MaskIcon size={15} color={activeMk ? 'var(--accent)' : 'var(--text-disabled)'} />
          <span className="fs-micro" style={{ flex: 1, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            {activeMk ? (
              <>当前面具：<span style={{ color: 'var(--accent)' }}>{activeMk.name}</span> · AI 聊天将以这个身份认识你</>
            ) : (
              '未佩戴面具 · AI 将按主页资料认识你'
            )}
          </span>
        </div>

        {/* Tabs */}
        <Tabs tab={tab} setTab={setTab} />
      </div>

      {tab === 'works' ? (
        <WorksList onEdit={(w) => setWorkTarget(w)} />
      ) : (
        <MaskList
          onEdit={(m) => setMaskTarget(m)}
          onUse={(id) => activateMask(id)}
          onRemove={(id) => removeMask(id)}
        />
      )}

      {editOpen && <EditProfileModal open onClose={() => setEditOpen(false)} />}
      {workTarget && <WorkModal target={workTarget} onClose={() => setWorkTarget(null)} />}
      {maskTarget && <MaskModal target={maskTarget} onClose={() => setMaskTarget(null)} />}
    </div>
  )
}

function Banner() {
  const backgroundId = useProfile((s) => s.profile.backgroundId)
  const updateProfile = useProfile((s) => s.updateProfile)
  const push = useToast((s) => s.push)
  const url = useBlobURL(backgroundId)

  const upload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const compressed = await compressImage(file, 1080)
      updateProfile({ backgroundId: await putBlob(compressed) })
      push('主页背景已更新')
    }
    input.click()
  }

  return (
    <button
      className="pressable"
      onClick={upload}
      style={{ position: 'relative', width: '100%', height: 150, display: 'block', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}
    >
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {!url && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)' }}>
          <ImagePlus size={22} />
        </span>
      )}
      {backgroundId && (
        <span
          className="pressable"
          onClick={(e) => {
            e.stopPropagation()
            updateProfile({ backgroundId: null })
            push('已清除主页背景', 'info')
          }}
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}
        >
          <X size={14} />
        </span>
      )}
    </button>
  )
}

function AvatarPick() {
  const avatarId = useProfile((s) => s.profile.avatarId)
  const updateProfile = useProfile((s) => s.updateProfile)
  const push = useToast((s) => s.push)
  const url = useBlobURL(avatarId)

  const upload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const compressed = await compressImage(file, 512)
      updateProfile({ avatarId: await putBlob(compressed) })
      push('头像已更新')
    }
    input.click()
  }

  return (
    <button
      className="pressable"
      onClick={upload}
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        border: '2px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}
    >
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={20} />}
    </button>
  )
}

function Tabs({ tab, setTab }: { tab: 'works' | 'masks'; setTab: (t: 'works' | 'masks') => void }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginTop: 18, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {(
        [
          ['works', '作品'],
          ['masks', '面具'],
        ] as ['works' | 'masks', string][]
      ).map(([k, label]) => (
        <button key={k} className="pressable" onClick={() => setTab(k)} style={{ padding: '8px 2px', position: 'relative' }}>
          <span className="fs-body" style={{ color: tab === k ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: tab === k ? 700 : 400 }}>{label}</span>
          {tab === k && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 1, background: 'var(--accent)' }} />}
        </button>
      ))}
    </div>
  )
}

function WorksList({ onEdit }: { onEdit: (w: WorkItem) => void }) {
  const works = useProfile((s) => s.profile.works)
  const addWork = useProfile((s) => s.addWork)
  const removeWork = useProfile((s) => s.removeWork)
  const push = useToast((s) => s.push)

  return (
    <div style={{ padding: '14px 16px' }}>
      {works.length === 0 ? (
        <EmptyState icon={<ImagePlus size={34} />} text="还没有作品" hint="添加你的第一个作品，图文简介都由你定义" />
      ) : (
        works.map((w) => <WorkCard key={w.id} work={w} onEdit={onEdit} onRemove={() => { removeWork(w.id); push('作品已删除', 'info') }} />)
      )}
      <button className="btn pressable" style={{ width: '100%', marginTop: 10 }} onClick={() => addWork({ title: '未命名作品', desc: '', imageId: null })}>
        <Plus size={15} /> 添加作品
      </button>
    </div>
  )
}

function WorkCard({ work, onEdit, onRemove }: { work: WorkItem; onEdit: (w: WorkItem) => void; onRemove: () => void }) {
  const url = useBlobURL(work.imageId)
  return (
    <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 600 }}>{work.title}</span>
          <button className="pressable" onClick={() => onEdit(work)} style={{ color: 'var(--text-tertiary)' }}><Pencil size={13} /></button>
          <button className="pressable" onClick={onRemove} style={{ color: 'var(--text-disabled)' }}><Trash2 size={13} /></button>
        </div>
        {work.desc && <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{work.desc}</div>}
      </div>
    </div>
  )
}

function MaskList({ onEdit, onUse, onRemove }: { onEdit: (m: Mask) => void; onUse: (id: string) => void; onRemove: (id: string) => void }) {
  const masks = useProfile((s) => s.profile.masks)
  const addMask = useProfile((s) => s.addMask)
  const push = useToast((s) => s.push)

  return (
    <div style={{ padding: '14px 16px' }}>
      {masks.length === 0 ? (
        <EmptyState icon={<MaskIcon size={34} />} text="还没有面具" hint="创建不同身份，随时切换跟 AI 聊天的人设" />
      ) : (
        masks.map((m) => <MaskCard key={m.id} mask={m} onEdit={onEdit} onUse={onUse} onRemove={onRemove} />)
      )}
      <button
        className="btn pressable"
        style={{ width: '100%', marginTop: 10 }}
        onClick={() => {
          addMask({ name: '新面具', avatarId: null, persona: '' })
          push('已创建面具，点击编辑完善它', 'info')
        }}
      >
        <Plus size={15} /> 新建面具
      </button>
    </div>
  )
}

function MaskCard({ mask, onEdit, onUse, onRemove }: { mask: Mask; onEdit: (m: Mask) => void; onUse: (id: string) => void; onRemove: (id: string) => void }) {
  const url = useBlobURL(mask.avatarId)
  return (
    <div className="glass" style={{ borderRadius: 14, padding: 12, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start', border: mask.active ? '1px solid var(--accent)' : undefined }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MaskIcon size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{mask.name}</span>
          {mask.active && (
            <span className="fs-micro" style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--accent)', color: '#000' }}>佩戴中</span>
          )}
        </div>
        {mask.persona && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {mask.persona}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {!mask.active && (
            <button className="btn btn-sm btn-accent pressable" onClick={() => onUse(mask.id)}>
              <Check size={12} /> 佩戴
            </button>
          )}
          <button className="btn btn-sm pressable" onClick={() => onEdit(mask)}>
            <Pencil size={12} /> 编辑
          </button>
          <button className="btn btn-sm pressable" onClick={() => onRemove(mask.id)} style={{ color: 'var(--text-disabled)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile((s) => s.profile)
  const updateProfile = useProfile((s) => s.updateProfile)
  const push = useToast((s) => s.push)
  const [draft, setDraft] = useState<UserProfile>(profile)

  const set = (patch: Partial<UserProfile>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Modal open={open} onClose={onClose} title="编辑资料">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={draft.nickname} onChange={(e) => set({ nickname: e.target.value })} placeholder="昵称" maxLength={20} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={draft.gender} onChange={(e) => set({ gender: e.target.value })} placeholder="性别（自由填写）" style={{ flex: 1 }} />
          <input value={draft.age} onChange={(e) => set({ age: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} placeholder="年龄" style={{ flex: 1 }} />
        </div>
        <input value={draft.ipLocation} onChange={(e) => set({ ipLocation: e.target.value })} placeholder="IP属地（自由填写）" maxLength={20} />
        <textarea value={draft.bio} onChange={(e) => set({ bio: e.target.value.slice(0, 200) })} placeholder="个性简介" rows={3} style={{ resize: 'none' }} />

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>标签</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {draft.tags.map((t) => (
              <button key={t} className="pressable" onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                {t} <X size={10} />
              </button>
            ))}
          </div>
          <input
            placeholder="输入标签后回车添加"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = e.currentTarget.value.trim()
                if (v && draft.tags.length < 10) set({ tags: [...draft.tags, v] })
                e.currentTarget.value = ''
              }
            }}
          />
        </div>

        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>数据（关注 / 粉丝 / 互关，可自由设定数值）</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={String(draft.following)} onChange={(e) => set({ following: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, '')) || 0) })} style={{ flex: 1 }} />
          <input value={String(draft.followers)} onChange={(e) => set({ followers: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, '')) || 0) })} style={{ flex: 1 }} />
          <input value={String(draft.mutuals)} onChange={(e) => set({ mutuals: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, '')) || 0) })} style={{ flex: 1 }} />
        </div>

        <button
          className="btn btn-accent"
          onClick={() => {
            updateProfile(draft)
            push('资料已保存')
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

function WorkModal({ target, onClose }: { target: WorkItem | 'new'; onClose: () => void }) {
  const updateWork = useProfile((s) => s.updateWork)
  const push = useToast((s) => s.push)
  const isNew = target === 'new'
  const work = isNew ? null : target
  const [title, setTitle] = useState(work?.title ?? '')
  const [desc, setDesc] = useState(work?.desc ?? '')
  const [imageId, setImageId] = useState<string | null>(work?.imageId ?? null)
  const url = useBlobURL(imageId)

  const upload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImageId(await putBlob(await compressImage(file, 1080)))
    }
    input.click()
  }

  return (
    <Modal open onClose={onClose} title={isNew ? '添加作品' : '编辑作品'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="pressable" onClick={upload} style={{ height: 120, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={20} />}
        </button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="作品标题" maxLength={30} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 300))} placeholder="作品简介（可留空）" rows={3} style={{ resize: 'none' }} />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (!title.trim()) {
              push('给作品起个名字', 'error')
              return
            }
            if (isNew) {
              useProfile.getState().addWork({ title: title.trim(), desc: desc.trim(), imageId })
            } else if (work) {
              updateWork(work.id, { title: title.trim(), desc: desc.trim(), imageId })
            }
            push('已保存')
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

function MaskModal({ target, onClose }: { target: Mask | 'new'; onClose: () => void }) {
  const updateMask = useProfile((s) => s.updateMask)
  const push = useToast((s) => s.push)
  const isNew = target === 'new'
  const mask = isNew ? null : target
  const [name, setName] = useState(mask?.name ?? '')
  const [persona, setPersona] = useState(mask?.persona ?? '')
  const [avatarId, setAvatarId] = useState<string | null>(mask?.avatarId ?? null)
  const url = useBlobURL(avatarId)

  const upload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setAvatarId(await putBlob(await compressImage(file, 512)))
    }
    input.click()
  }

  return (
    <Modal open onClose={onClose} title={isNew ? '新建面具' : '编辑面具'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          面具是一个可随时切换的身份。佩戴后，AI 聊天会以这个身份认识你、称呼你，并读取下面的身份设定。
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="pressable" onClick={upload} style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImagePlus size={18} />}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="身份名（如：夜行者）" maxLength={20} style={{ flex: 1 }} />
        </div>
        <textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value.slice(0, 600))}
          placeholder={'身份设定（AI 会读取）：这个身份是谁、什么性格、怎么说话、和角色是什么关系……自由发挥'}
          rows={6}
          style={{ resize: 'none' }}
        />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (!name.trim()) {
              push('给面具起个名字', 'error')
              return
            }
            if (isNew) {
              useProfile.getState().addMask({ name: name.trim(), persona: persona.trim(), avatarId })
            } else if (mask) {
              updateMask(mask.id, { name: name.trim(), persona: persona.trim(), avatarId })
            }
            push('面具已保存')
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}
