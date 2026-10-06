import { useMemo, useRef, useState } from 'react'
import { AtSign, Image as ImageIcon, MapPin, Music, Palette, Sparkles, Sun, Users } from 'lucide-react'
import { useDouyin, userAuthor } from '../../store/douyin'
import { useMusic } from '../../store/music'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import {
  DY_LOCATIONS,
  FILTER_PRESETS,
  MUSIC_LIBRARY,
  VISIBILITY_META,
  coverImageUrl,
  filterCss,
  type DyAuthor,
  type DyBgm,
  type DyVisibility,
} from '../../lib/douyinEngine'

const SUGGESTED_TAGS = ['日常', 'vlog', '随拍', '美食', '旅行', '穿搭', '音乐', '运动', '搞笑', '知识']
const VISIBILITIES: DyVisibility[] = ['public', 'friends', 'private']

export default function PublishView({ onDone }: { onDone: () => void }) {
  const publishVideo = useDouyin((s) => s.publishVideo)
  const videos = useDouyin((s) => s.videos)
  const follows = useDouyin((s) => s.follows)
  const myTracks = useMusic((s) => s.tracks)
  const toast = useToast((s) => s.push)

  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [cover, setCover] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [bgm, setBgm] = useState<DyBgm | null>(null)
  const [filter, setFilter] = useState('none')
  const [location, setLocation] = useState('不显示')
  const [visibility, setVisibility] = useState<DyVisibility>('public')
  const [mentions, setMentions] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const coverUrl = useBlobURL(cover && !/^https?:/.test(cover) ? cover : null)
  const shown = cover && /^https?:/.test(cover) ? cover : coverUrl
  const filt = filterCss(filter)

  /** @好友候选：已关注优先，去重，排除自己 */
  const mentionPool = useMemo(() => {
    const me = userAuthor().id
    const map = new Map<string, DyAuthor>()
    videos.forEach((v) => {
      if (v.author.id !== me) map.set(v.author.key, v.author)
    })
    const all = [...map.values()]
    return [...all.filter((a) => follows.includes(a.key)), ...all.filter((a) => !follows.includes(a.key))].slice(0, 8)
  }, [videos, follows])

  /** 配乐资源库：内置曲库 + 我的曲库 */
  const musicPool = useMemo(() => {
    const mine = myTracks.map((t) => ({ title: t.title, artist: t.artist }))
    return [...mine, ...MUSIC_LIBRARY]
  }, [myTracks])

  const toggleTag = (t: string) =>
    setTags((list) => (list.includes(t) ? list.filter((x) => x !== t) : list.length >= 4 ? list : [...list, t]))

  const toggleMention = (key: string) =>
    setMentions((list) => (list.includes(key) ? list.filter((x) => x !== key) : list.length >= 3 ? list : [...list, key]))

  const sameBgm = (a: DyBgm, b: DyBgm) => a.title === b.title && a.artist === b.artist

  const upload = async (file: File) => {
    try {
      const blob = await compressImage(file, 1080)
      setCover(await putBlob(blob))
      toast('封面已上传')
    } catch {
      toast('封面处理失败')
    }
  }

  const genCover = () => {
    const p = prompt.trim() || desc.trim() || '氛围感短视频封面，竖构图，电影感打光'
    setBusy(true)
    setCover(coverImageUrl(p))
    window.setTimeout(() => {
      setBusy(false)
      toast('封面已生成')
    }, 900)
  }

  const publish = () => {
    if (!desc.trim()) {
      toast('写点文案再发布吧')
      return
    }
    publishVideo({
      description: desc,
      tags,
      coverImageId: cover,
      bgm: bgm ?? undefined,
      location,
      filter,
      visibility,
      mentions,
    })
    toast(visibility === 'private' ? '已发布到仅自己可见' : '作品已发布')
    onDone()
  }

  return (
    <div className="dy-page">
      <div className="dy-page-head">
        <span style={{ fontSize: 15, fontWeight: 600 }}>发布作品</span>
      </div>

      <div className="dy-scroll">
        <button className="dy-upload pressable" onClick={() => fileRef.current?.click()}>
          {shown ? (
            <img
              src={shown}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: filt }}
            />
          ) : (
            <>
              <ImageIcon size={26} />
              <span>上传封面 / 或点下面 AI 生成</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
            e.target.value = ''
          }}
        />

        <div className="dy-sheet-foot" style={{ border: 0, padding: '10px 0 4px' }}>
          <input
            className="dy-input"
            placeholder="描述想要的封面画面"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            className="dy-btn dy-btn--ghost pressable"
            style={{ flex: 'none', padding: '0 12px', height: 36, whiteSpace: 'nowrap' }}
            disabled={busy}
            onClick={genCover}
          >
            <Sparkles size={14} /> {busy ? '生成中' : 'AI 生成'}
          </button>
        </div>

        {/* ---------------- 创作资源库 ---------------- */}
        <div className="dy-card-title" style={{ margin: '14px 2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Music size={14} /> 配乐
        </div>
        <div className="dy-reslib">
          <button
            className={`dy-chip pressable${bgm ? '' : ' dy-chip--on'}`}
            onClick={() => setBgm(null)}
          >
            原声
          </button>
          {musicPool.map((m, i) => (
            <button
              key={`${m.title}-${m.artist}-${i}`}
              className={`dy-chip pressable${bgm && sameBgm(bgm, m) ? ' dy-chip--on' : ''}`}
              onClick={() => setBgm(m)}
            >
              {m.title} · {m.artist}
            </button>
          ))}
        </div>

        <div className="dy-card-title" style={{ margin: '14px 2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Palette size={14} /> 滤镜
        </div>
        <div className="dy-reslib">
          {FILTER_PRESETS.map((f) => (
            <button
              key={f.id}
              className={`dy-chip pressable${filter === f.id ? ' dy-chip--on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="dy-card-title" style={{ margin: '14px 2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sun size={14} /> 位置
        </div>
        <div className="dy-reslib">
          {DY_LOCATIONS.map((l) => (
            <button
              key={l}
              className={`dy-chip pressable${location === l ? ' dy-chip--on' : ''}`}
              onClick={() => setLocation(l)}
            >
              <MapPin size={11} /> {l}
            </button>
          ))}
        </div>

        <div className="dy-card-title" style={{ margin: '14px 2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} /> 谁可以看
        </div>
        <div className="dy-reslib">
          {VISIBILITIES.map((v) => (
            <button
              key={v}
              className={`dy-chip pressable${visibility === v ? ' dy-chip--on' : ''}`}
              onClick={() => setVisibility(v)}
            >
              {VISIBILITY_META[v].label}
            </button>
          ))}
        </div>

        {mentionPool.length > 0 && (
          <>
            <div className="dy-card-title" style={{ margin: '14px 2px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AtSign size={14} /> @好友（最多 3 个）
            </div>
            <div className="dy-reslib">
              {mentionPool.map((a) => (
                <button
                  key={a.key}
                  className={`dy-chip pressable${mentions.includes(a.key) ? ' dy-chip--on' : ''}`}
                  onClick={() => toggleMention(a.key)}
                >
                  @{a.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="dy-card-title" style={{ margin: '14px 2px 8px' }}>文案</div>
        <textarea
          className="dy-textarea"
          maxLength={80}
          placeholder="说点什么…（最多 80 字）"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="dy-card-title" style={{ margin: '14px 2px 8px' }}>话题（最多 4 个）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTED_TAGS.map((t) => (
            <button key={t} className={`dy-chip pressable${tags.includes(t) ? ' dy-chip--on' : ''}`} onClick={() => toggleTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="dy-sheet-foot">
        <button className="dy-btn dy-btn--primary pressable" onClick={publish}>
          发布
        </button>
      </div>
    </div>
  )
}