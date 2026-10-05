import type {
  CardStyle,
  MallBanner,
  MallModule,
  MallProduct,
  MallTemplate,
  MallTheme,
  MallType,
  MallLayout,
  SortRule,
} from '../store/mall'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 静态目录与纯函数
   模板库 / 商品名池 / 本地商品生成（离线兜底）
   本文件不依赖 store 的运行时导出，避免循环依赖
   ============================================================ */

let seq = 0
export function mallId(prefix = 'm'): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export const MODULE_TYPES: { id: MallType; label: string; hint: string }[] = [
  { id: 'product', label: '商品瀑布流', hint: '常规货架，装修自由' },
  { id: 'flash-sale', label: '限时闪购', hint: '倒计时 + 抢购进度' },
  { id: 'blind-box', label: '盲盒', hint: '概率抽取 + 开盒特效' },
  { id: 'auction', label: '拍卖', hint: '出价竞价 + 倒计时' },
  { id: 'store', label: '虚拟小店', hint: '店主页 + 商品陈列' },
  { id: 'custom', label: '完全自定义', hint: '什么都可以自己定' },
]

export const MODULE_TYPE_LABEL: Record<MallType, string> = {
  product: '商品瀑布流',
  'flash-sale': '限时闪购',
  'blind-box': '盲盒',
  auction: '拍卖',
  store: '虚拟小店',
  custom: '完全自定义',
}

export const LAYOUTS: { id: MallLayout; label: string }[] = [
  { id: 'grid', label: '网格' },
  { id: 'list', label: '列表' },
  { id: 'waterfall', label: '瀑布流' },
  { id: 'carousel', label: '横向滑动' },
  { id: 'timeline', label: '时间线' },
]

export const LAYOUT_LABEL: Record<MallLayout, string> = {
  grid: '网格',
  list: '列表',
  waterfall: '瀑布流',
  carousel: '横向滑动',
  timeline: '时间线',
}

export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: 'rounded', label: '圆润' },
  { id: 'square', label: '方正' },
  { id: 'pill', label: '胶囊' },
]

export const SORT_RULES: { id: SortRule; label: string }[] = [
  { id: 'sales', label: '销量优先' },
  { id: 'price', label: '价格从低到高' },
  { id: 'new', label: '最新上架' },
  { id: 'rating', label: '评分优先' },
]

/** 模块主题预设：以黑白为底，只用强调色区分调性 */
export const THEME_PRESETS: { id: string; label: string; theme: MallTheme }[] = [
  { id: 'mono', label: '极简黑白', theme: { bgColor: '#1e1e1e', accentColor: '#ffffff', cardStyle: 'rounded', borderRadius: 18, spacing: 12 } },
  { id: 'rose', label: '蔷薇', theme: { bgColor: '#241c1e', accentColor: '#f0a6b4', cardStyle: 'rounded', borderRadius: 20, spacing: 12 } },
  { id: 'mint', label: '薄荷', theme: { bgColor: '#1b2321', accentColor: '#9fd8c4', cardStyle: 'rounded', borderRadius: 18, spacing: 12 } },
  { id: 'amber', label: '琥珀', theme: { bgColor: '#241f19', accentColor: '#e8c07d', cardStyle: 'rounded', borderRadius: 16, spacing: 10 } },
  { id: 'violet', label: '暮紫', theme: { bgColor: '#1f1c26', accentColor: '#c0aee6', cardStyle: 'pill', borderRadius: 24, spacing: 12 } },
  { id: 'sky', label: '远空', theme: { bgColor: '#1a1f26', accentColor: '#9dc0e6', cardStyle: 'square', borderRadius: 12, spacing: 14 } },
]

export const DEFAULT_THEME: MallTheme = THEME_PRESETS[0].theme

export const ICON_CHOICES = ['🛍️', '🍜', '⚡', '🎁', '👕', '🎧', '🔨', '🏪', '📚', '🧸', '🍰', '🌿', '☕', '💄', '🪴', '🎮']

/* ---------- 商品名池 ---------- */

interface Pool {
  names: string[]
  descs: string[]
  tags: string[]
  categories: string[]
  price: [number, number]
}

const BASE_TAGS = ['热卖', '新品', '限时', '爆款', '口碑', '回购', '包邮', '精选']

const POOLS: Record<MallType, Pool> = {
  product: {
    names: ['手工牛皮笔记本', '磨砂马克杯', '棉麻抱枕套', '香薰蜡烛', '折叠收纳箱', '木质桌面收纳', '羊毛针织围巾', '极简台灯', '陶瓷花瓶', '旅行洗漱包'],
    descs: ['用料扎实，越用越顺手', '放在桌上就很好看', '小体积大容量，收纳省心', '摸得到的质感', '日常使用频率极高的一件'],
    tags: BASE_TAGS,
    categories: ['家居', '文具', '生活'],
    price: [19, 399],
  },
  'flash-sale': {
    names: ['限时特惠蓝牙耳机', '闪购空气炸锅', '秒杀手冲壶', '特价机械键盘', '闪购羽绒马甲', '限时扫地机', '特惠电动牙刷', '闪购投影仪'],
    descs: ['限时低价，售完即止', '比日常价省一大截', '库存不多，手慢无', '这一档价格只留给手快的人'],
    tags: ['限时', '秒杀', '抢购', '爆款', '底价'],
    categories: ['数码', '家电', '好物'],
    price: [29, 899],
  },
  'blind-box': {
    names: ['毛绒小兽盲盒', '桌面摆件盲盒', '香氛随机盒', '文具惊喜盒', '挂件盲袋', '迷你积木盲盒', '贴纸福袋', '徽章盲盒'],
    descs: ['拆开才知道是谁，心跳加速', '隐藏款概率 1/72', '每一只都想集齐', '手感沉，做工比预想的好'],
    tags: ['隐藏款', '随机', '欧气', '整盒', '新系列'],
    categories: ['系列一', '系列二', '限定'],
    price: [19, 129],
  },
  auction: {
    names: ['孤品胶片相机', '手作陶杯（唯一一只）', '绝版黑胶唱片', '旧物黄铜台灯', '签名版画', '古董机械表', '手工皮具钱包', '老式打字机'],
    descs: ['仅此一件，价高者得', '带岁月痕迹，介意慎拍', '藏品级，来源清晰', '起拍价低，欢迎捡漏'],
    tags: ['孤品', '藏品', '捡漏', '包真', '仅一件'],
    categories: ['相机', '器物', '音像'],
    price: [99, 999],
  },
  store: {
    names: ['店主手冲挂耳', '自制柠檬酱', '手编藤篮', '香草小盆栽', '手写贺卡', '冷萃茶包', '手工皂', '布艺杯垫'],
    descs: ['店主亲手做的，产量很少', '小店出品，慢工细活', '每批味道会有一点点不同', '喜欢的话记得常来'],
    tags: ['手作', '小店限定', '店主推荐', '小批量'],
    categories: ['热卖', '手作', '季节'],
    price: [9, 199],
  },
  custom: {
    names: ['自定义内容一', '自定义内容二', '自定义内容三', '自定义内容四', '自定义内容五', '自定义内容六'],
    descs: ['由你定义它的意义', '占位内容，随时替换', '在编辑里改成你想要的'],
    tags: ['自定义'],
    categories: ['默认'],
    price: [10, 299],
  },
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function pickSome<T>(list: T[], n: number): T[] {
  const copy = [...list]
  const out: T[] = []
  for (let i = 0; i < n && copy.length; i += 1) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/** 本地生成一组商品（无 AI 时兜底，也是新建模块的初始内容） */
export function localProducts(module: Pick<MallModule, 'id' | 'name' | 'type'>, count = 10): MallProduct[] {
  const pool = POOLS[module.type] ?? POOLS.product
  const now = Date.now()
  const names = pickSome(pool.names, Math.min(count, pool.names.length))
  const out: MallProduct[] = []
  for (let i = 0; i < count; i += 1) {
    const base = names[i % names.length] ?? `${module.name} 好物`
    const suffix = i >= names.length ? ` ${['·', 'Ⅱ', '·最新', ' 复刻'][i % 4]}`.trim() : ''
    const price = randInt(pool.price[0], pool.price[1])
    const markup = 1 + randInt(8, 42) / 100
    out.push({
      id: mallId('prod'),
      moduleId: module.id,
      name: `${base}${suffix}`,
      description: pick(pool.descs),
      price,
      originalPrice: Math.round(price * markup),
      image: '',
      category: pick(pool.categories),
      stock: randInt(3, 200),
      sales: randInt(0, 999),
      rating: Math.round((4 + Math.random()) * 10) / 10,
      tags: pickSome(pool.tags, randInt(2, 4)),
      customAttrs: {},
      createdAt: now - randInt(0, 30) * 86400000,
    })
  }
  return out
}

/** 本地生成 Banner（渐变占位，image 留空由组件渲染） */
export function localBanners(module: Pick<MallModule, 'name' | 'type'>, count = 3): MallBanner[] {
  const texts = ['新品首发', '限时活动', '店主推荐', '本周精选', '会员专享', '季节限定']
  return Array.from({ length: count }, (_, i) => ({
    id: mallId('bn'),
    // image 留空表示使用渐变占位；也允许用户填图片 URL
    image: '',
    linkTo: `${module.name} · ${pick(texts)}`,
    sortOrder: i,
  }))
}

/** 各类型模块的本地推荐配置（AI 辅助配置的兜底） */
export const LOCAL_CONFIG_FALLBACK: Record<MallType, { layout: MallLayout; theme: MallTheme; sortRule: SortRule }> = {
  product: { layout: 'grid', theme: THEME_PRESETS[0].theme, sortRule: 'sales' },
  'flash-sale': { layout: 'grid', theme: THEME_PRESETS[3].theme, sortRule: 'price' },
  'blind-box': { layout: 'grid', theme: THEME_PRESETS[4].theme, sortRule: 'new' },
  auction: { layout: 'list', theme: THEME_PRESETS[2].theme, sortRule: 'rating' },
  store: { layout: 'waterfall', theme: THEME_PRESETS[1].theme, sortRule: 'new' },
  custom: { layout: 'grid', theme: THEME_PRESETS[5].theme, sortRule: 'sales' },
}

/** 本地推荐的布局/主题配置（AI 辅助配置的兜底） */
export function localConfig(module: Pick<MallModule, 'type' | 'name'>) {
  const base = LOCAL_CONFIG_FALLBACK[module.type] ?? LOCAL_CONFIG_FALLBACK.product
  return { ...base, bannerCount: 3, productsPerPage: 8 }
}

/* ---------- 内置 6 种模板 ---------- */

export const MALL_TEMPLATES: MallTemplate[] = [
  {
    id: 'tmpl_food',
    name: '美食外卖模板',
    type: 'product',
    icon: '🍜',
    thumbnail: '',
    defaultLayout: 'list',
    description: '列表布局 + 店铺卡片，适合餐饮与外卖',
    theme: THEME_PRESETS[3].theme,
    banners: ['今日新店', '满 30 减 8', '配送 30 分钟'],
    categories: ['辣度', '主食', '饮品'],
    productCount: 8,
  },
  {
    id: 'tmpl_blind',
    name: '盲盒抽抽乐模板',
    type: 'blind-box',
    icon: '🎁',
    thumbnail: '',
    defaultLayout: 'grid',
    description: '概率抽取 + 开盒特效，适合潮玩与收集',
    theme: THEME_PRESETS[4].theme,
    banners: ['新系列上线', '隐藏款概率翻倍', '整盒更划算'],
    categories: ['系列一', '系列二', '限定'],
    productCount: 6,
  },
  {
    id: 'tmpl_flash',
    name: '限时闪购模板',
    type: 'flash-sale',
    icon: '⚡',
    thumbnail: '',
    defaultLayout: 'grid',
    description: '倒计时 + 抢购进度条，制造紧迫感',
    theme: THEME_PRESETS[3].theme,
    banners: ['10 点开抢', '前 100 名半价', '最后 2 小时'],
    categories: ['数码', '家电', '好物'],
    productCount: 8,
  },
  {
    id: 'tmpl_outfit',
    name: '服饰穿搭模板',
    type: 'product',
    icon: '👕',
    thumbnail: '',
    defaultLayout: 'waterfall',
    description: '瀑布流 + 搭配推荐，适合服装与配饰',
    theme: THEME_PRESETS[1].theme,
    banners: ['秋冬新款', '搭配灵感', '限时折扣'],
    categories: ['尺码', '场景', '季节'],
    productCount: 10,
  },
  {
    id: 'tmpl_store',
    name: '虚拟小店模板',
    type: 'store',
    icon: '🏪',
    thumbnail: '',
    defaultLayout: 'grid',
    description: '店主个人资料 + 商品陈列，适合小店经营',
    theme: THEME_PRESETS[2].theme,
    banners: ['店主的话', '本周上新', '小店故事'],
    categories: ['热卖', '手作', '季节'],
    productCount: 8,
  },
  {
    id: 'tmpl_blank',
    name: '完全空白模板',
    type: 'custom',
    icon: '🛍️',
    thumbnail: '',
    defaultLayout: 'grid',
    description: '什么都由你来定义',
    theme: THEME_PRESETS[0].theme,
    banners: [],
    categories: [],
    productCount: 0,
  },
]

export function findTemplate(id: string): MallTemplate | null {
  return MALL_TEMPLATES.find((t) => t.id === id) ?? null
}