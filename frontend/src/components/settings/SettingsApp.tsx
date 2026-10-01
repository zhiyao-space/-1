import { useState } from 'react'
import {
  ChevronRight,
  Plug,
  Palette,
  MessageSquare,
  BookOpen,
  BrainCircuit,
  Database,
  Camera,
  Pencil,
  UserRound,
} from 'lucide-react'
import { useSettings } from '../../store/settings'
import { useUI } from '../../store/ui'
import { useToast } from '../../store/ui'
import { Modal, SectionCard } from '../common'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
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

type SubPage = 'home' | 'theme' | 'font' | 'wallpaper' | 'icons' | 'api' | 'chatparams' | 'worldbook' | 'rules' | 'chain' | 'data'

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
  const settings = useSettings()
  const push = useToast((s) => s.push)
  const avatarUrl = useBlobURL(settings.avatarId)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [editSignOpen, setEditSignOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [signDraft, setSignDraft] = useState('')

  const uploadAvatar = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const compressed = await compressImage(file, 512)
      const id = await putBlob(compressed)
      settings.setAvatarId(id)
      push('头像已更新')
    }
    input.click()
  }

  const entries: { key: SubPage; icon: React.ReactNode; label: string; sub: string }[] = [
    { key: 'api', icon: <Plug size={18} />, label: 'API 配置', sub: '聊天 / 生图 / 语音 / 识图' },
    { key: 'theme', icon: <Palette size={18} />, label: '美化与字体', sub: '主题 · 配色 · 壁纸 · 图标' },
    { key: 'chatparams', icon: <MessageSquare size={18} />, label: '聊天参数', sub: '响应模式 · 主动消息 · 表情包' },
    { key: 'worldbook', icon: <BookOpen size={18} />, label: '世界书管理', sub: '全局 / 局部 · 三态挂载' },
    { key: 'rules', icon: <BrainCircuit size={18} />, label: '角色运行规则', sub: '思维链 · 输出规则 · 自检' },
    { key: 'data', icon: <Database size={18} />, label: '数据管理', sub: '导出 · 导入 · 备份' },
  ]

  return (
    <>
      <div style={{ padding: '8px 16px 4px', flexShrink: 0 }}>
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="pressable"
            onClick={uploadAvatar}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserRound size={24} color="var(--text-tertiary)" />
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="app-name" style={{ fontSize: 'calc(24px * var(--fs-scale))' }}>{settings.phoneName}</span>
              <button
                className="pressable"
                onClick={() => {
                  setNameDraft(settings.phoneName)
                  setEditNameOpen(true)
                }}
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Pencil size={13} />
              </button>
            </div>
            <button
              className="pressable"
              onClick={() => {
                setSignDraft(settings.signature)
                setEditSignOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
                color: settings.signature ? 'var(--text-secondary)' : 'var(--text-disabled)',
                fontSize: 'calc(12px * var(--fs-scale))',
              }}
            >
              {settings.signature || '点击设置个性签名'}
              <Pencil size={11} />
            </button>
          </div>
          <button
            className="pressable"
            onClick={uploadAvatar}
            style={{ color: 'var(--text-tertiary)', padding: 6 }}
            title="更换头像"
          >
            <Camera size={17} />
          </button>
        </div>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 24px' }}>
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

      <Modal open={editNameOpen} onClose={() => setEditNameOpen(false)} title="修改手机名称">
        <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={20} autoFocus />
        <button
          className="btn btn-accent"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => {
            settings.setPhoneName(nameDraft)
            setEditNameOpen(false)
            push('名称已保存')
          }}
        >
          保存
        </button>
      </Modal>

      <Modal open={editSignOpen} onClose={() => setEditSignOpen(false)} title="修改个性签名">
        <input value={signDraft} onChange={(e) => setSignDraft(e.target.value)} maxLength={30} autoFocus placeholder="锁屏界面显示的一句话" />
        <button
          className="btn btn-accent"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => {
            settings.setSignature(signDraft.trim())
            setEditSignOpen(false)
            push('签名已保存')
          }}
        >
          保存
        </button>
      </Modal>
    </>
  )
}

export { PageShell }
