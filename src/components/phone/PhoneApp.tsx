import { useEffect, useMemo, useRef, useState } from 'react'
import { Phone, PhoneOff, ChevronRight } from 'lucide-react'
import Avatar from '../chat/Avatar'
import { Modal, SectionCard } from '../common'
import { useToast } from '../../store/ui'
import { useCalls, sortedCallRecords, type CallRecord, type CallType } from '../../store/calls'
import { useCharacters, type Character } from '../../store/characters'
import { generateCallBatch, buildCallScript, type CallScript } from '../../lib/callEngine'
import { RefreshIcon, PhoneIcon } from '../desktop/DockIcons'

function formatWhen(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(sec: number): string {
  if (sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const TYPE_LABEL: Record<CallType, string> = { incoming: '呼入', outgoing: '呼出', missed: '未接来电' }

export default function PhoneApp() {
  const records = useCalls((s) => s.records)
  const addRecord = useCalls((s) => s.addRecord)
  const push = useToast((s) => s.push)
  const characters = useCharacters((s) => s.characters)
  const sorted = useMemo(() => sortedCallRecords(records), [records])
  const [busy, setBusy] = useState(false)
  const [dialOpen, setDialOpen] = useState(false)
  const [detail, setDetail] = useState<CallRecord | null>(null)
  const [call, setCall] = useState<{ character: Character; script: CallScript } | null>(null)

  useEffect(() => {
    useCalls.getState().markAllRead()
  }, [])

  const refresh = () => {
    if (busy) return
    setBusy(true)
    window.setTimeout(() => {
      const drafts = generateCallBatch()
      drafts.forEach((d) => addRecord(d))
      setBusy(false)
      push(`新增 ${drafts.length} 条通话记录`)
    }, 520)
  }

  const startCall = (c: Character) => {
    setDialOpen(false)
    setDetail(null)
    setCall({ character: c, script: buildCallScript(c) })
  }

  const endCall = (duration: number, script: CallScript, c: Character) => {
    addRecord({
      callerId: c.id,
      receiverId: 'me',
      callerName: c.name,
      callerAvatar: c.avatarId,
      relationshipTag: c.identity.trim() || '好友',
      timestamp: Date.now(),
      duration,
      callType: 'outgoing',
      summary: duration <= 2 ? '已拨出，对方未接听。' : script.summary,
      isUnknown: false,
      isRead: true,
    })
    setCall(null)
    push('通话已结束')
  }

  if (call) {
    return (
      <CallScreen
        name={call.character.name}
        avatarId={call.character.avatarId}
        lines={call.script.lines}
        onEnd={(duration) => endCall(duration, call.script, call.character)}
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
          通话记录
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="pressable"
            onClick={refresh}
            title="刷新生成来电"
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
          <button
            className="pressable"
            onClick={() => setDialOpen(true)}
            title="拨号"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#000',
              padding: '6px 12px',
              borderRadius: 999,
              background: 'var(--accent)',
            }}
          >
            <PhoneIcon size={15} />
            <span className="fs-micro">拨号</span>
          </button>
        </div>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px' }}>
        {sorted.length === 0 ? (
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
              <PhoneIcon size={30} />
            </div>
            <div className="fs-body" style={{ color: 'var(--text-tertiary)', lineHeight: 1.9 }}>
              暂无通话记录。
              <br />
              点击「刷新」接收来电，或「拨号」主动呼叫角色。
            </div>
          </div>
        ) : (
          <SectionCard>
            {sorted.map((r) => (
              <button
                key={r.id}
                className="pressable"
                onClick={() => setDetail(r)}
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
                <Avatar imageId={r.callerAvatar} name={r.callerName} size={44} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="fs-body" style={{ color: r.callType === 'missed' && !r.isRead ? '#ff6b6b' : 'var(--text-primary)' }}>
                      {r.callerName}
                    </span>
                    {r.relationshipTag && (
                      <span className="fs-micro" style={{ color: 'var(--text-tertiary)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '0 6px' }}>
                        {r.relationshipTag}
                      </span>
                    )}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {TYPE_LABEL[r.callType]}
                    {formatDuration(r.duration) ? ` · ${formatDuration(r.duration)}` : ''}
                    {r.summary ? ` · ${r.summary}` : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span className="timestamp">{formatWhen(r.timestamp)}</span>
                  <ChevronRight size={15} color="var(--text-disabled)" />
                </span>
              </button>
            ))}
          </SectionCard>
        )}
      </div>

      <Modal open={dialOpen} onClose={() => setDialOpen(false)} title="选择联系人">
        {characters.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '8px 0' }}>
            还没有角色，先去「聊天」创建一个吧。
          </div>
        ) : (
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {characters.map((c) => (
              <button
                key={c.id}
                className="row-item pressable"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => startCall(c)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar imageId={c.avatarId} name={c.name} size={36} />
                  <div>
                    <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                    <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{c.identity || '好友'}</div>
                  </div>
                </div>
                <Phone size={16} color="var(--text-secondary)" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="通话详情">
        {detail && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar imageId={detail.callerAvatar} name={detail.callerName} size={48} />
              <div>
                <div className="fs-h2" style={{ color: 'var(--text-primary)' }}>{detail.callerName}</div>
                <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                  {detail.relationshipTag} · {TYPE_LABEL[detail.callType]}
                </div>
              </div>
            </div>
            <div className="row-item">
              <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>时间</span>
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{formatWhen(detail.timestamp)}</span>
            </div>
            <div className="row-item">
              <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>时长</span>
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{formatDuration(detail.duration) || '—'}</span>
            </div>
            {detail.summary && (
              <div style={{ marginTop: 12 }}>
                <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>通话摘要</div>
                <div
                  className="glass"
                  style={{ borderRadius: 'var(--radius-sm)', padding: 12, color: 'var(--text-body)', fontSize: 'calc(13px * var(--fs-scale))', lineHeight: 1.7 }}
                >
                  {detail.summary}
                </div>
              </div>
            )}
            {!detail.isUnknown && characters.some((c) => c.id === detail.callerId) && (
              <button
                className="btn btn-accent pressable"
                style={{ width: '100%', marginTop: 14 }}
                onClick={() => {
                  const c = characters.find((x) => x.id === detail.callerId)
                  if (c) startCall(c)
                }}
              >
                <Phone size={15} /> 回拨
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function CallScreen({
  name,
  avatarId,
  lines,
  onEnd,
}: {
  name: string
  avatarId: string | null
  lines: string[]
  onEnd: (duration: number) => void
}) {
  const [active, setActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [shown, setShown] = useState(0)
  const startRef = useRef<number>(Date.now())

  useEffect(() => {
    const t = window.setTimeout(() => {
      setActive(true)
      startRef.current = Date.now()
    }, 1600)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    return () => window.clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!active) return
    if (shown >= lines.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 600 : 2200)
    return () => window.clearTimeout(t)
  }, [active, shown, lines.length])

  const end = () => {
    const dur = active ? Math.max(1, Math.round((Date.now() - startRef.current) / 1000)) : 0
    onEnd(dur)
  }

  return (
    <div
      className="no-select"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        background: 'linear-gradient(180deg, #0b0b0d 0%, #000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px 40px',
        animation: 'pageIn 240ms ease-out',
      }}
    >
      <Avatar imageId={avatarId} name={name} size={96} />
      <div className="fs-h1" style={{ color: 'var(--text-primary)', marginTop: 18 }}>{name}</div>
      <div className="mono fs-aux" style={{ color: 'var(--text-tertiary)', marginTop: 6 }}>
        {active ? formatDuration(seconds) || '00:00' : '正在呼叫…'}
      </div>

      <div style={{ flex: 1, width: '100%', maxWidth: 320, marginTop: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.slice(0, shown).map((l, i) => (
          <div
            key={i}
            className="glass"
            style={{ borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--text-body)', fontSize: 'calc(14px * var(--fs-scale))', lineHeight: 1.6, animation: 'pageIn 220ms ease-out' }}
          >
            {l}
          </div>
        ))}
      </div>

      <button
        className="pressable"
        onClick={end}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#ff3b30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(255,59,48,0.45)',
        }}
      >
        <PhoneOff size={26} color="#fff" />
      </button>
    </div>
  )
}