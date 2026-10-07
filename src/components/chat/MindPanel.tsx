import { useState } from 'react'
import { X, Sparkles, MapPin } from 'lucide-react'
import { useMinds } from '../../store/interact'
import { useToast } from '../../store/ui'
import type { Character } from '../../store/characters'
import type { ChatMessage } from '../../store/chats'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { generateMindUpdate } from '../../lib/chatEngine'

function StatBar({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        <span className="fs-micro mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', marginTop: 4, opacity: 0.6 }} />
    </div>
  )
}

function MoodCurve({ history }: { history: { mood: number; time: number }[] }) {
  const points = history.slice(-20)
  if (points.length < 2) {
    return (
      <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '12px 0' }}>
        数据不足，生成几次心声后出现曲线
      </div>
    )
  }
  const w = 260
  const h = 56
  const step = w / (points.length - 1)
  const path = points.map((p, i) => `${i * step},${h - (p.mood / 100) * h}`).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
      <polyline points={path} fill="none" stroke="var(--accent-color)" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={i} cx={i * step} cy={h - (p.mood / 100) * h} r="1.8" fill="var(--accent-color)" />
      ))}
    </svg>
  )
}

export default function MindPanel({
  character,
  history,
  onClose,
}: {
  character: Character
  history: ChatMessage[]
  onClose: () => void
}) {
  const mind = useMinds((s) => s.minds[character.id])
  const update = useMinds((s) => s.update)
  const pushThought = useMinds((s) => s.pushThought)
  const push = useToast((s) => s.push)
  const [generating, setGenerating] = useState(false)
  const preset = character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()

  const cur = mind ?? { mood: 50, health: 80, sanity: 70, affection: 20, location: '', thought: '', history: [], updatedAt: 0 }

  const generate = async () => {
    if (!preset?.baseUrl) {
      push('请先配置聊天 API', 'error')
      return
    }
    setGenerating(true)
    const r = await generateMindUpdate(character, preset, history)
    setGenerating(false)
    if (!r) {
      push('心声生成失败，请检查 API 配置', 'error')
      return
    }
    pushThought(character.id, r.thought, r.mood, r.location)
    update(character.id, { affection: r.affection })
    push('心声已更新')
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 320, background: 'rgba(0,0,0,0.5)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="page-enter"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '82%',
          maxWidth: 320,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 16px 24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>心声</span>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', flex: 1 }}>当前想法</span>
            <button className="btn" style={{ padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }} onClick={generate} disabled={generating}>
              <Sparkles size={12} /> {generating ? '生成中…' : '生成'}
            </button>
          </div>
          <div className="glass" style={{ borderRadius: 12, padding: '12px 14px', minHeight: 56 }}>
            <div className="fs-body" style={{ color: cur.thought ? 'var(--text-primary)' : 'var(--text-disabled)', lineHeight: 1.7 }}>
              {cur.thought || '还没有心声。点击"生成"，听听 TA 此刻在想什么。'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatBar label="心情" value={cur.mood} onChange={(v) => update(character.id, { mood: v })} color="var(--accent-color)" />
          <StatBar label="健康" value={cur.health} onChange={(v) => update(character.id, { health: v })} color="#7ee2a8" />
          <StatBar label="理智" value={cur.sanity} onChange={(v) => update(character.id, { sanity: v })} color="#7ab8f5" />
          <StatBar label="好感度" value={cur.affection} onChange={(v) => update(character.id, { affection: v })} color="#f59ab8" />
        </div>

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>情绪波动</div>
          <MoodCurve history={cur.history} />
        </div>

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> 所在位置
          </div>
          <input
            value={cur.location}
            onChange={(e) => update(character.id, { location: e.target.value })}
            placeholder="TA 在哪里"
            maxLength={12}
          />
        </div>
      </div>
    </div>
  )
}
