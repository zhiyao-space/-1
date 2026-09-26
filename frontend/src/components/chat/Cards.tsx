import { useState } from 'react'
import { Banknote, Gift, Play, Dices, Clock } from 'lucide-react'
import type { MessageData } from '../../store/chats'
import { useBlobURL } from '../WallpaperLayer'

export function TransferCard({ data, mine }: { data: MessageData; mine: boolean }) {
  return (
    <div
      className="no-select"
      style={{
        width: 218,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f5a623, #e8890c)',
        color: '#fff',
        boxShadow: '0 4px 18px rgba(232,137,12,0.25)',
      }}
    >
      <div style={{ padding: '12px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Banknote size={18} />
          <span style={{ fontSize: 19, fontWeight: 700 }}>¥{(data.amount ?? 0).toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>{data.note || '转账给你'}</div>
      </div>
      <div style={{ padding: '5px 14px', fontSize: 10, background: 'rgba(0,0,0,0.12)', opacity: 0.85 }}>
        {mine ? '微信转账' : '收到转账'}
      </div>
    </div>
  )
}

const COVER_PRESETS: Record<string, [string, string]> = {
  red: ['#e34d4d', '#c02f2f'],
  gold: ['#d99a3d', '#b4762a'],
  plum: ['#9a4d8f', '#6e2f66'],
}

export function RedPacketCard({
  data,
  mine,
  ts,
  characterName,
  onClaim,
}: {
  data: MessageData
  mine: boolean
  ts: number
  characterName: string
  onClaim?: () => void
}) {
  const [pop, setPop] = useState(false)
  const expired = data.claimState === 'open' && Date.now() - ts > 24 * 3600 * 1000
  const claimed = data.claimState === 'claimed'
  const [c1, c2] = COVER_PRESETS[data.cover ?? 'red'] ?? COVER_PRESETS.red
  const isPassword = data.kind === 'password'

  return (
    <div
      className="no-select"
      style={{
        width: 218,
        borderRadius: 12,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        color: '#fff',
        boxShadow: '0 4px 18px rgba(194,47,47,0.25)',
      }}
    >
      <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Gift size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {isPassword ? `口令红包：${data.password ?? ''}` : data.note || '恭喜发财，大吉大利'}
          </div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
            {claimed
              ? `已领取 ¥${(data.claimAmount ?? 0).toFixed(2)}`
              : expired
                ? '已过期（24小时）'
                : mine
                  ? '等待领取'
                  : isPassword
                    ? '说出正确口令即可领取'
                    : '点击领取'}
          </div>
        </div>
      </div>
      {!mine && !claimed && !expired && data.claimState === 'open' && (
        <button
          className="pressable"
          onClick={() => {
            setPop(true)
            setTimeout(() => setPop(false), 700)
            onClaim?.()
          }}
          style={{
            width: '100%',
            padding: '9px 0',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.14)',
            color: '#fff',
            transform: pop ? 'scale(1.05)' : undefined,
            transition: 'transform 0.25s ease',
          }}
        >
          领取红包
        </button>
      )}
      <div style={{ padding: '5px 14px', fontSize: 10, background: 'rgba(0,0,0,0.12)', opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Clock size={9} /> {characterName}的红包
      </div>
    </div>
  )
}

export function VoiceBubble({ voiceId, seconds }: { voiceId?: string; seconds?: number }) {
  const url = useBlobURL(voiceId)
  const [playing, setPlaying] = useState(false)
  if (!url) return null
  return (
    <div
      className="no-select"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 13px',
        minWidth: 120,
      }}
    >
      <button
        className="pressable"
        onClick={() => {
          const el = document.getElementById(`voice-${voiceId}`) as HTMLAudioElement | null
          if (!el) return
          if (el.paused) {
            el.play()
            setPlaying(true)
          } else {
            el.pause()
            setPlaying(false)
          }
        }}
        style={{ color: 'inherit' }}
      >
        <Play size={15} />
      </button>
      <span className="fs-body" style={{ letterSpacing: 1 }}>
        {'▎'.repeat(Math.min(8, Math.max(3, Math.round((seconds ?? 2) / 1.5))))}
      </span>
      <span className="fs-micro">{seconds ?? 0}"</span>
      <audio
        id={`voice-${voiceId}`}
        src={url}
        onEnded={() => setPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export function DiceCard({ value }: { value?: number }) {
  const v = value ?? 1
  return (
    <div
      className="no-select"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
      }}
    >
      <Dices size={18} />
      <span className="fs-h3" style={{ fontWeight: 700 }}>{v}</span>
      <span className="fs-micro" style={{ opacity: 0.7 }}>点</span>
    </div>
  )
}

export function recordVoice(): Promise<{ blob: Blob; seconds: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      resolve(null)
      return
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const rec = new MediaRecorder(stream)
        const chunks: Blob[] = []
        const started = Date.now()
        rec.ondataavailable = (e) => chunks.push(e.data)
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          resolve({ blob: new Blob(chunks, { type: rec.mimeType }), seconds: Math.round((Date.now() - started) / 1000) })
        }
        rec.start()
        setTimeout(() => {
          if (rec.state !== 'inactive') rec.stop()
        }, 30000)
      })
      .catch(() => resolve(null))
  })
}
