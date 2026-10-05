import { useEffect, useRef } from 'react'
import { currentTrack, parseTrackSrc, useMusic } from '../../store/music'
import { getBlobURL } from '../../lib/idb'
import { fetchLyric } from '../../lib/netease'
import { useToast } from '../../store/ui'

/** 已拉过歌词的曲目，避免重复请求 */
const lyricFetched = new Set<string>()

/**
 * 全局音频控制器：只挂载一次，随音乐 store 的状态驱动 HTML5 Audio。
 * 桌面音乐卡 / 音乐 App / 设置页都只操作 store，不各自持有 audio。
 * 网易云曲目在播放前按需解析真实 mp3 链接，链接过期或播放出错时自动刷新。
 */
export default function GlobalAudio() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const track = useMusic((s) => currentTrack(s))
  const playing = useMusic((s) => s.playing)
  const volume = useMusic((s) => s.volume)
  const seekNonce = useMusic((s) => s.seekNonce)
  const trackId = track?.id ?? null
  const ncmLyricId = track?.ncmLyricId ?? null
  /** 同一次播放内已经因链接失效重试过的次数，避免死循环 */
  const retried = useRef(0)

  // 切歌：解析音源（本地 blob / 在线 URL / 网易云按需解析）并装载
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    retried.current = 0

    if (!trackId) {
      el.removeAttribute('src')
      el.load()
      return
    }

    const apply = (u: string) => {
      if (!alive || !u) return
      el.src = u
      el.load()
      if (useMusic.getState().playing) void el.play().catch(() => {})
    }

    void (async () => {
      const t = useMusic.getState().queue.find((x) => x.id === trackId)
      if (!t) return
      let src = t.src
      // 网易云曲目：没有链接或已过期 → 重新解析
      if (t.ncmId && (!src || (t.expireAt && Date.now() > t.expireAt - 30_000))) {
        const fresh = await useMusic.getState().resolveTrackSrc(t.id)
        if (!alive) return
        if (!fresh) {
          useToast.getState().push('该歌曲暂无可用播放链接（可能受版权限制）', 'error')
          return
        }
        src = fresh
      }
      const parsed = parseTrackSrc(src)
      if (parsed.kind === 'url') {
        apply(parsed.url)
      } else {
        const u = await getBlobURL(parsed.id)
        if (u) apply(u)
      }
    })()

    return () => {
      alive = false
    }
  }, [trackId])

  // 歌词：切歌时拉取
  useEffect(() => {
    if (!trackId || !ncmLyricId) {
      useMusic.getState().setLyric(trackId ?? '', '')
      return
    }
    if (lyricFetched.has(trackId)) return
    lyricFetched.add(trackId)
    let alive = true
    void (async () => {
      try {
        const lrc = await fetchLyric(ncmLyricId)
        if (alive) useMusic.getState().setLyric(trackId, lrc)
      } catch {
        if (alive) useMusic.getState().setLyric(trackId, '')
      }
    })()
    return () => {
      alive = false
    }
  }, [trackId, ncmLyricId])

  // 播放 / 暂停
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (playing) void el.play().catch(() => {})
    else el.pause()
  }, [playing, trackId])

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
      onError={() => {
        // 网易云播放链接会过期/被风控，出错时强制刷新一次
        const t = trackId ? useMusic.getState().queue.find((x) => x.id === trackId) : null
        if (!t?.ncmId) {
          if (t?.src) useToast.getState().push('音频播放失败', 'error')
          return
        }
        if (retried.current >= 1) return
        retried.current += 1
        useMusic.setState((s) => ({
          queue: s.queue.map((x) => (x.id === t.id ? { ...x, src: '', expireAt: 0 } : x)),
        }))
        void useMusic
          .getState()
          .resolveTrackSrc(t.id)
          .then((u) => {
            const el = ref.current
            if (u && el) {
              el.src = u
              el.load()
              if (useMusic.getState().playing) void el.play().catch(() => {})
            }
          })
      }}
      style={{ display: 'none' }}
    />
  )
}