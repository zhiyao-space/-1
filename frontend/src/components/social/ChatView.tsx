import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react'
import { ChevronLeft, Gift, Image, MapPin, Mic, Star, Trash2, Undo2 } from 'lucide-react'
import {
  ME,
  ONLINE_LABEL,
  daysSince,
  useCharacter,
  useSocial,
  type MsgType,
  type SocialMessage,
} from '../../store/social'
import { generateReply } from '../../lib/socialEngine'
import { useToast } from '../../store/ui'
import { Sheet, SocialAvatar } from './SocialParts'

/* 「mu社区恋爱交友软件」单聊：气泡 / 长按操作 / 工具与 AI 回信 */

const GIFTS = ['一束玫瑰', '草莓蛋糕', '手冲咖啡', '手工曲奇', '一只小猫玩偶', '热可可', '向日葵花束']

const PLACES = ['街角的咖啡馆', '江边步道', '城市天台', '旧书店', '深夜便利店', '山顶观景台']

const ICON_BTN: CSSProperties = {
  width: 36,
  height: 36,
  border: 0,
  borderRadius: 12,
  background: 'var(--fx-face)',
  color: 'var(--fx-t1)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
}

function hhmm(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function bubbleClassOf(m: SocialMessage, isMe: boolean) {
  if (m.recalled) return 'sc-bubble sc-bubble--recalled'
  if (m.type === 'gift') return 'sc-bubble sc-bubble--gift'
  return `sc-bubble ${isMe ? 'sc-bubble--me' : 'sc-bubble--other'}`
}

function bubbleTextOf(m: SocialMessage, isMe: boolean) {
  if (m.recalled) return isMe ? '你撤回了一条消息' : '对方撤回了一条消息'
  if (m.type === 'gift') return m.meta?.gift ?? '礼物'
  if (m.type === 'location') return m.meta?.place ?? '位置'
  return m.text
}

function menuButton(icon: ReactNode, label: string, onClick: () => void) {
  return (
    <button
      className="fx-press-soft"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        border: 0,
        borderRadius: 16,
        background: 'var(--fx-sunken)',
        boxShadow: 'var(--fx-inset-shadow)',
        color: 'var(--fx-t1)',
        cursor: 'pointer',
        marginBottom: 8,
        fontSize: 14,
        textAlign: 'left',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function ChatView({
  charId,
  onBack,
  onOpenCard,
}: {
  charId: string
  onBack: () => void
  onOpenCard: (charId: string) => void
}) {
  const character = useCharacter(charId)
  const profile = useSocial((s) => s.profile)
  const rawMessages = useSocial((s) => s.messages[charId])
  const sendMessage = useSocial((s) => s.sendMessage)
  const receiveMessage = useSocial((s) => s.receiveMessage)
  const recallMessage = useSocial((s) => s.recallMessage)
  const toggleFavoriteMessage = useSocial((s) => s.toggleFavoriteMessage)
  const removeMessage = useSocial((s) => s.removeMessage)
  const toggleBlock = useSocial((s) => s.toggleBlock)
  const markConversationRead = useSocial((s) => s.markConversationRead)
  const push = useToast((s) => s.push)

  const history = useMemo(() => rawMessages ?? [], [rawMessages])
  const unreadIncoming = useMemo(
    () => history.filter((m) => m.senderId !== ME && !m.read).length,
    [history]
  )

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [menuMsg, setMenuMsg] = useState<SocialMessage | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const pressTimer = useRef<number | null>(null)
  const busyRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInput('')
    setSending(false)
    setMenuMsg(null)
    busyRef.current = false
  }, [charId])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (pressTimer.current) window.clearTimeout(pressTimer.current)
    }
  }, [charId])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, sending])

  // 正在查看的会话即时标记已读；unreadIncoming 归零后不再触发，避免循环
  useEffect(() => {
    if (unreadIncoming > 0) markConversationRead(charId)
  }, [unreadIncoming, charId, markConversationRead])

  if (!character) {
    return (
      <div className="sc-chat">
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--fx-face)',
          }}
        >
          <button className="fx-press-soft" onClick={onBack} style={ICON_BTN}>
            <ChevronLeft size={22} />
          </button>
          <span className="sc-title">会话不存在</span>
        </div>
      </div>
    )
  }

  function cancelPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  function startPress(m: SocialMessage) {
    cancelPress()
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      setMenuMsg(m)
    }, 500)
  }

  async function dispatch(payload: { text: string; type?: MsgType; meta?: SocialMessage['meta'] }) {
    if (!character || busyRef.current || character.blocked) return
    busyRef.current = true
    sendMessage(charId, payload)
    setInput('')
    setSending(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const latest = useSocial.getState()
      const c = latest.characters.find((x) => x.id === charId)
      if (c) {
        const text = await generateReply({
          character: c,
          profile: latest.profile,
          history: latest.messages[charId] ?? [],
          userText: payload.text,
          signal: ctrl.signal,
        })
        if (!ctrl.signal.aborted) useSocial.getState().receiveMessage(charId, { text })
      }
    } catch {
      /* 中断或生成失败：静默忽略 */
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null
        busyRef.current = false
        setSending(false)
      }
    }
  }

  function sendGift() {
    const gift = GIFTS[Math.floor(Math.random() * GIFTS.length)]
    void dispatch({ type: 'gift', text: `[礼物] ${gift}`, meta: { gift } })
  }

  function sendLocation() {
    const place = PLACES[Math.floor(Math.random() * PLACES.length)]
    void dispatch({ type: 'location', text: `[位置] ${place}`, meta: { place } })
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const t = input.trim()
      if (t && !sending) void dispatch({ text: t })
    }
  }

  return (
    <div className="sc-chat">
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--fx-face)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button className="fx-press-soft" onClick={onBack} style={ICON_BTN}>
          <ChevronLeft size={22} />
        </button>
        <SocialAvatar
          avatarId={character.avatarId}
          name={character.nickname}
          size={38}
          status={character.onlineStatus}
          onClick={() => onOpenCard(charId)}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sc-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {character.nickname}
          </div>
          <div className="sc-sub">
            {ONLINE_LABEL[character.onlineStatus]} · 相识 {daysSince(character.metAt)} 天
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="fx-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {history.map((m) => {
          const isMe = m.senderId === ME
          return (
            <div key={m.id} className={`sc-msg-row${isMe ? ' sc-msg-row--me' : ''}`}>
              <SocialAvatar avatarId={isMe ? profile.avatarId : character.avatarId} name={isMe ? profile.nickname : character.nickname} size={30} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '76%',
                }}
              >
                <div
                  className={bubbleClassOf(m, isMe)}
                  style={{ maxWidth: '100%' }}
                  onPointerDown={() => startPress(m)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenuMsg(m)
                  }}
                >
                  {bubbleTextOf(m, isMe)}
                </div>
                <span className="sc-msg-time">{hhmm(m.timestamp)}</span>
              </div>
            </div>
          )
        })}
        {sending && (
          <div className="sc-msg-row">
            <SocialAvatar avatarId={character.avatarId} name={character.nickname} size={30} />
            <div className="sc-bubble sc-bubble--other">
              <span className="sc-typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
      </div>

      {character.blocked ? (
        <div
          className="fx-sunken"
          style={{
            flexShrink: 0,
            margin: '0 10px calc(10px + env(safe-area-inset-bottom))',
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderRadius: 18,
          }}
        >
          <span style={{ color: 'var(--fx-t2)', fontSize: 13 }}>你已拉黑 TA，无法发送消息</span>
          <button
            className="fx-btn fx-press"
            style={{ minHeight: 36 }}
            onClick={() => toggleBlock(charId)}
          >
            解除拉黑
          </button>
        </div>
      ) : (
        <div className="sc-composer">
          <div className="sc-composer__tools">
            <button
              className="sc-tool fx-press-soft"
              onClick={() => void dispatch({ type: 'image', text: '[图片]' })}
            >
              <Image size={15} />
              图片
            </button>
            <button
              className="sc-tool fx-press-soft"
              onClick={() => void dispatch({ type: 'voice', text: '[语音]' })}
            >
              <Mic size={15} />
              语音
            </button>
            <button className="sc-tool fx-press-soft" onClick={sendGift}>
              <Gift size={15} />
              礼物
            </button>
            <button className="sc-tool fx-press-soft" onClick={sendLocation}>
              <MapPin size={15} />
              位置
            </button>
          </div>
          <div className="sc-composer__row">
            <textarea
              className="sc-composer__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="说点什么…"
              rows={1}
            />
            <button
              className="sc-send fx-press"
              disabled={!input.trim() || sending}
              onClick={() => void dispatch({ text: input.trim() })}
            >
              发送
            </button>
          </div>
        </div>
      )}

      <Sheet open={!!menuMsg} onClose={() => setMenuMsg(null)} title="消息操作">
        {menuMsg && (
          <>
            {menuMsg.senderId === ME &&
              menuButton(<Undo2 size={17} />, '撤回', () => {
                if (Date.now() - menuMsg.timestamp < 120000) {
                  recallMessage(charId, menuMsg.id)
                  push('已撤回')
                } else {
                  push('超过 2 分钟，无法撤回', 'error')
                }
                setMenuMsg(null)
              })}
            {menuButton(<Star size={17} />, menuMsg.favorited ? '取消收藏' : '收藏', () => {
              toggleFavoriteMessage(charId, menuMsg.id)
              push(menuMsg.favorited ? '已取消收藏' : '已收藏')
              setMenuMsg(null)
            })}
            {menuButton(<Trash2 size={17} />, '删除', () => {
              removeMessage(charId, menuMsg.id)
              push('已删除')
              setMenuMsg(null)
            })}
          </>
        )}
      </Sheet>
    </div>
  )
}