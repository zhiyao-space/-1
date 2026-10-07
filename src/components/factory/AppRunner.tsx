import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import { useFactory } from '../../store/factory'
import { useUI } from '../../store/ui'
import Preview from './Preview'
import { AppIcon } from './parts'

/** 桌面图标点开后的运行容器：full 全屏、medium 卡片浮层、small 小组件浮层 */
export default function AppRunner() {
  const runningId = useUI((s) => s.runningAppId)
  const setRunningApp = useUI((s) => s.setRunningApp)
  const owned = useFactory((s) => s.apps.find((a) => a.id === runningId))
  // 公用库应用无需安装也可直接运行
  const shared = useFactory((s) => s.sharedApps.find((a) => a.id === runningId))
  const target = owned ?? shared

  if (!runningId) return null

  const size = target?.size ?? 'full'
  const close = () => setRunningApp(null)

  // 尺寸决定运行形态：小的浮在中间、中的占大半屏、大的整屏
  const panelStyle: CSSProperties =
    size === 'full'
      ? { position: 'absolute', inset: 0 }
      : size === 'small'
        ? {
            position: 'absolute',
            left: '14%',
            right: '14%',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '48%',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '10px 10px 20px #000000, -8px -8px 16px #4a4a4a',
          }
        : {
            position: 'absolute',
            left: 10,
            right: 10,
            top: '12%',
            bottom: 10,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '10px 10px 20px #000000, -8px -8px 16px #4a4a4a',
          }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 720 }}>
      {size !== 'full' && <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.58)' }} />}

      <div className="fx-root" style={panelStyle}>
        <div className="no-select" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px' }}>
          <span className="fx-sunken" style={{ width: 34, height: 34, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon icon={target?.icon} size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="fs-body" style={{ display: 'block', color: 'var(--fx-t1,#fff)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {target?.name ?? '应用已删除'}
            </span>
            <span className="fs-micro" style={{ color: 'var(--fx-t3,#999)' }}>
              {size === 'small' ? '小组件' : size === 'medium' ? '应用卡片' : '全屏应用'}
            </span>
          </span>
          <button className="fx-press-soft" onClick={close} style={{ background: 'none', border: 0, color: 'var(--fx-t2,#ddd)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: '0 10px calc(12px + env(safe-area-inset-bottom))' }}>
          {target ? (
            <Preview appId={target.id} app={{ name: target.name, html: target.html, css: target.css, js: target.js }} device="tablet" ephemeral={!owned} />
          ) : (
            <div className="fx-sunken" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fx-t3,#999)' }}>
              <span className="fs-body">这个应用已经被删除了</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}