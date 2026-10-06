import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Archive,
  Check,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import { useToast } from '../../store/ui'
import { useCharacters } from '../../store/characters'
import { dyGroups, type DyAuthor, type DyGroup, type DyInboxItem, type DyVideo } from '../../lib/douyinEngine'
import { DyAvatar, DyIcon, useCoverSrc } from './parts'
import DmView from './DmView'
import GroupChatView from './GroupChatView'

type MsgTab = 'all' | 'friend' | 'group' | 'assistant'

const TABS: { id: MsgTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'friend', label: '好友' },
  { id: 'group', label: '群聊' },
  { id: 'assistant', label: '消息助手' },
]

const TYPE_META: Record<DyInboxItem['type'], { icon: string; label: string }> = {
  like: { icon: 'like', label: '点赞' },
  comment: { icon: 'comment', label: '评论' },
  follow: { icon: 'follow', label: '粉丝' },
  visit: { icon: 'visit', label: '访客' },
  mention: { icon: 'mention', label: '提及' },
  system: { icon: 'system', label: '系统' },
  dm: { icon: 'dm', label: '私信' },
}

function MsgThumb({ video }: { video?: DyVideo }) {
  const src = useCoverSrc(video?.coverImage ?? null)
  if (!video) return null
  return (
    <span
      className="dy-msg-thumb"
      style={src ? { backgroundImage: `url(${src})` } : { background: 'linear-gradient(150deg, #2b2b33, #16161a)' }}
    />
  )
}

/** 左滑露出操作 */
function SwipeRow({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<number | null>(null)
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, marginBottom: 8 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          paddingRight: 10,
          background: '#101010',
        }}
      >
        {actions}
      </div>
      <div
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .2s ease' }}
        onPointerDown={(e) => {
          start.current = e.clientX
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (start.current === null) return
          const d = e.clientX - start.current
          setDx(Math.max(-128, Math.min(0, d)))
        }}
        onPointerUp={() => {
          start.current = null
          setDragging(false)
          setDx((d) => (d < -60 ? -128 : 0))
        }}
        onPointerLeave={() => {
          if (start.current === null) return
          start.current = null
          setDragging(false)
          setDx((d) => (d < -60 ? -128 : 0))
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function MessageView({
  onOpenAuthor,
  embedded,
}: {
  onOpenAuthor: (a: DyAuthor) => void
  embedded?: boolean
}) {
  const inbox = useDouyin((s) => s.inbox)
  const conversations = useDouyin((s) => s.conversations)
  const visitors = useDouyin((s) => s.visitors)
  const videos = useDouyin((s) => s.videos)
  const lastInboxGenAt = useDouyin((s) => s.lastInboxGenAt)
  const generateInbox = useDouyin((s) => s.generateInbox)
  const markInboxRead = useDouyin((s) => s.markInboxRead)
  const markAllInboxRead = useDouyin((s) => s.markAllInboxRead)
  const deleteInbox = useDouyin((s) => s.deleteInbox)
  const followBack = useDouyin((s) => s.followBack)
  const follows = useDouyin((s) => s.follows)
  const openConversation = useDouyin((s) => s.openConversation)
  const toggleFollow = useDouyin((s) => s.toggleFollow)
  const archiveInbox = useDouyin((s) => s.archiveInbox)
  const groupMessages = useDouyin((s) => s.groupMessages)
  const passerbyPool = useDouyin((s) => s.passerbyPool)
  const ensurePool = useDouyin((s) => s.ensurePool)
  const toast = useToast((s) => s.push)

  const [tab, setTab] = useState<MsgTab>('all')
  const [openPeer, setOpenPeer] = useState<DyAuthor | null>(null)
  const [openGroupChat, setOpenGroupChat] = useState<DyGroup | null>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [, forceTick] = useState(0)

  const cooldownLeft = Math.max(0, 30 - Math.floor((Date.now() - lastInboxGenAt) / 1000))
  useEffect(() => {
    if (cooldownLeft <= 0) return
    const t = window.setInterval(() => forceTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [cooldownLeft])

  const characters = useCharacters((s) => s.characters)

  // 群聊：由角色库派生的粉丝群，列表与群聊视图共用同一数据源
  // 角色库为空时用路人池兜底，保证群聊始终可用
  useEffect(() => {
    ensurePool()
  }, [ensurePool])

  const groups = useMemo(() => dyGroups(passerbyPool), [characters, passerbyPool])

  const videoOf = (id?: string) => videos.find((v) => v.id === id)

  const runGenerate = async () => {
    setBusy(true)
    const n = await generateInbox()
    setBusy(false)
    toast(n > 0 ? `新收到 ${n} 条互动消息` : '刚刷新过啦，30 秒后再试')
  }

  if (openPeer) {
    return <DmView peer={openPeer} onBack={() => setOpenPeer(null)} onOpenAuthor={onOpenAuthor} />
  }

  if (openGroupChat) {
    return (
      <GroupChatView group={openGroupChat} onBack={() => setOpenGroupChat(null)} onOpenAuthor={onOpenAuthor} />
    )
  }

  const friendList = conversations.filter(
    (c) => !q.trim() || c.peer.name.includes(q.trim())
  )

  return (
    <div className="dy-page" style={embedded ? { position: 'relative', inset: 'auto', flex: 1 } : undefined}>
      <div className="dy-page-head">
        <div className="dy-seg">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`dy-seg-btn pressable${tab === t.id ? ' dy-seg-btn--on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          className={`dy-icon-btn pressable${busy ? ' dy-icon-btn--spin' : ''}`}
          onClick={() => void runGenerate()}
          disabled={cooldownLeft > 0 || busy}
          style={{ opacity: cooldownLeft > 0 ? 0.45 : 1 }}
          title={cooldownLeft > 0 ? `${cooldownLeft}s 后可刷新` : 'AI 生成互动消息'}
        >
          <Sparkles size={15} />
        </button>
      </div>

      <div className="dy-scroll">
        {tab === 'all' && (
          <>
            {inbox.length === 0 && <div className="dy-empty">还没有消息，点右上角的 AI 按钮给你造几条互动</div>}
            {inbox.map((item) => {
              const video = videoOf(item.relatedVideoId)
              return (
                <SwipeRow
                  key={item.id}
                  actions={
                    <>
                      {!item.isRead && (
                        <button
                          className="dy-swipe-btn pressable"
                          onClick={() => {
                            markInboxRead(item.id)
                            toast('已标为已读')
                          }}
                        >
                          <Check size={12} /> 已读
                        </button>
                      )}
                      <button
                        className="dy-swipe-btn dy-swipe-btn--danger pressable"
                        onClick={() => deleteInbox(item.id)}
                      >
                        <Trash2 size={12} /> 删除
                      </button>
                    </>
                  }
                >
                  <div className={`dy-msg${item.isRead ? '' : ' dy-msg--unread'}`}>
                    <button className="pressable" onClick={() => onOpenAuthor(item.sender)}>
                      <DyAvatar author={item.sender} size={42} />
                    </button>
                    <div className="dy-msg-body">
                      <span className="dy-msg-name">
                        {item.sender.name}
                        <span className="dy-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <DyIcon name={TYPE_META[item.type].icon} size={10} color="currentColor" />
                          {TYPE_META[item.type].label}
                        </span>
                        {item.sender.passerbyTag && <span className="dy-pill dy-pill--hot">{item.sender.passerbyTag}</span>}
                      </span>
                      <span className="dy-msg-text">{item.content}</span>
                    </div>
                    {item.type === 'follow' ? (
                      <button
                        className={`dy-follow-btn pressable${item.followedBack || follows.includes(item.sender.key) ? ' dy-follow-btn--done' : ''}`}
                        onClick={() => {
                          followBack(item.id)
                          if (!follows.includes(item.sender.key)) toggleFollow(item.sender.key)
                        }}
                      >
                        {item.followedBack || follows.includes(item.sender.key) ? '已关注' : '回关'}
                      </button>
                    ) : (
                      <MsgThumb video={video} />
                    )}
                    {!item.isRead && <span className="dy-msg-unread" />}
                  </div>
                </SwipeRow>
              )
            })}
          </>
        )}

        {tab === 'friend' && (
          <>
            <div className="dy-sheet-foot" style={{ border: 0, padding: '0 0 10px' }}>
              <input
                className="dy-input"
                placeholder="搜索用户或群聊"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="dy-icon-btn pressable" onClick={() => setQ('')}>
                <Search size={15} />
              </button>
            </div>
            {friendList.length === 0 && <div className="dy-empty">还没有私信会话，去视频里点作者头像私信他</div>}
            {friendList.map((c) => (
              <button
                key={c.id}
                className="dy-msg pressable"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  openConversation(c.peer)
                  setOpenPeer(c.peer)
                }}
              >
                <DyAvatar author={c.peer} size={42} />
                <div className="dy-msg-body">
                  <span className="dy-msg-name">
                    {c.peer.name}
                    {c.peer.passerbyTag && <span className="dy-pill">{c.peer.passerbyTag}</span>}
                  </span>
                  <span className="dy-msg-text">{c.messages[c.messages.length - 1]?.content ?? '打个招呼吧'}</span>
                </div>
                {c.unread > 0 && <span className="dy-follow-btn">{c.unread}</span>}
              </button>
            ))}
          </>
        )}

        {tab === 'group' && (
          <>
            {groups.length === 0 && <div className="dy-empty">暂时没有群聊</div>}
            {groups.map((g) => {
              const list = groupMessages[g.id] ?? []
              const last = list[list.length - 1]
              return (
                <button
                  key={g.id}
                  className="dy-msg pressable"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => setOpenGroupChat(g)}
                >
                  <span className="dy-group-ava">
                    <Users size={18} color="rgba(255,255,255,0.75)" />
                  </span>
                  <div className="dy-msg-body">
                    <span className="dy-msg-name">
                      {g.name}
                      <span className="dy-pill">{g.members.length}人</span>
                    </span>
                    <span className="dy-msg-text">
                      {last
                        ? `${last.sender.kind === 'user' ? '我' : last.sender.name}：${last.content}`
                        : '还没有人发言，进去说两句'}
                    </span>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {tab === 'assistant' && (
          <>
            <div className="dy-card">
              <div className="dy-card-title">消息助手</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                帮你把互动消息整理清楚：生成新的互动、一键清理未读、归档旧消息。
              </div>
            </div>
            <button className="dy-msg pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => void runGenerate()}>
              <Sparkles size={18} color="#fe2c55" />
              <div className="dy-msg-body">
                <span className="dy-msg-name">一键生成互动消息</span>
                <span className="dy-msg-text">按角色人设随机生成点赞/评论/粉丝/访客通知</span>
              </div>
            </button>
            <button
              className="dy-msg pressable"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => {
                markAllInboxRead()
                toast('已全部标为已读')
              }}
            >
              <Check size={18} color="rgba(255,255,255,0.75)" />
              <div className="dy-msg-body">
                <span className="dy-msg-name">整理未读</span>
                <span className="dy-msg-text">当前 {inbox.filter((i) => !i.isRead).length} 条未读</span>
              </div>
            </button>
            <button
              className="dy-msg pressable"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => {
                const n = archiveInbox()
                toast(n > 0 ? `已归档 ${n} 条已读消息` : '没有已读消息可归档')
              }}
            >
              <Archive size={18} color="rgba(255,255,255,0.75)" />
              <div className="dy-msg-body">
                <span className="dy-msg-name">消息归档</span>
                <span className="dy-msg-text">把已读消息收进归档，列表更干净</span>
              </div>
            </button>
            <div className="dy-card">
              <div className="dy-card-title">互动概况</div>
              <div className="dy-kv">
                <span>未读消息</span>
                <span>{inbox.filter((i) => !i.isRead).length}</span>
              </div>
              <div className="dy-kv">
                <span>私信会话</span>
                <span>{conversations.length}</span>
              </div>
              <div className="dy-kv">
                <span>新增粉丝</span>
                <span>{inbox.filter((i) => i.type === 'follow').length}</span>
              </div>
              <div className="dy-kv">
                <span>主页访客</span>
                <span>{visitors.length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}