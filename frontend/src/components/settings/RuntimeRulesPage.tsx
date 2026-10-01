import { useState } from 'react'
import {
  ChevronRight,
  BrainCircuit,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  Clock,
  Repeat,
} from 'lucide-react'
import {
  useRuntimeRules,
  FIREWALL_TEXT,
  type OutputPartKey,
  type CheckStrength,
} from '../../store/runtimeRules'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { Modal, SectionCard } from '../common'
import { PageShell } from './SettingsApp'
import { ChipRow } from './WorldbookPage'

export default function RuntimeRulesPage({ onBack, onOpenChain }: { onBack: () => void; onOpenChain: () => void }) {
  const chainEnabled = useRuntimeRules((s) => s.chainEnabled)
  const chainMode = useRuntimeRules((s) => s.chainMode)
  const set = useRuntimeRules((s) => s.set)

  return (
    <PageShell title="角色运行规则" onBack={onBack}>
      <SectionCard title="思维链">
        <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={onOpenChain}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={16} color="var(--accent)" />
            <div>
              <div className="fs-body" style={{ color: 'var(--text-primary)' }}>思维链设置</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>自定义回复思考指令</div>
            </div>
          </div>
          <ChevronRight size={15} color="var(--text-disabled)" />
        </button>
        <div className="row-item">
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>启用思维链</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>
              当前模式：{chainMode === 'global' ? '全局生效' : '按角色单独设置'}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={chainEnabled} onChange={(e) => set({ chainEnabled: e.target.checked })} />
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{chainEnabled ? '开' : '关'}</span>
          </label>
        </div>
      </SectionCard>

      <OutputRulesSection />
      <SelfCheckSection />
      <FirewallSection />
      <TimeSection />
      <MemorySyncSection />
      <ReplyParamsSection />
    </PageShell>
  )
}

function OutputRulesSection() {
  const outputParts = useRuntimeRules((s) => s.outputParts)
  const endMarker = useRuntimeRules((s) => s.endMarker)
  const set = useRuntimeRules((s) => s.set)
  const setOutputPart = useRuntimeRules((s) => s.setOutputPart)
  const moveOutputPart = useRuntimeRules((s) => s.moveOutputPart)

  return (
    <SectionCard title="输出规则">
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.7 }}>
        规定 AI 每轮回复的输出结构：哪些栏出现、按什么顺序。开关控制是否输出，箭头调整顺序。
      </div>
      {outputParts.map((p, i) => (
        <div key={p.key} className="row-item" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fs-body" style={{ color: p.enabled ? 'var(--text-primary)' : 'var(--text-disabled)', fontWeight: 600 }}>{p.label}</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{p.hint}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <button className="pressable" disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1, padding: 4, color: 'var(--text-tertiary)' }} onClick={() => moveOutputPart(p.key, -1)}>
              <ArrowUp size={13} />
            </button>
            <button className="pressable" disabled={i === outputParts.length - 1} style={{ opacity: i === outputParts.length - 1 ? 0.3 : 1, padding: 4, color: 'var(--text-tertiary)' }} onClick={() => moveOutputPart(p.key, 1)}>
              <ArrowDown size={13} />
            </button>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginLeft: 4 }}>
              <input type="checkbox" checked={p.enabled} onChange={(e) => setOutputPart(p.key, e.target.checked)} />
            </label>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>结尾自查标记（每轮回复末尾原样输出，留空关闭）</div>
        <input value={endMarker} onChange={(e) => set({ endMarker: e.target.value.slice(0, 40) })} placeholder="如：[自查通过]" />
      </div>
    </SectionCard>
  )
}

function SelfCheckSection() {
  const checkWorldbook = useRuntimeRules((s) => s.checkWorldbook)
  const checkPersona = useRuntimeRules((s) => s.checkPersona)
  const checkFormat = useRuntimeRules((s) => s.checkFormat)
  const selfCheckLogs = useRuntimeRules((s) => s.selfCheckLogs)
  const set = useRuntimeRules((s) => s.set)
  const clearSelfCheckLogs = useRuntimeRules((s) => s.clearSelfCheckLogs)
  const characters = useCharacters((s) => s.characters)
  const [logOpen, setLogOpen] = useState(false)

  const items: [boolean, (v: boolean) => void, string, string][] = [
    [checkWorldbook, (v) => set({ checkWorldbook: v }), '世界书一致性自检', '回复内容与世界书设定冲突时自我修正'],
    [checkPersona, (v) => set({ checkPersona: v }), '人设一致性自检', '发言偏离角色性格核心时自我修正'],
    [checkFormat, (v) => set({ checkFormat: v }), '输出格式自检', '不符合输出规则时重新组织内容'],
  ]

  return (
    <SectionCard title="自检机制">
      {items.map(([on, apply, label, hint]) => (
        <div key={label} className="row-item">
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{label}</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{hint}</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={on} onChange={(e) => apply(e.target.checked)} />
          </label>
        </div>
      ))}
      <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => setLogOpen(true)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={15} color="var(--text-secondary)" />
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>自检报告</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{selfCheckLogs.length} 条记录</div>
          </div>
        </div>
        <ChevronRight size={15} color="var(--text-disabled)" />
      </button>

      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="自检报告">
        {selfCheckLogs.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无记录。开启自检后，AI 回复前的自检发现会记录在这里。</div>
        ) : (
          <>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {selfCheckLogs.map((l, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
                    {new Date(l.time).toLocaleTimeString()} · {characters.find((c) => c.id === l.characterId)?.name ?? '未知角色'}
                  </div>
                  {l.items.map((it, j) => (
                    <div key={j} className="fs-micro" style={{ color: 'var(--text-body)', marginTop: 3 }}>· {it}</div>
                  ))}
                </div>
              ))}
            </div>
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={clearSelfCheckLogs}>
              <Trash2 size={12} /> 清空报告
            </button>
          </>
        )}
      </Modal>
    </SectionCard>
  )
}

function FirewallSection() {
  const rules = useRuntimeRules()
  const set = useRuntimeRules((s) => s.set)
  const push = useToast((s) => s.push)
  const [customOpen, setCustomOpen] = useState(false)
  const [draft, setDraft] = useState(rules.customRules)

  const walls: [keyof typeof FIREWALL_TEXT, boolean, string, string][] = [
    ['firewallNoRepeat', rules.firewallNoRepeat, 'NO-REPEAT', '拒绝车轱辘话'],
    ['firewallNoReAsk', rules.firewallNoReAsk, 'NO-RE-ASK', '已答不复问'],
    ['firewallNoContradict', rules.firewallNoContradict, 'NO-CONTRADICT', '拒绝吃书反转'],
    ['firewallAnswerPending', rules.firewallAnswerPending, 'ANSWER-PENDING', '有问必答'],
  ]

  return (
    <SectionCard title="逻辑防火墙">
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.7 }}>
        硬性逻辑约束，每轮回复都会注入并强制执行。
      </div>
      {walls.map(([key, on, tag, label]) => (
        <div key={key} className="row-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span className="mono fs-micro" style={{ color: on ? 'var(--accent)' : 'var(--text-disabled)' }}>{tag}</span>
            <div>
              <div className="fs-body" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{FIREWALL_TEXT[key].split('：')[1]}</div>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={on} onChange={(e) => set({ [key]: e.target.checked } as never)} />
          </label>
        </div>
      ))}

      <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setDraft(rules.customRules); setCustomOpen(true) }}>
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>自定义防火墙规则</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{rules.customRules ? '已配置自定义规则' : '点击编写追加的逻辑约束'}</div>
        </div>
        <ChevronRight size={15} color="var(--text-disabled)" />
      </button>

      <div style={{ marginTop: 6 }}>
        <ChipRow
          label="防幻觉强度"
          options={[
            ['low', '低：仅重要事实'],
            ['mid', '中：默认推荐'],
            ['high', '高：逐句溯源'],
          ] as [CheckStrength, string][]}
          value={rules.antiHallucination}
          onChange={(v) => set({ antiHallucination: v })}
        />
      </div>

      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="自定义防火墙规则">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 2000))} rows={6} placeholder="追加的逻辑约束，如：禁止在剧情中直接给出选项列表……" style={{ resize: 'vertical' }} />
        <button
          className="btn btn-accent"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => {
            set({ customRules: draft.trim() })
            push('自定义规则已保存')
            setCustomOpen(false)
          }}
        >
          保存
        </button>
      </Modal>
    </SectionCard>
  )
}

function TimeSection() {
  const timeAware = useRuntimeRules((s) => s.timeAware)
  const timeSyncSystem = useRuntimeRules((s) => s.timeSyncSystem)
  const customTime = useRuntimeRules((s) => s.customTime)
  const set = useRuntimeRules((s) => s.set)

  return (
    <SectionCard title="时间感知">
      <div className="row-item">
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>真实时间感知</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>把当前真实时间注入回复上下文</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={timeAware} onChange={(e) => set({ timeAware: e.target.checked })} />
        </label>
      </div>
      {timeAware && (
        <div className="row-item">
          <div>
            <div className="fs-body" style={{ color: 'var(--text-primary)' }}>系统时间同步</div>
            <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>每轮回复自动刷新时间（关闭则用下方固定时间）</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={timeSyncSystem} onChange={(e) => set({ timeSyncSystem: e.target.checked })} />
          </label>
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>
          自定义时间文本（关闭系统同步时生效，留空则不注入）
        </div>
        <input value={customTime} onChange={(e) => set({ customTime: e.target.value.slice(0, 120) })} placeholder="如：2077年10月3日 夜 暴雨" />
      </div>
    </SectionCard>
  )
}

function MemorySyncSection() {
  const summaryEveryNRounds = useRuntimeRules((s) => s.summaryEveryNRounds)
  const bigSummaryTrigger = useRuntimeRules((s) => s.bigSummaryTrigger)
  const summaries = useRuntimeRules((s) => s.summaries)
  const set = useRuntimeRules((s) => s.set)
  const removeSummary = useRuntimeRules((s) => s.removeSummary)
  const characters = useCharacters((s) => s.characters)
  const [listOpen, setListOpen] = useState(false)

  return (
    <SectionCard title="记忆同步">
      <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.7 }}>
        每隔 N 轮自动生成一次小结写入世界书记忆区；小结数量达到阈值时触发一次大总结压缩历史。
      </div>
      <div className="row-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Repeat size={14} color="var(--text-secondary)" />
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>每 N 轮小结</div>
        </div>
        <input
          value={String(summaryEveryNRounds)}
          onChange={(e) => set({ summaryEveryNRounds: Math.max(1, Number(e.target.value.replace(/[^0-9]/g, '') || 1)) })}
          style={{ width: 70, textAlign: 'center' }}
        />
      </div>
      <div className="row-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="var(--text-secondary)" />
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>大总结阈值（小结数）</div>
        </div>
        <input
          value={String(bigSummaryTrigger)}
          onChange={(e) => set({ bigSummaryTrigger: Math.max(2, Number(e.target.value.replace(/[^0-9]/g, '') || 2)) })}
          style={{ width: 70, textAlign: 'center' }}
        />
      </div>
      <button className="row-item pressable" style={{ width: '100%', textAlign: 'left' }} onClick={() => setListOpen(true)}>
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>总结记录</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{summaries.length} 条（写入世界书「记忆库」）</div>
        </div>
        <ChevronRight size={15} color="var(--text-disabled)" />
      </button>

      <Modal open={listOpen} onClose={() => setListOpen(false)} title="总结记录">
        {summaries.length === 0 ? (
          <div className="fs-body" style={{ color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无总结。聊天达到轮数后会自动生成并写入世界书。</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {summaries.map((s) => (
              <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="fs-micro" style={{ padding: '1px 8px', borderRadius: 999, background: s.kind === 'big' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                    {s.kind === 'big' ? '大总结' : '小结'}
                  </span>
                  <span className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
                    {characters.find((c) => c.id === s.characterId)?.name ?? '未知'} · {new Date(s.time).toLocaleString()}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button className="pressable" onClick={() => removeSummary(s.id)} style={{ color: 'var(--text-disabled)', padding: 3 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="fs-micro" style={{ color: 'var(--text-body)', marginTop: 4, lineHeight: 1.6 }}>{s.content}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </SectionCard>
  )
}

function ReplyParamsSection() {
  const maxReplyLength = useRuntimeRules((s) => s.maxReplyLength)
  const temperature = useRuntimeRules((s) => s.temperature)
  const contextCountOverride = useRuntimeRules((s) => s.contextCountOverride)
  const set = useRuntimeRules((s) => s.set)

  return (
    <SectionCard title="回复参数">
      <div className="row-item">
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>回复长度上限</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>0 为不限</div>
        </div>
        <input
          value={String(maxReplyLength)}
          onChange={(e) => set({ maxReplyLength: Number(e.target.value.replace(/[^0-9]/g, '') || 0) })}
          style={{ width: 80, textAlign: 'center' }}
        />
      </div>
      <div className="row-item">
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>温度覆盖</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{temperature === null ? '跟随 API 预设' : `固定 ${temperature.toFixed(2)}`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature ?? 0.8}
            onChange={(e) => set({ temperature: Number(e.target.value) })}
            style={{ width: 110 }}
          />
          <button className="btn btn-sm pressable" onClick={() => set({ temperature: temperature === null ? 0.8 : null })}>
            {temperature === null ? '启用' : '跟随预设'}
          </button>
        </div>
      </div>
      <div className="row-item">
        <div>
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>上下文条数覆盖</div>
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>0 为跟随全局聊天参数</div>
        </div>
        <input
          value={String(contextCountOverride)}
          onChange={(e) => set({ contextCountOverride: Number(e.target.value.replace(/[^0-9]/g, '') || 0) })}
          style={{ width: 80, textAlign: 'center' }}
        />
      </div>
    </SectionCard>
  )
}
