import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Gift, Heart, Mic, MicOff, Send, ShoppingBag, X } from 'lucide-react'
import { useDouyin, userAuthor } from '../../store/douyin'
import { useToast } from '../../store/ui'
import {
  GIFT_LIST,
  LIVE_TYPE_META,
  aiLiveDanmaku,
  aiLiveReply,
  dyAuthors,
  fallbackDanmaku,
  fallbackDanmakuOf,
  fallbackHostLine,
  gradientOf,
  liveTypeOf,
  type DyAuthor,
  type DyGift,
  type DyLiveType,
  type DyVideo,
} from '../../lib/douyinEngine'
import { DyAvatar, DyIcon, STYLE_ICON, formatCount, useCoverSrc } from './parts'

interface DanmakuItem {
  id: number
  name: string
  text: string
  kind: 'viewer' | 'me' | 'host' | 'sys' | 'gift'
}

interface CohostLine {
  id: number
  me: boolean
  text: string
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/** 模块级自增序号：保证弹幕/弹幕 key 全局唯一（含重挂载） */
let DM_SEQ = 0
function nextId(): number {
  DM_SEQ += 1
  return DM_SEQ
}

/** 直播间画面：渐变舞台 + 风格矢量图标 + 封面（若有） */
function Stage({
  author,
  coverImage,
  icon,
  badge,
  badgeIcon,
  label,
}: {
  author: DyAuthor
  coverImage?: string | null
  icon: string
  badge?: string
  badgeIcon?: string
  label?: string
}) {
  const src = useCoverSrc(coverImage ?? null)
  const [a, b] = gradientOf(`${author.key}${author.name}`)
  return (
    <div className="dy-live-stagewrap" style={src ? undefined : { background: `linear-gradient(160deg, ${a}, ${b})` }}>
      {src ? <img className="dy-live-stageimg" src={src} alt="" /> : null}
      <div className="dy-live-stageanim" />
      <span className="dy-live-stageemoji">
        <DyIcon name={icon} size={104} color="#fff" strokeWidth={1.2} />
      </span>
      <div className="dy-live-stagefoot" />
      {badge && (
        <span className="dy-live-stagebadge">
          {badgeIcon && <DyIcon name={badgeIcon} size={11} color="#fff" />}
          {badge}
        </span>
      )}
      {label && <span className="dy-live-stagelabel">{label}</span>}
    </div>
  )
}

export default function LiveRoom({
  video,
  onClose,
  onOpenAuthor,
}: {
  video: DyVideo
  onClose: () => void
  onOpenAuthor: (a: DyAuthor) => void
}) {
  const host = video.author
  const liveType: DyLiveType = video.live?.type ?? liveTypeOf(host)
  const meta = LIVE_TYPE_META[liveType]
  const title = video.live?.title ?? '随便聊聊，路过进来坐坐'

  const coins = useDouyin((s) => s.coins)
  const spendCoins = useDouyin((s) => s.spendCoins)
  const follows = useDouyin((s) => s.follows)
  const toggleFollow = useDouyin((s) => s.toggleFollow)
  const ensurePool = useDouyin((s) => s.ensurePool)
  const toast = useToast((s) => s.push)

  const [viewers, setViewers] = useState(video.live?.viewers ?? randInt(80, 12800))
  const [likes, setLikes] = useState(video.live?.likes ?? randInt(200, 90000))
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([])
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([])
  const [giftFx, setGiftFx] = useState<{ id: number; gift: DyGift } | null>(null)
  const [draft, setDraft] = useState('')
  const [giftOpen, setGiftOpen] = useState(false)
  const [cohost, setCohost] = useState<'idle' | 'pending' | 'on'>('idle')
  const [cohostLines, setCohostLines] = useState<CohostLine[]>([])
  const [pool, setPool] = useState<DyAuthor[]>([])

  const seq = useRef(0)
  const listRef = useRef<HTMLDivElement | null>(null)
  const danmakuRef = useRef<DanmakuItem[]>([])
  const me = useMemo(() => userAuthor(), [])
  const isFollowed = follows.includes(host.key)

  useEffect(() => {
    danmakuRef.current = danmaku
  }, [danmaku])

  // 观众池：全部创作者 + 路人（排除主播本人）
  useEffect(() => {
    const list = [...dyAuthors(), ...ensurePool()].filter((a) => a.key !== host.key)
    setPool(list)
  }, [host.key, ensurePool])

  const pushDanmaku = (text: string, name: string, kind: DanmakuItem['kind'] = 'viewer') => {
    seq.current += 1
    setDanmaku((d) => [...d, { id: seq.current, name, text, kind }].slice(-40))
  }

  const pushHeart = (count = 1) => {
    const add = Array.from({ length: count }, () => ({ id: Math.random(), left: 8 + Math.random() * 74 }))
    setHearts((h) => [...h, ...add].slice(-30))
    setLikes((n) => n + count)
    window.setTimeout(() => {
      setHearts((h) => h.filter((x) => !add.some((a) => a.id === x.id)))
    }, 1800)
  }

  // 观众弹幕持续滚动
  useEffect(() => {
    if (pool.length === 0) return
    for (let i = 0; i < 6; i++) pushDanmaku(fallbackDanmakuOf(liveType), pick(pool).name)
    const t = window.setInterval(() => {
      const v = pick(pool)
      pushDanmaku(fallbackDanmaku(), v.name)
      setViewers((n) => Math.max(50, n + randInt(-18, 30)))
      if (Math.random() < 0.05) pushHeart(1)
      if (Math.random() < 0.05) {
        const g = GIFT_LIST[randInt(0, 2)]
        pushDanmaku(`送出 ${g.name}`, v.name, 'gift')
      }
    }, 1900)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, liveType])

  // 主播偶尔对着镜头说话
  useEffect(() => {
    const t = window.setInterval(() => {
      if (cohost === 'on') return
      pushDanmaku(fallbackHostLine(liveType), host.name, 'host')
    }, 6800)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveType, host.name, cohost])

  // AI 批量生成弹幕
  useEffect(() => {
    if (pool.length === 0) return
    let alive = true
    const run = async () => {
      const recent = danmakuRef.current.slice(-8).map((d) => d.text)
      const rows = await aiLiveDanmaku(host, liveType, title, recent, pool, randInt(3, 5))
      if (!alive || !rows) return
      rows.forEach((r) => pushDanmaku(r.text, r.name))
    }
    const t = window.setInterval(() => void run(), 9000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host.key, liveType, title, pool])

  // 弹幕自动滚到底
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [danmaku.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    pushDanmaku(text, '我', 'me')
    setDraft('')
    if (cohost === 'on') {
      seq.current += 1
      setCohostLines((l) => [...l, { id: seq.current, me: true, text }])
    }
    const history = danmakuRef.current.slice(-6).map((d) => `${d.name}：${d.text}`)
    void (async () => {
      const reply = await aiLiveReply(host, liveType, title, `观众「我」说：${text}`, history)
      pushDanmaku(reply, host.name, 'host')
      if (cohost === 'on') {
        seq.current += 1
        setCohostLines((l) => [...l, { id: seq.current, me: false, text: reply }])
      }
    })()
  }

  const sendGift = (gift: DyGift) => {
    if (!spendCoins(gift.coins)) {
      toast('金币不足，去「我」页充值')
      return
    }
    setGiftOpen(false)
    setGiftFx({ id: Date.now(), gift })
    pushDanmaku(`送出 ${gift.name}`, '我', 'gift')
    if (gift.coins >= 88) pushHeart(30)
    window.setTimeout(() => setGiftFx(null), 2200)
    void (async () => {
      const reply = await aiLiveReply(host, liveType, title, `观众「我」送出了礼物「${gift.name}（${gift.coins}金币）」`, [])
      pushDanmaku(reply, host.name, 'host')
    })()
  }

  const requestCohost = () => {
    if (cohost !== 'idle') return
    setCohost('pending')
    pushDanmaku('申请连麦', '我', 'me')
    toast('连麦申请已发送，等待主播响应…')
    window.setTimeout(async () => {
      const agree = Math.random() < (isFollowed ? 0.85 : 0.6)
      if (!agree) {
        setCohost('idle')
        pushDanmaku('主播暂时没接受你的连麦', '系统', 'sys')
        toast('主播暂时没接受连麦，稍后再试')
        return
      }
      setCohost('on')
      pushDanmaku('主播同意了你的连麦，双屏已开启', '系统', 'sys')
      const greet = await aiLiveReply(host, liveType, title, '你和观众「我」刚刚接通连麦，先打个招呼', [])
      seq.current += 1
      setCohostLines([{ id: seq.current, me: false, text: greet }])
    }, 2600)
  }

  const endCohost = () => {
    setCohost('idle')
    pushDanmaku('连麦已结束', '系统', 'sys')
  }

  const DanmakuRow = (d: DanmakuItem) => {
    if (d.kind === 'sys') {
      return (
        <div key={d.id} className="dy-live-dm dy-live-dm--sys">
          {d.text}
        </div>
      )
    }
    if (d.kind === 'gift') {
      return (
        <div key={d.id} className="dy-live-dm dy-live-dm--gift">
          <span className="dy-live-dm-name">{d.name}</span>
          <span className="dy-live-dm-gift">{d.text}</span>
        </div>
      )
    }
    return (
      <div key={d.id} className={`dy-live-dm${d.kind === 'host' ? ' dy-live-dm--host' : ''}${d.kind === 'me' ? ' dy-live-dm--me' : ''}`}>
        {d.kind === 'host' && <span className="dy-live-dm-tag">主播</span>}
        <span className="dy-live-dm-name">{d.kind === 'me' ? '我' : d.name}：</span>
        <span className="dy-live-dm-text">{d.text}</span>
      </div>
    )
  }

  const followBtn = (
    <button
      className={`dy-live-follow pressable${isFollowed ? ' dy-live-follow--done' : ''}`}
      onClick={() => {
        toggleFollow(host.key)
        toast(isFollowed ? '已取消关注' : `已关注 @${host.name}`)
      }}
    >
      {isFollowed ? '已关注' : '+ 关注'}
    </button>
  )

  const hostStage = (
    <Stage
      author={host}
      coverImage={video.coverImage}
      icon={STYLE_ICON[video.style]}
      badge={meta.label}
      badgeIcon={meta.icon}
    />
  )

  return (
    <div className="dy-live">
      <div className={`dy-live-stages${cohost === 'on' ? ' dy-live-stages--split' : ''}`}>
        {cohost === 'on' ? (
          <>
            <div className="dy-live-half">
              {hostStage}
              <span className="dy-live-half-label">{host.name}（主播）</span>
            </div>
            <div className="dy-live-half dy-live-half--me">
              <Stage author={me} icon="user" />
              <span className="dy-live-half-label dy-live-half-label--me">我（连麦中）</span>
              <div className="dy-live-cohost-lines">
                {cohostLines.map((l) => (
                  <div key={l.id} className={`dy-live-cohost-line${l.me ? ' dy-live-cohost-line--me' : ''}`}>
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          hostStage
        )}
      </div>

      {/* 飘心层 */}
      <div className="dy-live-hearts">
        {hearts.map((h) => (
          <span key={h.id} className="dy-live-heart" style={{ left: `${h.left}%` }}>
            <Heart size={18} color="#fe2c55" fill="#fe2c55" />
          </span>
        ))}
      </div>

      {/* 礼物动画 */}
      {giftFx && (
        <div className="dy-live-giftfx" key={giftFx.id}>
          <span className="dy-live-giftfx-emoji">
            <DyIcon name={giftFx.gift.icon} size={92} color="#ffcf5c" strokeWidth={1.6} />
          </span>
          <span className="dy-live-giftfx-text">我 送出了 {giftFx.gift.name}</span>
        </div>
      )}

      {/* 顶部：关闭 / 主播信息 / 在线 */}
      <div className="dy-live-top">
        <button className="dy-live-icon pressable" onClick={onClose} title="退出直播间">
          <X size={18} />
        </button>
        <button className="dy-live-host pressable" onClick={() => onOpenAuthor(host)}>
          <DyAvatar author={host} size={34} />
          <span className="dy-live-host-info">
            <span className="dy-live-host-name">{host.name}</span>
            <span className="dy-live-host-sub">{formatCount(viewers)} 人在线</span>
          </span>
        </button>
        {followBtn}
        <span className="dy-live-roomnum">房间号 {String(Math.abs(viewers * 7 + 10086)).slice(0, 6)}</span>
      </div>

      {/* 带货小黄车 */}
      {liveType === 'commerce' && (
        <button
          className="dy-live-product pressable"
          onClick={() => toast('已加入购物车（演示）')}
        >
          <span className="dy-live-product-thumb">
            <ShoppingBag size={20} color="#fff" />
          </span>
          <span className="dy-live-product-body">
            <span className="dy-live-product-title">主播自用同款 · 限时秒杀</span>
            <span className="dy-live-product-sub">已抢 {formatCount(randInt(300, 9000))} 件 · 剩 {randInt(3, 30)} 件</span>
          </span>
          <span className="dy-live-product-price">¥{pick([39, 59, 99, 129, 199])}</span>
          <ChevronRight size={15} />
        </button>
      )}

      {/* 右侧互动栏 */}
      <div className="dy-live-rail">
        <div className="dy-live-rail-count">
          <b>{formatCount(viewers)}</b>
          <span>在线</span>
        </div>
        <button className="dy-live-rail-btn pressable" onClick={() => pushHeart(1)}>
          <Heart size={26} color="#fe2c55" fill="#fe2c55" />
          <span>{formatCount(likes)}</span>
        </button>
        <button className="dy-live-rail-btn pressable" onClick={() => setGiftOpen(true)}>
          <Gift size={26} color="#fff" />
          <span>礼物</span>
        </button>
      </div>

      {/* 弹幕区 */}
      <div className="dy-live-danmaku" ref={listRef}>
        {danmaku.map(DanmakuRow)}
      </div>

      {/* 底部操作栏 */}
      <div className="dy-live-bar">
        <input
          className="dy-live-input"
          placeholder="说点什么…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button
          className={`dy-live-action pressable${cohost === 'on' ? ' dy-live-action--on' : ''}`}
          onClick={cohost === 'on' ? endCohost : requestCohost}
          disabled={cohost === 'pending'}
        >
          {cohost === 'on' ? <MicOff size={16} /> : <Mic size={16} />}
          <span>{cohost === 'pending' ? '申请中' : cohost === 'on' ? '挂断' : '连麦'}</span>
        </button>
        <button className="dy-live-action pressable" onClick={() => setGiftOpen(true)}>
          <Gift size={16} />
          <span>礼物</span>
        </button>
        <button className="dy-live-send pressable" onClick={send}>
          <Send size={16} />
        </button>
      </div>

      {cohost === 'pending' && (
        <div className="dy-live-pending">
          <span className="dy-live-pending-spin" />
          正在等待主播响应连麦申请…
        </div>
      )}

      {/* 礼物面板 */}
      {giftOpen && (
        <div className="dy-sheet-mask" onClick={() => setGiftOpen(false)}>
          <div className="dy-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="dy-sheet-head">
              <span>送出礼物</span>
              <span style={{ color: '#ffcf5c' }}>金币 {coins}</span>
            </div>
            <div className="dy-sheet-body">
              <div className="dy-live-giftgrid">
                {GIFT_LIST.map((g) => {
                  const afford = coins >= g.coins
                  return (
                    <button
                      key={g.id}
                      className="dy-live-giftcell pressable"
                      style={{ opacity: afford ? 1 : 0.45 }}
                      onClick={() => sendGift(g)}
                    >
                      <span className="dy-live-giftcell-emoji">
                        <DyIcon name={g.icon} size={26} color="#fff" />
                      </span>
                      <span className="dy-live-giftcell-name">{g.name}</span>
                      <span className="dy-live-giftcell-price">{g.coins} 金币</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingTop: 10 }}>
                送礼物会消耗金币，并对主播触发专属致谢
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}