import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Heart, ListMusic, Music, Pause, Play, Search, Shuffle, X } from 'lucide-react'
import { currentTrack, fmtTime, ncmToTrack, useMusic } from '../../store/music'
import {
  fetchChartDetail,
  fetchCharts,
  fmtPlayCount,
  searchSongs,
  type ChartMeta,
  type NcmPlaylist,
  type NcmSong,
} from '../../lib/netease'
import { useToast } from '../../store/ui'
import { CoverBox, SongCover, TrackCover } from './cover'
import PlaylistManager from './PlaylistManager'
import FullPlayer from './FullPlayer'
import ShareSheet from './ShareSheet'

type Tab = 'discover' | 'mine'

export default function MusicApp() {
  const [tab, setTab] = useState<Tab>('discover')
  const [full, setFull] = useState(false)
  const [share, setShare] = useState(false)
  const track = useMusic((s) => currentTrack(s))
  const playing = useMusic((s) => s.playing)
  const toggle = useMusic((s) => s.toggle)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 4px', flexShrink: 0 }}>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>音乐</span>
        <TabPill active={tab === 'discover'} onClick={() => setTab('discover')}>发现</TabPill>
        <TabPill active={tab === 'mine'} onClick={() => setTab('mine')}>我的</TabPill>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {tab === 'discover' ? <DiscoverView /> : <MineView />}
      </div>

      {/* 底部常驻迷你播放器 */}
      {track && (
        <button
          className="pressable"
          onClick={() => setFull(true)}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            margin: '6px 12px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(18,18,18,0.9)',
            backdropFilter: 'blur(var(--glass-blur))',
            textAlign: 'left',
          }}
        >
          <TrackCover track={track} size={38} radius={9} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.title}
            </span>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.artist}
            </span>
          </span>
          <span
            role="button"
            className="pressable"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {playing ? <Pause size={15} color="#000" /> : <Play size={15} color="#000" />}
          </span>
          <ChevronUp size={16} color="var(--text-tertiary)" />
        </button>
      )}

      {full && <FullPlayer onClose={() => setFull(false)} onShare={() => setShare(true)} />}
      {share && track && <ShareSheet track={track} onClose={() => setShare(false)} />}
    </div>
  )
}

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="pressable fs-micro"
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#000' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

/* ------------------------------- 发现 ------------------------------- */

function DiscoverView() {
  const push = useToast((s) => s.push)
  const playQueue = useMusic((s) => s.playQueue)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<NcmSong[] | null>(null)
  const [charts, setCharts] = useState<ChartMeta[] | null>(null)
  const [openChart, setOpenChart] = useState<ChartMeta | null>(null)

  useEffect(() => {
    let alive = true
    fetchCharts()
      .then((c) => {
        if (alive) setCharts(c)
      })
      .catch(() => {
        if (alive) setCharts([])
      })
    return () => {
      alive = false
    }
  }, [])

  const doSearch = async () => {
    const kw = query.trim()
    if (!kw) {
      setResults(null)
      return
    }
    setSearching(true)
    try {
      const list = await searchSongs(kw)
      setResults(list)
      if (list.length === 0) push('没有找到相关歌曲', 'error')
    } catch {
      push('搜索失败，请检查网络', 'error')
    } finally {
      setSearching(false)
    }
  }

  const playSongs = (songs: NcmSong[], i: number) => {
    playQueue(songs.map(ncmToTrack), i)
  }

  if (openChart) {
    return <PlaylistDetail meta={openChart} onBack={() => setOpenChart(null)} onPlay={playSongs} />
  }

  return (
    <div style={{ padding: '4px 16px 20px' }}>
      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
            placeholder="搜索歌曲 / 歌手"
            style={{ paddingLeft: 34 }}
          />
          {query && (
            <button
              className="pressable"
              onClick={() => {
                setQuery('')
                setResults(null)
              }}
              style={{ position: 'absolute', right: 10, color: 'var(--text-tertiary)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button className="btn btn-sm pressable" onClick={() => void doSearch()} disabled={searching}>
          {searching ? '搜索中' : '搜索'}
        </button>
      </div>

      {results ? (
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '10px 14px' }}>
            搜索结果（{results.length}）
          </div>
          {results.map((s, i) => (
            <SongRow key={s.id} song={s} onPlay={() => playSongs(results, i)} />
          ))}
        </div>
      ) : (
        <>
          {/* 快捷入口 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <QuickCard
              icon={<Heart size={16} />}
              title="每日推荐"
              sub="热歌榜前 30 首"
              onClick={async () => {
                try {
                  const pl = await fetchChartDetail('3778678')
                  playSongs(pl.tracks.slice(0, 30), 0)
                } catch {
                  push('加载失败', 'error')
                }
              }}
            />
            <QuickCard
              icon={<Shuffle size={16} />}
              title="随便听听"
              sub="随机来一首"
              onClick={async () => {
                try {
                  const pl = await fetchChartDetail('3778678')
                  const i = Math.floor(Math.random() * Math.min(pl.tracks.length, 100))
                  playSongs(pl.tracks, i)
                } catch {
                  push('加载失败', 'error')
                }
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="fs-body" style={{ color: 'var(--text-primary)' }}>推荐歌单</span>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>网易云榜单</span>
          </div>

          {charts === null ? (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '10px 0' }}>加载中…</div>
          ) : charts.length === 0 ? (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '10px 0' }}>
              网络异常，暂时取不到推荐歌单。
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {charts.map((c) => (
                <button key={c.id} className="pressable" onClick={() => setOpenChart(c)} style={{ textAlign: 'left' }}>
                  <ChartCover meta={c} />
                  <div className="fs-micro" style={{ color: 'var(--text-body)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{fmtPlayCount(c.playCount)}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChartCover({ meta }: { meta: ChartMeta }) {
  return (
    <span
      style={{
        display: 'flex',
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'linear-gradient(160deg, #2a2a2a 0%, #0a0a0a 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}
    >
      {meta.cover ? (
        <img src={meta.cover} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Music size={26} strokeWidth={1.5} />
      )}
    </span>
  )
}

function QuickCard({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      className="pressable glass"
      onClick={() => void onClick()}
      style={{ flex: 1, borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{icon}</span>
      <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{title}</span>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{sub}</span>
    </button>
  )
}

function PlaylistDetail({ meta, onBack, onPlay }: { meta: ChartMeta; onBack: () => void; onPlay: (s: NcmSong[], i: number) => void }) {
  const [pl, setPl] = useState<NcmPlaylist | null>(null)
  const enqueue = useMusic((s) => s.enqueue)
  const push = useToast((s) => s.push)

  useEffect(() => {
    let alive = true
    fetchChartDetail(meta.id)
      .then((p) => {
        if (alive) setPl(p)
      })
      .catch(() => push('歌单加载失败', 'error'))
    return () => {
      alive = false
    }
  }, [meta.id, push])

  const songs = pl?.tracks ?? []

  return (
    <div style={{ padding: '4px 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', display: 'flex', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="fs-h2" style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta.name}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <CoverBox src={meta.cover} size={92} radius={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
            播放量 {fmtPlayCount(meta.playCount) || '—'} · {songs.length || '…'} 首
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-sm pressable" onClick={() => songs.length && onPlay(songs, 0)} disabled={!songs.length}>
              <Play size={13} /> 播放全部
            </button>
            <button className="btn btn-sm pressable" onClick={() => songs.length && enqueue(songs.map(ncmToTrack))} disabled={!songs.length}>
              <ListMusic size={13} /> 加入队列
            </button>
          </div>
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {songs.length === 0 ? (
          <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: 16, textAlign: 'center' }}>加载中…</div>
        ) : (
          songs.map((s, i) => <SongRow key={`${s.id}-${i}`} song={s} index={i + 1} onPlay={() => onPlay(songs, i)} />)
        )}
      </div>
    </div>
  )
}

function SongRow({ song, index, onPlay }: { song: NcmSong; index?: number; onPlay: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onPlay}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}
    >
      {index !== undefined && (
        <span className="mono fs-micro" style={{ width: 20, color: 'var(--text-disabled)', textAlign: 'right', flexShrink: 0 }}>{index}</span>
      )}
      <SongCover song={song} size={44} radius={9} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="fs-body" style={{ display: 'block', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.name}
        </span>
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.artist}{song.album ? ` · ${song.album}` : ''}
        </span>
      </span>
      {song.duration > 0 && <span className="mono fs-micro" style={{ color: 'var(--text-disabled)' }}>{fmtTime(song.duration)}</span>}
    </button>
  )
}

/* -------------------------------- 我的 -------------------------------- */

function MineView() {
  const tracks = useMusic((s) => s.tracks)
  const queue = useMusic((s) => s.queue)
  const index = useMusic((s) => s.index)
  const playing = useMusic((s) => s.playing)
  const currentTime = useMusic((s) => s.currentTime)
  const defaultCoverId = useMusic((s) => s.defaultCoverId)
  const playLibrary = useMusic((s) => s.playLibrary)
  const playIndex = useMusic((s) => s.playIndex)
  const [manage, setManage] = useState(false)

  const queuePreview = useMemo(() => queue.slice(0, 60), [queue])

  return (
    <div style={{ padding: '4px 16px 20px' }}>
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span className="fs-body" style={{ color: 'var(--text-primary)', flex: 1 }}>本地曲库</span>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{tracks.length} 首</span>
          {tracks.length > 0 && (
            <button className="btn btn-sm pressable" style={{ marginLeft: 10 }} onClick={() => playLibrary(0)}>
              <Play size={13} /> 播放
            </button>
          )}
        </div>
        {tracks.length === 0 ? (
          <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
            还没有曲目。展开下方「歌单管理」上传本地音频，或填写在线音频地址。
          </div>
        ) : (
          tracks.map((t, i) => (
            <button
              key={t.id}
              className="pressable"
              onClick={() => playLibrary(i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}
            >
              <TrackCover track={t} size={40} radius={9} fallbackIdbId={defaultCoverId} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="fs-body" style={{ display: 'block', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{t.artist}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 14 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '10px 14px' }}>
            播放队列（{queue.length}）
          </div>
          {queuePreview.map((t, i) => {
            const active = i === index
            return (
              <button
                key={`${t.id}-${i}`}
                className="pressable"
                onClick={() => playIndex(i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}
              >
                <span style={{ display: 'flex', width: 18, color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {active && playing ? <Music size={15} /> : <Play size={15} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fs-body" style={{ display: 'block', color: active ? 'var(--text-primary)' : 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{t.artist}</span>
                </span>
                {active && <span className="mono fs-micro" style={{ color: 'var(--text-tertiary)' }}>{fmtTime(currentTime)}</span>}
              </button>
            )
          })}
          {queue.length > queuePreview.length && (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)', padding: '8px 14px' }}>
              仅显示前 {queuePreview.length} 首
            </div>
          )}
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: 16 }}>
        <button
          className="pressable"
          onClick={() => setManage((v) => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)' }}
        >
          <span className="fs-body">歌单管理</span>
          {manage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {manage && (
          <div style={{ marginTop: 14 }}>
            <PlaylistManager />
          </div>
        )}
      </div>
    </div>
  )
}