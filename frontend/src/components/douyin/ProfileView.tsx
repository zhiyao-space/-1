import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Eye, Palette, Pencil, Send, Sparkles, UserPlus, Users } from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import { useRelations } from '../../store/relations'
import { useToast } from '../../store/ui'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import {
  coverImageUrl,
  filterCss,
  layerStyle,
  themeAccent,
  type DyAuthor,
} from '../../lib/douyinEngine'
import { DyAvatar, LayerContent, STYLE_LABEL, formatCount, useCoverSrc, DySheet } from './parts'
import { VideoGrid } from './FeedView'
import AccountSheet from './AccountSheet'
import ProfileDecorSheet from './ProfileDecorSheet'

const DIMS = ['魅力', '才华', '幽默', '学识', '运动', '生活']

function seeded(seed: string, mod: number, salt: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = ((h ^ seed.charCodeAt(i)) * 16777619) >>> 0
  h = (h + salt * 2654435761) >>> 0
  return h % mod
}

function Banner({ profileKey, prompt }: { profileKey: string; prompt: string }) {
  const profile = useDouyin((s) => s.profiles[profileKey])
  const src = useCoverSrc(profile?.bgImage ?? null)
  const hue = seeded(profileKey, 360, 7)
  const filter = filterCss(profile?.filter)
  const layers = profile?.layers ?? []
  return (
    <>
      <div className="dy-profile-banner">
        <div
          className="dy-decor-bg"
          style={
            src
              ? { backgroundImage: `url(${src})`, filter }
              : {
                  background: `linear-gradient(150deg, hsl(${hue} 55% 26%), hsl(${(hue + 60) % 360} 60% 12%))`,
                  filter,
                }
          }
        />
        <div className="dy-profile-banner-mask" />
        {layers.map((l) => (
          <span key={l.id} className="dy-decor-static" style={layerStyle(l)}>
            <LayerContent layer={l} />
          </span>
        ))}
        <span className="dy-cover-emoji" style={{ left: 'auto', right: 22, top: 66, opacity: 0.22 }}>
          <Sparkles size={40} color="#fff" strokeWidth={1.5} />
        </span>
      </div>
      <span style={{ display: 'none' }}>{prompt}</span>
    </>
  )
}

export default function ProfileView({
  author,
  onBack,
  onOpenAuthor,
  onOpenDm,
  initialTab = 'works',
}: {
  author: DyAuthor
  onBack?: () => void
  onOpenAuthor: (a: DyAuthor) => void
  onOpenDm: (a: DyAuthor) => void
  initialTab?: 'works' | 'likes' | 'favorites'
}) {
  const profiles = useDouyin((s) => s.profiles)
  const videos = useDouyin((s) => s.videos)
  const follows = useDouyin((s) => s.follows)
  const liked = useDouyin((s) => s.liked)
  const favorites = useDouyin((s) => s.favorites)
  const visitors = useDouyin((s) => s.visitors)
  const ensureProfile = useDouyin((s) => s.ensureProfile)
  const toggleFollow = useDouyin((s) => s.toggleFollow)
  const toast = useToast((s) => s.push)
  const relations = useRelations((s) => s.relations)

  const [tab, setTab] = useState(initialTab)
  const [sheet, setSheet] = useState<'edit' | 'visitors' | 'account' | 'decor' | null>(null)

  useEffect(() => {
    ensureProfile(author)
  }, [author, ensureProfile])

  const profile = profiles[author.key]

  const works = useMemo(() => videos.filter((v) => v.author.key === author.key), [videos, author.key])
  const likeTab = useMemo(() => {
    if (author.kind === 'user') return videos.filter((v) => liked.includes(v.id))
    return videos.filter((v) => v.author.key !== author.key && seeded(author.key + v.id, 3, 11) === 0)
  }, [videos, liked, author])
  const favTab = useMemo(() => {
    if (author.kind === 'user') return videos.filter((v) => favorites.includes(v.id))
    return videos.filter((v) => seeded(author.key + v.id, 5, 23) === 0)
  }, [videos, favorites, author])

  const myVisitors = useMemo(() => visitors.filter((v) => v.target === author.key), [visitors, author.key])

  if (!profile) return <div className="dy-page" />

  const isSelf = author.kind === 'user'
  const isFollowed = follows.includes(author.key)
  const dims = DIMS.map((label, i) => ({ label, v: 38 + seeded(author.key + label, 58, i) }))

  // 好感度：优先取关系网里的 bond，否则按人设派生
  const rel = relations.find(
    (r) =>
      (r.fromKey === 'user' && r.toKey === `character:${author.id}`) ||
      (r.toKey === 'user' && r.fromKey === `character:${author.id}`)
  )
  const bond = rel?.bond ?? 20 + seeded(author.key, 70, 31)
  const fans = 1200 + seeded(author.key, 420000, 3)
  const totalLikes = works.reduce((n, v) => n + v.stats.likes, 0) || seeded(author.key, 98000, 5)

  const grid = tab === 'works' ? works : tab === 'likes' ? likeTab : favTab
  const emptyText = tab === 'works' ? '还没有作品' : tab === 'likes' ? '暂无喜欢的作品' : '暂无收藏'

  return (
    <div className="dy-page" style={{ '--dy-accent': themeAccent(profile.theme) } as React.CSSProperties}>
      <div className="dy-page-head" style={{ borderBottom: 0, position: 'relative', zIndex: 5 }}>
        {onBack && (
          <button className="dy-icon-btn pressable" onClick={onBack}>
            <ChevronLeft size={17} />
          </button>
        )}
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isSelf ? '我' : profile.nickname}
        </div>
        {isSelf && (
          <button className="dy-icon-btn pressable" onClick={() => setSheet('edit')} title="编辑主页">
            <Pencil size={15} />
          </button>
        )}
      </div>

      <div className="dy-scroll" style={{ padding: 0 }}>
        <Banner profileKey={author.key} prompt={profile.bgPrompt} />

        <div className="dy-profile-id" style={{ marginTop: -58 }}>
          <DyAvatar author={{ ...author, avatarId: profile.avatarId }} size={64} />
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div className="dy-profile-name">{profile.nickname}</div>
            <div className="dy-profile-sub">
              抖音号：dy_{seeded(author.key, 99999999, 13)}
              {profile.privacy.ipVisible && <> · IP属地：{profile.privacy.ipCustom || profile.ip}</>}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {profile.tags.map((t) => (
            <span key={t} className="dy-pill" style={{ fontSize: 11 }}>
              #{t}
            </span>
          ))}
          {profile.privacy.ageVisible && profile.age && <span className="dy-pill" style={{ fontSize: 11 }}>{profile.age}岁</span>}
          {profile.privacy.gender !== '不显示' && <span className="dy-pill" style={{ fontSize: 11 }}>{profile.privacy.gender}</span>}
        </div>

        <div style={{ padding: '10px 16px 0', fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
          {profile.bio}
        </div>

        <div className="dy-stats">
          <div className="dy-stat">
            <b>{formatCount(isSelf ? follows.length : Math.round(fans / 26))}</b>
            <span>关注</span>
          </div>
          <div className="dy-stat">
            <b>{formatCount(fans)}</b>
            <span>粉丝</span>
          </div>
          <div className="dy-stat">
            <b>{formatCount(totalLikes)}</b>
            <span>获赞</span>
          </div>
          <div className="dy-stat">
            <b>{formatCount(favTab.length)}</b>
            <span>收藏</span>
          </div>
        </div>

        <div className="dy-actions" style={{ flexWrap: 'wrap' }}>
          {isSelf ? (
            <>
              <button className="dy-btn dy-btn--primary pressable" onClick={() => setSheet('edit')}>
                <Pencil size={14} /> 编辑主页
              </button>
              <button className="dy-btn dy-btn--ghost pressable" onClick={() => setSheet('decor')}>
                <Palette size={14} /> 主页装扮
              </button>
              <button className="dy-btn dy-btn--ghost pressable" onClick={() => setSheet('account')}>
                <Users size={14} /> 切换账号
              </button>
              <button className="dy-btn dy-btn--ghost pressable" onClick={() => setSheet('visitors')}>
                <Eye size={14} /> 访客记录
              </button>
            </>
          ) : (
            <>
              <button
                className={`dy-btn pressable ${isFollowed ? 'dy-btn--ghost' : 'dy-btn--primary'}`}
                onClick={() => {
                  toggleFollow(author.key)
                  toast(isFollowed ? '已取消关注' : `已关注 @${author.name}`)
                }}
              >
                <UserPlus size={14} /> {isFollowed ? '已关注' : '关注'}
              </button>
              <button className="dy-btn dy-btn--ghost pressable" onClick={() => onOpenDm(author)}>
                <Send size={14} /> 私信
              </button>
              <button className="dy-btn dy-btn--ghost pressable" onClick={() => setSheet('edit')}>
                <Pencil size={14} /> 编辑此主页
              </button>
            </>
          )}
        </div>

        {/* 人设卡片 */}
        <div className="dy-card">
          <div className="dy-card-title">人设档案</div>
          <div className="dy-kv">
            <span>风格定位</span>
            <span>{STYLE_LABEL[videos.find((v) => v.author.key === author.key)?.style ?? 'life']}</span>
          </div>
          <div className="dy-kv">
            <span>年龄 / 性别</span>
            <span>
              {profile.privacy.ageVisible && profile.age ? `${profile.age} 岁` : '未公开'} ·{' '}
              {profile.privacy.gender === '不显示' ? '未公开' : profile.privacy.gender}
            </span>
          </div>
          <div className="dy-kv">
            <span>作品 / 粉丝</span>
            <span>
              {works.length} / {formatCount(fans)}
            </span>
          </div>
          <div className="dy-bars">
            {dims.map((d) => (
              <div key={d.label} style={{ flex: 1 }}>
                <div className="dy-bar" style={{ height: `${d.v}%` }} />
                <div className="dy-bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 好感度 */}
        <div className="dy-card">
          <div className="dy-card-title">与你的关系</div>
          <div className="dy-kv">
            <span>关系</span>
            <span>{rel ? rel.note || '已建立关系' : isSelf ? '本人' : '互相关注中'}</span>
          </div>
          <div className="dy-kv" style={{ marginTop: 4 }}>
            <span>好感度（双向）</span>
            <span style={{ color: '#ff8fa3', fontWeight: 600 }}>{bond}</span>
          </div>
          <div className="dy-bond">
            <span style={{ width: `${Math.min(100, bond)}%` }} />
          </div>
        </div>

        {/* 作品 / 喜欢 / 收藏 */}
        <div className="dy-stats" style={{ padding: '4px 16px 8px', gap: 18 }}>
          {(
            [
              { id: 'works', label: `作品 ${works.length}` },
              { id: 'likes', label: `喜欢 ${likeTab.length}` },
              { id: 'favorites', label: `收藏 ${favTab.length}` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              className="pressable"
              onClick={() => setTab(t.id)}
              style={{
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === t.id ? '2px solid #fff' : '2px solid transparent',
                paddingBottom: 5,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <VideoGrid list={grid} empty={emptyText} />
      </div>

      {sheet === 'visitors' && (
        <VisitorSheet
          records={myVisitors}
          onClose={() => setSheet(null)}
          onOpen={(a) => {
            setSheet(null)
            onOpenAuthor(a)
          }}
        />
      )}

      {sheet === 'edit' && <EditSheet author={author} onClose={() => setSheet(null)} />}
      {sheet === 'account' && <AccountSheet onClose={() => setSheet(null)} />}
      {sheet === 'decor' && <ProfileDecorSheet author={author} onClose={() => setSheet(null)} />}
    </div>
  )
}

function VisitorSheet({
  records,
  onClose,
  onOpen,
}: {
  records: { id: string; visitor: DyAuthor; at: number; source: string }[]
  onClose: () => void
  onOpen: (a: DyAuthor) => void
}) {
  const today = new Date().setHours(0, 0, 0, 0)
  const todayCount = records.filter((r) => r.at >= today).length
  const week = Array.from({ length: 7 }, (_, i) => {
    const dayStart = today - (6 - i) * 86400000
    return records.filter((r) => r.at >= dayStart && r.at < dayStart + 86400000).length
  })
  const topBar = Math.max(1, ...week)
  const counter = new Map<string, { a: DyAuthor; n: number }>()
  for (const r of records) {
    const cur = counter.get(r.visitor.key)
    counter.set(r.visitor.key, { a: r.visitor, n: (cur?.n ?? 0) + 1 })
  }
  const hot = [...counter.values()].sort((a, b) => b.n - a.n).slice(0, 4)

  return (
    <DySheet title="访客记录" onClose={onClose}>
      <div className="dy-kv">
        <span>今日访客</span>
        <span>{todayCount}</span>
      </div>
      <div className="dy-card-title" style={{ marginTop: 12 }}>
        本周访客趋势
      </div>
      <div className="dy-bars">
        {week.map((n, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div className="dy-bar" style={{ height: `${Math.max(6, (n / topBar) * 100)}%` }} />
            <div className="dy-bar-label">{['一', '二', '三', '四', '五', '六', '日'][(new Date().getDay() + 6 + i) % 7]}</div>
          </div>
        ))}
      </div>
      <div className="dy-card-title" style={{ marginTop: 14 }}>
        热门访客
      </div>
      {hot.length === 0 && <div className="dy-empty">还没有人来过</div>}
      {hot.map((h) => (
        <button
          key={h.a.key}
          className="dy-msg pressable"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onOpen(h.a)}
        >
          <DyAvatar author={h.a} size={38} />
          <div className="dy-msg-body">
            <span className="dy-msg-name">{h.a.name}</span>
            <span className="dy-msg-text">来过 {h.n} 次</span>
          </div>
        </button>
      ))}
      <div className="dy-card-title" style={{ marginTop: 14 }}>
        最近访客
      </div>
      {records.length === 0 && <div className="dy-empty">还没有访客，多发作品试试</div>}
      {records.slice(0, 30).map((r) => (
        <button
          key={r.id}
          className="dy-msg pressable"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onOpen(r.visitor)}
        >
          <DyAvatar author={r.visitor} size={38} />
          <div className="dy-msg-body">
            <span className="dy-msg-name">
              {r.visitor.name}
              <span className="dy-pill">{r.source === 'video' ? '来自视频' : r.source === 'comment' ? '来自评论' : '来自推荐'}</span>
            </span>
            <span className="dy-msg-text">{new Date(r.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </button>
      ))}
    </DySheet>
  )
}

function EditSheet({ author, onClose }: { author: DyAuthor; onClose: () => void }) {
  const profile = useDouyin((s) => s.profiles[author.key])
  const updateProfile = useDouyin((s) => s.updateProfile)
  const toast = useToast((s) => s.push)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  const [nickname, setNickname] = useState(profile?.nickname ?? author.name)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [tags, setTags] = useState((profile?.tags ?? []).join(' '))
  const [bgPrompt, setBgPrompt] = useState(profile?.bgPrompt ?? '')
  const [generating, setGenerating] = useState(false)

  if (!profile) return null

  const save = () => {
    updateProfile(author.key, {
      nickname: nickname.trim().slice(0, 20) || author.name,
      bio: bio.trim().slice(0, 80),
      tags: tags.split(/[\s,，]+/).filter(Boolean).slice(0, 4),
    })
    toast('主页已保存')
    onClose()
  }

  const uploadAvatar = async (file: File) => {
    const blob = await compressImage(file, 512)
    updateProfile(author.key, { avatarId: await putBlob(blob) })
    toast('头像已更新')
  }

  const uploadBg = async (file: File) => {
    const blob = await compressImage(file, 1280)
    updateProfile(author.key, { bgImage: await putBlob(blob) })
    toast('背景已更新')
  }

  return (
    <DySheet
      title="编辑主页"
      onClose={onClose}
      footer={
        <div className="dy-sheet-foot">
          <button className="dy-btn dy-btn--primary pressable" onClick={save}>
            保存
          </button>
        </div>
      }
    >
      <div className="dy-card-title">头像</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <DyAvatar author={{ ...author, avatarId: profile.avatarId }} size={54} />
        <button className="dy-btn dy-btn--ghost pressable" style={{ flex: 0, padding: '0 14px' }} onClick={() => fileRef.current?.click()}>
          上传头像
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadAvatar(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="dy-card-title">主页背景</div>
      <input className="dy-input" style={{ width: '100%', marginBottom: 8 }} placeholder="描述你想要的背景画面" value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="dy-btn dy-btn--ghost pressable"
          disabled={generating}
          onClick={() => {
            const p = bgPrompt.trim() || `${nickname} 的主页背景，氛围感，柔光`
            setGenerating(true)
            updateProfile(author.key, { bgPrompt: p, bgImage: coverImageUrl(p, 'landscape_16_9') })
            window.setTimeout(() => {
              setGenerating(false)
              toast('背景已生成')
            }, 900)
          }}
        >
          <Sparkles size={14} /> {generating ? '生成中…' : 'AI 生成背景'}
        </button>
        <button className="dy-btn dy-btn--ghost pressable" onClick={() => bgFileRef.current?.click()}>
          上传图片
        </button>
        <button
          className="dy-btn dy-btn--ghost pressable"
          onClick={() => {
            updateProfile(author.key, { bgImage: null })
            toast('已恢复渐变背景')
          }}
        >
          恢复默认
        </button>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadBg(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="dy-card-title">昵称</div>
      <input className="dy-input" style={{ width: '100%', marginBottom: 12 }} maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />

      <div className="dy-card-title">简介（80 字）</div>
      <textarea className="dy-textarea" maxLength={80} value={bio} onChange={(e) => setBio(e.target.value)} />

      <div className="dy-card-title" style={{ marginTop: 12 }}>
        标签（空格分隔，最多 4 个）
      </div>
      <input className="dy-input" style={{ width: '100%', marginBottom: 12 }} value={tags} onChange={(e) => setTags(e.target.value)} />

      <div className="dy-card-title">隐私设置</div>
      <button
        className="dy-sheet-row pressable"
        onClick={() => updateProfile(author.key, { privacy: { ...profile.privacy, ipVisible: !profile.privacy.ipVisible } })}
      >
        <span style={{ flex: 1 }}>IP 属地</span>
        <span style={{ color: profile.privacy.ipVisible ? '#2ed573' : 'rgba(255,255,255,0.4)' }}>
          {profile.privacy.ipVisible ? '显示' : '不显示'}
        </span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', width: 60 }}>自定义属地</span>
        <input
          className="dy-input"
          placeholder="如：冰岛"
          value={profile.privacy.ipCustom}
          onChange={(e) => updateProfile(author.key, { privacy: { ...profile.privacy, ipCustom: e.target.value } })}
        />
      </div>
      <div className="dy-sheet-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ flex: 1 }}>性别</span>
        {(['男', '女', '不显示'] as const).map((g) => (
          <button
            key={g}
            className={`dy-chip pressable${profile.privacy.gender === g ? ' dy-chip--on' : ''}`}
            onClick={() => updateProfile(author.key, { privacy: { ...profile.privacy, gender: g } })}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="dy-sheet-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ flex: 1 }}>年龄</span>
        <input
          className="dy-input"
          style={{ width: 70 }}
          placeholder="不填即隐藏"
          value={profile.privacy.age}
          onChange={(e) =>
            updateProfile(author.key, {
              privacy: { ...profile.privacy, age: e.target.value.replace(/\D/g, '').slice(0, 3), ageVisible: !!e.target.value },
            })
          }
        />
        <button
          className={`dy-chip pressable${profile.privacy.ageVisible ? ' dy-chip--on' : ''}`}
          onClick={() => updateProfile(author.key, { privacy: { ...profile.privacy, ageVisible: !profile.privacy.ageVisible } })}
        >
          {profile.privacy.ageVisible ? '公开' : '隐藏'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', padding: '8px 4px 0', lineHeight: 1.6 }}>
        背景滤镜、贴纸、文字图层、主题模板请到「主页装扮」中设置。
      </div>
    </DySheet>
  )
}