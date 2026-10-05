import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { genId } from '../lib/idb'

export interface Track {
  id: string
  title: string
  artist: string
  /** 'idb:<blobId>'（本地文件）或 http(s) 在线地址 */
  src: string
  coverId: string | null
}

export type TrackSource = { kind: 'idb'; id: string } | { kind: 'url'; url: string }

export function parseTrackSrc(src: string): TrackSource {
  if (src.startsWith('idb:')) return { kind: 'idb', id: src.slice(4) }
  return { kind: 'url', url: src }
}

interface MusicState {
  tracks: Track[]
  index: number
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  defaultCoverId: string | null
  /** 拖动进度条时递增，用于通知音频控制器执行跳转 */
  seekNonce: number
  setTracks: (tracks: Track[]) => void
  addTracks: (items: Omit<Track, 'id'>[]) => void
  updateTrack: (id: string, patch: Partial<Omit<Track, 'id'>>) => void
  removeTrack: (id: string) => void
  setDefaultCover: (id: string | null) => void
  playIndex: (i: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (ratio: number) => void
  setProgress: (currentTime: number, duration: number) => void
  setVolume: (v: number) => void
}

export const useMusic = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: [],
      index: -1,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      defaultCoverId: null,
      seekNonce: 0,
      setTracks: (tracks) =>
        set((s) => ({ tracks, index: tracks.length ? Math.min(Math.max(0, s.index), tracks.length - 1) : -1 })),
      addTracks: (items) =>
        set((s) => {
          const added: Track[] = items.map((t) => ({ ...t, id: genId() }))
          const tracks = [...s.tracks, ...added]
          return { tracks, index: s.index < 0 && tracks.length > 0 ? 0 : s.index }
        }),
      updateTrack: (id, patch) =>
        set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTrack: (id) =>
        set((s) => {
          const tracks = s.tracks.filter((t) => t.id !== id)
          const removedBefore = s.tracks.findIndex((t) => t.id === id) < s.index
          let index = s.index
          if (tracks.length === 0) index = -1
          else if (removedBefore) index = Math.max(0, s.index - 1)
          else if (s.index >= tracks.length) index = tracks.length - 1
          return { tracks, index, playing: tracks.length === 0 ? false : s.playing }
        }),
      setDefaultCover: (defaultCoverId) => set({ defaultCoverId }),
      playIndex: (i) => {
        const { tracks } = get()
        if (i < 0 || i >= tracks.length) return
        set({ index: i, playing: true, currentTime: 0, duration: 0, seekNonce: get().seekNonce + 1 })
      },
      toggle: () => {
        const { tracks, index } = get()
        if (tracks.length === 0) return
        if (index < 0) {
          set({ index: 0, playing: true })
          return
        }
        set((s) => ({ playing: !s.playing }))
      },
      next: () => {
        const { tracks, index } = get()
        if (tracks.length === 0) return
        const i = (Math.max(0, index) + 1) % tracks.length
        set({ index: i, playing: true, currentTime: 0, duration: 0, seekNonce: get().seekNonce + 1 })
      },
      prev: () => {
        const { tracks, index, currentTime } = get()
        if (tracks.length === 0) return
        if (currentTime > 3) {
          set({ currentTime: 0, seekNonce: get().seekNonce + 1 })
          return
        }
        const i = (Math.max(0, index) - 1 + tracks.length) % tracks.length
        set({ index: i, playing: true, currentTime: 0, duration: 0, seekNonce: get().seekNonce + 1 })
      },
      seek: (ratio) => {
        const { duration } = get()
        const r = Math.min(1, Math.max(0, ratio))
        set({ currentTime: r * duration, seekNonce: get().seekNonce + 1 })
      },
      setProgress: (currentTime, duration) => set({ currentTime, duration: duration || get().duration }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    {
      name: 'ksc:music',
      partialize: (s) => ({
        tracks: s.tracks,
        index: s.index,
        volume: s.volume,
        defaultCoverId: s.defaultCoverId,
      }),
    }
  )
)

export function currentTrack(s: MusicState): Track | null {
  return s.index >= 0 && s.index < s.tracks.length ? s.tracks[s.index] : null
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}