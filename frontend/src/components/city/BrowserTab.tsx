import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clock,
  Download,
  Globe,
  Home,
  Menu,
  Moon,
  Newspaper,
  Plus,
  RotateCw,
  Search,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  fmtCityTime,
  personById,
  useMulCity,
  type BrowserBookmark,
  type BrowserTab,
  type BrowserTabKind,
  type BrowseResult,
  type Person,
  type WebBlock,
  type WebPage,
} from '../../store/mulCity'
import { localBrowseResults, localWebPage } from '../../lib/cityCatalog'
import { generateBrowseResults, generateWebPage, hasCityAi } from '../../lib/cityEngine'
import { Empty, LandmarkRow, PersonRow, Progress, Row, Sheet } from './cityParts'
import { useCityNav } from './cityNav'
import '../../styles/cityBrowser.css'

/* ============================================================
   Tab11 · 浏览器（Mul市内建浏览器）
   地址栏 | 多标签页 | 首页 / 搜索 / 网页 / 本地搜索
   底部：首页 / 书签 / 下载 / 菜单
   ============================================================ */

type Panel = 'bookmarks' | 'downloads' | 'menu'

/** 单个标签页的导航快照，用于前进 / 后退 */
interface NavEntry {
  kind: BrowserTabKind
  url: string
  title: string
  query: string
  results: BrowseResult[]
}

interface NavStack {
  stack: NavEntry[]
  index: number
}

const ENGINES: { key: string; label: string; local: boolean }[] = [
  { key: 'mulSearch', label: '全网搜索', local: false },
  { key: 'mulLocal', label: 'Mul市本地搜索', local: true },
]

const DOWNLOAD_KINDS = ['网页存档', '城市地图', '数据文件', '图片']

async function loadResults(query: string, people: Person[]): Promise<BrowseResult[]> {
  if (hasCityAi()) {
    try {
      const r = await generateBrowseResults(query, people)
      if (r && r.length) return r
    } catch {
      /* 回退到本地生成 */
    }
  }
  return localBrowseResults(query, people)
}

async function loadPage(url: string, people: Person[]): Promise<WebPage> {
  if (hasCityAi()) {
    try {
      const p = await generateWebPage(url, people)
      if (p) return p
    } catch {
      /* 回退到本地生成 */
    }
  }
  return localWebPage(url, people)
}

function snapshot(t: BrowserTab): NavEntry {
  return { kind: t.kind, url: t.url, title: t.title, query: t.query, results: t.results }
}

function matches(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q.toLowerCase())
}

export default function BrowserTab() {
  const browser = useMulCity((s) => s.browser)
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const headlines = useMulCity((s) => s.news.headlines)
  const hotSearch = useMulCity((s) => s.microblog.hotSearch)
  const posts = useMulCity((s) => s.microblog.posts)
  const stocks = useMulCity((s) => s.stockMarket.stocks)
  const openBrowserTab = useMulCity((s) => s.openBrowserTab)
  const closeBrowserTab = useMulCity((s) => s.closeBrowserTab)
  const activateBrowserTab = useMulCity((s) => s.activateBrowserTab)
  const setBrowserTab = useMulCity((s) => s.setBrowserTab)
  const browserVisit = useMulCity((s) => s.browserVisit)
  const addBookmark = useMulCity((s) => s.addBookmark)
  const removeBookmark = useMulCity((s) => s.removeBookmark)
  const clearHistory = useMulCity((s) => s.clearHistory)
  const setSearchEngine = useMulCity((s) => s.setSearchEngine)
  const setBrowserNight = useMulCity((s) => s.setBrowserNight)
  const startDownload = useMulCity((s) => s.startDownload)
  const removeDownload = useMulCity((s) => s.removeDownload)
  const nav = useCityNav()

  const activeTab: BrowserTab | undefined = browser.tabs.find((t) => t.id === browser.activeTabId) ?? browser.tabs[0]

  const [address, setAddress] = useState('')
  const [homeQuery, setHomeQuery] = useState('')
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [navStacks, setNavStacks] = useState<Record<string, NavStack>>({})
  const [pages, setPages] = useState<Record<string, WebPage>>({})

  // 网页缓存用 ref 同步，避免异步回调读到过期 state
  const pagesRef = useRef<Record<string, WebPage>>(pages)
  const doneRef = useRef<Set<string>>(new Set())

  const pageKey = (tabId: string, url: string) => `${tabId}::${url}`

  const putPage = (key: string, page: WebPage) => {
    pagesRef.current = { ...pagesRef.current, [key]: page }
    setPages(pagesRef.current)
  }

  /* ---------- 地址栏同步 ---------- */
  useEffect(() => {
    setAddress(activeTab?.url ?? '')
  }, [activeTab?.id, activeTab?.url])

  /* ---------- 网页内容按需生成/取缓存 ---------- */
  useEffect(() => {
    if (!activeTab || activeTab.kind !== 'page' || !activeTab.url) return
    const tabId = activeTab.id
    const url = activeTab.url
    const key = pageKey(tabId, url)
    if (pagesRef.current[key]) return
    let alive = true
    void (async () => {
      const page = await loadPage(url, people)
      if (!alive) return
      putPage(key, page)
      setBrowserTab(tabId, { title: page.title })
    })()
    return () => {
      alive = false
    }
  }, [activeTab?.id, activeTab?.kind, activeTab?.url, people, setBrowserTab])

  /* ---------- 下载完成提示 ---------- */
  useEffect(() => {
    for (const d of browser.downloads) {
      if (d.done && !doneRef.current.has(d.id)) {
        doneRef.current.add(d.id)
        setNotice(`《${d.name}》下载完成`)
      }
    }
  }, [browser.downloads])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(t)
  }, [notice])

  const folders = useMemo(() => {
    const map = new Map<string, BrowserBookmark[]>()
    for (const b of browser.bookmarks) {
      const arr = map.get(b.folder)
      if (arr) arr.push(b)
      else map.set(b.folder, [b])
    }
    return [...map.entries()]
  }, [browser.bookmarks])

  if (!activeTab) {
    return (
      <div className="cb-root">
        <div className="cb-scroll">
          <Empty icon={<Globe size={28} />} text="没有打开的标签页" hint="点下面的按钮新建一个" />
          <button className="fx-btn fx-btn--accent fx-press" onClick={() => openBrowserTab()}>
            <Plus size={14} /> 新建标签页
          </button>
        </div>
      </div>
    )
  }

  /* ---------- 导航模型 ---------- */
  const applyEntry = (tabId: string, entry: NavEntry) => {
    setBrowserTab(tabId, {
      kind: entry.kind,
      url: entry.url,
      title: entry.title,
      query: entry.query,
      results: entry.results,
    })
    if (entry.kind !== 'home') browserVisit(tabId, entry.url, entry.title)
  }

  const navigate = (entry: NavEntry) => {
    const tabId = activeTab.id
    const base = snapshot(activeTab)
    setNavStacks((m) => {
      const cur = m[tabId] ?? { stack: [base], index: 0 }
      const stack = [...cur.stack.slice(0, cur.index + 1), entry]
      return { ...m, [tabId]: { stack, index: stack.length - 1 } }
    })
    applyEntry(tabId, entry)
  }

  const currentStack = navStacks[activeTab.id]
  const canBack = !!currentStack && currentStack.index > 0
  const canForward = !!currentStack && currentStack.index < currentStack.stack.length - 1

  const goBack = () => {
    if (!canBack || !currentStack) return
    const index = currentStack.index - 1
    setNavStacks((m) => ({ ...m, [activeTab.id]: { ...currentStack, index } }))
    applyEntry(activeTab.id, currentStack.stack[index])
  }

  const goForward = () => {
    if (!canForward || !currentStack) return
    const index = currentStack.index + 1
    setNavStacks((m) => ({ ...m, [activeTab.id]: { ...currentStack, index } }))
    applyEntry(activeTab.id, currentStack.stack[index])
  }

  /* ---------- 操作 ---------- */
  const runSearch = async (query: string, local: boolean) => {
    const q = query.trim()
    if (!q) return
    setBusy(true)
    try {
      if (local) {
        navigate({ kind: 'local', url: `mul.city/local?q=${encodeURIComponent(q)}`, title: `本地搜索：${q}`, query: q, results: [] })
      } else {
        const results = await loadResults(q, people)
        navigate({ kind: 'search', url: `mul.city/search?q=${encodeURIComponent(q)}`, title: `${q} · Mul市搜索`, query: q, results })
      }
    } finally {
      setBusy(false)
    }
  }

  const openPage = (url: string, title?: string) => {
    navigate({ kind: 'page', url, title: title ?? url, query: '', results: [] })
  }

  const submitAddress = () => {
    const v = address.trim()
    if (!v) return
    const looksLikeUrl = !/\s/.test(v) && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(v)
    if (looksLikeUrl) openPage(v)
    else void runSearch(v, false)
  }

  const refresh = async () => {
    const t = activeTab
    if (t.kind === 'page' && t.url) {
      setBusy(true)
      try {
        const page = await loadPage(t.url, people)
        putPage(pageKey(t.id, t.url), page)
        setBrowserTab(t.id, { title: page.title })
      } finally {
        setBusy(false)
      }
    } else if (t.kind === 'search') {
      setBusy(true)
      try {
        const results = await loadResults(t.query || t.title, people)
        setBrowserTab(t.id, { results })
      } finally {
        setBusy(false)
      }
    }
  }

  const goHome = () => {
    if (activeTab.kind === 'home') return
    navigate({ kind: 'home', url: '', title: '新标签页', query: '', results: [] })
  }

  const openQuickLink = (title: string, url: string) => {
    if (url.includes('/local')) {
      navigate({ kind: 'local', url, title: `本地搜索：${title}`, query: '', results: [] })
    } else {
      openPage(url, title)
    }
  }

  const downloadCurrent = () => {
    const name = activeTab.kind === 'page' && activeTab.url ? `${activeTab.title || activeTab.url}.html` : 'Mul市门户.html'
    startDownload(name, DOWNLOAD_KINDS[0])
    setNotice(`开始下载《${name}》`)
  }

  /* ---------- 主动体渲染 ---------- */
  const renderHome = () => {
    const engine = browser.searchEngine
    const engineLocal = ENGINES.find((e) => e.key === engine)?.local ?? false
    const topStocks = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 4)
    return (
      <div className="cb-scroll">
        <div className="cb-homehead">
          <Globe size={22} />
          <div>
            <b>Mul市浏览器</b>
            <span>城市内部网络 · {city.name}节点</span>
          </div>
        </div>

        <form
          className="cb-homesearch"
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(homeQuery, engineLocal)
          }}
        >
          <div className="cb-engine">
            {ENGINES.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`cb-engine__btn ${engine === e.key ? 'cb-engine__btn--on' : ''}`}
                onClick={() => setSearchEngine(e.key)}
              >
                {e.label}
              </button>
            ))}
          </div>
          <input
            className="fx-input"
            value={homeQuery}
            onChange={(e) => setHomeQuery(e.target.value)}
            placeholder={engineLocal ? '搜索居民 / 地点 / 事件…' : '在 Mul市 搜索…'}
          />
          <button type="submit" className="fx-btn fx-btn--accent fx-press cb-homesearch__go" disabled={busy}>
            <Search size={15} /> {busy ? '检索中…' : '搜索'}
          </button>
        </form>

        <div className="cx-sechead">
          <span className="cx-sechead__t">快捷链接</span>
          <span className="cx-sechead__sub">{browser.quickLinks.length} 个</span>
        </div>
        <div className="cb-quick">
          {browser.quickLinks.map((q) => (
            <button key={q.id} className="cb-quick__item fx-press" onClick={() => openQuickLink(q.title, q.url)}>
              <span className="cb-quick__dot" />
              <b>{q.title}</b>
              <span>{q.desc}</span>
            </button>
          ))}
        </div>

        <div className="cx-sechead">
          <span className="cx-sechead__t">微博热搜</span>
          <span className="cx-sechead__sub">实时</span>
        </div>
        {hotSearch.length ? (
          <div className="cb-reco">
            {hotSearch.slice(0, 6).map((t, i) => (
              <button key={t.id} className="cb-reco__item fx-press" onClick={() => void runSearch(t.title, false)}>
                <span className={`cb-reco__rank ${i < 3 ? 'cb-reco__rank--hot' : ''}`}>{i + 1}</span>
                <span className="cb-reco__text">{t.title}</span>
                <span className="cb-reco__meta">{t.heat}</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty icon={<TrendingUp size={24} />} text="暂时没有热搜" />
        )}

        <div className="cx-sechead">
          <span className="cx-sechead__t">新闻头条</span>
          <span className="cx-sechead__sub">今日</span>
        </div>
        {headlines.length ? (
          headlines.slice(0, 4).map((n) => (
            <Row
              key={n.id}
              icon={<Newspaper size={17} />}
              title={n.title}
              sub={`${n.category} · ${n.source}`}
              onClick={() => nav.push({ view: 'news', id: n.id })}
              arrow
            />
          ))
        ) : (
          <Empty icon={<Newspaper size={24} />} text="暂无新闻" />
        )}

        <div className="cx-sechead">
          <span className="cx-sechead__t">热门股票</span>
          <span className="cx-sechead__sub">涨幅榜</span>
        </div>
        {topStocks.length ? (
          topStocks.map((s) => (
            <Row
              key={s.symbol}
              icon={<TrendingUp size={17} />}
              title={s.name}
              sub={`${s.symbol} · ${s.sector}`}
              right={
                <span className={s.changePct >= 0 ? 'cb-up' : 'cb-down'}>
                  {s.changePct >= 0 ? '+' : ''}
                  {s.changePct.toFixed(2)}%
                </span>
              }
              onClick={() => nav.push({ view: 'stock', id: s.symbol })}
              arrow
            />
          ))
        ) : (
          <Empty icon={<TrendingUp size={24} />} text="暂无行情" />
        )}
      </div>
    )
  }

  const renderSearch = () => {
    const results = activeTab.results
    return (
      <div className="cb-scroll">
        <div className="cb-searchhead">
          <Search size={15} />
          <span>
            关于「<b>{activeTab.query || activeTab.title}</b>」的搜索结果
          </span>
          <span className="cb-searchhead__count">{results.length} 条</span>
        </div>
        {results.length ? (
          results.map((r) => (
            <button key={r.id} className="cb-result fx-press" onClick={() => openPage(r.url, r.title)}>
              <div className="cb-result__site">
                <span className="cb-result__dot" />
                {r.site}
              </div>
              <div className="cb-result__title">{r.title}</div>
              <div className="cb-result__summary">{r.summary}</div>
              <div className="cb-result__url">{r.url}</div>
            </button>
          ))
        ) : (
          <Empty icon={<Search size={28} />} text="没有找到相关结果" hint="换个关键词再试试" />
        )}
      </div>
    )
  }

  const renderPage = () => {
    const key = pageKey(activeTab.id, activeTab.url)
    const page = pages[key]
    if (!page) {
      return (
        <div className="cb-scroll">
          <div className="cb-loading">
            <RotateCw size={18} className="cb-spin" />
            <span>正在加载页面…</span>
          </div>
        </div>
      )
    }
    return (
      <div className="cb-scroll">
        <div className="cb-page">
          <div className="cb-page__bar">
            <span className="cb-page__site">{page.site}</span>
            <span className="cb-page__url">{page.url}</span>
          </div>
          <h2 className="cb-page__title">{page.title}</h2>
          {page.blocks.map((b, i) => renderBlock(b, i))}
          <div className="cb-page__acts">
            <button className="fx-btn fx-press" onClick={() => addBookmark(page.title, page.url, '收藏')}>
              <Star size={14} /> 收藏本页
            </button>
            <button className="fx-btn fx-press" onClick={downloadCurrent}>
              <Download size={14} /> 下载此页
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderLocal = () => {
    const q = (activeTab.query || '').trim()
    const personHits = people.filter((p) => (q ? matches(`${p.name} ${p.nickname} ${p.occupation}`, q) : true)).slice(0, 6)
    const landmarkHits = city.landmarks.filter((l) => (q ? matches(`${l.name} ${l.type} ${l.description}`, q) : true)).slice(0, 6)
    const newsHits = headlines.filter((n) => (q ? matches(`${n.title} ${n.summary} ${n.category}`, q) : true)).slice(0, 5)
    const postHits = posts.filter((p) => (q ? matches(`${p.content} ${p.tags.join(' ')}`, q) : true)).slice(0, 5)
    const empty = !personHits.length && !landmarkHits.length && !newsHits.length && !postHits.length

    return (
      <div className="cb-scroll">
        <div className="cb-searchhead">
          <Search size={15} />
          <span>
            Mul市本地检索{q ? <>「<b>{q}</b>」</> : '（全部）'}
          </span>
        </div>

        {empty ? (
          <Empty icon={<Search size={28} />} text="这座城市里没有匹配的内容" hint="试试居民姓名、地标或话题" />
        ) : (
          <>
            {personHits.length > 0 && (
              <>
                <div className="cx-sechead"><span className="cx-sechead__t">居民</span><span className="cx-sechead__sub">{personHits.length}</span></div>
                {personHits.map((p) => (
                  <PersonRow key={p.id} person={p} onClick={() => nav.push({ view: 'person', id: p.id })} arrow />
                ))}
              </>
            )}

            {landmarkHits.length > 0 && (
              <>
                <div className="cx-sechead"><span className="cx-sechead__t">地标</span><span className="cx-sechead__sub">{landmarkHits.length}</span></div>
                {landmarkHits.map((l) => (
                  <LandmarkRow key={l.id} landmark={l} onClick={() => nav.push({ view: 'landmark', id: l.id })} />
                ))}
              </>
            )}

            {newsHits.length > 0 && (
              <>
                <div className="cx-sechead"><span className="cx-sechead__t">资讯</span><span className="cx-sechead__sub">{newsHits.length}</span></div>
                {newsHits.map((n) => (
                  <Row
                    key={n.id}
                    icon={<Newspaper size={17} />}
                    title={n.title}
                    sub={`${n.category} · ${fmtCityTime(n.at)}`}
                    onClick={() => nav.push({ view: 'news', id: n.id })}
                    arrow
                  />
                ))}
              </>
            )}

            {postHits.length > 0 && (
              <>
                <div className="cx-sechead"><span className="cx-sechead__t">帖子</span><span className="cx-sechead__sub">{postHits.length}</span></div>
                {postHits.map((p) => {
                  const author = personById(people, p.authorId)
                  return (
                    <Row
                      key={p.id}
                      icon={<TrendingUp size={17} />}
                      title={p.content.slice(0, 26)}
                      sub={`${author?.name ?? '匿名居民'} · ${fmtCityTime(p.createdAt)}`}
                      onClick={() => nav.push({ view: 'post', id: p.id })}
                      arrow
                    />
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
    )
  }

  const renderBody = () => {
    if (busy && activeTab.kind !== 'page') {
      return (
        <div className="cb-scroll">
          <div className="cb-loading">
            <RotateCw size={18} className="cb-spin" />
            <span>正在检索 Mul市网络…</span>
          </div>
        </div>
      )
    }
    switch (activeTab.kind) {
      case 'home':
        return renderHome()
      case 'search':
        return renderSearch()
      case 'page':
        return renderPage()
      case 'local':
        return renderLocal()
    }
  }

  return (
    <div className={`cb-root ${browser.night ? 'cb-night' : ''}`}>
      {/* 地址栏 */}
      <form
        className="cb-addr"
        onSubmit={(e) => {
          e.preventDefault()
          submitAddress()
        }}
      >
        <input
          className="fx-input cb-addr__input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="输入网址或搜索词"
        />
        <div className="cb-addr__acts">
          <button type="button" className="cb-navbtn fx-press" onClick={goBack} disabled={!canBack} aria-label="后退">
            <ArrowLeft size={15} />
          </button>
          <button type="button" className="cb-navbtn fx-press" onClick={goForward} disabled={!canForward} aria-label="前进">
            <ArrowRight size={15} />
          </button>
          <button type="button" className="cb-navbtn fx-press" onClick={() => void refresh()} aria-label="刷新">
            <RotateCw size={15} />
          </button>
        </div>
      </form>

      {/* 标签栏 */}
      <div className="cb-tabs">
        {browser.tabs.map((t) => (
          <button
            key={t.id}
            className={`cb-tab fx-press ${t.id === activeTab.id ? 'cb-tab--on' : ''}`}
            onClick={() => activateBrowserTab(t.id)}
          >
            <span className="cb-tab__title">{t.title || '新标签页'}</span>
            {browser.tabs.length > 1 && (
              <span
                className="cb-tab__x"
                role="button"
                aria-label="关闭标签"
                onClick={(e) => {
                  e.stopPropagation()
                  closeBrowserTab(t.id)
                }}
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}
        <button className="cb-tab cb-tab--new fx-press" onClick={() => openBrowserTab()} aria-label="新建标签页">
          <Plus size={15} />
        </button>
      </div>

      {/* 主体 */}
      <div className="cb-body">{renderBody()}</div>

      {/* 底部工具栏 */}
      <nav className="cb-toolbar">
        <button className={`cb-toolbar__btn ${activeTab.kind === 'home' ? 'cb-toolbar__btn--on' : ''}`} onClick={goHome}>
          <Home size={17} />
          <span>首页</span>
        </button>
        <button className={`cb-toolbar__btn ${panel === 'bookmarks' ? 'cb-toolbar__btn--on' : ''}`} onClick={() => setPanel('bookmarks')}>
          <Bookmark size={17} />
          <span>书签</span>
        </button>
        <button className={`cb-toolbar__btn ${panel === 'downloads' ? 'cb-toolbar__btn--on' : ''}`} onClick={() => setPanel('downloads')}>
          <Download size={17} />
          <span>下载</span>
        </button>
        <button className={`cb-toolbar__btn ${panel === 'menu' ? 'cb-toolbar__btn--on' : ''}`} onClick={() => setPanel('menu')}>
          <Menu size={17} />
          <span>菜单</span>
        </button>
      </nav>

      {notice && <div className="cb-notice">{notice}</div>}

      {/* 书签 */}
      <Sheet open={panel === 'bookmarks'} onClose={() => setPanel(null)} title={<><Bookmark size={15} /> 书签</>}>
        {folders.length ? (
          folders.map(([folder, list]) => (
            <div key={folder} className="cb-group">
              <div className="cx-sechead"><span className="cx-sechead__t">{folder}</span><span className="cx-sechead__sub">{list.length}</span></div>
              {list.map((b) => (
                <Row
                  key={b.id}
                  icon={<Star size={16} />}
                  title={b.title}
                  sub={b.url}
                  onClick={() => {
                    openPage(b.url, b.title)
                    setPanel(null)
                  }}
                  right={
                    <button
                      className="cb-iconbtn fx-press"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBookmark(b.id)
                      }}
                      aria-label="删除书签"
                    >
                      <Trash2 size={14} />
                    </button>
                  }
                />
              ))}
            </div>
          ))
        ) : (
          <Empty icon={<Bookmark size={28} />} text="还没有书签" hint="打开网页后点「收藏本页」" />
        )}
      </Sheet>

      {/* 下载 */}
      <Sheet open={panel === 'downloads'} onClose={() => setPanel(null)} title={<><Download size={15} /> 下载</>}>
        <div className="cb-acts">
          <button className="fx-btn fx-press" onClick={() => startDownload('Mul市城市地图.zip', DOWNLOAD_KINDS[1])}>
            <Download size={14} /> 模拟下载地图
          </button>
          <button className="fx-btn fx-press" onClick={() => startDownload('Mul市要闻合集.pdf', DOWNLOAD_KINDS[2])}>
            <Download size={14} /> 模拟下载数据
          </button>
        </div>
        <div className="cx-hr" />
        {browser.downloads.length ? (
          browser.downloads.map((d) => (
            <div key={d.id} className="cb-dl">
              <div className="cb-dl__head">
                <span className="cb-dl__name">{d.name}</span>
                <span className="cx-tag">{d.kind}</span>
                <button className="cb-iconbtn fx-press" onClick={() => removeDownload(d.id)} aria-label="删除下载">
                  <Trash2 size={14} />
                </button>
              </div>
              <Progress value={d.progress} />
              <div className="cb-dl__foot">
                <span>{d.done ? '已完成' : `${d.progress}%`}</span>
                <span>{fmtCityTime(d.at)}</span>
              </div>
            </div>
          ))
        ) : (
          <Empty icon={<Download size={28} />} text="下载列表为空" hint="点上方按钮模拟一次下载" />
        )}
      </Sheet>

      {/* 菜单 / 历史 */}
      <Sheet open={panel === 'menu'} onClose={() => setPanel(null)} title={<><Menu size={15} /> 菜单</>}>
        <div className="cb-menurow">
          <span>夜间模式</span>
          <button
            className={`cb-switch fx-press ${browser.night ? 'cb-switch--on' : ''}`}
            onClick={() => setBrowserNight(!browser.night)}
            aria-label="切换夜间模式"
          >
            <span className="cb-switch__knob">{browser.night ? <Moon size={11} /> : <Sun size={11} />}</span>
          </button>
        </div>

        <div className="cb-menurow">
          <span>搜索引擎</span>
          <div className="cb-engine">
            {ENGINES.map((e) => (
              <button
                key={e.key}
                className={`cb-engine__btn ${browser.searchEngine === e.key ? 'cb-engine__btn--on' : ''}`}
                onClick={() => setSearchEngine(e.key)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cx-hr" />
        <button className="fx-btn fx-press" style={{ width: '100%' }} onClick={() => { openBrowserTab(); setPanel(null) }}>
          <Plus size={14} /> 新建标签页
        </button>

        <div className="cx-sechead">
          <span className="cx-sechead__t"><Clock size={13} /> 历史记录</span>
          <span className="cx-sechead__sub">倒序</span>
          {browser.history.length > 0 && (
            <button className="cx-sechead__more" onClick={() => clearHistory()}>清空</button>
          )}
        </div>
        {browser.history.length ? (
          browser.history.map((h) => (
            <Row
              key={h.id}
              icon={<Globe size={16} />}
              title={h.title || h.url}
              sub={`${h.url} · ${fmtCityTime(h.at)}`}
              onClick={() => {
                openPage(h.url, h.title)
                setPanel(null)
              }}
              arrow
            />
          ))
        ) : (
          <Empty icon={<Clock size={26} />} text="暂无浏览历史" />
        )}
      </Sheet>
    </div>
  )
}

function renderBlock(b: WebBlock, i: number) {
  if (b.type === 'h') return <h3 key={i} className="cb-block cb-block--h">{b.text}</h3>
  if (b.type === 'list') {
    return (
      <ul key={i} className="cb-block cb-block--list">
        {(b.items ?? []).map((it, j) => (
          <li key={j}>{it}</li>
        ))}
      </ul>
    )
  }
  if (b.type === 'quote') return <blockquote key={i} className="cb-block cb-block--quote">{b.text}</blockquote>
  return <p key={i} className="cb-block cb-block--p">{b.text}</p>
}
