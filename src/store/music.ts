import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/idb'
import { fetchSongUrl, type NcmSong } from '../lib/netease'

export interface Track {
  id: string
  title: string
  artist: string
  /** 'idb:<blobId>'（本地文件）、http(s) 在线地址，或网易云歌曲的空串（播放前按需解析） */
  src: string
  coverId: string | null
  /** 专辑名（网易云） */
  album?: string
  /** 在线封面直链（网易云） */
  coverUrl?: string | null
  /** 网易云封面 ID（搜索结果的封面需按需解析） */
  picId?: string
  /** 网易云歌曲 ID，用于解析 / 刷新播放链接 */
  ncmId?: string
  /** 网易云歌词 ID */
  ncmLyricId?: string
  /** 播放链接过期时间戳 */
  expireAt?: number
}

export type TrackSource = { kind: 'idb'; id: string } | { kind: 'url'; url: string }

export function parseTrackSrc(src: string): TrackSource {
  if (src.startsWith('idb:')) return { kind: 'idb', id: src.slice(4) }
  return { kind: 'url', url: src }
}

/** 网易云歌曲 → 播放队列曲目（src 留空，播放时按需解析真实链接） */
export function ncmToTrack(s: NcmSong): Track {
  return {
    id: `ncm-${s.id}`,
    title: s.name,
    artist: s.artist,
    src: '',
    coverId: null,
    album: s.album,
    coverUrl: s.cover,
    picId: s.picId,
    ncmId: s.urlId,
    ncmLyricId: s.lyricId,
  }
}

/** 提前 30 秒视为过期，留出刷新余量 */
const EXPIRE_MARGIN = 30_000
const URL_TTL = 15 * 60_000

export function isSrcStale(t: Track): boolean {
  if (!t.ncmId) return !t.src
  if (!t.src) return true
  return !!t.expireAt && Date.now() > t.expireAt - EXPIRE_MARGIN
}

interface MusicState {
  /** 本地曲库（用户上传 / 在线地址），由「歌单管理」维护 */
  tracks: Track[]
  /** 当前播放队列（可为曲库或网易云歌单） */
  queue: Track[]
  index: number
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  defaultCoverId: string | null
  /** 拖动进度条时递增，用于通知音频控制器执行跳转 */
  seekNonce: number
  /** 当前曲目歌词（LRC 原文） */
  lyric: string
  /** 歌词对应的曲目 id */
  lyricFor: string | null
  /** 喜欢的歌曲 id（本地记录） */
  likedIds: string[]

  setTracks: (tracks: Track[]) => void
  addTracks: (items: Omit<Track, 'id'>[]) => void
  updateTrack: (id: string, patch: Partial<Omit<Track, 'id'>>) => void
  removeTrack: (id: string) => void
  setDefaultCover: (id: string | null) => void

  /** 用给定列表替换播放队列并从 startIndex 开始播放 */
  playQueue: (list: Track[], startIndex: number) => void
  /** 把曲库作为播放队列并从 i 开始播放 */
  playLibrary: (i: number) => void
  /** 播放队列中的第 i 首 */
  playIndex: (i: number) => void
  /** 追加到播放队列末尾；队列为空时自动开始播放 */
  enqueue: (list: Track[]) => void

  toggle: () => void
  next: () => void
  prev: () => void
  seek: (ratio: number) => void
  setProgress: (currentTime: number, duration: number) => void
  setVolume: (v: number) => void

  setLyric: (forId: string, lyric: string) => void
  /** 解析 / 刷新某首网易云歌曲的播放链接 */
  resolveTrackSrc: (id: string) => Promise<string | null>
  toggleLike: (id: string) => void
}

/** 正在解析链接的曲目，避免并发重复请求 */
const resolving = new Set<string>()

export const useMusic = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: [],
      queue: [],
      index: -1,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      defaultCoverId: null,
      seekNonce: 0,
      lyric: '',
      lyricFor: null,
      likedIds: [],

      setTracks: (tracks) =>
        set((s) => ({ tracks, index: tracks.length ? Math.min(Math.max(0, s.index), tracks.length - 1) : -1 })),
      addTracks: (items) =>
        set((s) => {
          const added: Track[] = items.map((t) => ({ ...t, id: genId() }))
          return { tracks: [...s.tracks, ...added] }
        }),
      updateTrack: (id, patch) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          queue: s.queue.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTrack: (id) =>
        set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),
      setDefaultCover: (defaultCoverId) => set({ defaultCoverId }),

      playQueue: (list, startIndex) => {
        if (list.length === 0) return
        const i = Math.min(Math.max(0, startIndex), list.length - 1)
        set({ queue: list, index: i, playing: true, currentTime: 0, duration: 0, lyric: '', lyricFor: null, seekNonce: get().seekNonce + 1 })
      },
      playLibrary: (i) => {
        const { tracks } = get()
        get().playQueue(tracks, i)
      },
      playIndex: (i) => {
        const { queue } = get()
        if (i < 0 || i >= queue.length) return
        set({ index: i, playing: true, currentTime: 0, duration: 0, lyric: '', lyricFor: null, seekNonce: get().seekNonce + 1 })
      },
      enqueue: (list) => {
        if (list.length === 0) return
        const { queue, index } = get()
        const next = [...queue, ...list]
        set({ queue: next, index: index < 0 ? 0 : index, playing: index < 0 ? true : get().playing })
      },

      toggle: () => {
        const { queue, index } = get()
        if (queue.length === 0) return
        if (index < 0) {
          set({ index: 0, playing: true })
          return
        }
        set((s) => ({ playing: !s.playing }))
      },
      next: () => {
        const { queue, index } = get()
        if (queue.length === 0) return
        const i = (Math.max(0, index) + 1) % queue.length
        set({ index: i, playing: true, currentTime: 0, duration: 0, lyric: '', lyricFor: null, seekNonce: get().seekNonce + 1 })
      },
      prev: () => {
        const { queue, index, currentTime } = get()
        if (queue.length === 0) return
        if (currentTime > 3) {
          set({ currentTime: 0, seekNonce: get().seekNonce + 1 })
          return
        }
        const i = (Math.max(0, index) - 1 + queue.length) % queue.length
        set({ index: i, playing: true, currentTime: 0, duration: 0, lyric: '', lyricFor: null, seekNonce: get().seekNonce + 1 })
      },
      seek: (ratio) => {
        const { duration } = get()
        const r = Math.min(1, Math.max(0, ratio))
        set({ currentTime: r * duration, seekNonce: get().seekNonce + 1 })
      },
      setProgress: (currentTime, duration) => set({ currentTime, duration: duration || get().duration }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),

      setLyric: (forId, lyric) => set({ lyric, lyricFor: forId }),
      resolveTrackSrc: async (id) => {
        const t = get().queue.find((x) => x.id === id)
        if (!t?.ncmId) return t?.src || null
        if (resolving.has(id)) return null
        resolving.add(id)
        try {
          const url = await fetchSongUrl(t.ncmId)
          if (!url) return null
          set((s) => ({
            queue: s.queue.map((x) => (x.id === id ? { ...x, src: url, expireAt: Date.now() + URL_TTL } : x)),
          }))
          return url
        } catch {
          return null
        } finally {
          resolving.delete(id)
        }
      },
      toggleLike: (id) =>
        set((s) => ({
          likedIds: s.likedIds.includes(id) ? s.likedIds.filter((x) => x !== id) : [...s.likedIds, id],
        })),
    }),
    {
      name: 'ksc:music',
      version: 2,
      partialize: (s) => ({
        tracks: s.tracks,
        queue: s.queue,
        index: s.index,
        volume: s.volume,
        defaultCoverId: s.defaultCoverId,
        likedIds: s.likedIds,
      }),
      // v1 只有 tracks 既是曲库又是队列，迁移时把旧的 tracks 同时作为曲库与队列
      migrate: (persisted, version) => {
        const s = persisted as Partial<MusicState>
        if (version < 2 && s && !s.queue) {
          return { ...s, queue: s.tracks ?? [], likedIds: [] } as MusicState
        }
        return s as MusicState
      },
    }
  )
)

export function currentTrack(s: MusicState): Track | null {
  return s.index >= 0 && s.index < s.queue.length ? s.queue[s.index] : null
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}