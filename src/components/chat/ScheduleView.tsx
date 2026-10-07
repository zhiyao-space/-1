import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, Trash2, Moon, RefreshCw, BookOpen, Users, Armchair, Briefcase, Gamepad2, MessageCircle, UtensilsCrossed, ChevronDown, Sparkles } from 'lucide-react'
import { useSchedule, type ScheduleItem, type AutoItem, type AutoScheduleType } from '../../store/schedule'
import { ensureTodaySchedule, autoItemStatus } from '../../lib/scheduleEngine'
import { useToast } from '../../store/ui'
import { Modal } from '../common'
import type { Character } from '../../store/characters'

const TYPE_ICON: Record<AutoScheduleType, typeof Moon> = {
  日常: UtensilsCrossed,
  学习: BookOpen,
  社交: Users,
  独处: Armchair,
  打工: Briefcase,
  娱乐: Gamepad2,
  互动: MessageCircle,
  睡眠: Moon,
}

interface TimelineRow {
  id: string
  start: string
  end: string
  label: string
  isSleep: boolean
  auto: AutoItem | null
  manual: ScheduleItem | null
}

export default function ScheduleView({ character }: { character: Character }) {
  const characterId = character.id
  const items = useSchedule((s) => s.items)
  const routines = useSchedule((s) => s.routines)
  const reports = useSchedule((s) => s.reports)
  const autoDays = useSchedule((s) => s.autoDays)
  const [tab, setTab] = useState<'month' | 'day' | 'routine'>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    ensureTodaySchedule(character)
  }, [characterId])

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  const [selected, setSelected] = useState(todayStr)
  const autoToday = autoDays[`${characterId}_${todayStr}`]

  const byDate = useMemo(() => {
    void nowTick
    const map: Record<string, ScheduleItem[]> = {}
    for (const it of items) {
      if (it.characterId !== characterId && it.characterId !== 'global') continue
      if (!it.date) continue
      ;(map[it.date] ??= []).push(it)
    }
    return map
  }, [items, characterId, nowTick])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dayRows = useMemo<TimelineRow[]>(() => {
    void nowTick
    const rows: TimelineRow[] = []
    if (selected === todayStr && autoToday) {
      for (const a of autoToday.items) {
        rows.push({ id: a.id, start: a.start, end: a.end, label: a.label, isSleep: a.isSleep, auto: a, manual: null })
      }
    }
    for (const m of byDate[selected] ?? []) {
      rows.push({ id: m.id, start: m.start, end: m.end, label: m.label, isSleep: m.isSleep, auto: null, manual: m })
    }
    return rows.sort((a, b) => a.start.localeCompare(b.start))
  }, [byDate, selected, autoToday, todayStr, nowTick])

  const hasAutoOn = (ds: string) => ds === todayStr && (autoToday?.items.length ?? 0) > 0
  const charReports = reports.filter((r) => r.characterId === characterId)

  const regenerate = () => {
    ensureTodaySchedule(character, true)
    setExpanded(null)
    useToast.getState().push(`已按「${character.name}」的人设重新生成今日行程`)
  }

  return (
    <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <TabBtn active={tab === 'month'} onClick={() => setTab('month')} label="月视图" />
        <TabBtn active={tab === 'day'} onClick={() => setTab('day')} label="日视图" />
        <TabBtn active={tab === 'routine'} onClick={() => setTab('routine')} label="固定作息" />
      </div>

      {(tab === 'month' || tab === 'day') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="pressable btn" style={{ padding: '4px 12px' }} onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
            <span className="fs-h3 mono" style={{ flex: 1, textAlign: 'center', color: 'var(--text-primary)' }}>
              {year}年{month + 1}月
            </span>
            <button className="pressable btn" style={{ padding: '4px 12px' }} onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
            <button className="btn" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setAddOpen(true)}>
              <Plus size={13} /> 特殊事件
            </button>
          </div>

          {tab === 'month' && (
            <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
                  <div key={w} className="fs-micro" style={{ textAlign: 'center', color: 'var(--text-disabled)' }}>{w}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: startWeekday }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1
                  const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const has = (byDate[ds] ?? []).length > 0 || hasAutoOn(ds)
                  const isSel = ds === selected
                  const isToday = ds === todayStr
                  return (
                    <button
                      key={ds}
                      className="pressable"
                      onClick={() => {
                        setSelected(ds)
                        setTab('day')
                      }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 8,
                        position: 'relative',
                        fontSize: 12,
                        color: isSel ? '#000' : isToday ? '#f5f5f5' : 'var(--text-secondary)',
                        background: isSel ? '#f5f5f5' : 'rgba(255,255,255,0.04)',
                        border: isToday && !isSel ? '1px solid rgba(255,255,255,0.45)' : '1px solid transparent',
                      }}
                    >
                      {d}
                      {has && !isSel && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#f5f5f5' }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'day' && selected === todayStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', flex: 1 }}>
                今日行程由人设自动生成{autoToday ? ` · 生成于 ${new Date(autoToday.generatedAt).toTimeString().slice(0, 5)}` : ''}
              </span>
              <button className="pressable" onClick={regenerate} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', padding: 4 }} title="重新生成今日行程">
                <RefreshCw size={12} />
                <span className="fs-micro">重新生成</span>
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {selected === todayStr && (
              <span style={{ position: 'absolute', left: 62, top: 14, bottom: 14, width: 1, background: 'rgba(255,255,255,0.1)' }} />
            )}
            {dayRows.length === 0 && (
              <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '10px 0' }}>
                {selected === todayStr ? '今日行程生成中…' : '这一天还没有安排'}
              </div>
            )}
            {dayRows.map((row) => {
              const status = row.auto ? autoItemStatus(row.auto) : null
              const Icon = row.auto ? TYPE_ICON[row.auto.type] : Sparkles
              const isOpen = expanded === row.id
              const showMoment = row.auto && status !== 'todo' && row.auto.moment
              return (
                <button
                  key={row.id}
                  className="pressable"
                  onClick={() => setExpanded((v) => (v === row.id ? null : row.id))}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '9px 10px',
                    borderRadius: 10,
                    textAlign: 'left',
                    background: status === 'active' ? 'rgba(255,255,255,0.07)' : 'transparent',
                  }}
                >
                  <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)', width: 88, flexShrink: 0, paddingTop: 2 }}>
                    {row.start}-{row.end}
                  </span>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: status === 'active' ? '#f5f5f5' : 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon size={11} color={status === 'active' ? '#111111' : 'rgba(255,255,255,0.55)'} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                        {row.isSleep && <Moon size={12} color="rgba(255,255,255,0.5)" />}
                        {row.label}
                      </span>
                      {row.auto ? (
                        status === 'active' ? (
                          <Badge dark>进行中</Badge>
                        ) : status === 'done' ? (
                          <Badge>已完成</Badge>
                        ) : (
                          <Badge dim>未开始</Badge>
                        )
                      ) : (
                        <Badge outline>特殊事件</Badge>
                      )}
                    </span>
                    {showMoment && isOpen && (
                      <span className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7, paddingTop: 2 }}>
                        {row.auto!.moment}
                      </span>
                    )}
                    {showMoment && !isOpen && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-disabled)' }}>
                        <ChevronDown size={11} />
                        <span className="fs-micro">瞬间</span>
                      </span>
                    )}
                  </span>
                  {!row.auto && (
                    <span
                      className="pressable"
                      onClick={(e) => {
                        e.stopPropagation()
                        useSchedule.getState().removeItem(row.manual!.id)
                      }}
                      style={{ color: 'var(--text-tertiary)', padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'routine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setRoutineOpen(true)}>
            <Plus size={14} /> 添加固定作息
          </button>
          <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            每天首次打开日程时，系统会按人设自动生成今日行程；固定作息仍然优先生效。
          </div>
          {routines.filter((r) => r.characterId === characterId || r.characterId === 'global').length === 0 && (
            <div className="fs-body" style={{ color: 'var(--text-tertiary)' }}>
              还没有固定作息。添加后角色会按作息生活，睡觉时间自动进入昏睡模式。
            </div>
          )}
          {routines
            .filter((r) => r.characterId === characterId || r.characterId === 'global')
            .map((r) => (
              <div key={r.id} className="glass" style={{ borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)', width: 88 }}>
                  {r.start}-{r.end}
                </span>
                <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {r.isSleep && <Moon size={12} color="var(--accent-color)" />}
                  {r.label}
                  {r.characterId === 'global' && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>（全局）</span>}
                </span>
                <button className="pressable" onClick={() => useSchedule.getState().removeRoutine(r.id)} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>
      )}

      {charReports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>报备记录</div>
          {charReports.slice(-10).reverse().map((r) => (
            <div key={r.id} className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
              <span className="mono" style={{ flexShrink: 0 }}>
                {new Date(r.time).getHours().toString().padStart(2, '0')}:{new Date(r.time).getMinutes().toString().padStart(2, '0')}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                [{r.kind === 'checkin' ? '查岗' : '报备'}] {r.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <AddScheduleModal open={addOpen} onClose={() => setAddOpen(false)} characterId={characterId} defaultDate={selected} />
      <AddRoutineModal open={routineOpen} onClose={() => setRoutineOpen(false)} characterId={characterId} />
    </div>
  )
}

function Badge({ children, dark, dim, outline }: { children: ReactNode; dark?: boolean; dim?: boolean; outline?: boolean }) {
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
        border: outline ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {children}
    </span>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className="btn pressable"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '7px 0',
        background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
      }}
    >
      {label}
    </button>
  )
}

function AddScheduleModal({
  open,
  onClose,
  characterId,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  characterId: string
  defaultDate: string
}) {
  const [date, setDate] = useState(defaultDate)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')
  const [label, setLabel] = useState('')
  const [isSleep, setIsSleep] = useState(false)
  const push = useToast((s) => s.push)

  const save = () => {
    if (!label.trim()) {
      push('请填写事项', 'error')
      return
    }
    useSchedule.getState().addItem({ characterId, date, start, end, label: label.trim(), isSleep })
    push('特殊事件已添加')
    setLabel('')
    setIsSleep(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="添加特殊事件">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1 }} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ flex: 1 }} />
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="事项（如：约会 / 看演出）" maxLength={20} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isSleep} onChange={(e) => setIsSleep(e.target.checked)} />
          <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>标记为睡眠时段（触发昏睡模式）</span>
        </label>
        <button className="btn btn-accent" onClick={save}>保存</button>
      </div>
    </Modal>
  )
}

function AddRoutineModal({
  open,
  onClose,
  characterId,
}: {
  open: boolean
  onClose: () => void
  characterId: string
}) {
  const [start, setStart] = useState('23:00')
  const [end, setEnd] = useState('07:00')
  const [label, setLabel] = useState('')
  const [isSleep, setIsSleep] = useState(false)
  const [global, setGlobal] = useState(false)
  const push = useToast((s) => s.push)

  const save = () => {
    if (!label.trim()) {
      push('请填写标签', 'error')
      return
    }
    useSchedule.getState().addRoutine({ characterId: global ? 'global' : characterId, start, end, label: label.trim(), isSleep })
    push('作息已保存')
    setLabel('')
    setIsSleep(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="添加固定作息">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1 }} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ flex: 1 }} />
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="标签（如：睡觉 / 上班）" maxLength={16} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isSleep} onChange={(e) => setIsSleep(e.target.checked)} />
          <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>睡眠时段（昏睡模式）</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} />
          <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>应用到所有角色</span>
        </label>
        <button className="btn btn-accent" onClick={save}>保存</button>
      </div>
    </Modal>
  )
}
