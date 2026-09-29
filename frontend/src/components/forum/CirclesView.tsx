import { useMemo, useState } from 'react'
import { Users, Plus, Lock, Globe, ChevronRight, Settings2, UserMinus, Crown, ImagePlus } from 'lucide-react'
import { useForum, type ForumCircle } from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { Modal } from '../common'
import { PostCard, EmptyBlock, AuthorAvatar } from './shared'

export default function CirclesView({ onOpenCircle }: { onOpenCircle: (id: string) => void }) {
  const circles = useForum((s) => s.circles)
  const npcs = useForum((s) => s.npcs)
  const [createOpen, setCreateOpen] = useState(false)
  const mine = circles.filter((c) => c.userJoined)
  const discover = circles.filter((c) => !c.userJoined)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 90px' }}>
      <button className="btn btn-accent pressable" style={{ width: '100%', marginBottom: 14 }} onClick={() => setCreateOpen(true)}>
        <Plus size={16} /> 创建圈子
      </button>

      <SectionTitle label="我的圈子" count={mine.length} />
      {mine.length === 0 ? (
        <EmptyBlock text="还没有加入任何圈子。创建一个，或者去下面发现新的圈子" />
      ) : (
        mine.map((c) => <CircleRow key={c.id} circle={c} onOpen={() => onOpenCircle(c.id)} npcCount={npcs.filter((n) => c.memberNpcIds.includes(n.id)).length} />)
      )}

      {discover.length > 0 && (
        <>
          <SectionTitle label="发现圈子" count={discover.length} />
          {discover.map((c) => (
            <CircleRow key={c.id} circle={c} onOpen={() => onOpenCircle(c.id)} npcCount={npcs.filter((n) => c.memberNpcIds.includes(n.id)).length} />
          ))}
        </>
      )}

      <CreateCircleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onOpenCircle} />
    </div>
  )
}

function SectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 2px' }}>
      <span className="fs-body" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span className="fs-micro mono" style={{ color: 'var(--text-disabled)' }}>{count}</span>
    </div>
  )
}

function CircleRow({ circle, onOpen, npcCount }: { circle: ForumCircle; onOpen: () => void; npcCount: number }) {
  const characters = useCharacters((s) => s.characters)
  const memberCount = circle.memberCharacterIds.filter((id) => characters.some((c) => c.id === id)).length + npcCount + (circle.userJoined ? 1 : 0)
  const posts = useForum((s) => s.posts.filter((p) => p.circleId === circle.id).length)
  const cover = useBlobURL(circle.coverId)
  return (
    <button className="glass pressable" onClick={onOpen} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, marginBottom: 10, textAlign: 'left' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cover ? (
          <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Users size={20} color="var(--text-tertiary)" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="fs-h2" style={{ color: 'var(--text-primary)' }}>{circle.name}</span>
          {circle.isPrivate ? <Lock size={12} color="var(--text-tertiary)" /> : <Globe size={12} color="var(--text-tertiary)" />}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {circle.description || '暂无简介'}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 2 }}>
          {memberCount} 名成员 · {posts} 帖 · 今日 {posts} 活跃
        </div>
      </div>
      <ChevronRight size={16} color="var(--text-disabled)" />
    </button>
  )
}

function CreateCircleModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const createCircle = useForum((s) => s.createCircle)
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const push = useToast((s) => s.push)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [rules, setRules] = useState('')
  const [isPrivate, setPrivate] = useState(false)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<string[]>([])

  const pickCover = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const compressed = await compressImage(f, 640)
      setCoverId(await putBlob(compressed))
    }
    input.click()
  }

  const submit = () => {
    if (!name.trim()) {
      push('给圈子起个名字', 'error')
      return
    }
    const id = createCircle({
      name: name.trim(),
      description: desc.trim(),
      coverId,
      isPrivate,
      rules: rules.trim(),
      ownerId: 'user',
      memberCharacterIds: memberIds.filter((id) => characters.some((c) => c.id === id)),
      memberNpcIds: memberIds.filter((id) => npcs.some((n) => n.id === id)),
      userJoined: true,
    })
    push('圈子已创建')
    setName('')
    setDesc('')
    setRules('')
    setCoverId(null)
    setMemberIds([])
    onClose()
    onCreated(id)
  }

  const toggleMember = (id: string) =>
    setMemberIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Modal open={open} onClose={onClose} title="创建圈子">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="pressable" onClick={pickCover} style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {coverId ? <CoverThumb id={coverId} /> : <ImagePlus size={18} color="var(--text-tertiary)" />}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="圈子名（必填）" maxLength={16} />
        </div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="圈子简介" rows={2} style={{ resize: 'none' }} />
        <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="圈规（可选，角色发帖与回复都会遵守）" rows={2} style={{ resize: 'none' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm pressable" style={{ flex: 1, background: !isPrivate ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }} onClick={() => setPrivate(false)}>
            <Globe size={13} /> 公开
          </button>
          <button className="btn btn-sm pressable" style={{ flex: 1, background: isPrivate ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }} onClick={() => setPrivate(true)}>
            <Lock size={13} /> 私密
          </button>
        </div>
        {characters.length + npcs.length > 0 && (
          <div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>邀请成员（角色 / NPC）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {characters.map((c) => (
                <Chip key={c.id} label={c.name} active={memberIds.includes(c.id)} onClick={() => toggleMember(c.id)} />
              ))}
              {npcs.map((n) => (
                <Chip key={n.id} label={`${n.name}·NPC`} active={memberIds.includes(n.id)} onClick={() => toggleMember(n.id)} />
              ))}
            </div>
            {npcs.length === 0 && (
              <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 4 }}>
                还没有 NPC。去「我的」页面创建路人 NPC，论坛会更热闹
              </div>
            )}
          </div>
        )}
        <button className="btn btn-accent" onClick={submit}>创建</button>
      </div>
    </Modal>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{
        fontSize: 'calc(12px * var(--fs-scale))',
        padding: '4px 12px',
        borderRadius: 999,
        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </button>
  )
}

function CoverThumb({ id }: { id: string }) {
  const url = useBlobURL(id)
  return url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null
}

// ---------- 圈子详情 ----------

type CircleTab = 'all' | 'hot' | 'latest' | 'essence'

export function CircleDetail({ circle, onOpenPost, onBack }: { circle: ForumCircle; onOpenPost: (id: string) => void; onBack: () => void }) {
  const posts = useForum((s) => s.posts)
  const comments = useForum((s) => s.comments)
  const npcs = useForum((s) => s.npcs)
  const characters = useCharacters((s) => s.characters)
  const toggleJoin = useForum((s) => s.toggleJoinCircle)
  const [tab, setTab] = useState<CircleTab>('all')
  const [membersOpen, setMembersOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const isOwner = circle.ownerId === 'user'

  const list = useMemo(() => {
    let base = posts.filter((p) => p.circleId === circle.id)
    if (tab === 'hot') base = [...base].sort((a, b) => b.upvotes - a.upvotes)
    else if (tab === 'latest') base = [...base].sort((a, b) => b.createdAt - a.createdAt)
    else if (tab === 'essence') base = base.filter((p) => p.essence)
    else base = [...base].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt)
    return base
  }, [posts, circle.id, tab])

  const memberCount = circle.memberCharacterIds.filter((id) => characters.some((c) => c.id === id)).length + circle.memberNpcIds.length + (circle.userJoined ? 1 : 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CircleHeader circle={circle} onBack={onBack} onMembers={() => setMembersOpen(true)} onManage={() => setManageOpen(true)} isOwner={isOwner} memberCount={memberCount} />
      <div style={{ display: 'flex', gap: 4, padding: '8px 14px', flexShrink: 0 }}>
        {(
          [
            ['all', '全部'],
            ['hot', '热门'],
            ['latest', '最新'],
            ['essence', '精华'],
          ] as [CircleTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            className="pressable"
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              height: 30,
              borderRadius: 999,
              fontSize: 'calc(12px * var(--fs-scale))',
              background: tab === k ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: tab === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 90px' }}>
        {list.length === 0 ? (
          <EmptyBlock text={tab === 'essence' ? '圈主还没有加精任何帖子' : '圈子里还没有帖子，发第一帖或刷新试试'} />
        ) : (
          list.map((p) => <PostCard key={p.id} post={p} onOpen={() => onOpenPost(p.id)} />)
        )}
      </div>
      {!circle.userJoined && (
        <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
          <button className="btn btn-accent pressable" style={{ width: '100%' }} onClick={() => toggleJoin(circle.id)}>
            加入圈子
          </button>
        </div>
      )}

      {membersOpen && <MembersSheet circle={circle} onClose={() => setMembersOpen(false)} isOwner={isOwner} />}
      {manageOpen && <ManageSheet circle={circle} onClose={() => setManageOpen(false)} />}
    </div>
  )
}

function CircleHeader({
  circle,
  onBack,
  onMembers,
  onManage,
  isOwner,
  memberCount,
}: {
  circle: ForumCircle
  onBack: () => void
  onMembers: () => void
  onManage: () => void
  isOwner: boolean
  memberCount: number
}) {
  const cover = useBlobURL(circle.coverId)
  const toggleJoin = useForum((s) => s.toggleJoinCircle)
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: 96, position: 'relative', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <button className="pressable" onClick={onBack} style={{ position: 'absolute', top: 8, left: 8, color: '#fff', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: 6 }}>
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="fs-h1" style={{ color: 'var(--text-primary)', flex: 1 }}>{circle.name}</span>
          {circle.userJoined && (
            <button className="btn btn-sm pressable" onClick={onMembers}>
              <Users size={13} /> {memberCount}
            </button>
          )}
          {isOwner && (
            <button className="btn btn-sm pressable" onClick={onManage}>
              <Settings2 size={13} /> 管理
            </button>
          )}
          {circle.userJoined && circle.ownerId !== 'user' && (
            <button className="btn btn-sm pressable" onClick={() => toggleJoin(circle.id)}>
              退出
            </button>
          )}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.6 }}>
          {circle.description || '暂无简介'}
          {circle.rules ? ` · 圈规：${circle.rules}` : ''}
        </div>
      </div>
    </div>
  )
}

function MembersSheet({ circle, onClose, isOwner }: { circle: ForumCircle; onClose: () => void; isOwner: boolean }) {
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const updateCircle = useForum((s) => s.updateCircle)
  const push = useToast((s) => s.push)

  const kick = (kind: 'character' | 'npc', id: string) => {
    if (kind === 'character') {
      updateCircle(circle.id, { memberCharacterIds: circle.memberCharacterIds.filter((x) => x !== id) })
    } else {
      updateCircle(circle.id, { memberNpcIds: circle.memberNpcIds.filter((x) => x !== id) })
    }
    push('已移出圈子')
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 350, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="page-enter glass" style={{ width: '100%', maxHeight: '70%', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: '14px 16px 24px' }}>
        <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)', marginBottom: 10 }}>圈子成员</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={16} color="var(--accent)" />
          </div>
          <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)' }}>我（圈主）</span>
        </div>
        {characters
          .filter((c) => circle.memberCharacterIds.includes(c.id))
          .map((c) => (
            <MemberRow key={c.id} avatar={<AuthorAvatar author={{ type: 'character', id: c.id, name: c.name, avatarId: c.avatarId }} size={36} />} name={c.name} sub={c.identity || '角色'} onKick={isOwner ? () => kick('character', c.id) : undefined} />
          ))}
        {npcs
          .filter((n) => circle.memberNpcIds.includes(n.id))
          .map((n) => (
            <MemberRow key={n.id} avatar={<AuthorAvatar author={{ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }} size={36} />} name={n.name} sub={`NPC · ${n.persona.slice(0, 20) || '路人'}`} onKick={isOwner ? () => kick('npc', n.id) : undefined} />
          ))}
      </div>
    </div>
  )
}

function MemberRow({ avatar, name, sub, onKick }: { avatar: React.ReactNode; name: string; sub: string; onKick?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{name}</div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      {onKick && (
        <button className="pressable" onClick={onKick} style={{ color: '#ff8a8a', padding: 6 }} title="移出圈子">
          <UserMinus size={15} />
        </button>
      )}
    </div>
  )
}

function ManageSheet({ circle, onClose }: { circle: ForumCircle; onClose: () => void }) {
  const updateCircle = useForum((s) => s.updateCircle)
  const posts = useForum((s) => s.posts.filter((p) => p.circleId === circle.id))
  const updatePost = useForum((s) => s.updatePost)
  const push = useToast((s) => s.push)
  const [rules, setRules] = useState(circle.rules)
  const [desc, setDesc] = useState(circle.description)

  return (
    <Modal open onClose={onClose} title="圈子管理">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="圈子简介" />
        <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="圈规" rows={2} style={{ resize: 'none' }} />
        <button
          className="btn btn-accent"
          onClick={() => {
            updateCircle(circle.id, { rules: rules.trim(), description: desc.trim() })
            push('圈子信息已更新')
            onClose()
          }}
        >
          保存圈规
        </button>
        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>帖子管理（置顶 / 加精 / 封帖）</div>
          {posts.length === 0 ? (
            <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px 0' }}>圈内暂无帖子</div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {posts.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="fs-aux" style={{ flex: 1, minWidth: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title || p.content.slice(0, 20)}
                  </span>
                  <MiniToggle label="顶" active={p.pinned} onClick={() => updatePost(p.id, { pinned: !p.pinned })} />
                  <MiniToggle label="精" active={p.essence} onClick={() => updatePost(p.id, { essence: !p.essence })} />
                  <MiniToggle label="封" active={p.locked} onClick={() => updatePost(p.id, { locked: !p.locked })} />
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-accent" onClick={onClose}>
          完成
        </button>
      </div>
    </Modal>
  )
}

function MiniToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{
        width: 26,
        height: 22,
        borderRadius: 6,
        fontSize: 'calc(11px * var(--fs-scale))',
        background: active ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
        color: active ? '#000' : 'var(--text-tertiary)',
      }}
    >
      {label}
    </button>
  )
}
