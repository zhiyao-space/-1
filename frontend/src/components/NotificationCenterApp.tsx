import { useMemo } from 'react'
import { Bell, CheckCheck, Trash2, MessageSquare, Heart, Star, UserPlus, Pin, Sparkles, Send, AtSign, Info } from 'lucide-react'
import { useNotifications, type NotificationKind } from '../store/notifications'
import { useUI } from '../store/ui'
import { EmptyState } from './common'

const KIND_META: Record<NotificationKind, { icon: typeof Bell; label: string }> = {
  'forum-comment': { icon: MessageSquare, label: '评论' },
  'forum-like': { icon: Heart, label: '点赞' },
  'forum-fav': { icon: Star, label: '收藏' },
  'forum-share': { icon: Send, label: '转发' },
  'forum-follow': { icon: UserPlus, label: '关注' },
  'forum-pin': { icon: Pin, label: '置顶' },
  'forum-essence': { icon: Sparkles, label: '加精' },
  'forum-post': { icon: AtSign, label: '新帖' },
  dm: { icon: Send, label: '私信' },
  chat: { icon: MessageSquare, label: '消息' },
  system: { icon: Info, label: '系统' },
}

export default function NotificationCenterApp() {
  const items = useNotifications((s) => s.items)
  const markRead = useNotifications((s) => s.markRead)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const clearAll = useNotifications((s) => s.clearAll)
  const setPendingChat = useUI((s) => s.setPendingChat)
  const setPendingForum = useUI((s) => s.setPendingForum)
  const openApp = useUI((s) => s.openApp)

  const sorted = useMemo(() => [...items].sort((a, b) => b.time - a.time), [items])
  const unread = items.filter((i) => !i.read).length

  const activate = (id: string, target: (typeof items)[number]['target']) => {
    markRead(id)
    if (target.payload) {
      if ('kind' in target.payload) {
        setPendingChat(target.payload)
        openApp('chat')
      } else {
        setPendingForum(target.payload)
        openApp('forum')
      }
    } else {
      openApp(target.app)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
          {unread > 0 ? `${unread} 条未读` : '全部已读'}
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm pressable" onClick={markAllRead} disabled={unread === 0}>
          <CheckCheck size={13} /> 全部已读
        </button>
        <button
          className="btn btn-sm pressable"
          onClick={() => {
            if (items.length > 0) clearAll()
          }}
          disabled={items.length === 0}
        >
          <Trash2 size={13} /> 清空
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={<Bell size={36} />} text="暂无通知" hint="有人评论、点赞或给你发私信时会出现在这里" />
      ) : (
        sorted.map((n) => {
          const meta = KIND_META[n.kind]
          const Icon = meta.icon
          return (
            <button
              key={n.id}
              className="glass pressable"
              onClick={() => activate(n.id, n.target)}
              style={{
                width: '100%',
                textAlign: 'left',
                borderRadius: 14,
                padding: '11px 13px',
                marginBottom: 8,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                opacity: n.read ? 0.62 : 1,
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Icon size={15} />
                {!n.read && <span style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{n.title}</span>
                  <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{meta.label}</span>
                  <span className="fs-micro" style={{ marginLeft: 'auto', color: 'var(--text-disabled)' }}>{fmtAgo(n.time)}</span>
                </div>
                <div className="fs-body" style={{ color: 'var(--text-body)', marginTop: 3, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {n.body}
                </div>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}

function fmtAgo(t: number): string {
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()}`
}
