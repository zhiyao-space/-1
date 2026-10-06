import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Users,
  UserPlus,
  Smile,
  Sticker as StickerIcon,
  MoreHorizontal,
  Copy,
  Forward,
  Undo2,
  Trash2,
  Pin,
  Bell,
  BellOff,
  Flag,
  Eye,
  Mic,
  FileText,
  Check,
  Volume2,
} from 'lucide-react'
import {
  useForum,
  dmMessageKind,
  dmUnreadCount,
  type ForumAuthor,
  type ForumDM,
  type ForumDMMessage,
  type ForumDMReceivePermission,
} from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useStickers } from '../../store/stickers'
import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { useNotifications } from '../../store/notifications'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { AuthorAvatar, TimeAgo, EmptyBlock } from './shared'

type DmTab = 'friends' | 'strangers'

const PAGE_SIZE = 20
const EMOJIS = ['😀', '😄', '😊', '😉', '😍', '🤔', '😅', '😂', '🥰', '😭', '😎', '🙄', '👍', '👌', '🙏', '🎉', '🔥', '❤️', '✨', '🌟', '🍜', '☕', '🌙', '🐱']
const FILE_NAMES = ['会议纪要.pdf', '旅行清单.txt', '歌单分享.m3u', '随手拍.zip', '预算表.xlsx', '读书笔记.md']

/** 长按手势：触发后把 longRef 置真，避免随后的 click 再次打开 */
function useLongPress(onLong: () => void, ms = 450) {
  const timer = useRef<number | null>(null)
  const longRef = useRef(false)
  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  const onPointerDown = () => {
    longRef.current = false
    clear()
    timer.current = window.setTimeout(() => {
      longRef.current = true
      onLong()
    }, ms)
  }
  const handlers = {
    onPointerDown,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: { preventDefault: () => void }) => {
      e.preventDefault()
      if (longRef.current) return
      clear()
      longRef.current = true
      onLong()
    },
  }
  return { longRef, handlers }
}

export default function DmView({ initialDmId, onClearInitial, onOpenPost }: { initialDmId: string | null; onClearInitial: () => void; onOpenPost: (id: string) => void }) {
  const dms = useForum((s) => s.dms)
  const characters = useCharacters((s) => s.characters)
  const seedDmsIfEmpty = useForum((s) => s.seedDmsIfEmpty)
  const [tab, setTab] = useState<DmTab>('friends')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)

  // 首次进入且列表为空时，生成若干条起始会话，避免私信列表空空如也
  useEffect(() => {
    seedDmsIfEmpty()
  }, [seedDmsIfEmpty])

  useEffect(() => {
    if (initialDmId) {
      setOpenId(initialDmId)
      onClearInitial()
    }
  }, [initialDmId, onClearInitial])

  const open = dms.find((d) => d.id === openId)
  if (open) return <DmChat key={open.id} dm={open} onBack={() => setOpenId(null)} onOpenPost={onOpenPost} />

  const sortDms = (arr: ForumDM[]) =>
    [...arr].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.lastActive - a.lastActive)
  const friends = sortDms(dms.filter((d) => !d.stranger))
  const strangers = sortDms(dms.filter((d) => d.stranger))
  const list = tab === 'friends' ? friends : strangers
  const sheetDm = sheetId ? dms.find((d) => d.id === sheetId) : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 4, padding: '8px 14px 6px', flexShrink: 0 }}>
        {(
          [
            ['friends', `好友 ${friends.length}`],
            ['strangers', `陌生人 ${strangers.length}`],
          ] as [DmTab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            className="pressable"
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 999,
              fontSize: 'calc(13px * var(--fs-scale))',
              background: tab === k ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
              color: tab === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 24px' }}>
        {list.length === 0 ? (
          <EmptyBlock
            text={
              tab === 'friends'
                ? '还没有私信。在帖子里转发给角色，或关注一个角色等 TA 主动来找你'
                : '陌生人的私信会出现在这里，确认后再移入好友'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((d) => (
              <ConversationRow key={d.id} dm={d} onOpen={setOpenId} onLongPress={setSheetId} />
            ))}
          </div>
        )}

        {tab === 'friends' && characters.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>发起新私信</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {characters.map((c) => (
                <NewDmChip key={c.id} type="character" id={c.id} name={c.name} avatarId={c.avatarId} onOpen={setOpenId} />
              ))}
            </div>
          </div>
        )}
      </div>

      {sheetDm && (
        <RowSheet
          dm={sheetDm}
          onClose={() => setSheetId(null)}
          onOpen={(id) => {
            setSheetId(null)
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

/** 会话列表单行：长按弹出操作面板 */
function ConversationRow({ dm, onOpen, onLongPress }: { dm: ForumDM; onOpen: (id: string) => void; onLongPress: (id: string) => void }) {
  const { longRef, handlers } = useLongPress(() => onLongPress(dm.id))
  const unread = dmUnreadCount(dm)
  return (
    <div style={{ position: 'relative', flexShrink: 0, borderRadius: 14 }}>
      <button
        className="pressable glass"
        {...handlers}
        onClick={() => {
          if (longRef.current) {
            longRef.current = false
            return
          }
          onOpen(dm.id)
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 12px',
          borderRadius: 14,
          textAlign: 'left',
          background: dm.pinned ? 'rgba(255,255,255,0.10)' : undefined,
          opacity: dm.blocked ? 0.6 : 1,
        }}
      >
        <AuthorAvatar author={dm.partner} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span className="fs-body" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dm.partner.name}
            </span>
            {dm.pinned && <span className="fs-micro" style={{ color: 'var(--accent)', flexShrink: 0 }}>置顶</span>}
            {dm.blocked && <span className="fs-micro" style={{ color: '#ff8a8a', flexShrink: 0 }}>已屏蔽</span>}
            {dm.stranger && <span className="fs-micro" style={{ color: '#ffb08a', flexShrink: 0 }}>陌生人</span>}
          </div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
            {lastPreview(dm)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <TimeAgo t={dm.lastActive} />
          {unread > 0 && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: '#ff4d4f',
                color: '#fff',
                fontSize: 'calc(10px * var(--fs-scale))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

function lastPreview(d: ForumDM): string {
  const last = d.messages[d.messages.length - 1]
  if (!last) return '开始新的对话吧'
  if (last.recalled) return '[已撤回]'
  const kind = dmMessageKind(last)
  const prefix = last.from === 'user' ? '我：' : ''
  if (kind === 'voice') return `${prefix}[语音]`
  if (kind === 'file') return `${prefix}[文件]`
  if (kind === 'image') return `${prefix}[图片]`
  if (kind === 'sticker') return `${prefix}[表情]`
  if (kind === 'post') return `${prefix}[帖子]`
  return `${prefix}${last.content}`
}

function NewDmChip({ type, id, name, avatarId, onOpen }: { type: 'character' | 'npc'; id: string; name: string; avatarId: string | null; onOpen: (dmId: string) => void }) {
  const ensureDm = useForum((s) => s.ensureDm)
  const url = useBlobURL(avatarId)
  return (
    <button
      className="pressable"
      onClick={() => onOpen(ensureDm({ type, id, name, avatarId }, false))}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 6px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserPlus size={12} color="var(--text-tertiary)" />}
      </span>
      <span className="fs-micro" style={{ color: 'var(--text-body)' }}>{name}</span>
    </button>
  )
}

/** 会话长按操作面板 */
function RowSheet({ dm, onClose, onOpen }: { dm: ForumDM; onClose: () => void; onOpen: (id: string) => void }) {
  const togglePinDm = useForum((s) => s.togglePinDm)
  const markDmRead = useForum((s) => s.markDmRead)
  const markDmUnread = useForum((s) => s.markDmUnread)
  const clearDmMessages = useForum((s) => s.clearDmMessages)
  const setDmBlocked = useForum((s) => s.setDmBlocked)
  const reportDm = useForum((s) => s.reportDm)
  const removeDm = useForum((s) => s.removeDm)
  const push = useToast((s) => s.push)
  const unread = dmUnreadCount(dm)

  return (
    <Sheet onClose={onClose} title={dm.partner.name}>
      <SheetRow icon={<Pin size={17} />} label={dm.pinned ? '取消置顶' : '置顶会话'} onClick={() => { togglePinDm(dm.id); push(dm.pinned ? '已取消置顶' : '已置顶'); onClose() }} />
      <SheetRow
        icon={<Check size={17} />}
        label={unread > 0 ? '标为已读' : '标为未读'}
        onClick={() => {
          if (unread > 0) {
            markDmRead(dm.id)
            push('已标为已读')
          } else {
            markDmUnread(dm.id)
            push('已标为未读')
          }
          onClose()
        }}
      />
      <SheetRow icon={<Eye size={17} />} label="进入会话" onClick={() => onOpen(dm.id)} />
      <SheetRow icon={<Trash2 size={17} />} label="清空聊天记录" onClick={() => { clearDmMessages(dm.id); push('聊天记录已清空'); onClose() }} />
      <SheetRow
        icon={dm.blocked ? <Bell size={17} /> : <BellOff size={17} />}
        label={dm.blocked ? '取消屏蔽' : '屏蔽此人'}
        onClick={() => { setDmBlocked(dm.id, !dm.blocked); push(dm.blocked ? '已取消屏蔽' : '已屏蔽'); onClose() }}
      />
      <SheetRow icon={<Flag size={17} />} label="举报" danger onClick={() => { reportDm(dm.id); push('已提交举报'); onClose() }} />
      <SheetRow icon={<Trash2 size={17} />} label="删除会话" danger onClick={() => { removeDm(dm.id); push('会话已删除'); onClose() }} />
    </Sheet>
  )
}

function DmChat({ dm, onBack, onOpenPost }: { dm: ForumDM; onBack: () => void; onOpenPost: (id: string) => void }) {
  const addDmMessage = useForum((s) => s.addDmMessage)
  const updateDm = useForum((s) => s.updateDm)
  const markDmRead = useForum((s) => s.markDmRead)
  const stickers = useStickers((s) => s.stickers)
  const phoneName = useSettings((s) => s.phoneName)
  const push = useToast((s) => s.push)
  const [text, setText] = useState('')
  const [stickerOpen, setStickerOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [replying, setReplying] = useState(false)
  const [menuMsg, setMenuMsg] = useState<ForumDMMessage | null>(null)
  const [forwardMsg, setForwardMsg] = useState<ForumDMMessage | null>(null)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [now, setNow] = useState(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)

  const unread = dmUnreadCount(dm)

  // 打开会话时把未读标为已读
  useEffect(() => {
    if (unread > 0) markDmRead(dm.id)
  }, [unread, dm.id, markDmRead])

  // 驱动「发送中 → 已发送」状态刷新
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dm.messages.length])

  const runAutoReply = async () => {
    // 被屏蔽或对方不接收私信时不再自动回复
    const cur0 = useForum.getState().dms.find((d) => d.id === dm.id)
    if (cur0?.blocked || (cur0?.receivePermission ?? 'all') === 'none') return
    setReplying(true)
    try {
      const { generateDmReply, authorPersona } = await import('../../lib/forumEngine')
      const cur = useForum.getState().dms.find((d) => d.id === dm.id)
      if (cur) {
        const reply = await generateDmReply(cur, authorPersona(cur.partner))
        if (reply) {
          const { splitReply } = await import('../../lib/chatEngine')
          const parts = splitReply(reply).slice(0, 3)
          for (const part of parts) {
            useForum.getState().addDmMessage(dm.id, { from: 'them', content: part, imageId: null, stickerId: null, sharedPostId: null, kind: 'text', read: false })
          }
          // 轻量通知：toast + 通知中心红点
          const preview = (parts[0] ?? reply).slice(0, 40)
          useToast.getState().push(`${dm.partner.name} 回复了你`)
          useNotifications.getState().push({
            kind: 'dm',
            title: `${dm.partner.name} 私信`,
            body: preview,
            target: { app: 'forum', payload: { view: 'dm', id: dm.id } },
          })
        } else {
          push('对方暂时没有回应，请检查 API 配置', 'error')
        }
      }
    } finally {
      setReplying(false)
    }
  }

  const send = async () => {
    const t = text.trim()
    if (!t) return
    addDmMessage(dm.id, { from: 'user', content: t, imageId: null, stickerId: null, sharedPostId: null, kind: 'text' })
    setText('')
    setEmojiOpen(false)
    await runAutoReply()
  }

  const sendImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const compressed = await compressImage(f, 1080)
      const id = await putBlob(compressed)
      addDmMessage(dm.id, { from: 'user', content: '', imageId: id, stickerId: null, sharedPostId: null, kind: 'image' })
      runAutoReply()
    }
    input.click()
  }

  const sendSticker = (stickerId: string) => {
    addDmMessage(dm.id, { from: 'user', content: '', imageId: null, stickerId, sharedPostId: null, kind: 'sticker' })
    setStickerOpen(false)
    runAutoReply()
  }

  // 模拟发送语音：随机 3~15 秒
  const sendVoice = () => {
    const duration = 3 + Math.floor(Math.random() * 13)
    addDmMessage(dm.id, { from: 'user', content: '', imageId: null, stickerId: null, sharedPostId: null, kind: 'voice', voiceDuration: duration })
    runAutoReply()
  }

  // 模拟发送文件：随机文件名与大小
  const sendFile = () => {
    const name = FILE_NAMES[Math.floor(Math.random() * FILE_NAMES.length)]
    const size = 20 * 1024 + Math.floor(Math.random() * 3 * 1024 * 1024)
    addDmMessage(dm.id, { from: 'user', content: name, imageId: null, stickerId: null, sharedPostId: null, kind: 'file', fileName: name, fileSize: size })
    runAutoReply()
  }

  const hidden = Math.max(0, dm.messages.length - visible)
  const shown = dm.messages.slice(hidden)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <AuthorAvatar author={dm.partner} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="fs-body" style={{ color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dm.partner.name}
          </span>
          {dm.blocked && <span className="fs-micro" style={{ color: '#ff8a8a' }}>已屏蔽</span>}
        </div>
        {!dm.stranger && dm.messages.length > 0 && (
          <button className="btn btn-sm pressable" onClick={() => updateDm(dm.id, { stranger: true })} style={{ flexShrink: 0 }}>
            <Users size={12} /> 移回陌生人
          </button>
        )}
        {dm.stranger && dm.messages.length > 0 && (
          <button className="btn btn-sm btn-accent pressable" onClick={() => updateDm(dm.id, { stranger: false })} style={{ flexShrink: 0 }}>
            <UserPlus size={12} /> 加为好友
          </button>
        )}
        <button className="pressable" onClick={() => setHeaderOpen(true)} style={{ color: 'var(--text-secondary)', padding: 4, flexShrink: 0 }}>
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {dm.messages.length === 0 ? (
          <EmptyBlock text={`和 ${dm.partner.name} 还没有对话，说点什么吧`} />
        ) : (
          <>
            {hidden > 0 && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <button className="btn btn-sm pressable" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  加载更早消息（还有 {hidden} 条）
                </button>
              </div>
            )}
            {shown.map((m) => (
              <DmBubble
                key={m.id}
                mine={m.from === 'user'}
                name={m.from === 'user' ? phoneName || '我' : dm.partner.name}
                message={m}
                status={m.from === 'user' && !m.recalled ? sendStatus(m, dm.messages, now) : undefined}
                onLongPress={() => setMenuMsg(m)}
                onOpenPost={onOpenPost}
              />
            ))}
          </>
        )}
        {replying && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '6px 0 0 6px' }}>{dm.partner.name} 正在输入…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {emojiOpen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, padding: '10px 14px 4px', maxHeight: 150, overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {EMOJIS.map((e) => (
            <button key={e} className="pressable" onClick={() => setText((t) => t + e)} style={{ fontSize: 'calc(18px * var(--fs-scale))', padding: 4 }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {stickerOpen && (
        <div style={{ maxHeight: 160, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {stickers.length === 0 ? (
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', gridColumn: '1 / -1', textAlign: 'center', padding: 10 }}>
              还没有表情包，去 设置 → 聊天参数 添加
            </div>
          ) : (
            stickers.map((st) => <StickerCell key={st.id} imageId={st.imageId} onClick={() => sendSticker(st.id)} />)
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, padding: '8px 14px 2px', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <button className="pressable" onClick={() => { setEmojiOpen((v) => !v); setStickerOpen(false) }} style={{ padding: 4 }}>
            <Smile size={18} />
          </button>
          <button className="pressable" onClick={sendImage} style={{ padding: 4 }}>
            <ImagePlus size={18} />
          </button>
          <button className="pressable" onClick={sendVoice} style={{ padding: 4 }} title="发送语音">
            <Mic size={18} />
          </button>
          <button className="pressable" onClick={sendFile} style={{ padding: 4 }} title="发送文件">
            <FileText size={18} />
          </button>
          <button className="pressable" onClick={() => { setStickerOpen((v) => !v); setEmojiOpen(false) }} style={{ padding: 4 }}>
            <StickerIcon size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '6px 14px 16px', alignItems: 'center' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`发给 ${dm.partner.name}…`}
          />
          <button className="btn btn-accent pressable" style={{ padding: '0 14px', flexShrink: 0 }} onClick={send}>
            <Send size={15} />
          </button>
        </div>
      </div>

      {menuMsg && (
        <MessageMenu
          dm={dm}
          message={menuMsg}
          onClose={() => setMenuMsg(null)}
          onForward={() => {
            setForwardMsg(menuMsg)
            setMenuMsg(null)
          }}
        />
      )}
      {forwardMsg && <ForwardSheet dm={dm} message={forwardMsg} onClose={() => setForwardMsg(null)} />}
      {headerOpen && <HeaderSheet dm={dm} onClose={() => setHeaderOpen(false)} />}
    </div>
  )
}

/** 自己发出的消息：发送中 → 已发送 → 已读 */
function sendStatus(m: ForumDMMessage, messages: ForumDMMessage[], now: number): 'sending' | 'sent' | 'read' {
  const idx = messages.findIndex((x) => x.id === m.id)
  if (idx >= 0 && messages.slice(idx + 1).some((x) => x.from === 'them')) return 'read'
  if (now - m.time < 900) return 'sending'
  return 'sent'
}

function DmBubble({
  mine,
  name,
  message,
  status,
  onLongPress,
  onOpenPost,
}: {
  mine: boolean
  name: string
  message: ForumDMMessage
  status?: 'sending' | 'sent' | 'read'
  onLongPress: () => void
  onOpenPost: (id: string) => void
}) {
  const sharedPost = useForum((s) => (message.sharedPostId ? s.posts.find((p) => p.id === message.sharedPostId) : null))
  const url = useBlobURL(message.imageId)
  const stickerUrl = useBlobURL(message.stickerId)
  const { handlers } = useLongPress(onLongPress)
  const kind = dmMessageKind(message)

  if (message.recalled) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '3px 10px' }}>
          {mine ? '你撤回了一条消息' : '对方撤回了一条消息'}
        </span>
      </div>
    )
  }

  const bubbleBg = mine ? 'var(--accent)' : 'rgba(255,255,255,0.08)'
  const bubbleColor = mine ? '#000' : 'var(--text-body)'
  const bubbleRadius = mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'

  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', minWidth: 0 }}>
        {!mine && <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{name}</div>}
        <div {...handlers} style={{ minWidth: 0, maxWidth: '100%' }}>
          {message.sharedPostId && sharedPost && (
            <button className="glass pressable" onClick={() => onOpenPost(sharedPost.id)} style={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 12, padding: 10, marginBottom: 4 }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>帖子卡片 · 点击查看原帖</span>
              {sharedPost.title && <span className="fs-aux" style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2 }}>{sharedPost.title}</span>}
              <span className="fs-micro" style={{ display: '-webkit-box', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {sharedPost.content}
              </span>
            </button>
          )}

          {kind === 'voice' && (
            <div
              className="fs-body"
              style={{ background: bubbleBg, color: bubbleColor, borderRadius: bubbleRadius, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 110, border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
            >
              <Volume2 size={15} />
              <span style={{ height: 4, flex: 1, borderRadius: 2, background: mine ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)' }} />
              <span className="fs-micro" style={{ opacity: 0.8 }}>{message.voiceDuration ?? 0}″</span>
            </div>
          )}

          {kind === 'file' && (
            <div style={{ background: bubbleBg, color: bubbleColor, borderRadius: bubbleRadius, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
              <FileText size={22} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className="fs-body" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.fileName ?? message.content ?? '文件'}</div>
                <div className="fs-micro" style={{ opacity: 0.7 }}>{fmtSize(message.fileSize ?? 0)}</div>
              </div>
            </div>
          )}

          {kind === 'text' && message.content && (
            <div
              className="fs-body"
              style={{ background: bubbleBg, color: bubbleColor, borderRadius: bubbleRadius, padding: '9px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
            >
              {message.content}
            </div>
          )}

          {(url || stickerUrl) && (
            <img src={(url ?? stickerUrl) as string} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 12, display: 'block' }} />
          )}
        </div>
        {mine && status && (
          <div className="fs-micro" style={{ color: status === 'read' ? 'var(--accent)' : 'var(--text-disabled)', marginTop: 2 }}>
            {status === 'sending' ? '发送中…' : status === 'read' ? '已读' : '已发送'}
          </div>
        )}
      </div>
    </div>
  )
}

/** 单条消息长按菜单 */
function MessageMenu({ dm, message, onClose, onForward }: { dm: ForumDM; message: ForumDMMessage; onClose: () => void; onForward: () => void }) {
  const recallDmMessage = useForum((s) => s.recallDmMessage)
  const removeDmMessage = useForum((s) => s.removeDmMessage)
  const push = useToast((s) => s.push)
  const mine = message.from === 'user'
  const canRecall = mine && Date.now() - message.time <= 120_000

  const copy = async () => {
    const kind = dmMessageKind(message)
    let t = message.content
    if (kind === 'voice') t = `[语音 ${message.voiceDuration ?? 0}″]`
    else if (kind === 'file') t = `[文件] ${message.fileName ?? ''}`
    else if (kind === 'image') t = '[图片]'
    else if (kind === 'sticker') t = '[表情]'
    else if (kind === 'post') t = '[帖子卡片]'
    try {
      await navigator.clipboard.writeText(t)
      push('已复制')
    } catch {
      push('复制失败', 'error')
    }
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <SheetRow icon={<Copy size={17} />} label="复制" onClick={copy} />
      <SheetRow icon={<Forward size={17} />} label="转发" onClick={onForward} />
      {canRecall && (
        <SheetRow icon={<Undo2 size={17} />} label="撤回" danger onClick={() => { recallDmMessage(dm.id, message.id); push('已撤回'); onClose() }} />
      )}
      <SheetRow icon={<Trash2 size={17} />} label="删除" danger onClick={() => { removeDmMessage(dm.id, message.id); push('已删除'); onClose() }} />
    </Sheet>
  )
}

/** 转发：从会话列表 / 角色 / NPC 中选择目标 */
function ForwardSheet({ dm, message, onClose }: { dm: ForumDM; message: ForumDMMessage; onClose: () => void }) {
  const dms = useForum((s) => s.dms)
  const characters = useCharacters((s) => s.characters)
  const npcs = useForum((s) => s.npcs)
  const ensureDm = useForum((s) => s.ensureDm)
  const forwardDmMessage = useForum((s) => s.forwardDmMessage)
  const push = useToast((s) => s.push)

  const doForward = (toDmId: string, name: string) => {
    forwardDmMessage(dm.id, message.id, toDmId)
    push(`已转发给 ${name}`)
    onClose()
  }

  const others = dms.filter((d) => d.id !== dm.id)
  const newChars = characters.filter((c) => !dms.some((d) => d.partner.type === 'character' && d.partner.id === c.id))
  const newNpcs = npcs.filter((n) => !dms.some((d) => d.partner.type === 'npc' && d.partner.id === n.id))

  return (
    <Sheet onClose={onClose} title="转发到">
      <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
        {others.map((d) => (
          <TargetRow key={d.id} author={d.partner} sub={`${d.messages.length} 条私信`} onClick={() => doForward(d.id, d.partner.name)} />
        ))}
        {newChars.map((c) => {
          const author: ForumAuthor = { type: 'character', id: c.id, name: c.name, avatarId: c.avatarId }
          return <TargetRow key={c.id} author={author} sub="发起新会话" onClick={() => doForward(ensureDm(author, false), c.name)} />
        })}
        {newNpcs.map((n) => {
          const author: ForumAuthor = { type: 'npc', id: n.id, name: n.name, avatarId: n.avatarId }
          return <TargetRow key={n.id} author={author} sub="发起新会话" onClick={() => doForward(ensureDm(author, false), n.name)} />
        })}
        {others.length + newChars.length + newNpcs.length === 0 && <EmptyBlock text="还没有其他会话可转发" />}
      </div>
    </Sheet>
  )
}

function TargetRow({ author, sub, onClick }: { author: ForumAuthor; sub: string; onClick: () => void }) {
  return (
    <button className="pressable" onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 6px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <AuthorAvatar author={author} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fs-body" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{author.name}</div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>
      </div>
    </button>
  )
}

/** 会话设置：清空 / 屏蔽 / 举报 / 接收权限 */
function HeaderSheet({ dm, onClose }: { dm: ForumDM; onClose: () => void }) {
  const clearDmMessages = useForum((s) => s.clearDmMessages)
  const setDmBlocked = useForum((s) => s.setDmBlocked)
  const reportDm = useForum((s) => s.reportDm)
  const setDmReceivePermission = useForum((s) => s.setDmReceivePermission)
  const push = useToast((s) => s.push)
  const perm = dm.receivePermission ?? 'all'
  const perms: [ForumDMReceivePermission, string][] = [
    ['all', '所有人'],
    ['following', '仅关注'],
    ['none', '不接收'],
  ]

  return (
    <Sheet onClose={onClose} title="会话设置">
      <SheetRow icon={<Trash2 size={17} />} label="清空聊天记录" onClick={() => { clearDmMessages(dm.id); push('已清空聊天记录'); onClose() }} />
      <SheetRow
        icon={dm.blocked ? <Bell size={17} /> : <BellOff size={17} />}
        label={dm.blocked ? '取消屏蔽' : '屏蔽此人'}
        onClick={() => { setDmBlocked(dm.id, !dm.blocked); push(dm.blocked ? '已取消屏蔽' : '已屏蔽'); onClose() }}
      />
      <SheetRow icon={<Flag size={17} />} label={dm.reported ? '已举报' : '举报'} onClick={() => { reportDm(dm.id); push('已提交举报'); onClose() }} />
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '12px 8px 4px' }}>接收此人私信</div>
      <div style={{ display: 'flex', gap: 8, padding: '4px 8px 8px' }}>
        {perms.map(([k, label]) => (
          <button
            key={k}
            className="btn btn-sm pressable"
            onClick={() => { setDmReceivePermission(dm.id, k); push(`接收权限：${label}`); onClose() }}
            style={{ flex: 1, background: perm === k ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: perm === k ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** 底部弹出面板 */
function Sheet({ onClose, title, children }: { onClose: () => void; title?: string; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="page-enter glass" style={{ width: '100%', maxHeight: '72%', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: '12px 14px 24px', flexShrink: 0 }}>
        {title && <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)', margin: '4px 0 10px', textAlign: 'center' }}>{title}</div>}
        <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
        <button className="btn pressable" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>取消</button>
      </div>
    </div>
  )
}

function SheetRow({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 8px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', color: danger ? '#ff8a8a' : 'var(--text-body)' }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span className="fs-body">{label}</span>
    </button>
  )
}

function fmtSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

function StickerCell({ imageId, onClick }: { imageId: string; onClick: () => void }) {
  const url = useBlobURL(imageId)
  return (
    <button onClick={onClick} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}