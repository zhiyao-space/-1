import { EmptyState } from './common'
import { Music } from 'lucide-react'

export default function PlaceholderApp() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="nav-title fs-h2" style={{ padding: '16px 20px 8px', color: 'var(--text-primary)' }}>
        音乐
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon={<Music size={36} />} text="音乐模块开发中" hint="将在后续批次开放" />
      </div>
    </div>
  )
}
