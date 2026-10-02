import { useEffect, useMemo, useState } from 'react'
import {
  Heart,
  MessageCircle,
  ImagePlus,
  Trash2,
  X,
  Send,
  Globe,
  Users,
  UserCheck,
  Camera,
  Music,
  Pencil,
  Share2,
  ChevronLeft,
} from 'lucide-react'
import {
  useMoments,
  authorKey,
  type Moment,
  type MomentVisibility,
  type MomentMusic,
  type MomentAuthor,
} from '../../store/moments'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { useChats } from '../../store/chats'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import Avatar from '../chat/Avatar'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { Modal, EmptyState } from '../common'
import AuthorAvatar, { useUserDisplay } from './AuthorAvatar'
import { respondToForward } from '../../lib/forumScheduler'

const MAX_IMAGES = 9

type AuthorKey = string

function keyToAuthor(key: AuthorKey, fallbackName: string): MomentAuthor {
  if (key === 'user') return { type: 'user', id: 'user', name: fallbackName }
  if (key.startsWith('npc:')) return { type: 'npc', id: key.slice(4), name: fallbackName }
  return { type: 'character', id: key, name: fallbackName }
}

export default function MomentsApp() {
  const moments = useMoments((s) => s.moments)
  const jumpTo = useMoments((s) => s.jumpTo)
  const setJumpTo = useMoments((s) => s.setJumpTo)
  const user = useUserDisplay()
  const [view, setView] = useState<{ kind: 'timeline' } | { kind: 'profile'; key: AuthorKey }>({ kind: 'timeline' })
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    if (!jumpTo) return
    setView({ kind: 'timeline' })
    const t = setTimeout(() => {
      document.getElementById(`moment-${jumpTo}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setJumpTo(null)
    }, 150)
    return () => clearTimeout(t)
  }, [jumpTo, setJumpTo])

  const sorted = useMemo(() => [...moments].sort((a, b) => b.createdAt - a.createdAt), [moments])

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {view.kind === 'timeline' ? (
        <TimelineView moments={sorted} onOpenProfile={(key) => setView({ kind: 'profile', key })} />
      ) : (
        <ProfileView
          authorKey={view.key}
          userName={user.name}
          moments={sorted}
          onBack={() => setView({ kind: 'timeline' })}
        />
      )}

      <button
        className="pressable"
        onClick={() => setComposeOpen(true)}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--accent-color, #7c6cff)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          zIndex: 20,
        }}
        aria-label="发布动态"
      >
        <ImagePlus size={22} />
      </button>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}

function TimelineView({
  moments,
  onOpenProfile,
}: {
  moments: Moment[]
  onOpenProfile: (key: AuthorKey) => void
}) {
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const removeMoment = useMoments((s) => s.removeMoment)
  const [confirmDelete, setConfirmDelete] = useState<Moment | null>(null)
  const [editTarget, setEditTarget] = useState<Moment | null>(null)
  const [forwardTarget, setForwardTarget] = useState<Moment | null>(null)

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 40px' }}>
        {moments.length === 0 ? (
          <EmptyState icon={<Camera size={36} />} text="朋友圈还是空的" hint="点右下角发第一条动态，角色们会来点赞评论" />
        ) : (
          moments.map((m) => (
            <MomentCard
              key={m.id}
              m={m}
              onOpenProfile={onOpenProfile}
              onAskDelete={() => setConfirmDelete(m)}
              onAskEdit={() => setEditTarget(m)}
              onAskForward={() => setForwardTarget(m)}
            />
          ))
        )}
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="删除动态">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fs-body" style={{ color: 'var(--text-body)' }}>
            删除后无法恢复，确定删除这条动态吗？
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>
              取消
            </button>
            <button
              className="btn btn-sm pressable"
              style={{ flex: 1, background: 'rgba(255,107,107,0.25)', color: '#ff8a8a' }}
              onClick={() => {
                if (confirmDelete) {
                  removeMoment(confirmDelete.id)
                  push('动态已删除')
                }
                setConfirmDelete(null)
              }}
            >
              删除
            </button>
          </div>
        </div>
      </Modal>

      <EditModal target={editTarget} onClose={() => setEditTarget(null)} />
      <ForwardPickerModal target={forwardTarget} onClose={() => setForwardTarget(null)} />
    </>
  )
}

function MomentCard({
  m,
  onOpenProfile,
  onAskDelete,
  onAskEdit,
  onAskForward,
}: {
  m: Moment
  onOpenProfile: (key: AuthorKey, name: string) => void
  onAskDelete: () => void
  onAskEdit: () => void
  onAskForward: () => void
}) {
  const toggleLike = useMoments((s) => s.toggleLike)
  const addComment = useMoments((s) => s.addComment)
  const user = useUserDisplay()
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; name: string } | null>(null)

  const isOwn = m.author.type === 'user'

  const roots = useMemo(() => m.comments.filter((c) => !c.parentId), [m.comments])
  const repliesByParent = useMemo(() => {
    const map: Record<string, typeof m.comments> = {}
    for (const c of m.comments) {
      if (!c.parentId) continue
      if (!map[c.parentId]) map[c.parentId] = []
      map[c.parentId].push(c)
    }
    return map
  }, [m.comments])

  const submitComment = () => {
    const text = commentText.trim()
    if (!text) return
    addComment(m.id, {
      author: { type: 'user', id: 'user', name: user.name },
      content: text,
      parentId: replyTarget?.parentId ?? null,
      replyToName: replyTarget?.name ?? null,
    })
    setCommentText('')
    setReplyTarget(null)
  }

  return (
    <div id={`moment-${m.id}`} className="glass" style={{ borderRadius: 16, padding: 13, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pressable" onClick={() => onOpenProfile(authorKey(m.author), m.author.name)} style={{ flexShrink: 0 }}>
          <AuthorAvatar author={m.author} size={40} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button className="pressable" onClick={() => onOpenProfile(authorKey(m.author), m.author.name)}>
              <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {authorDisplayName(m.author, user.name, characters, npcs)}
              </span>
            </button>
            <VisibilityBadge visibility={m.visibility} />
            {m.edited && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>已编辑</span>}
          </div>

          <div
            className="fs-body"
            style={{ color: 'var(--text-body)', marginTop: 4, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
            onContextMenu={(e) => {
              e.preventDefault()
              onAskForward()
            }}
            onDoubleClick={onAskForward}
          >
            {m.content}
          </div>

          <MomentImages imageIds={m.imageIds} />
          {m.music && <MusicCard music={m.music} />}

          <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 6 }}>{fmtAgo(m.createdAt)}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <button
              className="pressable"
              onClick={() => toggleLike(m.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: m.likes.includes('user') ? '#ff6b6b' : 'var(--text-tertiary)' }}
            >
              <Heart size={16} fill={m.likes.includes('user') ? '#ff6b6b' : 'none'} />
              <span className="fs-micro">{m.likes.length}</span>
            </button>
            <button
              className="pressable"
              onClick={() => {
                setCommentOpen((v) => !v)
                setReplyTarget(null)
                setCommentText('')
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}
            >
              <MessageCircle size={15} />
              <span className="fs-micro">{m.comments.length}</span>
            </button>
            <button
              className="pressable"
              onClick={onAskForward}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}
            >
              <Share2 size={14} />
              <span className="fs-micro">转发</span>
            </button>
            {isOwn && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                <button className="pressable" onClick={onAskEdit} style={{ color: 'var(--text-disabled)' }}>
                  <Pencil size={13} />
                </button>
                <button className="pressable" onClick={onAskDelete} style={{ color: 'var(--text-disabled)' }}>
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </div>

          <LikeRow m={m} />

          {m.comments.length > 0 && (
            <div style={{ marginTop: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8 }}>
              {roots.map((c) => (
                <div key={c.id}>
                  <CommentLine
                    c={c}
                    userName={user.name}
                    characters={characters}
                    npcs={npcs}
                    onReply={() => {
                      setCommentOpen(true)
                      setReplyTarget({ parentId: c.id, name: authorNameOf(c.author, user.name, characters, npcs) })
                    }}
                  />
                  {(repliesByParent[c.id] ?? []).map((r) => (
                    <div key={r.id} style={{ paddingLeft: 14 }}>
                      <CommentLine
                        c={r}
                        userName={user.name}
                        characters={characters}
                        npcs={npcs}
                        onReply={() => {
                          setCommentOpen(true)
                          setReplyTarget({ parentId: c.id, name: authorNameOf(r.author, user.name, characters, npcs) })
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {commentOpen && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder={replyTarget ? `回复 ${replyTarget.name}…` : '评论…'}
                maxLength={120}
                autoFocus
              />
              <button className="btn btn-accent pressable" style={{ padding: '0 12px' }} onClick={submitComment}>
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function authorDisplayName(a: MomentAuthor, userName: string, characters: { id: string; name: string }[], npcs: { id: string; name: string }[]): string {
  if (a.type === 'user') return userName
  if (a.type === 'npc') return npcs.find((n) => n.id === a.id)?.name ?? a.name
  return characters.find((c) => c.id === a.id)?.name ?? a.name
}

function authorNameOf(a: MomentAuthor, userName: string, characters: { id: string; name: string }[], npcs: { id: string; name: string }[]): string {
  return authorDisplayName(a, userName, characters, npcs)
}

function CommentLine({
  c,
  userName,
  characters,
  npcs,
  onReply,
}: {
  c: { id: string; author: MomentAuthor; content: string; replyToName: string | null }
  userName: string
  characters: { id: string; name: string }[]
  npcs: { id: string; name: string }[]
  onReply: () => void
}) {
  return (
    <div className="fs-micro" style={{ color: 'var(--text-body)', lineHeight: 1.7, padding: '2px 0', display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <AuthorAvatar author={c.author} size={16} />
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
        {authorDisplayName(c.author, userName, characters, npcs)}
      </span>
      {c.replyToName && <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>回复 {c.replyToName}</span>}
      <span style={{ minWidth: 0 }}>：{c.content}</span>
      <button className="pressable fs-micro" onClick={onReply} style={{ color: 'var(--text-disabled)', flexShrink: 0 }}>
        回复
      </button>
    </div>
  )
}

function LikeRow({ m }: { m: Moment }) {
  const user = useUserDisplay()
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const entries = useMemo(() => {
    return m.likes.map((key) => {
      if (key === 'user') return { key, name: user.name, avatarId: user.avatarId }
      if (key.startsWith('npc:')) {
        const n = npcs.find((x) => x.id === key.slice(4))
        return { key, name: n?.name ?? '路人', avatarId: n?.avatarId ?? null }
      }
      const c = characters.find((x) => x.id === key)
      return { key, name: c?.name ?? '有人', avatarId: c?.avatarId ?? null }
    })
  }, [m.likes, user.name, user.avatarId, characters, npcs])
  if (entries.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
      <Heart size={11} style={{ color: '#ff6b6b', flexShrink: 0 }} fill="#ff6b6b" />
      {entries.slice(0, 8).map((e) => (
        <span key={e.key} title={e.name} style={{ display: 'inline-flex', flexShrink: 0 }}>
          <AuthorAvatar author={keyToAuthor(e.key, e.name)} size={20} />
        </span>
      ))}
      {entries.length > 8 && <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>等 {entries.length} 人觉得很赞</span>}
      {entries.length <= 8 && <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>觉得很赞</span>}
    </div>
  )
}

function VisibilityBadge({ visibility }: { visibility: MomentVisibility }) {
  const label = visibility === 'all' ? '全部可见' : visibility === 'friends' ? '好友可见' : '部分可见'
  const Icon = visibility === 'all' ? Globe : visibility === 'friends' ? Users : UserCheck
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-disabled)' }}>
      <Icon size={10} />
      <span className="fs-micro">{label}</span>
    </span>
  )
}

function MomentImages({ imageIds }: { imageIds: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const [viewer, openViewer] = useImageViewer()
  if (imageIds.length === 0) return viewer
  const folded = imageIds.length > 4 && !expanded
  const shown = folded ? imageIds.slice(0, 3) : imageIds
  const cols = folded ? 2 : imageIds.length === 1 ? 1 : imageIds.length <= 4 ? 2 : 3
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, marginTop: 8 }}>
        {shown.map((id, i) => (
          <MomentImageCell key={id} imageId={id} big={shown.length === 1} openViewer={openViewer} />
        ))}
        {folded && (
          <button
            className="pressable"
            onClick={() => setExpanded(true)}
            style={{ height: 92, borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', fontSize: 'calc(15px * var(--fs-scale))' }}
          >
            +{imageIds.length - 3}
          </button>
        )}
      </div>
      {viewer}
    </>
  )
}

function MomentImageCell({ imageId, big, openViewer }: { imageId: string; big?: boolean; openViewer: (url: string | null) => void }) {
  const url = useBlobURL(imageId)
  return (
    <button onClick={() => openViewer(url)} style={{ height: big ? 190 : 92, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}

function MusicCard({ music }: { music: MomentMusic }) {
  return (
    <div
      style={{
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '9px 12px',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Music size={15} style={{ color: 'var(--accent-color, #9b8cff)' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="fs-body" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {music.title}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{music.artist}</div>
      </div>
      <Music size={13} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
    </div>
  )
}

function ProfileView({
  authorKey: aKey,
  userName,
  moments,
  onBack,
}: {
  authorKey: AuthorKey
  userName: string
  moments: Moment[]
  onBack: () => void
}) {
  const author = keyToAuthor(aKey, aKey === 'user' ? userName : '详情')
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const name = authorDisplayName(author, userName, characters, npcs)
  const list = useMemo(() => moments.filter((m) => authorKey(m.author) === aKey), [moments, aKey])
  const isOwn = aKey === 'user'

  const visitors = useMemo(() => {
    if (!isOwn) return []
    const seen: Record<string, { type: 'character'; id: string; name: string; time: number }> = {}
    for (const m of list) {
      for (const v of m.visitors ?? []) {
        if (!seen[v.id] || seen[v.id].time < v.time) seen[v.id] = v
      }
    }
    return Object.values(seen).sort((a, b) => b.time - a.time).slice(0, 10)
  }, [isOwn, list])

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 40px' }}>
        <button className="pressable" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', padding: '4px 0' }}>
          <ChevronLeft size={18} />
          <span className="fs-body">返回</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 2px 16px' }}>
          <AuthorAvatar author={author} size={64} />
          <div>
            <div className="fs-h3" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{name}</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>共 {list.length} 条动态</div>
          </div>
        </div>

        {isOwn && visitors.length > 0 && (
          <div className="glass" style={{ borderRadius: 14, padding: 12, marginBottom: 12 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>最近访客</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {visitors.map((v) => (
                <div key={v.id} style={{ width: 44, textAlign: 'center' }}>
                  <AuthorAvatar author={{ type: 'character', id: v.id, name: v.name }} size={40} />
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <EmptyState icon={<Camera size={32} />} text="还没有动态" />
        ) : (
          list.map((m) => (
            <MomentCard
              key={m.id}
              m={m}
              onOpenProfile={() => {}}
              onAskDelete={() => {}}
              onAskEdit={() => {}}
              onAskForward={() => {}}
            />
          ))
        )}
      </div>
    </>
  )
}

function EditModal({ target, onClose }: { target: Moment | null; onClose: () => void }) {
  const editMoment = useMoments((s) => s.editMoment)
  const push = useToast((s) => s.push)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (target) setContent(target.content)
  }, [target])

  return (
    <Modal open={!!target} onClose={onClose} title="编辑动态">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          rows={4}
          style={{ resize: 'none' }}
        />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (!target) return
            const text = content.trim()
            if (!text && target.imageIds.length === 0) {
              push('写点什么或保留配图', 'error')
              return
            }
            editMoment(target.id, text)
            push('已更新')
            onClose()
          }}
        >
          保存
        </button>
      </div>
    </Modal>
  )
}

function ForwardPickerModal({ target, onClose }: { target: Moment | null; onClose: () => void }) {
  const sessions = useChats((s) => s.sessions)
  const characters = useCharacters((s) => s.characters)
  const addMessage = useChats((s) => s.addMessage)
  const push = useToast((s) => s.push)
  const user = useUserDisplay()

  const rows = useMemo(
    () =>
      sessions
        .map((sess) => {
          const c = characters.find((x) => x.id === sess.characterId)
          return c ? { session: sess, character: c } : null
        })
        .filter((x): x is { session: (typeof sessions)[number]; character: (typeof characters)[number] } => !!x)
        .sort((a, b) => b.session.lastActive - a.session.lastActive),
    [sessions, characters]
  )

  const forward = (sessionId: string) => {
    if (!target) return
    addMessage(sessionId, {
      role: 'user',
      type: 'moment-card',
      content: target.content.slice(0, 120),
      imageId: null,
      data: { momentId: target.id },
    })
    push('已转发到聊天')
    onClose()
    void respondToForward(sessionId, target.id)
  }

  return (
    <Modal open={!!target} onClose={onClose} title="转发到聊天">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {rows.length === 0 && (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '12px 0' }}>
            还没有聊天会话
          </div>
        )}
        {rows.map(({ session, character }) => (
          <button
            key={session.id}
            className="pressable"
            onClick={() => forward(session.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}
          >
            <Avatar imageId={character.avatarId} name={character.name} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{character.name}</div>
              <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{session.messages.length} 条消息</div>
            </div>
            <Share2 size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        ))}
      </div>
    </Modal>
  )
}

function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const publish = useMoments((s) => s.publish)
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const user = useUserDisplay()
  const [content, setContent] = useState('')
  const [imageIds, setImageIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<MomentVisibility>('all')
  const [visibleIds, setVisibleIds] = useState<string[]>([])
  const [musicOn, setMusicOn] = useState(false)
  const [musicTitle, setMusicTitle] = useState('')
  const [musicArtist, setMusicArtist] = useState('')

  const addImages = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, MAX_IMAGES - imageIds.length)
      const ids: string[] = []
      for (const f of files) {
        try {
          const compressed = await compressImage(f, 1080)
          ids.push(await putBlob(compressed))
        } catch {
          push('一张图片处理失败，已跳过', 'error')
        }
      }
      setImageIds((s) => [...s, ...ids].slice(0, MAX_IMAGES))
    }
    input.click()
  }

  const reset = () => {
    setContent('')
    setImageIds([])
    setVisibility('all')
    setVisibleIds([])
    setMusicOn(false)
    setMusicTitle('')
    setMusicArtist('')
  }

  return (
    <Modal open={open} onClose={onClose} title="发布动态">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 500))} placeholder="这一刻的想法…" rows={4} style={{ resize: 'none' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {imageIds.map((id) => (
            <div key={id} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <ComposeThumb id={id} />
              <button className="pressable" onClick={() => setImageIds((s) => s.filter((x) => x !== id))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}>
                <X size={11} />
              </button>
            </div>
          ))}
          {imageIds.length < MAX_IMAGES && (
            <button className="pressable" onClick={addImages} style={{ width: 64, height: 64, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <ImagePlus size={18} />
            </button>
          )}
        </div>

        <button
          className="pressable"
          onClick={() => setMusicOn((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: musicOn ? 'var(--accent-color, #9b8cff)' : 'var(--text-tertiary)', fontSize: 'calc(13px * var(--fs-scale))' }}
        >
          <Music size={14} />
          {musicOn ? '已附带音乐' : '分享一首歌'}
        </button>
        {musicOn && (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={musicTitle} onChange={(e) => setMusicTitle(e.target.value.slice(0, 40))} placeholder="歌名" maxLength={40} />
            <input value={musicArtist} onChange={(e) => setMusicArtist(e.target.value.slice(0, 30))} placeholder="歌手" maxLength={30} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {(
            [
              ['all', '全部'],
              ['friends', '好友'],
              ['custom', '自定义'],
            ] as [MomentVisibility, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              className="btn btn-sm pressable"
              onClick={() => setVisibility(k)}
              style={{ flex: 1, background: visibility === k ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {visibility === 'custom' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {characters.length === 0 && <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>还没有角色可选</span>}
            {characters.map((c) => (
              <button
                key={c.id}
                className="pressable"
                onClick={() => setVisibleIds((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                style={{
                  fontSize: 'calc(12px * var(--fs-scale))',
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: visibleIds.includes(c.id) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                  color: visibleIds.includes(c.id) ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <button
          className="btn btn-accent"
          onClick={() => {
            if (!content.trim() && imageIds.length === 0) {
              push('写点什么或配张图', 'error')
              return
            }
            if (visibility === 'custom' && visibleIds.length === 0) {
              push('选择哪些角色可以看到', 'error')
              return
            }
            if (musicOn && !musicTitle.trim()) {
              push('填写歌名，或取消分享音乐', 'error')
              return
            }
            publish({
              author: { type: 'user', id: 'user', name: user.name },
              content: content.trim(),
              imageIds,
              visibility,
              visibleIds,
              music: musicOn && musicTitle.trim() ? { title: musicTitle.trim(), artist: musicArtist.trim() || '未知歌手' } : null,
            })
            push('已发布')
            reset()
            onClose()
          }}
        >
          发布
        </button>
      </div>
    </Modal>
  )
}

function ComposeThumb({ id }: { id: string }) {
  const url = useBlobURL(id)
  return url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null
}

function fmtAgo(t: number): string {
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
