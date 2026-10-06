import { useMemo, useState } from 'react'
import { LineChart, Newspaper, Play, RefreshCw, Search, Wallet } from 'lucide-react'
import { SECTORS } from '../../lib/cityCatalog'
import { generateStockQuotes, hasCityAi } from '../../lib/cityEngine'
import type { Stock } from '../../store/mulCity'
import { fmtCityTime, useMe, useMulCity } from '../../store/mulCity'
import { Card, Empty, Row, Sparkline, Stat, SubTabs, TrendChart, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'
import '../../styles/cityStock.css'

/* ============================================================
   Tab12 · 股市与经济（参考同花顺 + 东方财富）
   大盘 | 行情 | 持仓 | 排行 | 经济
   ============================================================ */

type Sub = 'market' | 'quotes' | 'portfolio' | 'rank' | 'economy'
const SUBS: { key: Sub; label: string }[] = [
  { key: 'market', label: '大盘' },
  { key: 'quotes', label: '行情' },
  { key: 'portfolio', label: '持仓' },
  { key: 'rank', label: '排行' },
  { key: 'economy', label: '经济' },
]

export default function StockTab() {
  const [sub, setSub] = useState<Sub>('market')
  return (
    <>
      <MarketTopBar />
      <SubTabs tabs={SUBS} value={sub} onChange={setSub} />
      <div className="cx-scroll">
        <StockNewsFeed />
        {sub === 'market' && <MarketOverview />}
        {sub === 'quotes' && <QuoteList />}
        {sub === 'portfolio' && <PortfolioPanel />}
        {sub === 'rank' && <RankPanel />}
        {sub === 'economy' && <EconomyPanel />}
      </div>
    </>
  )
}

/* ---------- 格式化 ---------- */

function pctClass(v: number): string {
  return v > 0 ? 'cx-up' : v < 0 ? 'cx-down' : 'cx-flat'
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function money(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function signedMoney(n: number): string {
  return `${n >= 0 ? '+' : '-'}¥${money(Math.abs(n))}`
}

function fmtVol(v: number): string {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(1)}万`
  return `${v}`
}

/* ---------- 顶部工具条：刷新行情 / 推进一步 ---------- */

function MarketTopBar() {
  const refresh = useMulCity((s) => s.refreshMarket)
  const tick = useMulCity((s) => s.marketTick)
  const economy = useMulCity((s) => s.stockMarket.economy)
  const portfolio = useMulCity((s) => s.stockMarket.portfolio)
  const activeEvents = useMulCity((s) => s.events.active)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const doRefresh = async () => {
    setBusy(true)
    setMsg('正在刷新行情…')
    if (hasCityAi()) {
      const stocks = await generateStockQuotes(
        economy,
        activeEvents.map((e) => e.title),
        portfolio.map((p) => p.symbol)
      )
      if (stocks?.length) {
        refresh(stocks)
        setMsg(`AI 行情已更新 · ${stocks.length} 只`)
        setBusy(false)
        return
      }
      setMsg('AI 生成失败，已使用本地行情')
    } else {
      setMsg('未接入 LLM，已使用本地行情')
    }
    refresh()
    setBusy(false)
  }

  return (
    <div className="cx-stk-toolbar">
      <div className="cx-acts">
        <button className="fx-btn fx-btn--accent fx-press" onClick={() => void doRefresh()} disabled={busy}>
          <RefreshCw size={14} /> {busy ? '刷新中…' : '刷新行情'}
        </button>
        <button className="fx-btn fx-btn--front fx-press" onClick={tick}>
          <Play size={14} /> 推进一步
        </button>
      </div>
      {msg && <div className="cx-stk-toolbar__msg">{msg}</div>}
    </div>
  )
}

/* ---------- 快讯 ---------- */

function StockNewsFeed() {
  const news = useMulCity((s) => s.stockMarket.news)
  const list = news.slice(0, 8)
  return (
    <>
      <div className="cx-sechead">
        <span className="cx-sechead__t">快讯</span>
        <span className="cx-sechead__sub">{news.length} 条</span>
      </div>
      {list.length ? (
        <Card style={{ marginBottom: 14 }}>
          {list.map((n) => (
            <div key={n.id} className="cx-stk-news">
              <span className={`cx-tag ${n.impact === 'good' ? 'cx-up' : n.impact === 'bad' ? 'cx-down' : 'cx-flat'}`}>
                {n.impact === 'good' ? '利好' : n.impact === 'bad' ? '利空' : '中性'}
              </span>
              <span className="cx-stk-news__t">{n.title}</span>
              <span className="cx-stk-news__time">{fmtWhen(n.at)}</span>
            </div>
          ))}
        </Card>
      ) : (
        <Empty icon={<Newspaper size={24} />} text="暂无快讯" />
      )}
    </>
  )
}

/* ---------- 个股行（大盘榜 / 行情列表共用） ---------- */

function StockRow({ stock, onClick }: { stock: Stock; onClick: () => void }) {
  return (
    <Row
      thumb={<Sparkline data={stock.history.map((c) => c.c)} up={stock.changePct >= 0} />}
      title={
        <>
          {stock.name} <span className="cx-stk-code">{stock.symbol}</span>
        </>
      }
      sub={`${stock.sector} · 成交 ${fmtVol(stock.volume)}`}
      right={
        <span className="cx-stk-quote">
          <b className={pctClass(stock.changePct)}>{stock.price.toFixed(2)}</b>
          <i className={pctClass(stock.changePct)}>{fmtPct(stock.changePct)}</i>
        </span>
      }
      onClick={onClick}
      arrow
    />
  )
}

/* ---------- 大盘总览 ---------- */

function MarketOverview() {
  const indices = useMulCity((s) => s.stockMarket.indices)
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const nav = useCityNav()
  const [rank, setRank] = useState<'up' | 'down'>('up')

  const sectorStats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    stocks.forEach((s) => {
      const cur = map.get(s.sector) ?? { sum: 0, count: 0 }
      cur.sum += s.changePct
      cur.count += 1
      map.set(s.sector, cur)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, pct: v.sum / v.count }))
      .sort((a, b) => b.pct - a.pct)
  }, [stocks])

  const ranked = useMemo(() => {
    const list = [...stocks].sort((a, b) => (rank === 'up' ? b.changePct - a.changePct : a.changePct - b.changePct))
    return list.slice(0, 10)
  }, [stocks, rank])

  return (
    <>
      <div className="cx-sechead">
        <span className="cx-sechead__t">大盘指数</span>
        <span className="cx-sechead__sub">Mul市证券交易所</span>
      </div>
      <div className="cx-stk-index">
        {indices.map((ix) => (
          <div key={ix.id} className="cx-card cx-stk-index__card">
            <div className="cx-stk-index__name">{ix.name}</div>
            <div className={`cx-stk-index__val ${pctClass(ix.changePct)}`}>{ix.value.toFixed(2)}</div>
            <div className={`cx-stk-index__chg ${pctClass(ix.changePct)}`}>
              {ix.change >= 0 ? '+' : ''}
              {ix.change.toFixed(2)}（{fmtPct(ix.changePct)}）
            </div>
            <div className="cx-stk-index__vol">成交 {fmtVol(ix.volume)}</div>
            <TrendChart data={ix.history} height={64} />
          </div>
        ))}
      </div>

      <div className="cx-sechead">
        <span className="cx-sechead__t">今日热点板块</span>
        <span className="cx-sechead__sub">按平均涨幅</span>
      </div>
      <div className="cx-stk-sectors">
        {sectorStats.map((s) => (
          <div key={s.name} className="cx-stk-sector">
            <span>{s.name}</span>
            <b className={pctClass(s.pct)}>{fmtPct(s.pct)}</b>
          </div>
        ))}
      </div>

      <div className="cx-sechead">
        <span className="cx-sechead__t">涨跌幅榜</span>
        <span className="cx-sechead__sub">
          <button className={`cx-tag ${rank === 'up' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setRank('up')}>
            涨幅榜
          </button>
          <button className={`cx-tag ${rank === 'down' ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setRank('down')}>
            跌幅榜
          </button>
        </span>
      </div>
      {ranked.length ? (
        ranked.map((st) => <StockRow key={st.symbol} stock={st} onClick={() => nav.push({ view: 'stock', id: st.symbol })} />)
      ) : (
        <Empty icon={<LineChart size={26} />} text="暂无行情数据" hint="点上方「刷新行情」拉取" />
      )}
    </>
  )
}

/* ---------- 行情列表 ---------- */

function QuoteList() {
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const nav = useCityNav()
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('全部')

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return stocks.filter((s) => {
      const hitSector = sector === '全部' || s.sector === sector
      const hitKw = !kw || s.name.toLowerCase().includes(kw) || s.symbol.toLowerCase().includes(kw)
      return hitSector && hitKw
    })
  }, [stocks, q, sector])

  return (
    <>
      <div className="cx-stk-search">
        <Search size={15} className="cx-stk-search__icon" />
        <input
          className="cx-stk-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索名称 / 代码"
        />
      </div>
      <div className="cx-acts" style={{ marginBottom: 10 }}>
        {['全部', ...SECTORS].map((s) => (
          <button key={s} className={`cx-tag ${sector === s ? 'cx-tag--on' : 'cx-tag--front'}`} onClick={() => setSector(s)}>
            {s}
          </button>
        ))}
      </div>
      {list.length ? (
        list.map((st) => <StockRow key={st.symbol} stock={st} onClick={() => nav.push({ view: 'stock', id: st.symbol })} />)
      ) : (
        <Empty icon={<LineChart size={26} />} text="没有匹配的股票" hint="换个关键词或板块试试" />
      )}
    </>
  )
}

/* ---------- 持仓 ---------- */

function PortfolioPanel() {
  const portfolio = useMulCity((s) => s.stockMarket.portfolio)
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const cash = useMulCity((s) => s.stockMarket.cash)
  const frozen = useMulCity((s) => s.stockMarket.frozen)
  const nav = useCityNav()

  const rows = portfolio.map((p) => {
    const st = stocks.find((x) => x.symbol === p.symbol)
    const price = st?.price ?? p.avgCost
    const value = price * p.shares
    const profit = (price - p.avgCost) * p.shares
    const pct = p.avgCost ? ((price - p.avgCost) / p.avgCost) * 100 : 0
    return { pos: p, name: st?.name ?? p.symbol, price, value, profit, pct }
  })
  const marketValue = rows.reduce((a, r) => a + r.value, 0)
  const totalAssets = cash + marketValue
  const totalProfit = rows.reduce((a, r) => a + r.profit, 0)

  return (
    <>
      <div className="cx-stats" style={{ marginBottom: 14 }}>
        <Stat value={`¥${money(totalAssets)}`} label="总资产" />
        <Stat value={`¥${money(cash)}`} label="可用资金" />
        <Stat value={`¥${money(frozen)}`} label="冻结" />
      </div>
      <div className="cx-stats" style={{ marginBottom: 14 }}>
        <Stat value={`¥${money(marketValue)}`} label="持仓市值" />
        <Stat value={<span className={pctClass(totalProfit)}>{signedMoney(totalProfit)}</span>} label="浮动盈亏" />
        <Stat value={`${rows.length}`} label="持仓数" />
      </div>

      {rows.length ? (
        <>
          <div className="cx-sechead">
            <span className="cx-sechead__t">持仓分布</span>
            <span className="cx-sechead__sub">按市值占比</span>
          </div>
          <Card style={{ marginBottom: 14 }}>
            <PieChart data={rows.map((r) => ({ label: r.name, value: r.value }))} />
          </Card>

          <div className="cx-sechead">
            <span className="cx-sechead__t">我的持仓</span>
            <span className="cx-sechead__sub">{rows.length} 只</span>
          </div>
          {rows.map((r) => (
            <Row
              key={r.pos.symbol}
              title={
                <>
                  {r.name} <span className="cx-stk-code">{r.pos.symbol}</span>
                </>
              }
              sub={`${r.pos.shares} 股 · 成本 ¥${r.pos.avgCost.toFixed(2)} · 现价 ¥${r.price.toFixed(2)}`}
              right={
                <span className="cx-stk-quote">
                  <b className={pctClass(r.profit)}>{signedMoney(r.profit)}</b>
                  <i className={pctClass(r.pct)}>{fmtPct(r.pct)}</i>
                </span>
              }
              onClick={() => nav.push({ view: 'stock', id: r.pos.symbol })}
              arrow
            />
          ))}
        </>
      ) : (
        <Empty icon={<Wallet size={28} />} text="当前空仓" hint="切换到「行情」，点开个股买入" />
      )}
    </>
  )
}

/* ---------- 持仓饼图（SVG 手写环形图） ---------- */

function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  if (!total) return null
  const colors = ['#ff5b5b', '#e6b566', '#6aa9ff', '#3ddc84', '#c98bff', '#5fd0d0', '#f08c4a', '#9aa0a6', '#d3599c', '#7f8cff']
  const cx = 70
  const cy = 70
  const R = 58
  const r = 34
  const pt = (ang: number, rad: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)] as const
  const arc = (a0: number, a1: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0
    const [x0, y0] = pt(a0, R)
    const [x1, y1] = pt(a1, R)
    const [x2, y2] = pt(a1, r)
    const [x3, y3] = pt(a0, r)
    return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`
  }
  let acc = -Math.PI / 2
  const slices = data.map((d, i) => {
    const frac = d.value / total
    const a0 = acc
    const a1 = acc + frac * Math.PI * 2
    acc = a1
    return { d, a0, a1, color: colors[i % colors.length], frac }
  })
  return (
    <div className="cx-stk-pie">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {slices.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={R} fill={slices[0].color} />
            <circle cx={cx} cy={cy} r={r} fill="var(--fx-face)" />
          </>
        ) : (
          slices.map((s, i) => <path key={i} d={arc(s.a0, s.a1)} fill={s.color} />)
        )}
      </svg>
      <div className="cx-stk-pie__legend">
        {slices.map((s, i) => (
          <div key={i} className="cx-stk-pie__item">
            <span className="cx-stk-pie__dot" style={{ background: s.color }} />
            <span className="cx-stk-pie__label">{s.d.label}</span>
            <span className="cx-stk-pie__pct">{(s.frac * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 全市股民排行（mock + 我的总资产插入） ---------- */

const RANK_MOCK: { name: string; total: number }[] = [
  { name: '温时', total: 2860000 },
  { name: '顾南', total: 1730000 },
  { name: '白序', total: 1250000 },
  { name: '陆听', total: 980000 },
  { name: '程知', total: 760000 },
  { name: '江野', total: 520000 },
  { name: '苏叙', total: 310000 },
  { name: '叶澄', total: 145000 },
]

function RankPanel() {
  const portfolio = useMulCity((s) => s.stockMarket.portfolio)
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const cash = useMulCity((s) => s.stockMarket.cash)
  const initial = useMulCity((s) => s.stockMarket.initialCapital)
  const me = useMe()

  const marketValue = portfolio.reduce(
    (a, p) => a + p.shares * (stocks.find((x) => x.symbol === p.symbol)?.price ?? p.avgCost),
    0
  )
  const myTotal = cash + marketValue
  const base = initial || 1

  const entries = useMemo(() => {
    const list = [...RANK_MOCK.map((r) => ({ name: r.name, total: r.total, me: false })), { name: me.name, total: myTotal, me: true }]
    return list.sort((a, b) => b.total - a.total)
  }, [myTotal, me.name])

  return (
    <>
      <div className="cx-sechead">
        <span className="cx-sechead__t">全市股民排行</span>
        <span className="cx-sechead__sub">按总资产</span>
      </div>
      <Card>
        {entries.map((e, i) => {
          const rate = ((e.total - base) / base) * 100
          return (
            <div key={`${e.name}-${i}`} className={`cx-stk-rank ${e.me ? 'cx-stk-rank--me' : ''}`}>
              <span className={`cx-stk-rank__no ${i < 3 ? `cx-stk-rank__no--${i + 1}` : ''}`}>{i + 1}</span>
              <span className="cx-stk-rank__name">
                {e.name}
                {e.me && <span className="cx-tag cx-tag--on">我</span>}
              </span>
              <span className="cx-stk-rank__total">¥{money(e.total)}</span>
              <span className={`cx-stk-rank__rate ${pctClass(rate)}`}>{fmtPct(rate)}</span>
            </div>
          )
        })}
      </Card>
    </>
  )
}

/* ---------- 经济：景气度 / 初始资金 / 交易记录 ---------- */

const CAPITAL_OPTIONS = [100000, 500000, 1000000]

function EconomyPanel() {
  const economy = useMulCity((s) => s.stockMarket.economy)
  const setEconomy = useMulCity((s) => s.setEconomy)
  const initialCapital = useMulCity((s) => s.stockMarket.initialCapital)
  const setInitialCapital = useMulCity((s) => s.setInitialCapital)
  const trades = useMulCity((s) => s.stockMarket.trades)
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const nav = useCityNav()

  const label = economy >= 70 ? '过热' : economy >= 55 ? '偏热' : economy >= 45 ? '平稳' : economy >= 30 ? '偏冷' : '低迷'

  return (
    <>
      <div className="cx-sechead">
        <span className="cx-sechead__t">Mul市经济景气度</span>
        <span className="cx-sechead__sub">{label}</span>
      </div>
      <Card style={{ marginBottom: 14 }}>
        <Gauge value={economy} />
        <div className="cx-stk-gauge__cap">
          景气度 <b>{economy}</b> / 100
        </div>
        <div className="cx-acts" style={{ justifyContent: 'center', marginTop: 8 }}>
          {[
            { v: 30, t: '偏冷' },
            { v: 50, t: '平稳' },
            { v: 75, t: '偏热' },
          ].map((o) => (
            <button
              key={o.v}
              className={`cx-tag ${Math.round(economy) === o.v ? 'cx-tag--on' : 'cx-tag--front'}`}
              onClick={() => setEconomy(o.v)}
            >
              {o.t}
            </button>
          ))}
        </div>
      </Card>

      <div className="cx-sechead">
        <span className="cx-sechead__t">初始资金</span>
        <span className="cx-sechead__sub">切换将重置持仓与记录</span>
      </div>
      <div className="cx-acts" style={{ marginBottom: 14 }}>
        {CAPITAL_OPTIONS.map((a) => (
          <button
            key={a}
            className={`cx-tag ${initialCapital === a ? 'cx-tag--on' : 'cx-tag--front'}`}
            onClick={() => setInitialCapital(a)}
          >
            {a / 10000} 万
          </button>
        ))}
      </div>

      <div className="cx-sechead">
        <span className="cx-sechead__t">交易记录</span>
        <span className="cx-sechead__sub">{trades.length} 笔</span>
      </div>
      {trades.length ? (
        <Card>
          {trades.map((t) => {
            const st = stocks.find((x) => x.symbol === t.symbol)
            return (
              <Row
                key={t.id}
                title={
                  <>
                    {st?.name ?? t.symbol}{' '}
                    <span className={`cx-tag ${t.side === 'buy' ? 'cx-up' : 'cx-down'}`}>
                      {t.side === 'buy' ? '买入' : '卖出'}
                    </span>
                  </>
                }
                sub={`${t.shares} 股 · ¥${t.price.toFixed(2)} · ${fmtCityTime(t.at)}`}
                right={
                  <span className={`cx-stk-trade__amt ${t.side === 'buy' ? 'cx-up' : 'cx-down'}`}>
                    {t.side === 'buy' ? '-' : '+'}¥{money(t.amount)}
                  </span>
                }
                onClick={() => nav.push({ view: 'stock', id: t.symbol })}
                arrow
              />
            )
          })}
        </Card>
      ) : (
        <Empty icon={<Newspaper size={26} />} text="还没有交易记录" hint="去「行情」买入第一只股票" />
      )}
    </>
  )
}

/* ---------- 景气度仪表（半圆 SVG） ---------- */

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  const cx = 90
  const cy = 84
  const R = 70
  const theta = Math.PI * (1 - v / 100)
  const ex = cx + R * Math.cos(theta)
  const ey = cy - R * Math.sin(theta)
  const nx = cx + (R - 16) * Math.cos(theta)
  const ny = cy - (R - 16) * Math.sin(theta)
  return (
    <svg className={`cx-stk-gauge ${pctClass(v - 50)}`} viewBox="0 0 180 112" width="100%" height={112}>
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} className="cx-stk-gauge__track" fill="none" />
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${v > 50 ? 1 : 0} 1 ${ex} ${ey}`}
        className="cx-stk-gauge__fill"
        fill="none"
      />
      <line x1={cx} y1={cy} x2={nx} y2={ny} className="cx-stk-gauge__needle" />
      <circle cx={cx} cy={cy} r={4.5} className="cx-stk-gauge__hub" />
      <text x={cx - R} y={cy + 16} className="cx-stk-gauge__tick" textAnchor="middle">
        0
      </text>
      <text x={cx + R} y={cy + 16} className="cx-stk-gauge__tick" textAnchor="middle">
        100
      </text>
    </svg>
  )
}
