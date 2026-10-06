import { useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { useUI, AppId } from '../store/ui'
import TopNav from './TopNav'
import Desktop from './Desktop'
import SettingsApp from './settings/SettingsApp'
import MusicApp from './music/MusicApp'
import GlobalAudio from './music/GlobalAudio'
import ChatHub from './chat/ChatHub'
import ForumApp from './forum/ForumApp'
import SmsApp from './sms/SmsApp'
import PhoneApp from './phone/PhoneApp'
import Avatar from './chat/Avatar'
import Ghost from './xiaogui/Ghost'
import XiaoguiPanel from './xiaogui/XiaoguiPanel'
import FactoryApp from './factory/FactoryApp'
import AppRunner from './factory/AppRunner'
import SocialApp from './social/SocialApp'
import MallApp from './mall/MallApp'
import CityApp from './city/CityApp'
import { useCharacters } from '../store/characters'

export default function PhoneHome() {
  const activeApp = useUI((s) => s.activeApp)
  const xiaoguiOpen = useUI((s) => s.xiaoguiOpen)

  return (
    <div style={{ position: 'absolute', top: 'var(--statusbar-height)', left: 0, right: 0, bottom: 0 }}>
      <TopNav />
      <Desktop />

      <NotificationBanner />

      <GlobalAudio />
      {activeApp === null && !xiaoguiOpen && <Ghost />}
      {xiaoguiOpen && <XiaoguiPanel />}

      {activeApp && (
        <div
          className="page-slide"
          style={{
            position: 'absolute',
            top: 'calc(var(--statusbar-height) + var(--nav-height))',
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
          {activeApp === 'chat' && <ChatHub />}
          {activeApp === 'forum' && <ForumApp />}
          {activeApp === 'sms' && <SmsApp />}
          {activeApp === 'phone' && <PhoneApp />}
          {activeApp === 'music' && <MusicApp />}
          {activeApp === 'factory' && <FactoryApp />}
          {activeApp === 'social' && <SocialApp />}
          {activeApp === 'mall' && <MallApp />}
          {activeApp === 'city' && <CityApp />}
        </div>
      )}

      <AppRunner />
    </div>
  )
}

export function useAppTitle(): string {
  const activeApp = useUI((s) => s.activeApp)
  const names: Record<AppId, string> = {
    settings: '设置',
    chat: '聊天',
    forum: '论坛',
    music: '音乐',
    sms: '短信',
    phone: '电话',
    factory: 'mulin功能应用制造厂',
    social: 'mu社区恋爱交友软件',
    mall: 'mulin 商城 ✦ MALLÉ',
    city: 'Mul市',
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
        openApp('chat')
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
