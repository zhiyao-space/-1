import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Delete, Heart, Plus, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { useCharacters, type Character } from '../../store/characters'
import { DEFAULT_SENSITIVE, useSnoop } from '../../store/snoop'
import { useUI, useToast } from '../../store/ui'
import { useChats } from '../../store/chats'
import { SNOOP_MODULES, SECURITY_COST, caughtMessage, lockMessage, type SnoopModuleId } from '../../lib/snoopEngine'
import Avatar from '../chat/Avatar'
import { MODULE_VIEWS } from './SnoopModules'
import '../../styles/snoop.css'

/* ============================================================
   「查手机」App
   选人 → 密码验证 → 主页（设备概况 + App 网格）→ 模块详情
   含安全感扣除 / 锁机 / 随机被抓 / 一键刷新 / 敏感词管理
   ============================================================ */

type View =
  | { kind: 'pick' }
  | { kind: 'gate'; charId: string }
  | { kind: 'home'; charId: string }
  | { kind: 'module'; charId: string; moduleId: SnoopModuleId }

function securityClass(v: number) {
  return v >= 60 ? 'high' : v >= 30 ? 'mid' : 'low'
}

/* ---------------- 被抓事件桥（模块级） ---------------- */
let caughtHandler: ((c: Character) => void) | null = null
function triggerCaught(c: Character) {
  caughtHandler?.(c)
}

export default function SnoopApp() {
  const characters = useCharacters((s) => s.characters)
  const closeApp = useUI((s) => s.closeApp)
  const [view, setView] = useState<View>(() => ({ kind: 'pick' }))
  const [caught, setCaught] = useState<Character | null>(null)

  useEffect(() => {
    caughtHandler = (c) => {
      const sid = useChats.getState().getOrCreateSession(c.id)
      useChats.getState().addMessage(sid, { role: 'assistant', type: 'text', content: caughtMessage(c) })
      useSnoop.getState().recordCaught(c.id)
      setCaught(c)
    }
    return () => {
      caughtHandler = null
    }
  }, [])

  const charId = 'charId' in view ? view.charId : null
  const character = useMemo(() => characters.find((c) => c.id === charId) ?? null, [characters, charId])

  let body
  if (characters.length === 0) {
    body = (
      <div className="sn-gate">
        <ShieldAlert size={40} color="#a0a0a0" />
        <div className="sn-t1" style={{ fontWeight: 700 }}>还没有可以查的角色</div>
        <div className="sn-t2" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
          先去「聊天」创建角色，再回来查 TA 的手机。
        </div>
        <button className="sn-row" style={{ justifyContent: 'center' }} onClick={closeApp}>
          <ChevronLeft size={16} /> 返回桌面
        </button>
      </div>
    )
  } else if (view.kind === 'pick' || !character) {
    body = (
      <>
        <div className="sn-nav">
          <button className="sn-iconbtn" onClick={closeApp} aria-label="返回桌面">
            <ChevronLeft size={19} />
          </button>
          <span className="sn-t1" style={{ flex: 1, fontWeight: 700 }}>查手机</span>
        </div>
        <div className="sn-scroll">
          <div className="sn-t2" style={{ fontSize: 12 }}>选择要查看的手机</div>
          {characters.map((c) => {
            const locked = useSnoop.getState().isLocked(c.id)
            return (
              <button
                key={c.id}
                className="sn-row"
                onClick={() => {
                  useSnoop.getState().ensurePhone(c)
                  setView({ kind: 'gate', charId: c.id })
                }}
              >
                <Avatar imageId={c.avatarId} name={c.name} size={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="sn-t1" style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="sn-t2" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                    {locked ? '🔒 冷却中（24 小时）' : c.identity || '点击查看 TA 的手机'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </>
    )
  } else if (view.kind === 'gate') {
    body = <Gate character={character} onBack={() => setView({ kind: 'pick' })} onPass={() => setView({ kind: 'home', charId: character.id })} />
  } else if (view.kind === 'home') {
    body = <Home character={character} onOpen={(m) => setView({ kind: 'module', charId: character.id, moduleId: m })} />
  } else {
    body = <ModuleHost character={character} moduleId={view.moduleId} onBack={() => setView({ kind: 'home', charId: character.id })} />
  }

  return (
    <div className="snoop-root">
      {body}
      {caught && <CaughtOverlay character={caught} onClose={() => setCaught(null)} />}
    </div>
  )
}

/* ---------------- 密码验证页 ---------------- */

function Gate({ character, onBack, onPass }: { character: Character; onBack: () => void; onPass: () => void }) {
  const [input, setInput] = useState('')
  const [tries, setTries] = useState(0)
  const [shake, setShake] = useState(false)
  const lockUntil = useSnoop((s) => s.lockUntil[character.id] ?? 0)
  const locked = lockUntil > Date.now()

  const press = (d: string) => {
    const next = (input + d).slice(0, 6)
    setInput(next)
    if (next.length < 6) return
    const real = useSnoop.getState().passwordOf(character.id)
    if (next === real) {
      navigator.vibrate?.(15)
      window.setTimeout(onPass, 120)
      return
    }
    navigator.vibrate?.([20, 40, 20])
    setShake(true)
    window.setTimeout(() => setShake(false), 440)
    const t = tries + 1
    setInput('')
    if (t >= 3) {
      setTries(0)
      triggerCaught(character)
      return
    }
    setTries(t)
  }

  if (locked) {
    return (
      <div className="sn-gate">
        <ShieldAlert size={40} color="#ff4757" />
        <div className="sn-t1" style={{ fontWeight: 700 }}>这个手机暂时锁了</div>
        <div className="sn-t2" style={{ fontSize: 13 }}>TA 已经起疑，24 小时后才能再查。</div>
        <button className="sn-row" style={{ justifyContent: 'center' }} onClick={onBack}>
          <ChevronLeft size={16} /> 返回
        </button>
      </div>
    )
  }

  return (
    <div className="sn-gate">
      <button className="sn-iconbtn" onClick={onBack} style={{ position: 'absolute', top: 12, left: 12 }} aria-label="返回">
        <ChevronLeft size={19} />
      </button>
      <Avatar imageId={character.avatarId} name={character.name} size={64} />
      <div className="sn-t1" style={{ fontWeight: 700 }}>{character.name} 的手机</div>
      <div className={shake ? 'sn-shake' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="sn-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`sn-dot${i < input.length ? ' on' : ''}`} />
          ))}
        </div>
        <div className="sn-t2" style={{ fontSize: 11 }}>剩余尝试次数 {Math.max(0, 3 - tries)}</div>
      </div>
      <div className="sn-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="sn-key pressable" onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button className="sn-key pressable" onClick={() => press('0')}>0</button>
        <button className="sn-key pressable" onClick={() => setInput((v) => v.slice(0, -1))} aria-label="删除">
          <Delete size={20} />
        </button>
      </div>
      <div className="sn-t2" style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.7 }}>
        密码是 TA 的六位手机锁屏密码。<br />你或许在「角色档案」里偷偷记下过它。
      </div>
    </div>
  )
}

/* ---------------- 主页 ---------------- */

function Home({ character, onOpen }: { character: Character; onOpen: (m: SnoopModuleId) => void }) {
  const closeApp = useUI((s) => s.closeApp)
  const push = useToast((s) => s.push)
  const security = useSnoop((s) => s.securityOf(character.id))
  const data = useSnoop((s) => s.dataOf(character.id))
  const refreshAll = useSnoop((s) => s.refreshAll)
  const globalUntil = useSnoop((s) => s.globalCooldown[character.id] ?? 0)
  const [now, setNow] = useState(Date.now())
  const [mask, setMask] = useState(false)
  const [wordsOpen, setWordsOpen] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])

  // 停留时间过长：主页面也缓慢扣（每秒 -0.2）
  useEffect(() => {
    const t = window.setInterval(() => useSnoop.getState().dwell(character.id, 1), 1000)
    return () => window.clearInterval(t)
  }, [character.id])

  const cooling = globalUntil > now
  const secs = Math.ceil((globalUntil - now) / 1000)
  const device = data?.device
  const screenH = device ? `${Math.floor(device.screenMin / 60)}h ${device.screenMin % 60}min` : '--'

  return (
    <>
      <div className="sn-nav">
        <button className="sn-iconbtn" onClick={closeApp} aria-label="返回桌面">
          <ChevronLeft size={19} />
        </button>
        <Avatar imageId={character.avatarId} name={character.name} size={34} />
        <span className="sn-t1" style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {character.name}
        </span>
        <span className={`sn-security ${securityClass(security)}`}>
          <Heart size={13} /> {Math.round(security)}
        </span>
        <button
          className="sn-iconbtn"
          disabled={cooling}
          onClick={() => {
            if (!refreshAll(character)) return
            setMask(true)
            push('正在刷新全部数据…')
            window.setTimeout(() => setMask(false), 1200 + Math.random() * 800)
          }}
          aria-label="刷新全部"
        >
          {cooling ? <span style={{ fontSize: 11 }}>{secs}s</span> : <RefreshCw size={16} />}
        </button>
      </div>

      {device && (
        <div style={{ padding: '12px 14px 0' }}>
          <div className="sn-card" style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Stat label="电量" value={`${device.battery}%${device.charging ? ' ⚡' : ''}`} />
            <Stat label="存储" value={`${device.used}GB / ${device.total}GB`} />
            <Stat label="今日屏幕" value={screenH} />
            <Stat label="网络" value={device.network} />
          </div>
        </div>
      )}

      <div className="sn-scroll">
        <div className="sn-t2" style={{ fontSize: 12 }}>应用</div>
        <div className="sn-grid">
          {SNOOP_MODULES.map((m) => {
            const cost = SECURITY_COST[m.tier]
            return (
              <button key={m.id} className="sn-app pressable" onClick={() => onOpen(m.id)}>
                <span className="sn-app__cost sn-chip" style={{ color: cost >= 15 ? '#ff8a94' : cost >= 8 ? '#ffa502' : '#2ed573' }}>
                  -{cost}
                </span>
                <span className="sn-app__emoji">{m.emoji}</span>
                <span className="sn-app__name">{m.name}</span>
                <span className="sn-app__hint">{m.hint}</span>
              </button>
            )
          })}
        </div>
        <button className="sn-row" style={{ justifyContent: 'center' }} onClick={() => setWordsOpen(true)}>
          <Plus size={15} /> 敏感词管理
        </button>
        <div className="sn-t2" style={{ fontSize: 11, lineHeight: 1.8, padding: '10px 2px' }}>
          提示：每翻一个 App 都会消耗 TA 的安全感，被翻多了会锁机。小心一点。
        </div>
      </div>

      {mask && (
        <div className="sn-refresh-mask">
          <RefreshCw size={18} className="spin" /> 刷新中…
        </div>
      )}
      {wordsOpen && <SensitiveManager onClose={() => setWordsOpen(false)} />}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="sn-t2" style={{ fontSize: 11 }}>{label}</div>
      <div className="sn-t1" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}

/* ---------------- 敏感词管理 ---------------- */

function SensitiveManager({ onClose }: { onClose: () => void }) {
  const custom = useSnoop((s) => s.customSensitive)
  const [draft, setDraft] = useState('')
  const add = useSnoop((s) => s.addSensitive)
  const remove = useSnoop((s) => s.removeSensitive)
  return (
    <div className="sn-overlay" onClick={onClose}>
      <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span className="sn-t1" style={{ flex: 1, fontWeight: 700 }}>敏感词管理</span>
          <button className="sn-iconbtn" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="sn-search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="添加敏感词" />
          <button
            className="sn-iconbtn"
            onClick={() => {
              add(draft)
              setDraft('')
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="sn-t2" style={{ fontSize: 11, margin: '10px 0 6px' }}>自定义词（{custom.length}）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
          {custom.map((w) => (
            <button key={w} className="sn-chip" onClick={() => remove(w)}>
              {w} <X size={10} />
            </button>
          ))}
          {custom.length === 0 && <span className="sn-t2" style={{ fontSize: 12 }}>还没有自定义词</span>}
        </div>
        <div className="sn-t2" style={{ fontSize: 11, margin: '12px 0 6px' }}>预设基础词库（{DEFAULT_SENSITIVE.length}）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
          {DEFAULT_SENSITIVE.map((w) => (
            <span key={w} className="sn-chip">{w}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 模块宿主：进 App 扣安全感 / 随机被抓 / 锁机 ---------------- */

function ModuleHost({
  character,
  moduleId,
  onBack,
}: {
  character: Character
  moduleId: SnoopModuleId
  onBack: () => void
}) {
  const closeApp = useUI((s) => s.closeApp)
  const data = useSnoop((s) => s.dataOf(character.id))
  const [locked, setLocked] = useState(false)
  const didEnter = useRef(false)

  useEffect(() => {
    if (!didEnter.current) {
      didEnter.current = true
      useSnoop.getState().enterModule(character, moduleId)
      // 随机被抓：基础 2%，隐私类 4%，私密空间 100%
      if (moduleId === 'private') {
        triggerCaught(character)
      } else {
        const meta = SNOOP_MODULES.find((m) => m.id === moduleId)
        const chance = meta?.tier === 'private' ? 0.04 : 0.02
        if (Math.random() < chance) triggerCaught(character)
      }
      if (useSnoop.getState().isLocked(character.id)) setLocked(true)
    }
    const t = window.setInterval(() => {
      useSnoop.getState().dwell(character.id, 1)
      if (useSnoop.getState().isLocked(character.id)) setLocked(true)
    }, 1000)
    return () => window.clearInterval(t)
  }, [character, moduleId])

  if (locked || useSnoop.getState().isLocked(character.id)) {
    return <LockScreen character={character} onExit={closeApp} />
  }
  if (!data) return <div className="sn-empty">数据尚未生成</div>
  const View = MODULE_VIEWS[moduleId]
  return <View character={character} data={data} moduleId={moduleId} onBack={onBack} />
}

/* ---------------- 锁机 ---------------- */

function LockScreen({ character, onExit }: { character: Character; onExit: () => void }) {
  return (
    <div className="sn-gate" style={{ background: 'linear-gradient(180deg,#0a0a0a,#1a1a1a)', position: 'absolute', inset: 0 }}>
      <Avatar imageId={character.avatarId} name={character.name} size={72} />
      <div className="sn-lock__msg">{lockMessage(character)}</div>
      <div className="sn-t2" style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
        安全感已归零，{character.name} 发现了你在翻手机。
        <br />这个手机进入 24 小时冷却。
      </div>
      <button className="sn-row" style={{ justifyContent: 'center' }} onClick={onExit}>
        返回桌面
      </button>
    </div>
  )
}

/* ---------------- 被抓弹层 ---------------- */

function CaughtOverlay({ character, onClose }: { character: Character; onClose: () => void }) {
  return (
    <div className="sn-overlay" onClick={onClose}>
      <div className="sn-modal sn-lock" onClick={(e) => e.stopPropagation()} style={{ display: 'flex' }}>
        <Avatar imageId={character.avatarId} name={character.name} size={56} />
        <div className="sn-t1" style={{ fontWeight: 700 }}>被发现了</div>
        <div className="sn-lock__msg" style={{ fontSize: 14 }}>{caughtMessage(character)}</div>
        <div className="sn-t2" style={{ fontSize: 12, lineHeight: 1.7 }}>
          {character.name} 察觉到你在翻 TA 的手机，去「聊天」看看 TA 说了什么。
        </div>
        <button className="sn-row" style={{ justifyContent: 'center' }} onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  )
}