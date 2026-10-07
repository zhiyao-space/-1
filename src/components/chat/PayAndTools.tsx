import { useRef, useState } from 'react'
import { Camera, Mic, Type, Square } from 'lucide-react'
import { Modal } from '../common'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { recordVoice } from './Cards'
import { putBlob } from '../../lib/idb'

export function TransferModal({
  open,
  onClose,
  targets,
  onSend,
}: {
  open: boolean
  onClose: () => void
  targets: { id: string; name: string }[]
  onSend: (targetId: string, targetName: string, amount: number, note: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const push = useToast((s) => s.push)

  const send = () => {
    const n = Number(amount)
    if (!n || n <= 0) {
      push('请输入有效金额', 'error')
      return
    }
    const t = targets.find((x) => x.id === targetId) ?? targets[0]
    onSend(t.id, t.name, n, note.trim())
    setAmount('')
    setNote('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="转账">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {targets.length > 1 && (
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金额（元）" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（可选）" maxLength={20} />
        <button className="btn btn-accent" onClick={send}>确认转账</button>
      </div>
    </Modal>
  )
}

export function RedPacketModal({
  open,
  onClose,
  targets,
  onSend,
}: {
  open: boolean
  onClose: () => void
  targets: { id: string; name: string }[]
  onSend: (payload: {
    targetId?: string
    targetName: string
    amount: number
    note: string
    kind: 'exclusive' | 'normal' | 'password'
    password?: string
    cover: string
  }) => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<'exclusive' | 'normal' | 'password'>('normal')
  const [password, setPassword] = useState('')
  const [cover, setCover] = useState('red')
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const push = useToast((s) => s.push)

  const send = () => {
    const n = Number(amount)
    if (!n || n <= 0) {
      push('请输入有效金额', 'error')
      return
    }
    if (kind === 'password' && !password.trim()) {
      push('请设置口令', 'error')
      return
    }
    const t = targets.find((x) => x.id === targetId)
    onSend({
      targetId: kind === 'exclusive' ? t?.id : undefined,
      targetName: kind === 'exclusive' ? t?.name ?? '' : '',
      amount: n,
      note: note.trim(),
      kind,
      password: kind === 'password' ? password.trim() : undefined,
      cover,
    })
    setAmount('')
    setNote('')
    setPassword('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="发红包" width={340}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金额（元）" />
        {kind !== 'password' && <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="祝福语（可选）" maxLength={24} />}
        {kind === 'password' && <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="口令（角色说出即可领取）" maxLength={12} />}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['normal', 'exclusive', 'password'] as const).map((k) => (
            <button
              key={k}
              className="btn pressable"
              style={{ flex: 1, padding: '6px 0', background: kind === k ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)', color: kind === k ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              onClick={() => setKind(k)}
            >
              {k === 'normal' ? '普通' : k === 'exclusive' ? '专属' : '口令'}
            </button>
          ))}
        </div>
        {kind === 'exclusive' && targets.length > 1 && (
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>专属给：{t.name}</option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['red', 'gold', 'plum'] as const).map((c) => (
            <button
              key={c}
              className="pressable"
              onClick={() => setCover(c)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 10,
                background: c === 'red' ? 'linear-gradient(135deg,#e34d4d,#c02f2f)' : c === 'gold' ? 'linear-gradient(135deg,#d99a3d,#b4762a)' : 'linear-gradient(135deg,#9a4d8f,#6e2f66)',
                border: cover === c ? '2px solid #fff' : '2px solid transparent',
              }}
            />
          ))}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>红包 24 小时未领取自动过期</div>
        <button className="btn btn-accent" onClick={send}>塞钱进红包</button>
      </div>
    </Modal>
  )
}

export function ReverseReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { kind: 'image' | 'text' | 'voice'; imageId?: string; voiceId?: string; seconds?: number; text: string }) => void
}) {
  const [mode, setMode] = useState<'text' | 'image' | 'voice'>('text')
  const [text, setText] = useState('')
  const [imageId, setImageId] = useState<string | null>(null)
  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [recording, setRecording] = useState(false)
  const push = useToast((s) => s.push)
  const stopRef = useRef<(() => void) | null>(null)

  const pickImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const id = await putBlob(file)
      setImageId(id)
      setMode('image')
    }
    input.click()
  }

  const toggleRecord = async () => {
    if (recording) {
      stopRef.current?.()
      return
    }
    const r = await recordVoice()
    if (!r) {
      push('无法访问麦克风', 'error')
      return
    }
    setRecording(true)
    const id = await putBlob(r.blob)
    setVoiceId(id)
    setSeconds(r.seconds)
    stopRef.current = () => {
      setRecording(false)
      setMode('voice')
    }
    setTimeout(() => {
      if (recording) stopRef.current?.()
    }, 31000)
  }

  const submit = () => {
    if (mode === 'image' && !imageId) {
      push('请先选择图片', 'error')
      return
    }
    if (mode === 'voice' && !voiceId) {
      push('请先录音', 'error')
      return
    }
    if (mode === 'text' && !text.trim()) {
      push('请填写留言', 'error')
      return
    }
    onSubmit({ kind: mode, imageId: imageId ?? undefined, voiceId: voiceId ?? undefined, seconds, text: text.trim() })
    setText('')
    setImageId(null)
    setVoiceId(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="报备">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <ModeIcon active={mode === 'image'} icon={<Camera size={19} />} label="拍照" onClick={pickImage} />
          <ModeIcon active={mode === 'text'} icon={<Type size={19} />} label="文字" onClick={() => setMode('text')} />
          <ModeIcon active={mode === 'voice' || recording} icon={recording ? <Square size={17} /> : <Mic size={19} />} label={recording ? '停止' : '语音'} onClick={toggleRecord} />
        </div>
        {imageId && <ImagePreview id={imageId} />}
        {voiceId && !recording && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>已录制 {seconds} 秒语音</div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="留言（可选，角色会根据内容回应）"
          rows={2}
          style={{ resize: 'none', lineHeight: 1.6 }}
        />
        <button className="btn btn-accent" onClick={submit}>提交报备</button>
      </div>
    </Modal>
  )
}

function ModeIcon({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="pressable" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 44, height: 44, borderRadius: '50%', background: active ? 'var(--accent-color)' : 'rgba(255,255,255,0.08)', color: active ? '#000' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </button>
  )
}

function ImagePreview({ id }: { id: string }) {
  const url = useBlobURL(id)
  if (!url) return null
  return <img src={url} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 10 }} />
}

export function beep(times = 2) {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.value = 0.06
      osc.start(ctx.currentTime + i * 0.5)
      osc.stop(ctx.currentTime + i * 0.5 + 0.3)
    }
    setTimeout(() => ctx.close(), times * 500 + 600)
  } catch {
    /* audio unavailable */
  }
}

export function whiteNoiseStart(): () => void {
  try {
    const ctx = new AudioContext()
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const gain = ctx.createGain()
    gain.gain.value = 0.02
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start()
    return () => {
      src.stop()
      ctx.close()
    }
  } catch {
    return () => {}
  }
}
