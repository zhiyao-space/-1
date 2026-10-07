import { useEffect, useState } from 'react'
import { Code2, Factory, LayoutTemplate, Package, Scissors, Sparkles } from 'lucide-react'
import { useFactory } from '../../store/factory'
import MyApps from './MyApps'
import TemplateFactory from './TemplateFactory'
import AiFactory from './AiFactory'
import CodeWorkshop from './CodeWorkshop'
import SnippetLibrary from './SnippetLibrary'
import '../../styles/factory.css'

type FTab = 'apps' | 'templates' | 'ai' | 'workshop' | 'snippets'

const TABS: { key: FTab; label: string; icon: typeof Package }[] = [
  { key: 'apps', label: '我的应用', icon: Package },
  { key: 'templates', label: '模板工厂', icon: LayoutTemplate },
  { key: 'ai', label: 'AI造应用', icon: Sparkles },
  { key: 'workshop', label: '代码工坊', icon: Code2 },
  { key: 'snippets', label: '片段库', icon: Scissors },
]

export default function FactoryApp() {
  const [tab, setTab] = useState<FTab>('apps')
  const [editAppId, setEditAppId] = useState<string | null>(null)
  const [insertReq, setInsertReq] = useState<{ type: 'html' | 'css' | 'js'; code: string; at: number } | null>(null)
  const cleanupPreviewStorage = useFactory((s) => s.cleanupPreviewStorage)

  // 清掉历史版本里模板 / AI 草稿预览遗留的临时存储
  useEffect(() => {
    cleanupPreviewStorage()
  }, [cleanupPreviewStorage])

  const openWorkshop = (id: string) => {
    setEditAppId(id)
    setTab('workshop')
  }

  return (
    <div className="fx-root">
      <div className="no-select" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px 0' }}>
        <span className="fx-block fx-front" style={{ width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Factory size={16} />
        </span>
        <span className="fs-body" style={{ fontWeight: 700, letterSpacing: '0.5px', color: 'var(--fx-t1,#fff)' }}>
          mulin功能应用制造厂
        </span>
      </div>

      <div className="fx-tabs no-select">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} className={`fx-tab fx-press-soft ${active ? 'fx-tab--active' : ''}`} onClick={() => setTab(t.key)}>
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {tab === 'apps' && <MyApps onEdit={openWorkshop} />}
        {tab === 'templates' && (
          <TemplateFactory
            onCreated={(id, advanced) => {
              if (advanced) openWorkshop(id)
              else setTab('apps')
            }}
          />
        )}
        {tab === 'ai' && <AiFactory onSaved={() => setTab('apps')} onEdit={openWorkshop} />}
        {tab === 'workshop' && (
          <CodeWorkshop appId={editAppId} insertReq={insertReq} onConsumeInsert={() => setInsertReq(null)} onPickApp={setEditAppId} />
        )}
        {tab === 'snippets' && (
          <SnippetLibrary
            onInsert={(type, code) => {
              setInsertReq({ type, code, at: Date.now() })
              setTab('workshop')
            }}
          />
        )}
      </div>
    </div>
  )
}