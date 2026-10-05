import { useMemo, useState } from 'react'
import { Copy, CornerDownLeft, Plus, Scissors, Trash2, X } from 'lucide-react'
import { SNIPPET_LIBRARY } from '../../lib/factoryTemplates'
import { useFactory, type CodeSnippet } from '../../store/factory'
import { useToast } from '../../store/ui'
import { Chip, Divider, EmptyBlock, Field } from './parts'

const GROUPS = ['全部', '动画', '布局', '交互', '工具函数', '样式', '组件', '我的']

type Item = {
  id: string
  name: string
  type: 'html' | 'css' | 'js'
  code: string
  tags: string[]
  description: string
  mine: boolean
}

export default function SnippetLibrary({ onInsert }: { onInsert: (type: 'html' | 'css' | 'js', code: string) => void }) {
  const snippets = useFactory((s) => s.snippets)
  const addSnippet = useFactory((s) => s.addSnippet)
  const removeSnippet = useFactory((s) => s.removeSnippet)
  const touchSnippet = useFactory((s) => s.touchSnippet)
  const push = useToast((s) => s.push)

  const [group, setGroup] = useState('全部')
  const [active, setActive] = useState<Item | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'css' as CodeSnippet['type'], code: '', tags: '', description: '' })

  const all: Item[] = useMemo(
    () => [
      ...snippets.map((s) => ({ id: s.id, name: s.name, type: s.type, code: s.code, tags: s.tags, description: s.description, mine: true })),
      ...SNIPPET_LIBRARY.map((s, i) => ({ id: `lib_${i}`, name: s.name, type: s.type, code: s.code, tags: s.tags, description: s.description, mine: false })),
    ],
    [snippets]
  )

  const list = useMemo(() => {
    if (group === '全部') return all
    if (group === '我的') return all.filter((i) => i.mine)
    return all.filter((i) => i.tags.some((t) => t.includes(group)))
  }, [all, group])

  const insert = (item: Item) => {
    onInsert(item.type, item.code)
    if (item.mine) touchSnippet(item.id)
    push(`已插入「${item.name}」到代码工坊`)
    setActive(null)
  }

  return (
    <div className="fx-scroll">
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {GROUPS.map((g) => (
          <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
            {g}
          </Chip>
        ))}
      </div>

      <button className="fx-btn fx-press" style={{ width: '100%', marginBottom: 12 }} onClick={() => setCreating(true)}>
        <Plus size={14} /> 新建片段
      </button>

      {list.length === 0 ? (
        <EmptyBlock icon={<Scissors size={30} />} text="这个分类下还没有片段" hint="在代码工坊里选中代码也能直接存为片段" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((item) => (
            <div key={item.id} className="fx-block fx-mid fx-in" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="fx-chip">{item.type.toUpperCase()}</span>
                <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {item.mine && <span className="fx-chip">我的</span>}
              </div>
              <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', marginTop: 5, lineHeight: 1.5 }}>
                {item.description || item.tags.join(' · ')}
              </div>
              <pre className="fx-code" style={{ margin: '9px 0 0', padding: 9, borderRadius: 12, background: '#0d0d0d', color: '#7d7d7d', maxHeight: 62, overflow: 'hidden', fontSize: 10.5 }}>
                {item.code.slice(0, 180)}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="fx-btn fx-btn--soft fx-press-soft" style={{ flex: 1, minHeight: 38 }} onClick={() => setActive(item)}>
                  查看
                </button>
                <button className="fx-btn fx-press" style={{ flex: 1, minHeight: 38 }} onClick={() => insert(item)}>
                  <CornerDownLeft size={13} /> 一键插入
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 查看片段 */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: 'absolute', inset: 0, zIndex: 860, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '82%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                {active.name}
              </span>
              <button className="fx-press-soft" onClick={() => setActive(null)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', marginBottom: 10, lineHeight: 1.6 }}>
              {active.description}
            </div>
            <pre className="fx-code" style={{ margin: 0, padding: 12, borderRadius: 14, background: '#0d0d0d', color: '#cfcfcf', maxHeight: 300, overflow: 'auto', fontSize: 11 }}>
              {active.code}
            </pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                className="fx-btn fx-press"
                style={{ flex: 1 }}
                onClick={() => {
                  void navigator.clipboard.writeText(active.code).then(() => push('已复制')).catch(() => push('复制失败', 'error'))
                }}
              >
                <Copy size={13} /> 复制
              </button>
              <button className="fx-btn fx-btn--accent fx-press" style={{ flex: 1 }} onClick={() => insert(active)}>
                <CornerDownLeft size={13} /> 插入到工坊
              </button>
            </div>
            {active.mine && (
              <button
                className="fx-btn fx-btn--soft fx-press-soft"
                style={{ width: '100%', marginTop: 8, color: '#ff8a8a' }}
                onClick={() => {
                  removeSnippet(active.id)
                  setActive(null)
                  push('已删除片段', 'info')
                }}
              >
                <Trash2 size={13} /> 删除片段
              </button>
            )}
          </div>
        </div>
      )}

      {/* 新建片段 */}
      {creating && (
        <div onClick={() => setCreating(false)} style={{ position: 'absolute', inset: 0, zIndex: 860, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                新建片段
              </span>
              <button className="fx-press-soft" onClick={() => setCreating(false)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <Field label="名称">
              <input className="fx-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 24) })} placeholder="例如：厚块按钮" />
            </Field>
            <Field label="类型">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['html', 'css', 'js'] as const).map((t) => (
                  <Chip key={t} active={form.type === t} onClick={() => setForm({ ...form, type: t })}>
                    {t.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="代码">
              <textarea className="fx-textarea fx-code" rows={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="粘贴代码…" />
            </Field>
            <Field label="标签（逗号分隔）">
              <input className="fx-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="样式, 按钮" />
            </Field>
            <Field label="说明">
              <input className="fx-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 40) })} placeholder="一句话说明用途" />
            </Field>
            <Divider />
            <button
              className="fx-btn fx-btn--accent fx-press"
              style={{ width: '100%', minHeight: 48 }}
              onClick={() => {
                if (!form.name.trim() || !form.code.trim()) {
                  push('名称和代码都不能为空', 'error')
                  return
                }
                addSnippet({
                  name: form.name.trim(),
                  type: form.type,
                  code: form.code,
                  tags: form.tags.split(/[,，\s]+/).filter(Boolean),
                  description: form.description.trim(),
                })
                setForm({ name: '', type: 'css', code: '', tags: '', description: '' })
                setCreating(false)
                setGroup('我的')
                push('片段已保存')
              }}
            >
              保存片段
            </button>
          </div>
        </div>
      )}
    </div>
  )
}