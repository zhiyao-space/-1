import { useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { useUI, AppId } from '../store/ui'
import TopNav from './TopNav'
import Desktop from './Desktop'
import SettingsApp from './settings/SettingsApp'
import AboutApp from './settings/AboutApp'
import PlaceholderApp from './PlaceholderApp'
import ContactsApp from './chat/ContactsApp'
import MessagesApp from './chat/MessagesApp'
import ForumApp from './forum/ForumApp'
import MomentsApp from './moments/MomentsApp'
import NotificationCenterApp from './NotificationCenterApp'
import ProfileApp from './profile/ProfileApp'
import Avatar from './chat/Avatar'
import { useSettings } from '../store/settings'
import { useCharacters } from '../store/characters'

export default function PhoneHome() {
  const activeApp = useUI((s) => s.activeApp)

  return (
    <div style={{ position: 'absolute', top: 'var(--statusbar-height)', left: 0, right: 0, bottom: 0 }}>
      <TopNav />
      <Desktop />

      <NotificationBanner />

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
          {activeApp === 'contacts' && <ContactsApp />}
          {activeApp === 'messages' && <MessagesApp />}
          {activeApp === 'forum' && <ForumApp />}
          {activeApp === 'moments' && <MomentsApp />}
          {activeApp === 'notifications' && <NotificationCenterApp />}
          {activeApp === 'profile' && <ProfileApp />}
          {activeApp === 'music' && <PlaceholderApp />}
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
    notifications: '通知中心',
    profile: '主页',
    music: '音乐',
  }
  return activeApp ? names[activeApp] : ''
}

function NotificationBanner() {
  const banner = useUI((s) => s.banner)
  const setBanner = useUI((s) => s.setBanner)
  const openApp = useUI((s) => s.openApp)
  const setPendingChat = useUI((s) => s.setPendingChat)
  const avatarId = useCharacters((s) => s.characters.find((c) => c.id === banner?.characterId)?.avatarId ?? null)

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 6000)
    return () => clearTimeout(t)
  }, [banner, setBanner])

  if (!banner) return null
  return (
    <button
      className="glass page-enter pressable"
      onClick={() => {
        setBanner(null)
        setPendingChat({ kind: 'single', characterId: banner.characterId })
        openApp('messages')
      }}
      style={{
        position: 'absolute',
        top: 10,
        left: 12,
        right: 12,
        zIndex: 400,
        borderRadius: 18,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
      }}
    >
      <Avatar imageId={avatarId} name={banner.characterName} size={36} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-aux" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}>
          <MessageCircle size={11} />
          {banner.characterName}
        </span>
        <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {banner.text}
        </span>
      </span>
    </button>
  )
}
