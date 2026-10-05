import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_THEME,
  MALL_TEMPLATES,
  findTemplate,
  localBanners,
  localProducts,
  mallId,
} from '../lib/mallCatalog'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 数据层
   模块 / 模板 / 商品 / 购物车 / 订单 / 资产，全部 localStorage 持久化
   核心：模块的内容、布局、样式都能自由定义
   ============================================================ */

export type MallType = 'product' | 'blind-box' | 'flash-sale' | 'auction' | 'store' | 'custom'
export type MallLayout = 'grid' | 'list' | 'waterfall' | 'carousel' | 'timeline'
export type CardStyle = 'rounded' | 'square' | 'pill'
export type SortRule = 'sales' | 'price' | 'new' | 'rating'
export type OrderStatus = 'pending' | 'shipping' | 'done' | 'after'

export interface MallTheme {
  bgColor: string
  accentColor: string
  cardStyle: CardStyle
  borderRadius: number
  spacing: number
}

export interface MallBanner {
  id: string
  /** 留空表示使用渐变占位；也允许填写图片 URL */
  image: string
  linkTo: string
  sortOrder: number
}

export interface MallProduct {
  id: string
  moduleId: string
  name: string
  description: string
  price: number
  originalPrice: number
  image: string
  category: string
  stock: number
  sales: number
  rating: number
  tags: string[]
  customAttrs: Record<string, string>
  createdAt: number
}

export interface MallModule {
  id: string
  name: string
  type: MallType
  icon: string
  enabled: boolean
  sortOrder: number
  layout: MallLayout
  theme: MallTheme
  banners: MallBanner[]
  description: string
  sortRule: SortRule
  categories: string[]
  customFields: Record<string, string>
  createdAt: number
  updatedAt: number
}

export interface MallTemplate {
  id: string
  name: string
  type: MallType
  icon: string
  thumbnail: string
  defaultLayout: MallLayout
  description: string
  theme: MallTheme
  banners: string[]
  categories: string[]
  productCount: number
}

export interface CartItem {
  productId: string
  moduleId: string
  qty: number
  selected: boolean
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  qty: number
  image: string
}

export interface OrderEvent {
  text: string
  at: number
}

export interface MallOrder {
  id: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: number
  address: string
  timeline: OrderEvent[]
  review?: { rating: number; text: string }
}

export interface Coupon {
  id: string
  title: string
  amount: number
  minSpend: number
  used: boolean
}

export interface Address {
  id: string
  name: string
  phone: string
  detail: string
  isDefault: boolean
}

export interface RefreshRecord {
  id: string
  at: number
  moduleIds: string[]
  count: number
}

export interface MyShop {
  open: boolean
  name: string
  desc: string
  icon: string
}

export interface MallUser {
  id: string
  balance: number
  points: number
  coupons: Coupon[]
  wishlist: string[]
  createdAt: number
}

export interface MallSettings {
  notify: boolean
  animate: boolean
}

interface MallState {
  user: MallUser
  modules: MallModule[]
  products: MallProduct[]
  cart: CartItem[]
  orders: MallOrder[]
  addresses: Address[]
  refreshHistory: RefreshRecord[]
  shop: MyShop
  settings: MallSettings
  lastRefreshAt: number

  createModule: (input: {
    name: string
    type: MallType
    icon: string
    layout?: MallLayout
    theme?: MallTheme
    templateId?: string
    description?: string
    productCount?: number
  }) => string
  updateModule: (id: string, patch: Partial<MallModule>) => void
  removeModule: (id: string) => void
  reorderModules: (orderedIds: string[]) => void
  toggleModuleEnabled: (id: string) => void
  setModuleBanners: (moduleId: string, banners: MallBanner[]) => void
  setModuleProducts: (moduleId: string, products: MallProduct[]) => void

  addProduct: (moduleId: string, input: Partial<MallProduct>) => void
  updateProduct: (id: string, patch: Partial<MallProduct>) => void
  removeProduct: (id: string) => void

  addRefreshRecord: (moduleIds: string[], count: number) => void

  addToCart: (product: MallProduct, qty?: number) => void
  setCartQty: (productId: string, qty: number) => void
  toggleCartSelected: (productId: string) => void
  toggleCartSelectAll: (value: boolean) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void

  checkout: () => { ok: boolean; orderId?: string; reason?: string }
  payOrder: (id: string) => void
  confirmOrder: (id: string) => void
  requestAfterSale: (id: string) => void
  reviewOrder: (id: string, rating: number, text: string) => void

  toggleWishlist: (productId: string) => void
  useCoupon: (id: string) => void
  /** 扣减积分；不足时返回 false 且不改动 */
  spendPoints: (amount: number) => boolean

  addAddress: (input: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) => void
  updateAddress: (id: string, patch: Partial<Address>) => void
  removeAddress: (id: string) => void
  setDefaultAddress: (id: string) => void

  patchShop: (patch: Partial<MyShop>) => void
  patchSettings: (patch: Partial<MallSettings>) => void
  resetAll: () => void
}

/* ---------- 工具 ---------- */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待付款',
  shipping: '配送中',
  done: '已完成',
  after: '售后',
}

export function sortProducts(list: MallProduct[], rule: SortRule): MallProduct[] {
  const copy = [...list]
  switch (rule) {
    case 'price':
      return copy.sort((a, b) => a.price - b.price)
    case 'new':
      return copy.sort((a, b) => b.createdAt - a.createdAt)
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating)
    default:
      return copy.sort((a, b) => b.sales - a.sales)
  }
}

/** 商品折扣（1 位小数，例如 7.6 折）；无原价或原价更低时返回 null */
export function discountOf(p: MallProduct): number | null {
  if (!p.originalPrice || p.originalPrice <= p.price) return null
  return Math.round((p.price / p.originalPrice) * 100) / 10
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((n, i) => n + i.qty, 0)
}

export function cartTotal(cart: CartItem[], products: MallProduct[], onlySelected: boolean): number {
  return cart.reduce((sum, item) => {
    if (onlySelected && !item.selected) return sum
    const p = products.find((x) => x.id === item.productId)
    return p ? sum + p.price * item.qty : sum
  }, 0)
}

/* ---------- 种子数据 ---------- */

function buildModule(input: {
  name: string
  type: MallType
  icon: string
  layout: MallLayout
  theme: MallTheme
  description: string
  sortRule?: SortRule
  categories?: string[]
  bannerLabels?: string[]
  productCount?: number
}): { module: MallModule; products: MallProduct[] } {
  const now = Date.now()
  const id = mallId('mod')
  const module: MallModule = {
    id,
    name: input.name,
    type: input.type,
    icon: input.icon,
    enabled: true,
    sortOrder: 0,
    layout: input.layout,
    theme: input.theme,
    banners: (input.bannerLabels ?? []).map((label, i) => ({
      id: mallId('bn'),
      image: '',
      linkTo: label,
      sortOrder: i,
    })),
    description: input.description,
    sortRule: input.sortRule ?? 'sales',
    categories: input.categories ?? [],
    customFields: {},
    createdAt: now,
    updatedAt: now,
  }
  const products = localProducts({ id, name: module.name, type: module.type }, input.productCount ?? 9)
  return { module, products }
}

function createSeed() {
  const now = Date.now()
  const drafts = [
    { name: '美食外卖', type: 'product' as MallType, icon: '🍜', layout: 'list' as MallLayout, theme: DEFAULT_THEME, description: '今天想吃什么？热汤热饭，30 分钟送到。', categories: ['辣度', '主食', '饮品'], bannerLabels: ['今日新店', '满 30 减 8', '深夜食堂'], productCount: 9 },
    { name: '限时闪购', type: 'flash-sale' as MallType, icon: '⚡', layout: 'grid' as MallLayout, theme: { ...DEFAULT_THEME, accentColor: '#e8c07d', bgColor: '#241f19' }, description: '每小时一批，抢完就恢复原价。', categories: ['数码', '家电', '好物'], bannerLabels: ['10 点开抢', '前 100 名半价', '最后 2 小时'], productCount: 8 },
    { name: '盲盒抽抽乐', type: 'blind-box' as MallType, icon: '🎁', layout: 'grid' as MallLayout, theme: { ...DEFAULT_THEME, accentColor: '#c0aee6', bgColor: '#1f1c26', cardStyle: 'pill' as CardStyle, borderRadius: 24 }, description: '拆开才知道是谁，隐藏款等你集齐。', categories: ['系列一', '系列二', '限定'], bannerLabels: ['新系列上线', '隐藏款概率翻倍'], productCount: 8 },
    { name: '服饰穿搭', type: 'product' as MallType, icon: '👕', layout: 'waterfall' as MallLayout, theme: { ...DEFAULT_THEME, accentColor: '#f0a6b4', bgColor: '#241c1e' }, description: '按场景挑衣服，顺手给你配好一套。', categories: ['尺码', '场景', '季节'], bannerLabels: ['秋冬新款', '搭配灵感'], productCount: 10 },
    { name: '数码好物', type: 'product' as MallType, icon: '🎧', layout: 'grid' as MallLayout, theme: { ...DEFAULT_THEME, accentColor: '#9dc0e6', bgColor: '#1a1f26', cardStyle: 'square' as CardStyle, borderRadius: 12 }, description: '折腾过才敢推荐，都是自己用过的。', categories: ['音频', '外设', '配件'], bannerLabels: ['编辑推荐', '开箱实测'], productCount: 8 },
    { name: '旧物拍卖', type: 'auction' as MallType, icon: '🔨', layout: 'list' as MallLayout, theme: { ...DEFAULT_THEME, accentColor: '#9fd8c4', bgColor: '#1b2321' }, description: '孤品一件，出价最高的人带走。', categories: ['相机', '器物', '音像'], bannerLabels: ['今夜 22:00 结拍', '无底价专场'], productCount: 7 },
  ]

  const modules: MallModule[] = []
  const products: MallProduct[] = []
  drafts.forEach((d, i) => {
    const { module, products: ps } = buildModule(d)
    module.sortOrder = i
    modules.push(module)
    products.push(...ps)
  })

  // 演示订单：一条配送中、一条已完成
  const first = modules[0]
  const firstProducts = products.filter((p) => p.moduleId === first.id).slice(0, 2)
  const second = modules[4]
  const secondProducts = products.filter((p) => p.moduleId === second.id).slice(0, 1)

  const orders: MallOrder[] = []
  if (firstProducts.length) {
    const total = firstProducts.reduce((s, p) => s + p.price, 0)
    orders.push({
      id: mallId('ord'),
      items: firstProducts.map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: 1, image: p.image })),
      total,
      status: 'shipping',
      createdAt: now - 3600000 * 6,
      address: '小林 · 138****6621 · 杭州市西湖区文一路 88 号',
      timeline: [
        { text: '已下单，等待付款', at: now - 3600000 * 6 },
        { text: '付款成功', at: now - 3600000 * 6 + 60000 },
        { text: '商家已接单，正在配送', at: now - 3600000 * 5 },
      ],
    })
  }
  if (secondProducts.length) {
    const total = secondProducts.reduce((s, p) => s + p.price, 0)
    orders.push({
      id: mallId('ord'),
      items: secondProducts.map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: 1, image: p.image })),
      total,
      status: 'done',
      createdAt: now - 86400000 * 5,
      address: '小林 · 138****6621 · 杭州市西湖区文一路 88 号',
      timeline: [
        { text: '已下单，等待付款', at: now - 86400000 * 5 },
        { text: '付款成功', at: now - 86400000 * 5 + 120000 },
        { text: '商家已发货', at: now - 86400000 * 4 },
        { text: '已签收，交易完成', at: now - 86400000 * 3 },
      ],
    })
  }

  return {
    user: {
      id: 'user_001',
      balance: 1000,
      points: 320,
      coupons: [
        { id: mallId('cp'), title: '无门槛 5 元券', amount: 5, minSpend: 0, used: false },
        { id: mallId('cp'), title: '满 99 减 15', amount: 15, minSpend: 99, used: false },
      ],
      wishlist: [],
      createdAt: now,
    } as MallUser,
    modules,
    products,
    cart: [] as CartItem[],
    orders,
    addresses: [
      { id: mallId('ad'), name: '小林', phone: '138****6621', detail: '杭州市西湖区文一路 88 号 3 幢 502', isDefault: true },
    ] as Address[],
    refreshHistory: [] as RefreshRecord[],
    shop: { open: false, name: '小林の杂货铺', desc: '只卖我自己也会用的东西。', icon: '🏪' } as MyShop,
    settings: { notify: true, animate: true } as MallSettings,
    lastRefreshAt: 0,
  }
}

/* ---------- store ---------- */

export const useMall = create<MallState>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      createModule: (input) => {
        const now = Date.now()
        const id = mallId('mod')
        const tpl = input.templateId ? findTemplate(input.templateId) : null
        const layout = input.layout ?? tpl?.defaultLayout ?? 'grid'
        const theme = input.theme ?? tpl?.theme ?? DEFAULT_THEME
        const modules = get().modules
        const module: MallModule = {
          id,
          name: input.name.trim() || '未命名模块',
          type: input.type,
          icon: input.icon || tpl?.icon || '🛍️',
          enabled: true,
          sortOrder: modules.length,
          layout,
          theme,
          banners: (tpl?.banners ?? []).map((label, i) => ({
            id: mallId('bn'),
            image: '',
            linkTo: label,
            sortOrder: i,
          })),
          description: input.description ?? tpl?.description ?? '',
          sortRule: 'sales',
          categories: tpl?.categories ?? [],
          customFields: {},
          createdAt: now,
          updatedAt: now,
        }
        const count = input.productCount ?? tpl?.productCount ?? 8
        const products = count > 0 ? localProducts({ id, name: module.name, type: module.type }, count) : []
        set((s) => ({ modules: [...s.modules, module], products: [...s.products, ...products] }))
        return id
      },

      updateModule: (id, patch) =>
        set((s) => ({
          modules: s.modules.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)),
        })),

      removeModule: (id) =>
        set((s) => ({
          modules: s.modules.filter((m) => m.id !== id),
          products: s.products.filter((p) => p.moduleId !== id),
          cart: s.cart.filter((c) => c.moduleId !== id),
        })),

      reorderModules: (orderedIds) =>
        set((s) => ({
          modules: s.modules.map((m) => {
            const idx = orderedIds.indexOf(m.id)
            return idx < 0 ? m : { ...m, sortOrder: idx }
          }),
        })),

      toggleModuleEnabled: (id) =>
        set((s) => ({
          modules: s.modules.map((m) => (m.id === id ? { ...m, enabled: !m.enabled, updatedAt: Date.now() } : m)),
        })),

      setModuleBanners: (moduleId, banners) =>
        set((s) => ({
          modules: s.modules.map((m) => (m.id === moduleId ? { ...m, banners, updatedAt: Date.now() } : m)),
        })),

      setModuleProducts: (moduleId, products) =>
        set((s) => ({
          products: [...s.products.filter((p) => p.moduleId !== moduleId), ...products],
          modules: s.modules.map((m) => (m.id === moduleId ? { ...m, updatedAt: Date.now() } : m)),
        })),

      addProduct: (moduleId, input) =>
        set((s) => ({
          products: [
            ...s.products,
            {
              id: mallId('prod'),
              moduleId,
              name: input.name?.trim() || '新商品',
              description: input.description ?? '',
              price: input.price ?? 0,
              originalPrice: input.originalPrice ?? 0,
              image: input.image ?? '',
              category: input.category ?? '',
              stock: input.stock ?? 99,
              sales: input.sales ?? 0,
              rating: input.rating ?? 5,
              tags: input.tags ?? [],
              customAttrs: input.customAttrs ?? {},
              createdAt: Date.now(),
            },
          ],
        })),

      updateProduct: (id, patch) =>
        set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removeProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id), cart: s.cart.filter((c) => c.productId !== id) })),

      addRefreshRecord: (moduleIds, count) =>
        set((s) => ({
          refreshHistory: [{ id: mallId('rf'), at: Date.now(), moduleIds, count }, ...s.refreshHistory].slice(0, 5),
          lastRefreshAt: Date.now(),
        })),

      addToCart: (product, qty = 1) =>
        set((s) => {
          const found = s.cart.find((c) => c.productId === product.id)
          if (found) {
            return { cart: s.cart.map((c) => (c.productId === product.id ? { ...c, qty: c.qty + qty, selected: true } : c)) }
          }
          return { cart: [...s.cart, { productId: product.id, moduleId: product.moduleId, qty, selected: true }] }
        }),

      setCartQty: (productId, qty) =>
        set((s) => ({
          cart: s.cart
            .map((c) => (c.productId === productId ? { ...c, qty: Math.max(0, qty) } : c))
            .filter((c) => c.qty > 0),
        })),

      toggleCartSelected: (productId) =>
        set((s) => ({ cart: s.cart.map((c) => (c.productId === productId ? { ...c, selected: !c.selected } : c)) })),

      toggleCartSelectAll: (value) => set((s) => ({ cart: s.cart.map((c) => ({ ...c, selected: value })) })),

      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((c) => c.productId !== productId) })),

      clearCart: () => set({ cart: [] }),

      checkout: () => {
        const s = get()
        const selected = s.cart.filter((c) => c.selected)
        if (!selected.length) return { ok: false, reason: '请先勾选要结算的商品' }
        const items: OrderItem[] = []
        let total = 0
        for (const c of selected) {
          const p = s.products.find((x) => x.id === c.productId)
          if (!p) continue
          items.push({ productId: p.id, name: p.name, price: p.price, qty: c.qty, image: p.image })
          total += p.price * c.qty
        }
        if (!items.length) return { ok: false, reason: '商品已下架' }
        if (total > s.user.balance) return { ok: false, reason: `余额不足，还差 ¥${(total - s.user.balance).toFixed(2)}` }
        const now = Date.now()
        const addr = s.addresses.find((a) => a.isDefault) ?? s.addresses[0]
        const orderId = mallId('ord')
        const order: MallOrder = {
          id: orderId,
          items,
          total,
          status: 'shipping',
          createdAt: now,
          address: addr ? `${addr.name} · ${addr.phone} · ${addr.detail}` : '默认地址',
          timeline: [
            { text: '已提交订单', at: now },
            { text: `已支付 ¥${total.toFixed(2)}`, at: now + 1000 },
            { text: '商家已接单，正在配送', at: now + 2000 },
          ],
        }
        set((st) => ({
          orders: [order, ...st.orders],
          cart: st.cart.filter((c) => !c.selected),
          user: { ...st.user, balance: st.user.balance - total, points: st.user.points + Math.floor(total / 10) },
        }))
        return { ok: true, orderId }
      },

      payOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, status: 'shipping', timeline: [...o.timeline, { text: '付款成功', at: Date.now() }] }
              : o
          ),
        })),

      confirmOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: 'done', timeline: [...o.timeline, { text: '已签收，交易完成', at: Date.now() }] } : o
          ),
        })),

      requestAfterSale: (id) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, status: 'after', timeline: [...o.timeline, { text: '已提交售后申请', at: Date.now() }] } : o
          ),
        })),

      reviewOrder: (id, rating, text) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, review: { rating, text } } : o)) })),

      toggleWishlist: (productId) =>
        set((s) => ({
          user: {
            ...s.user,
            wishlist: s.user.wishlist.includes(productId)
              ? s.user.wishlist.filter((x) => x !== productId)
              : [...s.user.wishlist, productId],
          },
        })),

      useCoupon: (id) =>
        set((s) => ({ user: { ...s.user, coupons: s.user.coupons.map((c) => (c.id === id ? { ...c, used: true } : c)) } })),

      spendPoints: (amount) => {
        const s = get()
        if (amount <= 0 || s.user.points < amount) return false
        set({ user: { ...s.user, points: s.user.points - amount } })
        return true
      },

      addAddress: (input) =>
        set((s) => {
          const isDefault = input.isDefault || s.addresses.length === 0
          const list = isDefault ? s.addresses.map((a) => ({ ...a, isDefault: false })) : s.addresses
          return { addresses: [...list, { ...input, id: mallId('ad'), isDefault }] }
        }),

      updateAddress: (id, patch) =>
        set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      removeAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

      setDefaultAddress: (id) =>
        set((s) => ({ addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })) })),

      patchShop: (patch) => set((s) => ({ shop: { ...s.shop, ...patch } })),

      patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetAll: () => set(() => createSeed()),
    }),
    { name: 'ksc:mall', version: 1 }
  )
)

/* ---------- 选择器 ---------- */

export function useProductsOf(moduleId: string | null): MallProduct[] {
  const products = useMall((s) => s.products)
  if (!moduleId) return []
  return products.filter((p) => p.moduleId === moduleId)
}

/** 首页可见模块：启用中，按 sortOrder 排序 */
export function visibleModules(modules: MallModule[]): MallModule[] {
  return modules.filter((m) => m.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
}

export { MALL_TEMPLATES, localProducts, localBanners, findTemplate }