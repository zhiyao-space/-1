import type { ChatApiMessage } from './api'
import { streamChat } from './api'
import { getDefaultChatPreset } from '../store/apiPresets'
import {
  LAYOUTS,
  LOCAL_CONFIG_FALLBACK,
  MODULE_TYPE_LABEL,
  SORT_RULES,
  localBanners,
  localProducts,
  mallId,
} from './mallCatalog'
import type { MallBanner, MallLayout, MallModule, MallProduct, MallTheme, SortRule } from '../store/mall'

/* ============================================================
   mulin 商城 MALLÉ · AI 引擎
   刷新商品 / 辅助配置样式
   有可用 LLM 预设时真实生成；否则本地生成，保证离线也能用
   ============================================================ */

export function hasMallAi(): boolean {
  return !!getDefaultChatPreset()
}

/** 从模型输出里抠出 JSON 数组 */
function extractJsonArray(text: string): unknown[] | null {
  let s = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('[')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1))
          return Array.isArray(parsed) ? parsed : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/** 从模型输出里抠出 JSON 对象 */
function extractJsonObject(text: string): Record<string, unknown> | null {
  let s = text.trim()
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1))
          return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim())
}

/* ---------- 刷新商品 ---------- */

export function buildProductsPrompt(module: MallModule, count: number): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `你是一个商城商品生成器。根据模块信息生成一组商品。

模块名称：${module.name}
模块类型：${MODULE_TYPE_LABEL[module.type]}（product/flash-sale/blind-box/auction/store/custom）
模块简介/定位：${module.description || '（未填写）'}
已有分类：${module.categories.join('、') || '（未设置）'}

生成数量：${count} 个商品
要求：
1. 商品风格符合模块定位，名称具体、有画面感，不要编号占位。
2. 每个商品包含：name、price（¥）、originalPrice、description（一句话）、tags（3-5 个）。
3. 价格范围 ¥5-¥999，分布合理；originalPrice 高于 price。
4. 标签要有吸引力（如"热卖""新品""限时""爆款"）。
5. 只输出 JSON 数组，不要任何解释文字、不要 markdown 围栏。

输出格式：
[{"name":"商品名","price":99,"originalPrice":129,"description":"一句话描述","tags":["热卖","新品"]}]`,
    },
    { role: 'user', content: `请为「${module.name}」生成 ${count} 个商品。` },
  ]
}

function toProducts(raw: unknown[], module: MallModule): MallProduct[] {
  const out: MallProduct[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) continue
    const price = Math.round(num(o.price, 0))
    const original = Math.round(num(o.originalPrice, price + Math.round(price * 0.2)))
    const cats = module.categories
    out.push({
      id: mallId('prod'),
      moduleId: module.id,
      name,
      description: typeof o.description === 'string' ? o.description : '',
      price: price > 0 ? price : 9,
      originalPrice: original > price ? original : Math.round((price || 9) * 1.2),
      image: '',
      category: cats.length ? cats[Math.floor(Math.random() * cats.length)] : '精选',
      stock: Math.floor(3 + Math.random() * 200),
      sales: Math.floor(Math.random() * 999),
      rating: Math.round((4 + Math.random()) * 10) / 10,
      tags: strList(o.tags).slice(0, 5),
      customAttrs: {},
      createdAt: Date.now(),
    })
  }
  return out
}

/** 生成一组商品；AI 不可用或解析失败时回退本地生成 */
export async function generateProducts(module: MallModule, count = 9, signal?: AbortSignal): Promise<MallProduct[]> {
  const preset = getDefaultChatPreset()
  if (!preset) return localProducts(module, count)
  try {
    const full = await streamChat(preset, buildProductsPrompt(module, count), { onDelta: () => {}, signal })
    const raw = extractJsonArray(full)
    const parsed = raw ? toProducts(raw, module) : []
    return parsed.length ? parsed : localProducts(module, count)
  } catch {
    return localProducts(module, count)
  }
}

/** 生成一组 Banner；AI 不可用时本地生成 */
export async function generateBanners(module: MallModule, count = 3, signal?: AbortSignal): Promise<MallBanner[]> {
  const preset = getDefaultChatPreset()
  if (!preset) return localBanners(module, count)
  const messages: ChatApiMessage[] = [
    {
      role: 'system',
      content: `你在为一个购物 App 的「${module.name}」模块（类型：${MODULE_TYPE_LABEL[module.type]}，定位：${module.description || '未填写'}）写轮播活动文案。\n\n输出 ${count} 条中文短文案，每条 4-10 个字，像电商活动标题（例如"满 30 减 8""前 100 名半价"）。\n只输出 JSON 数组，不要解释、不要 markdown 围栏：["文案1","文案2"]`,
    },
    { role: 'user', content: '生成活动文案。' },
  ]
  try {
    const full = await streamChat(preset, messages, { onDelta: () => {}, signal })
    const raw = extractJsonArray(full)
    const labels = raw ? strList(raw).slice(0, count) : []
    if (!labels.length) return localBanners(module, count)
    return labels.map((label, i) => ({ id: mallId('bn'), image: '', linkTo: label, sortOrder: i }))
  } catch {
    return localBanners(module, count)
  }
}

/* ---------- AI 辅助配置 ---------- */

export interface MallConfigSuggestion {
  layout: MallLayout
  theme: MallTheme
  bannerCount: number
  productsPerPage: number
  sortRule: SortRule
  source: 'ai' | 'local'
}

export function buildConfigPrompt(opts: {
  moduleName: string
  moduleType: MallModule['type']
  styleDescription: string
  userPreference?: string
}): ChatApiMessage[] {
  return [
    {
      role: 'system',
      content: `根据用户的模块信息，生成一套完整的 UI 配置方案。

模块名称：${opts.moduleName}
模块类型：${MODULE_TYPE_LABEL[opts.moduleType]}
商品/内容风格：${opts.styleDescription || '未填写'}
用户偏好（如有）：${opts.userPreference || '无'}

要求：
1. layout 只能取：${LAYOUTS.map((l) => l.id).join('|')}
2. theme.cardStyle 只能取：rounded|square|pill；borderRadius 取 8-28 的整数；spacing 取 8-20 的整数
3. theme 以深色为底（bgColor 用 #1a1a1a ~ #262626 之间的深色），accentColor 用协调的点缀色
4. sortRule 只能取：${SORT_RULES.map((s) => s.id).join('|')}
5. bannerCount 取 0-5；productsPerPage 取 4-12
6. 只输出 JSON 对象，不要解释文字、不要 markdown 围栏。

输出格式：
{"layout":"grid","theme":{"bgColor":"#1e1e1e","accentColor":"#ff6b6b","cardStyle":"rounded","borderRadius":16,"spacing":12},"bannerCount":3,"productsPerPage":8,"sortRule":"sales"}`,
    },
    { role: 'user', content: `请为「${opts.moduleName}」生成配置方案。` },
  ]
}

function toConfig(o: Record<string, unknown>): MallConfigSuggestion | null {
  const layoutRaw = typeof o.layout === 'string' ? o.layout : ''
  const layout = (LAYOUTS.find((l) => l.id === layoutRaw)?.id ?? null) as MallLayout | null
  if (!layout) return null
  const t = (o.theme && typeof o.theme === 'object' ? o.theme : {}) as Record<string, unknown>
  const cardStyleRaw = typeof t.cardStyle === 'string' ? t.cardStyle : 'rounded'
  const cardStyle = cardStyleRaw === 'square' || cardStyleRaw === 'pill' ? cardStyleRaw : 'rounded'
  const sortRaw = typeof o.sortRule === 'string' ? o.sortRule : 'sales'
  const sortRule = (SORT_RULES.find((s) => s.id === sortRaw)?.id ?? 'sales') as SortRule
  return {
    layout,
    theme: {
      bgColor: typeof t.bgColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.bgColor) ? t.bgColor : '#1e1e1e',
      accentColor:
        typeof t.accentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(t.accentColor) ? t.accentColor : '#ffffff',
      cardStyle,
      borderRadius: Math.min(28, Math.max(8, Math.round(num(t.borderRadius, 16)))),
      spacing: Math.min(20, Math.max(8, Math.round(num(t.spacing, 12)))),
    },
    bannerCount: Math.min(5, Math.max(0, Math.round(typeof o.bannerCount === 'number' ? o.bannerCount : 3))),
    productsPerPage: Math.min(12, Math.max(4, Math.round(num(o.productsPerPage, 8)))),
    sortRule,
    source: 'ai',
  }
}

/** 让 AI 依据模块信息给出一套布局/主题配置；失败时回退本地推荐 */
export async function suggestConfig(opts: {
  moduleName: string
  moduleType: MallModule['type']
  styleDescription: string
  userPreference?: string
  signal?: AbortSignal
}): Promise<MallConfigSuggestion> {
  const fallback: MallConfigSuggestion = {
    ...localConfigFallback(opts.moduleType),
    source: 'local',
  }
  const preset = getDefaultChatPreset()
  if (!preset) return fallback
  try {
    const full = await streamChat(preset, buildConfigPrompt(opts), { onDelta: () => {}, signal: opts.signal })
    const obj = extractJsonObject(full)
    const parsed = obj ? toConfig(obj) : null
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function localConfigFallback(type: MallModule['type']): Omit<MallConfigSuggestion, 'source'> {
  const base = LOCAL_CONFIG_FALLBACK[type] ?? LOCAL_CONFIG_FALLBACK.product
  return { layout: base.layout, theme: base.theme, bannerCount: 3, productsPerPage: 8, sortRule: base.sortRule }
}