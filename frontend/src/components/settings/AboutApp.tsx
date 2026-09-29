import { useSettings } from '../../store/settings'
import { useUI } from '../../store/ui'
import { useToast } from '../../store/ui'
import { SectionCard, Row } from '../common'
import { useBlobURL } from '../WallpaperLayer'
import { Lock, Pencil, UserRound, Smartphone, Cpu } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../common'

export default function AboutApp() {
  const settings = useSettings()
  const lock = useUI((s) => s.lock)
  const openApp = useUI((s) => s.openApp)
  const push = useToast((s) => s.push)
  const avatarUrl = useBlobURL(settings.avatarId)
  const [renameOpen, setRenameOpen] = useState(false)
  const [draft, setDraft] = useState('')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 0 20px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserRound size={28} color="var(--text-tertiary)" />
            )}
          </div>
          <button
            className="pressable"
            onClick={() => {
              setDraft(settings.phoneName)
              setRenameOpen(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span className="app-name" style={{ fontSize: 'calc(30px * var(--fs-scale))' }}>{settings.phoneName}</span>
            <Pencil size={13} color="var(--text-tertiary)" />
          </button>
          {settings.signature && (
            <div className="fs-aux" style={{ color: 'var(--text-secondary)' }}>{settings.signature}</div>
          )}
        </div>

        <SectionCard title="版本信息">
          <Row label="版本" right={<span className="mono fs-aux" style={{ color: 'var(--text-secondary)' }}>v0.1.0 · 批次 1</span>} />
          <Row label="开发者" right={<span className="fs-aux" style={{ color: 'var(--text-secondary)' }}>MonkeyCode AI</span>} />
          <Row label="设计语言" right={<span className="fs-aux" style={{ color: 'var(--text-secondary)' }}>液态玻璃 · 高级黑灰白</span>} />
        </SectionCard>

        <SectionCard title="本机状态">
          <Row
            label="外观系统"
            sub="主题 / 字体 / 壁纸 / 图标"
            right={<Smartphone size={15} color="var(--text-secondary)" />}
          />
          <Row
            label="数据存储"
            sub="localStorage + IndexedDB 本地保存"
            right={<Cpu size={15} color="var(--text-secondary)" />}
          />
        </SectionCard>

        <SectionCard>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={() => {
              lock()
              push('已锁屏', 'info')
            }}
          >
            <Lock size={14} /> 锁定屏幕
          </button>
        </SectionCard>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="修改手机名称">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={20} autoFocus />
        <button
          className="btn btn-accent"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => {
            settings.setPhoneName(draft)
            setRenameOpen(false)
            push('名称已保存')
          }}
        >
          保存
        </button>
      </Modal>
    </div>
  )
}
