import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Send, ImagePlus, Users, UserPlus } from 'lucide-react'
import { useForum, type ForumDM } from '../../store/forum'
import { useCharacters } from '../../store/characters'
import { useStickers } from '../../store/stickers'
import { useSettings } from '../../store/settings'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { AuthorAvatar, TimeAgo, EmptyBlock } from './shared'

type DmTab = 'friends' | 'strangers'

export default function DmView({ initialDmId, onClearInitial, onOpenPost }: { initialDmId: string | null; onClearInitial: () => void; onOpenPost: (id: string) => void }) {
  const dms = useForum((s) => s.dms)
  const characters = useCharacters((s) => s.characters)
  const [tab, setTab] = useState<DmTab>('friends')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (initialDmId) {
      setOpenId(initialDmId)
      onClearInitial()
    }
  }, [initialDmId, onClearInitial])

  const open = dms.find((d) => d.id === openId)
  if (open) return <DmChat dm={open} onBack={() => setOpenId(null)} onOpenPost={onOpenPost} />

  const friends = dms.filter((d) => !d.stranger)
  const strangers = dms.filter((d) => d.stranger)
  const list = tab === 'friends' ? friends : strangers

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

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 20px' }}>
        {list.length === 0 ? (
          <EmptyBlock
            text={
              tab === 'friends'
                ? '还没有私信。在帖子里转发给角色，或关注一个角色等 TA 主动来找你'
                : '陌生人的私信会出现在这里，确认后再移入好友'
            }
          />
        ) : (
          list.map((d) => (
            <button
              key={d.id}
              className="pressable"
              onClick={() => setOpenId(d.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}
            >
              <AuthorAvatar author={d.partner} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{d.partner.name}</span>
                  {d.stranger && <span className="fs-micro" style={{ color: '#ffb08a' }}>陌生人</span>}
                </div>
                <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lastPreview(d)}
                </div>
              </div>
              <TimeAgo t={d.lastActive} />
            </button>
          ))
        )}

        {tab === 'friends' && characters.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>发起新私信</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {characters.map((c) => (
                <NewDmChip key={c.id} type="character" id={c.id} name={c.name} avatarId={c.avatarId} onOpen={setOpenId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function lastPreview(d: ForumDM): string {
  const last = d.messages[d.messages.length - 1]
  if (!last) return '新的私信'
  if (last.sharedPostId) return '转发了帖子卡片'
  return `${last.from === 'user' ? '我' : ''}${last.content}`
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
      <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserPlus size={12} color="var(--text-tertiary)" />}
      </span>
      <span className="fs-micro" style={{ color: 'var(--text-body)' }}>{name}</span>
    </button>
  )
}

function DmChat({ dm, onBack, onOpenPost }: { dm: ForumDM; onBack: () => void; onOpenPost: (id: string) => void }) {
  const addDmMessage = useForum((s) => s.addDmMessage)
  const updateDm = useForum((s) => s.updateDm)
  const stickers = useStickers((s) => s.stickers)
  const phoneName = useSettings((s) => s.phoneName)
  const push = useToast((s) => s.push)
  const [text, setText] = useState('')
  const [stickerOpen, setStickerOpen] = useState(false)
  const [replying, setReplying] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dm.messages.length])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    addDmMessage(dm.id, { from: 'user', content: t, imageId: null, stickerId: null, sharedPostId: null })
    setText('')
    setReplying(true)
    try {
      const { generateDmReply, authorPersona } = await import('../../lib/forumEngine')
      const cur = useForum.getState().dms.find((d) => d.id === dm.id)
      if (cur) {
        const reply = await generateDmReply(cur, authorPersona(cur.partner))
        if (reply) {
          const { splitReply } = await import('../../lib/chatEngine')
          for (const part of splitReply(reply).slice(0, 3)) {
            useForum.getState().addDmMessage(dm.id, { from: 'them', content: part, imageId: null, stickerId: null, sharedPostId: null })
          }
        } else {
          push('对方暂时没有回应，请检查 API 配置', 'error')
        }
      }
    } finally {
      setReplying(false)
    }
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
      addDmMessage(dm.id, { from: 'user', content: '', imageId: id, stickerId: null, sharedPostId: null })
      triggerAutoReply()
    }
    input.click()
  }

  const triggerAutoReply = () => {
    setReplying(true)
    setTimeout(async () => {
      try {
        const { generateDmReply, authorPersona } = await import('../../lib/forumEngine')
        const cur = useForum.getState().dms.find((d) => d.id === dm.id)
        if (cur) {
          const reply = await generateDmReply(cur, authorPersona(cur.partner))
          if (reply) useForum.getState().addDmMessage(dm.id, { from: 'them', content: reply, imageId: null, stickerId: null, sharedPostId: null })
        }
      } finally {
        setReplying(false)
      }
    }, 500)
  }

  const sendSticker = (stickerId: string) => {
    addDmMessage(dm.id, { from: 'user', content: '', imageId: null, stickerId, sharedPostId: null })
    setStickerOpen(false)
    triggerAutoReply()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <AuthorAvatar author={dm.partner} size={32} />
        <span className="fs-body" style={{ color: 'var(--text-primary)', flex: 1 }}>{dm.partner.name}</span>
        {!dm.stranger && dm.messages.length > 0 && (
          <button className="btn btn-sm pressable" onClick={() => updateDm(dm.id, { stranger: true })}>
            <Users size={12} /> 移回陌生人
          </button>
        )}
        {dm.stranger && dm.messages.length > 0 && (
          <button className="btn btn-sm btn-accent pressable" onClick={() => updateDm(dm.id, { stranger: false })}>
            <UserPlus size={12} /> 加为好友
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {dm.messages.length === 0 ? (
          <EmptyBlock text={`和 ${dm.partner.name} 还没有对话，说点什么吧`} />
        ) : (
          dm.messages.map((m) => <DmBubble key={m.id} mine={m.from === 'user'} name={m.from === 'user' ? phoneName || '我' : dm.partner.name} onOpenPost={onOpenPost} message={m} />)
        )}
        {replying && (
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', padding: '6px 0 0 6px' }}>{dm.partner.name} 正在输入…</div>
        )}
        <div ref={bottomRef} />
      </div>

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

      <div style={{ display: 'flex', gap: 8, padding: '10px 14px 16px', alignItems: 'center' }}>
        <button className="pressable" onClick={sendImage} style={{ color: 'var(--text-secondary)', padding: 6 }}>
          <ImagePlus size={18} />
        </button>
        <button className="pressable" onClick={() => setStickerOpen((v) => !v)} style={{ color: 'var(--text-secondary)', padding: 6 }}>
          <span className="fs-body">☺</span>
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={`发给 ${dm.partner.name}…`}
        />
        <button className="btn btn-accent pressable" style={{ padding: '0 14px' }} onClick={send}>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

function DmBubble({
  mine,
  name,
  message,
  onOpenPost,
}: {
  mine: boolean
  name: string
  message: ForumDM['messages'][number]
  onOpenPost: (id: string) => void
}) {
  const sharedPost = useForum((s) => (message.sharedPostId ? s.posts.find((p) => p.id === message.sharedPostId) : null))
  const url = useBlobURL(message.imageId)
  const stickerUrl = useBlobURL(message.stickerId)
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{ maxWidth: '78%' }}>
        {!mine && <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{name}</div>}
        {message.sharedPostId && sharedPost && (
          <button className="glass pressable" onClick={() => onOpenPost(sharedPost.id)} style={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 12, padding: 10, marginBottom: 4 }}>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>帖子卡片 · 点击查看原帖</span>
            {sharedPost.title && <span className="fs-aux" style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 2 }}>{sharedPost.title}</span>}
            <span className="fs-micro" style={{ display: '-webkit-box', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {sharedPost.content}
            </span>
          </button>
        )}
        {message.content && (
          <div
            className="fs-body"
            style={{
              background: mine ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              color: mine ? '#000' : 'var(--text-body)',
              borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '9px 12px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {message.content}
          </div>
        )}
        {(url || stickerUrl) && (
          <img src={(url ?? stickerUrl) as string} alt="" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 12, display: 'block' }} />
        )}
      </div>
    </div>
  )
}

function StickerCell({ imageId, onClick }: { imageId: string; onClick: () => void }) {
  const url = useBlobURL(imageId)
  return (
    <button onClick={onClick} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}
