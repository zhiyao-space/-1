import { useUI, AppId } from '../store/ui'
import TopNav from './TopNav'
import Desktop from './Desktop'
import SettingsApp from './settings/SettingsApp'
import AboutApp from './settings/AboutApp'
import PlaceholderApp from './PlaceholderApp'
import { useSettings } from '../store/settings'

export default function PhoneHome() {
  const activeApp = useUI((s) => s.activeApp)

  return (
    <div style={{ position: 'absolute', top: 'var(--statusbar-height)', left: 0, right: 0, bottom: 0 }}>
      <TopNav />
      <Desktop />

      {activeApp && (
        <div
          className="page-enter"
          style={{
            position: 'absolute',
            top: 'var(--statusbar-height)',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 150,
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeApp === 'settings' && <SettingsApp />}
          {activeApp === 'about' && <AboutApp />}
          {['contacts', 'messages', 'forum', 'moments', 'music'].includes(activeApp) && (
            <PlaceholderApp appId={activeApp as AppId} />
          )}
        </div>
      )}
    </div>
  )
}

export function useAppTitle(): string {
  const activeApp = useUI((s) => s.activeApp)
  const phoneName = useSettings((s) => s.phoneName)
  const names: Record<AppId, string> = {
    settings: '设置',
    about: `关于 ${phoneName}`,
    contacts: '通讯录',
    messages: '信息',
    forum: '论坛',
    moments: '朋友圈',
    music: '音乐',
  }
  return activeApp ? names[activeApp] : ''
}
