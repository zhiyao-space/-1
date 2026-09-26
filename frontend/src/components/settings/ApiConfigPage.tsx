import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, Copy, Download, Upload, RefreshCw, Zap, Eye, EyeOff } from 'lucide-react'
import { useApiPresets, type ApiPreset } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { listModels, testConnection } from '../../lib/api'
import { SectionCard } from '../common'

type Category = ApiPreset['category']
const CATS: { key: Category; label: string }[] = [
  { key: 'chat', label: '聊天用' },
  { key: 'image', label: '生图用' },
  { key: 'voice', label: '语音用' },
  { key: 'vision', label: '识图用' },
]

export default function ApiConfigPage() {
  const presets = useApiPresets((s) => s.presets)
  const [cat, setCat] = useState<Category>('chat')
  const [editing, setEditing] = useState<ApiPreset | null>(null)
  const [creating, setCreating] = useState(false)

  const list = presets.filter((p) => p.category === cat)

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kongshiji-api-presets.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importPresets = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const data = JSON.parse(await file.text())
        if (!Array.isArray(data)) throw new Error('格式错误')
        const store = useApiPresets.getState()
        data.forEach((p) => {
          if (typeof p?.baseUrl === 'string' && typeof p?.name === 'string') {
            store.addPreset({
              name: p.name,
              category: (p.category ?? 'chat') as Category,
              baseUrl: p.baseUrl,
              apiKey: p.apiKey ?? '',
              model: p.model ?? '',
              contextCount: p.contextCount ?? 20,
              temperature: p.temperature ?? 0.8,
              injectMode: p.injectMode === 'merge-user' ? 'merge-user' : 'system',
              isDefault: false,
            })
          }
        })
        useToast.getState().push('预设已导入')
      } catch (err) {
        useToast.getState().push(`导入失败：${(err as Error).message}`, 'error')
      }
    }
    input.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {CATS.map((c) => (
          <button
            key={c.key}
            className="btn pressable"
            style={{
              flex: 1,
              padding: '7px 0',
              background: cat === c.key ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
              color: cat === c.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
            onClick={() => setCat(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {cat === 'chat' && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
          Base URL 需以 /v1 结尾（如 https://api.example.com/v1）。请求由浏览器直接发送到你填写的接口。
        </div>
      )}
      {cat === 'image' && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>生图 API 将在批次 3（气泡美化 / 心声配图）接入。</div>
      )}
      {cat === 'voice' && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>语音 API 将在后续批次接入。</div>
      )}
      {cat === 'vision' && (
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>识图 API 将在后续批次接入。</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-accent" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setCreating(true)}>
          <Plus size={15} /> 新增预设
        </button>
        <button className="btn" style={{ padding: '0 12px' }} onClick={exportPresets} title="导出全部预设">
          <Download size={15} />
        </button>
        <button className="btn" style={{ padding: '0 12px' }} onClick={importPresets} title="导入预设">
          <Upload size={15} />
        </button>
      </div>

      {list.length === 0 ? (
        <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
          还没有{CATS.find((c) => c.key === cat)?.label}预设
        </div>
      ) : (
        <SectionCard>
          {list.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="fs-body" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                  {p.name}
                  {p.isDefault && <Star size={12} color="var(--accent-color)" fill="var(--accent-color)" />}
                </span>
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.baseUrl || '未填 BaseURL'} · {p.model || '未选模型'}
                </span>
              </span>
              {!p.isDefault && (
                <button className="pressable" onClick={() => useApiPresets.getState().setDefault(p.id)} style={{ color: 'var(--text-tertiary)', padding: 5 }} title="设为默认">
                  <Star size={15} />
                </button>
              )}
              <button
                className="pressable"
                onClick={() => {
                  const store = useApiPresets.getState()
                  store.addPreset({ ...p, name: `${p.name} 副本`, isDefault: false })
                  useToast.getState().push('已复制预设')
                }}
                style={{ color: 'var(--text-tertiary)', padding: 5 }}
                title="复制"
              >
                <Copy size={15} />
              </button>
              <button className="pressable" onClick={() => { setEditing(p); setCreating(false) }} style={{ color: 'var(--text-tertiary)', padding: 5 }}>
                <Pencil size={15} />
              </button>
              <button
                className="pressable"
                onClick={() => {
                  useApiPresets.getState().removePreset(p.id)
                  useToast.getState().push('预设已删除')
                }}
                style={{ color: 'var(--text-tertiary)', padding: 5 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </SectionCard>
      )}

      {(creating || editing) && (
        <PresetForm preset={editing} category={cat} onClose={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}

function PresetForm({ preset, category, onClose }: { preset: ApiPreset | null; category: Category; onClose: () => void }) {
  const push = useToast((s) => s.push)
  const [name, setName] = useState(preset?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(preset?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(preset?.apiKey ?? '')
  const [model, setModel] = useState(preset?.model ?? '')
  const [contextCount, setContextCount] = useState(preset?.contextCount ?? 20)
  const [temperature, setTemperature] = useState(preset?.temperature ?? 0.8)
  const [injectMode, setInjectMode] = useState<ApiPreset['injectMode']>(preset?.injectMode ?? 'system')
  const [models, setModels] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchModels = async () => {
    if (!baseUrl.trim()) {
      push('请先填写 Base URL', 'error')
      return
    }
    setFetching(true)
    try {
      const list = await listModels(baseUrl, apiKey)
      setModels(list)
      push(`获取到 ${list.length} 个模型`)
    } catch (err) {
      push(`获取模型失败：${(err as Error).message}`, 'error')
    } finally {
      setFetching(false)
    }
  }

  const runTest = async () => {
    if (!baseUrl.trim()) {
      push('请先填写 Base URL', 'error')
      return
    }
    setTesting(true)
    setTestResult(null)
    const r = await testConnection(baseUrl, apiKey, model)
    setTestResult(r.ok ? '连通成功' : r.message)
    setTesting(false)
  }

  const save = () => {
    if (!name.trim()) {
      push('预设名称必填', 'error')
      return
    }
    if (!baseUrl.trim()) {
      push('Base URL 必填', 'error')
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      category,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      contextCount,
      temperature,
      injectMode,
      isDefault: preset?.isDefault ?? false,
    }
    const store = useApiPresets.getState()
    if (preset) store.updatePreset(preset.id, payload)
    else store.addPreset(payload)
    push(preset ? '预设已保存' : '预设已创建')
    onClose()
  }

  return (
    <div className="page-enter" style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass" style={{ width: '88%', maxHeight: '84%', overflowY: 'auto', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="fs-h3" style={{ color: 'var(--text-primary)' }}>
          {preset ? '编辑预设' : '新增预设'} · {CATS.find((c) => c.key === category)?.label}
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="预设名称（如：主聊天）" maxLength={20} />

        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL（末尾带 /v1）" />
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
            style={{ width: '100%', paddingRight: 40 }}
          />
          <button
            className="pressable"
            onClick={() => setShowKey((v) => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select value={model} onChange={(e) => setModel(e.target.value)} style={{ flex: 1, minWidth: 0 }}>
            <option value="">{model ? model : '选择模型（或手动输入）'}</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            {model && !models.includes(model) && <option value={model}>{model}</option>}
          </select>
          <button className="btn" style={{ padding: '0 12px', display: 'flex', alignItems: 'center' }} onClick={fetchModels} disabled={fetching}>
            <RefreshCw size={14} className={fetching ? 'spin' : ''} />
          </button>
        </div>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="手动输入模型名" />

        {category === 'chat' && (
          <>
            <label>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                上下文条数：{contextCount}
              </span>
              <input type="range" min={2} max={100} value={contextCount} onChange={(e) => setContextCount(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
                温度：{temperature.toFixed(1)}
              </span>
              <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn pressable"
                style={{ flex: 1, background: injectMode === 'system' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)' }}
                onClick={() => setInjectMode('system')}
              >
                system 注入
              </button>
              <button
                className="btn pressable"
                style={{ flex: 1, background: injectMode === 'merge-user' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)' }}
                onClick={() => setInjectMode('merge-user')}
              >
                合并到 user
              </button>
            </div>
          </>
        )}

        {testResult && (
          <div className="fs-micro" style={{ color: testResult === '连通成功' ? '#7ee2a8' : '#ff8a8a', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {testResult}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={runTest} disabled={testing}>
            <Zap size={14} /> {testing ? '测试中…' : '连通性测试'}
          </button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={save} disabled={saving}>
            保存
          </button>
        </div>
        <button className="btn" onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
