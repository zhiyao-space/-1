import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Ban, BellOff, Pin, Search, Trash2 } from 'lucide-react'
import {
  lastMessageOf,
  sortCharactersByActivity,
  unreadCount,
  useSocial,
  type SocialMessage,
} from '../../store/social'
import { useToast } from '../../store/ui'
import { EmptyHint, SocialAvatar } from './SocialParts'

/* 「mu社区恋爱交友软件」消息列表：搜索 / 排序 / 滑动露出操作 */

const SWIPE_W = 132

function convTime(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function previewOf(m: SocialMessage | null) {
  if (!m) return '还没有消息，打个招呼吧'
  if (m.recalled) return '[已撤回]'
  if (m.type === 'gift') return `[礼物] ${m.meta?.gift ?? ''}`.trim()
  if (m.type === 'image') return '[图片]'
  if (m.type === 'voice') return '[语音]'
  if (m.type === 'location') return '[位置]'
  return m.text
}

export default function MessagesTab({
  onOpenChat,
  onOpenCard,
}: {
  onOpenChat: (charId: string) => void
  onOpenCard: (charId: string) => void
}) {
  const characters = useSocial((s) => s.characters)
  const messages = useSocial((s) => s.messages)
  const togglePin = useSocial((s) => s.togglePin)
  const push = useToast((s) => s.push)

  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    base: number
    x: number
    horizontal: boolean
  } | null>(null)
  const lastSwipeAt = useRef(0)

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const filtered = kw ? characters.filter((c) => c.nickname.toLowerCase().includes(kw)) : characters
    return sortCharactersByActivity(filtered, messages)
  }, [characters, messages, q])

  function openConversation(charId: string) {
    const s = useSocial.getState()
    s.ensureConversation(charId)
    s.markConversationRead(charId)
    onOpenChat(charId)
  }

  function removeConversation(charId: string, nickname: string) {
    useSocial.setState((s) => ({ messages: { ...s.messages, [charId]: [] } }))
    push(`已清空与${nickname}的聊天记录`)
    setOpenId(null)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>, charId: string) {
    const base = openId === charId ? -SWIPE_W : 0
    dragRef.current = { id: charId, startX: e.clientX, startY: e.clientY, base, x: base, horizontal: false }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.horizontal) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        d.horizontal = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* 忽略不支持指针捕获的环境 */
        }
      } else {
        return
      }
    }
    const x = Math.max(-SWIPE_W - 16, Math.min(0, d.base + dx))
    d.x = x
    setDrag({ id: d.id, x })
  }

  function endDrag() {
    const d = dragRef.current
    dragRef.current = null
    if (!d || !d.horizontal) return
    lastSwipeAt.current = Date.now()
    setOpenId(d.x < -SWIPE_W / 2 ? d.id : null)
    setDrag(null)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '12px 16px 6px', position: 'relative' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 30, top: 26, color: 'var(--fx-t3)', pointerEvents: 'none' }}
        />
        <input
          className="fx-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索昵称"
          style={{ paddingLeft: 38 }}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {list.length === 0 ? (
          <EmptyHint>还没有匹配到的人，去「匹配」里认识新朋友吧。</EmptyHint>
        ) : (
          list.map((char) => {
            const msgs = messages[char.id]
            const last = lastMessageOf(msgs)
            const unread = unreadCount(msgs)
            const offset = drag && drag.id === char.id ? drag.x : openId === char.id ? -SWIPE_W : 0
            const dragging = !!drag && drag.id === char.id
            return (
              <div key={char.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 18 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="fx-press-soft"
                    onClick={() => {
                      togglePin(char.id)
                      setOpenId(null)
                    }}
                    style={{
                      width: SWIPE_W / 2,
                      height: '100%',
                      border: 0,
                      background: 'var(--fx-face)',
                      color: 'var(--fx-t1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    <Pin size={16} />
                    置顶
                  </button>
                  <button
                    className="fx-press-soft"
                    onClick={() => removeConversation(char.id, char.nickname)}
                    style={{
                      width: SWIPE_W / 2,
                      height: '100%',
                      border: 0,
                      background: 'var(--fx-sunken)',
                      color: 'var(--fx-t1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    <Trash2 size={16} />
                    删除
                  </button>
                </div>

                <div
                  className="sc-conv fx-press-soft"
                  onPointerDown={(e) => onPointerDown(e, char.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={() => {
                    if (Date.now() - lastSwipeAt.current < 350) return
                    if (openId === char.id) {
                      setOpenId(null)
                      return
                    }
                    openConversation(char.id)
                  }}
                  style={{
                    position: 'relative',
                    transform: `translateX(${offset}px)`,
                    transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.3, 1)',
                  }}
                >
                  <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', flexShrink: 0 }}>
                    <SocialAvatar
                      avatarId={char.avatarId}
                      name={char.nickname}
                      size={46}
                      status={char.onlineStatus}
                      onClick={() => onOpenCard(char.id)}
                    />
                  </span>
                  <div className="sc-conv__body">
                    <div className="sc-conv__top">
                      <span className="sc-conv__name">{char.nickname}</span>
                      {char.pinned && <Pin size={11} color="var(--fx-t3)" />}
                      {char.muted && <BellOff size={11} color="var(--fx-t3)" />}
                      {char.blocked && <Ban size={11} color="var(--fx-t3)" />}
                    </div>
                    <span className="sc-conv__preview">{previewOf(last)}</span>
                  </div>
                  <div className="sc-conv__side">
                    <span className="sc-sub">{convTime(last?.timestamp ?? char.lastActive)}</span>
                    {unread > 0 && <span className="sc-conv__dot">{unread > 99 ? '99+' : unread}</span>}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}