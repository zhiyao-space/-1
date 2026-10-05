import { useEffect, useMemo, useState } from 'react'
import Avatar from '../chat/Avatar'
import { useSettings } from '../../store/settings'
import { useCharacters } from '../../store/characters'
import { useChats } from '../../store/chats'
import { useSms } from '../../store/sms'
import { useCalls } from '../../store/calls'
import { useUI } from '../../store/ui'
import { useCopy } from '../../store/copy'
import { useDesktop, type ModuleStyles } from '../../store/desktopModules'
import { rollMonologueLine, rollSignature } from '../../lib/monologue'
import { CloudIcon, RefreshIcon } from './DockIcons'
import DesktopMusicCard from './DesktopMusicCard'
import { cardStyle } from './moduleStyle'

function relTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d === 2) return '前天'
  const dt = new Date(ts)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

const WEATHERS = [
  { label: '阴', temp: 18 },
  { label: '多云', temp: 20 },
  { label: '小雨', temp: 16 },
  { label: '晴', temp: 23 },
]

function TimeCard({ styles }: { styles: ModuleStyles }) {
  const [now, setNow] = useState(new Date())
  const signature = useSettings((s) => s.signature)
  const copySignature = useCopy((s) => s.texts.signature)
  const [fallbackSig] = useState(() => rollSignature())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const weather = WEATHERS[now.getDate() % WEATHERS.length]
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  const sig = copySignature.trim() || signature.trim() || fallbackSig

  return (
    <div className="no-select" style={{ ...cardStyle(styles), padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="mono" style={{ fontSize: 42, lineHeight: 1, color: '#ffffff', letterSpacing: '1px' }}>
            {hh}:{mm}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#888888' }}>
          <CloudIcon size={18} />
          <span className="fs-aux mono">{weather.temp}° {weather.label}</span>
        </div>
      </div>
      <div className="fs-aux" style={{ color: '#888888', marginTop: 6 }}>
        {now.getMonth() + 1}月{now.getDate()}日 星期{week}
      </div>
      <div
        className="fs-aux"
        style={{ color: '#888888', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        “{sig}”
      </div>
    </div>
  )
}

function MonologueCard({ styles }: { styles: ModuleStyles }) {
  const monologue = useDesktop((s) => s.monologue)
  const setMonologue = useDesktop((s) => s.setMonologue)
  const title = useCopy((s) => s.texts.monologueTitle)
  const customContent = useCopy((s) => s.texts.monologueContent)
  const emptyMonologue = useCopy((s) => s.texts.emptyMonologue)

  const hasCustom = customContent.trim().length > 0

  useEffect(() => {
    if (!hasCustom && !monologue) setMonologue(rollMonologueLine())
  }, [hasCustom, monologue, setMonologue])

  const body = hasCustom ? customContent : (monologue?.text ?? emptyMonologue)
  const author = hasCustom ? '' : (monologue?.author ?? '')

  return (
    <div className="no-select" style={{ ...cardStyle(styles), padding: '14px 16px', minHeight: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="fs-aux" style={{ color: '#888888', letterSpacing: '1px' }}>{title}</span>
        <button
          className="pressable"
          onClick={() => setMonologue(rollMonologueLine())}
          title="换一条"
          style={{ color: '#888888', padding: 2, display: 'flex' }}
        >
          <RefreshIcon size={15} />
        </button>
      </div>
      <div
        className="fs-body"
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: '#c0c0c0',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        “{body}”
      </div>
      {author && (
        <div className="fs-micro" style={{ textAlign: 'right', color: '#666666', marginTop: 10 }}>
          — {author}
        </div>
      )}
    </div>
  )
}

function RecentCard({ styles }: { styles: ModuleStyles }) {
  const characters = useCharacters((s) => s.characters)
  const sessions = useChats((s) => s.sessions)
  const sms = useSms((s) => s.messages)
  const calls = useCalls((s) => s.records)
  const openApp = useUI((s) => s.openApp)
  const setPendingChat = useUI((s) => s.setPendingChat)
  const title = useCopy((s) => s.texts.recentTitle)
  const emptyRecent = useCopy((s) => s.texts.emptyRecent)

  const items = useMemo(() => {
    const lastActive = new Map<string, number>()
    for (const s of sessions) {
      lastActive.set(s.characterId, Math.max(lastActive.get(s.characterId) ?? 0, s.lastActive))
    }
    return characters
      .map((c) => ({
        c,
        at: lastActive.get(c.id) ?? c.createdAt,
        unread:
          sms.filter((m) => m.senderId === c.id && !m.isRead && !m.outgoing).length +
          calls.filter((r) => r.callerId === c.id && r.callType === 'missed' && !r.isRead).length,
      }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 8)
  }, [characters, sessions, sms, calls])

  if (items.length === 0) {
    return (
      <div className="no-select" style={{ ...cardStyle(styles), padding: '14px 16px' }}>
        <div className="fs-aux" style={{ color: '#888888', letterSpacing: '1px', marginBottom: 8 }}>{title}</div>
        <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{emptyRecent}</div>
      </div>
    )
  }

  return (
    <div className="no-select" style={{ ...cardStyle(styles), padding: '14px 0 12px' }}>
      <div className="fs-aux" style={{ color: '#888888', letterSpacing: '1px', marginBottom: 10, padding: '0 16px' }}>{title}</div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '0 16px',
        }}
      >
        {items.map(({ c, at, unread }) => (
          <button
            key={c.id}
            className="pressable"
            onClick={() => {
              setPendingChat({ kind: 'single', characterId: c.id })
              openApp('chat')
            }}
            style={{ flexShrink: 0, width: 64, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              <Avatar imageId={c.avatarId} name={c.name} size={48} />
              {unread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#fe2c55',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.6)',
                  }}
                />
              )}
            </span>
            <span
              className="fs-micro"
              style={{ color: '#c0c0c0', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {c.name}
            </span>
            <span className="fs-micro" style={{ color: '#666666', marginTop: -4 }}>{relTime(at)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DesktopModules() {
  const styles = useDesktop((s) => s.styles)
  const visibility = useDesktop((s) => s.visibility)

  const anyVisible = visibility.time || visibility.monologue || visibility.recent || visibility.playing
  if (!anyVisible) return null

  return (
    <div style={{ marginBottom: 18 }}>
      {visibility.time && <TimeCard styles={styles} />}
      {visibility.monologue && <MonologueCard styles={styles} />}
      {visibility.recent && <RecentCard styles={styles} />}
      {visibility.playing && <DesktopMusicCard styles={styles} />}
    </div>
  )
}