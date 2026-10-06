import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Users,
  BookOpen,
  Eye,
  RefreshCw,
  Send,
  ChevronDown,
  Sparkles,
  BedDouble,
  CalendarDays,
  X,
  Lock,
} from 'lucide-react'
import type { Character } from '../../store/characters'
import { useCharacters } from '../../store/characters'
import { useWorld, USER_ID, relationId, privateKey } from '../../store/world'
import { useSchedule } from '../../store/schedule'
import type { AutoItem } from '../../store/schedule'
import { autoItemStatus } from '../../lib/scheduleEngine'
import { ensureWorldDay, todayEvent, displayNameOf } from '../../lib/worldLife'
import { generateDiary, generateInnerVoice, generatePrivateThread } from '../../lib/worldEngine'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { ATTITUDE_LABEL, EMOTION_STYLES } from '../../lib/worldStyle'
import { useToast } from '../../store/ui'
import Avatar from './Avatar'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Panel = null | 'relations' | 'diary' | 'peek'

export default function WorldView({
  character,
  act,
  onOpenSchedule,
  onEnterChat,
  onSendText,
}: {
  character: Character
  act: { label: string; progress: number; isSleep: boolean }
  onOpenSchedule: () => void
  onEnterChat: () => void
  onSendText: (text: string) => void
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [peekTargetId, setPeekTargetId] = useState<string | null>(null)
  const [inner, setInner] = useState<string | null>(null)
  const [innerLoading, setInnerLoading] = useState(false)
  const [input, setInput] = useState('')
  const event = useWorld((s) => s.events.filter((e) => e.date === todayKey()).slice(-1)[0] ?? null)
  const relToUser = useWorld((s) => s.relations.find((r) => r.id === relationId(character.id, USER_ID)))
  const emotion = useWorld((s) => s.emotions[character.id])
  const preset = character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()

  useEffect(() => {
    ensureWorldDay()
  }, [character.id])

  // 进入角色世界：随机触发一次心里话（偷看内心）
  useEffect(() => {
    let cancelled = false
    const roll = async () => {
      if (Math.random() > 0.4 || !preset?.baseUrl) return
      setInnerLoading(true)
      const text = await generateInnerVoice(character, preset)
      if (cancelled) return
      setInnerLoading(false)
      if (text) {
        setInner(text)
        useWorld.getState().addInnerVoice(character.id, text)
      }
    }
    void roll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    onSendText(text)
  }

  const emo = emotion ?? { surface: '平静', intensity: 20 }
  const styleHint = EMOTION_STYLES[emo.surface] ?? ''

  if (panel === 'peek' && peekTargetId) {
    const target = useCharacters.getState().characters.find((c) => c.id === peekTargetId)
    if (target) {
      return (
        <PeekPanel a={character} b={target} presetBaseUrl={!!preset?.baseUrl} onBack={() => setPanel('relations')} />
      )
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {panel === 'relations' && (
        <RelationPanel
          character={character}
          onPeek={(targetId) => {
            setPeekTargetId(targetId)
            setPanel('peek')
          }}
        />
      )}
      {panel === 'diary' && <DiaryPanel character={character} presetBaseUrl={!!preset?.baseUrl} />}

      {panel === null && (
        <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 角色信息卡 */}
          <div className="glass" style={{ borderRadius: 14, padding: '14px 14px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar imageId={character.avatarId} name={character.name} size={52} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="fs-h3" style={{ color: 'var(--text-primary)' }}>{character.name}</span>
                {relToUser && (
                  <span className="fs-micro" style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, background: '#f5f5f5', color: '#111111', fontWeight: 600 }}>
                    {ATTITUDE_LABEL[relToUser.attitude]}
                  </span>
                )}
                <span className="fs-micro" style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  {emo.surface} {emo.intensity}
                </span>
              </div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {act.isSleep && <BedDouble size={11} />}
                {act.isSleep ? '睡觉中' : `正在：${act.label}（${act.progress}%）`}
              </div>
              {styleHint && (
                <div className="fs-micro" style={{ color: 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {styleHint}
                </div>
              )}
            </div>
          </div>

          {/* 心里话 */}
          {(inner || innerLoading) && (
            <div className="glass" style={{ borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', borderLeft: '2px solid rgba(255,255,255,0.4)' }}>
              <Sparkles size={13} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span className="fs-body" style={{ flex: 1, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {innerLoading ? '（正在偷听内心…）' : inner}
              </span>
              {inner && (
                <button className="pressable" onClick={() => setInner(null)} style={{ color: 'var(--text-disabled)', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* 今日动态事件 */}
          {event && (
            <div className="glass" style={{ borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f5f5f5', flexShrink: 0 }} />
                今日事件 · {event.type}
              </div>
              <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{event.description}</div>
            </div>
          )}

          {/* 今日行程时间线 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', flex: 1 }}>今日行程</span>
              <button className="pressable" onClick={onOpenSchedule} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', padding: 4 }}>
                <CalendarDays size={12} />
                <span className="fs-micro">全部日程</span>
              </button>
            </div>
            <TodayTimeline characterId={character.id} />
          </div>

          {/* 快捷入口 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <EntryBtn icon={<Users size={15} />} label="关系面板" onClick={() => setPanel('relations')} />
            <EntryBtn icon={<BookOpen size={15} />} label="日记" onClick={() => setPanel('diary')} />
            <EntryBtn icon={<Eye size={15} />} label="偷看私聊" onClick={() => setPanel('relations')} />
          </div>
        </div>
      )}

      {/* 底部输入框 */}
      {panel === null && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="pressable" onClick={onEnterChat} style={{ color: 'var(--text-secondary)', padding: 6 }} title="聊天记录">
            <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={`和 ${character.name} 说点什么…`}
            maxLength={500}
            style={{ flex: 1 }}
          />
          <button
            className="pressable"
            onClick={send}
            style={{ background: '#f5f5f5', color: '#111111', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            title="发送"
          >
            <Send size={16} />
          </button>
        </div>
      )}
      {panel !== null && (
        <button
          className="pressable"
          onClick={() => {
            setPanel(null)
            setPeekTargetId(null)
          }}
          style={{ flexShrink: 0, margin: '10px 14px', padding: '9px 0', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
        >
          返回角色世界
        </button>
      )}
    </div>
  )
}

function EntryBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 0',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--text-secondary)',
      }}
    >
      {icon}
      <span className="fs-micro">{label}</span>
    </button>
  )
}

function TodayTimeline({ characterId }: { characterId: string }) {
  const autoToday = useSchedule((s) => s.autoDays[`${characterId}_${todayKey()}`])
  const items = useMemo<AutoItem[]>(() => autoToday?.items ?? [], [autoToday])
  const [expanded, setExpanded] = useState<string | null>(null)
  if (items.length === 0) {
    return <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '6px 0' }}>今日行程生成中…</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      <span style={{ position: 'absolute', left: 62, top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.1)' }} />
      {items.map((it) => {
        const status = autoItemStatus(it)
        const isOpen = expanded === it.id
        const showMoment = isOpen && status !== 'todo' && it.moment
        return (
          <div key={it.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              className="pressable"
              onClick={() => setExpanded((v) => (v === it.id ? null : it.id))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 10,
                textAlign: 'left',
                background: status === 'active' ? 'rgba(255,255,255,0.07)' : 'transparent',
              }}
            >
              <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)', width: 88, flexShrink: 0 }}>
                {it.start}-{it.end}
              </span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: status === 'active' ? '#f5f5f5' : status === 'done' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
              <span
                className="fs-body"
                style={{
                  flex: 1,
                  color: status === 'todo' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.label}
              </span>
              {status === 'active' && <TimelineBadge dark>进行中</TimelineBadge>}
              {status === 'done' && <TimelineBadge>已完成</TimelineBadge>}
              {status === 'todo' && <TimelineBadge dim>未开始</TimelineBadge>}
            </button>
            {showMoment && (
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7, padding: '0 10px 6px 96px' }}>
                {it.moment}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TimelineBadge({ children, dark, dim }: { children: ReactNode; dark?: boolean; dim?: boolean }) {
  return (
    <span
      className="fs-micro"
      style={{
        flexShrink: 0,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        lineHeight: 1.5,
        background: dark ? '#f5f5f5' : 'rgba(255,255,255,0.06)',
        color: dark ? '#111111' : dim ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {children}
    </span>
  )
}

// ---------- 关系面板 ----------

function RelationPanel({ character, onPeek }: { character: Character; onPeek: (targetId: string) => void }) {
  const relations = useWorld((s) => s.relations)
  const characters = useCharacters((s) => s.characters)
  const [expanded, setExpanded] = useState<string | null>(null)
  const outgoing = relations.filter((r) => r.fromId === character.id)
  const incoming = relations.filter((r) => r.toId === character.id && r.fromId !== USER_ID)

  const Row = ({ rel, showPeek }: { rel: (typeof relations)[number]; showPeek: boolean }) => {
    const isOpen = expanded === rel.id
    const targetIsChar = characters.some((c) => c.id === rel.toId)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          className="pressable"
          onClick={() => setExpanded((v) => (v === rel.id ? null : rel.id))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'left',
          }}
        >
          <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayNameOf(rel.toId)}</span>
            {rel.isSecret && <Lock size={10} color="rgba(255,255,255,0.35)" />}
          </span>
          <span
            className="fs-micro"
            style={{
              flexShrink: 0,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 10,
              background:
                rel.attitude === '喜欢' || rel.attitude === '爱慕' ? '#f5f5f5' : rel.attitude === '讨厌' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
              color:
                rel.attitude === '讨厌'
                  ? 'rgba(255,255,255,0.5)'
                  : rel.attitude === '喜欢' || rel.attitude === '爱慕'
                    ? '#111111'
                    : 'rgba(255,255,255,0.65)',
              fontWeight: rel.attitude === '喜欢' || rel.attitude === '爱慕' ? 600 : 400,
            }}
          >
            {ATTITUDE_LABEL[rel.attitude]}
          </span>
          <span style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
            <span style={{ display: 'block', width: `${rel.intensity}%`, height: '100%', background: '#f5f5f5' }} />
          </span>
          <span className="fs-micro mono" style={{ color: 'var(--text-disabled)', width: 20, textAlign: 'right', flexShrink: 0 }}>{rel.intensity}</span>
        </button>
        {isOpen && (
          <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rel.history.length === 0 && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>还没有互动记录</span>}
            {rel.history.slice(-5).reverse().map((h, i) => (
              <span key={i} className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                <span className="mono" style={{ marginRight: 6 }}>{new Date(h.time).toTimeString().slice(0, 5)}</span>
                {h.desc}
              </span>
            ))}
            {showPeek && targetIsChar && (
              <button
                className="pressable"
                onClick={() => onPeek(rel.toId)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', padding: '7px 0', justifyContent: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.07)' }}
              >
                <Eye size={12} />
                <span className="fs-micro">偷看他们聊了什么</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>TA 对别人的态度</div>
      {outgoing.map((r) => (
        <Row key={r.id} rel={r} showPeek={r.toId !== USER_ID} />
      ))}
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 8 }}>别人对 TA 的态度</div>
      {incoming.map((r) => (
        <Row key={r.id} rel={r} showPeek />
      ))}
    </div>
  )
}

// ---------- 日记面板 ----------

function DiaryPanel({ character, presetBaseUrl }: { character: Character; presetBaseUrl: boolean }) {
  const diaries = useWorld((s) => s.diaries.filter((d) => d.characterId === character.id))
  const push = useToast((s) => s.push)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const preset = character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()
  const today = todayKey()
  const todayDiary = diaries.find((d) => d.date === today)
  const history = diaries.slice().reverse()

  const generate = async () => {
    if (!presetBaseUrl) {
      push('请先配置聊天 API，角色才能写日记', 'error')
      return
    }
    setGenerating(true)
    const r = await generateDiary(character, preset!)
    setGenerating(false)
    if (!r) {
      push('日记生成失败，请检查 API 配置', 'error')
      return
    }
    useWorld.getState().addDiary({ characterId: character.id, date: today, content: r.content, mood: r.mood, mentions: r.mentions })
    push('日记已生成')
  }

  return (
    <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!todayDiary && (
        <button
          className="pressable"
          onClick={() => void generate()}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, background: '#f5f5f5', color: '#111111', fontWeight: 600 }}
        >
          <RefreshCw size={13} style={generating ? { animation: 'spin 1s linear infinite' } : undefined} />
          <span className="fs-micro">{generating ? '角色正在写日记…' : '生成今日日记'}</span>
        </button>
      )}
      {history.map((d) => {
        const isOpen = expanded === d.id
        return (
          <button
            key={d.id}
            className="pressable"
            onClick={() => setExpanded((v) => (v === d.id ? null : d.id))}
            style={{ display: 'block', textAlign: 'left', background: d.date === today ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{d.date}</span>
              <span className="fs-micro" style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.7)' }}>
                {d.mood}
              </span>
              {d.mentions.length > 0 && (
                <span className="fs-micro" style={{ color: 'var(--text-disabled)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  提到：{d.mentions.join('、')}
                </span>
              )}
            </div>
            <div
              className="fs-body"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                display: isOpen ? 'block' : '-webkit-box',
                WebkitLineClamp: isOpen ? undefined : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {d.content}
            </div>
            {!isOpen && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-disabled)', marginTop: 4 }}>
                <ChevronDown size={11} />
                <span className="fs-micro">展开全文</span>
              </span>
            )}
          </button>
        )
      })}
      {diaries.length === 0 && !generating && (
        <div className="fs-body" style={{ color: 'var(--text-tertiary)' }}>
          角色还没有写过日记。生成后每天都会根据情绪动态更新。
        </div>
      )}
    </div>
  )
}

// ---------- 偷看私聊 ----------

function PeekPanel({
  a,
  b,
  presetBaseUrl,
  onBack,
}: {
  a: Character
  b: Character
  presetBaseUrl: boolean
  onBack: () => void
}) {
  const key = privateKey(a.id, b.id)
  const thread = useWorld((s) => s.privateThreads[key])
  const [generating, setGenerating] = useState(false)
  const push = useToast((s) => s.push)
  const preset = a.apiPresetId ? getPresetById(a.apiPresetId) : getDefaultChatPreset()

  const generate = async () => {
    if (!presetBaseUrl) {
      push('请先配置聊天 API，才能偷看他们的私聊', 'error')
      return
    }
    setGenerating(true)
    const msgs = await generatePrivateThread(a, b, preset!)
    setGenerating(false)
    if (!msgs || msgs.length === 0) {
      push('私聊生成失败，请检查 API 配置', 'error')
      return
    }
    useWorld.getState().savePrivateThread(key, msgs)
  }

  return (
    <div className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 2 }}>
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)' }}>{a.name} 与 {b.name}</span>
      </div>
      <div className="fs-micro" style={{ flexShrink: 0, padding: '7px 14px', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Eye size={11} />
        你正在偷看…他们看不到你
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!thread && !generating && (
          <button
            className="pressable"
            onClick={() => void generate()}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, background: '#f5f5f5', color: '#111111', fontWeight: 600 }}
          >
            <Eye size={13} />
            <span className="fs-micro">生成私聊记录</span>
          </button>
        )}
        {generating && <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>正在偷听…</div>}
        {thread?.messages.map((m) => {
          const mine = m.senderId === a.id
          return (
            <div
              key={m.id}
              style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '80%', alignSelf: mine ? 'flex-end' : 'flex-start' }}
            >
              <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{mine ? a.name : b.name}</span>
              <div className={mine ? 'bubble bubble-right ksc-bubble' : 'bubble bubble-left ksc-bubble'} style={{ padding: '8px 12px', borderRadius: 14 }}>
                <span className="fs-body" style={{ color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
