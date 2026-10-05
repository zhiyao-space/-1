import { useEffect, useRef } from 'react'
import { currentTrack, parseTrackSrc, useMusic } from '../../store/music'
import { getBlobURL } from '../../lib/idb'

/**
 * 全局音频控制器：只挂载一次，随音乐 store 的状态驱动 HTML5 Audio。
 * 桌面音乐卡 / 音乐 App / 设置页都只操作 store，不各自持有 audio。
 */
export default function GlobalAudio() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const track = useMusic((s) => currentTrack(s))
  const playing = useMusic((s) => s.playing)
  const volume = useMusic((s) => s.volume)
  const seekNonce = useMusic((s) => s.seekNonce)

  // 切歌：解析音源（本地 blob / 在线 URL）并装载
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    if (!track) {
      el.removeAttribute('src')
      el.load()
      return
    }
    const source = parseTrackSrc(track.src)
    const apply = (u: string) => {
      if (!alive) return
      el.src = u
      el.load()
      if (useMusic.getState().playing) void el.play().catch(() => {})
    }
    if (source.kind === 'url') {
      apply(source.url)
    } else {
      getBlobURL(source.id).then((u) => {
        if (u) apply(u)
      })
    }
    return () => {
      alive = false
    }
  }, [track?.id, track?.src])

  // 播放 / 暂停
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (playing) void el.play().catch(() => {})
    else el.pause()
  }, [playing, track?.id])

  // 音量
  useEffect(() => {
    const el = ref.current
    if (el) el.volume = volume
  }, [volume])

  // 拖动进度条后执行跳转
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const t = useMusic.getState().currentTime
    if (Number.isFinite(t)) el.currentTime = t
  }, [seekNonce])

  return (
    <audio
      ref={ref}
      preload="metadata"
      onTimeUpdate={() => {
        const el = ref.current
        if (el) useMusic.getState().setProgress(el.currentTime, el.duration || 0)
      }}
      onLoadedMetadata={() => {
        const el = ref.current
        if (el) useMusic.getState().setProgress(el.currentTime, el.duration || 0)
      }}
      onEnded={() => useMusic.getState().next()}
      style={{ display: 'none' }}
    />
  )
}