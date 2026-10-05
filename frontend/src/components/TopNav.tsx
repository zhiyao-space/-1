import { ArrowLeft, Lock } from 'lucide-react'
import { useUI } from '../store/ui'
import { useToast } from '../store/ui'

export default function TopNav({ showBack = true }: { showBack?: boolean }) {
  const closeApp = useUI((s) => s.closeApp)
  const activeApp = useUI((s) => s.activeApp)
  const lock = useUI((s) => s.lock)
  const push = useToast((s) => s.push)

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
        // 应用打开时铺上与应用一致的底色，避免顶部透出桌面内容；桌面态保持透明露出壁纸
        background: activeApp ? 'var(--bg-primary)' : 'transparent',
      }}
    >
      <div style={{ width: 76, display: 'flex' }}>
        {showBack && activeApp && (
          <button className="pressable" onClick={closeApp} style={{ color: 'var(--text-secondary)', padding: 8 }}>
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

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
    </div>
  )
}
