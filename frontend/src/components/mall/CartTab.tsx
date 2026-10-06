import { useMemo } from 'react'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { cartTotal, useMall, type MallProduct } from '../../store/mall'
import { useToast } from '../../store/ui'
import { CheckBox, Empty, Price, Stepper, Thumb } from './mallParts'

/* ============================================================
   mulin 商城 MALLÉ · 购物车
   ============================================================ */

export default function CartTab({ onGoHome, onGoOrders }: { onGoHome: () => void; onGoOrders: () => void }) {
  const cart = useMall((s) => s.cart)
  const products = useMall((s) => s.products)
  const setCartQty = useMall((s) => s.setCartQty)
  const toggleCartSelected = useMall((s) => s.toggleCartSelected)
  const toggleCartSelectAll = useMall((s) => s.toggleCartSelectAll)
  const removeFromCart = useMall((s) => s.removeFromCart)
  const checkout = useMall((s) => s.checkout)
  const push = useToast((s) => s.push)

  const rows = useMemo(
    () =>
      cart
        .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
        .filter((r): r is { item: (typeof cart)[number]; product: MallProduct } => !!r.product),
    [cart, products]
  )

  const total = cartTotal(cart, products, true)
  const allSelected = rows.length > 0 && rows.every((r) => r.item.selected)
  const selectedCount = rows.filter((r) => r.item.selected).reduce((n, r) => n + r.item.qty, 0)

  if (!rows.length) {
    return (
      <div className="fx-root ml-root">
        <div className="ml-pagehead">
          <span className="ml-pagehead__title">购物车</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty icon={<ShoppingCart size={30} />} text="购物车是空的" hint="去逛点东西吧" />
        </div>
        <div className="ml-bottombar" style={{ justifyContent: 'center' }}>
          <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={onGoHome}>
            去逛逛
          </button>
        </div>
      </div>
    )
  }

  const doCheckout = () => {
    const res = checkout()
    if (!res.ok) {
      push(res.reason ?? '结算失败', 'error')
      return
    }
    push('下单成功，正在配送')
    onGoOrders()
  }

  return (
    <div className="fx-root ml-root">
      <div className="ml-pagehead">
        <span className="ml-pagehead__title">购物车</span>
        <span className="ml-pagehead__sub">共 {rows.length} 种</span>
      </div>

      <div className="ml-orderscroll">
        {rows.map(({ item, product }) => (
          <div key={item.productId} className="ml-cart-row">
            <CheckBox on={item.selected} onClick={() => toggleCartSelected(item.productId)} />
            <Thumb
              className="ml-cart-row__thumb"
              name={product.name}
              image={product.image || undefined}
              size="1 / 1"
            />
            <div className="ml-cart-row__body">
              <span className="ml-name">{product.name}</span>
              <span className="ml-desc">{product.description}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                <Price value={product.price} />
                <span style={{ marginLeft: 'auto' }}>
                  <Stepper value={item.qty} onChange={(v) => setCartQty(item.productId, v)} />
                </span>
              </div>
            </div>
            <button
              className="ml-iconbtn ml-iconbtn--sm fx-press"
              onClick={() => removeFromCart(item.productId)}
              aria-label="删除"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="ml-bottombar">
        <CheckBox on={allSelected} onClick={() => toggleCartSelectAll(!allSelected)} />
        <span className="ml-bottombar__label">全选</span>
        <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span className="ml-bottombar__label" style={{ display: 'block' }}>
            合计（{selectedCount} 件）
          </span>
          <span className="ml-total">¥{total.toFixed(2)}</span>
        </span>
        <button className="fx-btn fx-btn--accent fx-press" disabled={selectedCount === 0} onClick={doCheckout}>
          结算
        </button>
      </div>
    </div>
  )
}
