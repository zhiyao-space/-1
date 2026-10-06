import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, Download, Lock, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import Avatar from '../chat/Avatar'
import type { Character } from '../../store/characters'
import { DEFAULT_SENSITIVE, useSnoop } from '../../store/snoop'
import { useToast, useUI } from '../../store/ui'
import {
  SNOOP_MODULES,
  confrontInChat,
  type SnoopChatMsg,
  type SnoopModuleId,
  type SnoopPhoneData,
} from '../../lib/snoopEngine'

/* ============================================================
   查手机 · 各 App 模块视图
   ============================================================ */

interface ModuleProps {
  character: Character
  data: SnoopPhoneData
  moduleId: SnoopModuleId
  onBack: () => void
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 预设基础词库 + 玩家自定义词库 */
function useSensitiveWords(): string[] {
  const custom = useSnoop((s) => s.customSensitive)
  return useMemo(() => Array.from(new Set([...DEFAULT_SENSITIVE, ...custom])), [custom])
}

/** 敏感词高亮 */
function Highlight({ text, words }: { text: string; words: string[] }) {
  const hit = words.filter((w) => w && text.includes(w))
  if (!hit.length) return <>{text}</>
  const re = new RegExp(`(${hit.map(escapeRe).join('|')})`, 'g')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        hit.includes(p) ? (
          <span key={i} className="sn-hit">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

/** 周期性 now，用于冷却倒计时 */
function useNow(interval = 500) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(t)
  }, [interval])
  return now
}

/** 模块外壳：返回 + 标题 + 刷新（10s 冷却） */
function ModuleShell({
  character,
  moduleId,
  onBack,
  children,
}: ModuleProps & { children: ReactNode }) {
  const refreshModule = useSnoop((s) => s.refreshModule)
  const until = useSnoop((s) => s.moduleCooldown[`${character.id}:${moduleId}`] ?? 0)
  const now = useNow()
  const cooling = until > now
  const secs = Math.ceil((until - now) / 1000)
  const meta = SNOOP_MODULES.find((m) => m.id === moduleId)!
  const push = useToast((s) => s.push)

  return (
    <>
      <div className="sn-nav">
        <button className="sn-iconbtn" onClick={onBack} aria-label="返回">
          <ChevronLeft size={19} />
        </button>
        <span className="sn-app__emoji">{meta.emoji}</span>
        <span className="sn-t1" style={{ flex: 1, fontWeight: 700 }}>
          {meta.name}
        </span>
        <button
          className="sn-iconbtn"
          disabled={cooling}
          onClick={() => {
            if (refreshModule(character, moduleId)) {
              push('模块已刷新')
              navigator.vibrate?.(8)
            }
          }}
          aria-label="刷新"
        >
          {cooling ? <span style={{ fontSize: 11 }}>{secs}s</span> : <RefreshCw size={17} />}
        </button>
      </div>
      {children}
    </>
  )
}

/* ---------------- 2.1 微信 / QQ ---------------- */

function WeChatModule(props: ModuleProps) {
  const { data } = props
  const push = useToast((s) => s.push)
  const sensitive = useSensitiveWords()
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuMsg, setMenuMsg] = useState<SnoopChatMsg | null>(null)

  const contact = data.wechat.contacts.find((c) => c.id === openId)
  if (contact) {
    const msgs = data.wechat.chats[contact.id] ?? []
    const exportChat = () => {
      const text = msgs.map((m) => `${m.from === 'me' ? '我' : contact.name}(${m.time}): ${m.text}`).join('\n')
      navigator.clipboard?.writeText(text)
      push('聊天记录已导出到剪贴板')
    }
    return (
      <ModuleShell {...props}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="sn-nav" style={{ borderTop: 'none' }}>
            <button className="sn-iconbtn" onClick={() => setOpenId(null)} aria-label="返回列表">
              <ChevronLeft size={18} />
            </button>
            <Avatar imageId={props.character.avatarId} name={contact.name} size={34} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ display: 'block', fontWeight: 700 }}>{contact.name}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11 }}>
                {contact.blocked ? '已拉黑' : contact.muted ? '已屏蔽朋友圈' : '在线'}
              </span>
            </span>
            <button className="sn-iconbtn" onClick={exportChat} aria-label="导出">
              <Download size={16} />
            </button>
          </div>
          {contact.blocked && (
            <div className="sn-t2" style={{ textAlign: 'center', padding: '8px', fontSize: 12, background: 'rgba(255,255,255,0.04)' }}>
              对方已拒绝接收消息
            </div>
          )}
          <div className="sn-scroll">
            {msgs.map((m) => (
              <ChatMsgRow key={m.id} m={m} name={contact.name} blocked={contact.blocked} onConfront={setMenuMsg} />
            ))}
            {msgs.length === 0 && <div className="sn-empty">没有聊天记录</div>}
          </div>
        </div>
        {menuMsg && (
          <div className="sn-overlay" onClick={() => setMenuMsg(null)}>
            <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sn-t2" style={{ fontSize: 12, marginBottom: 10 }}>消息操作</div>
              <button
                className="sn-row"
                onClick={() => {
                  const quote = { name: menuMsg.from === 'me' ? '我' : contact.name, content: menuMsg.text }
                  setMenuMsg(null)
                  props.onBack()
                  onConfrontToChat(props.character, quote)
                }}
              >
                <span className="sn-t1">质问这条记录</span>
              </button>
            </div>
          </div>
        )}
      </ModuleShell>
    )
  }

  const kw = q.trim().toLowerCase()
  const list = kw ? data.wechat.contacts.filter((c) => c.name.toLowerCase().includes(kw)) : data.wechat.contacts

  return (
    <ModuleShell {...props}>
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#6a6a6a' }} />
          <input className="sn-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索联系人" style={{ paddingLeft: 32 }} />
        </div>
      </div>
      <div className="sn-scroll">
        {list.map((c) => (
          <button key={c.id} className="sn-row" onClick={() => setOpenId(c.id)}>
            <Avatar imageId={c.id === 'c_pin' || c.secret ? props.character.avatarId : null} name={c.name} size={40} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="sn-t1" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
                {c.tag && <span className="sn-chip">{c.tag}</span>}
              </span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                <Highlight text={c.last} words={sensitive} />
              </span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <span className="sn-t2" style={{ fontSize: 10 }}>{c.time}</span>
              {c.unread > 0 && <span className="sn-unread">{c.unread}</span>}
            </span>
          </button>
        ))}
        {list.length === 0 && <div className="sn-empty">没有找到联系人</div>}
      </div>
    </ModuleShell>
  )
}

/** 单条聊天消息：长按/右键弹出操作 */
function ChatMsgRow({
  m,
  name,
  blocked,
  onConfront,
}: {
  m: SnoopChatMsg
  name: string
  blocked?: boolean
  onConfront: (m: SnoopChatMsg) => void
}) {
  const words = useSensitiveWords()
  const timer = useRef<number | null>(null)
  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  const open = () => {
    navigator.vibrate?.(10)
    onConfront(m)
  }
  return (
    <div
      className={`sn-bubble ${m.from === 'me' ? 'sn-bubble--me' : 'sn-bubble--other'}${blocked ? ' sn-bubble--blocked' : ''}`}
      onPointerDown={() => {
        clear()
        timer.current = window.setTimeout(open, 480)
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerMove={clear}
      onContextMenu={(e) => {
        e.preventDefault()
        open()
      }}
    >
      <Highlight text={m.text} words={words} />
      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: m.from === 'me' ? 'right' : 'left' }}>{m.time}</div>
      <span style={{ display: 'none' }}>{name}</span>
    </div>
  )
}

/* ---------------- 2.2 备忘录 ---------------- */

function MemoModule(props: ModuleProps) {
  const { data, character } = props
  const push = useToast((s) => s.push)
  const words = useSensitiveWords()
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [needPw, setNeedPw] = useState<string | null>(null)
  const [pw, setPw] = useState('')

  const kw = q.trim().toLowerCase()
  const list = kw ? data.memos.filter((m) => m.title.toLowerCase().includes(kw) || m.body.toLowerCase().includes(kw)) : data.memos
  const memo = data.memos.find((m) => m.id === openId)

  if (memo) {
    return (
      <ModuleShell {...props}>
        <div className="sn-scroll">
          <div className="sn-t1" style={{ fontWeight: 700, fontSize: 16 }}>{memo.title}</div>
          <div className="sn-t2" style={{ fontSize: 11 }}>更新于 {memo.updated}</div>
          <div className="sn-card" style={{ padding: 14, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            <Highlight text={memo.body} words={words} />
          </div>
          <button
            className="sn-row"
            onClick={() => {
              useSnoop.getState().addSensitive(memo.body.slice(0, 4))
              push('已加入敏感词库')
            }}
          >
            <span className="sn-t1">标记为敏感内容</span>
          </button>
          <button className="sn-row" onClick={() => setOpenId(null)}>
            <ChevronLeft size={16} />
            <span className="sn-t1">返回列表</span>
          </button>
        </div>
      </ModuleShell>
    )
  }

  return (
    <ModuleShell {...props}>
      <div style={{ padding: '10px 14px 0', display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#6a6a6a' }} />
          <input className="sn-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索备忘录" style={{ paddingLeft: 32 }} />
        </div>
        <button className="sn-iconbtn" onClick={() => push('新建备忘（模拟）')} aria-label="新建">
          <Plus size={17} />
        </button>
      </div>
      <div className="sn-scroll">
        {list.map((m) => (
          <button
            key={m.id}
            className="sn-row"
            onClick={() => {
              if (m.locked) {
                setNeedPw(m.id)
                setPw('')
              } else setOpenId(m.id)
            }}
          >
            {m.locked ? <Lock size={16} color="#ffa502" /> : null}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>{m.title}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {m.locked ? '需要二级密码解锁' : m.body.split('\n')[0]}
              </span>
            </span>
          </button>
        ))}
        {list.length === 0 && <div className="sn-empty">没有备忘录</div>}
      </div>
      {needPw && (
        <div className="sn-overlay" onClick={() => setNeedPw(null)}>
          <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sn-t1" style={{ fontWeight: 700, marginBottom: 12 }}>🔒 输入二级密码</div>
            <input
              className="sn-search"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value.replace(/\D/g, ''))}
              placeholder="6 位数字"
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="sn-row" style={{ justifyContent: 'center' }} onClick={() => setNeedPw(null)}>取消</button>
              <button
                className="sn-row"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  if (pw === useSnoop.getState().passwordOf(character.id)) {
                    setOpenId(needPw)
                    setNeedPw(null)
                  } else push('密码错误', 'error')
                }}
              >
                解锁
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  )
}

/* ---------------- 2.3 浏览器历史 ---------------- */

function BrowserModule(props: ModuleProps) {
  const { data, character } = props
  const push = useToast((s) => s.push)
  const words = useSensitiveWords()
  const [tab, setTab] = useState<'searches' | 'bookmarks' | 'downloads'>('searches')
  return (
    <ModuleShell {...props}>
      <div className="sn-tabs">
        {([['searches', '搜索历史'], ['bookmarks', '书签'], ['downloads', '下载记录']] as const).map(([k, label]) => (
          <button key={k} className={`sn-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="sn-scroll">
        {tab === 'searches' &&
          data.browser.searches.map((s, i) => (
            <div key={i} className="sn-row">
              <span className="sn-t1" style={{ flex: 1 }}><Highlight text={s.word} words={words} /></span>
              <span className="sn-t2" style={{ fontSize: 11 }}>{s.time}</span>
            </div>
          ))}
        {tab === 'bookmarks' &&
          data.browser.bookmarks.map((b, i) => (
            <div key={i} className="sn-row">
              <span className="sn-chip">{b.folder}</span>
              <span className="sn-t1" style={{ flex: 1 }}>{b.title}</span>
            </div>
          ))}
        {tab === 'downloads' &&
          data.browser.downloads.map((d, i) => (
            <div key={i} className="sn-row">
              <span className="sn-t1" style={{ flex: 1 }}>{d.name}</span>
              <span className="sn-t2" style={{ fontSize: 11 }}>{d.size} · {d.time}</span>
            </div>
          ))}
        <button
          className="sn-row"
          style={{ justifyContent: 'center', color: '#ff8a94' }}
          onClick={() => {
            void useSnoop.getState().ensurePhone(character)
            push('已清除浏览数据')
          }}
        >
          <Trash2 size={15} /> 清除浏览数据
        </button>
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.4 钱包 / 账单 ---------------- */

function WalletModule(props: ModuleProps) {
  const { data } = props
  return (
    <ModuleShell {...props}>
      <div style={{ padding: '12px 14px 0' }}>
        <div className="sn-card" style={{ padding: 18 }}>
          <div className="sn-t2" style={{ fontSize: 12 }}>账户余额</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>¥{data.wallet.balance.toFixed(2)}</div>
        </div>
      </div>
      <div className="sn-scroll">
        {data.wallet.bills.map((b) => (
          <div key={b.id} className="sn-row">
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>
                {b.target}
                {b.flag === 'big' && <span className="sn-flag-big"> ❗</span>}
              </span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                {b.kind} · {b.status}
              </span>
            </span>
            <span
              className={b.flag === 'game' ? 'sn-flag-game' : b.flag === 'suspicious' ? 'sn-flag-suspicious' : b.flag === 'big' ? 'sn-flag-big' : 'sn-t1'}
              style={{ fontWeight: 700 }}
            >
              {b.kind === '收入' ? '+' : '-'}
              {b.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.5 音乐 ---------------- */

function MusicModule(props: ModuleProps) {
  const { data } = props
  const [pl, setPl] = useState<string | null>(null)
  const playlist = data.music.playlists.find((p) => p.name === pl)
  return (
    <ModuleShell {...props}>
      <div className="sn-scroll" style={{ paddingBottom: 70 }}>
        <div className="sn-t2" style={{ fontSize: 12 }}>最近播放</div>
        {(playlist ? playlist.songs : data.music.recent).map((t, i) => (
          <div key={i} className="sn-row">
            <span className="sn-t1" style={{ flex: 1 }}>
              {t.name} <span className="sn-t2" style={{ fontSize: 11 }}>· {t.artist}</span>
            </span>
            <span className="sn-t2" style={{ fontSize: 11 }}>{t.plays} 次</span>
          </div>
        ))}
        <div className="sn-t2" style={{ fontSize: 12, marginTop: 8 }}>
          收藏歌单{playlist ? ` · ${pl}（点击顶部歌单名返回）` : ''}
        </div>
        <div className="sn-grid">
          {data.music.playlists.map((p) => (
            <button key={p.name} className="sn-app" onClick={() => setPl(pl === p.name ? null : p.name)}>
              <span className="sn-app__emoji">💽</span>
              <span className="sn-app__name">{p.name}</span>
              <span className="sn-app__hint">{p.songs.length} 首</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sn-card" style={{ margin: '0 14px 14px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🎧</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="sn-t1" style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{data.music.nowPlaying.name}</span>
          <span className="sn-t2" style={{ display: 'block', fontSize: 11 }}>
            {data.music.nowPlaying.artist}{data.music.loop ? ` · 单曲循环《${data.music.loop}》` : ''}
          </span>
        </span>
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.6 地图 / 定位 ---------------- */

function MapModule(props: ModuleProps) {
  const { data } = props
  const pins = [12, 38, 64, 82]
  return (
    <ModuleShell {...props}>
      <div style={{ padding: '12px 14px 0' }}>
        <div
          className="sn-card"
          style={{
            position: 'relative',
            height: 190,
            overflow: 'hidden',
            background:
              'linear-gradient(180deg,#101418,#0c0f12), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 26px)',
          }}
        >
          {data.map.places.slice(0, 4).map((p, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${pins[i] ?? 50}%`,
                top: `${18 + ((i * 24) % 60)}%`,
                transform: 'translate(-50%,-50%)',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 18 }}>{p.kind === 'unusual' ? '🟠' : '🔵'}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 9, whiteSpace: 'nowrap' }}>{p.name}</span>
            </span>
          ))}
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 16 }} title="当前位置">
            🔵<span style={{ fontSize: 9, display: 'block' }}>当前位置</span>
          </span>
        </div>
      </div>
      <div className="sn-scroll">
        <div className="sn-t2" style={{ fontSize: 12 }}>今日到访</div>
        {data.map.places.map((p, i) => (
          <div key={i} className="sn-row">
            <span style={{ fontSize: 16 }}>{p.kind === 'unusual' ? '🟠' : '🔵'}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>{p.name}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                {p.arrive} 到达 · {p.leave} 离开
              </span>
            </span>
            <span className="sn-t2" style={{ fontSize: 11 }}>停留 {p.stay}</span>
          </div>
        ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.8 游戏库 ---------------- */

function GamesModule(props: ModuleProps) {
  const { data } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const game = data.games.find((g) => g.id === openId)
  if (game) {
    return (
      <ModuleShell {...props}>
        <div className="sn-scroll">
          <div className="sn-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="sn-t1" style={{ fontWeight: 700, fontSize: 16 }}>
              {game.name} {game.night && <span style={{ color: '#b085ff' }}>· 深夜党</span>}
            </div>
            <div className="sn-t2" style={{ fontSize: 12 }}>段位：{game.rank}</div>
            <div className="sn-t2" style={{ fontSize: 12 }}>总时长：{game.hours} 小时</div>
            <div className="sn-t2" style={{ fontSize: 12 }}>最近一次：{game.lastPlay}</div>
          </div>
          <div className="sn-t2" style={{ fontSize: 12 }}>常玩队友</div>
          {game.teammates.map((t, i) => (
            <div key={i} className="sn-row">
              <Avatar imageId={null} name={t.name} size={34} />
              <span className="sn-t1" style={{ flex: 1 }}>{t.name}</span>
              {t.tag && <span className="sn-chip" style={{ color: t.tag === '异性' ? '#ff8a94' : undefined }}>{t.tag}</span>}
            </div>
          ))}
          <div className="sn-t2" style={{ fontSize: 12 }}>游戏内聊天</div>
          {game.chats.map((c, i) => (
            <div key={i} className="sn-row"><span className="sn-t1" style={{ fontSize: 13 }}>{c}</span></div>
          ))}
        </div>
      </ModuleShell>
    )
  }
  return (
    <ModuleShell {...props}>
      <div className="sn-scroll">
        {data.games.map((g) => (
          <button key={g.id} className="sn-row" onClick={() => setOpenId(g.id)}>
            <span style={{ fontSize: 22 }}>🎮</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>
                {g.name} {g.night && <span style={{ color: '#b085ff', fontSize: 11 }}>深夜</span>}
              </span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{g.rank} · {g.hours}h</span>
            </span>
          </button>
        ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.9 购物 ---------------- */

function ShoppingModule(props: ModuleProps) {
  const { data } = props
  const [tab, setTab] = useState<'history' | 'orders' | 'favorites'>('history')
  return (
    <ModuleShell {...props}>
      <div className="sn-tabs">
        {([['history', '浏览记录'], ['orders', '订单'], ['favorites', '收藏夹']] as const).map(([k, label]) => (
          <button key={k} className={`sn-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="sn-scroll">
        {tab === 'history' &&
          data.shopping.history.map((it) => (
            <div key={it.id} className="sn-row">
              <span style={{ fontSize: 20 }}>📦</span>
              <span className="sn-t1" style={{ flex: 1 }}>{it.name}</span>
              <span className="sn-t2" style={{ fontSize: 11 }}>{it.views && it.views > 3 ? `反复查看 ${it.views} 次` : it.time}</span>
            </div>
          ))}
        {tab === 'orders' &&
          data.shopping.orders.map((o) => (
            <div key={o.id} className="sn-row" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>{o.kind === '外卖' ? '🍜' : o.kind === '二手' ? '♻️' : '📦'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="sn-t1" style={{ fontWeight: 600 }}>
                  {o.shop} {o.gift && <span className="sn-chip" style={{ color: '#ffa502' }}>礼物</span>}
                </span>
                <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{o.detail}</span>
                <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                  送至：<span style={{ color: o.offAddress ? '#ff7a45' : undefined, fontWeight: o.offAddress ? 700 : 400 }}>{o.address}</span>
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span className="sn-t1" style={{ display: 'block', fontWeight: 700 }}>{o.price}</span>
                <span className="sn-t2" style={{ fontSize: 10 }}>{o.status}</span>
              </span>
            </div>
          ))}
        {tab === 'favorites' &&
          data.shopping.favorites.map((it) => (
            <div key={it.id} className="sn-row">
              <span style={{ fontSize: 20 }}>{it.gift ? '🎁' : '🛍️'}</span>
              <span className="sn-t1" style={{ flex: 1 }}>
                {it.name} {it.gift && <span className="sn-chip" style={{ color: '#ffa502' }}>礼物</span>}
              </span>
              <span className="sn-t2" style={{ fontSize: 11 }}>{it.price}</span>
            </div>
          ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.10 视频 ---------------- */

function VideoModule(props: ModuleProps) {
  const { data } = props
  const push = useToast((s) => s.push)
  const [tab, setTab] = useState<'history' | 'favorites' | 'later'>('history')
  const list = tab === 'history' ? data.video.history : tab === 'favorites' ? data.video.favorites : data.video.later
  return (
    <ModuleShell {...props}>
      <div className="sn-tabs">
        {([['history', '观看记录'], ['favorites', '收藏'], ['later', '稍后再看']] as const).map(([k, label]) => (
          <button key={k} className={`sn-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="sn-scroll">
        {list.map((v) => (
          <div key={v.id} className="sn-row">
            <span style={{ fontSize: 20 }}>📺</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>{v.title}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>进度 {v.progress} · {v.time}</span>
            </span>
          </div>
        ))}
        {tab === 'history' && (
          <button className="sn-row" style={{ justifyContent: 'center', color: '#ff8a94' }} onClick={() => push('已清除观看记录')}>
            <Trash2 size={15} /> 清除观看记录
          </button>
        )}
        <div className="sn-t2" style={{ fontSize: 12, marginTop: 8 }}>我的弹幕</div>
        {data.video.danmaku.map((d, i) => (
          <div key={i} className="sn-row"><span className="sn-t2" style={{ fontSize: 12 }}>{d}</span></div>
        ))}
        <div className="sn-t2" style={{ fontSize: 12, marginTop: 8 }}>我的评论</div>
        {data.video.comments.map((c, i) => (
          <div key={i} className="sn-row"><span className="sn-t1" style={{ fontSize: 13 }}>{c}</span></div>
        ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.11 社交小号 / 论坛 ---------------- */

function ForumModule(props: ModuleProps) {
  const { data } = props
  const [openId, setOpenId] = useState<string | null>(null)
  const acc = data.forum.find((a) => a.id === openId)
  if (acc) {
    return (
      <ModuleShell {...props}>
        <div className="sn-scroll">
          <div className="sn-card" style={{ padding: 16 }}>
            <div className="sn-t1" style={{ fontWeight: 700, fontSize: 16 }}>{acc.name}</div>
            <div className="sn-t2" style={{ fontSize: 12, marginTop: 4 }}>{acc.platform} · {acc.fans} 粉丝</div>
          </div>
          <div className="sn-t2" style={{ fontSize: 12 }}>发帖记录</div>
          {acc.posts.map((p, i) => (
            <div key={i} className="sn-row"><span className="sn-t1" style={{ fontSize: 13 }}>{p}</span></div>
          ))}
          <div className="sn-t2" style={{ fontSize: 12 }}>私信收件箱</div>
          {acc.dms.map((d, i) => (
            <div key={i} className="sn-row"><span className="sn-t1" style={{ fontSize: 13 }}>{d}</span></div>
          ))}
          <div className="sn-t2" style={{ fontSize: 12 }}>浏览记录</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {acc.browsed.map((b, i) => (
              <span key={i} className="sn-chip">{b}</span>
            ))}
          </div>
        </div>
      </ModuleShell>
    )
  }
  return (
    <ModuleShell {...props}>
      <div className="sn-scroll">
        <div className="sn-t2" style={{ fontSize: 12 }}>隐藏账号（额外验证）</div>
        {data.forum.map((a) => (
          <button key={a.id} className="sn-row" onClick={() => setOpenId(a.id)}>
            <Avatar imageId={null} name={a.name} size={38} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sn-t1" style={{ fontWeight: 600 }}>{a.name}</span>
              <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{a.platform} · {a.fans} 粉丝</span>
            </span>
          </button>
        ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 2.7 私密空间 ---------------- */

function PrivateModule(props: ModuleProps) {
  const { data } = props
  const words = useSensitiveWords()
  const [tab, setTab] = useState<'photos' | 'chats' | 'memos'>('photos')
  return (
    <ModuleShell {...props}>
      <div className="sn-tabs">
        {([['photos', '隐藏相册'], ['chats', '私密对话'], ['memos', '隐藏备忘']] as const).map(([k, label]) => (
          <button key={k} className={`sn-tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="sn-scroll">
        {tab === 'photos' && (
          <div className="sn-grid">
            {data.private.photos.map((p, i) => (
              <div key={i} className="sn-card" style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 22 }}>🖼️</span>
                <span className="sn-t2" style={{ fontSize: 10, textAlign: 'center' }}>{p}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'chats' &&
          data.private.chats.map((m) => (
            <div key={m.id} className={`sn-bubble ${m.from === 'me' ? 'sn-bubble--me' : 'sn-bubble--other'}`}>
              <Highlight text={m.text} words={words} />
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3 }}>{m.time}</div>
            </div>
          ))}
        {tab === 'memos' &&
          data.private.memos.map((m) => (
            <div key={m.id} className="sn-card" style={{ padding: 14 }}>
              <div className="sn-t1" style={{ fontWeight: 700 }}>{m.title}</div>
              <div className="sn-t2" style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                <Highlight text={m.body} words={words} />
              </div>
            </div>
          ))}
      </div>
    </ModuleShell>
  )
}

/* ---------------- 路由 ---------------- */

export const MODULE_VIEWS: Record<SnoopModuleId, (p: ModuleProps) => ReactNode> = {
  wechat: WeChatModule,
  memo: MemoModule,
  browser: BrowserModule,
  wallet: WalletModule,
  music: MusicModule,
  map: MapModule,
  games: GamesModule,
  shopping: ShoppingModule,
  video: VideoModule,
  forum: ForumModule,
  private: PrivateModule,
}

/* ---------------- 对峙跳转 ---------------- */

export function onConfrontToChat(c: Character, quote: { name: string; content: string }) {
  confrontInChat(c, quote, '我需要一个解释。')
  useUI.getState().setPendingChat({ kind: 'single', characterId: c.id })
  useUI.getState().openApp('chat')
}