import { AppId } from '../store/ui'
import { EmptyState } from './common'
import { Wrench } from 'lucide-react'

const APP_NAMES: Record<string, string> = {
  contacts: '通讯录',
  messages: '信息',
  forum: '论坛',
  moments: '朋友圈',
  music: '音乐',
}

const BATCH_NOTES: Record<string, string> = {
  contacts: '角色创建与通讯录将在批次 2 开放',
  messages: '聊天功能将在批次 2 开放',
  forum: '论坛功能将在批次 4 开放',
  moments: '朋友圈将在批次 3 开放',
  music: '音乐模块将在后续批次开放',
}

export default function PlaceholderApp({ appId }: { appId: AppId }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="nav-title fs-h2" style={{ padding: '16px 20px 8px', color: 'var(--text-primary)' }}>
        {APP_NAMES[appId]}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={<Wrench size={36} />}
          text="模块开发中"
          hint={BATCH_NOTES[appId]}
        />
      </div>
    </div>
  )
}
