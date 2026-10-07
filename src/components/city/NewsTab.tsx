import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  Check,
  Eye,
  Flame,
  Newspaper,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { generateNewsDrafts, hasCityAi } from '../../lib/cityEngine'
import { localNews } from '../../lib/cityCatalog'
import { ME_ID, personById, type NewsCategory, type NewsItem, useMulCity } from '../../store/mulCity'
import { Empty, SubTabs, fmtWhen } from './cityParts'
import { useCityNav } from './cityNav'
import '../../styles/cityNews.css'

/* ============================================================
   Tab9 · 新闻资讯
   今日焦点 | 分类 Tab | 订阅栏目 | Mul市热搜 | 推荐阅读
   ============================================================ */

type SubKey = '推荐' | NewsCategory

/** store 的 categories 不含「推荐」，这里补在最前面 */
const SUB_HEAD: SubKey = '推荐'

function fmtHeat(heat: number): string {
  return heat >= 10000 ? `${(heat / 10000).toFixed(1)}万` : String(heat)
}

export default function NewsTab() {
  const news = useMulCity((s) => s.news)
  const people = useMulCity((s) => s.people)
  const city = useMulCity((s) => s.city)
  const events = useMulCity((s) => s.events)
  const stockMarket = useMulCity((s) => s.stockMarket)
  const following = useMulCity((s) => s.microblog.following)

  const refreshNews = useMulCity((s) => s.refreshNews)
  const toggleSubscribe = useMulCity((s) => s.toggleSubscribe)
  const refreshTrending = useMulCity((s) => s.refreshTrending)

  const nav = useCityNav()

  const [sub, setSub] = useState<SubKey>(SUB_HEAD)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    []
  )

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  const tabs = useMemo<{ key: SubKey; label: string }[]>(
    () => [{ key: SUB_HEAD, label: SUB_HEAD }, ...news.categories.map((c) => ({ key: c, label: c }))],
    [news.categories]
  )

  const hasHoldings = stockMarket.portfolio.length > 0

  /** 用户兴趣：订阅分类 + 关注的人 + 持股板块 */
  const interests = useMemo(() => {
    const names = following.map((id) => personById(people, id)?.name).filter((n): n is string => !!n)
    const sectors = stockMarket.portfolio
      .map((p) => stockMarket.stocks.find((s) => s.symbol === p.symbol)?.sector)
      .filter((s): s is string => !!s)
    return Array.from(new Set<string>([...news.subscriptions, ...names, ...sectors]))
  }, [following, people, stockMarket.portfolio, stockMarket.stocks, news.subscriptions])

  const scoreOf = (h: NewsItem): number => {
    let score = 0
    if (news.subscriptions.includes(h.category)) score += 3
    if (h.relatedPersons.some((id) => following.includes(id))) score += 2
    if (hasHoldings && h.category === '财经') score += 1
    return score
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = news.headlines
    if (q) list = list.filter((h) => `${h.title}\n${h.summary}\n${h.body}`.toLowerCase().includes(q))
    if (sub !== SUB_HEAD) list = list.filter((h) => h.category === sub)
    return [...list].sort((a, b) => {
      if (sub === SUB_HEAD) {
        const d = scoreOf(b) - scoreOf(a)
        if (d) return d
      }
      return b.at - a.at
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.headlines, sub, query, news.subscriptions, following, hasHoldings])

  const focus = filtered[0] ?? null
  const rest = filtered.slice(focus ? 1 : 0)
  const noMatch = news.headlines.length > 0 && filtered.length === 0

  const refresh = async () => {
    if (busy) return
    setBusy(true)
    try {
      let items: NewsItem[] | null = null
      if (hasCityAi()) {
        const activeEvents = events.active.map((e) => e.title)
        items = await generateNewsDrafts(city, people, activeEvents, stockMarket.economy, interests)
      }
      if (items && items.length) {
        refreshNews(items)
        flash('已生成最新新闻')
      } else {
        refreshNews(localNews(people, city, 10))
        flash(hasCityAi() ? '生成失败，已使用本地新闻' : '已生成本地新闻')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="cx-scroll">
        {/* 搜索 + 刷新 */}
        <div className="cxn-toolbar">
          <div className="cxn-search">
            <Search size={14} />
            <input
              className="fx-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题 / 摘要 / 正文"
            />
            {query && (
              <button className="cxn-search__clear fx-press" onClick={() => setQuery('')} aria-label="清空搜索">
                ×
              </button>
            )}
          </div>
          <button className="fx-btn fx-btn--front fx-press cxn-refresh" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw size={14} className={busy ? 'cxn-spin' : ''} /> {busy ? '生成中…' : '刷新'}
          </button>
        </div>

        {/* 今日焦点 */}
        <div className="cx-sechead">
          <span className="cx-sechead__t">今日焦点</span>
          <span className="cx-sechead__sub">{sub === SUB_HEAD ? '为你推荐' : sub}</span>
        </div>

        {focus ? (
          <div
            className="cx-card cx-card--front cxn-focus fx-press"
            onClick={() => nav.push({ view: 'news', id: focus.id })}
          >
            <div className="cxn-focus__top">
              <span className="cx-tag cx-tag--on">{focus.category}</span>
              {news.subscriptions.includes(focus.category) && <span className="cx-tag">已订阅</span>}
              <span className="cxn-meta">{focus.source}</span>
              <span className="cxn-meta">{fmtWhen(focus.at)}</span>
            </div>
            <div className="cxn-focus__title">{focus.title}</div>
            <div className="cxn-focus__summary">{focus.summary}</div>
            <div className="cxn-focus__foot">
              <span className="cxn-meta">
                <Eye size={11} /> {focus.views} 阅读
              </span>
              <span className="cxn-meta">
                <Flame size={11} /> {focus.likes.length} 赞
              </span>
            </div>
            <NewsActions item={focus} onShare={flash} />
          </div>
        ) : (
          <Empty
            icon={<Newspaper size={28} />}
            text={noMatch ? '没有匹配的新闻' : '新闻中心暂无内容'}
            hint={noMatch ? '换个分类或关键词试试' : '点「刷新」让城市生成一批新闻'}
          />
        )}

        {/* 分类 Tab */}
        <div className="cxn-subtabs">
          <SubTabs tabs={tabs} value={sub} onChange={setSub} />
        </div>

        {/* 订阅栏目 */}
        <div className="cx-sechead">
          <span className="cx-sechead__t">订阅栏目</span>
          <span className="cx-sechead__sub">已订阅 {news.subscriptions.length} 个</span>
        </div>
        <div className="cxn-subs">
          {news.categories.map((c) => {
            const on = news.subscriptions.includes(c)
            return (
              <button
                key={c}
                className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'} cxn-sub fx-press`}
                onClick={() => toggleSubscribe(c)}
              >
                {on && <Check size={10} strokeWidth={3} />} {c}
              </button>
            )
          })}
        </div>

        {/* Mul市热搜 */}
        <div className="cx-sechead">
          <span className="cx-sechead__t">Mul市热搜</span>
          <button className="cx-sechead__more fx-press" onClick={() => refreshTrending()}>
            <RefreshCw size={11} /> 换一批
          </button>
        </div>
        {news.trendingTopics.length ? (
          <div className="cxn-trends">
            {news.trendingTopics.map((t, i) => (
              <button
                key={t.id}
                className={`cxn-trend fx-press ${query.trim() === t.title ? 'cxn-trend--on' : ''}`}
                onClick={() => setQuery(t.title)}
              >
                <span className={`cxn-trend__rank ${i < 3 ? 'cxn-trend__rank--hot' : ''}`}>{i + 1}</span>
                <span className="cxn-trend__title">
                  {t.label && <span className="cxn-trend__label">{t.label}</span>}
                  {t.title}
                </span>
                <span className="cxn-trend__heat">{fmtHeat(t.heat)}</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty icon={<Flame size={24} />} text="暂无热搜" hint="点「换一批」刷新" />
        )}

        {/* 推荐阅读 */}
        {rest.length > 0 && (
          <>
            <div className="cx-sechead">
              <span className="cx-sechead__t">推荐阅读</span>
              <span className="cx-sechead__sub">{rest.length} 条</span>
            </div>
            {rest.map((h) => (
              <div key={h.id} className="cx-card cxn-card fx-press" onClick={() => nav.push({ view: 'news', id: h.id })}>
                <div className="cxn-card__head">
                  <span className={`cx-tag ${news.subscriptions.includes(h.category) ? 'cx-tag--on' : 'cx-tag--front'}`}>
                    {h.category}
                  </span>
                  <span className="cxn-meta">{h.source}</span>
                  <span className="cxn-meta">{fmtWhen(h.at)}</span>
                  <span className="cxn-meta">
                    <Eye size={10} /> {h.views}
                  </span>
                </div>
                <div className="cxn-card__title">{h.title}</div>
                <div className="cxn-card__summary">{h.summary}</div>
                <NewsActions item={h} onShare={flash} />
              </div>
            ))}
          </>
        )}

        {news.headlines.length > 0 && rest.length === 0 && !noMatch && (
          <Empty icon={<Sparkles size={24} />} text="没有更多新闻" hint="试试刷新或切换分类" />
        )}
      </div>

      {toast && <div className="cxn-toast">{toast}</div>}
    </>
  )
}

/* ---------- 单条新闻的操作条 ---------- */

function NewsActions({ item, onShare }: { item: NewsItem; onShare: (msg: string) => void }) {
  const toggleNewsLike = useMulCity((s) => s.toggleNewsLike)
  const dislikeNews = useMulCity((s) => s.dislikeNews)
  const toggleNewsBookmark = useMulCity((s) => s.toggleNewsBookmark)
  const addMicroblogPost = useMulCity((s) => s.addMicroblogPost)

  const liked = item.likes.includes(ME_ID)
  const disliked = item.dislikes.includes(ME_ID)
  const bookmarked = (item.bookmarks ?? []).includes(ME_ID)

  const share = () => {
    addMicroblogPost({
      content: `【${item.category}】${item.title}\n${item.summary}\n#Mul市新闻# #${item.category}#`,
      tags: ['Mul市新闻', item.category],
    })
    onShare('已分享到微博')
  }

  return (
    <div className="cxn-acts" onClick={(e) => e.stopPropagation()}>
      <button className={`cxn-act ${liked ? 'cxn-act--on' : ''}`} onClick={() => toggleNewsLike(item.id)}>
        <ThumbsUp size={13} fill={liked ? 'currentColor' : 'none'} /> {item.likes.length}
      </button>
      <button className={`cxn-act ${disliked ? 'cxn-act--on' : ''}`} onClick={() => dislikeNews(item.id)}>
        <ThumbsDown size={13} /> {item.dislikes.length}
      </button>
      <button className={`cxn-act ${bookmarked ? 'cxn-act--on' : ''}`} onClick={() => toggleNewsBookmark(item.id)}>
        <Bookmark size={13} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? '已收藏' : '收藏'}
      </button>
      <button className="cxn-act cxn-act--share" onClick={share}>
        <Share2 size={13} /> 分享
      </button>
    </div>
  )
}
