import { useState } from 'react'
import { ArrowLeft, Lock, X } from 'lucide-react'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useToast } from '../store/ui'
import { useLongPress } from '../hooks'
import { Modal } from './common'

export default function TopNav({ showBack = true }: { showBack?: boolean }) {
  const phoneName = useSettings((s) => s.phoneName)
  const setPhoneName = useSettings((s) => s.setPhoneName)
  const openApp = useUI((s) => s.openApp)
  const closeApp = useUI((s) => s.closeApp)
  const activeApp = useUI((s) => s.activeApp)
  const lock = useUI((s) => s.lock)
  const push = useToast((s) => s.push)
  const [renameOpen, setRenameOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const longPress = useLongPress(() => {
    setDraft(phoneName)
    setRenameOpen(true)
  })

  return (
    <div
      className="no-select"
      style={{
        height: 'var(--nav-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        position: 'relative',
        zIndex: 60,
        flexShrink: 0,
      }}
    >
      <div style={{ width: 76, display: 'flex' }}>
        {showBack && activeApp && (
          <button className="pressable" onClick={closeApp} style={{ color: 'var(--text-secondary)', padding: 8 }}>
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      <button
        className="pressable"
        onClick={() => openApp('settings')}
        {...longPress}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 14px',
          borderRadius: 999,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <span
          className="app-name"
          style={{ fontSize: 'calc(22px * var(--fs-scale))' }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.35))')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
        >
          {phoneName}
        </span>
      </button>

      <div style={{ width: 76, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="pressable"
          onClick={() => {
            lock()
            push('已锁屏', 'info')
          }}
          style={{ color: 'var(--text-secondary)', padding: 8 }}
          title="锁屏"
        >
          <Lock size={18} />
        </button>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="修改手机名称">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="输入新名称"
          maxLength={20}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setRenameOpen(false)}>
            <X size={15} /> 取消
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1 }}
            onClick={() => {
              setPhoneName(draft)
              setRenameOpen(false)
              push('名称已保存')
            }}
          >
            确认
          </button>
        </div>
      </Modal>
    </div>
  )
}
