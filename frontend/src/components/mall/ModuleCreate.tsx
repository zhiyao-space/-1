import { useState } from 'react'
import { Check, ChevronLeft, Sparkles } from 'lucide-react'
import { useMall, type MallLayout, type MallTheme, type MallType } from '../../store/mall'
import {
  CARD_STYLES,
  DEFAULT_THEME,
  ICON_CHOICES,
  LAYOUTS,
  MALL_TEMPLATES,
  MODULE_TYPES,
  THEME_PRESETS,
} from '../../lib/mallCatalog'
import { generateProducts } from '../../lib/mallEngine'
import { useToast } from '../../store/ui'
import { SliderRow } from '../common'
import { Field } from './mallParts'

/* ============================================================
   mulin 商城 ✦ MALLÉ · 新建模块
   类型 → 名称与图标 → 布局与主题 → 内容与 AI 生成 → 保存
   可从 6 套内置模板导入，也可完全从零定义
   ============================================================ */

const STEPS = ['类型', '名称图标', '布局主题', '内容生成']

export default function ModuleCreate({ onBack, templateFirst = false }: { onBack: () => void; templateFirst?: boolean }) {
  const createModule = useMall((s) => s.createModule)
  const setModuleProducts = useMall((s) => s.setModuleProducts)
  const addRefreshRecord = useMall((s) => s.addRefreshRecord)
  const push = useToast((s) => s.push)

  const [step, setStep] = useState(0)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [type, setType] = useState<MallType>('product')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🛍️')
  const [layout, setLayout] = useState<MallLayout>('grid')
  const [theme, setTheme] = useState<MallTheme>(DEFAULT_THEME)
  const [description, setDescription] = useState('')
  const [productCount, setProductCount] = useState(8)
  const [aiGenerate, setAiGenerate] = useState(false)
  const [busy, setBusy] = useState(false)

  const applyTemplate = (id: string) => {
    const tpl = MALL_TEMPLATES.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setType(tpl.type)
    setIcon(tpl.icon)
    setLayout(tpl.defaultLayout)
    setTheme(tpl.theme)
    setDescription(tpl.description)
    setProductCount(tpl.productCount || 8)
    setName(tpl.name.replace('模板', ''))
    setStep(1)
  }

  const clearTemplate = () => {
    setTemplateId(null)
    setType('product')
    setIcon('🛍️')
    setLayout('grid')
    setTheme(DEFAULT_THEME)
    setDescription('')
    setName('')
    setProductCount(8)
  }

  const save = async () => {
    if (!name.trim()) {
      push('给模块起个名字吧', 'error')
      setStep(1)
      return
    }
    setBusy(true)
    try {
      const id = createModule({
        name,
        type,
        icon,
        layout,
        theme,
        templateId: templateId ?? undefined,
        description,
        productCount,
      })
      if (aiGenerate) {
        const created = useMall.getState().modules.find((m) => m.id === id)
        if (created) {
          const ps = await generateProducts(created, productCount)
          setModuleProducts(id, ps)
          addRefreshRecord([id], ps.length)
        }
      }
      push(`${name} 已添加到首页 ✦`)
      onBack()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fx-root ml-root">
      <div className="ml-pagehead">
        <button className="ml-iconbtn ml-iconbtn--sm fx-press" onClick={onBack} aria-label="返回">
          <ChevronLeft size={17} />
        </button>
        <span className="ml-pagehead__title">{templateFirst ? '从模板创建' : '新建模块'}</span>
        <span className="ml-pagehead__sub">{STEPS[step]}</span>
      </div>

      <div className="ml-orderscroll">
        <div className="ml-stepbar">
          {STEPS.map((s, i) => (
            <span key={s} className={`ml-step${i <= step ? ' ml-step--on' : ''}`}>
              <span className="ml-step__no">{i + 1}</span>
              {s}
            </span>
          ))}
        </div>

        {/* 步骤 1：类型与模板 */}
        {step === 0 && (
          <>
            <div className="ml-mgroup">选择模块类型</div>
            <div className="ml-chiprow" style={{ marginBottom: 18 }}>
              {MODULE_TYPES.map((t) => (
                <button
                  key={t.id}
                  className={`ml-chip${type === t.id && !templateId ? ' ml-chip--active' : ''}`}
                  onClick={() => {
                    setType(t.id)
                    setTemplateId(null)
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ml-mgroup">导入预设模板（可选）</div>
            {MALL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`ml-tmplcard${templateId === t.id ? ' ml-tmplcard--on' : ''}`}
                onClick={() => applyTemplate(t.id)}
              >
                <span className="ml-tmplcard__thumb">{t.icon}</span>
                <span className="ml-prodrow__body">
                  <span className="ml-tmplcard__name">{t.name}</span>
                  <span className="ml-tmplcard__desc">{t.description}</span>
                </span>
                {templateId === t.id && <Check size={17} color="var(--fx-accent)" />}
              </button>
            ))}
            <button className="fx-btn fx-press" style={{ width: '100%', marginTop: 4 }} onClick={clearTemplate}>
              从零创建（清空模板预设）
            </button>
          </>
        )}

        {/* 步骤 2：名称与图标 */}
        {step === 1 && (
          <>
            <Field label="模块名称">
              <input className="fx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：深夜食堂" />
            </Field>
            <Field label="模块简介">
              <textarea
                className="fx-textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="一句话说清这个模块的定位"
              />
            </Field>
            <Field label="图标">
              <div className="ml-chiprow" style={{ marginBottom: 8 }}>
                {ICON_CHOICES.map((ic) => (
                  <button key={ic} className={`ml-emoji${icon === ic ? ' ml-emoji--on' : ''}`} onClick={() => setIcon(ic)}>
                    {ic}
                  </button>
                ))}
              </div>
              <input className="fx-input" value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} style={{ width: 100 }} />
            </Field>
          </>
        )}

        {/* 步骤 3：布局与主题 */}
        {step === 2 && (
          <>
            <Field label="展示布局">
              <div className="ml-chiprow">
                {LAYOUTS.map((l) => (
                  <button key={l.id} className={`ml-chip${layout === l.id ? ' ml-chip--active' : ''}`} onClick={() => setLayout(l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="配色预设">
              <div className="ml-swatch">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`ml-swatch__item${theme.accentColor === p.theme.accentColor ? ' ml-swatch__item--on' : ''}`}
                    style={{ background: `linear-gradient(140deg, ${p.theme.accentColor} 0%, ${p.theme.bgColor} 70%)` }}
                    onClick={() => setTheme({ ...p.theme, borderRadius: theme.borderRadius, spacing: theme.spacing })}
                    title={p.label}
                  />
                ))}
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 15 }}>
              <span style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t3)' }}>背景色</span>
              <input type="color" value={theme.bgColor} onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })} />
              <span style={{ fontSize: 'calc(11.5px * var(--fs-scale))', color: 'var(--fx-t3)' }}>强调色</span>
              <input type="color" value={theme.accentColor} onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })} />
            </div>
            <Field label="卡片样式">
              <div className="ml-chiprow">
                {CARD_STYLES.map((c) => (
                  <button
                    key={c.id}
                    className={`ml-chip${theme.cardStyle === c.id ? ' ml-chip--active' : ''}`}
                    onClick={() => setTheme({ ...theme, cardStyle: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <SliderRow
              label="卡片圆角"
              value={theme.borderRadius}
              min={4}
              max={28}
              onChange={(v) => setTheme({ ...theme, borderRadius: v })}
              format={(v) => `${v}px`}
            />
            <SliderRow
              label="卡片间距"
              value={theme.spacing}
              min={6}
              max={22}
              onChange={(v) => setTheme({ ...theme, spacing: v })}
              format={(v) => `${v}px`}
            />
          </>
        )}

        {/* 步骤 4：内容生成 */}
        {step === 3 && (
          <>
            <Field label="初始商品数量">
              <div className="ml-chiprow">
                {[0, 6, 8, 10, 12].map((n) => (
                  <button
                    key={n}
                    className={`ml-chip${productCount === n ? ' ml-chip--active' : ''}`}
                    onClick={() => setProductCount(n)}
                  >
                    {n === 0 ? '暂不生成' : `${n} 个`}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="内容来源">
              <div className="ml-chiprow">
                <button className={`ml-chip${!aiGenerate ? ' ml-chip--active' : ''}`} onClick={() => setAiGenerate(false)}>
                  本地示例商品
                </button>
                <button className={`ml-chip${aiGenerate ? ' ml-chip--active' : ''}`} onClick={() => setAiGenerate(true)}>
                  <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                  AI 生成一组
                </button>
              </div>
            </Field>
            <div className="ml-detail__desc" style={{ marginTop: 0 }}>
              {aiGenerate
                ? '保存时会调用 AI 按模块定位生成商品，无可用模型时自动回退本地生成。'
                : '保存时立刻用本地商品池填充，之后随时可以刷新或手动编辑。'}
            </div>
          </>
        )}
      </div>

      <div className="ml-bottombar">
        {step > 0 && (
          <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>
            上一步
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="fx-btn fx-btn--accent fx-press"
            style={{ flex: 2 }}
            onClick={() => {
              if (step === 1 && !name.trim()) {
                push('给模块起个名字吧', 'error')
                return
              }
              setStep(step + 1)
            }}
          >
            下一步
          </button>
        ) : (
          <button className="fx-btn fx-btn--accent fx-press" style={{ flex: 2 }} disabled={busy} onClick={() => void save()}>
            <Check size={16} />
            {busy ? '正在创建…' : '保存并添加到首页'}
          </button>
        )}
      </div>
    </div>
  )
}
