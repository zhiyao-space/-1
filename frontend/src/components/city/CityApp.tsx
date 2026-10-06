import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AtSign,
  Briefcase,
  Building2,
  CreditCard,
  Globe,
  LineChart,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Music2,
  Newspaper,
  Plane,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useUI, useToast } from '../../store/ui'
import { fmtCityClock, useMulCity, type CityTabKey } from '../../store/mulCity'
import { CityNavContext, useCityNav, type CityNav, type CityRoute } from './cityNav'
import { RouteView } from './cityDetails'
import CityHomeTab from './CityHomeTab'
import CivilTab from './CivilTab'
import TravelTab from './TravelTab'
import ShowTab from './ShowTab'
import ServiceTab from './ServiceTab'
import SocialTab from './SocialTab'
import WorkTab from './WorkTab'
import AdminTab from './AdminTab'
import NewsTab from './NewsTab'
import MicroblogTab from './MicroblogTab'
import BrowserTab from './BrowserTab'
import StockTab from './StockTab'
import '../../styles/factory.css'
import '../../styles/city.css'

/* ============================================================
   Mul市
   运行在小手机内部的完整虚拟城市生活模拟系统
   底部 12 Tab：Mul市 | 市籍 | 出行 | 演出 | 公共服务 | 社交 | 工作 | 管理
              | 新闻 | 微博 | 浏览器 | 股市
   ============================================================ */

const TABS: { key: CityTabKey; label: string; icon: typeof MapIcon }[] = [
  { key: 'city', label: 'Mul市', icon: MapIcon },
  { key: 'civil', label: '市籍', icon: CreditCard },
  { key: 'travel', label: '出行', icon: Plane },
  { key: 'show', label: '演出', icon: Music2 },
  { key: 'service', label: '公共服务', icon: Building2 },
  { key: 'social', label: '社交', icon: MessageSquare },
  { key: 'work', label: '工作', icon: Briefcase },
  { key: 'news', label: '新闻', icon: Newspaper },
  { key: 'microblog', label: '微博', icon: AtSign },
  { key: 'browser', label: '浏览器', icon: Globe },
  { key: 'stock', label: '股市', icon: LineChart },
  { key: 'admin', label: '管理', icon: Settings2 },
]

const RATES: { v: number; label: string }[] = [
  { v: 0, label: '暂停' },
  { v: 1, label: '实时' },
  { v: 2, label: '2×' },
  { v: 5, label: '5×' },
]

function CityTopBar() {
  const city = useMulCity((s) => s.city)
  const people = useMulCity((s) => s.people)
  const setTimeScale = useMulCity((s) => s.setTimeScale)
  const closeApp = useUI((s) => s.closeApp)
  const online = people.filter((p) => p.isOnline).length

  return (
    <div className="cx-top">
      <div className="cx-top__row">
        <span className="cx-brand">
          Mul市
          <small>CITY SYSTEM</small>
        </span>
        <span className="cx-clock">
          <b>{fmtCityClock(city.cityTime)}</b>
          <span>
            {city.year}年 · {city.weather} · 在线 {online}/{people.length}
          </span>
        </span>
        <button
          className="cx-rate fx-press"
          style={{ alignSelf: 'center' }}
          onClick={() => {
            if (confirm('离开 Mul市，回到桌面？')) closeApp()
          }}
          aria-label="退出"
        >
          <LogOut size={15} />
        </button>
      </div>
      <div className="cx-weatherstrip">
        <span>城市时间流速</span>
        <span className="cx-timespeed">
          {RATES.map((r) => (
            <button
              key={r.v}
              className={`cx-rate fx-press ${city.timeScale === r.v ? 'cx-rate--on' : ''}`}
              onClick={() => setTimeScale(r.v)}
            >
              {r.label}
            </button>
          ))}
        </span>
      </div>
    </div>
  )
}

/** 事件引擎浮标：任意 Tab 都能看到进行中的事件并直接参与 */
function EventFab() {
  const active = useMulCity((s) => s.events.active)
  const nav = useCityNav()

  if (!active.length) return null
  const top = active[0]

  return (
    <button
      className="cx-eventfab fx-press"
      onClick={() => nav.push({ view: 'gameevent', id: top.id })}
      title="Mul市正在发生 · 点击参与"
    >
      <Sparkles size={14} />
      <span className="cx-eventfab__t">{top.title}</span>
      {active.length > 1 && <b className="cx-eventfab__n">{active.length}</b>}
    </button>
  )
}

export default function CityApp() {
  const [tab, setTab] = useState<CityTabKey>('city')
  const [stack, setStack] = useState<CityRoute[]>([])
  const tick = useMulCity((s) => s.tick)
  const pushToast = useToast((s) => s.push)

  // 城市时间推进
  useEffect(() => {
    tick()
    const timer = window.setInterval(() => tick(), 1000)
    return () => window.clearInterval(timer)
  }, [tick])

  const nav = useMemo<CityNav>(
    () => ({
      push: (route) => setStack((s) => [...s, route]),
      pop: () => setStack((s) => s.slice(0, -1)),
      close: () => setStack([]),
      stack,
      goTab: (t) => {
        setStack([])
        setTab(t)
      },
    }),
    [stack]
  )

  const goTab = useCallback((t: CityTabKey) => {
    setStack([])
    setTab(t)
  }, [])

  const current = stack[stack.length - 1]

  return (
    <div className="fx-root cx-root">
      <CityNavContext.Provider value={nav}>
        <CityTopBar />

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {tab === 'city' && <CityHomeTab />}
          {tab === 'civil' && <CivilTab />}
          {tab === 'travel' && <TravelTab />}
          {tab === 'show' && <ShowTab />}
          {tab === 'service' && <ServiceTab />}
          {tab === 'social' && <SocialTab />}
          {tab === 'work' && <WorkTab />}
          {tab === 'news' && <NewsTab />}
          {tab === 'microblog' && <MicroblogTab />}
          {tab === 'browser' && <BrowserTab />}
          {tab === 'stock' && <StockTab />}
          {tab === 'admin' && <AdminTab onToast={pushToast} />}
        </div>

        {/* 事件引擎浮标：进行中的事件在任何 Tab 都能看到并参与 */}
        {!current && <EventFab />}

        {current && (
          <div
            className="page-slide"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 200,
              background: 'linear-gradient(180deg, #000000 0%, #1a1a1a 46%, #0a0a0a 100%)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <RouteView view={current.view} id={current.id} />
          </div>
        )}
      </CityNavContext.Provider>

      <nav className="cx-nav">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              className={`cx-nav__item ${tab === t.key ? 'cx-nav__item--on' : ''}`}
              onClick={() => goTab(t.key)}
            >
              <Icon size={18} strokeWidth={tab === t.key ? 2.3 : 1.8} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
