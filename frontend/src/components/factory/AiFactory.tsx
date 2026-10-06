import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Eye, Loader2, Pencil, RefreshCw, Save, Sparkles, FlaskConical } from 'lucide-react'
import { FACTORY_EXTRAS, FACTORY_STYLES, fallbackFromTemplates, generateApp, hasAiPreset, type GeneratedApp } from '../../lib/factoryEngine'
import { APP_SIZES, type AppSize, useFactory } from '../../store/factory'
import { useToast } from '../../store/ui'
import { Chip, Divider, Field, AppIcon } from './parts'
import Preview from './Preview'

const EXAMPLES = ['一个记录喝水的小工具', '帮我做一个口红试色记录本', '每天记账的极简本', '记录我家猫喂食时间']

export default function AiFactory({ onSaved, onEdit }: { onSaved: (id: string) => void; onEdit: (id: string) => void }) {
  const addApp = useFactory((s) => s.addApp)
  const addAiRecord = useFactory((s) => s.addAiRecord)
  const addExperiment = useFactory((s) => s.addExperiment)
  const push = useToast((s) => s.push)

  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('thick')
  const [size, setSize] = useState<AppSize>('medium')
  const [extras, setExtras] = useState<string[]>(['数据本地持久化'])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<GeneratedApp | null>(null)
  const [raw, setRaw] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const aiReady = useMemo(() => hasAiPreset(), [])

  const toggleExtra = (e: string) => setExtras((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const run = async () => {
    const desc = prompt.trim()
    if (!desc) {
      push('先描述一下你想要什么', 'error')
      return
    }
    setBusy(true)
    setResult(null)
    setRaw('')
    setUsedFallback(false)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const g = await generateApp({ description: desc, style, size, extras, onDelta: setRaw, signal: ctrl.signal })
      setResult(g)
      addAiRecord({ prompt: desc, style, size, appName: g.name })
      push('生成完成')
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'NO_PRESET') {
        push('还没配置对话模型，已用模板兜底', 'info')
      } else if (msg === 'PARSE_FAILED') {
        push('模型返回格式异常，已用模板兜底', 'error')
      } else if ((err as Error).name !== 'AbortError') {
        push(`生成失败：${msg.slice(0, 40)}`, 'error')
      }
      const fb = fallbackFromTemplates(desc)
      setResult({ ...fb, name: fb.name })
      setUsedFallback(true)
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  const save = (thenEdit: boolean, toSandbox = false) => {
    if (!result) return
    const app = addApp({
      name: result.name,
      icon: result.icon,
      description: result.description,
      html: result.html,
      css: result.css,
      js: result.js,
      category: result.category,
      size,
      source: 'ai',
      isVisibleOnDesktop: false,
    })
    push(`已保存「${app.name}」`)
    setResult(null)
    setPrompt('')
    if (thenEdit) onEdit(app.id)
    else onSaved(app.id)
    if (toSandbox) addExperiment({ name: `${result.name}（草稿）`, html: result.html, css: result.css, js: result.js })
  }

  return (
    <div className="fx-scroll">
      <div className="fx-block fx-mid" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Sparkles size={15} color="var(--fx-t1,#fff)" />
          <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600 }}>
            我想做一个…
          </span>
        </div>
        <textarea
          className="fx-textarea"
          rows={3}
          maxLength={300}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="用一句话描述它，例如：一个能记录每天喝了多少水的打卡工具"
        />
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
          {EXAMPLES.map((e) => (
            <Chip key={e} onClick={() => setPrompt(e)}>
              {e}
            </Chip>
          ))}
        </div>
      </div>

      <Field label="风格">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FACTORY_STYLES.map((s) => (
            <button
              key={s.id}
              className={`fx-press ${style === s.id ? 'fx-sunken' : 'fx-block fx-back'}`}
              onClick={() => setStyle(s.id)}
              style={{ textAlign: 'left', border: 0, borderRadius: 15, padding: '10px 12px', cursor: 'pointer', minHeight: 52 }}
            >
              <span className="fs-body" style={{ display: 'block', color: style === s.id ? 'var(--fx-t1,#fff)' : 'var(--fx-t2,#ddd)' }}>
                {s.label}
              </span>
              <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)', lineHeight: 1.4 }}>
                {s.hint}
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="尺寸">
        <div style={{ display: 'flex', gap: 8 }}>
          {APP_SIZES.map((s) => (
            <button
              key={s.id}
              className={`fx-press ${size === s.id ? 'fx-sunken' : 'fx-block fx-back'}`}
              onClick={() => setSize(s.id)}
              style={{ flex: 1, border: 0, borderRadius: 15, padding: '10px 6px', cursor: 'pointer', minHeight: 44, color: size === s.id ? 'var(--fx-t1,#fff)' : 'var(--fx-t3,#999)', fontSize: 'calc(12px * var(--fs-scale))' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="创意选项（可多选）">
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {FACTORY_EXTRAS.map((e) => (
            <Chip key={e} active={extras.includes(e)} onClick={() => toggleExtra(e)}>
              {extras.includes(e) && <Check size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />}
              {e}
            </Chip>
          ))}
        </div>
      </Field>

      {!aiReady && (
        <div className="fx-sunken" style={{ padding: 12, marginBottom: 14 }}>
          <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', lineHeight: 1.7 }}>
            还没有可用的对话模型：仍可生成，会先落地一个功能相近的模板，你可在代码工坊里继续改。
          </div>
        </div>
      )}

      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%', minHeight: 50 }} onClick={() => void run()} disabled={busy}>
        {busy ? <Loader2 size={16} className="fx-spin" /> : <Sparkles size={16} />} {busy ? '生成中…' : '生成应用'}
      </button>

      {busy && (
        <div className="fx-sunken fx-loading" style={{ marginTop: 14, padding: 12, maxHeight: 120, overflow: 'auto' }}>
          <div className="fx-code" style={{ fontSize: 10.5, color: 'var(--fx-t3,#999)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {raw.slice(-600) || '正在构思应用结构…'}
          </div>
        </div>
      )}

      {result && (
        <>
          <Divider />
          <div className="fx-block fx-front fx-in" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="fx-sunken" style={{ width: 44, height: 44, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon icon={result.icon} size={22} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600 }}>
                  {result.name}
                </div>
                <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', lineHeight: 1.5 }}>
                  {result.description || '（无描述）'}
                </div>
              </div>
              <span className="fx-chip">{result.category}</span>
            </div>

            <div style={{ height: 320, marginBottom: 12 }}>
              <Preview appId="__ai_draft" app={{ name: result.name, html: result.html, css: result.css, js: result.js }} device="phone" ephemeral />
            </div>

            {usedFallback && (
              <div className="fs-micro" style={{ color: '#e8d18a', marginBottom: 10 }}>
                这是模板兜底结果，配置模型后可获得更贴合需求的应用。
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="fx-btn fx-btn--accent fx-press" onClick={() => save(false)}>
                <Save size={13} /> 保存
              </button>
              <button className="fx-btn fx-press" onClick={() => void run()} disabled={busy}>
                <RefreshCw size={13} /> 换一个
              </button>
              <button className="fx-btn fx-press" onClick={() => save(true)}>
                <Pencil size={13} /> 进入编辑
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  if (!result) return
                  addExperiment({ name: `${result.name}（AI草稿）`, html: result.html, css: result.css, js: result.js })
                  push('已存入沙盒')
                }}
              >
                <FlaskConical size={13} /> 存沙盒
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="fx-btn fx-btn--soft fx-press-soft"
                style={{ flex: 1 }}
                onClick={() => {
                  if (!result) return
                  void navigator.clipboard
                    .writeText(result.html + '\n\n' + result.css + '\n\n' + result.js)
                    .then(() => push('代码已复制'))
                    .catch(() => push('复制失败', 'error'))
                }}
              >
                <Copy size={13} /> 复制代码
              </button>
            </div>
          </div>
        </>
      )}

      {!result && !busy && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, color: 'var(--fx-t3,#999)' }}>
          <Eye size={13} />
          <span className="fs-micro">生成后会在这里实时预览，可以直接跑起来试</span>
        </div>
      )}
    </div>
  )
}