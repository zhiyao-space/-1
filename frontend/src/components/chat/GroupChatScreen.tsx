import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  Plus,
  Send,
  StopCircle,
  Smile,
  Image as ImageIcon,
  Braces,
  Trash2,
  Copy,
  Undo2,
  AtSign,
  Settings2,
  Crown,
  MicOff,
  X,
  Mic,
  Banknote,
  Gift,
  Dices,
  Link2,
  Eye,
  Sparkles,
} from 'lucide-react'
import { useGroups, type GroupChat, type GroupMember, type GroupMessage } from '../../store/groups'
import { useCharacters } from '../../store/characters'
import { useChatParams } from '../../store/chatParams'
import { useStickers } from '../../store/stickers'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { useSettings } from '../../store/settings'
import { useWallet } from '../../store/interact'
import { useBlobURL } from '../WallpaperLayer'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { buildGroupChatMessages, splitReply, randomTypingDelay } from '../../lib/chatEngine'
import { streamChat } from '../../lib/api'
import Avatar from './Avatar'
import { TypingIndicator, TimeText, useImageViewer } from './ChatParts'
import { TransferCard, RedPacketCard, VoiceBubble, DiceCard, recordVoice } from './Cards'
import { TransferModal, RedPacketModal, beep } from './PayAndTools'
import { WallpaperLayer } from '../WallpaperLayer'
import { Modal } from '../common'

interface ScheduleOpts {
  forceIds?: string[]
  instruction?: string
  maxN?: number
  onParts?: (member: GroupMember, parts: string[]) => void
}

export default function GroupChatScreen({ groupId, onExit }: { groupId: string; onExit: () => void }) {
  const group = useGroups((s) => s.groups.find((g) => g.id === groupId))
  const groupsStore = useGroups()
  const characters = useCharacters((s) => s.characters)
  const params = useChatParams()
  const push = useToast((s) => s.push)
  const stickers = useStickers((s) => s.stickers)
  const settings = useSettings()

  const [input, setInput] = useState('')
  const [plusOpen, setPlusOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [atOpen, setAtOpen] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [streamText, setStreamText] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<GroupMessage | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [redpacketOpen, setRedpacketOpen] = useState(false)
  const [chainOpen, setChainOpen] = useState(false)
  const [chainSeed, setChainSeed] = useState('')
  const [busy, setBusy] = useState(false)
  const [firework, setFirework] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [viewer, openViewer] = useImageViewer()

  const messages = group?.messages ?? []
  const chatPreset = getDefaultChatPreset()
  const userIsOwner = group?.includeSelf ?? false

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamText, typingName])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!group) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>群聊不存在</span>
      </div>
    )
  }

  const charName = (cid?: string) =>
    group.members.find((m) => m.characterId === cid)?.groupNickname || characters.find((c) => c.id === cid)?.name || '某人'

  const addLocal = (base: Omit<GroupMessage, 'id' | 'timestamp'>): GroupMessage => {
    return groupsStore.addGroupMessage(groupId, base)
  }

  const updateLocal = (msgId: string, patch: Partial<GroupMessage>) => {
    groupsStore.updateGroupMessage(groupId, msgId, patch)
  }

  const removeLocal = (msgId: string) => {
    groupsStore.removeGroupMessage(groupId, msgId)
  }

  const runScheduling = async (atNames: string[], opts: ScheduleOpts = {}) => {
    if (!chatPreset || !chatPreset.baseUrl) {
      push('请先在 设置 → API 配置 中添加默认聊天 API 预设', 'error')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const history = groupsStore.groups.find((g) => g.id === groupId)?.messages ?? []
      const atIds = group.members
        .filter((m) => atNames.some((n) => m.groupNickname === n))
        .map((m) => m.characterId)

      const force = new Set([...(opts.forceIds ?? []), ...atIds])
      const cap = opts.maxN ?? group.maxRepliesPerRound
      const candidates = group.members
        .filter((m) => !m.muted)
        .filter((m) => force.has(m.characterId) || Math.random() * 100 < m.willingness)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(1, cap))

      if (candidates.length === 0) {
        push('没有成员想接话', 'error')
        return
      }

      const extraContext: Parameters<typeof buildGroupChatMessages>[5] = []
      for (const member of candidates) {
        const character = characters.find((c) => c.id === member.characterId)
        if (!character) continue
        const preset = character.apiPresetId ? getPresetById(character.apiPresetId) ?? chatPreset : chatPreset
        setTypingName(member.groupNickname)
        await new Promise((r) => setTimeout(r, randomTypingDelay()))
        setTypingName(null)
        const apiMessages = buildGroupChatMessages(member, character, group, history, preset, extraContext)
        if (opts.instruction) {
          apiMessages.push(
            preset.injectMode === 'merge-user'
              ? { role: 'user', content: opts.instruction }
              : { role: 'user', content: opts.instruction }
          )
        }
        const ctrl = new AbortController()
        abortRef.current = ctrl
        try {
          let full = ''
          if (params.streamOutput) {
            setStreamText('')
            await streamChat(preset, apiMessages, {
              onDelta: (d) => {
                full += d
                setStreamText(full)
              },
              signal: ctrl.signal,
            })
            setStreamText(null)
          } else {
            full = await streamChat(preset, apiMessages, { onDelta: () => {}, signal: ctrl.signal })
          }
          const parts = splitReply(full)
          if (parts.length > 0) {
            extraContext.push({ role: 'user', content: `${member.groupNickname}: ${parts.join(' ')}` })
            opts.onParts?.(member, parts)
            for (const part of parts) {
              groupsStore.addGroupMessage(groupId, {
                senderType: 'character',
                senderId: member.characterId,
                senderName: member.groupNickname,
                type: 'text',
                content: part,
              })
            }
          }
        } catch (err) {
          setStreamText(null)
          if ((err as Error).name !== 'AbortError') push(`生成失败：${(err as Error).message}`, 'error')
          break
        } finally {
          abortRef.current = null
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const extractAtNames = (text: string): string[] => {
    const names: string[] = []
    if (text.includes('@全体成员') || text.includes('@所有人')) {
      group.members.forEach((m) => names.push(m.groupNickname))
      return names
    }
    for (const m of group.members) {
      if (text.includes(`@${m.groupNickname}`)) names.push(m.groupNickname)
    }
    return [...new Set(names)]
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    const atNames = extractAtNames(text)
    addLocal({ senderType: 'user', type: 'text', content: text })
    setInput('')
    setPlusOpen(false)
    if (text.includes('烟花')) setFirework((n) => n + 1)
    runScheduling(atNames)
  }

  const sendOoc = () => {
    const text = input.trim()
    if (!text) return
    addLocal({ senderType: 'user', type: 'ooc', content: text })
    setInput('')
    setPlusOpen(false)
    runScheduling([], { instruction: `（系统指令：用户发布了导演指令（OOC）：${text}。请按照指令内容调整接下来的互动。只输出你角色要说的话。）` })
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
      addLocal({ senderType: 'user', type: 'image', content: '[图片]', imageId: id })
      setPlusOpen(false)
      runScheduling([])
    }
    inputEl.click()
  }

  const sendVoice = async () => {
    setPlusOpen(false)
    const r = await recordVoice()
    if (!r) {
      push('无法访问麦克风', 'error')
      return
    }
    const id = await putBlob(r.blob)
    addLocal({ senderType: 'user', type: 'voice', content: `[语音 ${r.seconds}"]`, data: { voiceId: id, seconds: r.seconds } })
    runScheduling([], { instruction: '（系统指令：用户在群里发了一条语音消息。用你的角色口吻自然回应。只输出你要说的话。）' })
  }

  const sendSticker = (imageId: string) => {
    addLocal({ senderType: 'user', type: 'sticker', content: '[表情]', imageId })
    setStickerOpen(false)
    runScheduling([])
  }

  const rollDice = () => {
    setPlusOpen(false)
    const value = 1 + Math.floor(Math.random() * 6)
    addLocal({ senderType: 'user', type: 'dice', content: `[掷骰子 ${value} 点]`, data: { value } })
    runScheduling([], { instruction: `（系统指令：用户掷骰子得到了 ${value} 点。用你的角色口吻对结果做出反应。只输出你要说的话。）` })
  }

  const startChain = () => {
    if (!chainSeed.trim()) {
      push('请填写接龙首词', 'error')
      return
    }
    addLocal({ senderType: 'system', type: 'system', content: `接龙开始：${chainSeed.trim()}` })
    setChainOpen(false)
    setChainSeed('')
    runScheduling([], { instruction: `（系统指令：群里开始了文字接龙，首词是"${chainSeed.trim() || '…'}"。用你的角色口吻接一个词或一句话继续接龙。只输出你要说的话。）` })
  }

  const doTransfer = (targetId: string, targetName: string, amount: number, note: string) => {
    const member = group.members.find((m) => m.characterId === targetId)
    if (!member) return
    const ok = useWallet.getState().transferOut(targetId, member.groupNickname, amount, note)
    if (!ok) {
      push('余额不足，请先在 设置 → 聊天参数 → 钱包 充值', 'error')
      return
    }
    addLocal({ senderType: 'user', type: 'transfer', content: `[转账 ¥${amount.toFixed(2)}]`, data: { amount, note } })
    push('转账成功')
    runScheduling([member.groupNickname], {
      forceIds: [targetId],
      instruction: `（系统指令：用户向你转账了 ${amount.toFixed(2)} 元${note ? `，备注：${note}` : ''}。用你的角色口吻回应这笔转账。只输出你要说的话。）`,
    })
  }

  const doRedpacket = (payload: {
    targetId?: string
    targetName: string
    amount: number
    note: string
    kind: 'exclusive' | 'normal' | 'password'
    password?: string
    cover: string
  }) => {
    const ok = useWallet.getState().redpacketOut(payload.targetId ?? null, payload.targetName || group.name, payload.amount, payload.note)
    if (!ok) {
      push('余额不足，请先在 设置 → 聊天参数 → 钱包 充值', 'error')
      return
    }
    addLocal({
      senderType: 'user',
      type: 'redpacket',
      content: `[红包 ¥${payload.amount.toFixed(2)}]`,
      data: {
        amount: payload.amount,
        note: payload.note,
        kind: payload.kind,
        password: payload.password,
        cover: payload.cover,
        claimState: 'open',
        claimedBy: payload.kind === 'exclusive' ? payload.targetName : undefined,
      },
    })
    push('红包已发出')
  }

  const claimGroupRedpacket = (m: GroupMessage) => {
    const d = m.data ?? {}
    if (d.claimState !== 'open' || busy) return
    const forceIds =
      d.kind === 'exclusive'
        ? group.members.filter((mm) => mm.groupNickname === d.claimedBy).map((mm) => mm.characterId)
        : []
    const grabbers: { name: string; share: number }[] = []
    runScheduling(forceIds, {
      instruction: `（系统指令：用户发了一个红包（${(d.amount ?? 0).toFixed(2)} 元）${d.kind === 'password' ? `，这是口令红包，说出"${d.password}"才能领取` : ''}。根据你的人设决定抢不抢、怎么抢（手快/矜持/吐槽等）。只输出你要说的话。）`,
      maxN: d.kind === 'exclusive' ? 1 : group.maxRepliesPerRound,
      onParts: (member, parts) => {
        const text = parts.join(' ')
        if (d.kind === 'password' && d.password && !text.includes(d.password)) return
        grabbers.push({ name: member.groupNickname, share: 0 })
        if (text.includes('烟花')) setFirework((n) => n + 1)
      },
    }).then(() => {
      if (grabbers.length === 0) {
        updateLocal(m.id, { data: { ...d, claimState: 'expired' } })
        return
      }
      let remain = d.amount ?? 0
      grabbers.forEach((g, i) => {
        if (i === grabbers.length - 1) g.share = Math.round(remain * 100) / 100
        else {
          g.share = Math.round(remain * (0.3 + Math.random() * 0.5) * 100) / 100
          remain -= g.share
        }
      })
      updateLocal(m.id, {
        data: {
          ...d,
          claimState: 'claimed',
          claimedBy: grabbers.map((g) => `${g.name} ¥${g.share.toFixed(2)}`).join('、'),
          claimAmount: d.amount,
          claimedAt: Date.now(),
        },
      })
      useWallet.getState().characterClaim('', group.name, 0, 'redpacket-in', `红包被领取：${grabbers.map((g) => g.name).join('、')}`)
    })
  }

  const recall = (m: GroupMessage) => {
    updateLocal(m.id, { recalled: true, content: '' })
    setActionMsg(null)
  }
  const deleteMsg = (m: GroupMessage) => {
    removeLocal(m.id)
    setActionMsg(null)
  }
  const copyMsg = (m: GroupMessage) => {
    navigator.clipboard?.writeText(m.content).then(
      () => push('已复制'),
      () => push('复制失败', 'error')
    )
    setActionMsg(null)
  }

  const canRecallOthers = (m: GroupMessage) => m.senderType === 'character' && userIsOwner

  const spectateSend = () => {
    const text = input.trim()
    if (!text) return
    const speakerId = (window as unknown as { __spectateId?: string }).__spectateId
    if (speakerId) {
      const member = group.members.find((m) => m.characterId === speakerId)
      if (member) {
        addLocal({ senderType: 'character', senderId: member.characterId, senderName: member.groupNickname, type: 'text', content: text })
        setInput('')
        return
      }
    }
    push('请先选择发言身份', 'error')
  }

  const autoRun = () => {
    runScheduling([], {
      instruction: '（系统指令：群里正在自由运转，请根据最近的对话氛围自然地继续聊天、推进话题。只输出你要说的话。）',
    })
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
        <Avatar imageId={group.avatarId} name={group.name} size={34} shape="rounded" />
        <button className="pressable" onClick={() => setSettingsOpen(true)} style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <span className="nav-title fs-h3" style={{ color: 'var(--text-primary)' }}>{group.name}</span>
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
            {group.members.length + (group.includeSelf ? 1 : 0)} 人{group.spectate ? ' · 旁观模式' : ''}
          </span>
        </button>
        <button className="pressable" onClick={() => setSettingsOpen(true)} style={{ color: 'var(--text-secondary)', padding: 6 }}>
          <Settings2 size={19} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <WallpaperLayer imageId={settings.wallpapers.chat} fx={settings.wallpaperFx.chat} />
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 && !streamText && (
            <div className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
              <Avatar imageId={group.avatarId} name={group.name} size={72} shape="rounded" />
              <div className="fs-h3" style={{ color: 'var(--text-primary)' }}>{group.name}</div>
              {group.announcement && (
                <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.7 }}>
                  公告：{group.announcement}
                </div>
              )}
              <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                发出第一条消息
              </div>
            </div>
          )}

          {messages.map((m) => (
            <GroupMessageRow
              key={m.id}
              m={m}
              group={group}
              avatarId={m.senderType === 'user' ? null : characters.find((c) => c.id === m.senderId)?.avatarId ?? null}
              onLongPress={() => setActionMsg(m)}
              onOpenImage={openViewer}
              onClaim={() => claimGroupRedpacket(m)}
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

          {typingName && (
            <div style={{ alignSelf: 'flex-start' }}>
              <TypingIndicator name={typingName} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {firework > 0 && <Firework key={firework} onDone={() => setFirework(0)} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '8px 10px 10px', flexShrink: 0 }}>
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
        {group.spectate ? (
          <SpectateInput
            group={group}
            input={input}
            setInput={setInput}
            onDirector={() => {
              const text = input.trim()
              if (!text) return
              addLocal({ senderType: 'system', type: 'system', content: `剧情走向：${text}` })
              setInput('')
              runScheduling([], { instruction: `（系统指令：剧情走向调整为：${text}。请按照新的走向自然继续群聊。只输出你要说的话。）` })
            }}
            onSendAs={spectateSend}
            onAutoRun={autoRun}
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && params.enterToSend) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={group.includeSelf ? '说点什么…' : '以观察者身份发言…'}
            rows={1}
            style={{ flex: 1, resize: 'none', maxHeight: 96, lineHeight: 1.5, borderRadius: 14 }}
          />
        )}
        {streamText !== null ? (
          <button className="pressable" onClick={() => abortRef.current?.abort()} style={{ color: 'var(--text-secondary)', padding: 8 }}>
            <StopCircle size={22} />
          </button>
        ) : (
          <button className="pressable" onClick={() => setAtOpen(true)} style={{ color: 'var(--text-secondary)', padding: 8 }}>
            <AtSign size={22} />
          </button>
        )}
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
        <button className="pressable" onClick={group.spectate ? spectateSend : send} style={{ color: 'var(--accent-color)', padding: 8 }}>
          <Send size={22} />
        </button>
      </div>

      {plusOpen && (
        <div className="page-enter" style={{ display: 'flex', gap: 14, padding: '10px 14px 14px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
          <PlusAction icon={<ImageIcon size={19} />} label="图片" onClick={sendImage} />
          <PlusAction icon={<Mic size={19} />} label="语音" onClick={sendVoice} />
          {params.allowOoc && <PlusAction icon={<Braces size={19} />} label="OOC" onClick={sendOoc} />}
          <PlusAction icon={<Banknote size={19} />} label="转账" onClick={() => { setPlusOpen(false); setTransferOpen(true) }} />
          <PlusAction icon={<Gift size={19} />} label="红包" onClick={() => { setPlusOpen(false); setRedpacketOpen(true) }} />
          <PlusAction icon={<Dices size={19} />} label="骰子" onClick={rollDice} />
          <PlusAction icon={<Link2 size={19} />} label="接龙" onClick={() => { setPlusOpen(false); setChainOpen(true) }} />
          <PlusAction icon={<Sparkles size={19} />} label="放烟花" onClick={() => { setPlusOpen(false); setFirework((n) => n + 1) }} />
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
                <button key={st.id} className="pressable" onClick={() => sendSticker(st.imageId)} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <StickerImg imageId={st.imageId} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {atOpen && (
        <AtSheet
          group={group}
          onClose={() => setAtOpen(false)}
          onPick={(nickname) => {
            setInput((v) => `${v}@${nickname} `)
            setAtOpen(false)
          }}
          onAtAll={() => {
            setInput((v) => `${v}@全体成员 `)
            setAtOpen(false)
          }}
        />
      )}

      {actionMsg && (
        <div onClick={() => setActionMsg(null)} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} className="page-enter" style={{ width: '100%', padding: '10px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionMsg.type === 'text' && (
              <SheetBtn icon={<Copy size={17} />} label="复制" onClick={() => copyMsg(actionMsg)} />
            )}
            {actionMsg.senderType === 'user' && params.allowRecall && !actionMsg.recalled && (
              <SheetBtn icon={<Undo2 size={17} />} label="撤回" onClick={() => recall(actionMsg)} />
            )}
            {canRecallOthers(actionMsg) && !actionMsg.recalled && (
              <SheetBtn icon={<Undo2 size={17} />} label={`撤回 ${charName(actionMsg.senderId)} 的消息`} onClick={() => recall(actionMsg)} />
            )}
            <SheetBtn icon={<Trash2 size={17} />} label="删除" onClick={() => deleteMsg(actionMsg)} />
            <button className="btn" onClick={() => setActionMsg(null)}>取消</button>
          </div>
        </div>
      )}

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        targets={group.members.map((m) => ({ id: m.characterId, name: m.groupNickname }))}
        onSend={doTransfer}
      />
      <RedPacketModal
        open={redpacketOpen}
        onClose={() => setRedpacketOpen(false)}
        targets={group.members.map((m) => ({ id: m.characterId, name: m.groupNickname }))}
        onSend={doRedpacket}
      />
      <Modal open={chainOpen} onClose={() => setChainOpen(false)} title="文字接龙">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={chainSeed} onChange={(e) => setChainSeed(e.target.value)} placeholder="接龙首词 / 题目" maxLength={20} autoFocus />
          <button className="btn btn-accent" onClick={startChain}>开始接龙</button>
        </div>
      </Modal>

      {settingsOpen && <GroupSettingsSheet group={group} onClose={() => setSettingsOpen(false)} />}

      {viewer}
    </div>
  )
}

function SpectateInput({
  group,
  input,
  setInput,
  onDirector,
  onSendAs,
  onAutoRun,
}: {
  group: GroupChat
  input: string
  setInput: (v: string) => void
  onDirector: () => void
  onSendAs: () => void
  onAutoRun: () => void
}) {
  const [speakerId, setSpeakerId] = useState('')
  useEffect(() => {
    ;(window as unknown as { __spectateId?: string }).__spectateId = speakerId
  }, [speakerId])
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} style={{ flex: 1, fontSize: 11, padding: '3px 6px' }}>
          <option value="">选择发言身份（导演）</option>
          {group.members.map((m) => (
            <option key={m.characterId} value={m.characterId}>{m.groupNickname}</option>
          ))}
        </select>
        <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={onAutoRun}>
          <Eye size={12} style={{ marginRight: 3 }} />自动运转
        </button>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={speakerId ? `以该身份发言…（留空用上方按钮推进剧情）` : '先选身份；或直接输入剧情走向'}
        rows={1}
        style={{ width: '100%', resize: 'none', maxHeight: 60, lineHeight: 1.5, borderRadius: 12, fontSize: 13 }}
      />
      <button className="btn" style={{ padding: '3px 0', fontSize: 11 }} onClick={onDirector}>
        推进剧情走向
      </button>
      <button className="btn" style={{ padding: '3px 0', fontSize: 11 }} onClick={onSendAs} disabled={!speakerId || !input.trim()}>
        以所选身份发送
      </button>
    </div>
  )
}

function Firework({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])
  const bursts = Array.from({ length: 5 })
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 400, pointerEvents: 'none', overflow: 'hidden' }}>
      {bursts.map((_, i) => (
        <div
          key={i}
          className="fw-burst"
          style={{
            left: `${12 + i * 19}%`,
            top: `${14 + (i % 3) * 22}%`,
            background: ['#ff6b6b', '#ffd166', '#7ab8f5', '#7ee2a8', '#f59ab8'][i],
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

function PlusAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="pressable" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 58 }}>
      <span style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
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

function StickerImg({ imageId }: { imageId: string }) {
  const url = useBlobURL(imageId)
  if (!url) return null
  return <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}

function GroupMessageRow({
  m,
  group,
  avatarId,
  onLongPress,
  onOpenImage,
  onClaim,
}: {
  m: GroupMessage
  group: GroupChat
  avatarId: string | null
  onLongPress: () => void
  onOpenImage: (url: string) => void
  onClaim: () => void
}) {
  if (m.recalled) {
    return (
      <div style={{ alignSelf: 'center', padding: '4px 0' }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
          {m.senderType === 'user' ? '你撤回了一条消息' : `${m.senderName || '某人'} 撤回了一条消息`}
        </span>
      </div>
    )
  }
  if (m.type === 'system') {
    return (
      <div style={{ alignSelf: 'center' }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{m.content}</span>
      </div>
    )
  }
  const isUser = m.senderType === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      <Avatar imageId={avatarId} name={isUser ? '我' : m.senderName || '?'} size={32} />
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 2 }}>
        {!isUser && (
          <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
            {m.senderName}
            {group.members.find((x) => x.characterId === m.senderId)?.title ? (
              <span style={{ marginLeft: 4, color: 'var(--accent-color)' }}>
                {group.members.find((x) => x.characterId === m.senderId)?.title}
              </span>
            ) : null}
          </span>
        )}
        {renderGroupBody(m, isUser, onLongPress, onOpenImage, onClaim, group)}
        <TimeText ts={m.timestamp} />
      </div>
    </div>
  )
}

function renderGroupBody(
  m: GroupMessage,
  isUser: boolean,
  onLongPress: () => void,
  onOpenImage: (url: string) => void,
  onClaim: () => void,
  group: GroupChat
): React.ReactNode {
  const commonHandlers = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress()
    },
    onDoubleClick: onLongPress,
  }
  if (m.type === 'image' || m.type === 'sticker') {
    return <GroupImageBubble imageId={m.imageId} sticker={m.type === 'sticker'} onOpen={onOpenImage} onLongPress={onLongPress} />
  }
  if (m.type === 'voice') {
    return (
      <div {...commonHandlers} className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'}`} style={{ padding: '4px 6px' }}>
        <VoiceBubble voiceId={m.data?.voiceId} seconds={m.data?.seconds} />
      </div>
    )
  }
  if (m.type === 'transfer') {
    return (
      <div {...commonHandlers}>
        <TransferCard data={m.data ?? {}} mine={isUser} />
      </div>
    )
  }
  if (m.type === 'redpacket') {
    return (
      <div {...commonHandlers}>
        <RedPacketCard data={m.data ?? {}} mine={isUser} ts={m.timestamp} characterName={isUser ? '你' : m.senderName || group.name} onClaim={isUser ? undefined : onClaim} />
      </div>
    )
  }
  if (m.type === 'dice') {
    return (
      <div {...commonHandlers} className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'}`}>
        <DiceCard value={m.data?.value} />
      </div>
    )
  }
  return (
    <div
      {...commonHandlers}
      className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'} fs-body`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {m.type === 'ooc' ? `OOC：${m.content}` : m.content}
    </div>
  )
}

function GroupImageBubble({
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

function AtSheet({
  group,
  onClose,
  onPick,
  onAtAll,
}: {
  group: GroupChat
  onClose: () => void
  onPick: (nickname: string) => void
  onAtAll: () => void
}) {
  const characters = useCharacters((s) => s.characters)
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="page-enter" style={{ width: '100%', maxHeight: '60%', overflowY: 'auto', padding: '12px 14px 20px' }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>选择要 @ 的成员</div>
        <button className="btn" style={{ width: '100%', marginBottom: 8 }} onClick={onAtAll}>
          @ 全体成员
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {group.members.map((m) => {
            const c = characters.find((x) => x.id === m.characterId)
            return (
              <button
                key={m.characterId}
                className="pressable"
                onClick={() => onPick(m.groupNickname)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}
              >
                <Avatar imageId={c?.avatarId} name={m.groupNickname} size={30} />
                <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{m.groupNickname}</span>
                {m.muted && <MicOff size={13} color="var(--text-tertiary)" />}
              </button>
            )
          })}
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}

function GroupSettingsSheet({ group, onClose }: { group: GroupChat; onClose: () => void }) {
  const groupsStore = useGroups()
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const [editMember, setEditMember] = useState<GroupMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [announcement, setAnnouncement] = useState(group.announcement)
  const isOwner = group.includeSelf

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 350, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="page-enter"
        style={{ width: '100%', maxHeight: '80%', overflowY: 'auto', padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>群聊设置</span>
          <button className="pressable" onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={!!group.spectate}
            onChange={(e) => {
              groupsStore.updateGroup(group.id, { spectate: e.target.checked })
              push(e.target.checked ? '旁观模式已开启：你以导演身份存在' : '旁观模式已关闭')
            }}
          />
          <span style={{ flex: 1 }}>
            <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>旁观模式</span>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>你不入群，可自定义剧情走向、以任意角色身份发言、让群里自动运转</span>
          </span>
          <Eye size={16} color="var(--text-tertiary)" />
        </label>

        <div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>群公告</div>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder={isOwner ? '编辑群公告' : '仅群主/管理员可编辑'}
            rows={2}
            disabled={!isOwner}
            style={{ width: '100%', resize: 'none', lineHeight: 1.6 }}
          />
          {isOwner && (
            <button
              className="btn"
              style={{ width: '100%', marginTop: 6 }}
              onClick={() => {
                groupsStore.updateGroup(group.id, { announcement: announcement.trim() })
                push('公告已更新')
              }}
            >
              保存公告
            </button>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', flex: 1 }}>群成员（{group.members.length}）</span>
            <button className="btn" style={{ padding: '4px 12px' }} onClick={() => setInviteOpen(true)}>
              邀请
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.members.map((m) => {
              const c = characters.find((x) => x.id === m.characterId)
              return (
                <button
                  key={m.characterId}
                  className="pressable"
                  onClick={() => setEditMember(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}
                >
                  <Avatar imageId={c?.avatarId} name={m.groupNickname} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {m.groupNickname}
                      {m.title && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-color)' }}>{m.title}</span>}
                    </span>
                    <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                      {m.role === 'owner' ? '群主' : m.role === 'admin' ? '管理员' : '成员'} · 意愿度 {m.willingness}%
                      {m.muted ? ' · 已禁言' : ''}
                    </span>
                  </span>
                  {m.role === 'owner' && <Crown size={14} color="var(--accent-color)" />}
                </button>
              )
            })}
          </div>
        </div>

        {isOwner && (
          <div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>每轮回复上限</div>
            <input
              type="number"
              min={1}
              max={10}
              value={group.maxRepliesPerRound}
              onChange={(e) => groupsStore.updateGroup(group.id, { maxRepliesPerRound: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {group.includeSelf && (
            <button
              className="btn"
              onClick={() => {
                groupsStore.updateGroup(group.id, { includeSelf: false })
                push('已退出群聊')
                onClose()
              }}
            >
              退出群聊
            </button>
          )}
          {isOwner && (
            <button
              className="btn"
              style={{ color: '#ff6b6b' }}
              onClick={() => {
                groupsStore.dissolveGroup(group.id)
                push('群聊已解散')
                onClose()
              }}
            >
              解散群聊
            </button>
          )}
        </div>

        {editMember && (
          <MemberEditModal
            group={group}
            member={editMember}
            isOwner={isOwner}
            onClose={() => setEditMember(null)}
          />
        )}
        {inviteOpen && (
          <InviteModal group={group} onClose={() => setInviteOpen(false)} />
        )}
      </div>
    </div>
  )
}

function MemberEditModal({
  group,
  member,
  isOwner,
  onClose,
}: {
  group: GroupChat
  member: GroupMember
  isOwner: boolean
  onClose: () => void
}) {
  const groupsStore = useGroups()
  const push = useToast((s) => s.push)
  const [nickname, setNickname] = useState(member.groupNickname)
  const [title, setTitle] = useState(member.title)
  const [willingness, setWillingness] = useState(member.willingness)

  const save = () => {
    groupsStore.updateMember(group.id, member.characterId, {
      groupNickname: nickname.trim() || member.groupNickname,
      title: title.trim(),
      willingness,
    })
    push('成员信息已更新')
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="glass" style={{ width: '86%', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="fs-h3" style={{ color: 'var(--text-primary)' }}>编辑成员</div>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="群昵称" maxLength={16} />
        {isOwner && <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="头衔（可选）" maxLength={10} />}
        {isOwner && (
          <label>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>
              回复意愿度 {willingness}%
            </span>
            <input type="range" min={0} max={100} value={willingness} onChange={(e) => setWillingness(Number(e.target.value))} style={{ width: '100%' }} />
          </label>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOwner && member.role !== 'owner' && (
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                groupsStore.updateMember(group.id, member.characterId, { role: member.role === 'admin' ? 'member' : 'admin' })
                push(member.role === 'admin' ? '已撤销管理员' : '已设为管理员')
                onClose()
              }}
            >
              {member.role === 'admin' ? '撤销管理员' : '设为管理员'}
            </button>
          )}
          {(isOwner || member.role === 'member') && (
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                groupsStore.updateMember(group.id, member.characterId, { muted: !member.muted })
                push(member.muted ? '已解除禁言' : '已禁言')
                onClose()
              }}
            >
              {member.muted ? '解除禁言' : '禁言'}
            </button>
          )}
          {isOwner && member.role !== 'owner' && (
            <button
              className="btn"
              style={{ flex: 1, color: '#ff6b6b' }}
              onClick={() => {
                groupsStore.removeMember(group.id, member.characterId)
                push('已移出群聊')
                onClose()
              }}
            >
              踢出群聊
            </button>
          )}
          {isOwner && member.role !== 'owner' && (
            <button
              className="btn btn-accent"
              style={{ flex: 1 }}
              onClick={() => {
                groupsStore.updateMember(group.id, member.characterId, { role: 'owner' })
                groupsStore.updateGroup(group.id, { includeSelf: false })
                push('已转让群主')
                onClose()
              }}
            >
              转让群主
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>取消</button>
          <button className="btn btn-accent" style={{ flex: 1 }} onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}

function InviteModal({ group, onClose }: { group: GroupChat; onClose: () => void }) {
  const groupsStore = useGroups()
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)
  const remaining = characters.filter((c) => !group.members.some((m) => m.characterId === c.id))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="glass" style={{ width: '86%', maxHeight: '70%', overflowY: 'auto', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="fs-h3" style={{ color: 'var(--text-primary)' }}>邀请成员</div>
        {remaining.length === 0 && (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)' }}>所有角色都已在群里</div>
        )}
        {remaining.map((c) => (
          <button
            key={c.id}
            className="pressable"
            onClick={() => {
              groupsStore.addMembers(group.id, [
                { characterId: c.id, groupNickname: c.name, role: 'member', muted: false, title: '', willingness: 80 },
              ])
              groupsStore.addGroupMessage(group.id, {
                senderType: 'system',
                type: 'system',
                content: `${c.name} 加入了群聊`,
              })
              push('已邀请')
              onClose()
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}
          >
            <Avatar imageId={c.avatarId} name={c.name} size={32} />
            <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
            <Plus size={15} color="var(--text-tertiary)" style={{ marginLeft: 'auto' }} />
          </button>
        ))}
        <button className="btn" onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
