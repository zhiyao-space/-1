import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import Avatar from '../chat/Avatar'
import { SectionCard } from '../common'
import { useToast } from '../../store/ui'
import {
  useSms,
  smsThreadLast,
  smsMessagesOf,
  smsThreadUnread,
  type SmsMessage,
} from '../../store/sms'
import { useCharacters } from '../../store/characters'
import { generateSmsBatch, generatePersonReply } from '../../lib/smsEngine'
import { RefreshIcon, SmsIcon } from '../desktop/DockIcons'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function SmsApp() {
  const messages = useSms((s) => s.messages)
  const addMessages = useSms((s) => s.addMessages)
  const push = useToast((s) => s.push)
  const threads = useMemo(() => smsThreadLast(messages), [messages])
  const [openSender, setOpenSender] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!openSender) return
    useSms.getState().markThreadRead(openSender)
  }, [openSender])

  const refresh = () => {
    if (busy) return
    setBusy(true)
    window.setTimeout(() => {
      const drafts = generateSmsBatch()
      addMessages(drafts)
      setBusy(false)
      push(`收到 ${drafts.length} 条新短信`)
    }, 520)
  }

  if (openSender) {
    const last = threads.find((t) => t.senderId === openSender)
    return (
      <SmsThread
        senderId={openSender}
        senderName={last?.senderName ?? '未知'}
        senderAvatar={last?.senderAvatar ?? null}
        onBack={() => setOpenSender(null)}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        className="no-select"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', flexShrink: 0 }}
      >
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>
          短信
        </span>
        <button
          className="pressable"
          onClick={refresh}
          title="刷新生成消息"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-secondary)',
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className={busy ? 'spin' : ''} style={{ display: 'flex' }}>
            <RefreshIcon size={17} />
          </span>
          <span className="fs-micro">刷新</span>
        </button>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px' }}>
        {threads.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SmsIcon size={30} />
            </div>
            <div className="fs-body" style={{ color: 'var(--text-tertiary)', lineHeight: 1.9 }}>
              收件箱空空的。
              <br />
              点击右上角「刷新」生成新短信。
            </div>
          </div>
        ) : (
          <SectionCard>
            {threads.map((t) => {
              const unread = smsThreadUnread(messages, t.senderId)
              return (
                <button
                  key={t.senderId}
                  className="pressable"
                  onClick={() => setOpenSender(t.senderId)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 2px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'left',
                  }}
                >
                  <Avatar imageId={t.senderAvatar} name={t.senderName} size={44} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="fs-body" style={{ color: 'var(--text-primary)' }}>
                        {t.senderName}
                      </span>
                      {t.relationshipTag && (
                        <span
                          className="fs-micro"
                          style={{ color: 'var(--text-tertiary)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0 6px' }}
                        >
                          {t.relationshipTag}
                        </span>
                      )}
                    </span>
                    <span
                      className="fs-micro"
                      style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}
                    >
                      {t.outgoing ? '我：' : ''}
                      {t.content}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span className="timestamp">{formatTime(t.timestamp)}</span>
                    {unread > 0 && (
                      <span
                        className="mono"
                        style={{ minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: '#ff3b30', color: '#fff', fontSize: 10, lineHeight: '17px', textAlign: 'center' }}
                      >
                        {unread}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </SectionCard>
        )}
      </div>
    </div>
  )
}

function SmsThread({
  senderId,
  senderName,
  senderAvatar,
  onBack,
}: {
  senderId: string
  senderName: string
  senderAvatar: string | null
  onBack: () => void
}) {
  const messages = useSms((s) => s.messages)
  const addMessages = useSms((s) => s.addMessages)
  const addOutgoing = useSms((s) => s.addOutgoing)
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const [draft, setDraft] = useState('')
  const [replyIng, setReplyIng] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const thread = useMemo(() => smsMessagesOf(messages, senderId), [messages, senderId])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, replyIng])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    addOutgoing(senderId, senderName, text)
    setDraft('')
    const c = characters.find((x) => x.id === senderId)
    if (!c) return
    setReplyIng(true)
    window.setTimeout(() => {
      const reply = generatePersonReply(c)
      addMessages([reply])
      setReplyIng(false)
    }, 800 + Math.random() * 900)
  }

  const last = thread[thread.length - 1]
  const latestTag = last?.relationshipTag

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 6 }}>
          <ArrowLeft size={20} />
        </button>
        <Avatar imageId={senderAvatar} name={senderName} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
            {senderName}
          </div>
          {latestTag && <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{latestTag}</div>}
        </div>
        {!characters.some((c) => c.id === senderId) && (
          <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            无法回复
          </span>
        )}
      </div>

      <div ref={listRef} className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {thread.map((m) => (
          <SmsBubble key={m.id} m={m} />
        ))}
        {replyIng && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '6px 4px' }}>
            对方正在输入…
          </div>
        )}
        {(last?.appliedRules?.length ?? 0) > 0 && (
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center', padding: '10px 0' }}>
            命中规制：{last?.appliedRules?.join('、')}
          </div>
        )}
      </div>

      {characters.some((c) => c.id === senderId) ? (
        <div
          className="no-select"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(10,10,12,0.92)',
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            placeholder="回复短信…"
            style={{ flex: 1 }}
          />
          <button className="btn btn-accent pressable" onClick={send} disabled={!draft.trim()} style={{ width: 46, padding: 0 }}>
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div style={{ flexShrink: 0, padding: '12px 16px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn btn-sm pressable" onClick={() => push('此类短信为单向通知，无法回复', 'info')}>
            该号码为单向通知
          </button>
        </div>
      )}
    </div>
  )
}

function SmsBubble({ m }: { m: SmsMessage }) {
  const mine = m.outgoing
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{ maxWidth: '78%' }}>
        <div
          style={{
            padding: '9px 13px',
            borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: mine ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            color: mine ? '#000' : 'var(--text-body)',
            border: mine ? 'none' : '1px solid rgba(255,255,255,0.1)',
            fontSize: 'calc(14px * var(--fs-scale))',
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
        >
          {m.content}
        </div>
        <div className="timestamp" style={{ textAlign: mine ? 'right' : 'left', marginTop: 3 }}>
          {formatTime(m.timestamp)}
        </div>
      </div>
    </div>
  )
}