import { useMemo, useState } from 'react'
import { Search, RefreshCw, Flame, TrendingUp } from 'lucide-react'
import { useForum, heatOf, type ForumPost } from '../../store/forum'
import { useToast } from '../../store/ui'
import { PostCard, EmptyBlock, trendingTags } from './shared'
import { runForumTick } from '../../lib/forumScheduler'

export type FeedTab = 'following' | 'recommend' | 'latest' | 'trending'

export default function FeedView({ onOpenPost, onCompose }: { onOpenPost: (id: string) => void; onCompose: () => void }) {
  const posts = useForum((s) => s.posts)
  const comments = useForum((s) => s.comments)
  const following = useForum((s) => s.following)
  const push = useToast((s) => s.push)
  const [tab, setTab] = useState<FeedTab>('recommend')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const commentCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of comments) m[c.postId] = (m[c.postId] ?? 0) + 1
    return m
  }, [comments])

  const list = useMemo(() => {
    let base = posts
    if (tab === 'following') base = posts.filter((p) => following.includes(`${p.author.type}:${p.author.id}`) || p.author.type === 'user')
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      base = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (tab === 'latest' || query.trim()) return [...base].sort((a, b) => b.createdAt - a.createdAt)
    if (tab === 'recommend') {
      return [...base].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || heatOf(b, commentCounts[b.id] ?? 0) - heatOf(a, commentCounts[a.id] ?? 0)
      )
    }
    return [...base].sort((a, b) => b.createdAt - a.createdAt)
  }, [posts, tab, query, following, commentCounts])

  const trending = useMemo(() => trendingTags(posts, commentCounts), [posts, commentCounts])

  const doRefresh = async () => {
    setRefreshing(true)
    const result = await runForumTick({ force: true })
    setRefreshing(false)
    if (!result.ok) {
      if (result.reason === 'no-api') push('尚未配置聊天 API，前往 设置 → API 配置 添加后才能生成内容', 'error')
      else push('还没有角色可参与互动，先在聊天 → 通讯录创建角色', 'error')
      return
    }
    push('已刷新，看看有什么新东西')
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 90px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索帖子、标签、用户" style={{ paddingLeft: 34, height: 40 }} />
        </div>
        <button className="btn pressable" style={{ width: 44, padding: 0 }} onClick={doRefresh} title="刷新">
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {query.trim() ? (
        list.length === 0 ? (
          <EmptyBlock text={`没有找到与「${query}」相关的内容`} />
        ) : (
          list.map((p) => <PostCard key={p.id} post={p} showCircle onOpen={() => onOpenPost(p.id)} />)
        )
      ) : tab === 'trending' ? (
        <TrendingList trending={trending} onPick={(tag) => setQuery(tag)} />
      ) : list.length === 0 ? (
        <EmptyBlock
          text={
            tab === 'following'
              ? '关注一些角色或 NPC，他们的帖子会出现在这里。去「圈子」认识些人吧'
              : '信息流还是空的。创建圈子、邀请成员，或点右下角发第一帖'
          }
        />
      ) : (
        list.map((p) => <PostCard key={p.id} post={p} showCircle onOpen={() => onOpenPost(p.id)} />)
      )}

      {tab !== 'trending' && !query.trim() && (
        <button className="btn pressable" style={{ width: '100%', marginTop: 4 }} onClick={onCompose}>
          <Flame size={15} /> 发个帖子
        </button>
      )}
      <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center', padding: '14px 0 4px' }}>
        角色与 NPC 会不定期发帖互动 · 刷新可催生新回复
      </div>
    </div>
  )
}

function TrendingList({ trending, onPick }: { trending: ReturnType<typeof trendingTags>; onPick: (tag: string) => void }) {
  if (trending.length === 0) return <EmptyBlock text="还没有热搜。帖子带上话题标签 #xxx，就会进入热搜榜" />
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px 10px' }}>
        <TrendingUp size={15} color="var(--accent)" />
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)' }}>热搜榜</span>
      </div>
      {trending.map((t, i) => (
        <button
          key={t.tag}
          className="pressable"
          onClick={() => onPick(t.tag)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}
        >
          <span className="mono fs-h2" style={{ width: 26, color: i < 3 ? 'var(--accent)' : 'var(--text-tertiary)' }}>{i + 1}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>#{t.tag}</span>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{t.views} 浏览 · {t.discussions} 讨论</span>
          </span>
          <span className="fs-micro mono" style={{ color: i < 3 ? 'var(--accent)' : 'var(--text-tertiary)' }}>{t.heat} 热度</span>
        </button>
      ))}
    </div>
  )
}

export function FeedTabs({ tab, setTab }: { tab: FeedTab; setTab: (t: FeedTab) => void }) {
  const tabs: { key: FeedTab; label: string }[] = [
    { key: 'following', label: '关注' },
    { key: 'recommend', label: '推荐' },
    { key: 'latest', label: '最新' },
    { key: 'trending', label: '热搜' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0 14px 6px', flexShrink: 0 }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          className="pressable"
          onClick={() => setTab(t.key)}
          style={{
            flex: 1,
            height: 32,
            borderRadius: 999,
            fontSize: 'calc(13px * var(--fs-scale))',
            background: tab === t.key ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export type { ForumPost }
