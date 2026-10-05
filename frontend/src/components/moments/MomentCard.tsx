import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, MapPin, Music2, Trash2, Pencil } from 'lucide-react'
import { Modal } from '../common'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import { useMoments, relativeTime, momentAuthorKey, type Moment, type MomentAuthor, type MomentComment } from '../../store/moments'
import { useProfile, displayUserName } from '../../store/profile'
import { useSettings } from '../../store/settings'
import AuthorAvatar from './AuthorAvatar'

function keyToAuthor(key: string, fallbackName: string): MomentAuthor {
  if (key === 'user') return { type: 'user', id: 'user', name: fallbackName }
  const [type, id] = key.split(':')
  if (type === 'character') return { type: 'character', id, name: fallbackName }
  if (type === 'npc') return { type: 'npc', id, name: fallbackName }
  return { type: 'character', id: key, name: fallbackName }
}

export default function MomentCard({
  moment,
  highlight,
  onOpenProfile,
  onForward,
}: {
  moment: Moment
  highlight?: boolean
  onOpenProfile: (author: MomentAuthor) => void
  onForward: (moment: Moment) => void
}) {
  const phoneName = useSettings((s) => s.phoneName)
  const profile = useProfile((s) => s.profile)
  const toggleLike = useMoments((s) => s.toggleLike)
  const addComment = useMoments((s) => s.addComment)
  const removeComment = useMoments((s) => s.removeComment)
  const toggleCommentLike = useMoments((s) => s.toggleCommentLike)
  const removeMoment = useMoments((s) => s.removeMoment)
  const [viewerNode, openViewer] = useImageViewer()
  const [commenting, setCommenting] = useState(false)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<MomentComment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MomentComment | null>(null)
  const [confirmDeleteMoment, setConfirmDeleteMoment] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editText, setEditText] = useState(moment.content)
  const [menuOpen, setMenuOpen] = useState(false)

  const myName = displayUserName(phoneName) || '我'
  const liked = moment.likes.includes('user')
  const isOwn = moment.author.type === 'user'

  const roots = useMemo(() => moment.comments.filter((c) => c.parentId === null), [moment.comments])
  const childrenOf = useMemo(() => {
    const map = new Map<string, MomentComment[]>()
    for (const c of moment.comments) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? []
        arr.push(c)
        map.set(c.parentId, arr)
      }
    }
    return map
  }, [moment.comments])

  const likeKeys = moment.likes.slice(0, 8)

  const submitComment = () => {
    const t = text.trim()
    if (!t) return
    addComment(moment.id, {
      author: { type: 'user', id: 'user', name: myName },
      content: t,
      parentId: replyTo?.id ?? null,
      replyToName: replyTo?.author.name ?? null,
    })
    setText('')
    setReplyTo(null)
  }

  const saveEdit = () => {
    const t = editText.trim()
    if (!t && moment.imageIds.length === 0) return
    useMoments.getState().updateMoment(moment.id, { content: t, edited: true })
    setEditOpen(false)
  }

  return (
    <div
      className="no-select"
      style={{
        padding: '14px 14px 8px',
        marginBottom: 10,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.035)',
        border: highlight ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: highlight ? '0 0 0 3px rgba(155,140,255,0.18)' : 'none',
        transition: 'box-shadow .3s',
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="pressable" onClick={() => onOpenProfile(moment.author)}>
          <AuthorAvatar author={moment.author} size={40} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            className="pressable"
            onClick={() => onOpenProfile(moment.author)}
            style={{ color: 'var(--accent)', fontSize: 'var(--fs-body, 14px)', fontWeight: 600, display: 'block' }}
          >
            {isOwn ? myName : moment.author.name}
          </button>
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span>{relativeTime(moment.createdAt)}</span>
            {moment.location && (
              <>
                <span>·</span>
                <MapPin size={10} />
                <span>{moment.location}</span>
              </>
            )}
            {moment.edited && <span>· 已编辑</span>}
            {moment.visibility === 'private' && <span>· 仅自己可见</span>}
          </div>
        </div>
        {isOwn && (
          <button className="pressable" onClick={() => setMenuOpen(true)} style={{ color: 'var(--text-tertiary)', padding: 4, alignSelf: 'flex-start' }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>···</span>
          </button>
        )}
      </div>

      {/* 正文 */}
      {moment.content && (
        <div className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.6, marginTop: 9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {moment.content}
        </div>
      )}

      {moment.repostOf && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 6 }}>
          转发了 {moment.repostOf.authorName} 的动态
        </div>
      )}

      {/* 图片 */}
      {moment.imageIds.length > 0 && <ImageGrid ids={moment.imageIds} onOpen={openViewer} />}

      {/* 音乐卡片 */}
      {moment.music && <MusicRow title={moment.music.title} artist={moment.music.artist} coverId={moment.music.coverId} />}

      {/* 点赞头像行 */}
      {moment.likes.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: -6 }}>
            {likeKeys.map((k) => (
              <div key={k} style={{ marginRight: -8, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.4)' }}>
                <AuthorAvatar author={keyToAuthor(k, '')} size={22} shape="circle" />
              </div>
            ))}
          </div>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
            {moment.likes.length} 人赞
          </span>
        </div>
      )}

      {/* 评论区 */}
      {moment.comments.length > 0 && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.045)' }}>
          {roots.map((root) => (
            <div key={root.id} style={{ marginBottom: 6 }}>
              <CommentRow
                comment={root}
                liked={root.likes.includes('user')}
                onLike={() => toggleCommentLike(moment.id, root.id, 'user')}
                onReply={() => {
                  setReplyTo(root)
                  setCommenting(true)
                }}
                onLongPress={() => root.author.type === 'user' && setDeleteTarget(root)}
              />
              {(childrenOf.get(root.id) ?? []).map((child) => (
                <div key={child.id} style={{ paddingLeft: 16, marginTop: 4 }}>
                  <CommentRow
                    comment={child}
                    liked={child.likes.includes('user')}
                    onLike={() => toggleCommentLike(moment.id, child.id, 'user')}
                    onReply={() => {
                      setReplyTo(child)
                      setCommenting(true)
                    }}
                    onLongPress={() => child.author.type === 'user' && setDeleteTarget(child)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 操作行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 8 }}>
        <button
          className="pressable"
          onClick={() => toggleLike(moment.id, 'user')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: liked ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          <span className="fs-micro">赞</span>
        </button>
        <button
          className="pressable"
          onClick={() => setCommenting((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: commenting ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <MessageCircle size={17} />
          <span className="fs-micro">评论</span>
        </button>
        <button
          className="pressable"
          onClick={() => onForward(moment)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}
        >
          <Share2 size={16} />
          <span className="fs-micro">转发</span>
        </button>
      </div>

      {/* 评论输入 */}
      {commenting && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitComment()
            }}
            placeholder={replyTo ? `回复 ${replyTo.author.name}` : '说点什么……'}
            style={{ flex: 1 }}
          />
          <button className="btn btn-sm btn-accent pressable" onClick={submitComment} style={{ flexShrink: 0 }}>
            发送
          </button>
        </div>
      )}

      {/* 自己的动态菜单 */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="动态操作" width={300}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn pressable"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => {
              setEditText(moment.content)
              setMenuOpen(false)
              setEditOpen(true)
            }}
          >
            <Pencil size={15} /> 编辑文字
          </button>
          <button
            className="btn pressable"
            style={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => {
              setMenuOpen(false)
              setConfirmDeleteMoment(true)
            }}
          >
            <Trash2 size={15} /> 删除动态
          </button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="编辑动态" width={320}>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value.slice(0, 500))}
          rows={4}
          style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setEditOpen(false)}>取消</button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={saveEdit}>保存</button>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="删除评论" width={300}>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          确定删除这条评论吗？其下的回复也会一并删除。
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>取消</button>
          <button
            className="btn"
            style={{ flex: 1, color: '#ff6b6b' }}
            onClick={() => {
              if (deleteTarget) removeComment(moment.id, deleteTarget.id)
              setDeleteTarget(null)
            }}
          >
            删除
          </button>
        </div>
      </Modal>

      <Modal open={confirmDeleteMoment} onClose={() => setConfirmDeleteMoment(false)} title="删除动态" width={300}>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          删除后无法恢复，确定删除这条动态吗？
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setConfirmDeleteMoment(false)}>取消</button>
          <button
            className="btn"
            style={{ flex: 1, color: '#ff6b6b' }}
            onClick={() => {
              removeMoment(moment.id)
              setConfirmDeleteMoment(false)
            }}
          >
            删除
          </button>
        </div>
      </Modal>

      {viewerNode}
    </div>
  )
}

function ImageGrid({ ids, onOpen }: { ids: string[]; onOpen: (url: string) => void }) {
  const n = Math.min(ids.length, 9)
  const cols = ids.length === 1 ? 1 : ids.length <= 4 ? 2 : 3
  return (
    <div
      style={{
        marginTop: 10,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 5,
        maxWidth: ids.length === 1 ? 220 : '100%',
      }}
    >
      {ids.slice(0, n).map((id) => (
        <GridImage key={id} id={id} single={ids.length === 1} onOpen={onOpen} />
      ))}
    </div>
  )
}

function GridImage({ id, single, onOpen }: { id: string; single: boolean; onOpen: (url: string) => void }) {
  const url = useBlobURL(id)
  if (!url) return <div style={{ aspectRatio: '1 / 1', borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onClick={() => onOpen(url)}
      style={{
        width: '100%',
        aspectRatio: single ? 'auto' : '1 / 1',
        maxHeight: single ? 260 : undefined,
        objectFit: 'cover',
        borderRadius: 10,
        cursor: 'zoom-in',
      }}
    />
  )
}

function MusicRow({ title, artist, coverId }: { title: string; artist: string; coverId: string | null }) {
  const url = useBlobURL(coverId)
  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Music2 size={16} color="var(--text-tertiary)" />}
      </div>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-micro" style={{ display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <span className="fs-micro" style={{ display: 'block', color: 'var(--text-tertiary)' }}>{artist}</span>
      </span>
    </div>
  )
}

function CommentRow({
  comment,
  liked,
  onLike,
  onReply,
  onLongPress,
}: {
  comment: MomentComment
  liked: boolean
  onLike: () => void
  onReply: () => void
  onLongPress: () => void
}) {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)
  const start = () => {
    fired.current = false
    timer.current = window.setTimeout(() => {
      fired.current = true
      onLongPress()
    }, 550)
  }
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => cancel, [])

  return (
    <div
      className="fs-micro"
      style={{ lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 6 }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress()
      }}
    >
      <span style={{ flex: 1, minWidth: 0, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--accent)' }}>{comment.author.name}</span>
        {comment.replyToName && <span style={{ color: 'var(--text-tertiary)' }}> 回复 {comment.replyToName}</span>}
        <span>：{comment.content}</span>
      </span>
      <button
        className="pressable"
        onClick={(e) => {
          e.stopPropagation()
          if (fired.current) return
          onLike()
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 3, color: liked ? 'var(--accent)' : 'var(--text-disabled)', flexShrink: 0, paddingTop: 2 }}
      >
        <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
        {comment.likes.length > 0 && <span>{comment.likes.length}</span>}
      </button>
      <button
        className="pressable"
        onClick={(e) => {
          e.stopPropagation()
          onReply()
        }}
        style={{ color: 'var(--text-disabled)', flexShrink: 0, paddingTop: 2 }}
      >
        回复
      </button>
    </div>
  )
}

export { keyToAuthor }