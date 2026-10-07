import { useEffect, useState } from 'react'
import { useSettings } from '../../store/settings'
import { useCopy } from '../../store/copy'
import { useDesktop, type ModuleStyles } from '../../store/desktopModules'
import { rollMonologueLine, rollSignature } from '../../lib/monologue'
import { CloudIcon, RefreshIcon } from './DockIcons'
import DesktopMusicCard from './DesktopMusicCard'
import AdoreCard from './AdoreCard'
import { cardStyle } from './moduleStyle'

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

export default function DesktopModules() {
  const styles = useDesktop((s) => s.styles)
  const visibility = useDesktop((s) => s.visibility)

  const anyVisible = visibility.time || visibility.monologue || visibility.recent || visibility.playing
  if (!anyVisible) return null

  return (
    <div style={{ marginBottom: 18 }}>
      {visibility.time && <TimeCard styles={styles} />}
      {visibility.monologue && <MonologueCard styles={styles} />}
      {visibility.recent && <AdoreCard styles={styles} />}
      {visibility.playing && <DesktopMusicCard styles={styles} />}
    </div>
  )
}