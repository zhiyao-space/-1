import { useMemo, useState } from 'react'
import {
  Bot,
  Crown,
  Download,
  MapPin,
  Plus,
  Search,
  Send,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react'
import {
  DISTRICTS,
  LANDMARKS,
  OCCUPATIONS,
  localPerson,
  localWorldEvent,
  pick,
  randInt,
} from '../../lib/cityCatalog'
import { askAgent, generateEventDraft, generatePersonDrafts, hasCityAi, localFeed } from '../../lib/cityEngine'
import {
  ADMIN_PERMISSION_LABEL,
  fmtCityTime,
  useMe,
  useMulCity,
  type AdminPermission,
  type Person,
  type PersonType,
} from '../../store/mulCity'
import { Avatar, Card, Empty, Field, Row, Sheet, Stat, SubTabs, fmtWhen } from './cityParts'

/* ============================================================
   Tab8 · 管理（AI 管理员系统）
   市籍.程行 | 人物管理 | 事件管理 | 系统设置
   ============================================================ */

type Sub = 'agent' | 'people' | 'events' | 'settings'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'agent', label: '市籍.程行' },
  { key: 'people', label: '人物管理' },
  { key: 'events', label: '事件管理' },
  { key: 'settings', label: '系统设置' },
]

const uid = () => Math.random().toString(36).slice(2, 9)
const PERMISSIONS = Object.keys(ADMIN_PERMISSION_LABEL) as AdminPermission[]

export default function AdminTab({ onToast }: { onToast: (text: string) => void }) {
  const [sub, setSub] = useState<Sub>('agent')
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'agent' && <AgentPanel onToast={onToast} />}
      {sub === 'people' && <PeoplePanel onToast={onToast} />}
      {sub === 'events' && <EventPanel onToast={onToast} />}
      {sub === 'settings' && <SettingsPanel onToast={onToast} />}
    </>
  )
}

/* ============================================================
   市籍.程行 主控制台
   ============================================================ */

const QUICK: { key: string; label: string }[] = [
  { key: 'one', label: '生成一个新角色' },
  { key: 'batch', label: '生成一批 NPC' },
  { key: 'event', label: '推动一个世界事件' },
  { key: 'feed', label: '查看 Mul市今日动态' },
  { key: 'reset', label: '重置某人的市籍' },
  { key: 'tomorrow', label: '模拟明天会发生什么' },
  { key: 'speed', label: '调整 Mul市时间流速' },
]

function AgentPanel({ onToast }: { onToast: (text: string) => void }) {
  const me = useMe()
  const city = useMulCity((s) => s.city)
  const people = useMulCity((s) => s.people)
  const events = useMulCity((s) => s.worldEvents)
  const createPerson = useMulCity((s) => s.createPerson)
  const createNpcs = useMulCity((s) => s.createNpcs)
  const addWorldEvent = useMulCity((s) => s.addWorldEvent)
  const setTimeScale = useMulCity((s) => s.setTimeScale)
  const advanceHours = useMulCity((s) => s.advanceHours)
  const updatePerson = useMulCity((s) => s.updatePerson)
  const pushCivilRecord = useMulCity((s) => s.pushCivilRecord)

  const [log, setLog] = useState<{ id: string; role: 'user' | 'agent'; text: string }[]>([
    { id: 'hello', role: 'agent', text: '我是市籍.程行，Mul市 的市籍与秩序由我维护。告诉我你要做什么。' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const say = (role: 'user' | 'agent', text: string) => setLog((l) => [...l, { id: uid(), role, text }])

  const pushEvent = async (hint: string): Promise<string> => {
    const draft = await generateEventDraft(hint, people)
    if (draft) {
      const lm = LANDMARKS.find((l) => l.id === draft.locationId) ?? pick(LANDMARKS)
      const involved = draft.involvedNames
        .map((n) => people.find((p) => p.name === n)?.id)
        .filter((x): x is string => !!x)
      addWorldEvent({
        title: draft.title || '未命名事件',
        type: draft.type || '意外/偶遇',
        locationId: lm.id,
        time: Date.now() + randInt(1, 48) * 3600000,
        involvedPersons: involved,
        description: draft.description || '',
      })
      return `已推动事件「${draft.title}」，地点定在 ${lm.name}。`
    }
    const e = localWorldEvent(people)
    addWorldEvent({
      title: e.title,
      type: e.type,
      locationId: e.locationId,
      time: e.time,
      involvedPersons: e.involvedPersons,
      description: e.description,
    })
    return `已推动事件「${e.title}」：${e.description}`
  }

  const spawnPerson = async (): Promise<string> => {
    const draft = (await generatePersonDrafts('', 1))[0]
    if (draft?.name) {
      const lm = LANDMARKS.find((l) => l.id === draft.lastSeenLocation) ?? pick(LANDMARKS)
      createPerson({
        type: 'character',
        name: draft.name,
        nickname: draft.nickname,
        gender: draft.gender,
        age: draft.age,
        occupation: draft.occupation,
        birthPlace: draft.birthPlace,
        bio: draft.bio,
        zodiac: draft.zodiac,
        mbti: draft.mbti,
        hobbies: draft.hobbies,
        address: draft.address || `${pick(DISTRICTS).name}一带`,
        lastSeenLocation: lm.id,
        attributes: { ...draft.attributes, socialCredit: 100, level: 1, cityContribution: 0 },
      })
      return `已生成新角色「${draft.name}」，${draft.occupation || '居民'}，常在 ${lm.name} 出没。市籍登记完成。`
    }
    const p = localPerson({ type: 'character' })
    createPerson({ type: 'character', name: p.name, occupation: p.occupation, lastSeenLocation: p.lastSeenLocation })
    return `未接入 LLM，已用本地模板生成「${p.name}」（${p.occupation}）。`
  }

  const resetOne = (): string => {
    const others = people.filter((p) => p.id !== me.id)
    if (!others.length) return '城里还没有其他居民。'
    const p = pick(others)
    updatePerson(p.id, { attributes: { ...p.attributes, level: 1, cityContribution: 0, socialCredit: 100 } })
    pushCivilRecord(`${p.name} 的市籍已被重置`)
    return `已重置「${p.name}」的市籍：等级归 1，贡献清零，社信恢复 100。`
  }

  const cycleSpeed = (): string => {
    const order = [0, 1, 2, 5]
    const next = order[(order.indexOf(city.timeScale) + 1) % order.length]
    setTimeScale(next)
    return `城市时间流速已调整为 ${next === 0 ? '暂停' : `${next} 倍`}。`
  }

  const runQuick = async (key: string) => {
    if (busy) return
    const label = QUICK.find((q) => q.key === key)?.label ?? key
    say('user', label)
    setBusy(true)
    let reply = ''
    try {
      if (key === 'one') reply = await spawnPerson()
      else if (key === 'batch') reply = `已批量生成 ${createNpcs(5).length} 位 NPC，分布到 Mul市 各处。`
      else if (key === 'event') reply = await pushEvent('')
      else if (key === 'feed') reply = localFeed(people, events).join('\n')
      else if (key === 'reset') reply = resetOne()
      else if (key === 'tomorrow') {
        advanceHours(24)
        reply = `时间已推进一天。${await pushEvent('明天 Mul市 会发生的一件事')}`
      } else if (key === 'speed') reply = cycleSpeed()
    } catch (err) {
      reply = `操作失败：${(err as Error).message}`
    }
    say('agent', reply)
    setBusy(false)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const history = log
      .filter((m) => m.id !== 'hello')
      .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.text }))
    say('user', text)
    setInput('')
    setBusy(true)
    const out = await askAgent(city, people, history, text)
    say('agent', out || '……')
    setBusy(false)
    onToast('市籍.程行 已回应')
  }

  return (
    <>
      <div className="cx-scroll">
        <Card front>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span className="cx-tag cx-tag--on" style={{ width: 46, height: 46, justifyContent: 'center' }}><Bot size={20} /></span>
            <div>
              <div className="cx-row__title">市籍.程行</div>
              <div className="cx-row__sub">Mul市 市籍系统管理员 · {hasCityAi() ? 'LLM 在线' : '本地模式'}</div>
            </div>
          </div>
          <div className="cx-stats" style={{ marginTop: 12 }}>
            <Stat value={people.length} label="居民总数" />
            <Stat value={events.length} label="世界事件" />
            <Stat value={city.timeScale === 0 ? '暂停' : `${city.timeScale}×`} label="时间流速" />
          </div>
        </Card>

        <div className="cx-sechead"><span className="cx-sechead__t">对话</span></div>
        <div className="cx-chat">
          {log.map((m) => (
            <div key={m.id} className={`cx-bubble ${m.role === 'user' ? 'cx-bubble--me' : 'cx-bubble--ai'}`}>
              {m.text}
            </div>
          ))}
          {busy && <div className="cx-bubble cx-bubble--ai">正在处理…</div>}
        </div>

        <div className="cx-sechead"><span className="cx-sechead__t">快捷指令</span></div>
        <Card>
          <div className="cx-acts">
            {QUICK.map((q) => (
              <button key={q.key} className="fx-btn fx-btn--front fx-press" onClick={() => void runQuick(q.key)} disabled={busy}>
                {q.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="cx-ai">
        <div className="cx-ai__field">
          <textarea
            rows={1}
            placeholder="告诉 AI 助手你要做什么…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
        </div>
        <button className="cx-ai__send fx-press" disabled={busy} onClick={() => void send()} aria-label="发送">
          <Send size={17} />
        </button>
      </div>
    </>
  )
}

/* ============================================================
   人物管理
   ============================================================ */

function PeoplePanel({ onToast }: { onToast: (text: string) => void }) {
  const people = useMulCity((s) => s.people)
  const admins = useMulCity((s) => s.admins)
  const removePerson = useMulCity((s) => s.removePerson)
  const importCharacters = useMulCity((s) => s.importCharacters)
  const [kw, setKw] = useState('')
  const [type, setType] = useState<'all' | PersonType>('all')
  const [sel, setSel] = useState<string[]>([])
  const [editing, setEditing] = useState<Person | null>(null)
  const [batch, setBatch] = useState(false)

  const list = useMemo(
    () =>
      people.filter((p) => {
        if (type !== 'all' && p.type !== type) return false
        if (kw && !p.name.includes(kw) && !p.nickname.includes(kw)) return false
        return true
      }),
    [people, type, kw]
  )

  const exportPeople = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: Date.now(), people }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mulcity-people.json'
    a.click()
    URL.revokeObjectURL(url)
    onToast('已导出居民数据')
  }

  const removeSelected = () => {
    if (!sel.length) return
    sel.forEach((id) => removePerson(id))
    onToast(`已删除 ${sel.length} 位居民`)
    setSel([])
  }

  const doImport = () => {
    const n = importCharacters()
    onToast(n ? `从恋爱 App 导入 ${n} 位角色` : '没有可导入的新角色')
  }

  return (
    <div className="cx-scroll">
      <Card front>
        <div className="cx-row__title"><Users size={15} /> 全城居民管理</div>
        <div className="cx-row__sub">共 {people.length} 位 · 管理员 {admins.length} 位</div>
        <div className="cx-acts" style={{ marginTop: 12 }}>
          <button className="fx-btn fx-btn--accent fx-press" onClick={() => setBatch(true)}><Plus size={14} /> 批量生成</button>
          <button className="fx-btn fx-press" onClick={doImport}>导入角色卡</button>
          <button className="fx-btn fx-press" onClick={exportPeople}><Download size={14} /> 导出</button>
          <button className="fx-btn fx-press cx-danger" onClick={removeSelected} disabled={!sel.length}><Trash2 size={14} /> 删除选中({sel.length})</button>
        </div>
      </Card>

      <div className="cx-acts" style={{ marginBottom: 4 }}>
        <span className="cx-tag cx-tag--front"><Search size={11} /></span>
        <input className="fx-input" style={{ flex: 1 }} placeholder="按姓名搜索" value={kw} onChange={(e) => setKw(e.target.value)} />
      </div>
      <div className="cx-acts" style={{ marginBottom: 4 }}>
        {(['all', 'user', 'character', 'npc'] as const).map((t) => (
          <button key={t} className={`cx-tag ${type === t ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setType(t)}>
            {t === 'all' ? '全部' : t === 'user' ? '用户' : t === 'character' ? '角色' : 'NPC'}
          </button>
        ))}
      </div>

      {list.length ? (
        list.map((p) => {
          const on = sel.includes(p.id)
          return (
            <Row
              key={p.id}
              thumb={<Avatar person={p} size={42} showOnline />}
              title={<>{p.name}{p.isAdmin && <span className="cx-tag cx-tag--on"><Crown size={10} /> 管理</span>}</>}
              sub={`${p.type === 'npc' ? 'NPC' : p.type === 'character' ? '角色' : '用户'} · ${p.occupation} · LV.${p.attributes.level}`}
              right={
                <span style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'}`}
                    onClick={(e) => { e.stopPropagation(); setSel((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id])) }}
                  >
                    {on ? '已选' : '选择'}
                  </button>
                  <button className="cx-tag cx-tag--front" onClick={(e) => { e.stopPropagation(); setEditing(p) }}>编辑</button>
                </span>
              }
            />
          )
        })
      ) : (
        <Empty icon={<Users size={26} />} text="没有符合条件的居民" />
      )}

      {editing && (
        <EditPersonSheet key={editing.id} person={editing} open onClose={() => setEditing(null)} onToast={onToast} />
      )}
      {batch && <BatchSheet open onClose={() => setBatch(false)} onToast={onToast} />}
    </div>
  )
}

function EditPersonSheet({
  person,
  open,
  onClose,
  onToast,
}: {
  person: Person
  open: boolean
  onClose: () => void
  onToast: (text: string) => void
}) {
  const admins = useMulCity((s) => s.admins)
  const updatePerson = useMulCity((s) => s.updatePerson)
  const grantAdmin = useMulCity((s) => s.grantAdmin)
  const revokeAdmin = useMulCity((s) => s.revokeAdmin)
  const [name, setName] = useState(person.name)
  const [nickname, setNickname] = useState(person.nickname)
  const [occupation, setOccupation] = useState(person.occupation)
  const [bio, setBio] = useState(person.bio)
  const [level, setLevel] = useState(person.attributes.level)
  const [credit, setCredit] = useState(person.attributes.socialCredit)
  const [isAdmin, setIsAdmin] = useState(person.isAdmin)
  const [perms, setPerms] = useState<AdminPermission[]>(
    admins.find((a) => a.personId === person.id)?.permissions ?? ['createPerson', 'editPerson']
  )

  const save = () => {
    updatePerson(person.id, {
      name: name.trim() || person.name,
      nickname: nickname.trim(),
      occupation: occupation.trim() || person.occupation,
      bio,
      attributes: { ...person.attributes, level, socialCredit: credit },
    })
    if (isAdmin) grantAdmin(person.id, perms)
    else if (person.isAdmin) revokeAdmin(person.id)
    onToast(`已更新「${name.trim() || person.name}」的档案`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`编辑档案 · ${person.civilId}`}>
      <Field label="姓名"><input className="fx-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="昵称"><input className="fx-input" value={nickname} onChange={(e) => setNickname(e.target.value)} /></Field>
      <Field label="职业"><input className="fx-input" value={occupation} onChange={(e) => setOccupation(e.target.value)} /></Field>
      <Field label="简介"><textarea className="fx-textarea" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></Field>
      <div className="cx-2col">
        <Field label="等级">
          <input className="fx-input" type="number" value={level} onChange={(e) => setLevel(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
        </Field>
        <Field label="社会信用">
          <input className="fx-input" type="number" value={credit} onChange={(e) => setCredit(Math.max(0, Number(e.target.value) || 0))} />
        </Field>
      </div>

      <div className="cx-hr" />
      <Field label="管理员权限">
        <button className={`cx-tag ${isAdmin ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setIsAdmin((v) => !v)}>
          <Shield size={11} /> {isAdmin ? '已授予管理员' : '授予管理员'}
        </button>
      </Field>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {PERMISSIONS.map((k) => {
            const on = perms.includes(k)
            return (
              <button
                key={k}
                className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'}`}
                onClick={() => setPerms((s) => (on ? s.filter((x) => x !== k) : [...s, k]))}
              >
                {ADMIN_PERMISSION_LABEL[k]}
              </button>
            )
          })}
        </div>
      )}

      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 12 }} onClick={save}>保存档案</button>
    </Sheet>
  )
}

function BatchSheet({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: (text: string) => void }) {
  const createNpcs = useMulCity((s) => s.createNpcs)
  const [count, setCount] = useState(5)
  const [districtId, setDistrictId] = useState(DISTRICTS[0].id)
  const [occupation, setOccupation] = useState('')

  const submit = () => {
    const ids = createNpcs(count, { districtId, occupation: occupation || undefined })
    onToast(`已生成 ${ids.length} 位 NPC`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="批量生成 NPC">
      <Field label="数量">
        <input className="fx-input" type="number" value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
      </Field>
      <Field label="分布区域">
        <select className="fx-input" value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
          {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="职业（可选）">
        <select className="fx-input" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
          <option value="">随机职业</option>
          {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit}>
        <Wand2 size={14} /> 生成 {count} 位 NPC
      </button>
    </Sheet>
  )
}

/* ============================================================
   事件管理
   ============================================================ */

const EVENT_TYPES = ['节日庆典', '突发事件', '商业活动', '意外/偶遇']

function EventPanel({ onToast }: { onToast: (text: string) => void }) {
  const people = useMulCity((s) => s.people)
  const events = useMulCity((s) => s.worldEvents)
  const addWorldEvent = useMulCity((s) => s.addWorldEvent)
  const removeWorldEvent = useMulCity((s) => s.removeWorldEvent)
  const resolveWorldEvent = useMulCity((s) => s.resolveWorldEvent)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')
  const [form, setForm] = useState({
    title: '',
    type: EVENT_TYPES[0],
    locationId: LANDMARKS[0].id,
    hours: 6,
    description: '',
    involved: [] as string[],
  })

  const aiFill = async () => {
    setBusy(true)
    const draft = await generateEventDraft(hint, people)
    if (draft) {
      const lm = LANDMARKS.find((l) => l.id === draft.locationId)
      setForm({
        title: draft.title || form.title,
        type: draft.type || form.type,
        locationId: lm?.id ?? form.locationId,
        hours: form.hours,
        description: draft.description || form.description,
        involved: draft.involvedNames.map((n) => people.find((p) => p.name === n)?.id).filter((x): x is string => !!x),
      })
      onToast('AI 已生成事件草稿')
    } else {
      onToast(hasCityAi() ? '生成失败，请重试' : '未接入 LLM，请手动填写')
    }
    setBusy(false)
  }

  const submit = () => {
    if (!form.title.trim()) {
      onToast('请填写事件标题')
      return
    }
    addWorldEvent({
      title: form.title.trim(),
      type: form.type,
      locationId: form.locationId,
      time: Date.now() + Math.max(0, form.hours) * 3600000,
      involvedPersons: form.involved,
      description: form.description,
    })
    onToast(`已创建事件「${form.title}」`)
    setForm({ title: '', type: EVENT_TYPES[0], locationId: LANDMARKS[0].id, hours: 6, description: '', involved: [] })
    setHint('')
    setOpen(false)
  }

  return (
    <div className="cx-scroll">
      <div className="cx-acts" style={{ marginBottom: 4 }}>
        <button className="fx-btn fx-btn--accent fx-press" onClick={() => setOpen(true)}><Plus size={14} /> 新建事件</button>
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">世界事件</span><span className="cx-sechead__sub">{events.length} 件</span></div>
      {events.length ? (
        events.map((e) => {
          const lm = LANDMARKS.find((l) => l.id === e.locationId)
          const involved = e.involvedPersons.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean)
          return (
            <Card key={e.id}>
              <div className="cx-row__title">
                <Sparkles size={14} /> {e.title}
                <span className="cx-tag" style={{ marginLeft: 'auto' }}>{e.type}</span>
              </div>
              <div className="cx-row__sub">{e.description}</div>
              <div className="cx-row__sub" style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><MapPin size={11} /> {lm?.name ?? '全城'}</span>
                <span>{fmtCityTime(e.time)}</span>
                {involved.length > 0 && <span>涉及 {involved.join('、')}</span>}
              </div>
              {e.outcome && <div className="cx-row__sub" style={{ marginTop: 6 }}>结果：{e.outcome}</div>}
              <div className="cx-acts" style={{ marginTop: 10 }}>
                {!e.outcome && (
                  <button className="cx-tag cx-tag--on fx-press" onClick={() => { resolveWorldEvent(e.id, '已处理'); onToast('事件已结案') }}>标记结案</button>
                )}
                <button className="cx-tag cx-tag--front fx-press cx-danger" onClick={() => { removeWorldEvent(e.id); onToast('事件已删除') }}>
                  <Trash2 size={11} /> 删除
                </button>
              </div>
            </Card>
          )
        })
      ) : (
        <Empty icon={<Sparkles size={26} />} text="还没有世界事件" hint="点上方新建，或让市籍.程行推动" />
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="新建世界事件">
        <Field label="让 AI 写一件事（一句话线索）">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="fx-input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="例如：音乐节前夕的停电" />
            <button className="fx-btn fx-btn--front fx-press" onClick={() => void aiFill()} disabled={busy}>
              <Wand2 size={14} /> {busy ? '生成中' : 'AI'}
            </button>
          </div>
        </Field>
        <div className="cx-hr" />
        <Field label="标题"><input className="fx-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="类型">
          <select className="fx-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="地点">
          <select className="fx-input" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            {LANDMARKS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="距今小时数">
          <input className="fx-input" type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>
        <Field label="描述"><textarea className="fx-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="涉及人物">
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {people.filter((p) => p.type !== 'user').slice(0, 24).map((p) => {
              const on = form.involved.includes(p.id)
              return (
                <Row
                  key={p.id}
                  thumb={<Avatar person={p} size={34} />}
                  title={p.name}
                  sub={p.occupation}
                  right={<span className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'}`}>{on ? '已选' : '选择'}</span>}
                  onClick={() => setForm((f) => ({ ...f, involved: on ? f.involved.filter((x) => x !== p.id) : [...f.involved, p.id] }))}
                />
              )
            })}
          </div>
        </Field>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit}>创建事件</button>
      </Sheet>
    </div>
  )
}

/* ============================================================
   系统设置
   ============================================================ */

const RATES = [
  { v: 0, label: '暂停' },
  { v: 1, label: '实时' },
  { v: 2, label: '2×' },
  { v: 5, label: '5×' },
]

const FESTIVALS = [
  { name: 'Mul市 开城日', date: '3月12日', desc: '全城灯亮到天亮。' },
  { name: '海滨音乐节', date: '7月首个周末', desc: '栈桥连开三晚。' },
  { name: '老城夜市节', date: '9月', desc: '一百多个摊子摆在城墙下。' },
  { name: '钟塔跨年夜', date: '12月31日', desc: '整点钟声后放烟火。' },
]

function SettingsPanel({ onToast }: { onToast: (text: string) => void }) {
  const city = useMulCity((s) => s.city)
  const civilRecords = useMulCity((s) => s.civilRecords)
  const setTimeScale = useMulCity((s) => s.setTimeScale)
  const setYear = useMulCity((s) => s.setYear)
  const setWeather = useMulCity((s) => s.setWeather)
  const resetWorld = useMulCity((s) => s.resetWorld)
  const [year, setYearLocal] = useState(city.year)

  const exportAll = () => {
    const s = useMulCity.getState()
    const data = {
      exportedAt: Date.now(),
      city: s.city,
      people: s.people,
      worldEvents: s.worldEvents,
      shows: s.shows,
      posts: s.posts,
      civilRecords: s.civilRecords,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mulcity-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    onToast('已导出 Mul市 数据备份')
  }

  const doReset = () => {
    if (!confirm('确定重置整个 Mul市 吗？所有人物、事件与票务都会回到初始状态。')) return
    resetWorld()
    onToast('Mul市 已重置')
  }

  return (
    <div className="cx-scroll">
      <div className="cx-sechead"><span className="cx-sechead__t"><Settings2 size={14} /> 城市时间</span></div>
      <Card>
        <div className="cx-row__sub" style={{ marginTop: 0 }}>时间流速会同时影响居民日程与事件推进。</div>
        <div className="cx-acts" style={{ marginTop: 10 }}>
          {RATES.map((r) => (
            <button key={r.v} className={`fx-btn fx-press ${city.timeScale === r.v ? 'fx-btn--front' : 'fx-btn--soft'}`} onClick={() => { setTimeScale(r.v); onToast(`时间流速：${r.label}`) }}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="cx-hr" />
        <div className="cx-2col">
          <Field label="Mul市年份">
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="fx-input" type="number" value={year} onChange={(e) => setYearLocal(Number(e.target.value) || city.year)} />
              <button className="fx-btn fx-btn--front fx-press" onClick={() => { setYear(year); onToast(`Mul市 年份设为 ${year}`) }}>应用</button>
            </div>
          </Field>
          <Field label="当前天气">
            <select className="fx-input" value={city.weather} onChange={(e) => { setWeather(e.target.value); onToast(`天气：${e.target.value}`) }}>
              {['晴', '多云', '阴', '小雨', '薄雾', '阵雨', '晴转多云', '微风'].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">节日 / 活动日历</span></div>
      <Card>
        {FESTIVALS.map((f) => (
          <Row key={f.name} icon={<Sparkles size={15} />} title={f.name} sub={f.desc} right={<span className="cx-tag">{f.date}</span>} />
        ))}
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">主题</span></div>
      <Card>
        <Row icon={<Shield size={15} />} title="厚块黑白渐变" sub="Mul市 默认视觉：立体块面 · 黑白灰阶 · 高对比" right={<span className="cx-tag cx-tag--on">使用中</span>} />
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">数据</span></div>
      <Card>
        <div className="cx-acts">
          <button className="fx-btn fx-btn--front fx-press" onClick={exportAll}><Download size={14} /> 导出备份</button>
          <button className="fx-btn fx-press cx-danger" onClick={doReset}><Trash2 size={14} /> 重置世界</button>
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">市籍操作日志</span></div>
      {civilRecords.length ? (
        civilRecords.slice(0, 12).map((r) => (
          <Row key={r.id} icon={<Users size={14} />} title={r.text} right={<span className="cx-muted" style={{ fontSize: 'calc(10px * var(--fs-scale))' }}>{fmtWhen(r.at)}</span>} />
        ))
      ) : (
        <Empty icon={<Users size={26} />} text="暂无记录" />
      )}
    </div>
  )
}
