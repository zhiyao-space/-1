import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Eye, FileCode2, History, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useToast } from '../../store/ui'
import { useEditor, type EditorFile } from '../../store/editor'

/** 把 index.html / style.css / app.js 合成一份可直接预览的 HTML */
function buildPreview(files: EditorFile[]): string {
  const get = (n: string) => files.find((f) => f.name === n)?.content ?? ''
  const css = get('style.css')
  const js = get('app.js')
  let html = get('index.html')
  if (!html) {
    const first = files.find((f) => f.name.endsWith('.html'))
    html = first?.content ?? ''
  }
  if (!html) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><script>${js}</script></body></html>`
  }
  if (/<link[^>]*style\.css[^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]*style\.css[^>]*>/i, `<style>\n${css}\n</style>`)
  } else if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`)
  }
  if (/<script[^>]*app\.js[^>]*><\/script>/i.test(html)) {
    html = html.replace(/<script[^>]*app\.js[^>]*><\/script>/i, `<script>\n${js}\n</script>`)
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `<script>\n${js}\n</script>\n</body>`)
  }
  return html
}

export default function CodeEditorPage({ onBack }: { onBack: () => void }) {
  const files = useEditor((s) => s.files)
  const activeName = useEditor((s) => s.activeName)
  const backups = useEditor((s) => s.backups)
  const setActive = useEditor((s) => s.setActive)
  const saveFile = useEditor((s) => s.saveFile)
  const addFile = useEditor((s) => s.addFile)
  const removeFile = useEditor((s) => s.removeFile)
  const resetFile = useEditor((s) => s.resetFile)
  const restoreLastBackup = useEditor((s) => s.restoreLastBackup)
  const push = useToast((s) => s.push)

  const active = files.find((f) => f.name === activeName) ?? files[0]
  const [draft, setDraft] = useState(active?.content ?? '')
  const [dirty, setDirty] = useState(false)
  const [newName, setNewName] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const loadedRef = useRef(activeName)

  // 切换文件时载入草稿
  useEffect(() => {
    if (loadedRef.current !== activeName) {
      loadedRef.current = activeName
      setDraft(active?.content ?? '')
      setDirty(false)
    }
  }, [activeName, active?.content])

  // 外部修改（如小鬼「插入项目」）且本地未编辑时，同步到编辑器
  useEffect(() => {
    if (!dirty && active && draft !== active.content && loadedRef.current === active.name) {
      setDraft(active.content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.content])

  const doSave = () => {
    if (!active) return
    saveFile(active.name, draft)
    setDirty(false)
    push(`已保存 ${active.name}`)
  }

  return (
    <>
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>
          代码编辑器
        </span>
        <button
          className="btn btn-sm pressable"
          onClick={() => {
            if (backups.length === 0) {
              push('没有可恢复的备份', 'info')
              return
            }
            restoreLastBackup()
            setDirty(false)
            push('已恢复上一次备份')
          }}
        >
          <History size={13} /> 恢复{backups.length > 0 ? `(${backups.length})` : ''}
        </button>
        <button className="btn btn-sm pressable" onClick={() => setPreviewHtml(buildPreview(files))}>
          <Eye size={13} /> 预览
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 16px 12px' }}>
        {/* 文件树 */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, flexShrink: 0 }}>
          {files.map((f) => {
            const on = f.name === active?.name
            return (
              <button
                key={f.name}
                className="pressable mono"
                onClick={() => setActive(f.name)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: 'calc(11px * var(--fs-scale))',
                  background: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                <FileCode2 size={12} />
                {f.name}
              </button>
            )
          })}
        </div>

        {/* 编辑区 */}
        <textarea
          className="mono"
          value={draft}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value)
            setDirty(true)
          }}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 12,
            padding: 14,
            fontSize: 'calc(12px * var(--fs-scale))',
            lineHeight: 1.6,
            whiteSpace: 'pre',
            overflow: 'auto',
            background: 'rgba(0,0,0,0.4)',
          }}
        />

        {/* 操作栏 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexShrink: 0 }}>
          <button className="btn btn-sm btn-accent pressable" style={{ flex: 1 }} onClick={doSave}>
            <Save size={13} /> 保存
          </button>
          <button
            className="btn btn-sm pressable"
            onClick={() => {
              if (!active) return
              resetFile(active.name)
              push(`已重置 ${active.name}`)
            }}
          >
            <RotateCcw size={13} /> 重置
          </button>
          <button
            className="btn btn-sm pressable"
            disabled={files.length <= 1}
            onClick={() => {
              if (!active) return
              removeFile(active.name)
              push(`已删除 ${active.name}`, 'info')
            }}
          >
            <Trash2 size={13} /> 删除
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexShrink: 0 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新文件名，如 extra.js"
            style={{ flex: 1, padding: '8px 12px' }}
          />
          <button
            className="btn btn-sm pressable"
            onClick={() => {
              const n = newName.trim()
              if (!n) return
              if (!addFile(n)) {
                push('文件名已存在', 'error')
                return
              }
              setNewName('')
              push(`已新建 ${n}`)
            }}
          >
            <Plus size={13} /> 新建
          </button>
        </div>

        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 8, textAlign: 'center' }}>
          每次保存 / 删除 / 重置前会自动备份，改坏了可一键恢复
        </div>
      </div>

      {/* 预览 */}
      {previewHtml !== null && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 700, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
          <div className="no-select" style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', flexShrink: 0 }}>
            <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>预览 · index.html</span>
            <button className="pressable" onClick={() => setPreviewHtml(null)} style={{ color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 0 12px' }}>
            <iframe
              title="预览"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-modals allow-forms"
              style={{ width: '100%', height: '100%', border: 'none', background: '#0a0a0a' }}
            />
          </div>
        </div>
      )}
    </>
  )
}