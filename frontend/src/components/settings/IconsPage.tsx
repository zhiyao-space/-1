import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { SectionCard, Row } from '../common'
import { Check } from 'lucide-react'

const DESKTOP_SIZES = [24, 32, 40] as const
const NAV_SIZES = [20, 24] as const

export default function IconsPage() {
  const settings = useSettings()
  const push = useToast((s) => s.push)

  return (
    <>
      <SectionCard title="图标包">
        <Row
          label="简约线条（Lucide）"
          sub="2px 描边 · 圆角端点 · 禁用 emoji"
          right={<Check size={16} color="var(--accent)" />}
        />
        <Row label="自定义图标包导入" sub="在桌面快捷组件编辑中上传自定义图标" />
      </SectionCard>

      <SectionCard title="图标大小">
        <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>桌面快捷图标</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {DESKTOP_SIZES.map((size) => (
            <button
              key={size}
              className="btn btn-sm"
              style={{
                background: settings.desktopIconSize === size ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: settings.desktopIconSize === size ? '#000' : 'var(--text-primary)',
                flex: 1,
              }}
              onClick={() => {
                settings.setDesktopIconSize(size)
                push(`桌面图标 ${size}px`)
              }}
            >
              {size}px
            </button>
          ))}
        </div>
        <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>底部导航图标</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {NAV_SIZES.map((size) => (
            <button
              key={size}
              className="btn btn-sm"
              style={{
                background: settings.navIconSize === size ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: settings.navIconSize === size ? '#000' : 'var(--text-primary)',
                flex: 1,
              }}
              onClick={() => {
                settings.setNavIconSize(size)
                push(`导航图标 ${size}px`)
              }}
            >
              {size}px
            </button>
          ))}
        </div>
      </SectionCard>
    </>
  )
}
