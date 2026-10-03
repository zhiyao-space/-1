import { useState } from 'react'
import { Download, Upload, Database } from 'lucide-react'
import { useToast } from '../../store/ui'
import { SectionCard } from '../common'
import { PageShell } from './SettingsApp'

interface KeyMeta {
  key: string
  label: string
}

const EXPORT_KEYS: KeyMeta[] = [
  { key: 'ksc:characters', label: '角色' },
  { key: 'ksc:chats', label: '对话记录' },
  { key: 'ksc:groups', label: '群组' },
  { key: 'ksc:worldbook', label: '世界书' },
  { key: 'ksc:runtimeRules', label: '角色运行规则 / 思维链' },
  { key: 'ksc:profile', label: '主页与面具' },
  { key: 'ksc:forum', label: '论坛' },
  { key: 'ksc:notifications', label: '通知' },
  { key: 'ksc:stickers', label: '贴纸包' },
  { key: 'ksc:wallet', label: '钱包' },
  { key: 'ksc:minds', label: '心智' },
  { key: 'ksc:branches', label: '分支' },
  { key: 'ksc:schedule', label: '日程' },
  { key: 'ksc:chat-params', label: '聊天参数' },
  { key: 'ksc:settings', label: '外观设置' },
  { key: 'ksc:api-presets', label: 'API 预设' },
]

type ConflictStrategy = 'skip' | 'overwrite' | 'merge'

const STRATEGY_LABEL: Record<ConflictStrategy, string> = {
  skip: '跳过同名',
  overwrite: '覆盖导入',
  merge: '合并',
}

export default function DataPage({ onBack }: { onBack: () => void }) {
  const push = useToast((s) => s.push)
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EXPORT_KEYS.map((k) => [k.key, true]))
  )
  const [strategy, setStrategy] = useState<ConflictStrategy>('merge')
  const [pendingImport, setPendingImport] = useState<{ data: Record<string, unknown>; name: string } | null>(null)
  const [importSummary, setImportSummary] = useState<string[] | null>(null)

  const selectedCount = EXPORT_KEYS.filter((k) => selected[k.key]).length

  const doExport = () => {
    const keys = EXPORT_KEYS.filter((k) => selected[k.key]).map((k) => k.key)
    if (keys.length === 0) {
      push('请至少勾选一项', 'error')
      return
    }
    const data: Record<string, unknown> = {}
    for (const key of keys) {
      const raw = localStorage.getItem(key)
      data[key] = raw ? JSON.parse(raw) : null
    }
    const payload = { app: 'ksc', version: 1, time: Date.now(), data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ksc-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    push(`已导出 ${keys.length} 类数据`)
  }

  const pickImportFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const parsed = JSON.parse(await file.text())
        if (!parsed || typeof parsed !== 'object' || typeof parsed.data !== 'object') {
          push('文件格式不正确（缺少 data 字段）', 'error')
          return
        }
        setPendingImport({ data: parsed.data as Record<string, unknown>, name: file.name })
        setImportSummary(null)
      } catch {
        push('JSON 解析失败', 'error')
      }
    }
    input.click()
  }

  const doImport = () => {
    if (!pendingImport) return
    const log: string[] = []
    for (const [key, value] of Object.entries(pendingImport.data)) {
      const exists = localStorage.getItem(key) !== null
      if (exists && strategy === 'skip') {
        log.push(`跳过 ${key}（本地已存在）`)
        continue
      }
      if (exists && strategy === 'merge') {
        try {
          const local = JSON.parse(localStorage.getItem(key) as string)
          const incoming = value
          if (Array.isArray(local) && Array.isArray(incoming)) {
            const seen = new Set(local.map((x) => JSON.stringify(x)))
            localStorage.setItem(key, JSON.stringify([...local, ...(incoming as unknown[]).filter((x) => !seen.has(JSON.stringify(x)))]))
            log.push(`合并 ${key}（数组去重追加）`)
          } else if (local && typeof local === 'object' && incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
            const merged = { ...(incoming as object), ...local, state: { ...(incoming as { state?: object }).state, ...(local as { state?: object }).state } }
            localStorage.setItem(key, JSON.stringify(merged))
            log.push(`合并 ${key}（本地优先覆盖同名字段）`)
          } else {
            localStorage.setItem(key, JSON.stringify(incoming))
            log.push(`覆盖 ${key}（类型不同无法合并）`)
          }
        } catch {
          localStorage.setItem(key, JSON.stringify(value))
          log.push(`覆盖 ${key}（本地解析失败）`)
        }
        continue
      }
      if (exists && strategy === 'overwrite') log.push(`覆盖 ${key}`)
      if (!exists) log.push(`新增 ${key}`)
      localStorage.setItem(key, JSON.stringify(value))
    }
    setImportSummary(log)
    setPendingImport(null)
    push('导入完成，即将刷新应用')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <PageShell title="数据管理" onBack={onBack}>
      <SectionCard title="导出">
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.7 }}>
          勾选要导出的数据类别，生成一份 JSON 备份文件。头像等图片存在浏览器索引库中，不随 JSON 导出。
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {EXPORT_KEYS.map((k) => (
            <label key={k.key} className="row-item pressable" style={{ cursor: 'pointer', padding: '7px 0' }}>
              <span className="fs-body" style={{ color: selected[k.key] ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{k.label}</span>
              <input
                type="checkbox"
                checked={selected[k.key]}
                onChange={(e) => setSelected((s) => ({ ...s, [k.key]: e.target.checked }))}
              />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-accent pressable" style={{ flex: 1 }} onClick={doExport}>
            <Download size={14} /> 导出所选（{selectedCount}）
          </button>
          <button className="btn pressable" onClick={() => setSelected(Object.fromEntries(EXPORT_KEYS.map((k) => [k.key, true])))}>
            全选
          </button>
        </div>
      </SectionCard>

      <SectionCard title="导入">
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.7 }}>
          选择之前导出的 JSON 备份。当本地已存在同名数据时，按下方策略处理；导入完成后应用会自动刷新。
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['skip', 'overwrite', 'merge'] as ConflictStrategy[]).map((s) => (
            <button
              key={s}
              className="btn btn-sm pressable"
              style={{ flex: 1, background: strategy === s ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
              onClick={() => setStrategy(s)}
            >
              {STRATEGY_LABEL[s]}
            </button>
          ))}
        </div>
        <button className="btn pressable" style={{ width: '100%' }} onClick={pickImportFile}>
          <Upload size={14} /> 选择备份文件
        </button>
        {importSummary && (
          <div style={{ marginTop: 10, maxHeight: 180, overflowY: 'auto' }}>
            {importSummary.map((l, i) => (
              <div key={i} className="fs-micro mono" style={{ color: 'var(--text-tertiary)', padding: '3px 0' }}>{l}</div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div className="row-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={15} color="var(--text-tertiary)" />
            <div>
              <div className="fs-body" style={{ color: 'var(--text-primary)' }}>存储说明</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                全部数据保存在本机浏览器 localStorage（ksc: 前缀），清空浏览器数据会丢失记录，请定期导出备份。
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <ModalConfirm
        open={!!pendingImport}
        title="确认导入"
        body={
          pendingImport
            ? `文件「${pendingImport.name}」包含 ${Object.keys(pendingImport.data).length} 类数据，冲突策略：${STRATEGY_LABEL[strategy]}。同名数据将被处理，确定继续？`
            : ''
        }
        onCancel={() => setPendingImport(null)}
        onConfirm={doImport}
      />
    </PageShell>
  )
}

function ModalConfirm({ open, title, body, onCancel, onConfirm }: { open: boolean; title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null
  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onCancel}
    >
      <div className="glass" style={{ borderRadius: 16, padding: 18, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="nav-title fs-h3" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{body}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn pressable" style={{ flex: 1 }} onClick={onCancel}>取消</button>
          <button className="btn btn-accent pressable" style={{ flex: 1 }} onClick={onConfirm}>确定导入</button>
        </div>
      </div>
    </div>
  )
}
