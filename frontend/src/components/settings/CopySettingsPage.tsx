import { ChevronRight, RotateCcw } from 'lucide-react'
import { SectionCard } from '../common'
import { useCopy } from '../../store/copy'
import { useToast } from '../../store/ui'

const APP_LABEL_KEYS: { id: string; label: string }[] = [
  { id: 'chat', label: '聊天' },
  { id: 'forum', label: '论坛' },
  { id: 'music', label: '音乐' },
  { id: 'snoop', label: '查手机' },
  { id: 'settings', label: '设置' },
  { id: 'sms', label: '短信' },
  { id: 'phone', label: '电话' },
  { id: 'xiaogui', label: '小鬼' },
]

function Field({
  label,
  value,
  placeholder,
  onChange,
  multiline,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="fs-body" style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

export default function CopySettingsPage({ onBack }: { onBack: () => void }) {
  const texts = useCopy((s) => s.texts)
  const setText = useCopy((s) => s.setText)
  const setAppLabel = useCopy((s) => s.setAppLabel)
  const reset = useCopy((s) => s.reset)
  const push = useToast((s) => s.push)

  return (
    <>
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>
          自定义文案
        </span>
        <button
          className="btn btn-sm pressable"
          onClick={() => {
            reset()
            push('已恢复默认文案', 'info')
          }}
        >
          <RotateCcw size={13} /> 重置
        </button>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        <SectionCard title="桌面文案">
          <Field label="桌面签名" value={texts.signature} placeholder="今天也不想见人。" onChange={(v) => setText('signature', v)} />
          <Field label="卡片标题" value={texts.monologueTitle} placeholder="今日独白" onChange={(v) => setText('monologueTitle', v)} />
          <Field
            label="卡片内容（留空则从世界书随机抽取）"
            value={texts.monologueContent}
            placeholder="留空则自动生成独白"
            multiline
            onChange={(v) => setText('monologueContent', v)}
          />
          <Field label="互动标题" value={texts.recentTitle} placeholder="最近互动" onChange={(v) => setText('recentTitle', v)} />
        </SectionCard>

        <SectionCard title="空状态文案">
          <Field label="独白卡空状态" value={texts.emptyMonologue} placeholder="……" onChange={(v) => setText('emptyMonologue', v)} />
          <Field
            label="最近互动空状态"
            value={texts.emptyRecent}
            placeholder="还没有互动记录"
            onChange={(v) => setText('emptyRecent', v)}
          />
        </SectionCard>

        <SectionCard title="图标标签">
          {APP_LABEL_KEYS.map((k) => (
            <Field
              key={k.id}
              label={k.label}
              value={texts.appLabels[k.id] ?? ''}
              placeholder={k.label}
              onChange={(v) => setAppLabel(k.id, v)}
            />
          ))}
        </SectionCard>

        <div className="fs-micro" style={{ color: 'var(--text-disabled)', textAlign: 'center' }}>
          所有自定义文案保存在本机，刷新不丢失
        </div>
      </div>
    </>
  )
}