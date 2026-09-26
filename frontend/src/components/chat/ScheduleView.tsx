import { useMemo, useState } from 'react'
import { Plus, Trash2, Moon } from 'lucide-react'
import { useSchedule, type ScheduleItem } from '../../store/schedule'
import { useToast } from '../../store/ui'
import { Modal } from '../common'

export default function ScheduleView({ characterId }: { characterId: string }) {
  const items = useSchedule((s) => s.items)
  const routines = useSchedule((s) => s.routines)
  const reports = useSchedule((s) => s.reports)
  const [tab, setTab] = useState<'month' | 'day' | 'routine'>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [routineOpen, setRoutineOpen] = useState(false)

  const byDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {}
    for (const it of items) {
      if (it.characterId !== characterId && it.characterId !== 'global') continue
      if (!it.date) continue
      ;(map[it.date] ??= []).push(it)
    }
    return map
  }, [items, characterId])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  const [selected, setSelected] = useState(todayStr)

  const dayItems = useMemo(
    () => (byDate[selected] ?? []).slice().sort((a, b) => a.start.localeCompare(b.start)),
    [byDate, selected]
  )
  const charReports = reports.filter((r) => r.characterId === characterId)

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
              <Plus size={13} /> 添加
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
                  const has = (byDate[ds] ?? []).length > 0
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
                        color: isSel ? '#000' : isToday ? 'var(--accent-color)' : 'var(--text-secondary)',
                        background: isSel ? 'var(--accent-color)' : 'rgba(255,255,255,0.04)',
                        border: isToday && !isSel ? '1px solid var(--accent-color)' : '1px solid transparent',
                      }}
                    >
                      {d}
                      {has && !isSel && <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-color)' }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{selected} 的日程</div>
            {dayItems.length === 0 && (
              <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '10px 0' }}>这一天还没有安排</div>
            )}
            {dayItems.map((it) => (
              <div key={it.id} className="glass" style={{ borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)', width: 88 }}>
                  {it.start}-{it.end}
                </span>
                <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {it.isSleep && <Moon size={12} color="var(--accent-color)" />}
                  {it.label}
                </span>
                <button className="pressable" onClick={() => useSchedule.getState().removeItem(it.id)} style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'routine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setRoutineOpen(true)}>
            <Plus size={14} /> 添加固定作息
          </button>
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
    push('日程已添加')
    setLabel('')
    setIsSleep(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="添加日程">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ flex: 1 }} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ flex: 1 }} />
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="事项（如：上班 / 上课）" maxLength={20} />
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
