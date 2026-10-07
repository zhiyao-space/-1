import { ChevronRight, Music } from 'lucide-react'
import { SectionCard } from '../common'
import PlaylistManager from '../music/PlaylistManager'

export default function MusicSettingsPage({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>
          音乐与歌单
        </span>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <SectionCard title="歌单管理">
          <PlaylistManager />
        </SectionCard>

        <SectionCard title="说明">
          <div className="fs-aux" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7, display: 'flex', gap: 8 }}>
            <Music size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              本地音频会保存在设备本地（IndexedDB），在线音频直接填写可播放的 http(s) 地址。
              封面与歌单支持逐个更换，桌面音乐组件会同步显示当前曲目与进度。
            </span>
          </div>
        </SectionCard>
      </div>
    </>
  )
}