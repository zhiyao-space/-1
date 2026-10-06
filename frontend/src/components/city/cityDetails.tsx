import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Bookmark,
  Briefcase,
  CalendarDays,
  Clock,
  Eye,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Newspaper,
  Plane,
  Plus,
  Radio,
  Repeat2,
  Send,
  ShoppingBag,
  Sparkles,
  ThumbsDown,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  ME_ID,
  RELATION_LABEL,
  TICKET_KIND_LABEL,
  fmtCityTime,
  landmarkById,
  personById,
  relationOf,
  useMe,
  useMulCity,
  type Candle,
  type MicroblogPost,
  type Person,
  type RelationType,
} from '../../store/mulCity'
import { useCityNav } from './cityNav'
import { generateShowNarrative } from '../../lib/cityEngine'
import {
  AttrGrid,
  Avatar,
  Card,
  Empty,
  IdCard,
  KLineChart,
  PersonRow,
  Progress,
  Row,
  Sheet,
  Sparkline,
  Stat,
  TicketCard,
  TrendChart,
  fmtDate,
  fmtDateFull,
  fmtWhen,
} from './cityParts'
import { MicroPostCard, RichText } from './microblogParts'

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

/* ---------- 事件引擎 · 进行中的事件（可做选择） ---------- */

export function GameEventDetail({ id }: { id: string }) {
  const event = useMulCity((s) => s.events.active.find((e) => e.id === id))
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const resolveEvent = useMulCity((s) => s.resolveGameEvent)
  const dismiss = useMulCity((s) => s.dismissGameEvent)
  const nav = useCityNav()
  const [result, setResult] = useState('')

  if (!event) return <DetailShell title="事件已结束"><Empty icon={<Sparkles size={30} />} text="这件事刚刚落幕了" /></DetailShell>

  const lm = landmarkById(city, event.locationId)
  const involved = event.involvedPersons.map((pid) => personById(people, pid)).filter((p): p is Person => !!p)

  const choose = (i: number) => {
    const r = resolveEvent(event.id, i)
    setResult(r.text ?? '事件已结束')
  }

  return (
    <DetailShell title={event.title} sub={event.type}>
      <Card front>
        <div className="cx-row__sub" style={{ marginTop: 0 }}>{event.description}</div>
        <div className="cx-hr" />
        <Row icon={<MapPin size={15} />} title="地点" right={lm?.name ?? '全城'} onClick={lm ? () => nav.push({ view: 'landmark', id: lm.id }) : undefined} arrow={!!lm} />
        <Row icon={<Clock size={15} />} title="时间" right={fmtCityTime(event.time)} />
        <Row icon={<Activity size={15} />} title="触发方式" right={event.triggerType} />
        {event.triggerCondition && <Row icon={<Sparkles size={15} />} title="条件" right={event.triggerCondition} />}
      </Card>

      {result ? (
        <Card front>
          <div className="cx-sechead"><span className="cx-sechead__t">你的选择</span></div>
          <div className="cx-row__sub" style={{ marginTop: 4 }}>{result}</div>
          <button className="fx-btn fx-btn--front fx-press" style={{ width: '100%', marginTop: 10 }} onClick={nav.pop}>
            知道了
          </button>
        </Card>
      ) : (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">你会怎么做？</span></div>
          {event.choices.map((c, i) => (
            <button key={i} className="fx-btn fx-press" style={{ width: '100%', marginBottom: 8 }} onClick={() => choose(i)}>
              {c.text}
            </button>
          ))}
          <button className="fx-btn fx-btn--soft fx-press" style={{ width: '100%' }} onClick={() => { dismiss(event.id); nav.pop() }}>
            不参与
          </button>
        </>
      )}

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

/* ---------- 新闻详情 ---------- */

export function NewsDetail({ id }: { id: string }) {
  const item = useMulCity((s) => s.news.headlines.find((h) => h.id === id))
  const headlines = useMulCity((s) => s.news.headlines)
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const readNews = useMulCity((s) => s.readNews)
  const toggleLike = useMulCity((s) => s.toggleNewsLike)
  const dislike = useMulCity((s) => s.dislikeNews)
  const toggleBookmark = useMulCity((s) => s.toggleNewsBookmark)
  const addComment = useMulCity((s) => s.addNewsComment)
  const addPost = useMulCity((s) => s.addMicroblogPost)
  const nav = useCityNav()
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    readNews(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!item) return <DetailShell title="新闻不存在"><Empty icon={<Newspaper size={30} />} text="这条新闻已被归档" /></DetailShell>

  const lm = landmarkById(city, item.landmarkId)
  const bookmarked = (item.bookmarks ?? []).includes(ME_ID)
  const related = headlines.filter((h) => h.id !== id && h.category === item.category).slice(0, 3)
  const persons = item.relatedPersons.map((pid) => personById(people, pid)).filter((p): p is Person => !!p)
  const paragraphs = item.body.split('\n').map((p) => p.trim()).filter(Boolean)

  const share = () => {
    addPost({ content: `【${item.category}】${item.title}\n${item.summary}\n#Mul市新闻# #${item.category}#`, tags: ['Mul市新闻', item.category] })
    setMsg('已分享到微博')
  }

  return (
    <DetailShell title={item.category} sub={item.source}>
      <Card front>
        <div style={{ fontSize: 'calc(19px * var(--fs-scale))', fontWeight: 700, lineHeight: 1.45 }}>{item.title}</div>
        <div className="cx-row__sub" style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{item.author}</span>
          <span>{fmtWhen(item.at)}</span>
          <span><Eye size={11} /> {item.views}</span>
          <span className="cx-tag cx-tag--on">{item.category}</span>
        </div>
        <div className="cx-hr" />
        {paragraphs.map((p, i) => (
          <p key={i} className="cx-news-body">{p}</p>
        ))}

        {persons.length > 0 && (
          <div className="cx-acts" style={{ marginTop: 10 }}>
            {persons.map((p) => (
              <button key={p.id} className="cx-tag cx-tag--front" onClick={() => nav.push({ view: 'person', id: p.id })}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {lm && (
          <button className="cx-tag" style={{ marginTop: 8 }} onClick={() => nav.push({ view: 'landmark', id: lm.id })}>
            <MapPin size={11} /> {lm.name}
          </button>
        )}
      </Card>

      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className={`fx-btn fx-press ${item.likes.includes(ME_ID) ? 'fx-btn--accent' : ''}`} onClick={() => toggleLike(item.id)}>
          <Heart size={14} fill={item.likes.includes(ME_ID) ? 'currentColor' : 'none'} /> {item.likes.length}
        </button>
        <button className="fx-btn fx-press" onClick={() => dislike(item.id)}>
          <ThumbsDown size={14} /> 不喜欢
        </button>
        <button className={`fx-btn fx-press ${bookmarked ? 'fx-btn--front' : ''}`} onClick={() => toggleBookmark(item.id)}>
          <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? '已收藏' : '收藏'}
        </button>
        <button className="fx-btn fx-btn--front fx-press" onClick={share}>
          <Send size={14} /> 分享到微博
        </button>
      </div>
      {msg && <div className="cx-row__sub" style={{ margin: '8px 2px' }}>{msg}</div>}

      <div className="cx-sechead"><span className="cx-sechead__t">评论</span><span className="cx-sechead__sub">{item.comments.length} 条</span></div>
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fx-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="说点什么…" />
          <button
            className="fx-btn fx-btn--accent fx-press"
            onClick={() => {
              if (!text.trim()) return
              addComment(item.id, text.trim())
              setText('')
            }}
          >
            发送
          </button>
        </div>
      </Card>
      {item.comments.length ? (
        item.comments.slice().reverse().map((c) => {
          const p = personById(people, c.personId)
          return (
            <Row
              key={c.id}
              thumb={<Avatar person={p ?? { name: '居民' }} size={34} />}
              title={p?.name ?? '居民'}
              sub={c.text}
              right={<span className="cx-muted">{fmtWhen(c.at)}</span>}
            />
          )
        })
      ) : (
        <Empty icon={<MessageCircle size={24} />} text="还没有评论" />
      )}

      {related.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">相关推荐</span></div>
          {related.map((r) => (
            <Row key={r.id} icon={<Newspaper size={15} />} title={r.title} sub={r.summary} onClick={() => nav.push({ view: 'news', id: r.id })} arrow />
          ))}
        </>
      )}
    </DetailShell>
  )
}

/* ---------- 微博帖子详情 ---------- */

export function PostDetail({ id }: { id: string }) {
  const post = useMulCity((s) => s.microblog.posts.find((p) => p.id === id))
  const people = useMulCity((s) => s.people)
  const addComment = useMulCity((s) => s.addMicroblogComment)
  const repost = useMulCity((s) => s.repostMicroblog)
  const askAssistant = useMulCity((s) => s.askAssistant)
  const nav = useCityNav()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  if (!post) return <DetailShell title="微博不存在"><Empty icon={<MessageCircle size={30} />} text="这条微博已经被删除" /></DetailShell>

  const tops = post.comments.filter((c) => !c.replyTo)
  const repliesOf = (cid: string) => post.comments.filter((c) => c.replyTo === cid)

  const send = () => {
    if (!text.trim()) return
    addComment(post.id, text.trim(), replyTo ?? undefined)
    setText('')
    setReplyTo(null)
  }

  return (
    <DetailShell title="微博详情" sub={`${post.comments.length} 条评论`}>
      <MicroPostCard post={post} />
      <div className="cx-acts" style={{ marginTop: 10 }}>
        <button className="fx-btn fx-press" onClick={() => repost(post.id)}><Repeat2 size={14} /> 转推</button>
        <button
          className="fx-btn fx-btn--front fx-press"
          onClick={() => {
            const t = askAssistant(post.id)
            void t
          }}
        >
          <Sparkles size={14} /> @论坛助手 锐评
        </button>
      </div>

      <div className="cx-sechead"><span className="cx-sechead__t">评论</span><span className="cx-sechead__sub">{tops.length} 条</span></div>
      {tops.length ? (
        tops.map((c) => {
          const p = personById(people, c.authorId)
          return (
            <div key={c.id} className="cx-mb-comment">
              <Avatar person={p ?? { name: '居民' }} size={32} />
              <div className="cx-mb-comment__body">
                <div className="cx-mb-comment__name">{p?.name ?? '居民'}</div>
                <div className="cx-mb-comment__text">{c.content}</div>
                <button className="cx-mb-comment__reply" onClick={() => setReplyTo(c.id)}>回复</button>
                {repliesOf(c.id).map((r) => {
                  const rp = personById(people, r.authorId)
                  return (
                    <div key={r.id} className="cx-mb-comment__sub">
                      <b>{rp?.name ?? '居民'}：</b>
                      {r.content}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      ) : (
        <Empty icon={<MessageCircle size={24} />} text="还没有评论，来说两句" />
      )}

      <Card style={{ marginTop: 10 }}>
        {replyTo && <div className="cx-row__sub">正在回复评论 · <button className="cx-link" onClick={() => setReplyTo(null)}>取消</button></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fx-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="友善评论…" />
          <button className="fx-btn fx-btn--accent fx-press" onClick={send}>发送</button>
        </div>
      </Card>
      <button className="cx-link" style={{ marginTop: 12 }} onClick={() => nav.push({ view: 'profile', id: post.authorId })}>
        查看作者主页 →
      </button>
    </DetailShell>
  )
}

/* ---------- 语音空间详情 ---------- */

export function SpaceDetail({ id }: { id: string }) {
  const space = useMulCity((s) => s.microblog.spaces.find((x) => x.id === id))
  const people = useMulCity((s) => s.people)
  const joinSpace = useMulCity((s) => s.joinSpace)
  const nav = useCityNav()
  const [lines, setLines] = useState<string[]>([])
  const [hearts, setHearts] = useState(0)

  useEffect(() => {
    if (!space?.live) return
    const pool = ['这个话题我也想聊。', '声音好清楚。', '同意楼上。', '刚刚那句记下了。', '主播多讲讲。']
    const t = window.setInterval(() => {
      setLines((s) => [...s, pool[Math.floor(Math.random() * pool.length)]].slice(-8))
    }, 2600)
    return () => window.clearInterval(t)
  }, [space?.live])

  if (!space) return <DetailShell title="空间不存在"><Empty icon={<Radio size={30} />} text="这个语音空间已经结束" /></DetailShell>

  const host = personById(people, space.hostId)
  const guests = space.guestIds.map((g) => personById(people, g)).filter((p): p is Person => !!p)

  return (
    <DetailShell title={space.title} sub={space.live ? '直播中' : '预约中'}>
      <Card front>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`cx-tag ${space.live ? 'cx-tag--on' : 'cx-tag--front'}`}>{space.live ? 'LIVE' : fmtWhen(space.startAt)}</span>
          <span className="cx-row__sub" style={{ margin: 0 }}>{space.online} 人在线</span>
        </div>
        <div className="cx-row__title" style={{ marginTop: 8 }}>{space.topic}</div>
        <div className="cx-hr" />
        <Row icon={<Radio size={15} />} title="主持人" right={host?.name ?? '—'} onClick={host ? () => nav.push({ view: 'person', id: host.id }) : undefined} arrow={!!host} />
        {guests.map((g) => (
          <Row key={g.id} thumb={<Avatar person={g} size={34} />} title={g.name} sub="嘉宾" onClick={() => nav.push({ view: 'person', id: g.id })} arrow />
        ))}
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">实时字幕</span></div>
      <Card>
        {[...space.subtitles, ...lines].length ? (
          [...space.subtitles, ...lines].map((l, i) => <div key={i} className="cx-space-line">{l}</div>)
        ) : (
          <div className="cx-row__sub" style={{ margin: 0 }}>空间还没有开始，先预约一下吧。</div>
        )}
      </Card>

      <div className="cx-acts" style={{ marginTop: 12 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={() => joinSpace(space.id)} disabled={!space.live}>进入空间</button>
        <button className="fx-btn fx-press" onClick={() => setHearts((h) => h + 1)}>
          <Heart size={14} fill="currentColor" /> 爱心 {space.reactions + hearts}
        </button>
        {!space.live && <button className="fx-btn fx-btn--accent fx-press"><CalendarDays size={14} /> 预约提醒</button>}
      </div>
    </DetailShell>
  )
}

/* ---------- 社群详情 ---------- */

export function CommunityDetail({ id }: { id: string }) {
  const community = useMulCity((s) => s.microblog.communities.find((c) => c.id === id))
  const people = useMulCity((s) => s.people)
  const join = useMulCity((s) => s.joinCommunity)
  const leave = useMulCity((s) => s.leaveCommunity)
  const addPost = useMulCity((s) => s.addCommunityPost)
  const nav = useCityNav()
  const [text, setText] = useState('')
  if (!community) return <DetailShell title="社群不存在"><Empty icon={<Users size={30} />} text="这个社群已经解散" /></DetailShell>

  const joined = community.memberIds.includes(ME_ID)
  return (
    <DetailShell title={community.name} sub={`${community.memberIds.length} 位成员`}>
      <Card front>
        <div className="cx-row__title"><Users size={15} /> {community.name}</div>
        <div className="cx-row__sub">{community.desc}</div>
        <div className="cx-acts" style={{ marginTop: 10 }}>
          {joined ? (
            <button className="fx-btn fx-press" onClick={() => leave(community.id)}>退出社群</button>
          ) : (
            <button className="fx-btn fx-btn--accent fx-press" onClick={() => join(community.id)}>加入社群</button>
          )}
        </div>
      </Card>

      {joined && (
        <Card style={{ marginTop: 10 }}>
          <textarea className="cx-mb-composer" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="在社群里说点什么…" />
          <button
            className="fx-btn fx-btn--accent fx-press"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => {
              if (!text.trim()) return
              addPost(community.id, text.trim())
              setText('')
            }}
          >
            <Plus size={14} /> 发布到社群
          </button>
        </Card>
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">社群动态</span><span className="cx-sechead__sub">{community.posts.length} 条</span></div>
      {community.posts.length ? community.posts.map((p) => <MicroPostCard key={p.id} post={p} compact />) : <Empty icon={<MessageCircle size={24} />} text="还没有动态" />}
      <button className="cx-link" style={{ marginTop: 12 }} onClick={() => nav.goTab('microblog')}>← 回到微博广场</button>
    </DetailShell>
  )
}

/* ---------- 个人主页（微博） ---------- */

export function ProfileDetail({ id }: { id: string }) {
  const people = useMulCity((s) => s.people)
  const posts = useMulCity((s) => s.microblog.posts)
  const following = useMulCity((s) => s.microblog.following)
  const follow = useMulCity((s) => s.followPerson)
  const unfollow = useMulCity((s) => s.unfollowPerson)
  const nav = useCityNav()
  const [tab, setTab] = useState<'posts' | 'bookmarks'>('posts')
  const person = personById(people, id)
  const me = useMe()

  if (!person) return <DetailShell title="居民不存在"><Empty icon={<Users size={30} />} text="这位居民已经离开了 Mul市" /></DetailShell>

  const isMe = person.id === me.id
  const isFollowing = following.includes(person.id)
  const theirPosts = posts.filter((p) => p.authorId === person.id)
  const bookmarked = posts.filter((p) => p.bookmarks.includes(ME_ID))
  const list = tab === 'posts' ? theirPosts : bookmarked
  const followers = 120 + (person.attributes.socialCredit ?? 0) * 3

  return (
    <DetailShell title={person.name} sub={`@${person.nickname}`}>
      <Card front>
        <div className="cx-mb-cover" />
        <div className="cx-mb-profile">
          <Avatar person={person} size={64} />
          <div className="cx-mb-profile__acts">
            {!isMe && (
              <button className={`fx-btn fx-press ${isFollowing ? '' : 'fx-btn--accent'}`} onClick={() => (isFollowing ? unfollow(person.id) : follow(person.id))}>
                {isFollowing ? '已关注' : '+ 关注'}
              </button>
            )}
            <button className="fx-btn fx-press" onClick={() => nav.push({ view: 'person', id: person.id })}>市籍档案</button>
          </div>
        </div>
        <div className="cx-row__title" style={{ marginTop: 8 }}>{person.name}</div>
        <div className="cx-row__sub">{person.occupation} · {person.bio || 'Mul市居民'}</div>
        <div className="cx-stats" style={{ marginTop: 10 }}>
          <Stat value={theirPosts.length} label="微博" />
          <Stat value={followers} label="粉丝" />
          <Stat value={following.length} label="关注" />
        </div>
      </Card>

      <div className="cx-acts" style={{ marginTop: 10 }}>
        <button className={`cx-tag ${tab === 'posts' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setTab('posts')}>微博</button>
        <button className={`cx-tag ${tab === 'bookmarks' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setTab('bookmarks')}>收藏</button>
      </div>

      {list.length ? list.map((p) => <MicroPostCard key={p.id} post={p} />) : <Empty icon={<MessageCircle size={26} />} text={tab === 'posts' ? '还没有发过微博' : '还没有收藏'} />}
    </DetailShell>
  )
}

/* ---------- 个股详情 ---------- */

function aggregateCandles(candles: Candle[], n: number): Candle[] {
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += n) {
    const grp = candles.slice(i, i + n)
    if (!grp.length) continue
    out.push({
      t: grp[0].t,
      o: grp[0].o,
      h: Math.max(...grp.map((c) => c.h)),
      l: Math.min(...grp.map((c) => c.l)),
      c: grp[grp.length - 1].c,
      v: grp.reduce((a, c) => a + c.v, 0),
    })
  }
  return out
}

function pctClass(v: number): string {
  return v > 0 ? 'cx-up' : v < 0 ? 'cx-down' : 'cx-flat'
}

export function StockDetail({ id }: { id: string }) {
  const stock = useMulCity((s) => s.stockMarket.stocks.find((x) => x.symbol === id))
  const cash = useMulCity((s) => s.stockMarket.cash)
  const portfolio = useMulCity((s) => s.stockMarket.portfolio)
  const news = useMulCity((s) => s.stockMarket.news)
  const trade = useMulCity((s) => s.tradeStock)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market')
  const [shares, setShares] = useState(100)
  const [limit, setLimit] = useState(0)
  const [msg, setMsg] = useState('')

  if (!stock) return <DetailShell title="个股不存在"><Empty icon={<TrendingUp size={30} />} text="这只股票已经退市" /></DetailShell>

  const candles = period === 'day' ? stock.history : period === 'week' ? aggregateCandles(stock.history, 5) : aggregateCandles(stock.history, 20)
  const pos = portfolio.find((p) => p.symbol === stock.symbol)
  const profit = pos ? (stock.price - pos.avgCost) * pos.shares : 0
  const relatedNews = news.filter((n) => n.symbol === stock.symbol || !n.symbol).slice(0, 4)

  const submit = () => {
    const res = trade(stock.symbol, side, shares, orderType, orderType === 'limit' ? limit || stock.price : undefined)
    setMsg(res.ok ? `${side === 'buy' ? '买入' : '卖出'} ${shares} 股，成交价 ¥${res.price}` : res.reason ?? '交易失败')
  }

  return (
    <DetailShell title={stock.name} sub={stock.symbol}>
      <Card front>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <span className={`cx-price ${pctClass(stock.changePct)}`} style={{ fontSize: 'calc(26px * var(--fs-scale))' }}>
            {stock.price.toFixed(2)}
          </span>
          <span className={`cx-price ${pctClass(stock.changePct)}`} style={{ fontSize: 'calc(13px * var(--fs-scale))' }}>
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%)
          </span>
          <span className="cx-tag" style={{ marginLeft: 'auto' }}>{stock.sector}</span>
        </div>
        {stock.alert && <div className="cx-stk-alert">{stock.alert}</div>}
        <div className="cx-stats" style={{ marginTop: 10 }}>
          <Stat value={`${(stock.volume / 10000).toFixed(0)}万`} label="成交量" />
          <Stat value={`${(stock.marketCap / 1e8).toFixed(1)}亿`} label="市值" />
          <Stat value={stock.peRatio.toFixed(1)} label="PE" />
        </div>
      </Card>

      <div className="cx-acts" style={{ marginTop: 10 }}>
        {(['day', 'week', 'month'] as const).map((p) => (
          <button key={p} className={`cx-tag ${period === p ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setPeriod(p)}>
            {p === 'day' ? '日K' : p === 'week' ? '周K' : '月K'}
          </button>
        ))}
      </div>
      <Card style={{ marginTop: 10 }}>
        <KLineChart candles={candles} />
        <div className="cx-row__sub" style={{ marginTop: 6 }}>最高 ¥{stock.high52w} · 最低 ¥{stock.low52w}</div>
      </Card>

      <div className="cx-sechead"><span className="cx-sechead__t">买卖盘口</span></div>
      <Card>
        <div className="cx-stk-book">
          <div>
            {stock.orderBook.asks.slice().reverse().map(([p, v], i) => (
              <div key={`a${i}`} className="cx-stk-book__row">
                <span>卖{5 - i}</span>
                <b className="cx-up">{p.toFixed(2)}</b>
                <i>{v}</i>
              </div>
            ))}
          </div>
          <div>
            {stock.orderBook.bids.map(([p, v], i) => (
              <div key={`b${i}`} className="cx-stk-book__row">
                <span>买{i + 1}</span>
                <b className="cx-down">{p.toFixed(2)}</b>
                <i>{v}</i>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {pos && (
        <Card style={{ marginTop: 10 }}>
          <div className="cx-row__title">我的持仓</div>
          <div className="cx-stats" style={{ marginTop: 8 }}>
            <Stat value={`${pos.shares} 股`} label="持有" />
            <Stat value={`¥${pos.avgCost.toFixed(2)}`} label="成本" />
            <Stat value={<span className={pctClass(profit)}>{profit >= 0 ? '+' : ''}¥{profit.toFixed(0)}</span>} label="浮动盈亏" />
          </div>
        </Card>
      )}

      <div className="cx-sechead"><span className="cx-sechead__t">交易</span><span className="cx-sechead__sub">可用 ¥{cash.toLocaleString()}</span></div>
      <Card>
        <div className="cx-acts" style={{ marginBottom: 10 }}>
          <button className={`cx-tag ${side === 'buy' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSide('buy')}>买入</button>
          <button className={`cx-tag ${side === 'sell' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSide('sell')}>卖出</button>
          <button className={`cx-tag ${orderType === 'market' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setOrderType('market')}>市价</button>
          <button className={`cx-tag ${orderType === 'limit' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setOrderType('limit')}>限价</button>
        </div>
        <div className="cx-2col">
          <label className="cx-field">
            <span className="cx-field__label">股数（100 的整数倍）</span>
            <input className="fx-input" type="number" value={shares} onChange={(e) => setShares(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          </label>
          {orderType === 'limit' && (
            <label className="cx-field">
              <span className="cx-field__label">限价</span>
              <input className="fx-input" type="number" value={limit || stock.price} onChange={(e) => setLimit(Number(e.target.value) || 0)} />
            </label>
          )}
        </div>
        <div className="cx-row__sub">预计金额 ¥{(stock.price * shares).toFixed(0)}</div>
        {msg && <div className="cx-row__sub" style={{ color: msg.includes('失败') || msg.includes('不足') || msg.includes('未成交') ? '#ff8a8a' : 'var(--fx-t1)' }}>{msg}</div>}
        <button className={`fx-btn fx-press ${side === 'buy' ? 'fx-btn--accent' : 'fx-btn--front'}`} style={{ width: '100%', marginTop: 8 }} onClick={submit}>
          {side === 'buy' ? '买入' : '卖出'} {stock.name}
        </button>
      </Card>

      {relatedNews.length > 0 && (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">相关新闻</span></div>
          {relatedNews.map((n) => (
            <Row key={n.id} icon={<Newspaper size={15} />} title={n.title} right={<span className={`cx-tag ${n.impact === 'good' ? 'cx-up' : n.impact === 'bad' ? 'cx-down' : ''}`}>{n.impact === 'good' ? '利好' : n.impact === 'bad' ? '利空' : '中性'}</span>} />
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
  if (view === 'gameevent') return <GameEventDetail id={id} />
  if (view === 'news') return <NewsDetail id={id} />
  if (view === 'post') return <PostDetail id={id} />
  if (view === 'stock') return <StockDetail id={id} />
  if (view === 'space') return <SpaceDetail id={id} />
  if (view === 'community') return <CommunityDetail id={id} />
  if (view === 'profile') return <ProfileDetail id={id} />
  return null
}
