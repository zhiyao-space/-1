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
  GitBranch,
  CalendarDays,
  Heart,
  Mic,
  Banknote,
  Gift,
  ClipboardCheck,
  Timer,
  BedDouble,
  BookOpen,
  MessageCircle,
  Wand2,
  SlidersHorizontal,
  Quote,
  X,
  Dices,
} from 'lucide-react'
import { useChats, type ChatMessage, type ChatMode } from '../../store/chats'
import { useCharacters } from '../../store/characters'
import { useChatParams } from '../../store/chatParams'
import { useStickers } from '../../store/stickers'
import { getDefaultChatPreset, getPresetById } from '../../store/apiPresets'
import { useToast } from '../../store/ui'
import { useSettings } from '../../store/settings'
import { useProfile } from '../../store/profile'
import { useUI } from '../../store/ui'
import { useMoments } from '../../store/moments'
import { useGames, type GameSession } from '../../store/games'
import { useSchedule, currentActivity } from '../../store/schedule'
import { useBranches, useChatAppearance, useWallet } from '../../store/interact'
import { useOfflineMode, OFFLINE_STYLES, OFFLINE_LENGTHS, OFFLINE_PERSONS, offlineSettingsFor } from '../../store/offlineMode'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import {
  buildSingleChatMessages,
  buildCheckinMessages,
  buildReactMessages,
  splitReply,
  randomTypingDelay,
  isSleeping,
} from '../../lib/chatEngine'
import { streamChat } from '../../lib/api'
import { maybeAutoSummarize } from '../../lib/runtimeEngine'
import { ensureTodaySchedule } from '../../lib/scheduleEngine'
import {
  summarizeForModeSwitch,
  buildModeTransitionInstruction,
  buildTimeGapInstruction,
  parseNarrative,
  fixNarrativeFormat,
} from '../../lib/offlineEngine'
import Avatar from './Avatar'
import { Modal } from '../common'
import { TypingIndicator, TimeText, useImageViewer } from './ChatParts'
import { TransferCard, RedPacketCard, VoiceBubble, DiceCard, recordVoice } from './Cards'
import MusicCardBubble from './MusicCardBubble'
import { TransferModal, RedPacketModal, ReverseReportModal, beep } from './PayAndTools'
import TomatoOverlay from './TomatoOverlay'
import ScheduleView from './ScheduleView'
import MindPanel from './MindPanel'
import { GameSetupModal } from '../games/GameSetupModal'
import { GameCardBubble } from '../games/GameCardBubble'
import { handleGameTurn } from '../../lib/gameEngine'
import { WallpaperLayer, useBlobURL } from '../WallpaperLayer'

function genId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ChatScreen({ characterId, onExit }: { characterId: string; onExit: () => void }) {
  const character = useCharacters((s) => s.characters.find((c) => c.id === characterId))
  const chats = useChats()
  const params = useChatParams()
  const push = useToast((s) => s.push)
  const settings = useSettings()
  const appearance = useChatAppearance()
  const chatMode: ChatMode = useOfflineMode((s) => s.modes[characterId]) ?? 'online'
  const [inputMode, setInputMode] = useState<'dialogue' | 'narration'>('dialogue')
  const [offlineCfgOpen, setOfflineCfgOpen] = useState(false)
  const [fixing, setFixing] = useState(false)
  const pendingGapRef = useRef(0)
  const sessionId = useMemo(() => (characterId ? chats.getOrCreateSession(characterId) : ''), [characterId])
  const session = useChats((s) => s.sessions.find((x) => x.id === sessionId))
  const activeBranchId = useBranches((s) => s.activeBranchId[sessionId] ?? null)
  const branch = useBranches((s) => s.branches.find((b) => b.id === activeBranchId) ?? null)
  const [input, setInput] = useState('')
  const [gameSetupOpen, setGameSetupOpen] = useState(false)
  const activeGame = useGames((s) => s.games.find((g) => g.chatId === sessionId && g.status === 'playing'))
  const [plusOpen, setPlusOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [streamText, setStreamText] = useState<string | null>(null)
  const [awaitingManual, setAwaitingManual] = useState(false)
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null)
  const [quoteMsg, setQuoteMsg] = useState<ChatMessage | null>(null)
  const [voiceComposeOpen, setVoiceComposeOpen] = useState(false)
  const [view, setView] = useState<'chat' | 'schedule'>('chat')
  const [mindOpen, setMindOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [sleepOpen, setSleepOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [redpacketOpen, setRedpacketOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [tomatoOpen, setTomatoOpen] = useState(false)
  const [tomato, setTomato] = useState<{ seconds: number; noise: boolean; accompany: boolean } | null>(null)
  const [branchNaming, setBranchNaming] = useState<ChatMessage | null>(null)
  const [branchName, setBranchName] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const awakeUntilRef = useRef(0)
  const [viewer, openViewer] = useImageViewer()
  const stickers = useStickers((s) => s.stickers)
  const userAvatarId = useProfile(
    (s) => s.profile.masks.find((m) => m.active)?.avatarId ?? s.profile.avatarId
  )

  const preset = useMemo(() => {
    if (!character) return null
    return character.apiPresetId ? getPresetById(character.apiPresetId) : getDefaultChatPreset()
  }, [character, sessionId, session?.messages.length])

  const baseMessages = session?.messages ?? []
  const messages = branch ? branch.messages : baseMessages
  const [nowTick, setNowTick] = useState(0)
  const autoToday = useSchedule((s) => (character ? s.autoDays[`${character.id}_${todayKey()}`] : undefined))
  useEffect(() => {
    if (character) ensureTodaySchedule(character)
  }, [character?.id])
  useEffect(() => {
    const t = setInterval(() => setNowTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])
  const act = useMemo(
    () =>
      character
        ? currentActivity(
            character.id,
            useSchedule.getState().routines,
            useSchedule.getState().items,
            new Date(),
            autoToday?.items
          )
        : { label: '空闲', progress: 0, isSleep: false, source: 'free' as const },
    [character, view, messages.length, nowTick, autoToday]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamText, typing, view])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!character) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="fs-body" style={{ color: 'var(--text-tertiary)' }}>角色不存在</span>
      </div>
    )
  }

  const addLocal = (base: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    if (branch) {
      const full: ChatMessage = { ...base, id: genId(), timestamp: Date.now() }
      useBranches.getState().appendToBranch(branch.id, full)
      return full
    }
    return chats.addMessage(sessionId, base)
  }

  const updateLocal = (msgId: string, patch: Partial<ChatMessage>) => {
    if (branch) useBranches.getState().updateBranchMessage(branch.id, msgId, patch)
    else chats.updateMessage(sessionId, msgId, patch)
  }

  const removeLocal = (msgId: string) => {
    if (branch) useBranches.getState().removeBranchMessage(branch.id, msgId)
    else chats.removeMessage(sessionId, msgId)
  }

  const ensureAwakeOrProceed = (proceed: () => void) => {
    const sleep = isSleeping(character.id)
    if (sleep.asleep && Date.now() > awakeUntilRef.current) {
      setSleepOpen(true)
      return
    }
    proceed()
  }

  const runGeneration = async (extraInstruction?: string) => {
    if (!preset || !preset.baseUrl) {
      push('请先在 设置 → API 配置 中添加聊天 API 预设', 'error')
      setAwaitingManual(false)
      return
    }
    ensureAwakeOrProceed(() => doGenerate(extraInstruction))
  }

  const doGenerate = async (extraInstruction?: string) => {
    if (!preset || !preset.baseUrl) return
    const freshMessages = branch
      ? useBranches.getState().branches.find((b) => b.id === branch.id)?.messages ?? messages
      : useChats.getState().sessions.find((s) => s.id === sessionId)?.messages ?? messages
    let extra = extraInstruction
    const lastAssistant = [...freshMessages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant && (lastAssistant.mode ?? 'online') !== chatMode) {
      extra = extra ? `${extra}\n${buildModeTransitionInstruction(chatMode)}` : buildModeTransitionInstruction(chatMode)
    }
    const offCfg = offlineSettingsFor(character.id)
    if (offCfg.timeAware && pendingGapRef.current >= offCfg.timeGapMinutes * 60000) {
      const gapIns = buildTimeGapInstruction(chatMode, pendingGapRef.current)
      extra = extra ? `${extra}\n${gapIns}` : gapIns
    }
    pendingGapRef.current = 0
    const apiMessages = buildSingleChatMessages(character, freshMessages, preset, extra, chatMode)
    setTyping(true)
    setAwaitingManual(false)
    await new Promise((r) => setTimeout(r, randomTypingDelay()))
    setTyping(false)
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
      emitParts(full)
    } catch (err) {
      setStreamText(null)
      if ((err as Error).name !== 'AbortError') push(`生成失败：${(err as Error).message}`, 'error')
    } finally {
      abortRef.current = null
    }
  }

  const emitParts = (full: string) => {
    const parts = chatMode === 'offline' ? [full.trim()] : splitReply(full)
    if (parts.length === 0 || !parts[0]) {
      push('角色没有返回内容', 'error')
      return
    }
    parts.forEach((p, i) => {
      setTimeout(() => {
        addLocal({ role: 'assistant', type: 'text', content: p, mode: chatMode })
      }, i * 250)
    })
    const freshHistory = branch
      ? useBranches.getState().branches.find((b) => b.id === branch.id)?.messages ?? messages
      : useChats.getState().sessions.find((s) => s.id === sessionId)?.messages ?? messages
    void maybeAutoSummarize(character, freshHistory)
  }

  const afterUserMsg = () => {
    if (params.autoReply) runGeneration()
    else setAwaitingManual(true)
  }

  const handleSwitchMode = (next: ChatMode) => {
    if (next === chatMode) return
    useOfflineMode.getState().setMode(characterId, next)
    setInputMode('dialogue')
    if (preset?.baseUrl && messages.length >= 2) {
      void summarizeForModeSwitch(character, messages, chatMode, next)
    } else {
      push(next === 'offline' ? '已切换到线下叙事模式' : '已切换到线上聊天模式')
    }
  }

  const fixLastNarrative = async () => {
    if (fixing) return
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.type === 'text' && m.mode === 'offline' && !m.recalled)
    if (!lastAssistant) {
      push('没有可修正的线下叙事消息', 'error')
      return
    }
    setFixing(true)
    const fixed = await fixNarrativeFormat(character, lastAssistant)
    setFixing(false)
    if (!fixed) {
      push('格式修正失败，请检查 API 配置', 'error')
      return
    }
    updateLocal(lastAssistant.id, { content: fixed })
    push('已按小说体重排该条回复')
  }

  const quoteData = quoteMsg
    ? { quote: { name: quoteMsg.role === 'user' ? '我' : character.name, content: quoteMsg.content } }
    : {}

  const send = () => {
    const text = input.trim()
    if (!text) return
    if (chatMode === 'offline' && inputMode === 'narration') {
      sendNarration()
      return
    }
    pendingGapRef.current = messages.length > 0 ? Date.now() - messages[messages.length - 1].timestamp : 0
    addLocal({ role: 'user', type: 'text', content: text, mode: chatMode, data: quoteData.quote ? quoteData : undefined })
    setInput('')
    setPlusOpen(false)
    setQuoteMsg(null)
    if (activeGame) {
      void runGameTurn(activeGame, text)
      return
    }
    afterUserMsg()
  }

  const runGameTurn = async (game: GameSession, text: string) => {
    setTyping(true)
    try {
      const { narrative, ended } = await handleGameTurn(game, character, text)
      useChats.getState().addMessage(sessionId, { role: 'assistant', type: 'text', content: narrative })
      if (ended) {
        useChats.getState().addMessage(sessionId, { role: 'system', type: 'system', content: ended })
      }
    } catch (e) {
      push(`游戏回合失败：${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setTyping(false)
    }
  }

  /** 自定义模拟语音：无需录音，自定时长与文字 */
  const sendVoiceSimulated = (seconds: number, transcript: string) => {
    pendingGapRef.current = messages.length > 0 ? Date.now() - messages[messages.length - 1].timestamp : 0
    addLocal({
      role: 'user',
      type: 'voice',
      content: `[语音 ${seconds}"]`,
      mode: chatMode,
      data: { seconds, simulated: true, transcript: transcript.trim() || undefined, ...(quoteData.quote ? quoteData : {}) },
    })
    setVoiceComposeOpen(false)
    setQuoteMsg(null)
    afterUserMsg()
  }

  const sendNarration = () => {
    const text = input.trim()
    if (!text) return
    pendingGapRef.current = messages.length > 0 ? Date.now() - messages[messages.length - 1].timestamp : 0
    addLocal({ role: 'user', type: 'narration', content: text, mode: 'offline' })
    setInput('')
    setPlusOpen(false)
    afterUserMsg()
  }

  const sendOoc = () => {
    const text = input.trim()
    if (!text) return
    addLocal({ role: 'user', type: 'ooc', content: text })
    setInput('')
    setPlusOpen(false)
    afterUserMsg()
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
      addLocal({ role: 'user', type: 'image', content: '[图片]', imageId: id })
      setPlusOpen(false)
      afterUserMsg()
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
    addLocal({ role: 'user', type: 'voice', content: `[语音 ${r.seconds}"]`, data: { voiceId: id, seconds: r.seconds } })
    afterUserMsg()
  }

  const sendSticker = (imageId: string) => {
    addLocal({ role: 'user', type: 'sticker', content: '[表情]', imageId })
    setStickerOpen(false)
    afterUserMsg()
  }

  const doTransfer = (targetId: string, targetName: string, amount: number, note: string) => {
    const ok = useWallet.getState().transferOut(characterId, character.name, amount, note)
    if (!ok) {
      push('余额不足，请先在 设置 → 聊天参数 → 钱包 充值', 'error')
      return
    }
    addLocal({ role: 'user', type: 'transfer', content: `[转账 ¥${amount.toFixed(2)}]`, data: { amount, note } })
    useToast.getState().push('转账成功')
    runGeneration(
      `（系统指令：用户向你转账了 ${amount.toFixed(2)} 元${note ? `，备注：${note}` : ''}。用角色的口吻自然回应这笔转账。只输出消息本身。）`
    )
  }

  const doRedpacket = (payload: {
    targetName: string
    amount: number
    note: string
    kind: 'exclusive' | 'normal' | 'password'
    password?: string
    cover: string
  }) => {
    const ok = useWallet.getState().redpacketOut(characterId, character.name, payload.amount, payload.note)
    if (!ok) {
      push('余额不足，请先在 设置 → 聊天参数 → 钱包 充值', 'error')
      return
    }
    addLocal({
      role: 'user',
      type: 'redpacket',
      content: `[红包 ¥${payload.amount.toFixed(2)}]`,
      data: {
        amount: payload.amount,
        note: payload.note,
        kind: payload.kind,
        password: payload.password,
        cover: payload.cover,
        claimState: 'open',
      },
    })
    useToast.getState().push('红包已发出')
  }

  const claimRedpacket = (m: ChatMessage) => {
    const d = m.data ?? {}
    if (d.claimState !== 'open') return
    updateLocal(m.id, { data: { ...d, claimState: 'claimed', claimedBy: character.name, claimAmount: d.amount, claimedAt: Date.now() } })
    useWallet.getState().characterClaim(characterId, character.name, 0, 'redpacket-in', `${character.name} 领取了红包`)
    runGeneration(
      `（系统指令：用户给你发了一个${d.kind === 'password' ? `口令为"${d.password}"的` : ''}红包（${(d.amount ?? 0).toFixed(2)} 元），你点击领取了。根据你的人设决定怎么回应（收下并道谢 / 嫌少 / 退回态度等）。只输出消息本身。）`
    )
  }

  const runCheckin = () => {
    setCheckinOpen(false)
    if (!preset?.baseUrl) {
      push('请先配置聊天 API', 'error')
      return
    }
    useSchedule.getState().addReport({ characterId, kind: 'checkin', text: `查岗：${act.label} ${act.progress}%` })
    runGeneration(
      `（系统指令：用户正在查岗。你正在进行：${act.label}（进度 ${act.progress}%）。用角色的口吻发一条报备消息，说说你正在做什么、状态如何。只输出消息本身。）`
    )
  }

  const poke = () => {
    addLocal({ role: 'user', type: 'system', content: `你戳了戳 ${character.name}` })
    if (!preset?.baseUrl) return
    runGeneration(
      chatMode === 'offline'
        ? `（系统指令：用户戳了戳你。在叙事中自然写出你对被戳的反应，包含动作、神态与对白。）`
        : `（系统指令：用户戳了戳你（戳一戳）。用角色的口吻对被戳做出反应。只输出消息本身。）`
    )
  }

  const submitReport = (p: { kind: 'image' | 'text' | 'voice'; imageId?: string; voiceId?: string; seconds?: number; text: string }) => {
    const desc = p.kind === 'image' ? '[图片报备]' : p.kind === 'voice' ? `[语音报备 ${p.seconds}"]` : p.text
    addLocal({
      role: 'user',
      type: p.kind === 'image' ? 'image' : p.kind === 'voice' ? 'voice' : 'text',
      content: p.kind === 'text' ? p.text : desc,
      imageId: p.imageId,
      data: p.voiceId ? { voiceId: p.voiceId, seconds: p.seconds } : undefined,
    })
    useSchedule.getState().addReport({ characterId, kind: 'reverse', text: p.text || desc })
    runGeneration(
      `（系统指令：用户向你报备了自己的近况：${p.kind === 'image' ? '发来一张图片' : p.kind === 'voice' ? '发来一段语音' : `说：${p.text}`}${p.text && p.kind !== 'text' ? `，留言：${p.text}` : ''}。用角色的口吻回应你的报备。只输出消息本身。）`
    )
  }

  const startTomato = (seconds: number, noise: boolean, accompany: boolean) => {
    setTomatoOpen(false)
    setTomato({ seconds, noise, accompany })
    if (accompany && preset?.baseUrl) {
      runGeneration(
        `（系统指令：用户和你开启了番茄钟专注（${Math.round(seconds / 60)} 分钟），你会全程陪伴。发一条简短的陪伴开场消息。只输出消息本身。）`
      )
    }
  }

  const finishTomato = (completed: boolean) => {
    setTomato(null)
    if (completed && preset?.baseUrl) {
      runGeneration(
        `（系统指令：番茄钟专注结束了，用户完成了 ${Math.round((tomato?.seconds ?? 1500) / 60)} 分钟专注。发一条简短的鼓励消息。只输出消息本身。）`
      )
    }
  }

  const createBranchFrom = (m: ChatMessage) => {
    setActionMsg(null)
    setBranchNaming(m)
    setBranchName('')
  }

  const confirmBranch = () => {
    if (!branchNaming) return
    const idx = messages.findIndex((x) => x.id === branchNaming.id)
    if (idx < 0) return
    useBranches.getState().createBranch({
      sessionId,
      name: branchName.trim() || `分支 ${useBranches.getState().branches.filter((b) => b.sessionId === sessionId).length + 1}`,
      parentMessageId: branchNaming.id,
      messages: messages.slice(0, idx + 1).map((m) => ({ ...m })),
    })
    push('已从此处分叉')
    setBranchNaming(null)
    setBranchName('')
  }

  const recall = (m: ChatMessage) => {
    updateLocal(m.id, { recalled: true })
    setActionMsg(null)
  }
  const deleteMsg = (m: ChatMessage) => {
    removeLocal(m.id)
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
        <span onDoubleClick={poke} style={{ cursor: 'pointer', flexShrink: 0 }}>
          <Avatar imageId={character.avatarId} name={character.name} size={34} badgeImageId={appearance.badgeImageId} />
        </span>
        <button
          className="pressable"
          onClick={() => setCheckinOpen(true)}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            padding: 0,
            background: 'transparent',
          }}
          title="查岗 / 报备"
        >
          <span
            className="nav-title fs-h3"
            style={{
              color: 'var(--text-primary)',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
            }}
          >
            {character.name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              {act.isSleep && <BedDouble size={11} />}
              {act.isSleep ? '睡觉中' : `正在：${act.label}`}
            </span>
            <span style={{ width: 46, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
              <span style={{ display: 'block', width: `${act.progress}%`, height: '100%', background: '#f5f5f5', transition: 'width 0.5s' }} />
            </span>
            <span className="fs-micro mono" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{act.progress}%</span>
          </span>
        </button>
        <button className="pressable" onClick={() => setMindOpen(true)} style={{ color: 'var(--text-secondary)', padding: 5 }} title="心声">
          <Heart size={18} />
        </button>
        <button
          className="pressable"
          onClick={() => setView((v) => (v === 'schedule' ? 'chat' : 'schedule'))}
          style={{ color: view === 'schedule' ? 'var(--accent-color)' : 'var(--text-secondary)', padding: 5 }}
          title="日程"
        >
          <CalendarDays size={18} />
        </button>
      </div>

      <div
        className="no-select"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '7px 12px',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 999, padding: 2 }}>
          {([
            { key: 'online' as ChatMode, label: '线上' },
            { key: 'offline' as ChatMode, label: '线下' },
          ]).map((it) => {
            const active = chatMode === it.key
            return (
              <button
                key={it.key}
                className="pressable"
                onClick={() => handleSwitchMode(it.key)}
                style={{
                  padding: '4px 22px',
                  borderRadius: 999,
                  fontSize: 12,
                  lineHeight: 1.4,
                  background: active ? '#f5f5f5' : 'transparent',
                  color: active ? '#111111' : 'var(--text-tertiary)',
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? '0 1px 6px rgba(0,0,0,0.35)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                {it.label}
              </button>
            )
          })}
        </div>
        <div style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center', gap: 2 }}>
          {chatMode === 'offline' && (
            <button
              className="pressable"
              onClick={() => void fixLastNarrative()}
              disabled={fixing}
              style={{ color: fixing ? 'var(--text-disabled)' : 'var(--text-secondary)', padding: 5 }}
              title="一键格式修正"
            >
              <Wand2 size={16} />
            </button>
          )}
          <button
            className="pressable"
            onClick={() => setOfflineCfgOpen(true)}
            style={{ color: chatMode === 'offline' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: 5 }}
            title="线下模式设置"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {branch && (
        <button
          className="pressable"
          onClick={() => useBranches.getState().setActive(sessionId, null)}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: 'rgba(122,184,245,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <GitBranch size={13} color="#7ab8f5" />
          <span className="fs-micro" style={{ color: '#7ab8f5', flex: 1, textAlign: 'left' }}>分支模式：{branch.name}（点击回到主线）</span>
        </button>
      )}

      {view === 'schedule' ? (
        <ScheduleView character={character} />
      ) : (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <WallpaperLayer imageId={settings.wallpapers.chat} fx={settings.wallpaperFx.chat} />
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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

            {messages.map((m, i) => {
              const prev = messages[i - 1]
              const showDivider = appearance.simpleMode && (!prev || m.role !== prev.role)
              return (
                <div key={m.id}>
                  {showDivider && <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} /></div>}
                  <MessageRow
                    m={m}
                    characterName={character.name}
                    avatarId={m.role === 'user' ? userAvatarId : character.avatarId}
                    appearance={appearance}
                    onLongPress={() => setActionMsg(m)}
                    onOpenImage={openViewer}
                    onPoke={poke}
                    onClaim={() => claimRedpacket(m)}
                  />
                </div>
              )
            })}

            {streamText !== null && (
              chatMode === 'offline' ? (
                <div style={{ width: '100%', padding: '10px 6px' }}>
                  <div
                    className="fs-body"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.9, color: 'var(--text-body)', fontFamily: "var(--font-serif, 'Noto Serif SC', serif)", fontSize: 14 * appearance.fontSize + 1 }}
                  >
                    {streamText}
                    <span className="stream-cursor">▍</span>
                  </div>
                </div>
              ) : (
                <div style={{ alignSelf: 'flex-start', maxWidth: '78%' }}>
                  <div className="bubble bubble-left fs-body ksc-bubble" style={{ whiteSpace: 'pre-wrap', ...bubbleOverrides(appearance, false) }}>
                    {streamText}
                    <span className="stream-cursor">▍</span>
                  </div>
                </div>
              )
            )}

            {typing && (
              <div style={{ alignSelf: 'flex-start' }}>
                <TypingIndicator name={character.name} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {awaitingManual && view === 'chat' && (
        <div style={{ padding: '0 14px 6px', flexShrink: 0 }}>
          <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => runGeneration()}>
            生成回复
          </button>
        </div>
      )}

      {view === 'chat' && (
        <>
          {quoteMsg && (
            <div className="chat-quote-bar">
              <div className="chat-quote-bar__body">
                <span className="chat-quote-bar__name">引用 · {quoteMsg.role === 'user' ? '我' : character.name}</span>
                <span className="chat-quote-bar__text">{quoteMsg.content}</span>
              </div>
              <button className="pressable" onClick={() => setQuoteMsg(null)} style={{ color: 'var(--text-tertiary)', padding: 4 }} aria-label="取消引用">
                <X size={16} />
              </button>
            </div>
          )}
          {activeGame && (
            <div style={{ padding: '0 14px 6px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              <button
                className="pressable"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'var(--accent-color)',
                  border: '1px solid var(--accent-color)',
                  background: 'transparent',
                }}
                onClick={() => useGames.getState().setStatus(activeGame.id, 'paused')}
              >
                <Dices size={13} />
                游戏中 · 点击暂停（输入框直接当行动/提问发送）
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
              placeholder={chatMode === 'offline' ? (inputMode === 'narration' ? '写下你的旁白…' : '写下你的对白…') : '说点什么…'}
              rows={1}
              style={{ flex: 1, resize: 'none', maxHeight: 96, lineHeight: 1.5, borderRadius: 14 }}
            />
            {streamText !== null ? (
              <button className="pressable" onClick={() => abortRef.current?.abort()} style={{ color: 'var(--text-secondary)', padding: 8 }} title="停止生成">
                <StopCircle size={22} />
              </button>
            ) : chatMode === 'offline' ? (
              <button
                className="pressable"
                onClick={() => setInputMode((v) => (v === 'dialogue' ? 'narration' : 'dialogue'))}
                style={{ color: inputMode === 'narration' ? '#f5f5f5' : 'var(--text-secondary)', padding: 8 }}
                title={inputMode === 'narration' ? '当前：旁白（点击切回对白）' : '当前：对白（点击切换为旁白）'}
              >
                {inputMode === 'narration' ? <BookOpen size={22} /> : <MessageCircle size={22} />}
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
            <div className="page-enter" style={{ display: 'flex', gap: 14, padding: '10px 14px 14px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
              {chatMode === 'offline' ? (
                <>
                  <PlusAction icon={<Braces size={19} />} label="OOC" onClick={sendOoc} disabled={!params.allowOoc} />
                  <span className="fs-micro" style={{ color: 'var(--text-disabled)', alignSelf: 'center' }}>线下叙事模式：图片 / 语音 / 转账 / 红包等富媒体仅线上模式可用</span>
                </>
              ) : (
                <>
                  <PlusAction icon={<ImageIcon size={19} />} label="图片" onClick={sendImage} />
                  <PlusAction icon={<Mic size={19} />} label="语音" onClick={sendVoice} />
                  {params.allowOoc && <PlusAction icon={<Braces size={19} />} label="OOC" onClick={sendOoc} />}
                  <PlusAction icon={<Banknote size={19} />} label="转账" onClick={() => { setPlusOpen(false); setTransferOpen(true) }} />
                  <PlusAction icon={<Gift size={19} />} label="红包" onClick={() => { setPlusOpen(false); setRedpacketOpen(true) }} />
                  <PlusAction icon={<ClipboardCheck size={19} />} label="报备" onClick={() => { setPlusOpen(false); setReportOpen(true) }} />
                  <PlusAction icon={<Timer size={19} />} label="一起专注" onClick={() => { setPlusOpen(false); setTomatoOpen(true) }} />
                  <PlusAction icon={<Dices size={19} />} label="一起玩" onClick={() => { setPlusOpen(false); setGameSetupOpen(true) }} />
                </>
              )}
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
        </>
      )}

      {actionMsg && (
        <div onClick={() => setActionMsg(null)} style={{ position: 'absolute', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} className="page-enter" style={{ width: '100%', padding: '10px 14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actionMsg.type === 'text' && (
              <SheetBtn icon={<Copy size={17} />} label="复制" onClick={() => copyMsg(actionMsg)} />
            )}
            {(actionMsg.type === 'text' || actionMsg.type === 'voice') && (
              <SheetBtn
                icon={<Quote size={17} />}
                label="引用"
                onClick={() => {
                  setQuoteMsg(actionMsg)
                  setActionMsg(null)
                }}
              />
            )}
            <SheetBtn
              icon={<Mic size={17} />}
              label="模拟语音"
              onClick={() => {
                setVoiceComposeOpen(true)
                setActionMsg(null)
              }}
            />
            {actionMsg.role === 'user' && params.allowRecall && !actionMsg.recalled && (
              <SheetBtn icon={<Undo2 size={17} />} label="撤回" onClick={() => recall(actionMsg)} />
            )}
            <SheetBtn icon={<GitBranch size={17} />} label="从此处分叉" onClick={() => createBranchFrom(actionMsg)} />
            <SheetBtn icon={<Trash2 size={17} />} label="删除" onClick={() => deleteMsg(actionMsg)} />
            <button className="btn" onClick={() => setActionMsg(null)}>取消</button>
          </div>
        </div>
      )}

      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title="查岗">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>
            {character.name} 正在：{act.label}
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${act.progress}%`, height: '100%', background: 'var(--accent-color)' }} />
          </div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>进度 {act.progress}% · 让 TA 报备一下？</div>
          <button className="btn btn-accent" onClick={runCheckin}>生成报备消息</button>
        </div>
      </Modal>

      <Modal open={sleepOpen} onClose={() => setSleepOpen(false)} title="昏睡模式">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fs-body" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BedDouble size={18} color="var(--accent-color)" />
            {character.name} 正在「{act.label}」，消息会延迟回复
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setSleepOpen(false)}>不打扰</button>
            <button
              className="btn btn-accent"
              style={{ flex: 1 }}
              onClick={() => {
                awakeUntilRef.current = Date.now() + 5 * 60 * 1000
                addLocal({ role: 'user', type: 'system', content: `你把 ${character.name} 叫醒了` })
                setSleepOpen(false)
              }}
            >
              叫醒 TA
            </button>
          </div>
        </div>
      </Modal>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        targets={[{ id: characterId, name: character.name }]}
        onSend={doTransfer}
      />
      <RedPacketModal
        open={redpacketOpen}
        onClose={() => setRedpacketOpen(false)}
        targets={[{ id: characterId, name: character.name }]}
        onSend={doRedpacket}
      />
      <ReverseReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      <GameSetupModal
        open={gameSetupOpen}
        onClose={() => setGameSetupOpen(false)}
        chatId={sessionId}
        character={character}
      />
      <Modal open={tomatoOpen} onClose={() => setTomatoOpen(false)} title="一起专注">
        <TomatoConfig onStart={startTomato} />
      </Modal>

      <Modal open={!!branchNaming} onClose={() => setBranchNaming(null)} title="创建分支">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>将复制这条消息之前的全部对话到新分支</div>
          <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="分支名称（可选）" maxLength={16} autoFocus />
          <button className="btn btn-accent" onClick={confirmBranch}>创建</button>
        </div>
      </Modal>

      <Modal open={voiceComposeOpen} onClose={() => setVoiceComposeOpen(false)} title="模拟语音">
        <VoiceCompose onSend={sendVoiceSimulated} />
      </Modal>

      {tomato && (
        <TomatoOverlay
          characterName={character.name}
          seconds={tomato.seconds}
          noise={tomato.noise}
          onFinish={finishTomato}
          onCancel={() => setTomato(null)}
        />
      )}

      {mindOpen && (
        <MindPanel character={character} history={messages} onClose={() => setMindOpen(false)} />
      )}

      {offlineCfgOpen && <OfflineSettingsModal characterId={characterId} onClose={() => setOfflineCfgOpen(false)} />}

      {viewer}
    </div>
  )
}

function bubbleOverrides(a: ReturnType<typeof useChatAppearance.getState>, isUser: boolean): React.CSSProperties {
  switch (a.bubbleStyle) {
    case 'ink-white':
      return { background: '#f5f5f5', color: '#111111', border: 'none', boxShadow: 'none', backdropFilter: 'none' }
    case 'ink-black':
      return { background: '#0d0d0d', color: '#f2f2f2', border: '1px solid #3a3a3a', boxShadow: 'none', backdropFilter: 'none' }
    case 'mono':
      return isUser
        ? { background: '#e8e8e8', color: '#1a1a1a', border: 'none', boxShadow: 'none', backdropFilter: 'none' }
        : { background: '#2e2e2e', color: '#e8e8e8', border: 'none', boxShadow: 'none', backdropFilter: 'none' }
    case 'custom': {
      const c = a.customBubble
      const base: React.CSSProperties = {
        background: isUser ? c.meBg : c.otherBg,
        color: isUser ? c.meText : c.otherText,
        borderRadius: c.radius,
        boxShadow: 'none',
        backdropFilter: 'none',
        border: c.bordered ? '1px solid rgba(128,128,128,0.45)' : 'none',
      }
      return base
    }
    case 'pill':
      return { borderRadius: 999 }
    case 'minimal':
      return { background: 'transparent', border: 'none', padding: '2px 4px', boxShadow: 'none', backdropFilter: 'none' }
    case 'flat':
      return { background: '#1A1A1A', border: 'none', boxShadow: 'none', backdropFilter: 'none' }
    case 'glass':
      return { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' }
    default:
      return {}
  }
}

function ChipMono({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1.4,
        background: active ? '#f5f5f5' : 'rgba(255,255,255,0.06)',
        color: active ? '#111111' : 'var(--text-tertiary)',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}

function SectionLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
      <span className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{text}</span>
      {hint && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{hint}</span>}
    </div>
  )
}

function OfflineSettingsModal({ characterId, onClose }: { characterId: string; onClose: () => void }) {
  useOfflineMode()
  const st = offlineSettingsFor(characterId)
  const { updateSettings, applyLengthPreset } = useOfflineMode.getState()
  return (
    <Modal open onClose={onClose} title="线下模式设置">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '60vh', overflowY: 'auto', paddingRight: 2 }}>
        <div>
          <SectionLabel text="文风" hint={OFFLINE_STYLES.find((s) => s.key === st.style)?.desc} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {OFFLINE_STYLES.map((s) => (
              <ChipMono key={s.key} label={s.label} active={st.style === s.key} onClick={() => updateSettings(characterId, { style: s.key })} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel text="人称" hint={OFFLINE_PERSONS.find((p) => p.key === st.person)?.desc} />
          <div style={{ display: 'flex', gap: 6 }}>
            {OFFLINE_PERSONS.map((p) => (
              <ChipMono key={p.key} label={p.label} active={st.person === p.key} onClick={() => updateSettings(characterId, { person: p.key })} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel text="篇幅" hint={`当前目标约 ${OFFLINE_LENGTHS.find((l) => l.key === st.length)?.target} 字`} />
          <div style={{ display: 'flex', gap: 6 }}>
            {OFFLINE_LENGTHS.map((l) => (
              <ChipMono key={l.key} label={`${l.label}（${l.target}字）`} active={st.length === l.key} onClick={() => applyLengthPreset(characterId, l.key)} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel text="字数区间" hint={`${st.minWords} - ${st.maxWords} 字`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', width: 28, flexShrink: 0 }}>下限</span>
              <input
                type="range"
                min={100}
                max={1400}
                step={50}
                value={st.minWords}
                onChange={(e) => updateSettings(characterId, { minWords: Math.min(Number(e.target.value), st.maxWords - 50) })}
                style={{ flex: 1, accentColor: '#f5f5f5' }}
              />
              <span className="fs-micro mono" style={{ color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{st.minWords}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', width: 28, flexShrink: 0 }}>上限</span>
              <input
                type="range"
                min={150}
                max={1500}
                step={50}
                value={st.maxWords}
                onChange={(e) => updateSettings(characterId, { maxWords: Math.max(Number(e.target.value), st.minWords + 50) })}
                style={{ flex: 1, accentColor: '#f5f5f5' }}
              />
              <span className="fs-micro mono" style={{ color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{st.maxWords}</span>
            </label>
          </div>
        </div>

        <div>
          <SectionLabel text="时间感知" hint={`间隔超过 ${st.timeGapMinutes} 分钟再回复，角色会有反应`} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="pressable"
              onClick={() => updateSettings(characterId, { timeAware: !st.timeAware })}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                background: st.timeAware ? '#f5f5f5' : 'rgba(255,255,255,0.06)',
                color: st.timeAware ? '#111111' : 'var(--text-tertiary)',
                fontWeight: st.timeAware ? 600 : 400,
              }}
            >
              {st.timeAware ? '已开启' : '已关闭'}
            </button>
            {st.timeAware && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="number"
                  min={5}
                  max={10080}
                  value={st.timeGapMinutes}
                  onChange={(e) => updateSettings(characterId, { timeGapMinutes: Math.max(5, Math.min(10080, Number(e.target.value) || 120)) })}
                  style={{ width: 80, padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: 12 }}
                />
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>分钟</span>
              </label>
            )}
          </div>
        </div>

        <div>
          <SectionLabel text="自定义 prompt 规则" hint="防止 AI 擅自跨模式输出的补充约束" />
          <textarea
            value={st.customRules}
            onChange={(e) => updateSettings(characterId, { customRules: e.target.value })}
            placeholder={'例：\n- 禁止在旁白里替我做任何决定\n- 场景转换必须用分割线'}
            rows={4}
            style={{ width: '100%', resize: 'vertical', minHeight: 72, lineHeight: 1.6, fontSize: 12, borderRadius: 10, padding: '8px 10px' }}
          />
        </div>

        <div className="fs-micro" style={{ color: 'var(--text-disabled)', lineHeight: 1.7 }}>
          设置按角色独立保存。切换模式时自动生成对话摘要注入上下文，两种模式的记忆互通。
        </div>
        <button className="btn btn-accent" onClick={onClose}>完成</button>
      </div>
    </Modal>
  )
}

function TomatoConfig({ onStart }: { onStart: (seconds: number, noise: boolean, accompany: boolean) => void }) {  const [minutes, setMinutes] = useState(25)
  const [noise, setNoise] = useState(false)
  const [accompany, setAccompany] = useState(true)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>时长</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[15, 25, 45, 60].map((m) => (
            <button
              key={m}
              className="btn pressable"
              style={{ flex: 1, padding: '6px 0', background: minutes === m ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)', color: minutes === m ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
              onClick={() => setMinutes(m)}
            >
              {m}分
            </button>
          ))}
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={noise} onChange={(e) => setNoise(e.target.checked)} />
        <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>白噪音</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={accompany} onChange={(e) => setAccompany(e.target.checked)} />
        <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>角色陪伴（开场与鼓励消息）</span>
      </label>
      <button className="btn btn-accent" onClick={() => onStart(minutes * 60, noise, accompany)}>开始专注</button>
    </div>
  )
}

function PlusAction({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="pressable"
      onClick={onClick}
      disabled={disabled}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 58, opacity: disabled ? 0.35 : 1 }}
    >
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

function StickerCell({ imageId, onClick }: { imageId: string; onClick: () => void }) {
  const url = useBlobURL(imageId)
  return (
    <button className="pressable" onClick={onClick} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
      {url && <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
    </button>
  )
}


function NarrativeBody({ content, fontPx, serifFont }: { content: string; fontPx: number; serifFont: string }) {
  const segs = useMemo(() => parseNarrative(content), [content])
  const time = segs.find((s) => s.kind === 'time')
  const place = segs.find((s) => s.kind === 'place')
  const body = segs.filter((s) => s.kind !== 'time' && s.kind !== 'place')
  return (
    <div style={{ width: '100%' }}>
      {(time || place) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          {time && <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{time.text}</span>}
          {time && place && <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>·</span>}
          {place && <span className="fs-micro mono" style={{ color: 'var(--text-tertiary)' }}>{place.text}</span>}
        </div>
      )}
      <div style={{ fontFamily: serifFont, fontSize: fontPx, lineHeight: 2.0, color: 'var(--text-body)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {body.map((seg, i) => {
          if (seg.kind === 'dialogue') {
            return (
              <span key={i} style={{ color: 'var(--text-primary)', display: 'block', padding: '2px 0' }}>{seg.text}</span>
            )
          }
          if (seg.kind === 'narration') {
            return (
              <span key={i} style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', display: 'block', padding: '2px 0' }}>（{seg.text}）</span>
            )
          }
          return (
            <span key={i} style={{ display: 'block', padding: '1px 0' }}>{seg.text}</span>
          )
        })}
      </div>
    </div>
  )
}


function MessageRow({
  m,
  characterName,
  avatarId,
  appearance,
  onLongPress,
  onOpenImage,
  onPoke,
  onClaim,
}: {
  m: ChatMessage
  characterName: string
  avatarId: string | null
  appearance: ReturnType<typeof useChatAppearance.getState>
  onLongPress: () => void
  onOpenImage: (url: string) => void
  onPoke: () => void
  onClaim: () => void
}) {
  const isUser = m.role === 'user'
  const fontPx = 14 * appearance.fontSize

  if (m.recalled) {
    return (
      <div style={{ alignSelf: 'center', padding: '4px 0' }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
          {isUser ? '你撤回了一条消息' : `${characterName} 撤回了一条消息`}
        </span>
      </div>
    )
  }
  if (m.type === 'system') {
    return (
      <div style={{ alignSelf: 'center', padding: '3px 0' }}>
        <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>{m.content}</span>
      </div>
    )
  }
  if (m.type === 'ooc') {
    return (
      <div style={{ alignSelf: 'center', maxWidth: '86%', padding: '4px 0' }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '6px 12px', fontStyle: 'italic' }}>
          OOC：{m.content}
        </div>
      </div>
    )
  }

  const serifFont = "var(--font-serif, 'Noto Serif SC', 'Songti SC', 'SimSun', serif)"
  const isNarrative = m.mode === 'offline'
  const rowHandlers = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress()
    },
    onDoubleClick: onLongPress,
  }

  if (m.type === 'narration') {
    return (
      <div
        {...rowHandlers}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '6px 0' }}
      >
        <div style={{ maxWidth: '88%', borderLeft: '2px solid rgba(255,255,255,0.28)', paddingLeft: 12, padding: '4px 10px 4px 12px' }}>
          <div className="fs-micro mono" style={{ color: 'var(--text-disabled)', marginBottom: 2 }}>旁白</div>
          <div style={{ fontFamily: serifFont, fontStyle: 'italic', fontSize: fontPx, lineHeight: 1.9, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {m.content}
          </div>
        </div>
      </div>
    )
  }

  if (isNarrative && m.type === 'text') {
    if (isUser) {
      return (
        <div {...rowHandlers} style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', padding: '5px 2px' }}>
          <div style={{ maxWidth: '82%', textAlign: 'right' }}>
            <div className="fs-micro mono" style={{ color: 'var(--text-disabled)', marginBottom: 2 }}>我</div>
            <div style={{ fontFamily: serifFont, fontSize: fontPx + 1, lineHeight: 1.9, color: 'var(--text-body)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              「{m.content}」
            </div>
          </div>
        </div>
      )
    }
    return (
      <div {...rowHandlers} style={{ width: '100%', padding: '5px 2px' }}>
        <NarrativeBody content={m.content} fontPx={fontPx + 1} serifFont={serifFont} />
      </div>
    )
  }

  const avatarEl = (
    <span onDoubleClick={onPoke} style={{ cursor: 'pointer' }}>
      <Avatar imageId={avatarId} name={isUser ? '我' : characterName} size={appearance.avatarSize} shape={appearance.avatarShape} badgeImageId={isUser ? undefined : appearance.badgeImageId} />
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
      {avatarEl}
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 2 }}>
        {renderBody(m, isUser, appearance, fontPx, onLongPress, onOpenImage, onClaim, characterName)}
        {appearance.timestampStyle === 'outside' && <TimeText ts={m.timestamp} />}
      </div>
    </div>
  )
}

function renderBody(
  m: ChatMessage,
  isUser: boolean,
  appearance: ReturnType<typeof useChatAppearance.getState>,
  fontPx: number,
  onLongPress: () => void,
  onOpenImage: (url: string) => void,
  onClaim: () => void,
  characterName: string
): React.ReactNode {
  const commonHandlers = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress()
    },
    onDoubleClick: onLongPress,
  }
  if (m.type === 'image' || m.type === 'sticker') {
    return <ImageBubble2 imageId={m.imageId} sticker={m.type === 'sticker'} onOpen={onOpenImage} onLongPress={onLongPress} />
  }
  if (m.type === 'voice') {
    return (
      <div
        {...commonHandlers}
        className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'} ksc-bubble`}
        style={{ padding: '4px 6px', ...bubbleOverrides(appearance, isUser) }}
      >
        {m.data?.quote && <QuoteBlock quote={m.data.quote} />}
        <VoiceBubble voiceId={m.data?.voiceId} seconds={m.data?.seconds} simulated={m.data?.simulated} transcript={m.data?.transcript} />
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
        <RedPacketCard data={m.data ?? {}} mine={isUser} ts={m.timestamp} characterName={isUser ? '你' : characterName} onClaim={onClaim} />
      </div>
    )
  }
  if (m.type === 'dice') {
    return (
      <div {...commonHandlers} className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'} ksc-bubble`} style={bubbleOverrides(appearance, isUser)}>
        <DiceCard value={m.data?.value} />
      </div>
    )
  }
  if (m.type === 'music-card') {
    return (
      <div {...commonHandlers}>
        <MusicCardBubble data={m.data ?? {}} />
      </div>
    )
  }
  if (m.type === 'moment-card') {
    return (
      <div {...commonHandlers}>
        <MomentCardBubble momentId={m.data?.momentId ?? null} content={m.content} />
      </div>
    )
  }
  if (m.type === 'game-card') {
    return (
      <div {...commonHandlers}>
        <GameCardBubble gameId={m.data?.gameId ?? ''} />
      </div>
    )
  }
  return (
    <div
      {...commonHandlers}
      className={`bubble ${isUser ? 'bubble-right' : 'bubble-left'} fs-body ksc-bubble`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: fontPx, ...bubbleOverrides(appearance, isUser) }}
    >
      {m.data?.quote && <QuoteBlock quote={m.data.quote} />}
      {m.content}
    </div>
  )
}

/** 气泡内的引用块 */
function QuoteBlock({ quote }: { quote: { name: string; content: string } }) {
  return (
    <div className="bubble__quote">
      <span className="bubble__quote-name">{quote.name}</span>
      <span className="bubble__quote-text">{quote.content}</span>
    </div>
  )
}

/** 自定义模拟语音：无需录音，自定时长与文字 */
function VoiceCompose({ onSend }: { onSend: (seconds: number, transcript: string) => void }) {
  const [seconds, setSeconds] = useState(8)
  const [transcript, setTranscript] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>语音时长</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={1}
            max={60}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-color)' }}
          />
          <span className="fs-body" style={{ width: 46, textAlign: 'right' }}>{seconds}"</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[3, 8, 15, 30, 60].map((s) => (
            <button
              key={s}
              className="pressable"
              onClick={() => setSeconds(s)}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                background: s === seconds ? 'var(--accent-color)' : 'rgba(255,255,255,0.07)',
                color: s === seconds ? '#000' : 'var(--text-secondary)',
              }}
            >
              {s}"
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>语音文字（可选，模拟转写内容）</div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={3}
          placeholder="例如：今天天气很好，想和你聊聊天…"
          style={{ width: '100%', resize: 'none', borderRadius: 12 }}
        />
      </div>
      <button className="btn btn-accent" onClick={() => onSend(seconds, transcript)}>发送语音</button>
    </div>
  )
}

function MomentCardBubble({ momentId, content }: { momentId: string | null; content: string }) {
  const moment = useMoments((s) => s.moments.find((m) => m.id === momentId))
  const setPendingHubTab = useUI((s) => s.setPendingHubTab)
  const setPendingJump = useMoments((s) => s.setPendingJump)
  const url = useBlobURL(moment?.imageIds[0] ?? null)
  const deleted = !moment

  return (
    <button
      className="bubble bubble-left ksc-bubble pressable"
      onClick={() => {
        if (!moment) return
        setPendingJump(moment.id)
        setPendingHubTab('moments')
      }}
      style={{ padding: 10, maxWidth: 240, borderRadius: 14, textAlign: 'left', display: 'block' }}
    >
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--accent, #9b8cff)' }}>朋友圈</span>
        <span>·</span>
        <span>{deleted ? '动态已删除' : moment.author.name}</span>
      </div>
      {url && (
        <img src={url} alt="" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 10, marginTop: 6 }} />
      )}
      <div className="fs-body" style={{ marginTop: 4, color: 'var(--text-body)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {deleted ? '（动态内容已不可见）' : moment.content || content || '（图片动态）'}
      </div>
    </button>
  )
}

function ImageBubble2({
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
