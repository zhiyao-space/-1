import { useState } from 'react'
import {
  ChevronRight,
  Plug,
  Palette,
  MessageSquare,
  BookOpen,
  BrainCircuit,
  Database,
  Smartphone,
} from 'lucide-react'
import { SectionCard } from '../common'
import ThemePage from './ThemePage'
import FontPage from './FontPage'
import WallpaperPage from './WallpaperPage'
import IconsPage from './IconsPage'
import ApiConfigPage from './ApiConfigPage'
import ChatParamsPage from './ChatParamsPage'
import WorldbookPage from './WorldbookPage'
import RuntimeRulesPage from './RuntimeRulesPage'
import ChainSettingsPage from './ChainSettingsPage'
import DataPage from './DataPage'
import AboutApp from './AboutApp'

type SubPage = 'home' | 'theme' | 'font' | 'wallpaper' | 'icons' | 'api' | 'chatparams' | 'worldbook' | 'rules' | 'chain' | 'data' | 'about'

export default function SettingsApp() {
  const [page, setPage] = useState<SubPage>('home')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {page === 'home' && <SettingsHome onNavigate={setPage} />}
      {page === 'theme' && <PageShell title="主题与配色" onBack={() => setPage('home')}><ThemePage /></PageShell>}
      {page === 'font' && <PageShell title="字体设置" onBack={() => setPage('home')}><FontPage /></PageShell>}
      {page === 'wallpaper' && <PageShell title="壁纸设置" onBack={() => setPage('home')}><WallpaperPage /></PageShell>}
      {page === 'icons' && <PageShell title="图标设置" onBack={() => setPage('home')}><IconsPage /></PageShell>}
      {page === 'api' && <PageShell title="API 配置" onBack={() => setPage('home')}><ApiConfigPage /></PageShell>}
      {page === 'chatparams' && <PageShell title="聊天参数" onBack={() => setPage('home')}><ChatParamsPage /></PageShell>}
      {page === 'worldbook' && <WorldbookPage onBackHome={() => setPage('home')} />}
      {page === 'rules' && <RuntimeRulesPage onBack={() => setPage('home')} onOpenChain={() => setPage('chain')} />}
      {page === 'chain' && <ChainSettingsPage onBack={() => setPage('rules')} />}
      {page === 'data' && <DataPage onBack={() => setPage('home')} />}
      {page === 'about' && <PageShell title="关于 mulin 小手机" onBack={() => setPage('home')}><AboutApp /></PageShell>}
    </div>
  )
}

function PageShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <>
      <div
        className="no-select"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          flexShrink: 0,
        }}
      >
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        {children}
      </div>
    </>
  )
}

function SettingsHome({ onNavigate }: { onNavigate: (p: SubPage) => void }) {
  const entries: { key: SubPage; icon: React.ReactNode; label: string; sub: string }[] = [
    { key: 'api', icon: <Plug size={18} />, label: 'API 配置', sub: '聊天 / 生图 / 语音 / 识图' },
    { key: 'theme', icon: <Palette size={18} />, label: '美化与字体', sub: '主题 · 配色 · 壁纸 · 图标' },
    { key: 'chatparams', icon: <MessageSquare size={18} />, label: '聊天参数', sub: '响应模式 · 主动消息 · 表情包' },
    { key: 'worldbook', icon: <BookOpen size={18} />, label: '世界书管理', sub: '全局 / 局部 · 三态挂载' },
    { key: 'rules', icon: <BrainCircuit size={18} />, label: '角色运行规则', sub: '思维链 · 输出规则 · 自检' },
    { key: 'data', icon: <Database size={18} />, label: '数据管理', sub: '导出 · 导入 · 备份' },
    { key: 'about', icon: <Smartphone size={18} />, label: '关于 mulin 小手机', sub: '设备铭牌 · 锁定信息' },
  ]

  return (
    <>
      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
        <SectionCard>
          {entries.map((e) => (
            <button
              key={e.key}
              className="pressable"
              onClick={() => onNavigate(e.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 2px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'left',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{e.icon}</span>
              <span style={{ flex: 1 }}>
                <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>{e.label}</span>
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{e.sub}</span>
              </span>
              <ChevronRight size={16} color="var(--text-disabled)" />
            </button>
          ))}
        </SectionCard>

        <SectionCard>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => onNavigate('wallpaper')}
            >
              壁纸
            </button>
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => onNavigate('icons')}
            >
              图标
            </button>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

export { PageShell }
