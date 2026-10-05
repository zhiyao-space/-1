import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import { buildPreviewDoc, useFactory } from '../../store/factory'

export interface LogItem {
  id: number
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
}

/** 注入到沙箱 iframe 里：劫持 console 与全局报错，postMessage 回父窗口 */
const CAPTURE_SCRIPT = `<script>(function(){
  function fmt(a){ try{ return typeof a==='object'&&a!==null ? JSON.stringify(a) : String(a) }catch(e){ return String(a) } }
  function send(level,args){ try{ parent.postMessage({__kscLog:1,level:level,text:Array.prototype.map.call(args,fmt).join(' ')},'*') }catch(e){} }
  ['log','info','warn','error'].forEach(function(k){
    var origin = console[k];
    console[k] = function(){ send(k, arguments); if(origin) origin.apply(console, arguments) };
  });
  window.addEventListener('error', function(e){
    send('error', [ (e.message||'脚本错误') + ' @' + (e.lineno||0) + ':' + (e.colno||0) ]);
  });
  window.addEventListener('unhandledrejection', function(e){
    send('error', ['未处理的 Promise: ' + ((e.reason && e.reason.message) || String(e.reason))]);
  });
})();</script>`

function injectCapture(doc: string): string {
  if (/<head[\s>]/i.test(doc)) return doc.replace(/<head([^>]*)>/i, `<head$1>${CAPTURE_SCRIPT}`)
  return `${CAPTURE_SCRIPT}${doc}`
}

const LEVEL_COLOR: Record<LogItem['level'], string> = {
  log: 'var(--fx-t3, #999)',
  info: '#d8d8d8',
  warn: '#e8d18a',
  error: '#ff8a8a',
}

export default function Preview({
  app,
  appId,
  device = 'phone',
  showConsole = false,
  ephemeral = false,
  onErrorCount,
}: {
  app: { name: string; html: string; css: string; js: string }
  appId: string
  device?: 'phone' | 'tablet'
  showConsole?: boolean
  /** 临时预览（模板 / AI 草稿）：运行期数据只留在 iframe 内，不写回 store */
  ephemeral?: boolean
  /** 运行期错误条数变化回调，供外部做红点提示 */
  onErrorCount?: (n: number) => void
}) {
  const setAppStorage = useFactory((s) => s.setAppStorage)
  const removeAppStorage = useFactory((s) => s.removeAppStorage)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [logs, setLogs] = useState<LogItem[]>([])
  const seqRef = useRef(0)

  const doc = useMemo(() => {
    const storage = ephemeral ? {} : useFactory.getState().getAppStorage(appId)
    return injectCapture(buildPreviewDoc({ id: appId, name: app.name, html: app.html, css: app.css, js: app.js }, storage))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.name, app.html, app.css, app.js, appId, ephemeral])

  useEffect(() => {
    setLogs([])
  }, [appId, doc])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      const d = e.data as { __kscStore?: 1; __kscLog?: 1; key?: string | null; value?: string | null; level?: LogItem['level']; text?: string } | null
      if (!d || typeof d !== 'object') return

      if (d.__kscStore) {
        if (ephemeral) return
        if (d.key == null) {
          // clear()
          const all = useFactory.getState().getAppStorage(appId)
          Object.keys(all).forEach((k) => removeAppStorage(appId, k))
        } else if (d.value == null) {
          removeAppStorage(appId, d.key)
        } else {
          setAppStorage(appId, d.key, d.value)
        }
        return
      }

      if (d.__kscLog) {
        seqRef.current += 1
        const item: LogItem = { id: seqRef.current, level: d.level ?? 'log', text: d.text ?? '' }
        setLogs((prev) => [...prev.slice(-120), item])
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [appId, ephemeral, setAppStorage, removeAppStorage])

  const errorCount = logs.filter((l) => l.level === 'error').length

  useEffect(() => {
    onErrorCount?.(errorCount)
  }, [errorCount, onErrorCount])

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: device === 'phone' ? 375 : '100%',
          maxWidth: '100%',
          margin: '0 auto',
          borderRadius: device === 'phone' ? 22 : 14,
          overflow: 'hidden',
          background: '#000',
          border: '1px solid #2a2a2a',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.7)',
        }}
      >
        <iframe
          ref={iframeRef}
          title={`预览 · ${app.name}`}
          srcDoc={doc}
          sandbox="allow-scripts allow-modals allow-forms allow-popups allow-downloads"
          style={{ width: '100%', height: '100%', border: 'none', background: '#000', display: 'block' }}
        />
      </div>

      {showConsole && (
        <div
          className="fx-sunken"
          style={{ marginTop: 8, height: 132, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid #1e1e1e' }}>
            <Terminal size={12} color="var(--fx-t3, #999)" />
            <span className="fx-code" style={{ flex: 1, fontSize: 11, color: 'var(--fx-t3, #999)' }}>
              控制台{errorCount > 0 ? ` · ${errorCount} 个错误` : ''}
            </span>
            <button className="fx-press-soft" onClick={() => setLogs([])} style={{ background: 'none', border: 0, color: 'var(--fx-t3, #999)', cursor: 'pointer', display: 'flex' }}>
              <Trash2 size={12} />
            </button>
          </div>
          <div className="fx-code" style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', fontSize: 11, lineHeight: 1.6 }}>
            {logs.length === 0 ? (
              <div style={{ color: '#555' }}>暂无输出。应用里的 console.log 与报错会显示在这里。</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} style={{ color: LEVEL_COLOR[l.level], wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}