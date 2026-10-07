import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Music2, Plus, Sparkles, Ticket, Timer } from 'lucide-react'
import { pick } from '../../lib/cityCatalog'
import { generateShowDraft, hasCityAi } from '../../lib/cityEngine'
import { SHOW_KIND_LABEL, fmtCityTime, useMulCity, type ShowKind } from '../../store/mulCity'
import { Card, Empty, Field, Row, Sheet, SubTabs, Stat, fmtDateFull } from './cityParts'
import { useCityNav } from './cityNav'

/* ============================================================
   Tab4 · 演出（演唱会 / 剧场 / 展览票务）
   演唱会 | 剧场 | 展览 | 我的票务
   ============================================================ */

type Sub = 'concert' | 'theater' | 'exhibition' | 'mine'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'concert', label: '演唱会' },
  { key: 'theater', label: '剧场' },
  { key: 'exhibition', label: '展览' },
  { key: 'mine', label: '我的票务' },
]

export default function ShowTab() {
  const [sub, setSub] = useState<Sub>('concert')
  const [create, setCreate] = useState(false)
  return (
    <>
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      {sub === 'mine' ? <MyTickets /> : <ShowList kind={sub} onCreate={() => setCreate(true)} />}
      <CreateShowSheet kind={sub === 'mine' ? 'concert' : sub} open={create} onClose={() => setCreate(false)} />
    </>
  )
}

/* ---------- 开售倒计时 ---------- */

function useCountdown(at: number): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const diff = at - now
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

function SaleBadge({ saleAt, seatsLeft }: { saleAt: number; seatsLeft: number }) {
  const cd = useCountdown(saleAt)
  if (cd) return <span className="cx-tag"><Timer size={10} /> {cd} 后开售</span>
  if (seatsLeft <= 0) return <span className="cx-tag">已售罄</span>
  return <span className="cx-tag cx-tag--on">抢票中</span>
}

/* ---------- 演出列表 ---------- */

function ShowList({ kind, onCreate }: { kind: Exclude<Sub, 'mine'>; onCreate: () => void }) {
  const shows = useMulCity((s) => s.shows)
  const nav = useCityNav()
  const list = useMemo(() => shows.filter((s) => s.kind === kind).sort((a, b) => a.startAt - b.startAt), [shows, kind])

  return (
    <div className="cx-scroll">
      <div className="cx-acts" style={{ marginBottom: 4 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={onCreate}><Plus size={14} /> 发布演出</button>
      </div>

      <div className="cx-sechead">
        <span className="cx-sechead__t">{SHOW_KIND_LABEL[kind]}</span>
        <span className="cx-sechead__sub">{list.length} 场</span>
      </div>

      {list.length ? (
        list.map((s) => {
          const onSale = Date.now() >= s.saleAt
          const soldOut = s.seatsLeft <= 0
          return (
            <button
              key={s.id}
              className="cx-card fx-press"
              style={{ width: '100%', display: 'block', textAlign: 'left', marginBottom: 10 }}
              onClick={() => nav.push({ view: 'show', id: s.id })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="cx-tag cx-tag--front">{SHOW_KIND_LABEL[s.kind]}</span>
                <SaleBadge saleAt={s.saleAt} seatsLeft={s.seatsLeft} />
                <span className="cx-price" style={{ marginLeft: 'auto' }}>
                  <small>¥</small>{s.priceMin}
                  <small> 起</small>
                </span>
              </div>
              <div className="cx-row__title" style={{ marginTop: 9, fontSize: 'calc(15px * var(--fs-scale))' }}>{s.title}</div>
              <div className="cx-row__sub">{s.artist}</div>
              <div className="cx-row__sub" style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                <span><MapPin size={11} /> {s.venue}</span>
                <span><CalendarDays size={11} /> {fmtCityTime(s.startAt)}</span>
                <span><Ticket size={11} /> 余票 {s.seatsLeft}/{s.seatsTotal}</span>
              </div>
              {onSale && !soldOut && (
                <div className="cx-hr" />
              )}
              {onSale && !soldOut && (
                <div className="cx-row__sub" style={{ marginTop: 0, color: 'var(--fx-t2)' }}>点击进入选座购票 →</div>
              )}
            </button>
          )
        })
      ) : (
        <Empty icon={<Music2 size={28} />} text="这个分类还没有演出" hint="点上方「发布演出」创建一场" />
      )}
    </div>
  )
}

/* ---------- 我的票务 ---------- */

function MyTickets() {
  const tickets = useMulCity((s) => s.showTickets)
  const shows = useMulCity((s) => s.shows)
  const nav = useCityNav()

  const upcoming = tickets.filter((t) => t.status === 'upcoming')
  const past = tickets.filter((t) => t.status !== 'upcoming')

  return (
    <div className="cx-scroll">
      <div className="cx-stats" style={{ marginBottom: 14 }}>
        <Stat value={upcoming.length} label="即将到来" />
        <Stat value={tickets.filter((t) => t.status === 'used').length} label="已入场" />
        <Stat value={tickets.filter((t) => t.status === 'expired').length} label="已过期" />
      </div>

      {tickets.length ? (
        <>
          <div className="cx-sechead"><span className="cx-sechead__t">即将到来</span></div>
          {upcoming.length ? (
            upcoming.map((t) => {
              const show = shows.find((s) => s.id === t.showId)
              if (!show) return null
              return (
                <Row
                  key={t.id}
                  thumb={<span className="cx-tag cx-tag--front" style={{ width: 42, height: 42, justifyContent: 'center' }}><Music2 size={16} /></span>}
                  title={show.title}
                  sub={`${fmtCityTime(show.startAt)} · ${t.zone.split(' ')[0]} ${t.seat} 号`}
                  right={<span className="cx-tag cx-tag--on">待入场</span>}
                  onClick={() => nav.push({ view: 'showticket', id: t.id })}
                  arrow
                />
              )
            })
          ) : (
            <Empty icon={<Ticket size={26} />} text="还没有待入场的票" />
          )}

          {past.length > 0 && (
            <>
              <div className="cx-sechead"><span className="cx-sechead__t">已结束</span></div>
              {past.map((t) => {
                const show = shows.find((s) => s.id === t.showId)
                if (!show) return null
                return (
                  <Row
                    key={t.id}
                    thumb={<span className="cx-tag cx-tag--front" style={{ width: 42, height: 42, justifyContent: 'center' }}><Ticket size={16} /></span>}
                    title={show.title}
                    sub={`${fmtDateFull(show.startAt)} · ${t.zone}`}
                    right={<span className="cx-tag">{t.status === 'used' ? '已入场' : '已过期'}</span>}
                    onClick={() => nav.push({ view: 'showticket', id: t.id })}
                    arrow
                  />
                )
              })}
            </>
          )}
        </>
      ) : (
        <Empty icon={<Ticket size={28} />} text="还没有演出票" hint="去演唱会 / 剧场 / 展览里挑一场" />
      )}
    </div>
  )
}

/* ---------- 发布演出（AI 或手动） ---------- */

const VENUES = ['Mul 剧场', '现代美术馆', '中央广场露天舞台', '海滨栈桥剧场', '星光百货顶层露台']

function CreateShowSheet({ kind, open, onClose }: { kind: Exclude<Sub, 'mine'>; open: boolean; onClose: () => void }) {
  const addShow = useMulCity((s) => s.addShow)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [venue, setVenue] = useState(VENUES[0])
  const [days, setDays] = useState(3)
  const [priceMin, setPriceMin] = useState(180)
  const [priceMax, setPriceMax] = useState(580)
  const [total, setTotal] = useState(kind === 'exhibition' ? 2000 : 600)
  const [sellNow, setSellNow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const reset = () => {
    setTitle('')
    setArtist('')
    setMsg('')
  }

  const aiFill = async () => {
    setBusy(true)
    setMsg('正在生成演出…')
    const draft = await generateShowDraft(kind, title)
    if (draft) {
      setTitle(draft.title)
      setArtist(draft.artist)
      setVenue(VENUES.includes(draft.venue) ? draft.venue : venue)
      setPriceMin(draft.priceMin)
      setPriceMax(draft.priceMax)
      setTotal(draft.seatsTotal)
      setMsg('AI 已生成演出信息，确认后发布。')
    } else {
      setMsg(hasCityAi() ? '生成失败，请重试或手动填写。' : '未接入 LLM，请手动填写。')
    }
    setBusy(false)
  }

  const submit = () => {
    if (!title.trim()) {
      setMsg('请填写演出名称。')
      return
    }
    const startAt = Date.now() + days * 86400000
    const span = kind === 'exhibition' ? 240 : 3
    addShow({
      kind: kind as ShowKind,
      title: title.trim(),
      artist: artist.trim() || 'Mul市 演出团队',
      venue,
      startAt,
      endAt: startAt + span * 3600000,
      priceMin,
      priceMax: Math.max(priceMin, priceMax),
      seatsTotal: total,
      seatsLeft: Math.round(total * (0.3 + Math.random() * 0.6)),
      description: pick(['现场比录音好太多。', '一年只有这一次。', '票不多，手慢无。', '适合一个人来看。']),
      saleAt: sellNow ? Date.now() - 60000 : startAt - 86400000,
    })
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`发布${SHOW_KIND_LABEL[kind]}`}>
      <Card front style={{ boxShadow: 'none', background: 'transparent', padding: 0 }}>
        <div className="cx-row__sub">用一句话让程行补全，或直接手动填写。</div>
        <Field label="演出名称（可先写关键词）">
          <input className="fx-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：海边民谣夜" />
        </Field>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={() => void aiFill()} disabled={busy}>
          <Sparkles size={14} /> {busy ? '生成中…' : 'AI 生成演出信息'}
        </button>
        <div className="cx-hr" />
        <Field label="表演者 / 主办">
          <input className="fx-input" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </Field>
        <Field label="场地">
          <select className="fx-input" value={venue} onChange={(e) => setVenue(e.target.value)}>
            {VENUES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <div className="cx-2col">
          <Field label="距今天数">
            <input className="fx-input" type="number" value={days} onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="总票数">
            <input className="fx-input" type="number" value={total} onChange={(e) => setTotal(Math.max(10, Number(e.target.value) || 10))} />
          </Field>
        </div>
        <div className="cx-2col">
          <Field label="最低票价">
            <input className="fx-input" type="number" value={priceMin} onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="最高票价">
            <input className="fx-input" type="number" value={priceMax} onChange={(e) => setPriceMax(Math.max(0, Number(e.target.value) || 0))} />
          </Field>
        </div>
        <Field label="开售状态">
          <div className="cx-acts">
            <button className={`cx-tag ${sellNow ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSellNow(true)}>立即开售</button>
            <button className={`cx-tag ${!sellNow ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSellNow(false)}>演出前一天开售</button>
          </div>
        </Field>
      </Card>
      {msg && <div className="cx-row__sub" style={{ margin: '4px 2px 10px' }}>{msg}</div>}
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit}>发布演出</button>
    </Sheet>
  )
}
