import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Bus, CreditCard, Plane, TrainFront, Zap } from 'lucide-react'
import { AIRLINES, AIRCRAFTS, CITIES_CN, DESTINATIONS, HS_SEATS, METRO_LINES, TRAIN_SEATS, pick, randInt } from '../../lib/cityCatalog'
import { generateTravelStory, hasCityAi } from '../../lib/cityEngine'
import { fmtCityTime, landmarkById, useMe, useMulCity, type TicketKind } from '../../store/mulCity'
import { Card, Empty, Field, Row, SubTabs, fmtClock, fmtDateFull, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab3 · 出行（交通票务系统）
   机票 | 火车票 | 高铁 | 地铁 | 我的行程（含出行动画）
   ============================================================ */

type Sub = 'flight' | 'train' | 'hs' | 'metro' | 'trips'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'flight', label: '机票' },
  { key: 'train', label: '火车票' },
  { key: 'hs', label: '高铁' },
  { key: 'metro', label: '地铁' },
  { key: 'trips', label: '我的行程' },
]

const CABINS = [
  { name: '经济舱', mul: 1 },
  { name: '商务舱', mul: 2.4 },
  { name: '头等舱', mul: 3.8 },
]

const FROM_AIRPORT = 'Mul 国际机场'
const RAILWAY = '中央火车站'

export default function TravelTab() {
  const [sub, setSub] = useState<Sub>('flight')
  const [stage, setStage] = useState<StageState | null>(null)
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'flight' && <FlightPanel onStage={setStage} />}
      {sub === 'train' && <RailPanel kind="train" onStage={setStage} />}
      {sub === 'hs' && <RailPanel kind="high-speed" onStage={setStage} />}
      {sub === 'metro' && <MetroPanel onStage={setStage} />}
      {sub === 'trips' && <TripsPanel onStage={setStage} />}
      {stage && <TravelStage state={stage} onClose={() => setStage(null)} />}
    </>
  )
}

/* ---------- 支付 ---------- */

function usePay() {
  const me = useMe()
  const banks = useMulCity((s) => s.banks)
  const ensureBank = useMulCity((s) => s.ensureBank)
  const bankWithdraw = useMulCity((s) => s.bankWithdraw)
  const balance = banks.find((b) => b.personId === me.id)?.balance ?? me.bankAccount
  const pay = (amount: number): boolean => {
    ensureBank(me.id)
    return bankWithdraw(me.id, amount)
  }
  return { pay, balance, me }
}

/* ---------- 机票 ---------- */

interface FlightRow {
  no: string
  airline: string
  depAt: number
  arrAt: number
  aircraft: string
  base: number
  gate: string
}

function FlightPanel({ onStage }: { onStage: (s: StageState) => void }) {
  const [to, setTo] = useState(DESTINATIONS[0])
  const [date, setDate] = useState(fmtDateFull(Date.now() + 86400000))
  const [cabin, setCabin] = useState(CABINS[0].name)
  const [rows, setRows] = useState<FlightRow[]>([])
  const [picked, setPicked] = useState<FlightRow | null>(null)
  const [passengerId, setPassengerId] = useState('')
  const [msg, setMsg] = useState('')
  const { pay, balance, me } = usePay()
  const people = useMulCity((s) => s.people)
  const buy = useMulCity((s) => s.buyTransportTicket)

  const cabinMul = CABINS.find((c) => c.name === cabin)!.mul

  const query = () => {
    const base = new Date(date).getTime()
    const list: FlightRow[] = Array.from({ length: 5 }, (_, i) => {
      const dep = base + (6 + i * 3) * 3600000 + randInt(0, 40) * 60000
      const dur = randInt(120, 260) * 60000
      return {
        no: `${pick(['MU', 'CA', 'CZ', 'AZ'])}${randInt(1000, 9999)}`,
        airline: pick(AIRLINES),
        depAt: dep,
        arrAt: dep + dur,
        aircraft: pick(AIRCRAFTS),
        base: randInt(900, 3200),
        gate: `${pick(['A', 'B', 'C', 'D'])}${randInt(1, 38)}`,
      }
    })
    setRows(list)
    setPicked(null)
    setMsg('')
  }

  const confirm = () => {
    if (!picked) return
    const price = Math.round(picked.base * cabinMul)
    if (!pay(price)) {
      setMsg(`余额不足，还差 ¥${(price - balance).toFixed(0)}`)
      return
    }
    const id = buy({
      kind: 'flight',
      from: FROM_AIRPORT,
      to: `${to} 机场`,
      departAt: picked.depAt,
      arriveAt: picked.arrAt,
      seat: `${randInt(1, 42)}${pick(['A', 'C', 'D', 'F'])}`,
      gate: picked.gate,
      price,
      passengerId: passengerId || me.id,
    })
    setPicked(null)
    setMsg('出票成功，可在「我的行程」查看电子机票。')
    onStage({
      kind: 'flight',
      from: FROM_AIRPORT,
      to: `${to} 机场`,
      ticketId: id,
      title: `飞往 ${to}`,
      meetId: pick(people.filter((p) => p.type !== 'user')).id,
    })
  }

  return (
    <div className="cx-scroll">
      <Card>
        <Row icon={<Plane size={15} />} title="出发地" right={FROM_AIRPORT} />
        <Field label="目的地">
          <select className="fx-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <div className="cx-2col">
          <Field label="出发日期">
            <input className="fx-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="舱位">
            <select className="fx-input" value={cabin} onChange={(e) => setCabin(e.target.value)}>
              {CABINS.map((c) => <option key={c.name} value={c.name}>{c.name} ×{c.mul}</option>)}
            </select>
          </Field>
        </div>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={query}>查询航班</button>
      </Card>

      {rows.length > 0 && <div className="cx-sechead"><span className="cx-sechead__t">可选航班</span><span className="cx-sechead__sub">{fmtClock(rows[0].depAt)} 起</span></div>}
      {rows.map((r) => (
        <Row
          key={r.no}
          thumb={<span className="cx-tag cx-tag--front" style={{ width: 42, height: 42, justifyContent: 'center' }}><Plane size={16} /></span>}
          title={`${r.airline} ${r.no}`}
          sub={`${fmtClock(r.depAt)} → ${fmtClock(r.arrAt)} · ${r.aircraft} · 登机口 ${r.gate}`}
          right={<span className="cx-price">¥{Math.round(r.base * cabinMul)}</span>}
          onClick={() => { setPicked(r); setMsg('') }}
          arrow
        />
      ))}

      {picked && (
        <>
          <Card front>
            <div className="cx-row__title">确认订单</div>
            <Row title="航段" right={`${FROM_AIRPORT} → ${to}`} />
            <Row title="航班" right={`${picked.airline} ${picked.no}`} />
            <Row title="时间" right={`${fmtCityTime(picked.depAt)} 出发`} />
            <Row title="舱位" right={cabin} />
            <Row title="票价" right={<span className="cx-price">¥{Math.round(picked.base * cabinMul)}</span>} />
            <Field label="乘机人">
              <select className="fx-input" value={passengerId} onChange={(e) => setPassengerId(e.target.value)}>
                <option value="">{me.name}（本人）</option>
                {people.filter((p) => p.id !== me.id).slice(0, 20).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="cx-row__sub">账户余额 ¥{balance.toLocaleString()}</div>
            <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 10 }} onClick={confirm}>付款出票</button>
          </Card>
        </>
      )}
      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: msg.includes('成功') ? 'var(--fx-t1)' : '#ff8a8a' }}>{msg}</div>}
    </div>
  )
}

/* ---------- 火车 / 高铁 ---------- */

interface RailRow {
  no: string
  from: string
  to: string
  depAt: number
  arrAt: number
  price: number
  seat: string
}

function RailPanel({ kind, onStage }: { kind: 'train' | 'high-speed'; onStage: (s: StageState) => void }) {
  const seats = kind === 'train' ? TRAIN_SEATS : HS_SEATS
  const [to, setTo] = useState(CITIES_CN[0])
  const [date, setDate] = useState(fmtDateFull(Date.now() + 86400000))
  const [seat, setSeat] = useState(seats[0])
  const [rows, setRows] = useState<RailRow[]>([])
  const [picked, setPicked] = useState<RailRow | null>(null)
  const [msg, setMsg] = useState('')
  const { pay, balance, me } = usePay()
  const buy = useMulCity((s) => s.buyTransportTicket)
  const people = useMulCity((s) => s.people)
  const priceMul = kind === 'train' ? (seat === '软卧' ? 2.1 : seat === '硬卧' ? 1.5 : seat === '无座' ? 0.85 : 1) : seat === '商务座' ? 3 : seat === '一等座' ? 1.6 : 1

  const query = () => {
    const base = new Date(date).getTime()
    const prefix = kind === 'train' ? pick(['K', 'T', 'Z']) : 'G'
    const list: RailRow[] = Array.from({ length: 5 }, (_, i) => {
      const dep = base + (7 + i * 2) * 3600000 + randInt(0, 50) * 60000
      const dur = (kind === 'train' ? randInt(180, 700) : randInt(90, 340)) * 60000
      return {
        no: `${prefix}${randInt(100, 9999)}`,
        from: RAILWAY,
        to: `${to}站`,
        depAt: dep,
        arrAt: dep + dur,
        price: kind === 'train' ? randInt(90, 480) : randInt(320, 1150),
        seat,
      }
    })
    setRows(list)
    setPicked(null)
    setMsg('')
  }

  const confirm = () => {
    if (!picked) return
    const price = Math.round(picked.price * priceMul)
    if (!pay(price)) {
      setMsg(`余额不足，还差 ¥${(price - balance).toFixed(0)}`)
      return
    }
    const id = buy({
      kind: kind === 'train' ? 'train' : 'high-speed',
      from: RAILWAY,
      to: `${to}站`,
      departAt: picked.depAt,
      arriveAt: picked.arrAt,
      seat: `${randInt(1, 16)}车 ${randInt(1, 60)}${pick(['A', 'B', 'C', 'D', 'F'])}`,
      gate: `${randInt(1, 14)} 站台`,
      price,
      passengerId: me.id,
    })
    setPicked(null)
    setMsg('出票成功，可在「我的行程」查看。')
    onStage({
      kind: kind === 'train' ? 'train' : 'high-speed',
      from: RAILWAY,
      to: `${to}站`,
      ticketId: id,
      title: `前往 ${to}`,
      meetId: pick(people.filter((p) => p.type !== 'user')).id,
    })
  }

  return (
    <div className="cx-scroll">
      <Card>
        <Row icon={<TrainFront size={15} />} title="出发站" right={RAILWAY} />
        <Field label="到达站">
          <select className="fx-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {CITIES_CN.map((d) => <option key={d} value={d}>{d}站</option>)}
          </select>
        </Field>
        <div className="cx-2col">
          <Field label="出发日期">
            <input className="fx-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="座位类型">
            <select className="fx-input" value={seat} onChange={(e) => setSeat(e.target.value)}>
              {seats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={query}>查询车次</button>
      </Card>

      {rows.length > 0 && <div className="cx-sechead"><span className="cx-sechead__t">{kind === 'train' ? '普速列车' : '高铁列车'}</span></div>}
      {rows.map((r) => (
        <Row
          key={r.no}
          thumb={<span className="cx-tag cx-tag--front" style={{ width: 42, height: 42, justifyContent: 'center' }}><TrainFront size={16} /></span>}
          title={r.no}
          sub={`${fmtClock(r.depAt)} → ${fmtClock(r.arrAt)} · ${Math.round((r.arrAt - r.depAt) / 60000)} 分钟`}
          right={<span className="cx-price">¥{Math.round(r.price * priceMul)}</span>}
          onClick={() => { setPicked(r); setMsg('') }}
          arrow
        />
      ))}

      {picked && (
        <Card front>
          <div className="cx-row__title">确认订单</div>
          <Row title="车次" right={picked.no} />
          <Row title="区间" right={`${RAILWAY} → ${to}站`} />
          <Row title="座位" right={seat} />
          <Row title="票价" right={<span className="cx-price">¥{Math.round(picked.price * priceMul)}</span>} />
          <div className="cx-row__sub">账户余额 ¥{balance.toLocaleString()}</div>
          <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginTop: 10 }} onClick={confirm}>付款出票</button>
        </Card>
      )}
      {msg && <div className="cx-row__sub" style={{ margin: '10px 2px', color: msg.includes('成功') ? 'var(--fx-t1)' : '#ff8a8a' }}>{msg}</div>}
    </div>
  )
}

/* ---------- 地铁 ---------- */

function MetroPanel({ onStage }: { onStage: (s: StageState) => void }) {
  const city = useMulCity((s) => s.city)
  const me = useMe()
  const { pay, balance } = usePay()
  const buy = useMulCity((s) => s.buyTransportTicket)
  const [lineId, setLineId] = useState(METRO_LINES[0].id)
  const [from, setFrom] = useState(METRO_LINES[0].stations[0])
  const [to, setTo] = useState(METRO_LINES[0].stations[1])
  const [msg, setMsg] = useState('')
  const line = METRO_LINES.find((l) => l.id === lineId)!

  const buyTicket = () => {
    if (!pay(3)) {
      setMsg(`余额不足（¥${balance.toFixed(0)}）`)
      return
    }
    const dep = Date.now()
    const arr = dep + Math.max(2, Math.abs(line.stations.indexOf(to) - line.stations.indexOf(from)) + 1) * 4 * 60000
    const id = buy({
      kind: 'metro',
      from: landmarkById(city, from)?.name ?? '地铁站',
      to: landmarkById(city, to)?.name ?? '地铁站',
      departAt: dep,
      arriveAt: arr,
      seat: '不限',
      gate: line.name,
      price: 3,
      passengerId: me.id,
    })
    setMsg('单次票出票成功。')
    onStage({ kind: 'metro', from: landmarkById(city, from)?.name ?? '地铁站', to: landmarkById(city, to)?.name ?? '地铁站', ticketId: id, title: line.name, meetId: null })
  }

  return (
    <div className="cx-scroll">
      <div className="cx-chips">
        {METRO_LINES.map((l) => (
          <button key={l.id} className={`cx-tag ${lineId === l.id ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => { setLineId(l.id); setFrom(l.stations[0]); setTo(l.stations[1]) }}>
            {l.name}
          </button>
        ))}
      </div>

      <Card>
        <div className="cx-row__title"><Bus size={15} /> {line.name}</div>
        <div style={{ marginTop: 12 }}>
          {line.stations.map((s, i) => {
            const lm = landmarkById(city, s)
            return (
              <div key={s} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 || i === line.stations.length - 1 ? 'var(--fx-accent)' : '#555', flex: '0 0 auto' }} />
                  {i < line.stations.length - 1 && <span style={{ width: 2, height: 22, background: '#333' }} />}
                </span>
                <button className="cx-row fx-press" style={{ marginBottom: 0, flex: 1, minHeight: 40, padding: '6px 10px' }} onClick={() => setFrom(s)}>
                  <span className="cx-row__body">
                    <span className="cx-row__title">{lm?.name ?? s}</span>
                    <span className="cx-row__sub">{lm?.description}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="cx-2col">
          <Field label="从">
            <select className="fx-input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {line.stations.map((s) => <option key={s} value={s}>{landmarkById(city, s)?.name ?? s}</option>)}
            </select>
          </Field>
          <Field label="到">
            <select className="fx-input" value={to} onChange={(e) => setTo(e.target.value)}>
              {line.stations.map((s) => <option key={s} value={s}>{landmarkById(city, s)?.name ?? s}</option>)}
            </select>
          </Field>
        </div>
        <div className="cx-acts">
          <button className="fx-btn fx-press" onClick={() => { if (pay(50)) setMsg('地铁卡已充值 ¥50。'); else setMsg('余额不足。') }}>
            <CreditCard size={14} /> 购买地铁卡 ¥50
          </button>
          <button className="fx-btn fx-btn--accent fx-press" onClick={buyTicket}>单次票 ¥3 · 模拟乘坐</button>
        </div>
        <div className="cx-row__sub" style={{ marginTop: 8 }}>余额 ¥{balance.toLocaleString()}</div>
        {msg && <div className="cx-row__sub" style={{ marginTop: 6 }}>{msg}</div>}
      </Card>
    </div>
  )
}

/* ---------- 我的行程 ---------- */

function TripsPanel({ onStage }: { onStage: (s: StageState) => void }) {
  const tickets = useMulCity((s) => s.transportTickets)
  const nav = useCityNav()

  const play = (id: string) => {
    const t = tickets.find((x) => x.id === id)
    if (!t) return
    onStage({ kind: t.kind, from: t.from, to: t.to, ticketId: t.id, title: `${t.from} → ${t.to}`, meetId: null, replay: true })
  }

  return (
    <div className="cx-scroll">
      <div className="cx-stats" style={{ marginBottom: 14 }}>
        <div className="cx-stat"><b>{tickets.filter((t) => t.status === 'booked').length}</b><span>待出行</span></div>
        <div className="cx-stat"><b>{tickets.filter((t) => t.status === 'ongoing').length}</b><span>出行中</span></div>
        <div className="cx-stat"><b>{tickets.filter((t) => t.status === 'done').length}</b><span>已完成</span></div>
      </div>

      {tickets.length ? (
        tickets.map((t) => {
          const statusText = t.status === 'booked' ? '待出行' : t.status === 'ongoing' ? '出行中' : '已完成'
          return (
            <Row
              key={t.id}
              thumb={<span className="cx-tag cx-tag--front" style={{ width: 42, height: 42, justifyContent: 'center' }}>{t.kind === 'flight' ? <Plane size={16} /> : t.kind === 'metro' ? <Bus size={16} /> : <TrainFront size={16} />}</span>}
              title={`${t.from} → ${t.to}`}
              sub={`${t.departAt ? fmtWhen(t.departAt) : ''} · 座位 ${t.seat}`}
              right={<span className={`cx-tag ${t.status === 'done' ? '' : 'cx-tag--on'}`}>{statusText}</span>}
              onClick={() => nav.push({ view: 'transport', id: t.id })}
              arrow
            />
          )
        })
      ) : (
        <Empty icon={<Plane size={28} />} text="还没有行程" hint="去机票 / 火车票里买一张" />
      )}

      {tickets.filter((t) => t.status !== 'done').length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">回放出行动画</span></div>
          {tickets.filter((t) => t.status !== 'done').map((t) => (
            <button key={t.id} className="fx-btn fx-press" style={{ width: '100%', marginBottom: 8 }} onClick={() => play(t.id)}>
              <Zap size={14} /> {t.from} → {t.to}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

/* ---------- 出行动画 ---------- */

interface StageState {
  kind: TicketKind
  from: string
  to: string
  ticketId: string
  title: string
  meetId: string | null
  replay?: boolean
}

function TravelStage({ state, onClose }: { state: StageState; onClose: () => void }) {
  const people = useMulCity((s) => s.people)
  const advanceTicket = useMulCity((s) => s.advanceTicket)
  const [phase, setPhase] = useState(0)
  const [story, setStory] = useState('')
  const [busy, setBusy] = useState(false)
  const meet = useMemo(() => people.find((p) => p.id === state.meetId) ?? null, [people, state.meetId])

  const Mover = state.kind === 'flight' ? Plane : state.kind === 'metro' ? TrainFront : Bus
  const labels = ['前往站点', '检票进站', '途中', '抵达']

  const runStory = async () => {
    setBusy(true)
    const text = await generateTravelStory(state.kind, state.from, state.to, meet?.name ?? null)
    setStory(
      text ||
        `列车驶离${state.from}，窗外先是成片的屋顶，然后慢慢变成开阔的田野。${
          meet ? `邻座是 ${meet.name}，你们交换了几句关于 Mul市 的闲话。` : '车厢里很安静，你把额头靠在微凉的玻璃上。'
        }`
    )
    setBusy(false)
  }

  const next = () => {
    if (phase < 3) {
      setPhase((p) => p + 1)
    } else {
      advanceTicket(state.ticketId)
      onClose()
    }
  }

  return (
    <div className="cx-stage">
      <div className="cx-stage__scene">
        <span className="cx-stage__mover">{phase >= 3 ? <Building2 size={34} /> : <Mover size={34} />}</span>
        <span className="cx-stage__title">{phase >= 3 ? `抵达 ${state.to}` : labels[phase]}</span>
        <span className="cx-stage__sub">
          {phase === 0 && `从 ${state.from} 出发，人流正往同一个方向走。`}
          {phase === 1 && '检票口亮着绿灯，广播念了一遍班次。'}
          {phase === 2 && `正在前往 ${state.to}，时间被人群和风景稀释。`}
          {phase === 3 && '门打开，你先闻到的是这个地方的空气。'}
        </span>
        <span className="cx-stage__bar">
          <span className="cx-stage__barfill" style={{ width: `${((phase + 1) / 4) * 100}%` }} />
        </span>

        {phase === 2 && (
          <div className="cx-stage__line">
            {story || (busy ? '正在生成这段旅途…' : `车厢轻微晃动。${meet ? `${meet.name} 就坐在不远处。` : ''}`)}
          </div>
        )}
        {phase === 2 && !story && (
          <button className="fx-btn fx-press" onClick={() => void runStory()} disabled={busy}>
            <Zap size={14} /> {busy ? '生成中…' : '让 AI 写这段旅途'}
          </button>
        )}
        {phase === 3 && meet && (
          <div className="cx-stage__line">
            你在出口处遇见了 <b>{meet.name}</b>（{meet.occupation}）—— 一次 Mul市 的偶遇。
          </div>
        )}
      </div>

      <div className="cx-quick" style={{ justifyContent: 'center' }}>
        <button className="fx-btn fx-btn--soft fx-press" onClick={onClose}>跳过</button>
        <button className="fx-btn fx-btn--accent fx-press" onClick={next}>
          {phase < 3 ? (<>下一步 <ArrowRight size={14} /></>) : '完成行程'}
        </button>
      </div>
      {!hasCityAi() && phase === 2 && (
        <div className="cx-muted" style={{ textAlign: 'center', padding: '0 16px 14px', fontSize: 'calc(9.5px * var(--fs-scale))' }}>
          未接入 LLM，旅途文案使用本地兜底
        </div>
      )}
    </div>
  )
}
