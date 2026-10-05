import { useState } from 'react'
import { Check, ChevronLeft, Pencil, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import {
  useMall,
  type MallBanner,
  type MallModule,
  type MallProduct,
} from '../../store/mall'
import {
  CARD_STYLES,
  ICON_CHOICES,
  LAYOUTS,
  MODULE_TYPE_LABEL,
  SORT_RULES,
  THEME_PRESETS,
  mallId,
} from '../../lib/mallCatalog'
import { generateProducts, suggestConfig } from '../../lib/mallEngine'
import { useToast } from '../../store/ui'
import { SliderRow } from '../common'
import { Field, Sheet, Thumb } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 模块编辑
   名称 / 图标 / 布局 / 主题 / Banner / 商品 / 分类 / 排序 / 简介
   改动先落在草稿，点「保存」一次性写回
   ============================================================ */

const EMPTY_PRODUCT: Partial<MallProduct> = {
  name: '',
  price: 0,
  originalPrice: 0,
  description: '',
  image: '',
  category: '',
  stock: 99,
  tags: [],
}

function ProductEditor({
  value,
  onClose,
  onSave,
}: {
  value: { product: Partial<MallProduct>; editingId: string | null }
  onClose: () => void
  onSave: (p: Partial<MallProduct>, editingId: string | null) => void
}) {
  const [form, setForm] = useState<Partial<MallProduct>>(value.product)
  const [tagText, setTagText] = useState((value.product.tags ?? []).join('、'))

  return (
    <Sheet open onClose={onClose} title={value.editingId ? '编辑商品' : '新增商品'}>
      <Field label="商品名称">
        <input className="fx-input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="价格 ¥">
          <input
            className="fx-input"
            type="number"
            value={form.price ?? 0}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </Field>
        <Field label="原价 ¥">
          <input
            className="fx-input"
            type="number"
            value={form.originalPrice ?? 0}
            onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="一句话描述">
        <textarea
          className="fx-textarea"
          rows={2}
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="分类">
          <input className="fx-input" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <Field label="库存">
          <input
            className="fx-input"
            type="number"
            value={form.stock ?? 99}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="标签（用、分隔）">
        <input className="fx-input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="热卖、新品" />
      </Field>
      <Field label="图片链接（可留空，自动生成占位）">
        <input className="fx-input" value={form.image ?? ''} onChange={(e) => setForm({ ...form, image: e.target.value })} />
      </Field>
      <button
        className="fx-btn fx-btn--accent fx-press"
        style={{ width: '100%', marginTop: 4 }}
        onClick={() =>
          onSave(
            {
              ...form,
              tags: tagText
                .split(/[、,，\s]+/)
                .map((t) => t.trim())
                .filter(Boolean),
            },
            value.editingId
          )
        }
      >
        保存商品
      </button>
    </Sheet>
  )
}

export default function ModuleEditor({ moduleId, onBack }: { moduleId: string; onBack: () => void }) {
  const module = useMall((s) => s.modules.find((m) => m.id === moduleId))
  const storedProducts = useMall((s) => s.products.filter((p) => p.moduleId === moduleId))
  const updateModule = useMall((s) => s.updateModule)
  const setModuleProducts = useMall((s) => s.setModuleProducts)
  const push = useToast((s) => s.push)

  const [draft, setDraft] = useState<MallModule | null>(module ?? null)
  const [items, setItems] = useState<MallProduct[]>(storedProducts)
  const [editing, setEditing] = useState<{ product: Partial<MallProduct>; editingId: string | null } | null>(null)
  const [newCat, setNewCat] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  if (!draft) {
    return (
      <div className="fx-root ml-root">
        <div className="ml-pagehead">
          <button className="ml-iconbtn ml-iconbtn--sm fx-press" onClick={onBack}>
            <ChevronLeft size={17} />
          </button>
          <span className="ml-pagehead__title">模块不存在</span>
        </div>
      </div>
    )
  }

  const patch = (p: Partial<MallModule>) => setDraft({ ...draft, ...p })

  const save = () => {
    updateModule(draft.id, {
      name: draft.name.trim() || '未命名模块',
      icon: draft.icon,
      layout: draft.layout,
      theme: draft.theme,
      banners: draft.banners.map((b, i) => ({ ...b, sortOrder: i })),
      description: draft.description,
      sortRule: draft.sortRule,
      categories: draft.categories,
    })
    setModuleProducts(draft.id, items)
    push('模块已保存 ✦')
    onBack()
  }

  const runAiConfig = async () => {
    setAiBusy(true)
    try {
      const res = await suggestConfig({
        moduleName: draft.name,
        moduleType: draft.type,
        styleDescription: draft.description,
      })
      setDraft((d) =>
        d ? { ...d, layout: res.layout, theme: res.theme, sortRule: res.sortRule } : d
      )
      push(res.source === 'ai' ? 'AI 已生成配置方案 ✦' : '已应用本地推荐配置')
    } finally {
      setAiBusy(false)
    }
  }

  const runAiProducts = async () => {
    setAiBusy(true)
    try {
      const next = await generateProducts({ ...draft }, Math.max(6, items.length || 8))
      setItems(next)
      push('已生成一组新商品 ✦')
    } finally {
      setAiBusy(false)
    }
  }

  const bannerMove = (idx: number, dir: -1 | 1) => {
    const list = [...draft.banners]
    const to = idx + dir
    if (to < 0 || to >= list.length) return
    ;[list[idx], list[to]] = [list[to], list[idx]]
    patch({ banners: list })
  }

  return (
    <div className="fx-root ml-root">
      <div className="ml-pagehead">
        <button className="ml-iconbtn ml-iconbtn--sm fx-press" onClick={onBack} aria-label="返回">
          <ChevronLeft size={17} />
        </button>
        <span className="ml-pagehead__title">编辑模块</span>
        <span className="ml-pagehead__sub">
          <button className="ml-chip ml-chip--active" onClick={save}>
            保存
          </button>
        </span>
      </div>

      <div className="ml-orderscroll">
        {/* 基本信息 */}
        <div className="ml-mgroup">基本信息 · {MODULE_TYPE_LABEL[draft.type]}</div>
        <Field label="模块名称">
          <input className="fx-input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="模块简介（显示在模块顶部）">
          <textarea
            className="fx-textarea"
            rows={2}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="一句话说清这个模块卖什么"
          />
        </Field>
        <Field label="图标">
          <div className="ml-chiprow" style={{ marginBottom: 8 }}>
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                className={`ml-emoji${draft.icon === ic ? ' ml-emoji--on' : ''}`}
                onClick={() => patch({ icon: ic })}
              >
                {ic}
              </button>
            ))}
          </div>
          <input className="fx-input" value={draft.icon} maxLength={4} onChange={(e) => patch({ icon: e.target.value })} />
        </Field>

        {/* 布局与排序 */}
        <div className="ml-mgroup">布局与排序</div>
        <Field label="展示布局">
          <div className="ml-chiprow">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                className={`ml-chip${draft.layout === l.id ? ' ml-chip--active' : ''}`}
                onClick={() => patch({ layout: l.id })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="默认排序">
          <div className="ml-chiprow">
            {SORT_RULES.map((r) => (
              <button
                key={r.id}
                className={`ml-chip${draft.sortRule === r.id ? ' ml-chip--active' : ''}`}
                onClick={() => patch({ sortRule: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Field>

        {/* 主题 */}
        <div className="ml-mgroup">主题配色</div>
        <Field label="配色预设">
          <div className="ml-swatch">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`ml-swatch__item${draft.theme.accentColor === p.theme.accentColor ? ' ml-swatch__item--on' : ''}`}
                style={{ background: `linear-gradient(140deg, ${p.theme.accentColor} 0%, ${p.theme.bgColor} 70%)` }}
                onClick={() => patch({ theme: { ...p.theme, borderRadius: draft.theme.borderRadius, spacing: draft.theme.spacing } })}
                title={p.label}
              />
            ))}
          </div>
        </Field>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 15 }}>
          <span style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t3)' }}>背景色</span>
          <input
            type="color"
            value={draft.theme.bgColor}
            onChange={(e) => patch({ theme: { ...draft.theme, bgColor: e.target.value } })}
          />
          <span style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t3)' }}>强调色</span>
          <input
            type="color"
            value={draft.theme.accentColor}
            onChange={(e) => patch({ theme: { ...draft.theme, accentColor: e.target.value } })}
          />
        </div>
        <Field label="卡片样式">
          <div className="ml-chiprow">
            {CARD_STYLES.map((c) => (
              <button
                key={c.id}
                className={`ml-chip${draft.theme.cardStyle === c.id ? ' ml-chip--active' : ''}`}
                onClick={() => patch({ theme: { ...draft.theme, cardStyle: c.id } })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>
        <SliderRow
          label="卡片圆角"
          value={draft.theme.borderRadius}
          min={4}
          max={28}
          onChange={(v) => patch({ theme: { ...draft.theme, borderRadius: v } })}
          format={(v) => `${v}px`}
        />
        <SliderRow
          label="卡片间距"
          value={draft.theme.spacing}
          min={6}
          max={22}
          onChange={(v) => patch({ theme: { ...draft.theme, spacing: v } })}
          format={(v) => `${v}px`}
        />

        {/* Banner */}
        <div className="ml-mgroup">Banner 轮播</div>
        {draft.banners.map((b, i) => (
          <div key={b.id} className="ml-bannerrow">
            <span className="ml-bannerrow__idx">{i + 1}</span>
            <input
              className="fx-input"
              value={b.linkTo}
              placeholder="活动文案"
              onChange={(e) => {
                const list = [...draft.banners]
                list[i] = { ...b, linkTo: e.target.value }
                patch({ banners: list })
              }}
            />
            <button className="ml-chip" onClick={() => bannerMove(i, -1)}>
              ↑
            </button>
            <button className="ml-chip" onClick={() => bannerMove(i, 1)}>
              ↓
            </button>
            <button
              className="ml-iconbtn ml-iconbtn--sm fx-press"
              onClick={() => patch({ banners: draft.banners.filter((x) => x.id !== b.id) })}
              aria-label="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          className="fx-btn fx-press"
          style={{ width: '100%', marginBottom: 16 }}
          onClick={() =>
            patch({
              banners: [
                ...draft.banners,
                { id: mallId('bn'), image: '', linkTo: '新活动', sortOrder: draft.banners.length } as MallBanner,
              ],
            })
          }
        >
          <Plus size={15} />
          添加 Banner
        </button>

        {/* 分类 */}
        <div className="ml-mgroup">分类筛选</div>
        <div className="ml-chiprow" style={{ marginBottom: 10 }}>
          {draft.categories.map((c) => (
            <button key={c} className="ml-chip ml-chip--active" onClick={() => patch({ categories: draft.categories.filter((x) => x !== c) })}>
              {c} ×
            </button>
          ))}
          {draft.categories.length === 0 && (
            <span style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t3)' }}>还没有分类</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="fx-input"
            placeholder="新分类名，如「辣度」「尺码」"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <button
            className="fx-btn fx-press"
            onClick={() => {
              const v = newCat.trim()
              if (!v || draft.categories.includes(v)) return
              patch({ categories: [...draft.categories, v] })
              setNewCat('')
            }}
          >
            添加
          </button>
        </div>

        {/* 商品 */}
        <div className="ml-mgroup">商品列表 · {items.length} 件</div>
        {items.map((p) => (
          <div key={p.id} className="ml-prodrow">
            <Thumb className="ml-prodrow__thumb" name={p.name} image={p.image || undefined} size="1 / 1" />
            <span className="ml-prodrow__body">
              <span className="ml-name">{p.name}</span>
              <span className="ml-desc">
                ¥{p.price} · {p.category || '未分类'} · 库存 {p.stock}
              </span>
            </span>
            <button
              className="ml-iconbtn ml-iconbtn--sm fx-press"
              onClick={() => setEditing({ product: p, editingId: p.id })}
              aria-label="编辑"
            >
              <Pencil size={14} />
            </button>
            <button
              className="ml-iconbtn ml-iconbtn--sm fx-press"
              onClick={() => setItems(items.filter((x) => x.id !== p.id))}
              aria-label="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          className="fx-btn fx-press"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => setEditing({ product: { ...EMPTY_PRODUCT, category: draft.categories[0] ?? '' }, editingId: null })}
        >
          <Plus size={15} />
          添加商品
        </button>

        {/* AI 辅助 */}
        <div className="ml-mgroup">AI 辅助</div>
        <button
          className="fx-btn fx-press"
          style={{ width: '100%', marginBottom: 10 }}
          disabled={aiBusy}
          onClick={() => void runAiConfig()}
        >
          <Wand2 size={15} />
          {aiBusy ? '处理中…' : '帮我配置布局与配色'}
        </button>
        <button
          className="fx-btn fx-press"
          style={{ width: '100%', marginBottom: 24 }}
          disabled={aiBusy}
          onClick={() => void runAiProducts()}
        >
          <Sparkles size={15} />
          {aiBusy ? '生成中…' : '重新生成一组商品'}
        </button>

        <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', marginBottom: 8 }} onClick={save}>
          <Check size={16} />
          保存模块
        </button>
      </div>

      {editing && (
        <ProductEditor
          key={editing.editingId ?? 'new'}
          value={editing}
          onClose={() => setEditing(null)}
          onSave={(p, editingId) => {
            if (!p.name?.trim()) {
              push('商品名不能为空', 'error')
              return
            }
            if (editingId) {
              setItems(items.map((x) => (x.id === editingId ? { ...x, ...p } : x)))
            } else {
              setItems([
                {
                  id: mallId('prod'),
                  moduleId: draft.id,
                  name: p.name!.trim(),
                  description: p.description ?? '',
                  price: p.price ?? 0,
                  originalPrice: p.originalPrice ?? 0,
                  image: p.image ?? '',
                  category: p.category ?? '',
                  stock: p.stock ?? 99,
                  sales: 0,
                  rating: 5,
                  tags: p.tags ?? [],
                  customAttrs: {},
                  createdAt: Date.now(),
                },
                ...items,
              ])
            }
            setEditing(null)
            push('商品已更新，记得保存模块')
          }}
        />
      )}
    </div>
  )
}
