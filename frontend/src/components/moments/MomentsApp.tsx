import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, RefreshCw, Settings as SettingsIcon, ChevronLeft, Loader2, ImagePlus, Eye } from 'lucide-react'
import { Modal } from '../common'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import { useToast } from '../../store/ui'
import { useProfile, displayUserName } from '../../store/profile'
import { useSettings } from '../../store/settings'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { useChats } from '../../store/chats'
import {
  useMoments,
  momentAuthorKey,
  relativeTime,
  type Moment,
  type MomentAuthor,
  type MomentRange,
} from '../../store/moments'
import { runMomentsRefresh, respondToForward, buildRepostContent, randomLocation } from '../../lib/momentEngine'
import { compressImage } from '../../lib/image'
import { putBlob } from '../../lib/idb'
import AuthorAvatar from './AuthorAvatar'
import MomentCard from './MomentCard'
import PublishModal from './PublishModal'
import RelationView from './RelationView'

type View =
  | { kind: 'timeline' }
  | { kind: 'album' }
  | { kind: 'relations' }
  | { kind: 'author'; author: MomentAuthor }
  | { kind: 'settings' }

export default function MomentsApp() {
  const moments = useMoments((s) => s.moments)
  const settings = useMoments((s) => s.settings)
  const updateSettings = useMoments((s) => s.updateSettings)
  const pendingJumpId = useMoments((s) => s.pendingJumpId)
  const setPendingJump = useMoments((s) => s.setPendingJump)
  const markSeen = useMoments((s) => s.markSeen)
  const addMoment = useMoments((s) => s.addMoment)

  const profile = useProfile((s) => s.profile)
  const updateProfile = useProfile((s) => s.updateProfile)
  const phoneName = useSettings((s) => s.phoneName)
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const push = useToast((s) => s.push)

  const [view, setView] = useState<View>({ kind: 'timeline' })
  const [publishOpen, setPublishOpen] = useState(false)
  const [forwardMoment, setForwardMoment] = useState<Moment | null>(null)
  const [chatPickerMoment, setChatPickerMoment] = useState<Moment | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editField, setEditField] = useState<'nickname' | 'bio' | 'wechat' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [viewerNode, openViewer] = useImageViewer()
  const didInit = useRef(false)

  const myName = displayUserName(phoneName) || '我'
  const coverUrl = useBlobURL(settings.coverId ?? profile.backgroundId)

  useEffect(() => {
    markSeen()
  }, [markSeen])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (pendingJumpId) {
      setView({ kind: 'timeline' })
      setHighlightId(pendingJumpId)
      setPendingJump(null)
      setTimeout(() => {
        document.getElementById(`moment-${pendingJumpId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
      setTimeout(() => setHighlightId(null), 4000)
    }
  }, [pendingJumpId, setPendingJump])

  // 可见动态：过滤「不看他」
  const visible = useMemo(() => {
    return moments.filter((m) => {
      if (m.author.type === 'user') return true
      const key = momentAuthorKey(m.author)
      if (settings.hideIds.includes(key)) return false
      if (m.visibility === 'custom' && !m.visibleIds.includes(key)) return false
      return true
    })
  }, [moments, settings.hideIds])

  const myMoments = useMemo(() => moments.filter((m) => m.author.type === 'user'), [moments])

  const visitors = useMemo(() => {
    const map = new Map<string, { key: string; name: string; time: number }>()
    for (const m of myMoments) for (const v of m.visitors) if (!map.has(v.key)) map.set(v.key, v)
    return Array.from(map.values()).sort((a, b) => b.time - a.time).slice(0, 12)
  }, [myMoments])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const r = await runMomentsRefresh()
      if (r.newMoments === 0 && r.interactions === 0 && r.visitors === 0) {
        push('还没有角色可以发圈，先创建角色或添加 NPC 吧', 'info')
      } else {
        push(`刷新完成：${r.newMoments} 条新动态 · ${r.interactions} 次互动`)
      }
    } catch {
      push('刷新失败，请重试', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const pickCover = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      try {
        const id = await putBlob(await compressImage(f, 1200))
        updateSettings({ coverId: id })
      } catch {
        push('封面处理失败', 'error')
      }
    }
    input.click()
  }

  const openEditor = (field: 'nickname' | 'bio' | 'wechat') => {
    setEditField(field)
    if (field === 'nickname') setEditValue(profile.nickname)
    else if (field === 'bio') setEditValue(profile.bio)
    else setEditValue(settings.wechatId)
  }

  const saveField = () => {
    if (editField === 'nickname') updateProfile({ nickname: editValue.trim() })
    else if (editField === 'bio') updateProfile({ bio: editValue.trim() })
    else if (editField === 'wechat') updateSettings({ wechatId: editValue.trim() })
    setEditField(null)
  }

  const repostToOwn = (moment: Moment) => {
    addMoment({
      author: { type: 'user', id: 'user', name: myName },
      content: buildRepostContent(moment),
      imageIds: [],
      location: randomLocation(),
      visibility: 'all',
      visibleIds: [],
      music: null,
      repostOf: { momentId: moment.id, authorName: moment.author.name },
    })
    push('已转发到我的朋友圈')
    setForwardMoment(null)
  }

  const forwardToChat = (moment: Moment, characterId: string) => {
    const sid = useChats.getState().getOrCreateSession(characterId)
    useChats.getState().addMessage(sid, {
      role: 'user',
      type: 'moment-card',
      content: moment.content || '（图片动态）',
      data: { momentId: moment.id },
    })
    const char = characters.find((c) => c.id === characterId)
    push(`已转发给 ${char?.name ?? '角色'}`)
    setChatPickerMoment(null)
    setForwardMoment(null)
    void respondToForward(sid, moment.id, characterId)
  }

  // ---------------- 设置页 ----------------
  if (view.kind === 'settings') {
    return (
      <MomentsSettings
        onBack={() => setView({ kind: 'timeline' })}
        range={settings.range}
        setRange={(r) => updateSettings({ range: r })}
        strangerTen={settings.strangerTen}
        setStrangerTen={(v) => updateSettings({ strangerTen: v })}
        hideFromIds={settings.hideFromIds}
        hideIds={settings.hideIds}
        setHideFromIds={(v) => updateSettings({ hideFromIds: v })}
        setHideIds={(v) => updateSettings({ hideIds: v })}
      />
    )
  }

  // ---------------- 作者个人页 ----------------
  if (view.kind === 'author') {
    const authorKey = momentAuthorKey(view.author)
    const list = moments.filter((m) => momentAuthorKey(m.author) === authorKey)
    const isOwnProfile = view.author.type === 'user'
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', flexShrink: 0 }}>
          <button className="pressable" onClick={() => setView({ kind: 'timeline' })} style={{ color: 'var(--text-secondary)', display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <span className="fs-h2" style={{ color: 'var(--text-primary)' }}>{isOwnProfile ? myName : view.author.name} 的朋友圈</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {isOwnProfile && visitors.length > 0 && <VisitorRow visitors={visitors} />}
          {list.length === 0 ? (
            <EmptyHint text="还没有动态。" />
          ) : (
            list.map((m) => (
              <MomentCard key={m.id} moment={m} onOpenProfile={(a) => setView({ kind: 'author', author: a })} onForward={setForwardMoment} />
            ))
          )}
        </div>
        {forwardMoment && <ForwardSheet moment={forwardMoment} onClose={() => setForwardMoment(null)} onRepost={repostToOwn} onChat={() => setChatPickerMoment(forwardMoment)} />}
        {chatPickerMoment && <ChatPicker characters={characters} onClose={() => setChatPickerMoment(null)} onPick={(id) => forwardToChat(chatPickerMoment, id)} />}
        {viewerNode}
      </div>
    )
  }

  const showAlbum = view.kind === 'album'
  const showRelations = view.kind === 'relations'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: showRelations ? 'hidden' : 'auto' }}>
        {/* 顶部个人资料 */}
        {!showRelations && (
        <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
          <div
            className="pressable"
            onClick={pickCover}
            style={{
              height: 118,
              borderRadius: 14,
              overflow: 'hidden',
              background: coverUrl ? undefined : 'linear-gradient(135deg, #1a1a1f, #2c2c34)',
              position: 'relative',
            }}
          >
            {coverUrl && <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <span className="fs-micro" style={{ position: 'absolute', right: 8, bottom: 8, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ImagePlus size={12} /> 更换封面
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -26, paddingLeft: 10, position: 'relative' }}>
            <div style={{ borderRadius: 14, border: '3px solid var(--bg, #0C0C0C)' }}>
              <AuthorAvatar author={{ type: 'user', id: 'user', name: myName }} size={58} shape="rounded" />
            </div>
            <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
              <button className="pressable" onClick={() => openEditor('nickname')} style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, display: 'block' }}>
                {myName}
              </button>
              <button className="pressable" onClick={() => openEditor('wechat')} style={{ color: 'var(--text-tertiary)', display: 'block', marginTop: 2 }}>
                <span className="fs-micro">微信号：{settings.wechatId || '点击设置'}</span>
              </button>
            </div>
            <button className="pressable" onClick={refresh} disabled={refreshing} style={{ color: 'var(--text-secondary)', padding: 8 }} title="刷新角色动态">
              {refreshing ? <Loader2 size={20} className="spin" /> : <RefreshCw size={20} />}
            </button>
            <button className="pressable" onClick={() => setPublishOpen(true)} style={{ color: 'var(--text-secondary)', padding: 8 }} title="发表动态">
              <Camera size={21} />
            </button>
            <button className="pressable" onClick={() => setView({ kind: 'settings' })} style={{ color: 'var(--text-secondary)', padding: 8 }} title="隐私设置">
              <SettingsIcon size={19} />
            </button>
          </div>

          <button
            className="pressable"
            onClick={() => openEditor('bio')}
            style={{ width: '100%', textAlign: 'left', marginTop: 10, color: profile.bio ? 'var(--text-secondary)' : 'var(--text-disabled)' }}
          >
            <span className="fs-micro">{profile.bio || '点击填写个性签名'}</span>
          </button>
        </div>
        )}

        {/* Tab */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 6px', flexShrink: 0 }}>
          <TabBtn active={view.kind === 'timeline'} onClick={() => setView({ kind: 'timeline' })} label="动态" />
          <TabBtn active={showAlbum} onClick={() => setView({ kind: 'album' })} label="我的相册" />
          <TabBtn active={showRelations} onClick={() => setView({ kind: 'relations' })} label="关系" />
        </div>

        {showRelations ? (
          <RelationView onOpenProfile={(a) => setView({ kind: 'author', author: a })} />
        ) : (
        <div style={{ padding: '6px 16px 24px' }}>
          {showAlbum ? (
            <>
              {visitors.length > 0 && <VisitorRow visitors={visitors} />}
              {myMoments.length === 0 ? (
                <EmptyHint text="你还没有发过动态。" />
              ) : (
                myMoments.map((m) => (
                  <div key={m.id} id={`moment-${m.id}`}>
                    <MomentCard moment={m} highlight={highlightId === m.id} onOpenProfile={(a) => setView({ kind: 'author', author: a })} onForward={setForwardMoment} />
                  </div>
                ))
              )}
            </>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <EmptyHint text="朋友圈还是空的。点右上角刷新，看看角色们在做什么。" />
              <button className="btn btn-accent pressable" onClick={refresh} disabled={refreshing} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {refreshing ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} {refreshing ? '刷新中…' : '刷新朋友圈'}
              </button>
            </div>
          ) : (
            visible.map((m) => (
              <div key={m.id} id={`moment-${m.id}`}>
                <MomentCard moment={m} highlight={highlightId === m.id} onOpenProfile={(a) => setView({ kind: 'author', author: a })} onForward={setForwardMoment} />
              </div>
            ))
          )}
        </div>
        )}
      </div>

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} />
      {forwardMoment && <ForwardSheet moment={forwardMoment} onClose={() => setForwardMoment(null)} onRepost={repostToOwn} onChat={() => setChatPickerMoment(forwardMoment)} />}
      {chatPickerMoment && <ChatPicker characters={characters} onClose={() => setChatPickerMoment(null)} onPick={(id) => forwardToChat(chatPickerMoment, id)} />}

      <Modal open={!!editField} onClose={() => setEditField(null)} title={editField === 'nickname' ? '修改昵称' : editField === 'bio' ? '个性签名' : '微信号'} width={320}>
        {editField === 'bio' ? (
          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value.slice(0, 60))} rows={3} placeholder="写一句签名" style={{ width: '100%', resize: 'none' }} />
        ) : (
          <input value={editValue} onChange={(e) => setEditValue(e.target.value.slice(0, 30))} placeholder="请输入" style={{ width: '100%' }} />
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setEditField(null)}>取消</button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={saveField}>保存</button>
        </div>
      </Modal>

      {viewerNode}
    </div>
  )
}

function VisitorRow({ visitors }: { visitors: { key: string; name: string; time: number }[] }) {
  return (
    <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Eye size={12} /> 最近访客 {visitors.length}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {visitors.map((v) => (
          <div key={v.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 44 }}>
            <AuthorAvatar author={keyToAuthorFromKey(v.key, v.name)} size={36} shape="circle" />
            <span className="fs-micro" style={{ color: 'var(--text-disabled)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function keyToAuthorFromKey(key: string, name: string): MomentAuthor {
  if (key === 'user') return { type: 'user', id: 'user', name }
  const [type, id] = key.split(':')
  if (type === 'npc') return { type: 'npc', id, name }
  return { type: 'character', id, name }
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className="btn btn-sm pressable"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function ForwardSheet({
  moment,
  onClose,
  onRepost,
  onChat,
}: {
  moment: Moment
  onClose: () => void
  onRepost: (m: Moment) => void
  onChat: () => void
}) {
  return (
    <Modal open onClose={onClose} title="转发" width={320}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {moment.content || '（图片动态）'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn pressable" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onRepost(moment)}>
          转发到我的朋友圈
        </button>
        <button className="btn btn-accent pressable" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={onChat}>
          转发到聊天
        </button>
      </div>
    </Modal>
  )
}

function ChatPicker({
  characters,
  onClose,
  onPick,
}: {
  characters: { id: string; name: string; avatarId: string | null }[]
  onClose: () => void
  onPick: (characterId: string) => void
}) {
  return (
    <Modal open onClose={onClose} title="选择聊天对象" width={320}>
      {characters.length === 0 ? (
        <EmptyHint text="还没有角色可以转发。" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {characters.map((c) => (
            <button
              key={c.id}
              className="pressable"
              onClick={() => onPick(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <AuthorAvatar author={{ type: 'character', id: c.id, name: c.name }} size={36} shape="rounded" />
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

const RANGE_LABEL: Record<MomentRange, string> = { all: '全部', halfYear: '半年', month: '一月', threeDays: '三天' }

function MomentsSettings({
  onBack,
  range,
  setRange,
  strangerTen,
  setStrangerTen,
  hideFromIds,
  hideIds,
  setHideFromIds,
  setHideIds,
}: {
  onBack: () => void
  range: MomentRange
  setRange: (r: MomentRange) => void
  strangerTen: boolean
  setStrangerTen: (v: boolean) => void
  hideFromIds: string[]
  hideIds: string[]
  setHideFromIds: (v: string[]) => void
  setHideIds: (v: string[]) => void
}) {
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const members = useMemo(
    () => [
      ...characters.map((c) => ({ key: `character:${c.id}`, name: c.name })),
      ...npcs.map((n) => ({ key: `npc:${n.id}`, name: n.name })),
    ],
    [characters, npcs]
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', display: 'flex' }}>
          <ChevronLeft size={22} />
        </button>
        <span className="fs-h2" style={{ color: 'var(--text-primary)' }}>朋友圈隐私设置</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
        <Section title="查看范围">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'halfYear', 'month', 'threeDays'] as MomentRange[]).map((r) => (
              <button
                key={r}
                className="btn btn-sm pressable"
                onClick={() => setRange(r)}
                style={{
                  flex: 1,
                  background: range === r ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                  color: range === r ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderColor: range === r ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)',
                }}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="陌生人">
          <button
            className="pressable"
            onClick={() => setStrangerTen(!strangerTen)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>允许陌生人查看最近十条</span>
            <Toggle on={strangerTen} />
          </button>
        </Section>

        <Section title="不让他（她）看我的朋友圈">
          <MemberChips members={members} selected={hideFromIds} onToggle={(k) => setHideFromIds(hideFromIds.includes(k) ? hideFromIds.filter((x) => x !== k) : [...hideFromIds, k])} />
        </Section>

        <Section title="不看他（她）的朋友圈">
          <MemberChips members={members} selected={hideIds} onToggle={(k) => setHideIds(hideIds.includes(k) ? hideIds.filter((x) => x !== k) : [...hideIds, k])} />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function MemberChips({ members, selected, onToggle }: { members: { key: string; name: string }[]; selected: string[]; onToggle: (key: string) => void }) {
  if (members.length === 0) return <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>还没有角色或 NPC。</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {members.map((m) => {
        const on = selected.includes(m.key)
        return (
          <button
            key={m.key}
            className="pressable fs-micro"
            onClick={() => onToggle(m.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: on ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        padding: 2,
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'all .2s',
        flexShrink: 0,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
    </span>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div className="fs-micro page-enter" style={{ color: 'var(--text-disabled)', textAlign: 'center', padding: '24px 12px', lineHeight: 1.7 }}>{text}</div>
}