import { useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  Pencil,
  Upload,
  Settings2,
  ScrollText,
  ChevronRight,
  Globe,
  Link2,
  Check,
} from 'lucide-react'
import { useWorldbook, WB_CATEGORY_PRESETS, type WorldBook, type WbEntry, type WbMount, type WbDepth } from '../../store/worldbook'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { parseWorldbookFiles } from '../../lib/worldbookEngine'
import { Modal, SectionCard, Toggle, EmptyState } from '../common'
import { PageShell } from './SettingsApp'

const MOUNT_LABEL: Record<WbMount, string> = { always: '始终', keyword: '关键词', disabled: '禁用' }
const DEPTH_LABEL: Record<WbDepth, string> = { system: 'system', user: 'user', context: '附加上下文' }

export default function WorldbookPage({ onBackHome }: { onBackHome: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const book = useWorldbook((s) => (editingId ? s.books.find((b) => b.id === editingId) : null))

  if (editingId && book) {
    return (
      <PageShell title={book.name} onBack={() => setEditingId(null)}>
        <BookEditor book={book} />
      </PageShell>
    )
  }
  return (
    <PageShell title="世界书管理" onBack={onBackHome}>
      <Bookshelf onEdit={(id) => setEditingId(id)} />
    </PageShell>
  )
}

function Bookshelf({ onEdit }: { onEdit: (id: string) => void }) {
  const books = useWorldbook((s) => s.books)
  const createBook = useWorldbook((s) => s.createBook)
  const removeBook = useWorldbook((s) => s.removeBook)
  const duplicateBook = useWorldbook((s) => s.duplicateBook)
  const updateBook = useWorldbook((s) => s.updateBook)
  const push = useToast((s) => s.push)
  const [createOpen, setCreateOpen] = useState(false)
  const [advOpen, setAdvOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<WorldBook | null>(null)

  const startImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.txt,.json,.md,.docx'
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      try {
        const groups = await parseWorldbookFiles(files)
        for (const g of groups) {
          const entries = g.entries.map((e) => ({
            name: e.name,
            content: e.content,
            keywords: e.keywords,
            depth: 'system' as WbDepth,
            priority: 5,
            mount: (e.keywords.length > 0 ? 'keyword' : 'always') as WbMount,
          }))
          useWorldbook.getState().importBook(g.name, g.category, entries)
        }
        push(`已导入 ${groups.length} 本世界书（共 ${groups.reduce((a, g) => a + g.entries.length, 0)} 条目）`)
      } catch (e) {
        push(e instanceof Error ? e.message : '导入失败', 'error')
      }
    }
    input.click()
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-accent pressable" style={{ flex: 1 }} onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> 新建世界书
        </button>
        <button className="btn pressable" onClick={startImport} title="从文件夹批量导入 .txt/.json/.md/.docx">
          <Upload size={15} /> 导入
        </button>
        <button className="btn pressable" onClick={() => setAdvOpen(true)} title="Token 预算与命中日志">
          <Settings2 size={15} />
        </button>
      </div>

      {books.length === 0 ? (
        <EmptyState icon={<ScrollText size={36} />} text="书架还是空的" hint="新建或从文件夹导入 .txt / .json / .docx 世界书" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {books.map((b) => (
            <div key={b.id} className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
              <button className="pressable" onClick={() => onEdit(b.id)} style={{ width: '100%', textAlign: 'left', display: 'block' }}>
                <div style={{ height: 74, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <ScrollText size={26} />
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {b.category} · {b.entries.length} 条目 · {b.scope === 'global' ? '全局' : '局部'}
                  </div>
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px 8px' }}>
                <Toggle checked={b.enabled} onChange={(v) => updateBook(b.id, { enabled: v })} />
                <div style={{ flex: 1 }} />
                <button className="pressable" onClick={() => setRenameTarget(b)} style={{ color: 'var(--text-tertiary)', padding: 4 }}><Pencil size={13} /></button>
                <button className="pressable" onClick={() => { duplicateBook(b.id); push('已复制世界书') }} style={{ color: 'var(--text-tertiary)', padding: 4 }}><Copy size={13} /></button>
                <button className="pressable" onClick={() => { removeBook(b.id); push('已删除世界书', 'info') }} style={{ color: 'var(--text-disabled)', padding: 4 }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateBookModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); onEdit(id) }} />
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="重命名世界书">
        {renameTarget && <RenameBody book={renameTarget} onDone={() => setRenameTarget(null)} />}
      </Modal>
      <AdvancedModal open={advOpen} onClose={() => setAdvOpen(false)} />
    </>
  )
}

function RenameBody({ book, onDone }: { book: WorldBook; onDone: () => void }) {
  const updateBook = useWorldbook((s) => s.updateBook)
  const push = useToast((s) => s.push)
  const [name, setName] = useState(book.name)
  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus />
      <button
        className="btn btn-accent"
        style={{ width: '100%', marginTop: 12 }}
        onClick={() => {
          if (name.trim()) updateBook(book.id, { name: name.trim() })
          push('已重命名')
          onDone()
        }}
      >
        保存
      </button>
    </div>
  )
}

function CreateBookModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const createBook = useWorldbook((s) => s.createBook)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(WB_CATEGORY_PRESETS[0])
  const [customCat, setCustomCat] = useState('')
  const finalCat = customCat.trim() || category

  return (
    <Modal open={open} onClose={onClose} title="新建世界书">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="世界书名称" maxLength={30} autoFocus />
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>选择分类</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {WB_CATEGORY_PRESETS.map((c) => (
            <button
              key={c}
              className="pressable"
              onClick={() => { setCategory(c); setCustomCat('') }}
              style={{ fontSize: 'calc(12px * var(--fs-scale))', padding: '4px 12px', borderRadius: 999, background: finalCat === c ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)', color: finalCat === c ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {c}
            </button>
          ))}
        </div>
        <input value={customCat} onChange={(e) => setCustomCat(e.target.value)} placeholder="或输入自定义分类" maxLength={12} />
        <button
          className="btn btn-accent"
          onClick={() => {
            if (!name.trim()) return
            onCreated(createBook(name.trim(), finalCat))
            setName('')
          }}
        >
          创建并进入编辑
        </button>
      </div>
    </Modal>
  )
}

function AdvancedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tokenBudget = useWorldbook((s) => s.tokenBudget)
  const setTokenBudget = useWorldbook((s) => s.setTokenBudget)
  const hitLogs = useWorldbook((s) => s.hitLogs)
  const clearHitLogs = useWorldbook((s) => s.clearHitLogs)
  const [tab, setTab] = useState<'budget' | 'log'>('budget')

  return (
    <Modal open={open} onClose={onClose} title="高级设置">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-sm pressable" style={{ flex: 1, background: tab === 'budget' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }} onClick={() => setTab('budget')}>Token 预算</button>
        <button className="btn btn-sm pressable" style={{ flex: 1, background: tab === 'log' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }} onClick={() => setTab('log')}>命中日志</button>
      </div>

      {tab === 'budget' ? (
        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>每轮对话世界书最多注入的 Token 数（0 为不限制）</div>
          <input value={String(tokenBudget)} onChange={(e) => setTokenBudget(Number(e.target.value.replace(/[^0-9]/g, '') || 0))} />
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 8 }}>超出预算时，低优先级条目将被跳过。</div>
        </div>
      ) : (
        <div>
          {hitLogs.length === 0 ? (
            <EmptyState icon={<ScrollText size={28} />} text="暂无命中记录" hint="聊天触发世界书条目后会记录在这里" />
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {hitLogs.map((l, i) => (
                <div key={i} className="fs-micro" style={{ color: 'var(--text-body)', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.7 }}>
                  <span className="mono" style={{ color: 'var(--text-disabled)' }}>{new Date(l.time).toLocaleTimeString()}</span> · ~{l.estTokens} tokens
                  <br />{l.bookName}：{l.entryNames.join('、')}
                </div>
              ))}
            </div>
          )}
          {hitLogs.length > 0 && (
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={clearHitLogs}>
              <Trash2 size={12} /> 清空日志
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

function BookEditor({ book }: { book: WorldBook }) {
  const updateBook = useWorldbook((s) => s.updateBook)
  const push = useToast((s) => s.push)
  const characters = useCharacters((s) => s.characters)
  const [entryTarget, setEntryTarget] = useState<WbEntry | 'new' | null>(null)
  const [bindOpen, setBindOpen] = useState(false)

  return (
    <>
      <SectionCard>
        <div className="row-item">
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>启用这本世界书</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>关闭后整组条目都不注入</div>
          </div>
          <Toggle checked={book.enabled} onChange={(v) => updateBook(book.id, { enabled: v })} />
        </div>
        <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => updateBook(book.id, { scope: book.scope === 'global' ? 'local' : 'global' })}>
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {book.scope === 'global' ? <Globe size={13} /> : <Link2 size={13} />}
              {book.scope === 'global' ? '全局世界书' : '局部世界书'}
            </div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{book.scope === 'global' ? '影响所有对话 · 点击切换为局部' : '仅绑定的角色生效 · 点击切换为全局'}</div>
          </div>
          <ChevronRight size={15} color="var(--text-disabled)" />
        </button>
        {book.scope === 'local' && (
          <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => setBindOpen(true)}>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>绑定角色</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
              {book.boundCharacterIds.length === 0 ? '未绑定（点击选择）' : `已绑 ${book.boundCharacterIds.length} 个角色`}
            </div>
          </button>
        )}
      </SectionCard>

      <SectionCard title={`条目（${book.entries.length}）`}>
        {book.entries.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '10px 0' }}>还没有条目，点击下方新增。</div>
        ) : (
          book.entries.map((e) => (
            <div key={e.id} className="row-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{e.name}</span>
                  <span className="fs-micro" style={{ padding: '1px 7px', borderRadius: 999, background: e.mount === 'disabled' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', color: 'var(--text-tertiary)' }}>{MOUNT_LABEL[e.mount]}</span>
                  <span className="fs-micro" style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'var(--text-disabled)' }}>P{e.priority} · {DEPTH_LABEL[e.depth]}</span>
                </div>
                {e.keywords.length > 0 && <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 3 }}>关键词：{e.keywords.join(' / ')}</div>}
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button className="pressable" onClick={() => setEntryTarget(e)} style={{ color: 'var(--text-tertiary)', padding: 5 }}><Pencil size={13} /></button>
                <button className="pressable" onClick={() => { useWorldbook.getState().duplicateEntry(book.id, e.id); push('条目已复制') }} style={{ color: 'var(--text-tertiary)', padding: 5 }}><Copy size={13} /></button>
                <button className="pressable" onClick={() => useWorldbook.getState().removeEntry(book.id, e.id)} style={{ color: 'var(--text-disabled)', padding: 5 }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))
        )}
        <button
          className="btn pressable"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => setEntryTarget('new')}
        >
          <Plus size={15} /> 新增条目
        </button>
      </SectionCard>

      {entryTarget && <EntryModal bookId={book.id} target={entryTarget} onClose={() => setEntryTarget(null)} />}
      {bindOpen && (
        <Modal open onClose={() => setBindOpen(false)} title="绑定角色（局部世界书）">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {characters.length === 0 && <div className="fs-body" style={{ color: 'var(--text-tertiary)' }}>还没有角色</div>}
            {characters.map((c) => {
              const bound = book.boundCharacterIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  className="pressable row-item"
                  style={{ textAlign: 'left', width: '100%' }}
                  onClick={() =>
                    updateBook(book.id, {
                      boundCharacterIds: bound ? book.boundCharacterIds.filter((x) => x !== c.id) : [...book.boundCharacterIds, c.id],
                    })
                  }
                >
                  <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                  {bound && <Check size={15} color="var(--accent)" />}
                </button>
              )
            })}
          </div>
        </Modal>
      )}
    </>
  )
}

function EntryModal({ bookId, target, onClose }: { bookId: string; target: WbEntry | 'new'; onClose: () => void }) {
  const isNew = target === 'new'
  const entry = isNew ? null : target
  const [name, setName] = useState(entry?.name ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [kwText, setKwText] = useState(entry?.keywords.join('、') ?? '')
  const [mount, setMount] = useState<WbMount>(entry?.mount ?? 'always')
  const [depth, setDepth] = useState<WbDepth>(entry?.depth ?? 'system')
  const [priority, setPriority] = useState(entry?.priority ?? 5)

  return (
    <Modal open onClose={onClose} title={isNew ? '新增条目' : '编辑条目'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="条目名称" maxLength={40} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 6000))}
          placeholder="内容（支持 Markdown 语法书写，命中后原文注入）"
          rows={7}
          style={{ resize: 'vertical' }}
        />
        <input value={kwText} onChange={(e) => setKwText(e.target.value)} placeholder="关键词触发（用、或,分隔）" />

        <ChipRow label="三态挂载" options={[['always', '始终'], ['keyword', '关键词触发'], ['disabled', '禁用']] as [WbMount, string][]} value={mount} onChange={setMount} />
        <ChipRow label="注入深度" options={[['system', 'system'], ['user', 'user'], ['context', '附加上下文']] as [WbDepth, string][]} value={depth} onChange={setDepth} />

        <div className="row-item">
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>优先级 {priority}</div>
          <input type="range" min={1} max={10} value={priority} onChange={(e) => setPriority(Number(e.target.value))} style={{ width: 150 }} />
        </div>

        <button
          className="btn btn-accent"
          onClick={() => {
            if (!name.trim()) return
            const data = {
              name: name.trim(),
              content: content.trim(),
              keywords: kwText.split(/[,，、\s]+/).map((k) => k.trim()).filter(Boolean).slice(0, 20),
              depth,
              priority,
              mount,
            }
            if (isNew) useWorldbook.getState().addEntry(bookId, data)
            else if (entry) useWorldbook.getState().updateEntry(bookId, entry.id, data)
            onClose()
          }}
        >
          保存条目
        </button>
      </div>
    </Modal>
  )
}

export function ChipRow<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(([k, l]) => (
          <button
            key={k}
            className="btn btn-sm pressable"
            style={{ flex: 1, background: value === k ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
            onClick={() => onChange(k)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
