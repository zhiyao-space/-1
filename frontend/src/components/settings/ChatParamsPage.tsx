import { ImagePlus, Trash2, Wallet, GitBranch, Palette, BellRing } from 'lucide-react'
import { useChatParams, todayStr } from '../../store/chatParams'
import { useStickers } from '../../store/stickers'
import { useToast } from '../../store/ui'
import { useWallet, useBranches, useChatAppearance } from '../../store/interact'
import { useChats } from '../../store/chats'
import { useCharacters } from '../../store/characters'
import { putBlob } from '../../lib/idb'
import { compressImage } from '../../lib/image'
import { useBlobURL } from '../WallpaperLayer'
import { SectionCard, Toggle, Row, SliderRow } from '../common'

export default function ChatParamsPage() {
  const params = useChatParams()
  const stickers = useStickers((s) => s.stickers)
  const push = useToast((s) => s.push)

  const addStickers = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      let count = 0
      for (const f of files) {
        const compressed = await compressImage(f, 512)
        const id = await putBlob(compressed)
        useStickers.getState().addSticker(id, '')
        count++
      }
      push(`已添加 ${count} 张表情包`)
    }
    input.click()
  }

  const sentToday = params.date === todayStr() ? params.count : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionCard>
        <Row label="自动响应" sub="关闭后需手动点击“生成回复”" right={<Toggle checked={params.autoReply} onChange={(v) => params.update({ autoReply: v })} />} />
        <Row label="流式输出" sub="逐字显示角色回复" right={<Toggle checked={params.streamOutput} onChange={(v) => params.update({ streamOutput: v })} />} />
        <Row label="回车发送" sub="关闭后用按钮发送" right={<Toggle checked={params.enterToSend} onChange={(v) => params.update({ enterToSend: v })} />} />
        <Row label="允许撤回" sub="长按 / 双击消息可撤回" right={<Toggle checked={params.allowRecall} onChange={(v) => params.update({ allowRecall: v })} />} />
        <Row label="允许 OOC" sub="向角色发送导演指令" right={<Toggle checked={params.allowOoc} onChange={(v) => params.update({ allowOoc: v })} />} />
      </SectionCard>

      <SectionCard>
        <SliderRow
          label="消息分割阈值"
          min={0}
          max={400}
          step={10}
          value={params.splitThreshold}
          format={(v) => (v === 0 ? '关闭' : `${v} 字`)}
          onChange={(v) => params.update({ splitThreshold: v })}
        />
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: -8 }}>回复超过该字数自动拆成多条气泡（0 为关闭）</div>
        <SliderRow
          label="打字延迟基准"
          min={0}
          max={100}
          step={5}
          value={params.typingSpeed}
          format={(v) => `${v}`}
          onChange={(v) => params.update({ typingSpeed: v })}
        />
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: -8 }}>数值越大，角色回复前等待越久</div>
      </SectionCard>

      <ProactiveSection sentToday={sentToday} />
      <WalletSection />
      <BranchSection />
      <AppearanceSection />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="fs-body" style={{ color: 'var(--text-primary)', flex: 1 }}>表情包管理</span>
          <button className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px' }} onClick={addStickers}>
            <ImagePlus size={14} /> 添加
          </button>
        </div>
        {stickers.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
            还没有表情包，添加后可在聊天中发送
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {stickers.map((st) => (
              <div key={st.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <StickerThumb imageId={st.imageId} />
                <button
                  className="pressable"
                  onClick={() => {
                    useStickers.getState().removeSticker(st.id)
                    push('表情已删除')
                  }}
                  style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8a8a' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProactiveSection({ sentToday }: { sentToday: number }) {
  const params = useChatParams()
  return (
    <SectionCard>
      <SectionTitle icon={<BellRing size={14} />} title="主动消息" />
      <Row
        label="角色主动发消息"
        sub={`今日已主动发过 ${sentToday} 条`}
        right={<Toggle checked={params.proactive} onChange={(v) => params.update({ proactive: v })} />}
      />
      <SliderRow
        label="每日上限"
        min={1}
        max={20}
        step={1}
        value={params.proactivePerDay}
        format={(v) => `${v} 条`}
        onChange={(v) => params.update({ proactivePerDay: v })}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <span className="fs-body" style={{ color: 'var(--text-primary)', flex: 1 }}>免打扰时段</span>
        <input
          type="time"
          value={params.quietStart}
          onChange={(e) => params.update({ quietStart: e.target.value })}
          style={{ width: 110 }}
        />
        <span className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>至</span>
        <input
          type="time"
          value={params.quietEnd}
          onChange={(e) => params.update({ quietEnd: e.target.value })}
          style={{ width: 110 }}
        />
      </div>
      <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: -6 }}>
        时段内角色不会主动发消息；仅对已产生对话的角色生效，消息会先写入会话并弹出通知横幅
      </div>
    </SectionCard>
  )
}

function WalletSection() {
  const balance = useWallet((s) => s.balance)
  const transactions = useWallet((s) => s.transactions)
  const topup = useWallet((s) => s.topup)
  const push = useToast((s) => s.push)

  return (
    <SectionCard>
      <SectionTitle icon={<Wallet size={14} />} title="钱包" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0 10px' }}>
        <span className="fs-hero mono" style={{ color: 'var(--text-primary)' }}>{balance.toLocaleString()}</span>
        <span className="fs-aux" style={{ color: 'var(--text-tertiary)' }}>余额</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {[100, 500, 1000].map((n) => (
          <button
            key={n}
            className="btn btn-sm"
            style={{ flex: 1 }}
            onClick={() => {
              topup(n)
              push(`已充值 ${n}`)
            }}
          >
            +{n}
          </button>
        ))}
      </div>
      {transactions.length === 0 ? (
        <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '14px 0' }}>
          暂无交易记录。转账、发红包、收红包都会记录在这里
        </div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {[...transactions].reverse().slice(0, 30).map((t) => {
            const income = t.kind === 'transfer-in' || t.kind === 'redpacket-in' || t.kind === 'topup'
            const label = TX_LABEL[t.kind]
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="fs-aux" style={{ display: 'block', color: 'var(--text-primary)' }}>
                    {label}{t.withName ? ` · ${t.withName}` : ''}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                    {t.note} · {fmtTime(t.time)}
                  </span>
                </span>
                <span className="fs-body mono" style={{ color: income ? '#7ee2a8' : '#ff8a8a' }}>
                  {income ? '+' : '-'}{t.amount}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

const TX_LABEL: Record<string, string> = {
  'transfer-out': '转账支出',
  'transfer-in': '转账收入',
  'redpacket-out': '发出红包',
  'redpacket-in': '领取红包',
  topup: '充值',
}

function fmtTime(t: number): string {
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function BranchSection() {
  const branches = useBranches((s) => s.branches)
  const activeBranchId = useBranches((s) => s.activeBranchId)
  const setActive = useBranches((s) => s.setActive)
  const removeBranch = useBranches((s) => s.removeBranch)
  const sessions = useChats((s) => s.sessions)
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)

  const sessionName = (sessionId: string) => {
    const s = sessions.find((x) => x.id === sessionId)
    const c = s ? characters.find((x) => x.id === s.characterId) : null
    return c?.name ?? '已删除角色'
  }

  return (
    <SectionCard>
      <SectionTitle icon={<GitBranch size={14} />} title="分支管理" />
      {branches.length === 0 ? (
        <div className="fs-body" style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '14px 0' }}>
          暂无分支。在聊天中长按任意消息即可“从此处分叉”，不影响主线剧情
        </div>
      ) : (
        branches.map((b) => {
          const active = activeBranchId[b.sessionId] === b.id
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 2px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="fs-body" style={{ display: 'block', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}
                </span>
                <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
                  {sessionName(b.sessionId)} 的分支 · {b.messages.length} 条消息 · {fmtTime(b.createdAt)}
                  {active ? ' · 使用中' : ''}
                </span>
              </span>
              {!active && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setActive(b.sessionId, b.id)
                    push(`已切换到分支「${b.name}」`)
                  }}
                >
                  切换
                </button>
              )}
              <button
                className="pressable"
                style={{ color: '#ff8a8a', padding: 6 }}
                onClick={() => {
                  removeBranch(b.id)
                  push('分支已删除')
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })
      )}
    </SectionCard>
  )
}

const BUBBLE_STYLES: { value: ReturnType<typeof useChatAppearance.getState>['bubbleStyle']; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'ink-white', label: '白纸黑字' },
  { value: 'ink-black', label: '黑纸白字' },
  { value: 'mono', label: '灰阶' },
  { value: 'minimal', label: '极简' },
  { value: 'pill', label: '胶囊' },
  { value: 'glass', label: '玻璃' },
  { value: 'flat', label: '扁平' },
  { value: 'custom', label: '自定义' },
]

const BUBBLE_PREVIEWS: Record<string, React.CSSProperties> = {
  default: {},
  'ink-white': { background: '#f5f5f5', color: '#111111' },
  'ink-black': { background: '#0d0d0d', color: '#f2f2f2', border: '1px solid #3a3a3a' },
  mono: {},
  minimal: { background: 'transparent', border: 'none' },
  pill: { borderRadius: 999 },
  glass: { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' },
  flat: { background: '#1A1A1A' },
}

function BubblePreview({ style, custom, side }: { style: string; custom: ReturnType<typeof useChatAppearance.getState>['customBubble']; side: 'me' | 'other' }) {
  const monoOther = { background: '#2e2e2e', color: '#e8e8e8' }
  const monoMe = { background: '#e8e8e8', color: '#1a1a1a' }
  const extra: React.CSSProperties =
    style === 'custom'
      ? {
          background: side === 'me' ? custom.meBg : custom.otherBg,
          color: side === 'me' ? custom.meText : custom.otherText,
          borderRadius: custom.radius,
          border: custom.bordered ? '1px solid rgba(128,128,128,0.45)' : 'none',
        }
      : style === 'mono'
        ? side === 'me' ? monoMe : monoOther
        : BUBBLE_PREVIEWS[style] ?? {}
  return (
    <div
      style={{
        padding: '5px 12px',
        borderRadius: 12,
        maxWidth: 150,
        fontSize: 12,
        lineHeight: 1.5,
        ...extra,
      }}
    >
      {side === 'me' ? '我的气泡预览' : '对方气泡预览'}
    </div>
  )
}

function BubbleCustomEditor({ app }: { app: ReturnType<typeof useChatAppearance.getState> }) {
  const c = app.customBubble
  const rows: ['meBg' | 'meText' | 'otherBg' | 'otherText', string][] = [
    ['meBg', '我的气泡 · 背景'],
    ['meText', '我的气泡 · 文字'],
    ['otherBg', '对方气泡 · 背景'],
    ['otherText', '对方气泡 · 文字'],
  ]
  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <BubblePreview style="custom" custom={c} side="other" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <BubblePreview style="custom" custom={c} side="me" />
        <div style={{ flex: 1 }} />
      </div>
      {rows.map(([key, label]) => (
        <div key={key} className="row-item">
          <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{label}</span>
          <input
            type="color"
            value={c[key]}
            onChange={(e) => app.update({ customBubble: { ...c, [key]: e.target.value } })}
            style={{ width: 42, height: 28, padding: 0, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, background: 'transparent' }}
          />
        </div>
      ))}
      <SliderRow
        label="气泡圆角"
        min={0}
        max={28}
        step={1}
        value={c.radius}
        format={(v) => `${Math.round(v)}px`}
        onChange={(v) => app.update({ customBubble: { ...c, radius: Math.round(v) } })}
      />
      <Row label="描边" right={<Toggle checked={c.bordered} onChange={(v) => app.update({ customBubble: { ...c, bordered: v } })} />} />
    </div>
  )
}

function AppearanceSection() {
  const app = useChatAppearance()
  const push = useToast((s) => s.push)
  const badgeUrl = useBlobURL(app.badgeImageId)

  const uploadBadge = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const compressed = await compressImage(f, 256)
      const id = await putBlob(compressed)
      app.update({ badgeImageId: id })
      push('头像挂件已设置')
    }
    input.click()
  }

  return (
    <SectionCard>
      <SectionTitle icon={<Palette size={14} />} title="聊天外观" />
      <div style={{ padding: '8px 0' }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>气泡样式（内置黑白系方案）</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {BUBBLE_STYLES.map((s) => (
            <button
              key={s.value}
              className="btn btn-sm pressable"
              onClick={() => app.update({ bubbleStyle: s.value })}
              style={{
                padding: '0 12px',
                background: app.bubbleStyle === s.value ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                color: app.bubbleStyle === s.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <BubblePreview style={app.bubbleStyle} custom={app.customBubble} side="other" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <BubblePreview style={app.bubbleStyle} custom={app.customBubble} side="me" />
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
      {app.bubbleStyle === 'custom' && <BubbleCustomEditor app={app} />}
      <Row
        label="头像形状"
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {(['circle', 'rounded'] as const).map((v) => (
              <button
                key={v}
                className="btn btn-sm pressable"
                onClick={() => app.update({ avatarShape: v })}
                style={{
                  padding: '0 12px',
                  background: app.avatarShape === v ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                  color: app.avatarShape === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {v === 'circle' ? '圆形' : '圆角'}
              </button>
            ))}
          </div>
        }
      />
      <Row
        label="头像大小"
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {([28, 32, 40] as const).map((v) => (
              <button
                key={v}
                className="btn btn-sm pressable"
                onClick={() => app.update({ avatarSize: v })}
                style={{
                  padding: '0 12px',
                  background: app.avatarSize === v ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                  color: app.avatarSize === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />
      <SliderRow
        label="聊天字号"
        min={0.85}
        max={1.25}
        step={0.05}
        value={app.fontSize}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => app.update({ fontSize: v })}
      />
      <Row
        label="时间戳"
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {(['outside', 'hidden'] as const).map((v) => (
              <button
                key={v}
                className="btn btn-sm pressable"
                onClick={() => app.update({ timestampStyle: v })}
                style={{
                  padding: '0 12px',
                  background: app.timestampStyle === v ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)',
                  color: app.timestampStyle === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {v === 'outside' ? '显示' : '隐藏'}
              </button>
            ))}
          </div>
        }
      />
      <Row
        label="简化模式"
        sub="隐藏气泡装饰，纯文本显示"
        right={<Toggle checked={app.simpleMode} onChange={(v) => app.update({ simpleMode: v })} />}
      />
      <Row
        label="头像挂件"
        sub={app.badgeImageId ? '已设置挂件，显示在头像右下角' : '上传小图作为头像挂件'}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {badgeUrl && (
              <img src={badgeUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
            )}
            {app.badgeImageId && (
              <button className="pressable" style={{ color: '#ff8a8a', padding: 4 }} onClick={() => app.update({ badgeImageId: null })}>
                <Trash2 size={14} />
              </button>
            )}
            <button className="btn btn-sm" onClick={uploadBadge} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ImagePlus size={13} /> 上传
            </button>
          </div>
        }
      />
    </SectionCard>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 4px', color: 'var(--text-secondary)' }}>
      {icon}
      <span className="fs-body" style={{ fontWeight: 600 }}>{title}</span>
    </div>
  )
}

function StickerThumb({ imageId }: { imageId: string }) {
  const url = useBlobURL(imageId)
  if (!url) return null
  return <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}
