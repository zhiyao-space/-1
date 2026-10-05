import { useState } from 'react'
import { Home, Package, ShoppingCart, User } from 'lucide-react'
import { cartCount, useMall, type MallProduct } from '../../store/mall'
import HomeTab from './HomeTab'
import CartTab from './CartTab'
import OrdersTab from './OrdersTab'
import MineTab from './MineTab'
import ModuleEditor from './ModuleEditor'
import ModuleCreate from './ModuleCreate'
import ProductSheet from './ProductSheet'
import '../../styles/factory.css'
import '../../styles/mall.css'

/* ============================================================
   mulin 商城 ✦ MALLÉ
   多模块可自定义购物 App：模块的内容、布局、样式都能自由定义
   ============================================================ */

type MTab = 'home' | 'cart' | 'orders' | 'mine'

const TABS: { key: MTab; label: string; icon: typeof Home }[] = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'cart', label: '购物车', icon: ShoppingCart },
  { key: 'orders', label: '订单', icon: Package },
  { key: 'mine', label: '我的', icon: User },
]

export default function MallApp() {
  const [tab, setTab] = useState<MTab>('home')
  const [editorId, setEditorId] = useState<string | null>(null)
  const [creating, setCreating] = useState<{ templateFirst: boolean } | null>(null)
  const [openProduct, setOpenProduct] = useState<MallProduct | null>(null)
  const cart = useMall((s) => s.cart)

  if (creating) {
    return <ModuleCreate onBack={() => setCreating(null)} templateFirst={creating.templateFirst} />
  }
  if (editorId) {
    return <ModuleEditor key={editorId} moduleId={editorId} onBack={() => setEditorId(null)} />
  }

  return (
    <>
      {tab === 'home' && (
        <HomeTab
          onOpenProduct={setOpenProduct}
          onEditModule={setEditorId}
          onCreateModule={() => setCreating({ templateFirst: false })}
        />
      )}
      {tab === 'cart' && <CartTab onGoHome={() => setTab('home')} onGoOrders={() => setTab('orders')} />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'mine' && (
        <MineTab onOpenTemplates={() => setCreating({ templateFirst: true })} onEditModule={setEditorId} />
      )}

      <nav className="ml-nav no-select">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          const badge = t.key === 'cart' ? cartCount(cart) : 0
          return (
            <button
              key={t.key}
              className={`ml-nav__item${active ? ' ml-nav__item--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {badge > 0 && <span className="ml-nav__badge">{badge > 99 ? '99+' : badge}</span>}
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{ fontSize: 10.5, letterSpacing: '0.5px' }}>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <ProductSheet product={openProduct} onClose={() => setOpenProduct(null)} onGoCart={() => setTab('cart')} />
    </>
  )
}
