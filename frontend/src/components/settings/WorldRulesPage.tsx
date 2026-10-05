import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Pencil, Download, Upload, FileJson } from 'lucide-react'
import {
  useWorldRules,
  sortedRules,
  extractRules,
  type WorldRule,
  type ImportMode,
  type RuleUpsert,
} from '../../store/worldRules'
import { useToast } from '../../store/ui'
import { Modal, SectionCard, Toggle } from '../common'
import { PageShell } from './SettingsApp'

const EMPTY: RuleUpsert = {
  name: '',
  triggerCondition: '',
  ruleContent: '',
  priority: 0,
  isEnabled: true,
}

export default function WorldRulesPage({ onBack }: { onBack: () => void }) {
  const rules = useWorldRules((s) => s.rules)
  const setEnabled = useWorldRules((s) => s.setEnabled)
  const removeRule = useWorldRules((s) => s.removeRule)
  const exportRules = useWorldRules((s) => s.exportRules)
  const importRules = useWorldRules((s) => s.importRules)
  const push = useToast((s) => s.push)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<WorldRule | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState<WorldRule[] | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('smart')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const ordered = sortedRules(rules)

  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }
  const openEdit = (r: WorldRule) => {
    setEditing(r)
    setEditorOpen(true)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const parsed = extractRules(json)
      if (parsed.length === 0) {
        push('未在文件中找到有效的规制数据', 'error')
        return
      }
      setPreview(parsed)
      setFileName(file.name)
      setImportOpen(true)
    } catch {
      push('文件解析失败，请确认是合法的 JSON', 'error')
    }
  }

  const doImport = () => {
    if (!preview) return
    const res = importRules(preview, importMode)
    push(`导入完成：新增 ${res.added} · 更新 ${res.updated} · 跳过 ${res.skipped}`)
    setImportOpen(false)
    setPreview(null)
    setFileName('')
  }

  return (
    <PageShell title="世界书运行规制" onBack={onBack}>
      <SectionCard>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.75, marginBottom: 10 }}>
          规制在角色发消息、来电、行为决策时自动检测并生效。按优先级从高到低执行（同优先级按更新时间降序）。
          触发条件支持关键词 / 角色名 / 事件类型（消息、来电、行为），留空表示全局生效。
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={openNew}>
            <Plus size={14} /> 新建规制
          </button>
          <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> 导入
          </button>
          <button
            className="btn btn-sm pressable"
            style={{ flex: 1 }}
            onClick={() => {
              if (rules.length === 0) return push('暂无可导出的规制', 'info')
              exportRules()
              push('已导出全部规制')
            }}
          >
            <Download size={14} /> 导出
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </SectionCard>

      {ordered.length === 0 ? (
        <SectionCard>
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
            还没有规制。点击「新建规制」开始编写。
          </div>
        </SectionCard>
      ) : (
        ordered.map((r) => (
          <SectionCard key={r.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fs-body" style={{ color: r.isEnabled ? 'var(--text-primary)' : 'var(--text-disabled)', fontWeight: 600 }}>
                  {r.name}
                </div>
                <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                  优先级 {r.priority} · {r.triggerCondition.trim() ? `条件：${r.triggerCondition.replace(/\n/g, ' / ')}` : '全局生效'}
                </div>
              </div>
              <Toggle checked={r.isEnabled} onChange={(v) => setEnabled(r.id, v)} />
            </div>
            <div className="fs-micro" style={{ color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 72, overflow: 'hidden' }}>
              {r.ruleContent || '（无内容）'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => openEdit(r)}>
                <Pencil size={13} /> 编辑
              </button>
              <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => { exportRules([r.id]); push('已导出该条规制') }}>
                <FileJson size={13} /> 导出
              </button>
              <button
                className="btn btn-sm pressable"
                style={{ flex: 1, color: '#ff8a8a' }}
                onClick={() => {
                  removeRule(r.id)
                  push('已删除规制', 'info')
                }}
              >
                <Trash2 size={13} /> 删除
              </button>
            </div>
          </SectionCard>
        ))
      )}

      <RuleEditor
        open={editorOpen}
        rule={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false)
          push(editing ? '规制已更新' : '规制已创建')
        }}
      />

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="导入规制">
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 10 }}>
          文件：{fileName}，解析到 {preview?.length ?? 0} 条规制
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {([
            ['smart', '智能合并'],
            ['merge', '合并导入'],
            ['overwrite', '覆盖导入'],
          ] as [ImportMode, string][]).map(([m, label]) => (
            <button
              key={m}
              className="btn btn-sm pressable"
              style={{
                flex: 1,
                background: importMode === m ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                color: importMode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
              onClick={() => setImportMode(m)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', lineHeight: 1.7, marginBottom: 12 }}>
          {importMode === 'overwrite'
            ? '覆盖导入：清空现有规制后用文件内容替换。'
            : importMode === 'merge'
              ? '合并导入：同名规则视为新条目追加，同 ID 则更新。'
              : '智能合并：同 ID 更新，同名规则合并内容并取较高优先级，其余新增。'}
        </div>
        <button className="btn btn-accent pressable" style={{ width: '100%' }} onClick={doImport}>
          确认导入
        </button>
      </Modal>
    </PageShell>
  )
}

function RuleEditor({
  open,
  rule,
  onClose,
  onSaved,
}: {
  open: boolean
  rule: WorldRule | null
  onClose: () => void
  onSaved: () => void
}) {
  const addRule = useWorldRules((s) => s.addRule)
  const updateRule = useWorldRules((s) => s.updateRule)
  const push = useToast((s) => s.push)
  const [form, setForm] = useState<RuleUpsert>(EMPTY)

  // 每次打开时同步表单内容
  useEffect(() => {
    if (!open) return
    setForm(
      rule
        ? { name: rule.name, triggerCondition: rule.triggerCondition, ruleContent: rule.ruleContent, priority: rule.priority, isEnabled: rule.isEnabled }
        : EMPTY
    )
  }, [open, rule])

  const save = () => {
    if (!form.name.trim()) return push('请填写规制名称', 'error')
    if (rule) updateRule(rule.id, form)
    else addRule(form)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? '编辑规制' : '新建规制'} width={340}>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>规制名称</div>
      <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, 40) }))} placeholder="如：深夜降温" />

      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', margin: '12px 0 6px' }}>触发条件（留空 = 全局）</div>
      <textarea
        value={form.triggerCondition}
        onChange={(e) => setForm((f) => ({ ...f, triggerCondition: e.target.value.slice(0, 500) }))}
        rows={2}
        placeholder={'如：\n消息\n深夜\n林晚'}
        style={{ resize: 'vertical' }}
      />

      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', margin: '12px 0 6px' }}>
        规制内容（自由书写，可含概率指令如「炸裂=15%」「拦截骚扰」）
      </div>
      <textarea
        value={form.ruleContent}
        onChange={(e) => setForm((f) => ({ ...f, ruleContent: e.target.value.slice(0, 2000) }))}
        rows={4}
        placeholder={'如：\n角色在深夜更脆弱，容易提及孤独\n炸裂=15%'}
        style={{ resize: 'vertical' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>优先级（越大越高）</div>
          <input
            value={String(form.priority)}
            onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value.replace(/[^0-9-]/g, '') || 0) }))}
            style={{ width: '100%', textAlign: 'center' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>启用</span>
          <Toggle checked={form.isEnabled} onChange={(v) => setForm((f) => ({ ...f, isEnabled: v }))} />
        </div>
      </div>

      <button className="btn btn-accent pressable" style={{ width: '100%', marginTop: 16 }} onClick={save}>
        保存
      </button>
    </Modal>
  )
}