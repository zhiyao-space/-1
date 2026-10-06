import { useMemo, useState } from 'react'
import {
  Ban,
  ChevronLeft,
  Flame,
  ImagePlus,
  MessageSquarePlus,
  Mic,
  Palette,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  VolumeX,
  X,
} from 'lucide-react'
import { generateMicroblogDraft, hasCityAi } from '../../lib/cityEngine'
import { localMicroblogPost } from '../../lib/cityCatalog'
import {
  ME_ID,
  fmtCityTime,
  personById,
  useMe,
  useMulCity,
  type DirectMessage,
  type MicroblogPost,
  type MicroblogTheme,
  type Person,
  type PollOption,
} from '../../store/mulCity'
import { Avatar, Card, Empty, Field, PersonRow, Row, Sheet, Stat, SubTabs } from './cityParts'
import { MicroPostCard } from './microblogParts'
import { useCityNav } from './cityNav'
import '../../styles/cityMicroblog.css'

/* ============================================================
   Tab10 · 微博（仿 Twitter/X + 微博混合体）
   推荐 | 关注 | 热搜 | 空间 | 社群 | 私信 | 我的
   复用 MicroPostCard 渲染每条微博，复用 Sheet 作为发布面板
   ============================================================ */

type Sub = 'rec' | 'follow' | 'hot' | 'space' | 'community' | 'dm' | 'mine'

const SUBS: { key: Sub; label: string }[] = [
  { key: 'rec', label: '推荐' },
  { key: 'follow', label: '关注' },
  { key: 'hot', label: '热搜' },
  { key: 'space', label: '空间' },
  { key: 'community', label: '社群' },
  { key: 'dm', label: '私信' },
  { key: 'mine', label: '我的' },
]

const THEMES: { key: MicroblogTheme; label: string }[] = [
  { key: 'mono', label: '黑白' },
  { key: 'color', label: '霓虹' },
  { key: 'real', label: '写实' },
]

const MAX_LEN = 280

let seq = 0
function uid(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`
}

function sortByTime(list: MicroblogPost[]): MicroblogPost[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt)
}

function isMutedPost(post: MicroblogPost, muted: string[]): boolean {
  if (!muted.length) return false
  return post.tags.some((t) => muted.includes(t)) || muted.some((m) => post.content.includes(`#${m}#`))
}

function matchesTopic(post: MicroblogPost, title: string): boolean {
  if (!title) return true
  if (post.content.includes(title) || post.content.includes(`#${title}#`)) return true
  return post.tags.some((t) => t.includes(title) || title.includes(t))
}

export default function MicroblogTab() {
  const [sub, setSub] = useState<Sub>('rec')
  const [hotPick, setHotPick] = useState('')
  const [composing, setComposing] = useState(false)
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [creatingCommunity, setCreatingCommunity] = useState(false)
  const [blocked, setBlocked] = useState<string[]>([])
  const theme = useMulCity((s) => s.microblog.theme)

  const go = (v: Sub) => {
    setSub(v)
    if (v !== 'hot') setHotPick('')
  }

  return (
    <div className={`cx-mb-root cx-mb-theme--${theme}`}>
      <SubTabs tabs={SUBS} value={sub} onChange={go} />

      <div className="cx-scroll cx-mb-scroll">
        {sub === 'rec' && (
          <RecommendFeed
            blocked={blocked}
            onPickHot={(t) => {
              setHotPick(t)
              setSub('hot')
            }}
          />
        )}
        {sub === 'follow' && <FollowFeed />}
        {sub === 'hot' && <HotView pick={hotPick} onPick={setHotPick} />}
        {sub === 'space' && <SpaceView onCreate={() => setCreatingSpace(true)} />}
        {sub === 'community' && <CommunityView onCreate={() => setCreatingCommunity(true)} />}
        {sub === 'dm' && <DmView />}
        {sub === 'mine' && <MineView blocked={blocked} onBlockedChange={setBlocked} />}
      </div>

      {sub !== 'dm' && (
        <button className="cx-mb-fab fx-press" onClick={() => setComposing(true)} aria-label="发布微博">
          <Plus size={24} />
        </button>
      )}

      <ComposerSheet open={composing} onClose={() => setComposing(false)} />
      <CreateSpaceSheet open={creatingSpace} onClose={() => setCreatingSpace(false)} />
      <CreateCommunitySheet open={creatingCommunity} onClose={() => setCreatingCommunity(false)} />
    </div>
  )
}

/* ---------- 推荐 ---------- */

function RecommendFeed({ blocked, onPickHot }: { blocked: string[]; onPickHot: (t: string) => void }) {
  const posts = useMulCity((s) => s.microblog.posts)
  const muted = useMulCity((s) => s.microblog.muted)
  const hot = useMulCity((s) => s.microblog.hotSearch)

  const list = useMemo(
    () => sortByTime(posts.filter((p) => !isMutedPost(p, muted) && !blocked.includes(p.authorId))),
    [posts, muted, blocked]
  )

  return (
    <>
      {hot.length > 0 && (
        <>
          <div className="cx-sechead">
            <span className="cx-sechead__t">热门话题</span>
            <span className="cx-sechead__sub">实时</span>
          </div>
          <div className="cx-mb-hotstrip">
            {hot.slice(0, 9).map((t) => (
              <button key={t.id} className="cx-mb-chip fx-press" onClick={() => onPickHot(t.title)}>
                <Flame size={12} /> {t.title}
              </button>
            ))}
          </div>
        </>
      )}

      {list.length ? (
        list.map((p) => <MicroPostCard key={p.id} post={p} />)
      ) : (
        <Empty icon={<MessageSquarePlus size={28} />} text="推荐流暂时空空的" hint="发布一条微博，或去关注更多居民" />
      )}
    </>
  )
}

/* ---------- 关注 ---------- */

function FollowFeed() {
  const posts = useMulCity((s) => s.microblog.posts)
  const following = useMulCity((s) => s.microblog.following)
  const muted = useMulCity((s) => s.microblog.muted)

  const list = useMemo(
    () =>
      sortByTime(
        posts.filter((p) => (p.authorId === ME_ID || following.includes(p.authorId)) && !isMutedPost(p, muted))
      ),
    [posts, following, muted]
  )

  if (!list.length) {
    return <Empty icon={<Users size={28} />} text="还没有关注的人发微博" hint="去推荐流点开某位居民的主页关注 TA" />
  }
  return <>{list.map((p) => <MicroPostCard key={p.id} post={p} />)}</>
}

/* ---------- 热搜 ---------- */

function HotView({ pick, onPick }: { pick: string; onPick: (t: string) => void }) {
  const hot = useMulCity((s) => s.microblog.hotSearch)
  const posts = useMulCity((s) => s.microblog.posts)
  const muted = useMulCity((s) => s.microblog.muted)
  const refresh = useMulCity((s) => s.refreshHotSearch)

  const related = useMemo(
    () => (pick ? sortByTime(posts.filter((p) => matchesTopic(p, pick) && !isMutedPost(p, muted))) : []),
    [pick, posts, muted]
  )

  return (
    <>
      <div className="cx-sechead">
        <span className="cx-sechead__t">Mul市热搜榜</span>
        <button className="cx-sechead__more fx-press" onClick={refresh}>
          <RefreshCw size={11} /> 刷新
        </button>
      </div>

      {hot.length ? (
        <div className="cx-mb-hot">
          {hot.slice(0, 10).map((t, i) => (
            <button
              key={t.id}
              className={`cx-mb-hot__row fx-press ${pick === t.title ? 'cx-mb-hot__row--on' : ''}`}
              onClick={() => onPick(pick === t.title ? '' : t.title)}
            >
              <span className={`cx-mb-hot__idx ${i < 3 ? 'cx-mb-hot__idx--top' : ''}`}>{i + 1}</span>
              <span className="cx-mb-hot__body">
                <span className="cx-mb-hot__title">
                  {t.title}
                  {t.label ? ` ${t.label}` : ''}
                </span>
                <span className="cx-mb-hot__heat">热度 {(t.heat / 10000).toFixed(1)} 万</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon={<Flame size={28} />} text="暂无热搜" hint="点上方刷新试试" />
      )}

      {pick && (
        <>
          <div className="cx-sechead">
            <span className="cx-sechead__t">#{pick}#</span>
            <span className="cx-sechead__sub">{related.length} 条相关</span>
          </div>
          {related.length ? (
            related.map((p) => <MicroPostCard key={p.id} post={p} />)
          ) : (
            <Empty icon={<Flame size={26} />} text="这个话题还没有相关微博" />
          )}
        </>
      )}
    </>
  )
}

/* ---------- 空间 ---------- */

function SpaceView({ onCreate }: { onCreate: () => void }) {
  const spaces = useMulCity((s) => s.microblog.spaces)
  const people = useMulCity((s) => s.people)
  const nav = useCityNav()

  const list = useMemo(
    () => [...spaces].sort((a, b) => Number(b.live) - Number(a.live) || b.online - a.online),
    [spaces]
  )

  return (
    <>
      <div className="cx-acts" style={{ marginBottom: 10 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={onCreate}>
          <Mic size={14} /> 创建空间
        </button>
      </div>

      {list.length ? (
        list.map((sp) => {
          const host = personById(people, sp.hostId)
          const guests = sp.guestIds
            .map((id) => personById(people, id)?.name)
            .filter((n): n is string => Boolean(n))
          return (
            <button
              key={sp.id}
              className="cx-card cx-card--front cx-mb-listcard fx-press"
              onClick={() => nav.push({ view: 'space', id: sp.id })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`cx-tag ${sp.live ? 'cx-mb-badge-live' : 'cx-tag--front'}`}>
                  {sp.live ? '● LIVE' : '预约'}
                </span>
                <span className="cx-tag">
                  <Users size={10} /> {sp.online} 在线
                </span>
              </div>
              <div className="cx-mb-listcard__title" style={{ marginTop: 9 }}>{sp.title}</div>
              <div className="cx-mb-listcard__sub">话题：{sp.topic}</div>
              <div className="cx-mb-listcard__sub">
                主持：{host?.name ?? '居民'}
                {guests.length ? ` · 嘉宾：${guests.join('、')}` : ''}
              </div>
            </button>
          )
        })
      ) : (
        <Empty icon={<Mic size={28} />} text="还没有语音空间" hint="点上方「创建空间」开一个" />
      )}
    </>
  )
}

function CreateSpaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createSpace = useMulCity((s) => s.createSpace)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [msg, setMsg] = useState('')

  const submit = () => {
    if (!title.trim()) {
      setMsg('请填写空间标题。')
      return
    }
    createSpace(title.trim(), topic.trim() || '随便聊聊')
    setTitle('')
    setTopic('')
    setMsg('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="创建语音空间">
      <Field label="空间标题">
        <input className="fx-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：深夜电台" />
      </Field>
      <Field label="话题">
        <input className="fx-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="想聊点什么" />
      </Field>
      {msg && <div className="cx-row__sub" style={{ marginBottom: 10 }}>{msg}</div>}
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit}>
        <Mic size={14} /> 开播
      </button>
    </Sheet>
  )
}

/* ---------- 社群 ---------- */

function CommunityView({ onCreate }: { onCreate: () => void }) {
  const communities = useMulCity((s) => s.microblog.communities)
  const nav = useCityNav()

  return (
    <>
      <div className="cx-acts" style={{ marginBottom: 10 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={onCreate}>
          <Users size={14} /> 创建社群
        </button>
      </div>

      {communities.length ? (
        communities.map((c) => (
          <button
            key={c.id}
            className="cx-card cx-card--front cx-mb-listcard fx-press"
            onClick={() => nav.push({ view: 'community', id: c.id })}
          >
            <div className="cx-mb-listcard__title">{c.name}</div>
            <div className="cx-mb-listcard__sub">{c.desc}</div>
            <div className="cx-mb-listcard__sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={11} /> {c.memberIds.length} 位成员 · {c.posts.length} 条帖子
            </div>
          </button>
        ))
      ) : (
        <Empty icon={<Users size={28} />} text="还没有社群" hint="点上方「创建社群」拉个群" />
      )}
    </>
  )
}

function CreateCommunitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCommunity = useMulCity((s) => s.createCommunity)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [msg, setMsg] = useState('')

  const submit = () => {
    if (!name.trim()) {
      setMsg('请填写社群名称。')
      return
    }
    createCommunity(name.trim(), desc.trim() || '欢迎加入')
    setName('')
    setDesc('')
    setMsg('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="创建社群">
      <Field label="社群名称">
        <input className="fx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：海边散步同好会" />
      </Field>
      <Field label="简介">
        <input className="fx-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="一句话介绍这个社群" />
      </Field>
      {msg && <div className="cx-row__sub" style={{ marginBottom: 10 }}>{msg}</div>}
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit}>
        <Users size={14} /> 创建
      </button>
    </Sheet>
  )
}

/* ---------- 私信 ---------- */

function DmView() {
  const messages = useMulCity((s) => s.microblog.messages)
  const people = useMulCity((s) => s.people)
  const sendDm = useMulCity((s) => s.sendDm)
  const [active, setActive] = useState('')
  const [picking, setPicking] = useState(false)
  const [text, setText] = useState('')

  const convos = useMemo(() => {
    const map = new Map<string, DirectMessage[]>()
    for (const m of messages) {
      const other = m.fromId === ME_ID ? m.toId : m.fromId
      if (other === ME_ID) continue
      const arr = map.get(other)
      if (arr) arr.push(m)
      else map.set(other, [m])
    }
    return Array.from(map.entries())
      .map(([id, ms]) => {
        const sorted = [...ms].sort((a, b) => a.at - b.at)
        return { id, last: sorted[sorted.length - 1] }
      })
      .sort((a, b) => b.last.at - a.last.at)
  }, [messages])

  const thread = useMemo(
    () =>
      messages
        .filter((m) => (m.fromId === ME_ID && m.toId === active) || (m.fromId === active && m.toId === ME_ID))
        .sort((a, b) => a.at - b.at),
    [messages, active]
  )

  const person = personById(people, active)
  const others = useMemo(() => people.filter((p) => p.id !== ME_ID), [people])

  const send = () => {
    const t = text.trim()
    if (!t || !active) return
    sendDm(active, t)
    setText('')
  }

  /* 发起新私信：选择一位居民 */
  if (picking) {
    return (
      <>
        <div className="cx-mb-dmhead">
          <button className="cx-tag cx-tag--front fx-press" onClick={() => setPicking(false)}>
            <ChevronLeft size={12} /> 返回
          </button>
          <span className="cx-mb-dmhead__name">选择一位居民</span>
        </div>
        {others.length ? (
          others.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              sub={`${p.occupation} · ${p.currentEmotion}`}
              onClick={() => {
                setActive(p.id)
                setPicking(false)
              }}
              arrow
            />
          ))
        ) : (
          <Empty icon={<Send size={26} />} text="城里还没有其他居民" />
        )}
      </>
    )
  }

  /* 会话聊天 */
  if (active) {
    return (
      <>
        <div className="cx-mb-dmhead">
          <button className="cx-tag cx-tag--front fx-press" onClick={() => setActive('')}>
            <ChevronLeft size={12} /> 会话
          </button>
          {person && <Avatar person={person} size={30} showOnline />}
          <span className="cx-mb-dmhead__name">{person?.name ?? '居民'}</span>
        </div>

        {thread.length ? (
          thread.map((m) => (
            <div key={m.id} className={`cx-mb-bubble ${m.fromId === ME_ID ? 'cx-mb-bubble--me' : 'cx-mb-bubble--them'}`}>
              {m.text}
              <span className="cx-mb-bubble__time">{fmtCityTime(m.at)}</span>
            </div>
          ))
        ) : (
          <Empty icon={<Send size={26} />} text="还没有消息，打个招呼吧" />
        )}

        <div className="cx-mb-dmbar">
          <input
            className="fx-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            placeholder="发消息…"
          />
          <button className="fx-btn fx-btn--accent fx-press" onClick={send} disabled={!text.trim()}>
            <Send size={15} />
          </button>
        </div>
      </>
    )
  }

  /* 会话列表 */
  return (
    <>
      <div className="cx-acts" style={{ marginBottom: 10 }}>
        <button className="fx-btn fx-btn--front fx-press" onClick={() => setPicking(true)}>
          <Send size={14} /> 发起新私信
        </button>
      </div>

      {convos.length ? (
        convos.map((c) => {
          const p = personById(people, c.id)
          if (!p) return null
          return (
            <button key={c.id} className="cx-mb-convo fx-press" onClick={() => setActive(c.id)}>
              <Avatar person={p} size={42} showOnline />
              <span className="cx-mb-convo__body">
                <span className="cx-mb-convo__name">{p.name}</span>
                <span className="cx-mb-convo__last">
                  {c.last.fromId === ME_ID ? '我：' : ''}
                  {c.last.text}
                </span>
              </span>
              <span className="cx-mb-convo__time">{fmtCityTime(c.last.at)}</span>
            </button>
          )
        })
      ) : (
        <Empty icon={<Send size={28} />} text="还没有私信" hint="点上方「发起新私信」找人聊聊" />
      )}
    </>
  )
}

/* ---------- 我的 ---------- */

function MineView({ blocked, onBlockedChange }: { blocked: string[]; onBlockedChange: (v: string[]) => void }) {
  const me = useMe()
  const nav = useCityNav()
  const posts = useMulCity((s) => s.microblog.posts)
  const following = useMulCity((s) => s.microblog.following)
  const theme = useMulCity((s) => s.microblog.theme)
  const setTheme = useMulCity((s) => s.setMicroblogTheme)
  const muted = useMulCity((s) => s.microblog.muted)
  const toggleMute = useMulCity((s) => s.toggleMuteTopic)
  const hot = useMulCity((s) => s.microblog.hotSearch)
  const people = useMulCity((s) => s.people)

  const myPosts = useMemo(() => sortByTime(posts.filter((p) => p.authorId === ME_ID)), [posts])
  const bookmarks = useMemo(() => sortByTime(posts.filter((p) => p.bookmarks.includes(ME_ID))), [posts])
  const tagPool = useMemo(
    () => Array.from(new Set([...muted, ...hot.map((t) => t.title)])).slice(0, 10),
    [muted, hot]
  )
  const others = useMemo(() => people.filter((p) => p.id !== ME_ID).slice(0, 8), [people])

  return (
    <>
      <button
        className="cx-card cx-card--front cx-mb-profile fx-press"
        style={{ marginBottom: 14 }}
        onClick={() => nav.push({ view: 'profile', id: ME_ID })}
      >
        <Avatar person={me} size={54} showOnline />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="cx-mb-profile__name">{me.name}</span>
          <span className="cx-mb-profile__sub">@{me.nickname} · {me.occupation}</span>
          <span className="cx-mb-profile__sub">LV.{me.attributes.level} · {me.rank}</span>
        </span>
        <span className="cx-tag cx-tag--front">主页</span>
      </button>

      <div className="cx-stats" style={{ marginBottom: 4 }}>
        <Stat value={myPosts.length} label="我的发帖" />
        <Stat value={bookmarks.length} label="收藏" />
        <Stat value={following.length} label="关注" />
      </div>

      <div className="cx-sechead">
        <span className="cx-sechead__t">我的发帖</span>
        <span className="cx-sechead__sub">{myPosts.length} 条</span>
      </div>
      {myPosts.length ? (
        myPosts.map((p) => <MicroPostCard key={p.id} post={p} compact />)
      ) : (
        <Empty icon={<MessageSquarePlus size={26} />} text="你还没有发过微博" hint="点右下角 + 发布第一条" />
      )}

      <div className="cx-sechead">
        <span className="cx-sechead__t">收藏的微博</span>
        <span className="cx-sechead__sub">{bookmarks.length} 条</span>
      </div>
      {bookmarks.length ? (
        bookmarks.map((p) => <MicroPostCard key={p.id} post={p} compact />)
      ) : (
        <Empty icon={<Sparkles size={26} />} text="还没有收藏" hint="在微博卡片上点「收藏」" />
      )}

      <div className="cx-sechead">
        <span className="cx-sechead__t">个性化设置</span>
      </div>
      <Card>
        <Field label="微博界面主题">
          <div className="cx-mb-themerow">
            {THEMES.map((t) => (
              <button
                key={t.key}
                className={`cx-tag ${theme === t.key ? 'cx-tag--on' : 'cx-tag--front'} fx-press`}
                style={{ minHeight: 34, justifyContent: 'center' }}
                onClick={() => setTheme(t.key)}
              >
                <Palette size={12} /> {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`静音话题（${muted.length}）`}>
          {tagPool.length ? (
            <div className="cx-acts">
              {tagPool.map((t) => {
                const on = muted.includes(t)
                return (
                  <button
                    key={t}
                    className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'} fx-press`}
                    onClick={() => toggleMute(t)}
                  >
                    <VolumeX size={11} /> {t}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="cx-row__sub">暂无话题可静音</div>
          )}
        </Field>

        <Field label={`屏蔽的居民（${blocked.length}）`}>
          {others.map((p) => {
            const on = blocked.includes(p.id)
            return (
              <Row
                key={p.id}
                thumb={<Avatar person={p} size={34} />}
                title={p.name}
                sub={p.occupation}
                right={
                  <button
                    className={`cx-tag ${on ? 'cx-tag--on' : 'cx-tag--front'} fx-press`}
                    onClick={() => onBlockedChange(on ? blocked.filter((x) => x !== p.id) : [...blocked, p.id])}
                  >
                    <Ban size={11} /> {on ? '已屏蔽' : '屏蔽'}
                  </button>
                }
              />
            )
          })}
        </Field>
      </Card>
    </>
  )
}

/* ---------- 发布面板 ---------- */

function ComposerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPost = useMulCity((s) => s.addMicroblogPost)
  const people = useMulCity((s) => s.people)
  const me = useMe()
  const landmarks = useMulCity((s) => s.city.landmarks)
  const hot = useMulCity((s) => s.microblog.hotSearch)
  const activeEvents = useMulCity((s) => s.events.active)

  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [poll, setPoll] = useState<PollOption[]>([])
  const [location, setLocation] = useState('')
  const [sensitive, setSensitive] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const over = content.length > MAX_LEN
  const recTags = useMemo(() => Array.from(new Set(hot.map((t) => t.title))).slice(0, 8), [hot])

  const reset = () => {
    setContent('')
    setImages([])
    setPoll([])
    setLocation('')
    setSensitive(false)
    setTags([])
    setTagInput('')
    setMsg('')
  }

  const addImage = () => setImages((im) => (im.length >= 9 ? im : [...im, '']))
  const removeImage = (i: number) => setImages((im) => im.filter((_, idx) => idx !== i))

  const startPoll = () =>
    setPoll([
      { id: uid('opt'), text: '', votes: [] },
      { id: uid('opt'), text: '', votes: [] },
    ])
  const addPollOption = () =>
    setPoll((p) => (p.length >= 4 ? p : [...p, { id: uid('opt'), text: '', votes: [] }]))
  const removePollOption = (i: number) => setPoll((p) => p.filter((_, idx) => idx !== i))
  const setPollText = (i: number, v: string) => setPoll((p) => p.map((o, idx) => (idx === i ? { ...o, text: v } : o)))
  const clearPoll = () => setPoll([])

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  const addTagFromInput = () => {
    const t = tagInput.replace(/#/g, '').trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const aiWrite = async () => {
    setBusy(true)
    setMsg('正在让居民帮你写…')
    const residents = people.filter((p) => p.id !== ME_ID)
    const person: Person = residents.length ? residents[Math.floor(Math.random() * residents.length)] : me
    const loc = location || landmarks[0]?.name || 'Mul市街头'
    const recent = activeEvents.slice(0, 3).map((e) => e.title)
    let draft = ''
    try {
      draft = await generateMicroblogDraft(person, loc, person.mood, recent)
    } catch {
      draft = ''
    }
    if (draft) {
      setContent(draft.slice(0, MAX_LEN))
      setMsg(`已由 ${person.name} 起草，可继续编辑。`)
    } else {
      const fallback = localMicroblogPost(person, me.name, 60, Date.now())
      setContent(fallback.content.slice(0, MAX_LEN))
      setMsg(hasCityAi() ? 'AI 生成失败，已用本地文案兜底。' : '未接入 LLM，已用本地文案兜底。')
    }
    setBusy(false)
  }

  const submit = () => {
    if (!content.trim()) {
      setMsg('说点什么吧。')
      return
    }
    if (over) {
      setMsg('内容超过 280 字，请精简后发布。')
      return
    }
    const pollOpts = poll.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text)
    const validPoll = pollOpts.length >= 2 ? pollOpts : undefined
    addPost({
      content: content.trim(),
      images,
      type: validPoll ? 'poll' : images.length ? 'image' : 'text',
      poll: validPoll,
      location,
      isSensitive: sensitive,
      tags,
    })
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="发布微博">
      <Card front style={{ boxShadow: 'none', background: 'transparent', padding: 0 }}>
        <textarea
          className="fx-textarea"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享此刻的 Mul市…"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span className={`cx-mb-counter ${over ? 'cx-mb-counter--over' : ''}`}>
            {content.length}/{MAX_LEN}
          </span>
          <button className="fx-btn fx-btn--front fx-press" onClick={() => void aiWrite()} disabled={busy}>
            <Sparkles size={14} /> {busy ? '生成中…' : 'AI 帮我写'}
          </button>
        </div>

        <div className="cx-hr" />

        <Field label={`图片（${images.length}/9）`}>
          <div className="cx-mb-cgrid">
            {images.map((_, i) => (
              <span key={i} className="cx-mb-cimg">
                <button className="cx-mb-cimg__del fx-press" onClick={() => removeImage(i)} aria-label="移除图片">
                  <X size={12} />
                </button>
              </span>
            ))}
            {images.length < 9 && (
              <button className="cx-mb-cadd fx-press" onClick={addImage} aria-label="添加图片">
                <ImagePlus size={18} />
              </button>
            )}
          </div>
        </Field>

        {poll.length === 0 ? (
          <Field label="投票">
            <button className="fx-btn fx-btn--soft fx-press" onClick={startPoll}>
              添加投票（2-4 个选项）
            </button>
          </Field>
        ) : (
          <Field label="投票选项">
            {poll.map((o, i) => (
              <div key={o.id} className="cx-mb-pollrow">
                <input
                  className="fx-input"
                  value={o.text}
                  onChange={(e) => setPollText(i, e.target.value)}
                  placeholder={`选项 ${i + 1}`}
                />
                <button
                  className="fx-btn fx-btn--soft fx-press"
                  onClick={() => removePollOption(i)}
                  disabled={poll.length <= 2}
                  aria-label="删除选项"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="cx-acts">
              {poll.length < 4 && (
                <button className="cx-tag cx-tag--front fx-press" onClick={addPollOption}>
                  <Plus size={11} /> 添加选项
                </button>
              )}
              <button className="cx-tag cx-tag--front fx-press" onClick={clearPoll}>
                取消投票
              </button>
            </div>
          </Field>
        )}

        <Field label="定位">
          <select className="fx-input" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">不显示位置</option>
            {landmarks.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="话题标签">
          {recTags.length > 0 && (
            <div className="cx-acts" style={{ marginBottom: 8 }}>
              {recTags.map((t) => (
                <button
                  key={t}
                  className={`cx-tag ${tags.includes(t) ? 'cx-tag--on' : 'cx-tag--front'} fx-press`}
                  onClick={() => toggleTag(t)}
                >
                  #{t}#
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="fx-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTagFromInput()
                }
              }}
              placeholder="输入 #标签# 回车添加"
            />
            <button className="fx-btn fx-btn--soft fx-press" onClick={addTagFromInput} aria-label="添加标签">
              <Plus size={14} />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="cx-acts" style={{ marginTop: 8 }}>
              {tags.map((t) => (
                <button key={t} className="cx-tag cx-tag--on fx-press" onClick={() => toggleTag(t)}>
                  #{t}# <X size={10} />
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="敏感内容">
          <div className="cx-acts">
            <button
              className={`cx-tag ${sensitive ? 'cx-tag--on' : 'cx-tag--front'} fx-press`}
              onClick={() => setSensitive((v) => !v)}
            >
              {sensitive ? '已标记为敏感内容' : '标记为敏感内容'}
            </button>
          </div>
        </Field>
      </Card>

      {msg && <div className="cx-row__sub" style={{ margin: '4px 2px 10px' }}>{msg}</div>}
      <button className="fx-btn fx-btn--accent fx-press" style={{ width: '100%' }} onClick={submit} disabled={over || busy}>
        发布
      </button>
    </Sheet>
  )
}
