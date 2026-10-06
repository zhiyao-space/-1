import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send, Users } from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import type { DyAuthor, DyGroup, DyGroupMessage } from '../../lib/douyinEngine'
import { DyAvatar } from './parts'

/** 稳定的空数组引用：避免 zustand 选择器每次返回新数组，触发 getSnapshot 无限循环告警 */
const EMPTY_MESSAGES: DyGroupMessage[] = []

export default function GroupChatView({
  group,
  onBack,
  onOpenAuthor,
}: {
  group: DyGroup
  onBack: () => void
  onOpenAuthor: (a: DyAuthor) => void
}) {
  const messages = useDouyin((s) => s.groupMessages[group.id] ?? EMPTY_MESSAGES)
  const openGroup = useDouyin((s) => s.openGroup)
  const sendGroup = useDouyin((s) => s.sendGroup)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    openGroup(group)
  }, [group, openGroup])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const send = () => {
    const t = draft.trim()
    if (!t) return
    sendGroup(group, t)
    setDraft('')
  }

  return (
    <div className="dy-page">
      <div className="dy-dm-head">
        <button className="dy-icon-btn pressable" onClick={onBack}>
          <ChevronLeft size={17} />
        </button>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={17} color="rgba(255,255,255,0.75)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {group.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{group.members.length} 位成员</div>
        </div>
      </div>

      <div className="dy-dm-list" ref={listRef}>
        <div className="dy-dm-tip">你已加入 {group.name}，点击成员头像可看主页</div>
        {messages.map((m) => {
          const mine = m.sender.kind === 'user'
          return (
            <div key={m.id} className={`dy-gm${mine ? ' dy-gm--me' : ''}`}>
              {!mine && (
                <button className="pressable" onClick={() => onOpenAuthor(m.sender)}>
                  <DyAvatar author={m.sender} size={30} />
                </button>
              )}
              <div className="dy-gm-body">
                {!mine && <span className="dy-gm-name">{m.sender.name}</span>}
                <span className={`dy-bubble ${mine ? 'dy-bubble--me' : 'dy-bubble--other'}`}>{m.content}</span>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && <div className="dy-empty">群里还很安静，说句话吧</div>}
      </div>

      <div className="dy-sheet-foot">
        <input
          className="dy-input"
          placeholder="发消息…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button className="dy-send pressable" onClick={send}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}