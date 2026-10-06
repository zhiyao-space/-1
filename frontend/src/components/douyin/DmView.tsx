import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Copy, Image as ImageIcon, Send, Smile, Trash2, User } from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import type { DyAuthor, DyDm } from '../../lib/douyinEngine'
import { DyAvatar } from './parts'

const EMOJIS = ['😀', '😅', '🥺', '😍', '🤔', '😂', '😭', '👍', '🙏', '🔥', '❤️', '✨', '🌙', '🍜', '🐱']

function onlineOf(key: string): { text: string; color: string } {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 3
  if (h === 0) return { text: '在线', color: '#2ed573' }
  if (h === 1) return { text: '忙碌中', color: '#ffa502' }
  return { text: '离线', color: '#6b6b6b' }
}

function DmImage({ imageId }: { imageId: string }) {
  const url = useBlobURL(imageId)
  if (!url) return null
  return <img src={url} alt="" style={{ maxWidth: 160, borderRadius: 10, display: 'block' }} />
}

export default function DmView({
  peer,
  onBack,
  onOpenAuthor,
}: {
  peer: DyAuthor
  onBack: () => void
  onOpenAuthor: (a: DyAuthor) => void
}) {
  const conversations = useDouyin((s) => s.conversations)
  const openConversation = useDouyin((s) => s.openConversation)
  const sendDm = useDouyin((s) => s.sendDm)
  const removeDm = useDouyin((s) => s.removeDm)
  const readConversation = useDouyin((s) => s.readConversation)
  const toast = useToast((s) => s.push)

  const [draft, setDraft] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [menu, setMenu] = useState<DyDm | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const pressTimer = useRef<number | null>(null)

  useEffect(() => {
    openConversation(peer)
    readConversation(peer.key)
  }, [peer, openConversation, readConversation])

  const conv = conversations.find((c) => c.peer.key === peer.key)
  const messages = useMemo(() => conv?.messages ?? [], [conv])
  const online = onlineOf(peer.key)

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const send = (content: string, imageId?: string | null) => {
    if (!content.trim() && !imageId) return
    sendDm(peer, content, imageId)
    setDraft('')
    setEmojiOpen(false)
  }

  const pickImage = async (file: File) => {
    try {
      const blob = await compressImage(file, 1080)
      const id = await putBlob(blob)
      send('', id)
    } catch {
      toast('图片发送失败')
    }
  }

  const startPress = (m: DyDm) => {
    pressTimer.current = window.setTimeout(() => setMenu(m), 450)
  }
  const endPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  return (
    <div className="dy-page">
      <div className="dy-dm-head">
        <button className="dy-icon-btn pressable" onClick={onBack}>
          <ChevronLeft size={17} />
        </button>
        <button className="pressable" onClick={() => onOpenAuthor(peer)}>
          <DyAvatar author={peer} size={34} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{peer.name}</div>
          <div style={{ fontSize: 11, color: online.color, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: online.color, display: 'inline-block' }} />
            {online.text}
          </div>
        </div>
        <button className="dy-icon-btn pressable" onClick={() => onOpenAuthor(peer)} title="看主页">
          <User size={16} />
        </button>
      </div>

      <div className="dy-dm-list" ref={listRef}>
        <div className="dy-dm-tip">已和 @{peer.name} 建立私信 · 点击头像可看主页</div>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`dy-bubble ${m.fromMe ? 'dy-bubble--me' : 'dy-bubble--other'}`}
            onPointerDown={() => startPress(m)}
            onPointerUp={endPress}
            onPointerLeave={endPress}
          >
            {m.imageId ? <DmImage imageId={m.imageId} /> : m.content}
          </div>
        ))}
        {messages.length === 0 && <div className="dy-empty">发条消息，试着和他聊聊</div>}
      </div>

      {emojiOpen && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {EMOJIS.map((e) => (
            <button key={e} className="pressable" style={{ fontSize: 20 }} onClick={() => setDraft((d) => d + e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="dy-sheet-foot">
        <button className="dy-icon-btn pressable" onClick={() => setEmojiOpen((v) => !v)}>
          <Smile size={16} />
        </button>
        <button className="dy-icon-btn pressable" onClick={() => fileRef.current?.click()}>
          <ImageIcon size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void pickImage(f)
            e.target.value = ''
          }}
        />
        <input
          className="dy-input"
          placeholder="发消息…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(draft)
          }}
        />
        <button className="dy-send pressable" onClick={() => send(draft)}>
          <Send size={16} />
        </button>
      </div>

      {menu && (
        <div className="dy-sheet-mask" onClick={() => setMenu(null)}>
          <div className="dy-sheet dy-sheet--center" onClick={(e) => e.stopPropagation()}>
            <div className="dy-sheet-body" style={{ paddingTop: 8 }}>
              <button
                className="dy-sheet-row pressable"
                onClick={() => {
                  if (!menu.content.trim()) {
                    toast('图片消息暂不支持复制')
                    return
                  }
                  void navigator.clipboard?.writeText(menu.content).catch(() => undefined)
                  toast('已复制')
                  setMenu(null)
                }}
              >
                <Copy size={15} /> 复制
              </button>
              {menu.fromMe && (
                <button
                  className="dy-sheet-row pressable"
                  onClick={() => {
                    removeDm(peer.key, menu.id)
                    toast('已撤回')
                    setMenu(null)
                  }}
                >
                  <Trash2 size={15} /> 撤回
                </button>
              )}
              <button
                className="dy-sheet-row pressable"
                onClick={() => {
                  removeDm(peer.key, menu.id)
                  setMenu(null)
                }}
              >
                <Trash2 size={15} /> 删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}