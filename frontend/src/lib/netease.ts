/**
 * 网易云音乐接入层（纯前端）。
 *
 * 官方 music.163.com 接口不带 CORS 响应头，浏览器无法直连，且 VIP 歌曲不登录拿不到播放链接。
 * 因此这里走 GD Studio 聚合网关（自带 `Access-Control-Allow-Origin: *`），可直接在浏览器 fetch，
 * 无需后端、无需登录即可搜索 / 播放 / 取封面 / 取歌词。
 */

const API = 'https://music-api.gdstudio.xyz/api.php'
const SOURCE = 'netease'

/** 统一把 http 资源升级到 https，避免混合内容被拦截 */
function https(u: string | undefined | null): string | null {
  if (!u) return null
  return u.startsWith('http://') ? `https://${u.slice(7)}` : u
}

export interface NcmSong {
  id: string
  name: string
  /** 多位歌手用「 / 」连接 */
  artist: string
  album: string
  /** 封面直链；搜索结果里通常为空，需要用 picId 解析 */
  cover: string | null
  picId: string
  urlId: string
  lyricId: string
  /** 时长（秒），搜索结果里可能为 0 */
  duration: number
}

export interface NcmPlaylist {
  id: string
  name: string
  cover: string | null
  playCount: number
  tracks: NcmSong[]
}

export interface LrcLine {
  time: number
  text: string
}

async function getJson<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ source: SOURCE, ...params })
  const res = await fetch(`${API}?${qs.toString()}`)
  if (!res.ok) throw new Error(`网络错误 ${res.status}`)
  return (await res.json()) as T
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromSearch(item: any): NcmSong {
  return {
    id: String(item.id),
    name: item.name ?? '未知歌曲',
    artist: Array.isArray(item.artist) ? item.artist.join(' / ') : String(item.artist ?? '未知歌手'),
    album: item.album ?? '',
    cover: null,
    picId: String(item.pic_id ?? item.id),
    urlId: String(item.url_id ?? item.id),
    lyricId: String(item.lyric_id ?? item.id),
    duration: 0,
  }
}

function fromPlaylistTrack(t: any): NcmSong {
  return {
    id: String(t.id),
    name: t.name ?? '未知歌曲',
    artist: Array.isArray(t.ar) ? t.ar.map((a: any) => a?.name).filter(Boolean).join(' / ') : '未知歌手',
    album: t.al?.name ?? '',
    cover: https(t.al?.picUrl),
    picId: String(t.al?.pic ?? t.id),
    urlId: String(t.id),
    lyricId: String(t.id),
    duration: Math.round((t.dt ?? 0) / 1000),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** 搜索歌曲 */
export async function searchSongs(keyword: string, count = 24): Promise<NcmSong[]> {
  const kw = keyword.trim()
  if (!kw) return []
  const data = await getJson<any[]>({ types: 'search', name: kw, count: String(count), pages: '1' })
  return Array.isArray(data) ? data.map(fromSearch) : []
}

/** 获取可播放的 mp3 直链（链接约 20 分钟过期） */
export async function fetchSongUrl(urlId: string, br = 320): Promise<string | null> {
  const data = await getJson<{ url?: string }>({ types: 'url', id: urlId, br: String(br) })
  return https(data?.url)
}

/** 获取 LRC 歌词原文 */
export async function fetchLyric(lyricId: string): Promise<string> {
  const data = await getJson<{ lyric?: string }>({ types: 'lyric', id: lyricId })
  return data?.lyric ?? ''
}

/** 解析 LRC，返回按时间升序的歌词行 */
export function parseLrc(lrc: string): LrcLine[] {
  if (!lrc) return []
  const out: LrcLine[] = []
  for (const raw of lrc.split('\n')) {
    const tags = raw.match(/\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/g)
    if (!tags) continue
    const text = raw.replace(/\[[^\]]*\]/g, '').trim()
    if (!text) continue
    for (const tag of tags) {
      const m = tag.match(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/)
      if (!m) continue
      const min = Number(m[1])
      const sec = Number(m[2])
      const frac = m[3] ? Number(`0.${m[3]}`) : 0
      out.push({ time: min * 60 + sec + frac, text })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}

/** 封面 URL 解析缓存（搜索结果只有 picId） */
const picCache = new Map<string, string>()

export async function resolvePic(picId: string, size = 300): Promise<string | null> {
  if (!picId) return null
  const key = `${picId}:${size}`
  const hit = picCache.get(key)
  if (hit) return hit
  try {
    const data = await getJson<{ url?: string }>({ types: 'pic', id: picId, size: String(size) })
    const url = https(data?.url)
    if (url) picCache.set(key, url)
    return url
  } catch {
    return null
  }
}

/** 歌单 / 排行榜详情 */
export async function fetchPlaylist(id: string): Promise<NcmPlaylist> {
  const data = await getJson<any>({ types: 'playlist', id })
  const p = data?.playlist ?? {}
  const tracks = Array.isArray(p.tracks) ? p.tracks.map(fromPlaylistTrack) : []
  return {
    id: String(p.id ?? id),
    name: p.name ?? '歌单',
    cover: https(p.coverImgUrl) ?? tracks[0]?.cover ?? null,
    playCount: Number(p.playCount ?? p.playcount ?? 0),
    tracks,
  }
}

/** 榜单缓存，避免重复请求（每个榜单 200 首，payload 较大） */
const chartCache = new Map<string, NcmPlaylist>()

export interface ChartMeta {
  id: string
  name: string
  cover: string | null
  playCount: number
}

const CHARTS: { id: string; name: string }[] = [
  { id: '3778678', name: '热歌榜' },
  { id: '3779629', name: '新歌榜' },
  { id: '19723756', name: '飙升榜' },
  { id: '2884035', name: '原创榜' },
]

export async function fetchCharts(): Promise<ChartMeta[]> {
  const out: ChartMeta[] = []
  for (const c of CHARTS) {
    const cached = chartCache.get(c.id)
    if (cached) {
      out.push({ id: cached.id, name: cached.name || c.name, cover: cached.cover, playCount: cached.playCount })
      continue
    }
    try {
      const pl = await fetchPlaylist(c.id)
      chartCache.set(c.id, pl)
      out.push({ id: pl.id, name: pl.name || c.name, cover: pl.cover, playCount: pl.playCount })
    } catch {
      out.push({ id: c.id, name: c.name, cover: null, playCount: 0 })
    }
  }
  return out
}

/** 取榜单详情（命中缓存则直接返回） */
export async function fetchChartDetail(id: string): Promise<NcmPlaylist> {
  const cached = chartCache.get(id)
  if (cached) return cached
  const pl = await fetchPlaylist(id)
  chartCache.set(id, pl)
  return pl
}

/** 播放量格式化：12.3万 / 1.2亿 */
export function fmtPlayCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}