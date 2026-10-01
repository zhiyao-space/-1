import { useState } from 'react'
import { Save, RotateCcw, Trash2 } from 'lucide-react'
import { useRuntimeRules, BUILTIN_CHAIN_TEMPLATES, type ChainInjectPos } from '../../store/runtimeRules'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { Modal, SectionCard, EmptyState } from '../common'
import { PageShell } from './SettingsApp'
import { ChipRow } from './WorldbookPage'

export default function ChainSettingsPage({ onBack }: { onBack: () => void }) {
  const chainEnabled = useRuntimeRules((s) => s.chainEnabled)
  const set = useRuntimeRules((s) => s.set)
  const [tab, setTab] = useState<'global' | 'role'>('global')

  return (
    <PageShell title="思维链设置" onBack={onBack}>
      <SectionCard>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
          自定义回复思考指令：在每次回复前强制 AI 执行一段思考流程，用于自检世界书、格式、人设一致性与行为准则。开启后每轮回复都会额外注入这段指令。
        </div>
      </SectionCard>

      <SectionCard title="总开关">
        <div className="row-item">
          <div className="fs-body" style={{ color: 'var(--text-primary)' }}>启用思维链</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={chainEnabled} onChange={(e) => set({ chainEnabled: e.target.checked })} />
            <span className="fs-micro" style={{ color: 'var(--text-tertiary)' }}>{chainEnabled ? '已开启' : '已关闭'}</span>
          </label>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button
          className="btn btn-sm pressable"
          style={{ flex: 1, background: tab === 'global' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
          onClick={() => setTab('global')}
        >
          全局生效
        </button>
        <button
          className="btn btn-sm pressable"
          style={{ flex: 1, background: tab === 'role' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)' }}
          onClick={() => setTab('role')}
        >
          按角色单独设置
        </button>
      </div>

      {tab === 'global' ? <GlobalChainTab /> : <RoleChainTab />}
    </PageShell>
  )
}

function GlobalChainTab() {
  const customChain = useRuntimeRules((s) => s.customChain)
  const chainMode = useRuntimeRules((s) => s.chainMode)
  const chainInjectPos = useRuntimeRules((s) => s.chainInjectPos)
  const chainTemplates = useRuntimeRules((s) => s.chainTemplates)
  const set = useRuntimeRules((s) => s.set)
  const resetChain = useRuntimeRules((s) => s.resetChain)
  const push = useToast((s) => s.push)
  const [draft, setDraft] = useState(customChain)
  const [tplOpen, setTplOpen] = useState(false)

  const save = () => {
    set({ customChain: draft, chainMode: 'global' })
    push('全局思维链已保存（语义键 customChain）')
  }

  return (
    <>
      <SectionCard>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          placeholder="输入全局思维链指令，所有角色的回复都会遵循……"
          rows={8}
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-accent pressable" style={{ flex: 1 }} onClick={save}>
            <Save size={14} /> 保存
          </button>
          <button
            className="btn pressable"
            onClick={() => {
              resetChain()
              setDraft('')
              push('已恢复默认（清除全局与所有角色思维链）')
            }}
          >
            <RotateCcw size={14} /> 恢复默认
          </button>
        </div>
        <button className="btn btn-sm pressable" style={{ width: '100%', marginTop: 8 }} onClick={() => setTplOpen(true)}>
          从模板填入（{chainTemplates.length} 个预设）
        </button>
      </SectionCard>

      <SectionCard title="注入位置">
        <ChipRow
          label="思维链指令注入到消息的哪个环节"
          options={[
            ['preset', '系统提示最前'],
            ['system', '系统提示中段'],
            ['perTurn', '每轮消息末尾'],
          ] as [ChainInjectPos, string][]}
          value={chainInjectPos}
          onChange={(v) => set({ chainInjectPos: v })}
        />
        <div className="fs-micro" style={{ color: 'var(--text-disabled)', marginTop: 8 }}>
          当前模式：全局生效（所有角色共用同一份思维链）。
        </div>
      </SectionCard>

      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="思维链模板预设">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BUILTIN_CHAIN_TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="pressable"
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)' }}
              onClick={() => {
                setDraft(t.content)
                setTplOpen(false)
              }}
            >
              <div className="fs-body" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.name}</div>
              <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.6 }}>{t.content.slice(0, 60)}…</div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}

function RoleChainTab() {
  const characters = useCharacters((s) => s.characters)
  const roleChains = useRuntimeRules((s) => s.roleChains)
  const chainMode = useRuntimeRules((s) => s.chainMode)
  const saveRoleChain = useRuntimeRules((s) => s.saveRoleChain)
  const clearRoleChain = useRuntimeRules((s) => s.clearRoleChain)
  const set = useRuntimeRules((s) => s.set)
  const push = useToast((s) => s.push)
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id ?? '')
  const [draft, setDraft] = useState<string>(roleChains[selectedId] ?? '')
  const [confirmClear, setConfirmClear] = useState(false)

  const select = (id: string) => {
    setSelectedId(id)
    setDraft(roleChains[id] ?? '')
  }

  if (characters.length === 0) {
    return (
      <EmptyState icon={<Save size={30} />} text="还没有角色" hint="先在通讯录创建角色，再为角色单独配置思维链" />
    )
  }

  const hasChain = !!roleChains[selectedId]

  return (
    <>
      <SectionCard title="选择角色">
        <select value={selectedId} onChange={(e) => select(e.target.value)} style={{ width: '100%' }}>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{roleChains[c.id] ? '（已有独立思维链）' : ''}
            </option>
          ))}
        </select>
        <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.7 }}>
          {hasChain
            ? '该角色启用独立思维链，保存后立即生效，优先于全局思维链。'
            : '该角色当前跟随全局思维链。填写并保存后，将切换为按角色单独设置。'}
        </div>
      </SectionCard>

      <SectionCard>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          placeholder={`为「${characters.find((c) => c.id === selectedId)?.name ?? ''}」定制回复思考指令……`}
          rows={8}
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            className="btn btn-accent pressable"
            style={{ flex: 1 }}
            onClick={() => {
              if (!draft.trim()) {
                push('内容为空；要清除请用「清除该角色」', 'error')
                return
              }
              saveRoleChain(selectedId, draft)
              set({ chainMode: 'role' })
              push('角色思维链已保存（语义键 roleChains）')
            }}
          >
            <Save size={14} /> 保存
          </button>
          <button
            className="btn pressable"
            disabled={!hasChain}
            style={{ opacity: hasChain ? 1 : 0.4 }}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={14} /> 清除该角色
          </button>
        </div>
      </SectionCard>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="清除角色思维链">
        <div className="fs-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          清除后该角色恢复跟随全局思维链。确定清除？
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn pressable" style={{ flex: 1 }} onClick={() => setConfirmClear(false)}>取消</button>
          <button
            className="btn btn-accent pressable"
            style={{ flex: 1 }}
            onClick={() => {
              clearRoleChain(selectedId)
              setDraft('')
              if (Object.keys(useRuntimeRules.getState().roleChains).length === 0) set({ chainMode: 'global' })
              push('已清除，恢复跟随全局')
              setConfirmClear(false)
            }}
          >
            确定清除
          </button>
        </div>
      </Modal>
    </>
  )
}
