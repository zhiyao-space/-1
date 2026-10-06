import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, RefreshCw, Search, Sparkles } from 'lucide-react'
import { useMall, visibleModules, type MallModule, type MallProduct } from '../../store/mall'
import { useCharacters } from '../../store/characters'
import { useForum } from '../../store/forum'
import { allLibraryPeople, type LibraryPerson } from '../../lib/libraryPeople'
import { useBlobURL } from '../WallpaperLayer'
import { generateBanners, generateProducts } from '../../lib/mallEngine'
import { useLongPress } from '../../hooks'
import { useToast } from '../../store/ui'
import ModuleContent from './ModuleContent'
import { MallIcon, Price, Sheet, Stars, Thumb, moduleVars, thumbBg } from './mallParts'

/* ============================================================
   mulin 商城 MALLÉ · 首页
   搜索 / 一键刷新全部 / 模块 Tab / 下拉刷新 / 模块编辑
   ============================================================ */

const PULL_TRIGGER = 56
/** 刷新动画至少展示这么久，避免本地兜底生成过快导致动画一闪而过 */
const MIN_REFRESH_MS = 760

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function BannerCarousel({ module }: { module: MallModule }) {
  const banners = useMemo(() => [...module.banners].sort((a, b) => a.sortOrder - b.sortOrder), [module.banners])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
  }, [module.id])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % banners.length), 3600)
    return () => window.clearInterval(t)
  }, [banners.length, module.id])

  if (!banners.length) return null

  return (
    <div className="ml-banner">
      <div className="ml-banner__track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {banners.map((b) => (
          <div
            key={b.id}
            className="ml-banner__item"
            style={b.image ? { backgroundImage: `url(${b.image})` } : { background: thumbBg(b.linkTo || module.name, 1) }}
          >
            <span className="ml-banner__title">{b.linkTo || module.name}</span>
            <span className="ml-banner__sub">{module.name} · 为你精选</span>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="ml-banner__dots">
          {banners.map((b, i) => (
            <span key={b.id} className={`ml-banner__dot${i === idx ? ' ml-banner__dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchRow({ product, moduleName, onOpen }: { product: MallProduct; moduleName: string; onOpen: (p: MallProduct) => void }) {
  return (
    <button className="ml-listcard fx-press-soft" onClick={() => onOpen(product)}>
      <Thumb className="ml-listcard__thumb" name={product.name} image={product.image || undefined} size="1 / 1" />
      <span className="ml-listcard__body">
        <span className="ml-name">{product.name}</span>
        <span className="ml-desc">{product.description}</span>
        <span className="ml-meta">
          <span className="ml-tag">{moduleName}</span>
          <Stars rating={product.rating} />
        </span>
        <Price value={product.price} original={product.originalPrice} />
      </span>
    </button>
  )
}

/** 单个主理人 / 推荐官头像卡：优先使用 IndexedDB 头像，否则用渐变占位 */
function CuratorCard({ person }: { person: LibraryPerson }) {
  const url = useBlobURL(person.avatarId)
  const label = person.identity?.trim() || (person.type === 'npc' ? 'NPC' : '角色')
  return (
    <div className="ml-curator" title={`${person.name} · ${label}`}>
      <span className="ml-curator__avatar" style={url ? undefined : { background: thumbBg(person.name) }}>
        {url ? <img src={url} alt="" /> : person.name.slice(0, 1)}
      </span>
      <span className="ml-curator__name">{person.name}</span>
      <span className="ml-curator__tag">{label}</span>
    </div>
  )
}

/** 主理人 / 推荐官横向列表：角色库中的角色与 NPC 自动出现在商城首页 */
function CuratorRow({ people }: { people: LibraryPerson[] }) {
  if (!people.length) return null
  return (
    <div className="ml-curators">
      <div className="ml-curators__head">
        <span className="ml-curators__title">主理人 · 推荐官</span>
        <span className="ml-curators__sub">来自你的角色库</span>
      </div>
      <div className="ml-curators__scroll no-select">
        {people.map((p) => (
          <CuratorCard key={`${p.type}:${p.id}`} person={p} />
        ))}
      </div>
    </div>
  )
}

export default function HomeTab({
  onOpenProduct,
  onEditModule,
  onCreateModule,
}: {
  onOpenProduct: (p: MallProduct) => void
  onEditModule: (id: string) => void
  onCreateModule: () => void
}) {
  const modules = useMall((s) => s.modules)
  const products = useMall((s) => s.products)
  const setModuleProducts = useMall((s) => s.setModuleProducts)
  const setModuleBanners = useMall((s) => s.setModuleBanners)
  const addRefreshRecord = useMall((s) => s.addRefreshRecord)
  const toggleModuleEnabled = useMall((s) => s.toggleModuleEnabled)
  const removeModule = useMall((s) => s.removeModule)
  const push = useToast((s) => s.push)

  // 订阅角色库（自建角色 + NPC），新建后无需刷新即可出现在首页
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const curators = useMemo(() => allLibraryPeople().slice(0, 12), [characters, npcs])

  const visible = useMemo(() => visibleModules(modules), [modules])
  const [activeId, setActiveId] = useState<string | null>(visible[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<MallModule | null>(null)
  const [pull, setPull] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)

  // 模块被停用/删除后，回退到第一个可见模块
  useEffect(() => {
    if (!visible.length) {
      setActiveId(null)
      return
    }
    if (!activeId || !visible.some((m) => m.id === activeId)) setActiveId(visible[0].id)
  }, [visible, activeId])

  const active = visible.find((m) => m.id === activeId) ?? null
  const activeProducts = useMemo(
    () => (active ? products.filter((p) => p.moduleId === active.id) : []),
    [products, active]
  )

  const titles = useMemo(() => {
    const map = new Map(modules.map((m) => [m.id, m.name]))
    return map
  }, [modules])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (titles.get(p.moduleId) ?? '').toLowerCase().includes(q)
      )
      .slice(0, 40)
  }, [query, products, titles])

  const refreshOne = useCallback(
    async (module: MallModule, silent = false) => {
      const current = useMall.getState().products.filter((p) => p.moduleId === module.id)
      const count = Math.min(12, Math.max(6, current.length || 8))
      const bannerCount = Math.max(2, module.banners.length || 3)
      setRefreshingId(module.id)
      const startedAt = Date.now()
      try {
        const [next, banners] = await Promise.all([
          generateProducts(module, count),
          generateBanners(module, bannerCount),
        ])
        const remain = MIN_REFRESH_MS - (Date.now() - startedAt)
        if (remain > 0) await wait(remain)
        setModuleProducts(module.id, next)
        if (banners.length) setModuleBanners(module.id, banners)
        addRefreshRecord([module.id], next.length)
        if (!silent) push(`${module.name} 已刷新`)
      } finally {
        setRefreshingId(null)
      }
    },
    [addRefreshRecord, push, setModuleBanners, setModuleProducts]
  )

  const refreshAll = useCallback(async () => {
    const list = visibleModules(useMall.getState().modules)
    if (!list.length) {
      push('先创建一个模块吧', 'error')
      return
    }
    setRefreshingAll(true)
    const startedAt = Date.now()
    try {
      await Promise.all(
        list.map(async (m) => {
          const current = useMall.getState().products.filter((p) => p.moduleId === m.id)
          const count = Math.min(12, Math.max(6, current.length || 8))
          const [next, banners] = await Promise.all([
            generateProducts(m, count),
            generateBanners(m, Math.max(2, m.banners.length || 3)),
          ])
          setModuleProducts(m.id, next)
          if (banners.length) setModuleBanners(m.id, banners)
          return next.length
        })
      )
      const remain = MIN_REFRESH_MS - (Date.now() - startedAt)
      if (remain > 0) await wait(remain)
      addRefreshRecord(list.map((m) => m.id), list.length)
      push('全部已刷新')
    } finally {
      setRefreshingAll(false)
      setPull(0)
    }
  }, [addRefreshRecord, push, setModuleBanners, setModuleProducts])

  /* ---------- 下拉刷新 ---------- */
  const onTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) touchStart.current = e.touches[0].clientY
    else touchStart.current = null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart.current == null || refreshingAll) return
    const dy = e.touches[0].clientY - touchStart.current
    if (dy > 0) setPull(Math.min(84, dy * 0.46))
  }
  const onTouchEnd = () => {
    if (pull >= PULL_TRIGGER - 12) void refreshAll()
    else setPull(0)
    touchStart.current = null
  }

  const refreshingActive = refreshingAll || (active != null && refreshingId === active.id)
  const pullHeight = refreshingAll ? 44 : pull

  return (
    <div className="fx-root ml-root">
      <div className="ml-top no-select">
        <div className="ml-top__row">
          <span className="ml-brand">mulin 商城</span>
          <button
            className="ml-iconbtn ml-iconbtn--accent fx-press"
            onClick={() => void refreshAll()}
            disabled={refreshingAll}
            aria-label="刷新全部"
          >
            <RefreshCw size={18} className={refreshingAll ? 'ml-spin' : ''} />
          </button>
        </div>
        <div className="ml-search">
          <span className="ml-search__icon">
            <Search size={15} />
          </span>
          <input
            className="fx-input"
            placeholder="搜商品 / 分类 / 店铺"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {!query && (
        <div className="ml-tabbar no-select">
          <div className="ml-tabbar__scroll">
            {visible.map((m) => (
              <ModuleTab key={m.id} module={m} active={m.id === activeId} onClick={() => setActiveId(m.id)} onLongPress={() => setMenuFor(m)} />
            ))}
          </div>
          <button className="ml-tab ml-tab--add fx-press" onClick={onCreateModule} aria-label="新建模块">
            <Plus size={17} />
          </button>
        </div>
      )}

      <div
        className="ml-scroll"
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="ml-pull" style={{ height: pullHeight }}>
          <RefreshCw size={13} className={refreshingAll ? 'ml-spin' : ''} />
          <span>{refreshingAll ? '正在刷新全部…' : pull >= PULL_TRIGGER - 12 ? '松开刷新' : '下拉刷新'}</span>
        </div>

        {/* 角色库主理人 / 推荐官：仅在非搜索状态展示 */}
        {!query && <CuratorRow people={curators} />}

        {query ? (
          <>
            <div className="ml-modhead">
              <span>
                <span className="ml-modhead__name">搜索结果</span>
                <span className="ml-modhead__desc" style={{ display: 'block' }}>
                  「{query}」共 {results.length} 件
                </span>
              </span>
            </div>
            {results.length === 0 ? (
              <div className="ml-empty">
                <span style={{ fontSize: 'calc(12.5px * var(--fs-scale))' }}>没有找到相关商品</span>
                <span style={{ fontSize: 'calc(10.5px * var(--fs-scale))', opacity: 0.7 }}>换个关键词试试</span>
              </div>
            ) : (
              <div className="ml-list">
                {results.map((p) => (
                  <SearchRow key={p.id} product={p} moduleName={titles.get(p.moduleId) ?? '商城'} onOpen={onOpenProduct} />
                ))}
              </div>
            )}
          </>
        ) : active ? (
          <div key={`${active.id}-${active.updatedAt}`} style={moduleVars(active.theme)}>
            <BannerCarousel module={active} />
            <div className="ml-modhead">
              <span style={{ minWidth: 0 }}>
                <span className="ml-modhead__name" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MallIcon name={active.icon} size={16} color="var(--ml-accent)" />
                  {active.name}
                </span>
                {active.description && <span className="ml-modhead__desc" style={{ display: 'block' }}>{active.description}</span>}
              </span>
              <span className="ml-modhead__acts">
                <button
                  className="ml-iconbtn ml-iconbtn--sm fx-press"
                  onClick={() => void refreshOne(active)}
                  disabled={refreshingId === active.id}
                  aria-label="刷新此模块"
                >
                  <RefreshCw size={15} className={refreshingId === active.id ? 'ml-spin' : ''} />
                </button>
                <button className="ml-iconbtn ml-iconbtn--sm fx-press" onClick={() => onEditModule(active.id)} aria-label="编辑模块">
                  <Pencil size={15} />
                </button>
              </span>
            </div>
            <ModuleContent
              module={active}
              products={activeProducts}
              refreshing={refreshingActive}
              onOpenProduct={onOpenProduct}
            />
          </div>
        ) : (
          <div className="ml-empty" style={{ paddingTop: 70 }}>
            <Sparkles size={26} className="ml-empty__icon" />
            <span style={{ fontSize: 'calc(13px * var(--fs-scale))' }}>还没有可展示的模块</span>
            <span style={{ fontSize: 'calc(10.5px * var(--fs-scale))', opacity: 0.7 }}>点上方「+」创建一个属于你的模块</span>
          </div>
        )}
      </div>

      <Sheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor ? (
          <>
            <MallIcon name={menuFor.icon} size={16} color="var(--ml-accent)" />
            {menuFor.name}
          </>
        ) : ''}
      >
        {menuFor && (
          <>
            <button
              className="ml-menurow"
              onClick={() => {
                const id = menuFor.id
                setMenuFor(null)
                void refreshOne(menuFor)
                setActiveId(id)
              }}
            >
              <RefreshCw size={16} />
              刷新这个模块
            </button>
            <button
              className="ml-menurow"
              onClick={() => {
                const id = menuFor.id
                setMenuFor(null)
                onEditModule(id)
              }}
            >
              <Pencil size={16} />
              编辑模块内容
            </button>
            <button
              className="ml-menurow"
              onClick={() => {
                toggleModuleEnabled(menuFor.id)
                push(menuFor.enabled ? '已停用该模块' : '已启用该模块')
                setMenuFor(null)
              }}
            >
              <Sparkles size={16} />
              {menuFor.enabled ? '停用（不在首页显示）' : '启用该模块'}
            </button>
            <button
              className="ml-menurow ml-menurow--danger"
              onClick={() => {
                removeModule(menuFor.id)
                push('模块已删除')
                setMenuFor(null)
              }}
            >
              删除模块
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}

function ModuleTab({
  module,
  active,
  onClick,
  onLongPress,
}: {
  module: MallModule
  active: boolean
  onClick: () => void
  onLongPress: () => void
}) {
  const handlers = useLongPress(onLongPress)
  return (
    <button className={`ml-tab${active ? ' ml-tab--active' : ''}`} onClick={onClick} {...handlers}>
      <MallIcon name={module.icon} size={15} className="ml-tab__icon" />
      <span>{module.name}</span>
    </button>
  )
}
