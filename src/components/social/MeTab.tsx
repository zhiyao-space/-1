import { useMemo, useState } from 'react'
import {
  Bell,
  ChevronRight,
  Download,
  Heart,
  LayoutList,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'
import { daysSince, exportSocialData, importSocialData, ME, useSocial, type SocialCharacter } from '../../store/social'
import { useToast } from '../../store/ui'
import { Dialog, EmptyHint, Pill, Sheet, SocialAvatar } from './SocialParts'
import { ImageField } from '../common'

/* 「mu社区恋爱交友软件」· 我的 Tab */

type ListSheet = 'posts' | 'favorites' | 'following'

const ENTRIES: { key: ListSheet; label: string; icon: typeof Heart }[] = [
  { key: 'posts', label: '我的动态', icon: LayoutList },
  { key: 'favorites', label: '我的收藏', icon: Star },
  { key: 'following', label: '我的关注', icon: Heart },
]

export default function MeTab({ onOpenCard }: { onOpenCard: (charId: string) => void }) {
  const profile = useSocial((s) => s.profile)
  const characters = useSocial((s) => s.characters)
  const posts = useSocial((s) => s.posts)
  const messages = useSocial((s) => s.messages)
  const following = useSocial((s) => s.following)
  const coupleSpace = useSocial((s) => s.coupleSpace)
  const settings = useSocial((s) => s.settings)
  const patchProfile = useSocial((s) => s.patchProfile)
  const patchSettings = useSocial((s) => s.patchSettings)
  const removePost = useSocial((s) => s.removePost)
  const resetAll = useSocial((s) => s.resetAll)
  const push = useToast((s) => s.push)

  const [editOpen, setEditOpen] = useState(false)
  const [coupleOpen, setCoupleOpen] = useState(false)
  const [sheet, setSheet] = useState<ListSheet | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [form, setForm] = useState<{ nickname: string; avatarId?: string; bio: string; interests: string; tags: string; zodiac: string; mbti: string }>({ nickname: '', bio: '', interests: '', tags: '', zodiac: '', mbti: '' })

  const charById = useMemo(() => {
    const m = new Map<string, SocialCharacter>()
    for (const c of characters) m.set(c.id, c)
    return m
  }, [characters])

  const myPosts = useMemo(() => posts.filter((p) => p.authorId === ME), [posts])

  const followingChars = useMemo(
    () => following.map((id) => charById.get(id)).filter((c): c is SocialCharacter => !!c),
    [following, charById]
  )

  const favorites = useMemo(() => {
    const out: { id: string; name: string; text: string }[] = []
    for (const [charId, list] of Object.entries(messages)) {
      const name = charById.get(charId)?.nickname ?? '未知角色'
      for (const m of list) if (m.favorited) out.push({ id: m.id, name, text: m.text })
    }
    return out
  }, [messages, charById])

  const coupleOptions = useMemo(() => characters.filter((c) => c.relationship === 'couple'), [characters])
  const partner = coupleSpace.charId ? charById.get(coupleSpace.charId) ?? null : null

  const openEdit = () => {
    setForm({
      nickname: profile.nickname,
      avatarId: profile.avatarId,
      bio: profile.bio,
      interests: profile.interests.join(', '),
      tags: profile.tags.join(', '),
      zodiac: profile.zodiac,
      mbti: profile.mbti,
    })
    setEditOpen(true)
  }

  const saveEdit = () => {
    const toList = (value: string) => value.split(',').map((x) => x.trim()).filter(Boolean)
    patchProfile({
      nickname: form.nickname.trim() || profile.nickname,
      avatarId: form.avatarId,
      bio: form.bio.trim(),
      interests: toList(form.interests),
      tags: toList(form.tags),
      zodiac: form.zodiac.trim(),
      mbti: form.mbti.trim(),
    })
    push('资料已更新')
    setEditOpen(false)
  }

  const setCouple = (charId: string) => {
    useSocial.setState((s) => ({ coupleSpace: { ...s.coupleSpace, charId, since: s.coupleSpace.since || Date.now() } }))
    push('已设置情侣空间')
    setCoupleOpen(false)
  }

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportSocialData()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'social-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    push('已导出备份')
  }

  const doImport = () => {
    if (importSocialData(importText)) {
      push('导入成功')
      setImportText('')
    } else {
      push('导入失败', 'error')
    }
  }

  const doReset = () => {
    resetAll()
    setResetOpen(false)
    push('已重置数据')
  }

  return (
    <>
      <div className="fx-scroll">
        {/* 资料卡 */}
        <div className="sc-hero" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <SocialAvatar avatarId={profile.avatarId} name={profile.nickname} size={64} status={profile.onlineStatus} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sc-title">{profile.nickname}</div>
              <div className="sc-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{profile.bio || '这个人很懒，什么都没写'}</div>
            </div>
            <button className="fx-btn fx-press" onClick={openEdit} style={{ minHeight: 36, padding: '0 12px' }}>
              <Pencil size={14} /> 编辑
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {profile.interests.map((t) => (
              <Pill key={`i-${t}`}>{t}</Pill>
            ))}
            {profile.tags.map((t) => (
              <Pill key={`t-${t}`}>{t}</Pill>
            ))}
          </div>
        </div>

        {/* 情侣空间 */}
        <div className="sc-list-item fx-press-soft" onClick={() => setCoupleOpen(true)} style={{ marginTop: 14, cursor: 'pointer' }}>
          <Heart size={20} color="var(--fx-accent)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--fx-t1)' }}>情侣空间</div>
            <div className="sc-sub" style={{ marginTop: 3 }}>
              {partner ? `${partner.nickname} · 在一起 ${daysSince(coupleSpace.since)} 天` : '还没遇到心动的人'}
            </div>
          </div>
          <ChevronRight size={18} color="var(--fx-t3)" />
        </div>

        {/* 三个入口 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {ENTRIES.map((e) => {
            const Icon = e.icon
            return (
              <div
                key={e.key}
                className="sc-list-item fx-press-soft"
                onClick={() => setSheet(e.key)}
                style={{ cursor: 'pointer' }}
              >
                <Icon size={20} color="var(--fx-t3)" />
                <div style={{ flex: 1, minWidth: 0, color: 'var(--fx-t1)' }}>{e.label}</div>
                <ChevronRight size={18} color="var(--fx-t3)" />
              </div>
            )
          })}
        </div>

        {/* 设置 */}
        <div className="sc-panel" style={{ marginTop: 16 }}>
          <div className="sc-sub" style={{ marginBottom: 8 }}>主题</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill on={settings.theme === 'dark'} onClick={() => patchSettings({ theme: 'dark' })}>
              深色
            </Pill>
            <Pill on={settings.theme === 'light'} onClick={() => patchSettings({ theme: 'light' })}>
              浅色
            </Pill>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fx-t2)' }}>
              <Bell size={16} /> 通知提醒
            </span>
            <button
              className={`sc-pill fx-press-soft${settings.notify ? ' sc-pill--on' : ''}`}
              onClick={() => patchSettings({ notify: !settings.notify })}
              style={{ border: 0, cursor: 'pointer' }}
            >
              {settings.notify ? '已开启' : '已关闭'}
            </button>
          </div>

          <div className="sc-sub" style={{ margin: '20px 0 8px' }}>数据备份</div>
          <button className="fx-btn fx-press" onClick={exportData} style={{ width: '100%' }}>
            <Download size={15} /> 导出备份
          </button>
          <textarea
            className="fx-textarea"
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="粘贴备份 JSON 后点「导入备份」"
            style={{ marginTop: 10 }}
          />
          <button className="fx-btn fx-press" onClick={doImport} style={{ width: '100%', marginTop: 10 }}>
            <Upload size={15} /> 导入备份
          </button>

          <button
            className="fx-btn fx-press"
            onClick={() => setResetOpen(true)}
            style={{ width: '100%', marginTop: 18, color: 'var(--fx-accent)' }}
          >
            <RotateCcw size={15} /> 重置数据
          </button>
        </div>

        <div className="sc-sub" style={{ textAlign: 'center', marginTop: 20 }}>mu社区恋爱交友软件 · v1</div>
        <div className="sc-sub" style={{ textAlign: 'center', marginTop: 4 }}>首批开放：消息 / 匹配 / 动态</div>
      </div>

      {/* 编辑资料 */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="编辑资料">
        <div className="sc-sub" style={{ marginBottom: 6 }}>头像</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <ImageField value={form.avatarId} onChange={(id) => setForm({ ...form, avatarId: id ?? undefined })} />
          <span className="sc-sub" style={{ lineHeight: 1.7 }}>点击从相册或文件导入，自动压缩后保存在本机</span>
        </div>
        <div className="sc-sub" style={{ marginBottom: 6 }}>昵称</div>
        <input className="fx-input" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
        <div className="sc-sub" style={{ margin: '14px 0 6px' }}>签名</div>
        <textarea
          className="fx-textarea"
          rows={2}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <div className="sc-sub" style={{ margin: '14px 0 6px' }}>兴趣（逗号分隔）</div>
        <input className="fx-input" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
        <div className="sc-sub" style={{ margin: '14px 0 6px' }}>标签（逗号分隔）</div>
        <input className="fx-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="sc-sub" style={{ marginBottom: 6 }}>星座</div>
            <input className="fx-input" value={form.zodiac} onChange={(e) => setForm({ ...form, zodiac: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="sc-sub" style={{ marginBottom: 6 }}>MBTI</div>
            <input className="fx-input" value={form.mbti} onChange={(e) => setForm({ ...form, mbti: e.target.value })} />
          </div>
        </div>
        <button className="fx-btn fx-btn--accent fx-press" onClick={saveEdit} style={{ width: '100%', marginTop: 18 }}>
          保存
        </button>
      </Sheet>

      {/* 情侣空间 */}
      <Sheet open={coupleOpen} onClose={() => setCoupleOpen(false)} title="情侣空间">
        <div className="sc-sub" style={{ lineHeight: 1.6 }}>
          {partner ? `当前：${partner.nickname} · 在一起 ${daysSince(coupleSpace.since)} 天` : '还没遇到心动的人'}
        </div>
        <div className="sc-sub" style={{ margin: '16px 0 8px' }}>设为情侣</div>
        {coupleOptions.length === 0 ? (
          <EmptyHint>先把好感度养到 75 以上</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coupleOptions.map((c) => (
              <div
                key={c.id}
                className="sc-list-item fx-press-soft"
                onClick={() => setCouple(c.id)}
                style={{ cursor: 'pointer' }}
              >
                <SocialAvatar avatarId={c.avatarId} name={c.nickname} size={40} status={c.onlineStatus} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--fx-t1)' }}>{c.nickname}</div>
                  <div className="sc-sub">好感度 {c.affinity}</div>
                </div>
                {coupleSpace.charId === c.id ? <Pill on>已设置</Pill> : <Pill>选择</Pill>}
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* 我的动态 / 收藏 / 关注 */}
      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'posts' ? '我的动态' : sheet === 'favorites' ? '我的收藏' : '我的关注'}
      >
        {sheet === 'posts' &&
          (myPosts.length === 0 ? (
            <EmptyHint>还没有发过动态</EmptyHint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myPosts.map((p) => (
                <div key={p.id} className="sc-list-item" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        color: 'var(--fx-t1)',
                        fontSize: 'calc(12.5px * var(--fs-scale))',
                        lineHeight: 1.55,
                      }}
                    >
                      {p.content}
                    </div>
                    <div className="sc-sub" style={{ marginTop: 4 }}>
                      赞 {p.likes.length} · 评论 {p.comments.length}
                    </div>
                  </div>
                  <button
                    className="fx-press-soft"
                    onClick={() => {
                      removePost(p.id)
                      push('已删除')
                    }}
                    title="删除"
                    style={{ background: 'none', border: 0, color: 'var(--fx-t3)', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ))}

        {sheet === 'favorites' &&
          (favorites.length === 0 ? (
            <EmptyHint>还没有收藏的消息</EmptyHint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {favorites.map((f) => (
                <div key={f.id} className="sc-list-item">
                  <Star size={16} color="var(--fx-accent)" />
                  <div className="sc-sub" style={{ flex: 1, minWidth: 0, color: 'var(--fx-t2)', lineHeight: 1.5 }}>
                    <span className="sc-comment__who">{f.name}</span>：{f.text}
                  </div>
                </div>
              ))}
            </div>
          ))}

        {sheet === 'following' &&
          (followingChars.length === 0 ? (
            <EmptyHint>还没有关注的人</EmptyHint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {followingChars.map((c) => (
                <div
                  key={c.id}
                  className="sc-list-item fx-press-soft"
                  onClick={() => {
                    setSheet(null)
                    onOpenCard(c.id)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <SocialAvatar avatarId={c.avatarId} name={c.nickname} size={40} status={c.onlineStatus} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fx-t1)' }}>{c.nickname}</div>
                    <div className="sc-sub" style={{ lineHeight: 1.5 }}>{c.bio}</div>
                  </div>
                  <ChevronRight size={18} color="var(--fx-t3)" />
                </div>
              ))}
            </div>
          ))}
      </Sheet>

      {/* 重置确认 */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <div className="sc-title">重置数据</div>
        <div className="sc-sub" style={{ marginTop: 8, lineHeight: 1.6 }}>
          将清空档案、动态与聊天记录，恢复为初始状态，且不可撤销。确定继续吗？
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="fx-btn fx-press" onClick={() => setResetOpen(false)} style={{ flex: 1 }}>
            取消
          </button>
          <button className="fx-btn fx-btn--accent fx-press" onClick={doReset} style={{ flex: 1 }}>
            确定
          </button>
        </div>
      </Dialog>
    </>
  )
}