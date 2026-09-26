import { useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { useDesktop, WidgetInstance, WIDGET_META, WidgetType, DesktopPage } from '../../store/desktop'
import { useToast } from '../../store/ui'
import { SectionCard, Row, EmptyState } from '../common'
import { AddWidgetSheet, WidgetEditModal } from '../WidgetEditModal'

export default function ComponentsPage() {
  const desktop = useDesktop()
  const push = useToast((s) => s.push)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WidgetInstance | null>(null)

  return (
    <>
      <SectionCard title="组件管理">
        <button className="btn btn-accent" style={{ width: '100%', marginBottom: 14 }} onClick={() => setAddOpen(true)}>
          <Plus size={15} /> 添加组件
        </button>

        {desktop.pages.map((p: DesktopPage, pi: number) => (
          <div key={p.id} style={{ marginBottom: 12 }}>
            <div className="mono fs-aux" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>
              桌面页 {pi + 1}
            </div>
            {p.widgets.length === 0 ? (
              <EmptyState icon={<Plus size={22} />} text="此页暂无组件" hint="点击上方按钮添加，或长按桌面编辑" />
            ) : (
              p.widgets.map((w) => (
                <Row
                  key={w.id}
                  label={WIDGET_META[w.type].name}
                  sub={`${w.w}×${w.h} · ${w.locked ? '已锁定' : '未锁定'}`}
                  right={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="pressable btn btn-sm"
                        onClick={() => setEditTarget(w)}
                        style={{ padding: '0 10px' }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        className="pressable btn btn-sm"
                        onClick={() => {
                          desktop.removeWidget(w.id)
                          push('组件已删除', 'info')
                        }}
                        style={{ color: '#ff8a8a', padding: '0 10px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  }
                />
              ))
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard>
        <button
          className="btn"
          style={{ width: '100%', color: '#ff8a8a' }}
          onClick={() => {
            desktop.resetLayout()
            push('布局已重置为空白', 'info')
          }}
        >
          <RotateCcw size={14} /> 一键重置布局
        </button>
      </SectionCard>

      <AddWidgetSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <WidgetEditModal widget={editTarget} onClose={() => setEditTarget(null)} />
    </>
  )
}
