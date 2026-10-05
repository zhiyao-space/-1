import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, Code2, Copy, CornerDownLeft, Send, Settings2, Trash2 } from 'lucide-react'
import { useUI, useToast } from '../../store/ui'
import { useXiaogui } from '../../store/xiaogui'
import { useApiPresets, getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { streamChat } from '../../lib/api'
import { buildXiaoguiMessages, splitSegments } from '../../lib/xiaoguiEngine'
import { insertCodeIntoProject } from '../../store/editor'
import GhostFace from './GhostFace'

const SUGGESTIONS = [
  '帮我做一个桌面倒计时组件',
  '做一个待办清单 App 页面',
  '给手机加一个星座运势小卡片',
  '写一个暗色玻璃拟态的登录页',
]

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const push = useToast((s) => s.push)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      push('复制失败', 'error')
    }
  }

  return (
    <div style={{ margin: '8px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <Code2 size={13} color="var(--text-tertiary)" />
        <span className="mono fs-micro" style={{ flex: 1, color: 'var(--text-tertiary)' }}>
          {lang || 'code'}
        </span>
        <button className="pressable" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span className="fs-micro">{copied ? '已复制' : '复制'}</span>
        </button>
        <button
          className="pressable"
          onClick={() => {
            const file = insertCodeIntoProject(lang ?? 'text', code)
            push(`已插入项目 → ${file}`)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}
        >
          <CornerDownLeft size={13} />
          <span className="fs-micro">插入项目</span>
        </button>
      </div>
      <pre
        className="mono"
        style={{
          margin: 0,
          padding: 12,
          maxHeight: 260,
          overflow: 'auto',
          fontSize: 'calc(11px * var(--fs-scale))',
          lineHeight: 1.6,
          color: 'var(--text-body)',
          background: 'rgba(0,0,0,0.35)',
          whiteSpace: 'pre',
        }}
      >
        {code}
      </pre>
    </div>
  )
}

function AssistantContent({ text, streaming }: { text: string; streaming: boolean }) {
  const segs = splitSegments(text)
  if (segs.length === 0) return <span className="xg-cursor" />
  return (
    <>
      {segs.map((s, i) =>
        s.type === 'code' ? (
          <CodeBlock key={i} lang={s.lang} code={s.content} />
        ) : (
          <span key={i} className="fs-body" style={{ display: 'block', whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'var(--text-body)' }}>
            {s.content}
          </span>
        )
      )}
      {streaming && <span className="xg-cursor" />}
    </>
  )
}

export default function XiaoguiPanel() {
  const setOpen = useUI((s) => s.setXiaoguiOpen)
  const push = useToast((s) => s.push)

  const messages = useXiaogui((s) => s.messages)
  const addMessage = useXiaogui((s) => s.addMessage)
  const updateMessage = useXiaogui((s) => s.updateMessage)
  const appendMessage = useXiaogui((s) => s.appendMessage)
  const clear = useXiaogui((s) => s.clear)
  const presetId = useXiaogui((s) => s.presetId)
  const setPresetId = useXiaogui((s) => s.setPresetId)
  const setGuideSeen = useXiaogui((s) => s.setGuideSeen)
  const mood = useXiaogui((s) => s.mood)
  const setMood = useXiaogui((s) => s.setMood)
  const streaming = useXiaogui((s) => s.streaming)
  const setStreaming = useXiaogui((s) => s.setStreaming)

  const presets = useApiPresets((s) => s.presets.filter((p) => p.category === 'chat'))

  const [input, setInput] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setGuideSeen(true)
  }, [setGuideSeen])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || useXiaogui.getState().streaming) return
    setInput('')

    const history = useXiaogui.getState().messages
    addMessage('user', text)
    const aid = addMessage('assistant', '')

    const preset = getPresetById(presetId) ?? getDefaultChatPreset()
    if (!preset) {
      updateMessage(aid, {
        text: '我还没有可用的对话模型。请先到「设置 → API 配置」添加一个 chat 类型的模型（Base URL + API Key + 模型名），再回来找我～',
      })
      setMood('error')
      return
    }

    setMood('thinking')
    setStreaming(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    let first = true
    try {
      await streamChat(preset, buildXiaoguiMessages(history, text), {
        signal: ctrl.signal,
        onDelta: (delta) => {
          if (first) {
            first = false
            setMood('coding')
          }
          appendMessage(aid, delta)
        },
      })
      setMood('done')
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError') {
        setMood('idle')
      } else {
        updateMessage(aid, { text: `出错了：${e.message}` })
        setMood('error')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      window.setTimeout(() => {
        if (useXiaogui.getState().mood !== 'idle') useXiaogui.getState().setMood('idle')
      }, 1800)
    }
  }

  const effective = getPresetById(presetId) ?? getDefaultChatPreset()

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 600,
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 顶部 */}
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={() => setOpen(false)} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <GhostFace size={26} mood={mood} talking={streaming} />
          <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>小鬼</span>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>AI 编程助手</span>
        </span>
        <button className="pressable" onClick={() => setShowConfig((v) => !v)} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <Settings2 size={18} />
        </button>
        <button
          className="pressable"
          onClick={() => {
            if (messages.length === 0) return
            clear()
            push('已清空对话', 'info')
          }}
          style={{ color: 'var(--text-secondary)', padding: 4 }}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* 模型配置 */}
      {showConfig && (
        <div className="glass" style={{ margin: '0 12px 8px', borderRadius: 14, padding: 12, flexShrink: 0 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>对话模型</div>
          {presets.length === 0 ? (
            <div className="fs-aux" style={{ color: 'var(--text-secondary)' }}>
              还没有可用的对话模型，请到「设置 → API 配置」添加。
            </div>
          ) : (
            <select value={presetId ?? ''} onChange={(e) => setPresetId(e.target.value || null)}>
              <option value="">跟随默认模型</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.model}
                </option>
              ))}
            </select>
          )}
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 6 }}>
            当前：{effective ? `${effective.name} · ${effective.model}` : '未配置'}
          </div>
        </div>
      )}

      {/* 消息区 */}
      <div ref={listRef} className="no-select" style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 16px' }}>
        {messages.length === 0 ? (
          <div style={{ paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <GhostFace size={72} mood="idle" />
            </div>
            <div className="fs-body" style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 4 }}>
              你好，我是小鬼。
            </div>
            <div className="fs-aux" style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginBottom: 18, lineHeight: 1.7 }}>
              用一句话告诉我想做什么，
              <br />
              我来帮你写组件、功能或整个应用页面。
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn btn-sm pressable" onClick={() => void send(s)} style={{ justifyContent: 'flex-start' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user'
            const isLast = m.id === messages[messages.length - 1].id
            const activeStream = streaming && isLast && !isUser
            return (
              <div
                key={m.id}
                style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8, marginBottom: 12 }}
              >
                {!isUser && (
                  <span style={{ flexShrink: 0, marginTop: 2 }}>
                    <GhostFace size={28} mood={activeStream ? mood : 'idle'} talking={activeStream} />
                  </span>
                )}
                <div
                  className={isUser ? 'glass' : ''}
                  style={{
                    maxWidth: '82%',
                    borderRadius: 14,
                    padding: '9px 12px',
                    background: isUser ? undefined : 'linear-gradient(160deg, #1a1a1a 0%, #0d0d10 100%)',
                    border: isUser ? undefined : '1px solid #2a2a2a',
                  }}
                >
                  {isUser ? (
                    <span className="fs-body" style={{ display: 'block', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                      {m.text}
                    </span>
                  ) : (
                    <AssistantContent text={m.text} streaming={activeStream} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 输入区 */}
      <div style={{ padding: '8px 12px calc(12px + env(safe-area-inset-bottom))', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(input)
            }
          }}
          placeholder="描述你的需求，例如：做一个倒计时组件…"
          rows={1}
          style={{ flex: 1, resize: 'none', maxHeight: 120, lineHeight: 1.5 }}
        />
        <button
          className="pressable"
          onClick={() => void send(input)}
          disabled={streaming || !input.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: input.trim() && !streaming ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Send size={18} color={input.trim() && !streaming ? '#000' : 'var(--text-tertiary)'} />
        </button>
      </div>
    </div>
  )
}