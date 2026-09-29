import { useMemo, useState } from 'react'
import { Heart, MessageCircle, ImagePlus, Trash2, X, Send, Globe, Users, UserCheck, Camera } from 'lucide-react'
import { useMoments, type Moment, type MomentVisibility } from '../../store/moments'
import { useCharacters } from '../../store/characters'
import { useSettings } from '../../store/settings'
import { useForum } from '../../store/forum'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { useImageViewer } from '../chat/ChatParts'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { Modal, EmptyState } from '../common'

export default function MomentsApp() {
  const moments = useMoments((s) => s.moments)
  const publish = useMoments((s) => s.publish)
  const toggleLike = useMoments((s) => s.toggleLike)
  const addComment = useMoments((s) => s.addComment)
  const removeMoment = useMoments((s) => s.removeMoment)
  const characters = useCharacters((s) => s.characters)
  const phoneName = useSettings((s) => s.phoneName)
  const push = useToast((s) => s.push)
  const [composeOpen, setComposeOpen] = useState(false)
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const sorted = useMemo(() => [...moments].sort((a, b) => b.createdAt - a.createdAt), [moments])

  const sendComment = (moment: Moment) => {
    const text = commentText.trim()
    if (!text || !commentFor) return
    addComment(moment.id, { author: { type: 'user', id: 'user', name: phoneName || '我' }, content: text, replyToName: null })
    setCommentText('')
    setCommentFor(null)
    setTimeout(async () => {
      const { generateMomentReply, characterAuthor } = await import('../../lib/forumEngine')
      const pool = characters.filter((c) => visibleTo(moment, c.id))
      if (pool.length === 0 || Math.random() > 0.65) return
      const c = pool[Math.floor(Math.random() * pool.length)]
      const cur = useMoments.getState().moments.find((m) => m.id === moment.id)
      if (!cur) return
      const reply = await generateMomentReply(cur, characterAuthor(c), phoneName || '我')
      if (reply) {
        useMoments.getState().addComment(cur.id, { author: { type: 'character', id: c.id, name: c.name }, content: reply, replyToName: phoneName || '我' })
        useMoments.getState().addLike(cur.id, { type: 'character', id: c.id, name: c.name })
        push(`${c.name} 回应了你的朋友圈`)
      }
    }, 1200)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 40px' }}>
      <button className="btn btn-accent pressable" style={{ width: '100%', marginBottom: 14 }} onClick={() => setComposeOpen(true)}>
        <ImagePlus size={15} /> 发布动态
      </button>

      {sorted.length === 0 ? (
        <EmptyState icon={<Camera size={36} />} text="朋友圈还是空的" hint="发第一条动态，角色们会来点赞评论" />
      ) : (
        sorted.map((m) => (
          <div key={m.id} className="glass" style={{ borderRadius: 16, padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <MomentAvatar author={m.author} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.author.name}</span>
                  <VisibilityBadge visibility={m.visibility} />
                </div>
                <div className="fs-body" style={{ color: 'var(--text-body)', marginTop: 4, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                <MomentImages imageIds={m.imageIds} />
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
                      setCommentFor(commentFor === m.id ? null : m.id)
                      setCommentText('')
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}
                  >
                    <MessageCircle size={15} />
                    <span className="fs-micro">{m.comments.length}</span>
                  </button>
                  {m.author.type === 'user' && (
                    <button className="pressable" onClick={() => { removeMoment(m.id); push('动态已删除') }} style={{ marginLeft: 'auto', color: 'var(--text-disabled)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {m.likes.length > 0 && (
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 6 }}>
                    <Heart size={10} style={{ verticalAlign: '-1px', color: '#ff6b6b' }} /> {likeNames(m, phoneName, characters)} 觉得很赞
                  </div>
                )}

                {m.comments.length > 0 && (
                  <div style={{ marginTop: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8 }}>
                    {m.comments.map((c) => (
                      <div key={c.id} className="fs-micro" style={{ color: 'var(--text-body)', lineHeight: 1.7, padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{c.author.name}</span>
                        {c.replyToName && <span style={{ color: 'var(--text-tertiary)' }}> 回复 {c.replyToName}</span>}
                        ：{c.content}
                      </div>
                    ))}
                  </div>
                )}

                {commentFor === m.id && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment(m)} placeholder="评论…" maxLength={120} autoFocus />
                    <button className="btn btn-accent pressable" style={{ padding: '0 12px' }} onClick={() => sendComment(m)}>
                      <Send size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}

function visibleTo(m: Moment, characterId: string): boolean {
  if (m.author.type !== 'user') return true
  if (m.visibility === 'all') return true
  if (m.visibility === 'custom') return m.visibleIds.includes(characterId)
  return useForum.getState().following.includes(`character:${characterId}`)
}

function likeNames(m: Moment, phoneName: string, characters: { id: string; name: string }[]): string {
  return m.likes
    .map((id) => (id === 'user' ? phoneName || '我' : characters.find((c) => c.id === id)?.name ?? '有人'))
    .join('、')
}

function fmtAgo(t: number): string {
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function MomentAvatar({ author, size }: { author: Moment['author']; size: number }) {
  const characters = useCharacters((s) => s.characters)
  const avatarId = author.type === 'character' ? characters.find((c) => c.id === author.id)?.avatarId ?? null : null
  const url = useBlobURL(avatarId)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>{author.name.slice(0, 1)}</span>
      )}
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
  const [viewer, openViewer] = useImageViewer()
  if (imageIds.length === 0) return viewer
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: imageIds.length === 1 ? '1fr' : '1fr 1fr 1fr', gap: 4, marginTop: 8 }}>
        {imageIds.map((id) => (
          <MomentImageCell key={id} imageId={id} big={imageIds.length === 1} openViewer={openViewer} />
        ))}
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

function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const publish = useMoments((s) => s.publish)
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const [content, setContent] = useState('')
  const [imageIds, setImageIds] = useState<string[]>([])
  const [visibility, setVisibility] = useState<MomentVisibility>('all')
  const [visibleIds, setVisibleIds] = useState<string[]>([])

  const addImages = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? []).slice(0, 6)
      const ids: string[] = []
      for (const f of files) {
        const compressed = await compressImage(f, 1080)
        ids.push(await putBlob(compressed))
      }
      setImageIds((s) => [...s, ...ids].slice(0, 6))
    }
    input.click()
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
          {imageIds.length < 6 && (
            <button className="pressable" onClick={addImages} style={{ width: 64, height: 64, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <ImagePlus size={18} />
            </button>
          )}
        </div>

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
            publish({ author: { type: 'user', id: 'user', name: '' }, content: content.trim(), imageIds, visibility, visibleIds })
            push('已发布')
            setContent('')
            setImageIds([])
            setVisibility('all')
            setVisibleIds([])
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
