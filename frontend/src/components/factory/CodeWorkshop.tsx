import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  ChevronLeft,
  Code2,
  Download,
  FileCode2,
  FlaskConical,
  History,
  Import,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Terminal,
  Undo2,
  Wand2,
  X,
} from 'lucide-react'
import { buildExportDoc, useFactory, type CustomApp } from '../../store/factory'
import { useToast } from '../../store/ui'
import { modifyCode } from '../../lib/factoryEngine'
import { highlight, formatCode } from './highlight'
import { AppGlyph, Divider, EmptyBlock, Field } from './parts'
import Preview from './Preview'

type Lang = 'html' | 'css' | 'js'
type TopTab = Lang | 'preview'

interface Draft {
  name: string
  html: string
  css: string
  js: string
}

const BLANK: Draft = {
  name: '未命名应用',
  html: '<div class="wrap">\n  <h1>你好</h1>\n  <button id="btn">点我</button>\n</div>',
  css: 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#000,#1a1a1a,#0a0a0a);color:#fff;font-family:system-ui,sans-serif}\n.wrap{padding:24px;border-radius:20px;background:#2a2a2a;box-shadow:10px 10px 20px #000,-8px -8px 16px #4a4a4a}\nbutton{min-height:44px;padding:0 18px;border:0;border-radius:16px;background:#2a2a2a;color:#fff;box-shadow:6px 6px 12px #000,-5px -5px 10px #333}\nbutton:active{transform:translateY(4px)}',
  js: "var b=document.getElementById('btn');\nif(b) b.addEventListener('click', function(){ alert('你好，世界'); });",
}

export default function CodeWorkshop({
  appId,
  insertReq,
  onConsumeInsert,
  onPickApp,
}: {
  appId: string | null
  insertReq: { type: Lang; code: string; at: number } | null
  onConsumeInsert: () => void
  onPickApp: (id: string) => void
}) {
  const apps = useFactory((s) => s.apps)
  const updateApp = useFactory((s) => s.updateApp)
  const snapshot = useFactory((s) => s.snapshot)
  const addExperiment = useFactory((s) => s.addExperiment)
  const addSnippet = useFactory((s) => s.addSnippet)
  const versionMap = useFactory((s) => s.versions)
  const versions = useMemo(() => (appId ? versionMap[appId] ?? [] : []), [versionMap, appId])
  const restoreVersion = useFactory((s) => s.restoreVersion)
  const removeVersion = useFactory((s) => s.removeVersion)
  const push = useToast((s) => s.push)

  const app = useMemo(() => apps.find((a) => a.id === appId) ?? null, [apps, appId])
  const [draft, setDraft] = useState<Draft>(BLANK)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState<TopTab>('html')
  const [device, setDevice] = useState<'phone' | 'tablet'>('phone')
  const [layout, setLayout] = useState<'stack' | 'split'>('stack')
  const [showConsole, setShowConsole] = useState(false)
  const [previewErrors, setPreviewErrors] = useState(0)
  const [previewDraft, setPreviewDraft] = useState<Draft>(BLANK)
  const [savedFlash, setSavedFlash] = useState(false)

  // 版本 / 导入 / 导出 / AI / 查找 弹窗
  const [showVersions, setShowVersions] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteTarget, setPasteTarget] = useState<Lang>('html')
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterInnerRef = useRef<HTMLDivElement>(null)
  const histRef = useRef<{ stack: Draft[]; index: number }>({ stack: [], index: -1 })
  const groupTimer = useRef<number | null>(null)

  // 载入应用
  useEffect(() => {
    if (!app) {
      setDraft(BLANK)
      setPreviewDraft(BLANK)
      setDirty(false)
      return
    }
    const d: Draft = { name: app.name, html: app.html, css: app.css, js: app.js }
    setDraft(d)
    setPreviewDraft(d)
    setDirty(false)
    histRef.current = { stack: [d], index: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, app?.updatedAt])

  // 预览防抖 500ms
  useEffect(() => {
    const t = setTimeout(() => setPreviewDraft(draft), 500)
    return () => clearTimeout(t)
  }, [draft])

  const currentCode = tab === 'preview' ? draft.html : draft[tab]

  const updateCode = (value: string, pushHistory = true) => {
    if (tab === 'preview') return
    const next = { ...draft, [tab]: value } as Draft
    setDraft(next)
    setDirty(true)
    if (pushHistory) {
      if (groupTimer.current) window.clearTimeout(groupTimer.current)
      groupTimer.current = window.setTimeout(() => {
        const h = histRef.current
        const trimmed = h.stack.slice(0, h.index + 1)
        trimmed.push(next)
        histRef.current = { stack: trimmed.slice(-60), index: Math.min(trimmed.length - 1, 59) }
      }, 400)
    }
  }

  // 编辑器增强：Tab 缩进、回车自动缩进、括号/引号自动补全
  const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' }
  const CLOSERS = new Set([')', ']', '}', '"', "'", '`'])

  const setCaret = (pos: number, end = pos) => {
    window.requestAnimationFrame(() => {
      const ta = taRef.current
      if (!ta) return
      ta.focus()
      ta.selectionStart = pos
      ta.selectionEnd = end
    })
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (tab === 'preview') return
    const ta = e.currentTarget
    const value = ta.value
    const start = ta.selectionStart
    const end = ta.selectionEnd

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        const lead = value.slice(lineStart, start)
        const spaces = Math.min(2, (lead.match(/^ +/) ?? [''])[0].length)
        if (spaces > 0) {
          updateCode(value.slice(0, lineStart) + value.slice(lineStart + spaces))
          setCaret(start - spaces, end - spaces)
        }
        return
      }
      const insert = '  '
      updateCode(value.slice(0, start) + insert + value.slice(end))
      setCaret(start + insert.length, end + insert.length)
      return
    }

    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const line = value.slice(lineStart, start)
      const indent = (line.match(/^[ \t]*/) ?? [''])[0]
      const deeper = /[{([]$/.test(line.trimEnd()) || /:$/.test(line.trimEnd())
      const nextChar = value[start]
      if (deeper && nextChar && CLOSERS.has(nextChar)) {
        // 光标在闭合符前：展开成三行并居中
        e.preventDefault()
        const inner = indent + '  '
        const insert = `\n${inner}\n${indent}`
        updateCode(value.slice(0, start) + insert + value.slice(end))
        setCaret(start + 1 + inner.length)
        return
      }
      if (indent || deeper) {
        e.preventDefault()
        const insert = `\n${indent}${deeper ? '  ' : ''}`
        updateCode(value.slice(0, start) + insert + value.slice(end))
        setCaret(start + insert.length)
      }
      return
    }

    if (PAIRS[e.key]) {
      e.preventDefault()
      const close = PAIRS[e.key]
      if (start !== end) {
        // 选中内容用括号包起来
        updateCode(value.slice(0, start) + e.key + value.slice(start, end) + close + value.slice(end))
        setCaret(start + 1, end + 1)
      } else {
        updateCode(value.slice(0, start) + e.key + close + value.slice(end))
        setCaret(start + 1)
      }
      return
    }

    if (CLOSERS.has(e.key) && start === end && value[start] === e.key) {
      // 输入已有的闭合符时直接跳过
      e.preventDefault()
      setCaret(start + 1)
    }
  }

  const undo = () => {
    const h = histRef.current
    if (h.index <= 0) {
      push('没有可撤销的操作', 'info')
      return
    }
    h.index -= 1
    setDraft(h.stack[h.index])
    setDirty(true)
  }
  const redo = () => {
    const h = histRef.current
    if (h.index >= h.stack.length - 1) {
      push('没有可重做的操作', 'info')
      return
    }
    h.index += 1
    setDraft(h.stack[h.index])
    setDirty(true)
  }

  const syncScroll = () => {
    const ta = taRef.current
    if (!ta) return
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop
      preRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterInnerRef.current) gutterInnerRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
  }

  // 把片段精确写入指定语言文件：仅当目标文件正是当前编辑的 Tab 时才按光标插入，否则追加到文件末尾
  const insertIntoLang = (lang: Lang, raw: string) => {
    const base = draft[lang]
    const ta = taRef.current
    let next: string
    let caret: number
    if (tab === lang && ta) {
      const start = ta.selectionStart ?? base.length
      const end = ta.selectionEnd ?? start
      next = base.slice(0, start) + `\n${raw}\n` + base.slice(end)
      caret = start + raw.length + 2
    } else {
      next = base ? `${base}\n${raw}\n` : `${raw}\n`
      caret = next.length
    }
    const d2: Draft = { ...draft, [lang]: next }
    setDraft(d2)
    setDirty(true)
    setTab(lang)
    // 外部插入直接入历史栈，保证可撤销
    const h = histRef.current
    const trimmed = h.stack.slice(0, h.index + 1)
    trimmed.push(d2)
    histRef.current = { stack: trimmed.slice(-60), index: Math.min(trimmed.length - 1, 59) }
    window.setTimeout(() => {
      const t = taRef.current
      if (!t) return
      t.focus()
      t.selectionStart = t.selectionEnd = caret
    }, 0)
  }

  // 外部片段插入请求
  useEffect(() => {
    if (!insertReq) return
    insertIntoLang(insertReq.type, insertReq.code)
    onConsumeInsert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertReq?.at])

  const doSave = () => {
    if (!app) return
    updateApp(app.id, { name: draft.name.trim() || app.name, html: draft.html, css: draft.css, js: draft.js })
    snapshot(app.id, undefined, '保存时自动快照')
    setDirty(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 720)
    push('已保存，并生成快照')
  }

  const currentApp: CustomApp | null = app
  const lineCount = currentCode.split('\n').length
  const tooLong = currentCode.length > 24000

  if (!app) {
    return (
      <div className="fx-scroll">
        <EmptyBlock
          icon={<Code2 size={30} />}
          text="选择一个应用开始编辑"
          hint="也可以新建一个空白应用"
          action={
            <button
              className="fx-btn fx-btn--accent fx-press"
              onClick={() => {
                const created = useFactory.getState().addApp({ ...BLANK, source: 'custom' })
                push('已创建空白应用')
                onPickApp(created.id)
              }}
            >
              <Plus size={14} /> 新建空白应用
            </button>
          }
        />
        {apps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {apps.map((a) => (
              <button key={a.id} className="fx-block fx-mid fx-press-soft" onClick={() => onPickApp(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: 0, cursor: 'pointer', textAlign: 'left', minHeight: 56 }}>
                <AppGlyph icon={a.icon} size={38} level="mid" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fs-body" style={{ display: 'block', color: 'var(--fx-t1,#fff)' }}>
                    {a.name}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
                    {a.category} · {new Date(a.updatedAt).toLocaleDateString('zh-CN')}
                  </span>
                </span>
                <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', color: 'var(--fx-t3,#999)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 应用头 */}
      <div style={{ flexShrink: 0, padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <button className="fx-press-soft" onClick={() => setShowPicker(true)} style={{ background: 'none', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0, minWidth: 0, flex: 1 }}>
          <AppGlyph icon={app.icon} size={34} level="mid" />
          <span style={{ minWidth: 0, textAlign: 'left' }}>
            <span className="fs-body" style={{ display: 'block', color: 'var(--fx-t1,#fff)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {draft.name}
              {dirty && <span style={{ color: '#e8d18a' }}> ·</span>}
            </span>
            <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
              {app.category} · 点此切换应用
            </span>
          </span>
        </button>
        <button className={`fx-press-soft ${device === 'phone' ? 'fx-sunken' : ''}`} onClick={() => setDevice(device === 'phone' ? 'tablet' : 'phone')} style={{ border: 0, background: device === 'phone' ? undefined : 'none', borderRadius: 12, padding: 7, cursor: 'pointer', color: 'var(--fx-t3,#999)' }}>
          {device === 'phone' ? <Smartphone size={16} /> : <Monitor size={16} />}
        </button>
        <button className={`fx-press-soft ${layout === 'split' ? 'fx-sunken' : ''}`} onClick={() => setLayout(layout === 'split' ? 'stack' : 'split')} style={{ border: 0, background: layout === 'split' ? undefined : 'none', borderRadius: 12, padding: 7, cursor: 'pointer', color: 'var(--fx-t3,#999)' }} title="分栏/上下">
          <FileCode2 size={16} />
        </button>
        <button className={`fx-press-soft ${showConsole ? 'fx-sunken' : ''}`} onClick={() => setShowConsole((v) => !v)} style={{ position: 'relative', border: 0, background: showConsole ? undefined : 'none', borderRadius: 12, padding: 7, cursor: 'pointer', color: previewErrors > 0 ? '#ff8a8a' : 'var(--fx-t3,#999)' }} title={previewErrors > 0 ? `${previewErrors} 个运行错误` : '控制台'}>
          <Terminal size={16} />
          {previewErrors > 0 && (
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 999, background: '#ff3b30', boxShadow: '0 0 0 2px #0a0a0a' }} />
          )}
        </button>
      </div>

      {/* 顶部 Tab */}
      <div className="fx-tabs" style={{ paddingTop: 0 }}>
        {(['html', 'css', 'js'] as Lang[]).map((l) => (
          <button key={l} className={`fx-tab fx-press-soft ${tab === l ? 'fx-tab--active' : ''}`} onClick={() => setTab(l)}>
            {l.toUpperCase()}
          </button>
        ))}
        <button className={`fx-tab fx-press-soft ${tab === 'preview' ? 'fx-tab--active' : ''}`} onClick={() => setTab('preview')}>
          预览
        </button>
        <button className="fx-tab fx-press-soft" onClick={undo}>
          <Undo2 size={14} />
        </button>
        <button className="fx-tab fx-press-soft" onClick={redo}>
          <Redo2 size={14} />
        </button>
        <button className="fx-tab fx-press-soft" onClick={() => setShowFind(true)}>
          <Search size={14} />
        </button>
        <button
          className="fx-tab fx-press-soft"
          onClick={() => {
            if (tab === 'preview') return
            updateCode(formatCode(currentCode, tab))
            push('已格式化')
          }}
        >
          <Wand2 size={14} />
        </button>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: layout === 'split' ? 'row' : 'column', gap: 10, padding: '0 12px' }}>
        {tab !== 'preview' && (
          <div className="fx-editor" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="fx-editor__gutter">
              <div ref={gutterInnerRef}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
            </div>
            <pre ref={preRef} className="fx-editor__pre" aria-hidden>
              <code dangerouslySetInnerHTML={{ __html: (tooLong ? currentCode.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c)) : highlight(currentCode, tab)) + '\n' }} />
            </pre>
            <textarea
              ref={taRef}
              className="fx-editor__ta"
              value={currentCode}
              spellCheck={false}
              onChange={(e) => updateCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              style={{ flex: 1, minHeight: 0 }}
            />
          </div>
        )}

        <div style={{ flex: tab === 'preview' ? 1 : layout === 'split' ? 0.72 : 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Preview appId={app.id} app={{ name: draft.name, html: previewDraft.html, css: previewDraft.css, js: previewDraft.js }} device={device} showConsole={showConsole} onErrorCount={setPreviewErrors} />
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="fx-bottom-bar">
        <button className={`fx-btn fx-press ${savedFlash ? 'fx-saved' : 'fx-btn--accent'}`} style={{ flex: 1 }} onClick={doSave}>
          <Save size={14} /> 保存
        </button>
        <button
          className="fx-btn fx-press"
          onClick={() => {
            addExperiment({ name: `${draft.name} 实验`, html: draft.html, css: draft.css, js: draft.js })
            push('已存入沙盒')
          }}
        >
          <FlaskConical size={14} />
        </button>
        <button className="fx-btn fx-press" onClick={() => setShowVersions(true)}>
          <History size={14} />
          {versions.length > 1 ? <span className="fs-micro">{versions.length}</span> : null}
        </button>
        <button className="fx-btn fx-press" onClick={() => setShowImport(true)}>
          <Import size={14} />
        </button>
        <button className="fx-btn fx-press" onClick={() => setShowExport(true)}>
          <Download size={14} />
        </button>
        <button className="fx-btn fx-press" onClick={() => setShowAi(true)}>
          <Sparkles size={14} />
        </button>
      </div>

      {/* 版本时间线 */}
      {showVersions && (
        <div onClick={() => setShowVersions(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '82%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                版本快照
              </span>
              <button className="fx-press-soft" onClick={() => setShowVersions(false)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <button
              className="fx-btn fx-press"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => {
                updateApp(app.id, { html: draft.html, css: draft.css, js: draft.js })
                snapshot(app.id, `手动 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`, '手动命名快照')
                push('已手动打快照')
              }}
            >
              <Plus size={13} /> 用当前代码打一个快照
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...versions].reverse().map((v, i) => (
                <div key={v.snapshotId} className="fx-sunken" style={{ padding: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                      {v.name}
                      {i === 0 && <span className="fx-chip" style={{ marginLeft: 6 }}>最新</span>}
                    </span>
                    <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
                      {new Date(v.createdAt).toLocaleString('zh-CN', { hour12: false })}
                    </span>
                  </div>
                  <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', marginTop: 4 }}>
                    {v.message}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      style={{ flex: 1, minHeight: 36 }}
                      onClick={() => {
                        restoreVersion(app.id, v.snapshotId)
                        const src = useFactory.getState().apps.find((a) => a.id === app.id)
                        if (src) {
                          const d = { name: src.name, html: src.html, css: src.css, js: src.js }
                          setDraft(d)
                          setPreviewDraft(d)
                          setDirty(false)
                        }
                        setShowVersions(false)
                        push('已恢复到该版本')
                      }}
                    >
                      <RotateCcw size={12} /> 恢复
                    </button>
                    <button
                      className="fx-btn fx-btn--soft fx-press-soft"
                      onClick={() => {
                        removeVersion(app.id, v.snapshotId)
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 导入 */}
      {showImport && (
        <div onClick={() => setShowImport(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '84%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                导入代码
              </span>
              <button className="fx-press-soft" onClick={() => setShowImport(false)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <Field label="从 .html 文件导入（自动按 HTML/CSS/JS 拆分）">
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="fx-btn fx-press"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.html,.htm,text/html'
                    input.onchange = async () => {
                      const f = input.files?.[0]
                      if (!f) return
                      const text = await f.text()
                      const css = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(text)?.[1]?.trim() ?? ''
                      const js = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(text)?.[1]?.trim() ?? ''
                      const html = text
                        .replace(/<style[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[\s\S]*?<\/script>/gi, '')
                        .replace(/<!doctype[^>]*>/gi, '')
                        .replace(/<\/?html[^>]*>/gi, '')
                        .replace(/<head[\s\S]*?<\/head>/gi, '')
                        .replace(/<\/?body[^>]*>/gi, '')
                        .trim()
                      setDraft((d) => ({ ...d, name: f.name.replace(/\.html?$/i, ''), html, css: css || d.css, js: js || d.js }))
                      setDirty(true)
                      setShowImport(false)
                      push('已导入文件')
                    }
                    input.click()
                  }}
                >
                  <Import size={13} /> 选择文件
                </button>
              </div>
            </Field>

            <Divider />
            <Field label="粘贴代码到指定文件">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['html', 'css', 'js'] as Lang[]).map((l) => (
                  <button key={l} className={`fx-tab fx-press-soft ${pasteTarget === l ? 'fx-tab--active' : ''}`} onClick={() => setPasteTarget(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea className="fx-textarea fx-code" rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="粘贴代码…" />
            </Field>
            <Divider />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setShowImport(false)}>
                取消
              </button>
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ flex: 1 }}
                onClick={() => {
                  if (!pasteText.trim()) {
                    push('先粘贴点代码', 'error')
                    return
                  }
                  const key = pasteTarget
                  setDraft((d) => ({ ...d, [key]: d[key] ? `${d[key]}\n${pasteText}` : pasteText }))
                  setTab(key)
                  setDirty(true)
                  setPasteText('')
                  setShowImport(false)
                  push(`已导入到 ${key.toUpperCase()}`)
                }}
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出 */}
      {showExport && (
        <div onClick={() => setShowExport(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '84%', maxWidth: 320, padding: 18 }}>
            <div className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', marginBottom: 14 }}>
              导出应用
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  const target: CustomApp = { ...(app as CustomApp), name: draft.name, html: draft.html, css: draft.css, js: draft.js }
                  const blob = new Blob([buildExportDoc(target)], { type: 'text/html;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${draft.name}.html`
                  a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 1000)
                  push('已下载 HTML 文件')
                  setShowExport(false)
                }}
              >
                <Download size={14} /> 下载 .html 文件
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`<!-- ${draft.name} -->\n${draft.html}\n\n/* CSS */\n${draft.css}\n\n// JS\n${draft.js}`)
                    .then(() => push('已复制全部代码'))
                    .catch(() => push('复制失败', 'error'))
                  setShowExport(false)
                }}
              >
                <FileCode2 size={14} /> 复制全部代码
              </button>
              <button
                className="fx-btn fx-press"
                onClick={() => {
                  addSnippet({ name: `${draft.name} · JS`, type: 'js', code: draft.js, tags: ['我的', '组件'], description: `来自 ${draft.name}` })
                  push('已把 JS 存为片段')
                  setShowExport(false)
                }}
              >
                <Plus size={14} /> 当前 JS 存为片段
              </button>
              <button className="fx-btn fx-btn--soft fx-press-soft" onClick={() => setShowExport(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 辅助修改 */}
      {showAi && (
        <div onClick={() => setShowAi(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '84%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                AI 辅助修改 · {tab === 'preview' ? 'HTML' : tab.toUpperCase()}
              </span>
              <button className="fx-press-soft" onClick={() => setShowAi(false)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fs-micro" style={{ color: 'var(--fx-t3,#999)', marginBottom: 10, lineHeight: 1.6 }}>
              {taRef.current && taRef.current.selectionEnd !== taRef.current.selectionStart
                ? '将只修改你选中的那段代码'
                : '未选中内容，将把整个文件交给 AI 修改'}
            </div>
            <Field label="修改指令">
              <textarea className="fx-textarea" rows={3} value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="例如：把主按钮改成纯白底黑字，并加点击下压效果" />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {['配色改成纯黑纯白', '加上数据持久化', '加一个空状态提示', '加上加载动画'].map((s) => (
                <button key={s} className="fx-block fx-back fx-press-soft" onClick={() => setAiInstruction(s)} style={{ border: 0, borderRadius: 999, padding: '6px 11px', color: 'var(--fx-t3,#999)', fontSize: 'calc(11px * var(--fs-scale))', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
            <Divider />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="fx-btn fx-press" style={{ flex: 1 }} onClick={() => setShowAi(false)}>
                取消
              </button>
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ flex: 1 }}
                disabled={aiBusy}
                onClick={async () => {
                  if (!aiInstruction.trim()) {
                    push('先写下要改什么', 'error')
                    return
                  }
                  const lang = (tab === 'preview' ? 'html' : tab) as Lang
                  const ta = taRef.current
                  const hasSel = !!ta && ta.selectionEnd > ta.selectionStart
                  const snippet = hasSel ? currentCode.slice(ta!.selectionStart, ta!.selectionEnd) : currentCode
                  setAiBusy(true)
                  try {
                    const result = await modifyCode({ lang, code: snippet, instruction: aiInstruction.trim() })
                    if (hasSel && ta) {
                      updateCode(currentCode.slice(0, ta.selectionStart) + result + currentCode.slice(ta.selectionEnd))
                    } else {
                      updateCode(result)
                    }
                    push('AI 已修改代码')
                    setShowAi(false)
                    setAiInstruction('')
                  } catch (err) {
                    const msg = (err as Error).message
                    push(msg === 'NO_PRESET' ? '还没配置对话模型，去设置里加一个' : `修改失败：${msg.slice(0, 40)}`, 'error')
                  } finally {
                    setAiBusy(false)
                  }
                }}
              >
                {aiBusy ? <Loader2 size={14} className="fx-spin" /> : <Sparkles size={14} />} 修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查找替换 */}
      {showFind && (
        <div onClick={() => setShowFind(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '86%', maxWidth: 330, padding: 18 }}>
            <div className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', marginBottom: 12 }}>
              查找替换 · {tab.toUpperCase()}
            </div>
            <input className="fx-input" value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="查找" style={{ marginBottom: 8 }} />
            <input className="fx-input" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="替换为" style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="fx-btn fx-press"
                style={{ flex: 1 }}
                onClick={() => {
                  if (!findText) return
                  const idx = currentCode.indexOf(findText)
                  if (idx < 0) {
                    push('没有找到', 'info')
                    return
                  }
                  setTab(tab === 'preview' ? 'html' : tab)
                  window.setTimeout(() => {
                    const ta = taRef.current
                    if (ta) {
                      ta.focus()
                      ta.selectionStart = idx
                      ta.selectionEnd = idx + findText.length
                    }
                  }, 50)
                  setShowFind(false)
                }}
              >
                查找下一个
              </button>
              <button
                className="fx-btn fx-btn--accent fx-press"
                style={{ flex: 1 }}
                onClick={() => {
                  if (!findText) return
                  const count = currentCode.split(findText).length - 1
                  if (count === 0) {
                    push('没有找到', 'info')
                    return
                  }
                  updateCode(currentCode.split(findText).join(replaceText))
                  push(`已替换 ${count} 处`)
                  setShowFind(false)
                }}
              >
                全部替换
              </button>
            </div>
            <button className="fx-btn fx-btn--soft fx-press-soft" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowFind(false)}>
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 切换应用 */}
      {showPicker && (
        <div onClick={() => setShowPicker(false)} style={{ position: 'absolute', inset: 0, zIndex: 865, background: 'rgba(0,0,0,0.66)', display: 'flex', alignItems: 'flex-end' }}>
          <div className="fx-block fx-front fx-in" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '80%', overflowY: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span className="fs-h3" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                切换应用
              </span>
              <button className="fx-press-soft" onClick={() => setShowPicker(false)} style={{ background: 'none', border: 0, color: 'var(--fx-t3,#999)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apps.map((a) => (
                <button
                  key={a.id}
                  className={`fx-press ${a.id === appId ? 'fx-sunken' : 'fx-block fx-back'}`}
                  onClick={() => {
                    setShowPicker(false)
                    onPickApp(a.id)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 11, border: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 15, minHeight: 52 }}
                >
                  <AppGlyph icon={a.icon} size={34} level="mid" />
                  <span className="fs-body" style={{ color: 'var(--fx-t1,#fff)', flex: 1 }}>
                    {a.name}
                  </span>
                  {a.id === appId && <span className="fx-chip">当前</span>}
                </button>
              ))}
            </div>
            <Divider />
            <button
              className="fx-btn fx-press"
              style={{ width: '100%' }}
              onClick={() => {
                const created = useFactory.getState().addApp({ ...BLANK, source: 'custom' })
                setShowPicker(false)
                onPickApp(created.id)
                push('已创建空白应用')
              }}
            >
              <Plus size={14} /> 新建空白应用
            </button>
          </div>
        </div>
      )}
    </div>
  )
}