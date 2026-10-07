import { useMemo, useState } from 'react'
import { useSocial, ME, type SocialCharacter } from '../../store/social'
import { EmptyHint, Pill, Sheet, SocialAvatar } from './SocialParts'

/* 「mu社区恋爱交友软件」· 社区 Tab（首批轻量版：只读浏览 + 评论） */

export default function CommunityTab({ onOpenCard }: { onOpenCard: (charId: string) => void }) {
  const circles = useSocial((s) => s.circles)
  const posts = useSocial((s) => s.posts)
  const characters = useSocial((s) => s.characters)
  const profile = useSocial((s) => s.profile)
  const addComment = useSocial((s) => s.addComment)

  const [circleId, setCircleId] = useState('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const charById = useMemo(() => {
    const m = new Map<string, SocialCharacter>()
    for (const c of characters) m.set(c.id, c)
    return m
  }, [characters])

  const list = useMemo(() => {
    const base = circleId === 'all' ? posts : posts.filter((p) => p.circle === circleId)
    return [...base].sort((a, b) => b.timestamp - a.timestamp)
  }, [posts, circleId])

  const detail = useMemo(() => posts.find((p) => p.id === detailId) ?? null, [posts, detailId])

  const nameOf = (authorId: string) => (authorId === ME ? '我' : charById.get(authorId)?.nickname ?? '神秘人')
  const avatarIdOf = (authorId: string) => (authorId === ME ? profile.avatarId : charById.get(authorId)?.avatarId)

  const submit = () => {
    const value = draft.trim()
    if (!value || !detail) return
    addComment(detail.id, ME, value)
    setDraft('')
  }

  return (
    <>
      <div style={{ flexShrink: 0, padding: '12px 16px 0' }}>
        <div className="sc-sub">社区 · 正在建设中（第二批开放：发帖 / 私信）</div>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 10px', flexShrink: 0 }}>
        <Pill on={circleId === 'all'} onClick={() => setCircleId('all')}>
          全部
        </Pill>
        {circles.map((c) => (
          <Pill key={c.id} on={circleId === c.id} onClick={() => setCircleId(c.id)}>
            {c.name}
          </Pill>
        ))}
      </div>

      <div className="fx-scroll">
        {list.length === 0 ? (
          <EmptyHint>这个圈子还没有内容</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((post) => (
              <div
                key={post.id}
                className="sc-list-item fx-press-soft"
                onClick={() => setDetailId(post.id)}
                style={{ cursor: 'pointer', alignItems: 'flex-start' }}
              >
                <SocialAvatar
                  avatarId={avatarIdOf(post.authorId)}
                  name={nameOf(post.authorId)}
                  size={40}
                  status={post.authorId === ME ? undefined : charById.get(post.authorId)?.onlineStatus}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'calc(13px * var(--fs-scale))', fontWeight: 600, color: 'var(--fx-t1)' }}>
                    {nameOf(post.authorId)}
                  </div>
                  <div
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginTop: 4,
                      color: 'var(--fx-t2)',
                      fontSize: 'calc(12.5px * var(--fs-scale))',
                      lineHeight: 1.55,
                    }}
                  >
                    {post.content}
                  </div>
                  <div className="sc-sub" style={{ marginTop: 6 }}>
                    回复 {post.comments.length} · 热度 {post.likes.length + post.comments.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!detail} onClose={() => setDetailId(null)} title="动态详情">
        {detail && (
          <>
            <div className="sc-post__head">
              <SocialAvatar
                avatarId={avatarIdOf(detail.authorId)}
                name={nameOf(detail.authorId)}
                size={40}
                status={detail.authorId === ME ? undefined : charById.get(detail.authorId)?.onlineStatus}
                onClick={detail.authorId === ME ? undefined : () => onOpenCard(detail.authorId)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--fx-t1)' }}>{nameOf(detail.authorId)}</div>
                <div className="sc-sub">
                  {new Date(detail.timestamp).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <div className="sc-post__text" style={{ marginTop: 10 }}>
              {detail.content}
            </div>
            <div className="sc-sub" style={{ marginTop: 10 }}>
              回复 {detail.comments.length} · 热度 {detail.likes.length + detail.comments.length}
            </div>

            {detail.comments.length > 0 && (
              <div className="sc-comment" style={{ marginTop: 10 }}>
                {detail.comments.map((c) => (
                  <div key={c.id} className="sc-comment__row">
                    <span className="sc-comment__who">{nameOf(c.authorId)}</span>：{c.text}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                className="fx-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="发表评论…"
                style={{ flex: 1, minHeight: 40 }}
              />
              <button
                className="fx-btn fx-btn--accent fx-press"
                onClick={submit}
                style={{ minHeight: 40, padding: '0 14px' }}
              >
                发送
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}