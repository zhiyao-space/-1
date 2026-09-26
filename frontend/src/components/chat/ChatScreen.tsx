import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Plus, Send, StopCircle, Smile, Image as ImageIcon, Braces, Trash2, Copy, Undo2 } from 'lucide-react'
import { useChats, type ChatMessage } from '../../store/chats'
import { useCharacters } from '../../store/characters'
import { useChatParams } from '../../store/chatParams'
import { useStickers } from '../../store/stickers'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { buildSingleChatMessages, splitReply, randomTypingDelay } from '../../lib/chatEngine'
import { streamChat } from '../../lib/api'
import Avatar from './Avatar'
import { TypingIndicator, TimeText, useImageViewer } from './ChatParts'

export default function ChatScreen({ characterId, onExit }: { characterId: string; onExit: () => void }) {
  const character = useCharacters((s) => s.characters.find((c) => c.id === characterId))
  const chats = useChats()
  const params = useChatParams()
  const push = useToast((s) => s.push)
  const sessionId = useMemo(() => (characterId ? chats.getOrCreateSession(characterId) : ''), [characterId])
  const session = useChats((s) => s.sessions.find((x) => x.id === sessionId))
  const [input, setInput] = useState('')
  const [plusOpen, setPlusOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [streamText, setStreamText] = useState<string | null>(null)
  const [awaitingManual, setAwaitingManual] = useState(false)
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [viewer, openViewer] = useImageViewer()
  const stickers = useStickers((s) => s.stickers)

  const preset = useMemo(() => {
    if (!character) return null
    return character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()
  }, [character, sessionId, session?.messages.length])

  const messages = session?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamText, typing])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!character) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>角色不存在</span>
      </div>
    )
  }

  const runGeneration = async () => {
    if (!preset || !preset.baseUrl) {
      push('请先在 设置 → API 配置 中添加聊天 API 预设', 'error')
      setAwaitingManual(false)
      return
    }
    const apiMessages = buildSingleChatMessages(character, chats.sessions.find((x) => x.id === sessionId)?.messages ?? [], preset)
    setTyping(true)
    setAwaitingManual(false)
    await new Promise((r) => setTimeout(r, randomTypingDelay()))
    setTyping(false)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      if (params.streamOutput) {
        setStreamText('')
        let full = ''
        await streamChat(preset, apiMessages, {
          onDelta: (d) => {
            full += d
            setStreamText(full)
          },
          signal: ctrl.signal,
        })
        setStreamText(null)
        emitParts(full)
      } else {
        const full = await streamChat(preset, apiMessages, { onDelta: () => {}, signal: ctrl.signal })
        emitParts(full)
      }
    } catch (err) {
      setStreamText(null)
      if ((err as Error).name !== 'AbortError') push(`生成失败：${(err as Error).message}`, 'error')
    } finally {
      abortRef.current = null
    }
  }

  const emitParts = (full: string) => {
    const parts = splitReply(full)
    if (parts.length === 0) {
      push('角色没有返回内容', 'error')
      return
    }
    parts.forEach((p, i) => {
      setTimeout(() => {
        chats.addMessage(sessionId, { role: 'assistant', type: 'text', content: p })
      }, i * 250)
    })
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    chats.addMessage(sessionId, { role: 'user', type: 'text', content: text })
    setInput('')
    setPlusOpen(false)
    if (params.autoReply) runGeneration()
    else setAwaitingManual(true)
  }

  const sendOoc = () => {
    const text = input.trim()
    if (!text) return
    chats.addMessage(sessionId, { role: 'user', type: 'ooc', content: text })
    setInput('')
    setPlusOpen(false)
    if (params.autoReply) runGeneration()
    else setAwaitingManual(true)
  }

  const sendImage = () => {
    const inputEl = document.createElement('input')
    inputEl.type = 'file'
    inputEl.accept = 'image/*'
    inputEl.onchange = async () => {
      const file = inputEl.files?.[0]
      if (!file) return
      const compressed = await compressImage(file, 1280)
      const id = await putBlob(compressed)
      chats.addMessage(sessionId, { role: 'user', type: 'image', content: '[图片]', imageId: id })
      setPlusOpen(false)
      if (params.autoReply) runGeneration()
      else setAwaitingManual(true)
    }
    inputEl.click()
  }

  const sendSticker = (imageId: string) => {
    chats.addMessage(sessionId, { role: 'user', type: 'sticker', content: '[表情]', imageId })
    setStickerOpen(false)
    if (params.autoReply) runGeneration()
    else setAwaitingManual(true)
  }

  const recall = (m: ChatMessage) => {
    chats.updateMessage(sessionId, m.id, { recalled: true })
    setActionMsg(null)
  }

  const deleteMsg = (m: ChatMessage) => {
    chats.removeMessage(sessionId, m.id)
    setActionMsg(null)
  }

  const copyMsg = (m: ChatMessage) => {
    navigator.clipboard?.writeText(m.content).then(
      () => push('已复制'),
      () => push('复制失败', 'error')
    )
    setActionMsg(null)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        className="no-select"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button className="pressable" onClick={onExit} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronLeft size={22} />
        </button>
        <Avatar imageId={character.avatarId} name={character.name} size={34} />
        <span className="nav-title fs-h3" style={{ color: 'var(--text-primary)', flex: 1 }}>{character.name}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {messages.length === 0 && !streamText && (
          <div className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
            <Avatar imageId={character.avatarId} name={character.name} size={72} />
            <div className="fs-h3" style={{ color: 'var(--text-primary)' }}>{character.name}</div>
            {preset?.baseUrl ? (
              <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                发出第一条消息，开始你们的对话
              </div>
            ) : (
              <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.7 }}>
                角色已就绪。
                <br />
                前往 设置 → API 配置 添加聊天 API 后，即可开始对话。
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <MessageRow
            key={m.id}
            m={m}
            characterName={character.name}
            avatarId={m.role === 'user' ? null : character.avatarId}
            onLongPress={() => setActionMsg(m)}
            onOpenImage={(url) => openViewer(url)}
          />
        ))}

        {streamText !== null && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%' }}>
            <div className="bubble bubble-left fs-body" style={{ whiteSpace: 'pre-wrap' }}>
              {streamText}
              <span className="stream-cursor">▍</span>
            </div>
          </div>
        )}

        {typing && (
          <div style={{ alignSelf: 'flex-start' }}>
            <TypingIndicator name={character.name} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {awaitingManual && (
        <div style={{ padding: '0 14px 6px', flexShrink: 0 }}>
          <button className="btn btn-accent" style={{ width: '100%' }} onClick={runGeneration}>
            生成回复
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 10px 10px', flexShrink: 0 }}>
        <button
          className="pressable"
          onClick={() => {
            setPlusOpen((v) => !v)
            setStickerOpen(false)
          }}
          style={{ color: plusOpen ? 'var(--accent-color)' : 'var(--text-secondary)', padding: 8 }}
        >
          <Plus size={22} />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && params.enterToSend) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="说点什么…"
          rows={1}
          style={{ flex: 1, resize: 'none', maxHeight: 96, lineHeight: 1.5, borderRadius: 14 }}
        />
        {streamText !== null ? (
          <button
            className="pressable"
            onClick={() => abortRef.current?.abort()}
            style={{ color: 'var(--text-secondary)', padding: 8 }}
            title="停止生成"
          >
            <StopCircle size={22} />
          </button>
        ) : (
          <button
            className="pressable"
            onClick={() => {
              setStickerOpen((v) => !v)
              setPlusOpen(false)
            }}
            style={{ color: stickerOpen ? 'var(--accent-color)' : 'var(--text-secondary)', padding: 8 }}
          >
            <Smile size={22} />
          </button>
        )}
        <button className="pressable" onClick={send} style={{ color: 'var(--accent-color)', padding: 8 }}>
          <Send size={22} />
        </button>
      </div>

      {plusOpen && (
        <div className="page-enter" style={{ display: 'flex', gap: 18, padding: '10px 18px 14px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <PlusAction icon={<ImageIcon size={20} />} label="图片" onClick={sendImage} />
          {params.allowOoc && <PlusAction icon={<Braces size={20} />} label="OOC 指令" onClick={sendOoc} />}
        </div>
      )}

      {stickerOpen && (
        <div className="page-enter" style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: 12, maxHeight: 200, overflowY: 'auto' }}>
          {stickers.length === 0 ? (
            <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 12 }}>
              表情包为空，去 设置 → 聊天参数 添加
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {stickers.map((st) => (
                <StickerCell key={st.id} imageId={st.imageId} onClick={() => sendSticker(st.imageId)} />
              ))}
            </div>
          )}
        </div>
      )}

      {actionMsg && (
        <div
          onClick={() => setActionMsg(null)}
          style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="page-enter"
            style={{ width: '100%', padding: '10px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {actionMsg.type === 'text' && (
              <SheetBtn icon={<Copy size={17} />} label="复制" onClick={() => copyMsg(actionMsg)} />
            )}
            {actionMsg.role === 'user' && params.allowRecall && !actionMsg.recalled && (
              <SheetBtn icon={<Undo2 size={17} />} label="撤回" onClick={() => recall(actionMsg)} />
            )}
            <SheetBtn icon={<Trash2 size={17} />} label="删除" onClick={() => deleteMsg(actionMsg)} />
            <button className="btn" onClick={() => setActionMsg(null)}>取消</button>
          </div>
        </div>
      )}

      {viewer}
    </div>
  )
}

function PlusAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="pressable" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        {icon}
      </span>
      <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </button>
  )
}

function SheetBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

function StickerCell({ imageId, onClick }: { imageId: string; onClick: () => void }) {
  const url = useBlobURL(imageId)
  return (
    <button className="pressable" onClick={onClick} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}

function MessageRow({
  m,
  characterName,
  avatarId,
  onLongPress,
  onOpenImage,
}: {
  m: ChatMessage
  characterName: string
  avatarId: string | null
  onLongPress: () => void
  onOpenImage: (url: string) => void
}) {
  if (m.recalled) {
    return (
      <div style={{ alignSelf: 'center', padding: '4px 0' }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
          {m.role === 'user' ? '你撤回了一条消息' : `${characterName} 撤回了一条消息`}
        </span>
      </div>
    )
  }
  if (m.type === 'ooc') {
    return (
      <div style={{ alignSelf: 'center', maxWidth: '86%', padding: '4px 0' }}>
        <div
          className="fs-micro"
          style={{
            color: 'var(--text-tertiary)',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 10,
            padding: '6px 12px',
            fontStyle: 'italic',
          }}
        >
          OOC：{m.content}
        </div>
      </div>
    )
  }
  const isUser = m.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      <Avatar imageId={avatarId} name={isUser ? '我' : characterName} size={32} />
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 2 }}>
        {m.type === 'image' || m.type === 'sticker' ? (
          <ImageBubble imageId={m.imageId} sticker={m.type === 'sticker'} onOpen={onOpenImage} onLongPress={onLongPress} />
        ) : (
          <div
            onContextMenu={(e) => {
              e.preventDefault()
              onLongPress()
            }}
            onDoubleClick={onLongPress}
            className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'} fs-body`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {m.content}
          </div>
        )}
        <TimeText ts={m.timestamp} />
      </div>
    </div>
  )
}

function ImageBubble({
  imageId,
  sticker,
  onOpen,
  onLongPress,
}: {
  imageId?: string | null
  sticker: boolean
  onOpen: (url: string) => void
  onLongPress: () => void
}) {
  const url = useBlobURL(imageId)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onClick={() => onOpen(url)}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress()
      }}
      onDoubleClick={onLongPress}
      style={{
        maxWidth: sticker ? 90 : 200,
        maxHeight: sticker ? 90 : 260,
        borderRadius: sticker ? 6 : 14,
        objectFit: 'cover',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    />
  )
}
