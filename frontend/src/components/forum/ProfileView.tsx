import { useMemo, useState } from 'react'
import { Pencil, UserPlus, Bot, Trash2, Check, UserCheck, UserX } from 'lucide-react'
import { useForum, type ForumNPC } from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { SectionCard, Modal } from '../common'
import { PostCard, AuthorAvatar, EmptyBlock, fmtCount } from './shared'

type MyTab = 'posts' | 'replies' | 'favorites'

export default function ProfileView({ onOpenPost }: { onOpenPost: (id: string) => void }) {
  const forum = useForum()
  const characters = useCharacters((s) => s.characters)
  const phoneName = useSettings((s) => s.phoneName)
  const setPhoneName = useSettings((s) => s.setPhoneName)
  const push = useToast((s) => s.push)
  const [tab, setTab] = useState<MyTab>('posts')
  const [editOpen, setEditOpen] = useState(false)
  const [npcOpen, setNpcOpen] = useState<ForumNPC | 'new' | null>(null)
  const [aliasInput, setAliasInput] = useState('')

  const myPosts = useMemo(() => forum.posts.filter((p) => p.author.type === 'user').sort((a, b) => b.createdAt - a.createdAt), [forum.posts])
  const myComments = useMemo(() => forum.comments.filter((c) => c.author.type === 'user').sort((a, b) => b.createdAt - a.createdAt), [forum.comments])
  const favPosts = useMemo(() => forum.posts.filter((p) => p.myFavorite).sort((a, b) => b.createdAt - a.createdAt), [forum.posts])
  const likedReceived = myPosts.reduce((n, p) => n + p.upvotes, 0)
  const bannerUrl = useBlobURL(forum.profile.bannerId)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 90px' }}>
      <div style={{ height: 110, position: 'relative', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        {bannerUrl && <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <button
          className="pressable"
          onClick={async () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = async () => {
              const f = input.files?.[0]
              if (!f) return
              const compressed = await compressImage(f, 960)
              forum.updateProfile({ bannerId: await putBlob(compressed) })
              push('主页横幅已更新')
            }
            input.click()
          }}
          style={{ position: 'absolute', top: 10, right: 10, color: '#fff', background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '6px 12px' }}
        >
          <span className="fs-micro">更换横幅</span>
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -24 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="fs-h1" style={{ color: 'var(--text-primary)' }}>{(phoneName || '我').slice(0, 1)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div className="fs-h2" style={{ color: 'var(--text-primary)' }}>{phoneName || '我'}</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>@{forum.profile.username || 'user'}</div>
          </div>
          <button className="btn btn-sm pressable" style={{ marginBottom: 4 }} onClick={() => setEditOpen(true)}>
            <Pencil size={12} /> 编辑
          </button>
        </div>
        <div className="fs-aux" style={{ color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
          {forum.profile.signature || '这个人很懒，什么都没有留下'}
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          <StatNum label="关注" value={forum.following.length} />
          <StatNum label="粉丝" value={forum.followers.length} />
          <StatNum label="获赞" value={likedReceived} />
          <StatNum label="发帖 Karma" value={forum.karma.post} accent />
          <StatNum label="评论 Karma" value={forum.karma.comment} accent />
        </div>

        <SectionCard title="马甲 / 小号">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {forum.aliases.map((a) => (
              <span
                key={a.id}
                className="pressable"
                onClick={() => forum.setActiveAlias(forum.activeAliasId === a.id ? null : a.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 'calc(12px * var(--fs-scale))',
                  background: forum.activeAliasId === a.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  color: forum.activeAliasId === a.id ? '#000' : 'var(--text-body)',
                }}
              >
                {a.name}
                {forum.activeAliasId === a.id && <Check size={11} />}
                <button className="pressable" onClick={(e) => { e.stopPropagation(); forum.removeAlias(a.id) }} style={{ color: forum.activeAliasId === a.id ? 'rgba(0,0,0,0.6)' : '#ff8a8a' }}>
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
            {forum.aliases.length === 0 && <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>还没有马甲。创建后可切换身份匿名发帖，角色可能认不出你</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} placeholder="马甲名" maxLength={12} onKeyDown={(e) => { if (e.key === 'Enter' && aliasInput.trim()) { forum.addAlias(aliasInput); setAliasInput('') } }} />
            <button className="btn btn-sm pressable" onClick={() => { if (aliasInput.trim()) { forum.addAlias(aliasInput); setAliasInput(''); push('马甲已创建') } }}>
              <UserPlus size={13} /> 添加
            </button>
          </div>
        </SectionCard>

        <SectionCard title="NPC 管理">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {forum.npcs.map((n) => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AuthorAvatar author={{ type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{n.name}</div>
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.persona || '路人'} · 熟悉度 {n.familiarity}</div>
                </div>
                <button className="pressable" onClick={() => setNpcOpen(n)} style={{ color: 'var(--text-tertiary)', padding: 5 }}>
                  <Pencil size={14} />
                </button>
                <button className="pressable" onClick={() => forum.toggleBlockNpc(n.id)} style={{ color: forum.blockedNpcIds.includes(n.id) ? '#ff8a8a' : 'var(--text-disabled)', padding: 5 }} title={forum.blockedNpcIds.includes(n.id) ? '解除拉黑' : '拉黑'}>
                  {forum.blockedNpcIds.includes(n.id) ? <UserX size={14} /> : <UserCheck size={14} />}
                </button>
                <button className="pressable" onClick={() => forum.removeNpc(n.id)} style={{ color: '#ff8a8a', padding: 5 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {forum.npcs.length === 0 && <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>创建路人 NPC，他们会按人设随机发帖、评论、和你互怼</span>}
          </div>
          <button className="btn btn-sm btn-accent pressable" onClick={() => setNpcOpen('new')}>
            <Bot size={13} /> 创建 NPC
          </button>
        </SectionCard>

        <SectionCard title="关注列表">
          {forum.following.length === 0 ? (
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>还没有关注任何人。在帖子或主页点关注，TA 的新帖会出现在「关注」Tab</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {forum.following.map((key) => {
                const [type, id] = key.split(':') as ['character' | 'npc' | 'user', string]
                if (type === 'user') return null
                const name = type === 'character' ? characters.find((c) => c.id === id)?.name : forum.npcs.find((n) => n.id === id)?.name
                if (!name) return null
                return (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                    <AuthorAvatar author={{ type, id, name, avatarId: null }} size={22} />
                    <span className="fs-micro" style={{ color: 'var(--text-body)' }}>{name}</span>
                    <button className="pressable" onClick={() => forum.toggleFollow(key)} style={{ color: 'var(--text-tertiary)' }}>
                      <UserX size={11} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </SectionCard>

        <div style={{ display: 'flex', gap: 4, margin: '14px 0 8px' }}>
          {(
            [
              ['posts', '帖子'],
              ['replies', '回复'],
              ['favorites', '收藏'],
            ] as [MyTab, string][]
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

        {tab === 'posts' &&
          (myPosts.length === 0 ? (
            <EmptyBlock text="你还没有发过帖子" />
          ) : (
            myPosts.map((p) => <PostCard key={p.id} post={p} onOpen={() => onOpenPost(p.id)} />)
          ))}
        {tab === 'replies' &&
          (myComments.length === 0 ? (
            <EmptyBlock text="你还没有发表过评论" />
          ) : (
            <SectionCard>
              {myComments.map((c) => (
                <button key={c.id} className="pressable" onClick={() => onOpenPost(c.postId)} style={{ width: '100%', textAlign: 'left', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{fmtCount(c.upvotes)} 赞</div>
                  <div className="fs-aux" style={{ color: 'var(--text-body)', marginTop: 2 }}>{c.content}</div>
                </button>
              ))}
            </SectionCard>
          ))}
        {tab === 'favorites' &&
          (favPosts.length === 0 ? (
            <EmptyBlock text="收藏夹还是空的。点帖子的星标即可收藏" />
          ) : (
            favPosts.map((p) => <PostCard key={p.id} post={p} onOpen={() => onOpenPost(p.id)} />)
          ))}
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      {npcOpen && <NpcEditor npc={npcOpen === 'new' ? null : npcOpen} onClose={() => setNpcOpen(null)} />}
    </div>
  )
}

function StatNum({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="fs-h2 mono" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>{fmtCount(value)}</div>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  )
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useForum((s) => s.profile)
  const updateProfile = useForum((s) => s.updateProfile)
  const phoneName = useSettings((s) => s.phoneName)
  const setPhoneName = useSettings((s) => s.setPhoneName)
  const push = useToast((s) => s.push)
  const [username, setUsername] = useState(profile.username)
  const [signature, setSignature] = useState(profile.signature)
  const [name, setName] = useState(phoneName)

  return (
    <Modal open={open} onClose={onClose} title="编辑主页">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="昵称" maxLength={16} />
        <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="@用户名" maxLength={20} />
        <textarea value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="个性签名" rows={2} style={{ resize: 'none' }} />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (name.trim()) setPhoneName(name.trim())
            updateProfile({ username: username.trim(), signature: signature.trim() })
            push('主页已更新')
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

function NpcEditor({ npc, onClose }: { npc: ForumNPC | null; onClose: () => void }) {
  const addNpc = useForum((s) => s.addNpc)
  const updateNpc = useForum((s) => s.updateNpc)
  const push = useToast((s) => s.push)
  const [name, setName] = useState(npc?.name ?? '')
  const [persona, setPersona] = useState(npc?.persona ?? '')
  const [avatarId, setAvatarId] = useState<string | null>(npc?.avatarId ?? null)
  const avatarUrl = useBlobURL(avatarId)

  const pickAvatar = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const compressed = await compressImage(f, 256)
      setAvatarId(await putBlob(compressed))
    }
    input.click()
  }

  return (
    <Modal open onClose={onClose} title={npc ? '编辑 NPC' : '创建 NPC'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="pressable" onClick={pickAvatar} style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {avatarId ? <img src={avatarUrl ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserPlus size={18} color="var(--text-tertiary)" />}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NPC 名字" maxLength={12} />
        </div>
        <textarea value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="人设描述（性格、说话风格、和你的关系…）" rows={3} style={{ resize: 'none' }} />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (!name.trim()) {
              push('给 NPC 起个名字', 'error')
              return
            }
            if (npc) {
              updateNpc(npc.id, { name: name.trim(), persona: persona.trim(), avatarId })
              push('NPC 已更新')
            } else {
              addNpc({ name: name.trim(), persona: persona.trim(), avatarId })
              push('NPC 已创建，记得把 TA 邀请进圈子')
            }
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}
