import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Plane,
  ShoppingBag,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react'
import {
  RELATION_LABEL,
  TICKET_KIND_LABEL,
  fmtCityTime,
  landmarkById,
  personById,
  relationOf,
  useMe,
  useMulCity,
  type Person,
  type RelationType,
} from '../../store/mulCity'
import { useCityNav } from './cityNav'
import { generateShowNarrative } from '../../lib/cityEngine'
import { AttrGrid, Avatar, Card, Empty, IdCard, PersonRow, Progress, Row, Sheet, Stat, TicketCard, fmtDateFull, fmtWhen } from './cityParts'

/* ============================================================
   Mul市 · 详情浮层
   人物 / 地标 / 演出 / 机票·车票 / 门票 / 世界事件
   ============================================================ */

export function DetailShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const nav = useCityNav()
  return (
    <>
      <div className="cx-pagehead">
        <button className="cx-back fx-press" onClick={nav.pop} aria-label="返回">
          <ArrowLeft size={17} />
        </button>
        <span className="cx-pagehead__title">{title}</span>
        {sub && <span className="cx-pagehead__sub">{sub}</span>}
      </div>
      <div className="cx-scroll">{children}</div>
    </>
  )
}

/* ---------- 人物主页 ---------- */

const REL_OPTIONS: RelationType[] = ['family', 'friend', 'colleague', 'classmate', 'crush', 'couple', 'enemy', 'stranger']

export function PersonDetail({ id }: { id: string }) {
  const me = useMe()
  const people = useMulCity((s) => s.people)
  const movePerson = useMulCity((s) => s.movePerson)
  const setRelation = useMulCity((s) => s.setRelation)
  const bumpAffinity = useMulCity((s) => s.bumpAffinity)
  const posts = useMulCity((s) => s.posts)
  const nav = useCityNav()
  const [relOpen, setRelOpen] = useState(false)

  const person = personById(people, id)
  if (!person) return <DetailShell title="居民不存在"><Empty icon={<Users size={30} />} text="这位居民已经离开了 Mul市" /></DetailShell>

  const isMe = person.id === me.id
  const rel = relationOf(me, person.id)
  const city = useMulCity((s) => s.city)
  const here = landmarkById(city, person.lastSeenLocation)
  const theirPosts = posts.filter((p) => p.personId === person.id).slice(0, 4)
  const relations = person.relationships.filter((r) => r.type !== 'self').slice(0, 12)

  return (
    <DetailShell title={isMe ? '我的档案' : person.name} sub={person.civilId}>
      <IdCard person={person} />

      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={() => nav.push({ view: 'landmark', id: person.lastSeenLocation })}>
          <MapPin size={14} /> {here ? `在 ${here.name}` : '位置未知'}
        </button>
        {!isMe && (
          <>
            <button className="fx-btn fx-press" onClick={() => bumpAffinity(me.id, person.id, 4, '在路上打了招呼')}>
              <Heart size={14} /> 打招呼
            </button>
            <button className="fx-btn fx-press" onClick={() => setRelOpen(true)}>
              <Users size={14} /> 关系 · {RELATION_LABEL[rel.type]}
            </button>
            <button className="fx-btn fx-press" onClick={() => movePerson(person.id, 'lm_square')}>
              <Sparkles size={14} /> 传送到广场
            </button>
          </>
        )}
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">六维属性</span><span className="cx-sechead__sub">LV.{person.attributes.level} · {person.rank}</span></div>
      <AttrGrid attrs={person.attributes} />

      <div className="cx-stats" style={{ marginTop: 12 }}>
        <Stat value={person.attributes.socialCredit} label="社会信用" />
        <Stat value={person.attributes.cityContribution} label="城市贡献" />
        <Stat value={`¥${person.bankAccount.toLocaleString()}`} label="账户余额" />
      </div>

      <Card>
        <div className="cx-row__title" style={{ marginBottom: 9 }}><Activity size={14} /> 状态</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <span style={{ width: 42, fontSize: 'calc(11px * var(--fs-scale))', color: 'var(--fx-t3)' }}>心情</span>
          <span style={{ flex: 1 }}><Progress value={person.mood} /></span>
          <span className="cx-mono" style={{ fontSize: 'calc(11px * var(--fs-scale))' }}>{person.mood}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <span style={{ width: 42, fontSize: 'calc(11px * var(--fs-scale))', color: 'var(--fx-t3)' }}>精力</span>
          <span style={{ flex: 1 }}><Progress value={person.energy} /></span>
          <span className="cx-mono" style={{ fontSize: 'calc(11px * var(--fs-scale))' }}>{person.energy}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 42, fontSize: 'calc(11px * var(--fs-scale))', color: 'var(--fx-t3)' }}>健康</span>
          <span style={{ flex: 1 }}><Progress value={person.health} /></span>
          <span className="cx-mono" style={{ fontSize: 'calc(11px * var(--fs-scale))' }}>{person.health}</span>
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">档案</span></div>
      <Card>
        <Row icon={<Briefcase size={15} />} title="职业" right={person.occupation} />
        <Row icon={<MapPin size={15} />} title="户籍" right={person.address} />
        <Row icon={<CalendarDays size={15} />} title="生日 / 星座" right={`${person.birthday} · ${person.zodiac}`} />
        <Row icon={<Sparkles size={15} />} title="MBTI" right={person.mbti} />
        <Row icon={<ShoppingBag size={15} />} title="兴趣" right={person.hobbies.join(' · ') || '—'} />
        <Row icon={<Ticket size={15} />} title="随身物品" right={person.inventory.join('、') || '—'} />
      </Card>

      {person.bio && <Card><div className="cx-row__sub" style={{ marginTop: 0 }}>{person.bio}</div></Card>}

      {relations.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">人际关系</span></div>
          {relations.map((r) => {
            const other = personById(people, r.personId)
            if (!other) return null
            return (
              <Row
                key={r.personId}
                thumb={<Avatar person={other} size={38} />}
                title={other.name}
                sub={`${RELATION_LABEL[r.type]} · 好感度 ${r.affinity}`}
                onClick={() => nav.push({ view: 'person', id: other.id })}
                arrow
              />
            )
          })}
        </>
      )}

      {theirPosts.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">最近动态</span></div>
          {theirPosts.map((p) => (
            <Card key={p.id}>
              <div className="cx-row__sub" style={{ marginTop: 0 }}>{p.text}</div>
              <div className="cx-muted" style={{ fontSize: 'calc(10px * var(--fs-scale))', marginTop: 6 }}>{fmtWhen(p.at)}</div>
            </Card>
          ))}
        </>
      )}

      <Sheet open={relOpen} onClose={() => setRelOpen(false)} title="设置关系">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {REL_OPTIONS.map((t) => (
            <button
              key={t}
              className={`cx-tag ${rel.type === t ? 'cx-tag--on' : 'cx-tag--front'}`}
              onClick={() => {
                setRelation(me.id, person.id, t)
                setRelation(person.id, me.id, t)
                setRelOpen(false)
              }}
            >
              {RELATION_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="cx-hr" />
        <div className="cx-field__label">当前好感度 {rel.affinity}</div>
        <div className="cx-acts">
          <button className="fx-btn fx-press" onClick={() => bumpAffinity(me.id, person.id, -5, '闹了点小别扭')}>− 相处</button>
          <button className="fx-btn fx-btn--front fx-press" onClick={() => bumpAffinity(me.id, person.id, 5, '一起待了一会儿')}>+ 相处</button>
        </div>
      </Sheet>
    </DetailShell>
  )
}

/* ---------- 地标详情 ---------- */

export function LandmarkDetail({ id }: { id: string }) {
  const city = useMulCity((s) => s.city)
  const people = useMulCity((s) => s.people)
  const worldEvents = useMulCity((s) => s.worldEvents)
  const nav = useCityNav()
  const lm = landmarkById(city, id)
  if (!lm) return <DetailShell title="地标不存在"><Empty icon={<MapPin size={30} />} text="这个地点还在地图之外" /></DetailShell>

  const district = city.districts.find((d) => d.id === lm.districtId)
  const here = people.filter((p) => p.lastSeenLocation === id)
  const events = worldEvents.filter((e) => e.locationId === id)

  return (
    <DetailShell title={lm.name} sub={district?.name}>
      <Card front>
        <div className="cx-row__title"><MapPin size={15} /> {lm.type}</div>
        <div className="cx-row__sub">{lm.description}</div>
        <div className="cx-stats" style={{ marginTop: 12 }}>
          <Stat value={here.length} label="此刻在此" />
          <Stat value={lm.capacity} label="承载量" />
          <Stat value={district?.crimeRate ?? 0} label="区域案发" />
        </div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">此刻在这里</span><span className="cx-sechead__sub">{here.length} 人</span></div>
      {here.length ? (
        here.slice(0, 12).map((p) => (
          <PersonRow key={p.id} person={p} onClick={() => nav.push({ view: 'person', id: p.id })} arrow />
        ))
      ) : (
        <Empty icon={<Users size={26} />} text="暂时没有人" />
      )}

      {events.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">此地事件</span></div>
          {events.map((e) => (
            <Row
              key={e.id}
              icon={<Sparkles size={15} />}
              title={e.title}
              sub={e.description}
              right={<span className="cx-tag">{e.type}</span>}
              onClick={() => nav.push({ view: 'event', id: e.id })}
              arrow
            />
          ))}
        </>
      )}
    </DetailShell>
  )
}

/* ---------- 演出详情 ---------- */

const ZONES = [
  { name: 'A 区 · 内场', ratio: 1.6 },
  { name: 'B 区 · 看台前', ratio: 1.25 },
  { name: 'C 区 · 看台后', ratio: 1 },
]

export function ShowDetail({ id }: { id: string }) {
  const show = useMulCity((s) => s.shows.find((x) => x.id === id))
  const buyShowTicket = useMulCity((s) => s.buyShowTicket)
  const banks = useMulCity((s) => s.banks)
  const me = useMe()
  const [zone, setZone] = useState(ZONES[0].name)
  const [seat, setSeat] = useState('')
  const [msg, setMsg] = useState('')
  const now = Date.now()

  if (!show) return <DetailShell title="演出不存在"><Empty icon={<Ticket size={30} />} text="这场演出已经结束了" /></DetailShell>

  const zoneRatio = ZONES.find((z) => z.name === zone)!.ratio
  const price = Math.round(show.priceMin * zoneRatio)
  const onSale = now >= show.saleAt
  const soldOut = show.seatsLeft <= 0
  const balance = banks.find((b) => b.personId === me.id)?.balance ?? me.bankAccount

  const pickSeat = () => {
    const row = 'ABCDEFGH'.slice(0, Math.max(4, Math.round((show.seatsTotal / 120) * 1.4)))
    const r = row[Math.floor(Math.random() * row.length)]
    return `${r}${Math.floor(Math.random() * 40) + 1}`
  }

  const buy = () => {
    const s = seat || pickSeat()
    const res = buyShowTicket(show.id, zone, s, price)
    if (!res.ok) setMsg(res.reason ?? '购票失败')
    else {
      setMsg(`出票成功：${zone} ${s} 号，¥${price}`)
      setSeat('')
    }
  }

  return (
    <DetailShell title="演出详情" sub={show.artist}>
      <Card front>
        <div style={{ fontSize: 'calc(19px * var(--fs-scale))', fontWeight: 700, lineHeight: 1.4 }}>{show.title}</div>
        <div className="cx-row__sub" style={{ marginTop: 8 }}>{show.description}</div>
        <div className="cx-hr" />
        <Row icon={<MapPin size={15} />} title="场地" right={show.venue} />
        <Row icon={<Clock size={15} />} title="开演" right={fmtWhen(show.startAt)} />
        <Row icon={<Banknote size={15} />} title="票价区间" right={`¥${show.priceMin} - ¥${show.priceMax}`} />
        <Row icon={<Ticket size={15} />} title="余票" right={`${show.seatsLeft} / ${show.seatsTotal}`} />
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">选择座位区</span></div>
      <div className="cx-seatmap">
        <div className="cx-seatmap__stage">STAGE</div>
        {ZONES.map((z) => {
          const p = Math.round(show.priceMin * z.ratio)
          const disabled = p > show.priceMax && z.ratio !== 1
          return (
            <button
              key={z.name}
              className={`cx-zone fx-press ${zone === z.name ? 'cx-zone--on' : ''}`}
              onClick={() => setZone(z.name)}
              disabled={disabled}
            >
              <span>{z.name}</span>
              {disabled && <span className="cx-zone__tag">未开放</span>}
              <b>¥{p}</b>
            </button>
          )
        })}
      </div>

      <Card style={{ marginTop: 12 }}>
        <Row icon={<Banknote size={15} />} title="我的余额" right={`¥${balance.toLocaleString()}`} />
        <Row icon={<Ticket size={15} />} title="本次选座" right={seat || '系统随机分配'} />
      </Card>

      {msg && <div className="cx-row__sub" style={{ color: msg.includes('成功') ? 'var(--fx-t1)' : '#ff8a8a', margin: '10px 2px' }}>{msg}</div>}

      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--soft fx-press" onClick={() => setSeat(pickSeat())}>随机选座</button>
        <button className="fx-btn fx-btn--accent fx-press" onClick={buy} disabled={!onSale || soldOut}>
          {!onSale ? `开售倒计时` : soldOut ? '已售罄' : `立即购票 ¥${price}`}
        </button>
      </div>
    </DetailShell>
  )
}

/* ---------- 交通票详情 ---------- */

export function TransportDetail({ id }: { id: string }) {
  const ticket = useMulCity((s) => s.transportTickets.find((t) => t.id === id))
  const advance = useMulCity((s) => s.advanceTicket)
  const remove = useMulCity((s) => s.removeTicket)
  const people = useMulCity((s) => s.people)
  if (!ticket) return <DetailShell title="票不存在"><Empty icon={<Plane size={30} />} text="这张票不在行程里" /></DetailShell>

  const passenger = personById(people, ticket.passengerId)
  const statusText = ticket.status === 'booked' ? '待出行' : ticket.status === 'ongoing' ? '出行中' : '已完成'

  return (
    <DetailShell title={TICKET_KIND_LABEL[ticket.kind]} sub={statusText}>
      <TicketCard
        kind={ticket.kind}
        title={passenger?.name ?? '乘客'}
        code={`票号 ${ticket.code}`}
        route={{ from: ticket.from, to: ticket.to, fromSub: fmtWhen(ticket.departAt), toSub: fmtWhen(ticket.arriveAt), mid: '直达' }}
        grid={[
          { value: ticket.seat, label: '座位' },
          { value: ticket.gate, label: '登机口/站台' },
          { value: fmtDateFull(ticket.departAt), label: '日期' },
        ]}
        foot={
          <>
            <span className="cx-tag">乘客 · {passenger?.name ?? '—'}</span>
            <span className="cx-code cx-code--sm" />
          </>
        }
      />
      <Card style={{ marginTop: 12 }}>
        <Row icon={<Clock size={15} />} title="出发" right={fmtCityTime(ticket.departAt)} />
        <Row icon={<Clock size={15} />} title="到达" right={fmtCityTime(ticket.arriveAt)} />
        <Row icon={<Banknote size={15} />} title="票价" right={`¥${ticket.price}`} />
      </Card>
      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={() => advance(ticket.id)} disabled={ticket.status === 'done'}>
          {ticket.status === 'booked' ? '开始出行' : ticket.status === 'ongoing' ? '抵达目的地' : '已完成'}
        </button>
        <button className="fx-btn fx-btn--soft fx-press cx-danger" onClick={() => remove(ticket.id)}>退票</button>
      </div>
    </DetailShell>
  )
}

/* ---------- 门票详情 ---------- */

export function ShowTicketDetail({ id }: { id: string }) {
  const ticket = useMulCity((s) => s.showTickets.find((t) => t.id === id))
  const show = useMulCity((s) => s.shows.find((x) => s.showTickets.find((t) => t.id === id)?.showId === x.id))
  const useTicket = useMulCity((s) => s.useShowTicket)
  const [stage, setStage] = useState(false)
  const [phase, setPhase] = useState(0)
  const [view, setView] = useState('舞台视角')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const narrate = async (v: string) => {
    if (!show) return
    setBusy(true)
    const out = await generateShowNarrative(show, v)
    setText(
      out ||
        (v === '舞台视角'
          ? '灯光从头顶压下来，鼓点先落在胸口。你能看清主唱换气时抬手的动作，音浪一层层推过来。'
          : '周围全是举起的手机屏，人群跟着副歌一起唱，声音从四面八方涌过来，脚尖跟着节奏轻点。')
    )
    setBusy(false)
  }

  useEffect(() => {
    if (stage && phase === 2) void narrate(view)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, phase, view])

  if (!ticket || !show) return <DetailShell title="门票不存在"><Empty icon={<Ticket size={30} />} text="这张票已经失效" /></DetailShell>

  const statusText = ticket.status === 'upcoming' ? '即将到来' : ticket.status === 'used' ? '已入场' : '已过期'
  const labels = ['扫码验票', '检票入场', '演出进行中']

  const start = () => {
    useTicket(ticket.id)
    setPhase(0)
    setText('')
    setStage(true)
  }

  return (
    <DetailShell title="我的门票" sub={statusText}>
      <TicketCard
        kind="show"
        title={show.title}
        code={`票号 ${ticket.id.slice(-8).toUpperCase()}`}
        route={{ from: fmtDateFull(show.startAt), to: show.venue, mid: show.artist }}
        grid={[
          { value: ticket.zone.split(' ')[0], label: '区域' },
          { value: ticket.seat, label: '座位' },
          { value: `¥${ticket.price}`, label: '实付' },
        ]}
      />
      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--accent fx-press" onClick={start} disabled={ticket.status !== 'upcoming'}>
          {ticket.status === 'upcoming' ? '检票入场' : '已入场'}
        </button>
      </div>

      {stage && (
        <div className="cx-stage">
          <div className="cx-stage__scene">
            <span className="cx-stage__mover">{phase >= 2 ? '🎤' : phase === 1 ? '🎫' : '📱'}</span>
            <span className="cx-stage__title">{labels[phase]}</span>
            <span className="cx-stage__sub">
              {phase === 0 && '闸机亮起绿灯，屏幕上的座位号被扫过一遍。'}
              {phase === 1 && '你顺着人流走进场馆，冷气里混着爆米花的味道。'}
              {phase === 2 && `${show.artist} 已经登台，全场暗了下来。`}
            </span>
            <span className="cx-stage__bar">
              <span className="cx-stage__barfill" style={{ width: `${((phase + 1) / 3) * 100}%` }} />
            </span>

            {phase === 2 && (
              <>
                <div className="cx-acts" style={{ justifyContent: 'center' }}>
                  {['舞台视角', '观众席视角'].map((v) => (
                    <button key={v} className={`cx-tag ${view === v ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setView(v)}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="cx-stage__line">{text || (busy ? '正在生成现场…' : '')}</div>
                <button className="fx-btn fx-press" onClick={() => void narrate(view)} disabled={busy}>
                  <Sparkles size={14} /> {busy ? '生成中…' : '让 AI 描写此刻'}
                </button>
              </>
            )}
          </div>
          <div className="cx-quick" style={{ justifyContent: 'center' }}>
            <button className="fx-btn fx-btn--soft fx-press" onClick={() => setStage(false)}>离开</button>
            {phase < 2 && (
              <button className="fx-btn fx-btn--accent fx-press" onClick={() => setPhase((p) => p + 1)}>
                下一步 <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </DetailShell>
  )
}

/* ---------- 世界事件详情 ---------- */

export function EventDetail({ id }: { id: string }) {
  const event = useMulCity((s) => s.worldEvents.find((e) => e.id === id))
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const nav = useCityNav()
  if (!event) return <DetailShell title="事件不存在"><Empty icon={<Sparkles size={30} />} text="这件事已经过去了" /></DetailShell>

  const lm = landmarkById(city, event.locationId)
  const involved = event.involvedPersons.map((pid) => personById(people, pid)).filter((p): p is Person => !!p)

  return (
    <DetailShell title={event.title} sub={event.type}>
      <Card front>
        <div className="cx-row__sub" style={{ marginTop: 0 }}>{event.description}</div>
        <div className="cx-hr" />
        <Row icon={<MapPin size={15} />} title="地点" right={lm?.name ?? '全城'} onClick={lm ? () => nav.push({ view: 'landmark', id: lm.id }) : undefined} arrow={!!lm} />
        <Row icon={<Clock size={15} />} title="时间" right={fmtCityTime(event.time)} />
        {event.outcome && <Row icon={<Activity size={15} />} title="结果" right={event.outcome} />}
      </Card>

      {involved.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">涉及居民</span></div>
          {involved.map((p) => (
            <PersonRow key={p.id} person={p} onClick={() => nav.push({ view: 'person', id: p.id })} arrow />
          ))}
        </>
      )}
    </DetailShell>
  )
}

/* ---------- 统一浮层渲染 ---------- */

export function RouteView({ view, id }: { view: string; id: string }) {
  if (view === 'person') return <PersonDetail id={id} />
  if (view === 'landmark') return <LandmarkDetail id={id} />
  if (view === 'show') return <ShowDetail id={id} />
  if (view === 'transport') return <TransportDetail id={id} />
  if (view === 'showticket') return <ShowTicketDetail id={id} />
  if (view === 'event') return <EventDetail id={id} />
  return null
}
