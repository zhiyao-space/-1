import { useEffect } from 'react'
import { useSettings, themeToCssVars } from './store/settings'
import { useUI } from './store/ui'
import { getBlob } from './lib/idb'
import { runProactiveTick } from './lib/proactive'
import { runForumTick } from './lib/forumScheduler'
import { runGossipTick, mountGossipSystem } from './lib/gossipEngine'
import { ToastHost } from './components/common'
import { GradDefs } from './components/desktop/DockIcons'
import LockScreen from './components/LockScreen'
import PhoneHome from './components/PhoneHome'
import StatusBar from './components/StatusBar'

async function registerCustomFonts() {
  const settings = useSettings.getState()
  const load = async (id: string | null, family: string) => {
    if (!id) return
    if (document.fonts.check(`16px ${family}`)) return
    const blob = await getBlob(id)
    if (!blob) return
    const buf = await blob.arrayBuffer()
    const face = new FontFace(family, buf)
    await face.load()
    document.fonts.add(face)
  }
  await Promise.all([
    load(settings.customFontCnId, 'KSCustomCN'),
    load(settings.customFontEnId, 'KSCustomEN'),
  ])
}

export default function App() {
  const settings = useSettings()
  const screen = useUI((s) => s.screen)

  useEffect(() => {
    registerCustomFonts()
  }, [settings.customFontCnId, settings.customFontEnId])

  useEffect(() => {
    mountGossipSystem()
    const timer = setInterval(() => {
      void runProactiveTick()
    }, 60_000)
    const forumTimer = setInterval(() => {
      void runForumTick()
    }, 45_000)
    // 八卦传播系统心跳：每 45 秒推进一条正在传播的八卦
    const gossipTimer = setInterval(() => {
      void runGossipTick()
    }, 45_000)
    return () => {
      clearInterval(timer)
      clearInterval(forumTimer)
      clearInterval(gossipTimer)
    }
  }, [])

  const vars = themeToCssVars(settings) as React.CSSProperties

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, #17181c 0%, #08090b 70%)',
      }}
    >
      <GradDefs />
      {settings.customCss && <style>{settings.customCss}</style>}
      <div
        style={{
          width: 'min(420px, 100vw)',
          height: 'min(880px, 100vh)',
          borderRadius: 'min(40px, 6vw)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg-primary)',
          ...vars,
        }}
      >
        <StatusBar />
        {screen === 'lock' ? <LockScreen /> : <PhoneHome />}
        <ToastHost />
      </div>
    </div>
  )
}
