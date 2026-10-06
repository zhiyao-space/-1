import { useMemo, useState } from 'react'
import { Eye, LayoutTemplate, Wand2, X } from 'lucide-react'
import { APP_TEMPLATES, type AppTemplate } from '../../lib/factoryTemplates'
import { APP_CATEGORIES, APP_SIZES, type AppCategory, type AppSize, useFactory } from '../../store/factory'
import { useToast } from '../../store/ui'
import { Chip, Divider, EmptyBlock, Field, AppIcon } from './parts'
import Preview from './Preview'

const ICON_CHOICES = ['Puzzle', 'ListChecks', 'NotebookPen', 'Flame', 'Hourglass', 'Heart', 'Timer', 'Calculator', 'Pin', 'Banknote', 'Lock', 'BookOpen', 'Dices', 'Target', 'Moon', 'Zap', 'Coffee', 'Brain']

export default function TemplateFactory({ onCreated }: { onCreated: (id: string, advanced: boolean) => void }) {
  const addApp = useFactory((s) => s.addApp)
  const push = useToast((s) => s.push)

  const [category, setCategory] = useState<AppCategory | 'all'>('all')
  const [picked, setPicked] = useState<AppTemplate | null>(null)
  const [previewT, setPreviewT] = useState<AppTemplate | null>(null)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Puzzle')
  const [size, setSize] = useState<AppSize>('medium')
  const [cat, setCat] = useState<AppCategory>('效率')

  const list = useMemo(() => APP_TEMPLATES.filter((t) => category === 'all' || t.category === category), [category])

  const open = (t: AppTemplate) => {
    setPicked(t)
    setName(t.name)
    setIcon(t.icon)
    setCat(t.category)
    setSize('medium')
  }

  const create = (advanced: boolean) => {
    if (!picked) return
    const app = addApp({
      name,
      icon,
      description: picked.description,
      html: picked.html,
      css: picked.css,
      js: picked.js,
      category: cat,
      size,
      source: 'template',
    })
    setPicked(null)
    push(`已创建「${app.name}」`)
    onCreated(app.id, advanced)
  }

  return (
    <div className="fx-scroll">
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          全部 {APP_TEMPLATES.length}
        </Chip>
        {APP_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyBlock icon={<LayoutTemplate size={30} />} text="该分类下还没有模板" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {list.map((t) => (
            <div key={t.id} className="fx-block fx-mid fx-in" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="fx-sunken" style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon icon={t.icon} size={20} />
                </span>
                <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600, flex: 1, minWidth: 0 }}>
                  {t.name}
                </span>
              </div>
              <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', lineHeight: 1.5, minHeight: 32 }}>
                {t.description}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="fx-btn fx-btn--soft fx-press-soft" style={{ flex: 1, minHeight: 38 }} onClick={() => setPreviewT(t)}>
                  <Eye size={12} /> 预览
                </button>
                <button className="fx-btn fx-press" style={{ flex: 1, minHeight: 38 }} onClick={() => open(t)}>
                  使用
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
        模板已内置完整交互与本地存储，创建后可在代码工坊继续改
      </div>

      {/* 模板预览 */}
      {previewT && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 850, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
            <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
              预览 · {previewT.name}
            </span>
            <button className="fx-press-soft" onClick={() => setPreviewT(null)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '0 4px 12px' }}>
            <Preview
              appId={`__tmpl_${previewT.id}`}
              app={{ name: previewT.name, html: previewT.html, css: previewT.css, js: previewT.js }}
              device="phone"
              ephemeral
            />
          </div>
          <div className="fx-bottom-bar">
            <button className="fx-btn fx-press-soft" style={{ flex: 1 }} onClick={() => setPreviewT(null)}>
              关闭
            </button>
            <button
              className="fx-btn fx-btn--accent fx-press"
              style={{ flex: 1 }}
              onClick={() => {
                const t = previewT
                setPreviewT(null)
                open(t)
              }}
            >
              <Wand2 size={14} /> 用这个模板
            </button>
          </div>
        </div>
      )}

      {/* 参数编辑 */}
      {picked && (
        <div onClick={() => setPicked(null)} style={{ position: 'absolute', inset: 0, zIndex: 860, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '88%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                定制模板
              </span>
              <button className="fx-press-soft" onClick={() => setPicked(null)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <Field label="应用名称">
              <input className="fx-input" value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="给应用起个名字" />
            </Field>

            <Field label="图标">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    className={`fx-press-soft ${icon === ic ? 'fx-sunken' : 'fx-block fx-back'}`}
                    onClick={() => setIcon(ic)}
                    style={{ width: 40, height: 40, border: 0, borderRadius: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppIcon icon={ic} size={18} />
                  </button>
                ))}
              </div>
            </Field>

            <Field label="分类">
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {APP_CATEGORIES.map((c) => (
                  <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="尺寸">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {APP_SIZES.map((s) => (
                  <button
                    key={s.id}
                    className={`fx-press ${size === s.id ? 'fx-sunken' : 'fx-block fx-back'}`}
                    onClick={() => setSize(s.id)}
                    style={{ textAlign: 'left', border: 0, borderRadius: 15, padding: '11px 14px', cursor: 'pointer', minHeight: 44 }}
                  >
                    <span className="fs-body" style={{ color: size === s.id ? 'var(--fx-t1,#fff)' : 'var(--fx-t2,#ddd)', display: 'block' }}>
                      {s.label}
                    </span>
                    <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
                      {s.hint}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            <Divider />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => create(true)}>
                进阶编辑
              </button>
              <button className="fx-btn fx-btn--accent fx-press" style={{ flex: 1 }} onClick={() => create(false)}>
                保存应用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}