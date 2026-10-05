import { useMemo, useState } from 'react'
import { Package, Star } from 'lucide-react'
import {
  ORDER_STATUS_LABEL,
  useMall,
  type MallOrder,
  type OrderStatus,
} from '../../store/mall'
import { useToast } from '../../store/ui'
import { Empty, Sheet, Thumb, fmtDateTime } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 订单
   状态筛选 / 物流进度 / 详情时间线 / 评价与售后
   ============================================================ */

const FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'pending', label: '待付款' },
  { id: 'shipping', label: '配送中' },
  { id: 'done', label: '已完成' },
  { id: 'after', label: '售后' },
]

const PROGRESS: Record<OrderStatus, number> = {
  pending: 16,
  shipping: 66,
  done: 100,
  after: 42,
}

function StarsPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{ color: n <= value ? '#ffd76a' : 'var(--fx-t3)' }}
          aria-label={`${n} 星`}
        >
          <Star size={20} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  )
}

export default function OrdersTab() {
  const orders = useMall((s) => s.orders)
  const payOrder = useMall((s) => s.payOrder)
  const confirmOrder = useMall((s) => s.confirmOrder)
  const requestAfterSale = useMall((s) => s.requestAfterSale)
  const reviewOrder = useMall((s) => s.reviewOrder)
  const push = useToast((s) => s.push)

  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')

  const list = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  )
  const detail = orders.find((o) => o.id === detailId) ?? null

  const openDetail = (o: MallOrder) => {
    setDetailId(o.id)
    setReviewing(false)
    setRating(o.review?.rating ?? 5)
    setText(o.review?.text ?? '')
  }

  const actionsOf = (o: MallOrder) => {
    if (o.status === 'pending')
      return (
        <button
          className="fx-btn fx-btn--accent fx-press"
          style={{ minHeight: 34, padding: '0 14px' }}
          onClick={() => {
            payOrder(o.id)
            push('付款成功 ✦')
          }}
        >
          去付款
        </button>
      )
    if (o.status === 'shipping')
      return (
        <button
          className="fx-btn fx-press"
          style={{ minHeight: 34, padding: '0 14px' }}
          onClick={() => {
            confirmOrder(o.id)
            push('已确认收货')
          }}
        >
          确认收货
        </button>
      )
    if (o.status === 'done')
      return (
        <button
          className="fx-btn fx-press"
          style={{ minHeight: 34, padding: '0 14px' }}
          onClick={() => {
            openDetail(o)
            setReviewing(true)
          }}
        >
          {o.review ? '查看评价' : '去评价'}
        </button>
      )
    return <span className="ml-order__status">售后处理中</span>
  }

  return (
    <div className="fx-root ml-root">
      <div className="ml-pagehead">
        <span className="ml-pagehead__title">订单</span>
        <span className="ml-pagehead__sub">共 {orders.length} 笔</span>
      </div>

      <div className="ml-filters" style={{ padding: '0 14px 10px', flexShrink: 0 }}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`ml-chip${filter === f.id ? ' ml-chip--active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="ml-orderscroll">
        {list.length === 0 ? (
          <Empty icon={<Package size={30} />} text="这里还没有订单" hint="下单后可以在这里查看物流" />
        ) : (
          list.map((o) => (
            <div key={o.id} className="ml-order">
              <div className="ml-order__head">
                <span className="ml-order__no">#{o.id.slice(-8).toUpperCase()}</span>
                <span className="ml-order__status">{ORDER_STATUS_LABEL[o.status]}</span>
              </div>

              <button style={{ width: '100%', textAlign: 'left', display: 'block' }} onClick={() => openDetail(o)}>
                {o.items.slice(0, 3).map((it) => (
                  <div key={it.productId} className="ml-orderitem">
                    <Thumb className="ml-orderitem__thumb" name={it.name} image={it.image || undefined} size="1 / 1" />
                    <span className="ml-orderitem__name">{it.name}</span>
                    <span className="ml-orderitem__qty">×{it.qty}</span>
                    <span className="ml-order__total">¥{it.price.toFixed(2)}</span>
                  </div>
                ))}
                {o.items.length > 3 && (
                  <div className="ml-orderitem__qty" style={{ paddingLeft: 56 }}>
                    等 {o.items.length} 件商品
                  </div>
                )}
              </button>

              {o.status === 'shipping' && (
                <>
                  <div className="ml-shipbar">
                    <div className="ml-shipbar__fill" style={{ width: `${PROGRESS[o.status]}%` }} />
                  </div>
                  <div className="ml-order__total" style={{ marginTop: 6 }}>
                    {o.timeline[o.timeline.length - 1]?.text}
                  </div>
                </>
              )}

              <div className="ml-order__foot">
                <span className="ml-order__total">
                  实付 <b>¥{o.total.toFixed(2)}</b>
                </span>
                <span className="ml-order__acts">{actionsOf(o)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Sheet open={!!detail} onClose={() => setDetailId(null)} title={detail ? `订单 #${detail.id.slice(-8).toUpperCase()}` : ''}>
        {detail && (
          <>
            <div className="ml-order__status" style={{ marginBottom: 12 }}>
              {ORDER_STATUS_LABEL[detail.status]}
            </div>

            <div className="ml-list" style={{ marginBottom: 14 }}>
              {detail.items.map((it) => (
                <div key={it.productId} className="ml-orderitem">
                  <Thumb className="ml-orderitem__thumb" name={it.name} image={it.image || undefined} size="1 / 1" />
                  <span className="ml-orderitem__name">{it.name}</span>
                  <span className="ml-orderitem__qty">×{it.qty}</span>
                  <span className="ml-order__total">¥{it.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="ml-order__total" style={{ marginBottom: 6 }}>
              实付 <b>¥{detail.total.toFixed(2)}</b>
            </div>
            <div className="ml-detail__desc" style={{ marginBottom: 14 }}>
              收货信息：{detail.address}
            </div>

            <div className="ml-field__label">物流时间线</div>
            <div className="ml-tlview" style={{ marginBottom: 16 }}>
              {[...detail.timeline].reverse().map((ev, i) => (
                <div key={`${ev.at}-${i}`} className={`ml-tlview__item${i === 0 ? ' ml-tlview__item--now' : ''}`}>
                  <div className="ml-tlview__text">{ev.text}</div>
                  <div className="ml-tlview__time">{fmtDateTime(ev.at)}</div>
                </div>
              ))}
            </div>

            {reviewing ? (
              <div className="ml-field">
                <span className="ml-field__label">给它打个分</span>
                <div style={{ marginBottom: 10 }}>
                  <StarsPicker value={rating} onChange={setRating} />
                </div>
                <textarea
                  className="fx-textarea"
                  rows={3}
                  placeholder="说说你的使用感受…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  className="fx-btn fx-btn--accent fx-press"
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => {
                    reviewOrder(detail.id, rating, text.trim() || '默认好评')
                    push('评价已发布 ✦')
                    setReviewing(false)
                  }}
                >
                  发布评价
                </button>
              </div>
            ) : (
              <>
                {detail.review && (
                  <div className="ml-prodrow" style={{ display: 'block' }}>
                    <div style={{ marginBottom: 6 }}>
                      <StarsPicker value={detail.review.rating} onChange={() => {}} />
                    </div>
                    <div className="ml-detail__desc" style={{ marginTop: 0 }}>
                      {detail.review.text}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  {detail.status === 'done' && (
                    <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setReviewing(true)}>
                      写评价
                    </button>
                  )}
                  {detail.status !== 'after' && (
                    <button
                      className="fx-btn fx-press"
                      style={{ flex: 1 }}
                      onClick={() => {
                        requestAfterSale(detail.id)
                        push('售后申请已提交')
                      }}
                    >
                      申请售后
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
