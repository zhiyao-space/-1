import { useEffect, useMemo, useState } from 'react'
import { Dices, Flame, Gavel, Store } from 'lucide-react'
import {
  discountOf,
  sortProducts,
  useMall,
  type MallModule,
  type MallProduct,
  type SortRule,
} from '../../store/mall'
import { SORT_RULES } from '../../lib/mallCatalog'
import { useClock } from '../../hooks'
import { useToast } from '../../store/ui'
import { Price, Sheet, Stars, Thumb } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 模块内容渲染
   5 种通用布局 + 闪购 / 盲盒 / 拍卖 / 小店 特色块
   每种布局都是一个独立 render 函数
   ============================================================ */

/* ---------- 商品卡（网格 / 瀑布流 / 横滑 通用） ---------- */

function Card({
  product,
  ratio,
  rarity,
  onOpen,
}: {
  product: MallProduct
  ratio: string
  rarity?: string
  onOpen: (p: MallProduct) => void
}) {
  const off = discountOf(product)
  const name = product.name
  return (
    <button className="ml-card fx-press-soft" onClick={() => onOpen(product)}>
      <Thumb
        name={name}
        image={product.image || undefined}
        size={ratio}
        badge={off ? `${off}折` : undefined}
        rarity={rarity}
      />
      <span className="ml-card__body">
        <span className="ml-name">{name}</span>
        <span className="ml-tagrow">
          {product.tags.slice(0, 2).map((t) => (
            <span key={t} className="ml-tag">
              {t}
            </span>
          ))}
        </span>
        <Price value={product.price} original={product.originalPrice} />
        <span className="ml-meta">
          <Stars rating={product.rating} />
          <span>已售 {product.sales}</span>
          {product.stock <= 5 && <span>仅剩 {product.stock}</span>}
        </span>
      </span>
    </button>
  )
}

function Row({ product, onOpen, extra }: { product: MallProduct; onOpen: (p: MallProduct) => void; extra?: React.ReactNode }) {
  const off = discountOf(product)
  return (
    <button className="ml-listcard fx-press-soft" onClick={() => onOpen(product)}>
      <Thumb
        className="ml-listcard__thumb"
        name={product.name}
        image={product.image || undefined}
        size="1 / 1"
        badge={off ? `${off}折` : undefined}
      />
      <span className="ml-listcard__body">
        <span className="ml-name" style={{ WebkitLineClamp: 2 }}>
          {product.name}
        </span>
        {product.description && <span className="ml-desc">{product.description}</span>}
        <span className="ml-tagrow">
          {product.tags.slice(0, 3).map((t) => (
            <span key={t} className="ml-tag">
              {t}
            </span>
          ))}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
          <Price value={product.price} original={product.originalPrice} />
          <span className="ml-meta">
            <Stars rating={product.rating} />
          </span>
          {extra}
        </span>
      </span>
    </button>
  )
}

function TimelineRow({ product, onOpen }: { product: MallProduct; onOpen: (p: MallProduct) => void }) {
  return (
    <div className="ml-tl">
      <span className="ml-tl__dot" />
      <button className="ml-tl__card fx-press-soft" onClick={() => onOpen(product)}>
        <Thumb className="ml-tl__thumb" name={product.name} image={product.image || undefined} size="1 / 1" />
        <span className="ml-listcard__body">
          <span className="ml-tl__time">上架于 {new Date(product.createdAt).toLocaleDateString('zh-CN')}</span>
          <span className="ml-name">{product.name}</span>
          <span className="ml-tagrow">
            {product.tags.slice(0, 2).map((t) => (
              <span key={t} className="ml-tag">
                {t}
              </span>
            ))}
          </span>
          <Price value={product.price} original={product.originalPrice} />
        </span>
      </button>
    </div>
  )
}

/* ---------- 特色块 ---------- */

function Countdown({ at }: { at: number }) {
  const now = useClock(1000).getTime()
  const left = Math.max(0, at - now)
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="ml-countdown">
      <b>{p(h)}</b>
      <i>:</i>
      <b>{p(m)}</b>
      <i>:</i>
      <b>{p(s)}</b>
    </span>
  )
}

function FlashBar({ products }: { products: MallProduct[] }) {
  const now = useClock(60000).getTime()
  const end = Math.ceil(now / 3600000) * 3600000
  const sold = products.reduce((n, p) => n + p.sales, 0)
  const total = sold + products.reduce((n, p) => n + p.stock, 0)
  const pct = total ? Math.min(99, Math.round((sold / total) * 100)) : 0
  return (
    <div className="ml-flashbar">
      <Flame size={17} color="var(--ml-accent)" />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="ml-flashlabel">本场剩余</span>
        <Countdown at={end} />
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span className="ml-flashlabel">已抢 {pct}%</span>
        <span className="ml-progress">
          <span className="ml-progress__fill" style={{ width: `${pct}%` }} />
        </span>
      </span>
    </div>
  )
}

function rarityOf(p: MallProduct, roll: number): 'SSR' | 'SR' | 'R' {
  if (p.tags.includes('隐藏款')) return 'SSR'
  if (roll < 0.08) return 'SSR'
  if (roll < 0.3) return 'SR'
  return 'R'
}

const DRAW_COST = 20

function BlindBox({ module, products, onOpen }: { module: MallModule; products: MallProduct[]; onOpen: (p: MallProduct) => void }) {
  const points = useMall((s) => s.user.points)
  const spendPoints = useMall((s) => s.spendPoints)
  const addToCart = useMall((s) => s.addToCart)
  const push = useToast((s) => s.push)
  const [shaking, setShaking] = useState(false)
  const [result, setResult] = useState<{ product: MallProduct; rarity: 'SSR' | 'SR' | 'R' } | null>(null)

  const draw = () => {
    if (!products.length) {
      push('这个盲盒还没有内容', 'error')
      return
    }
    if (points < DRAW_COST) {
      push(`积分不足，抽一次需要 ${DRAW_COST} 积分`, 'error')
      return
    }
    setShaking(true)
    window.setTimeout(() => {
      setShaking(false)
      if (!spendPoints(DRAW_COST)) {
        push('积分不足', 'error')
        return
      }
      const pool = products
      const product = pool[Math.floor(Math.random() * pool.length)]
      const rarity = rarityOf(product, Math.random())
      setResult({ product, rarity })
      push(`抽到 ${rarity} · ${product.name}`)
    }, 760)
  }

  return (
    <>
      <div className="ml-blind">
        <Dices size={15} color="var(--ml-accent)" />
        <div className={`ml-blind__box${shaking ? ' ml-blind__box--shake' : ''}`}>{module.icon || '🎁'}</div>
        <div className="ml-blind__hint">抽一次消耗 {DRAW_COST} 积分，隐藏款概率更高</div>
        <div className="ml-blind__stat">
          <span>
            剩余积分 <b>{points}</b>
          </span>
          <span>
            可抽 <b>{Math.floor(points / DRAW_COST)}</b> 次
          </span>
        </div>
        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={draw} disabled={shaking}>
          {shaking ? '开盒中…' : `抽一次 · ${DRAW_COST} 积分`}
        </button>
      </div>

      <Sheet open={!!result} onClose={() => setResult(null)} title="开盒结果">
        {result && (
          <div className="ml-blind__result" style={{ textAlign: 'center' }}>
            <div className={`ml-rarity ml-rarity--${result.rarity.toLowerCase()}`} style={{ fontSize: 20, marginBottom: 10 }}>
              {result.rarity}
            </div>
            <Thumb
              name={result.product.name}
              image={result.product.image || undefined}
              size="4 / 3"
              rarity={result.rarity}
              style={{ borderRadius: 18, marginBottom: 12 }}
            />
            <div className="ml-detail__name">{result.product.name}</div>
            <div className="ml-detail__desc">{result.product.description || '拆开才知道，是它。'}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setResult(null)}>
                继续抽
              </button>
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ flex: 1 }}
                onClick={() => {
                  addToCart(result.product)
                  push('已放进购物车')
                  setResult(null)
                }}
              >
                收下它
              </button>
            </div>
            <button
              className="ml-chip"
              style={{ marginTop: 12 }}
              onClick={() => {
                onOpen(result.product)
                setResult(null)
              }}
            >
              查看详情
            </button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function AuctionPanel({ module, products, onOpen }: { module: MallModule; products: MallProduct[]; onOpen: (p: MallProduct) => void }) {
  const updateProduct = useMall((s) => s.updateProduct)
  const push = useToast((s) => s.push)
  const now = useClock(60000).getTime()
  const end = Math.ceil(now / 7200000) * 7200000
  const [bid, setBid] = useState<{ id: string; name: string; price: number } | null>(null)

  const raise = (p: MallProduct) => {
    const inc = Math.max(5, Math.round(p.price * 0.05))
    const next = p.price + inc
    updateProduct(p.id, { price: next })
    push(`已出价 ¥${next}（+${inc}）`)
  }

  return (
    <>
      <div className="ml-auction">
        <Gavel size={17} color="var(--ml-accent)" />
        <div className="ml-auction__info">
          <div style={{ fontSize: 'calc(12.5px * var(--fs-scale))', color: 'var(--fx-t1)' }}>{module.name} · 今夜结拍</div>
          <div className="ml-auction__sub">出价即代表接受当前价格</div>
        </div>
        <Countdown at={end} />
      </div>
      <div className="ml-list">
        {products.map((p) => (
          <div key={p.id} className="ml-auction">
            <Thumb className="ml-listcard__thumb" name={p.name} image={p.image || undefined} size="1 / 1" />
            <div className="ml-auction__info">
              <div className="ml-name">{p.name}</div>
              <div className="ml-auction__bid">当前 ¥{p.price}</div>
              <div className="ml-auction__sub">{p.description}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="fx-btn fx-btn--accent fx-press" style={{ minHeight: 34, padding: '0 12px' }} onClick={() => raise(p)}>
                出价
              </button>
              <button className="ml-chip" onClick={() => setBid({ id: p.id, name: p.name, price: p.price })}>
                详情
              </button>
            </div>
          </div>
        ))}
      </div>
      <Sheet open={!!bid} onClose={() => setBid(null)} title="拍品详情">
        {bid && (
          <>
            <div style={{ fontSize: 'calc(14px * var(--fs-scale))', color: 'var(--fx-t1)', marginBottom: 10 }}>{bid.name}</div>
            <button
              className="fx-btn fx-btn--accent fx-press"
              style={{ width: '100%' }}
              onClick={() => {
                const p = products.find((x) => x.id === bid.id)
                if (p) onOpen(p)
                setBid(null)
              }}
            >
              查看完整详情
            </button>
          </>
        )}
      </Sheet>
    </>
  )
}

function StorePanel({ module }: { module: MallModule }) {
  const name = module.customFields.storeName || module.name
  const desc = module.customFields.storeDesc || module.description || '只卖我自己也会用的东西。'
  return (
    <div className="ml-store">
      <span className="ml-store__avatar">{module.icon || '🏪'}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ml-store__name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Store size={13} color="var(--ml-accent)" />
          {name}
        </span>
        <span className="ml-store__desc" style={{ display: 'block' }}>
          {desc}
        </span>
      </span>
    </div>
  )
}

/* ---------- 布局 render 函数 ---------- */

function renderGrid(products: MallProduct[], onOpen: (p: MallProduct) => void) {
  return (
    <div className="ml-grid">
      {products.map((p) => (
        <Card key={p.id} product={p} ratio="1 / 1" onOpen={onOpen} />
      ))}
    </div>
  )
}

function renderList(products: MallProduct[], onOpen: (p: MallProduct) => void) {
  return (
    <div className="ml-list">
      {products.map((p) => (
        <Row key={p.id} product={p} onOpen={onOpen} />
      ))}
    </div>
  )
}

function renderWaterfall(products: MallProduct[], onOpen: (p: MallProduct) => void) {
  const ratios = ['1 / 1', '3 / 4', '4 / 5', '2 / 3']
  return (
    <div className="ml-waterfall">
      {products.map((p, i) => (
        <Card key={p.id} product={p} ratio={ratios[i % ratios.length]} onOpen={onOpen} />
      ))}
    </div>
  )
}

function renderCarousel(products: MallProduct[], onOpen: (p: MallProduct) => void) {
  return (
    <div className="ml-carousel">
      {products.map((p) => (
        <Card key={p.id} product={p} ratio="4 / 5" onOpen={onOpen} />
      ))}
    </div>
  )
}

function renderTimeline(products: MallProduct[], onOpen: (p: MallProduct) => void) {
  return (
    <div className="ml-timeline">
      {products.map((p) => (
        <TimelineRow key={p.id} product={p} onOpen={onOpen} />
      ))}
    </div>
  )
}

const RENDERERS: Record<
  MallModule['layout'],
  (products: MallProduct[], onOpen: (p: MallProduct) => void) => JSX.Element
> = {
  grid: renderGrid,
  list: renderList,
  waterfall: renderWaterfall,
  carousel: renderCarousel,
  timeline: renderTimeline,
}

/* ---------- 对外主组件 ---------- */

export default function ModuleContent({
  module,
  products,
  refreshing,
  onOpenProduct,
}: {
  module: MallModule
  products: MallProduct[]
  refreshing: boolean
  onOpenProduct: (p: MallProduct) => void
}) {
  const [cat, setCat] = useState<string>('')
  const [sort, setSort] = useState<SortRule>(module.sortRule)

  useEffect(() => {
    setSort(module.sortRule)
    setCat('')
  }, [module.id, module.sortRule])

  const shown = useMemo(() => {
    const filtered = cat ? products.filter((p) => p.category === cat) : products
    return sortProducts(filtered, sort)
  }, [products, cat, sort])

  const render = RENDERERS[module.layout] ?? renderGrid

  return (
    <div className={`ml-fadein${refreshing ? ' ml-refreshing' : ''}`} key={`${module.id}-${products.length}`}>
      {module.type === 'flash-sale' && <FlashBar products={shown} />}
      {module.type === 'blind-box' && <BlindBox module={module} products={shown} onOpen={onOpenProduct} />}
      {module.type === 'store' && <StorePanel module={module} />}

      {(module.categories.length > 0 || module.type !== 'blind-box') && (
        <div className="ml-filters">
          {module.categories.length > 0 && (
            <button className={`ml-chip${cat === '' ? ' ml-chip--active' : ''}`} onClick={() => setCat('')}>
              全部
            </button>
          )}
          {module.categories.map((c) => (
            <button key={c} className={`ml-chip${cat === c ? ' ml-chip--active' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="ml-empty" style={{ padding: '36px 20px' }}>
          <span style={{ fontSize: 'calc(12.5px * var(--fs-scale))' }}>这个分类下还没有内容</span>
          <span style={{ fontSize: 'calc(10.5px * var(--fs-scale))', opacity: 0.7 }}>点右上角刷新，或进入编辑添加商品</span>
        </div>
      ) : module.type === 'auction' ? (
        <AuctionPanel module={module} products={shown} onOpen={onOpenProduct} />
      ) : (
        render(shown, onOpenProduct)
      )}

      {module.type !== 'auction' && module.type !== 'blind-box' && (
        <div className="ml-filters" style={{ paddingTop: 14, paddingBottom: 0 }}>
          <span style={{ fontSize: 'calc(11px * var(--fs-scale))', color: 'var(--fx-t3)', alignSelf: 'center' }}>排序</span>
          {SORT_RULES.map((r) => (
            <button key={r.id} className={`ml-chip${sort === r.id ? ' ml-chip--active' : ''}`} onClick={() => setSort(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
