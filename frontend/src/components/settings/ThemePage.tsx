import { useState } from 'react'
import { Star, RotateCcw } from 'lucide-react'
import { useSettings, colorPresets, ThemeColors } from '../../store/settings'
import { useToast } from '../../store/ui'
import { SectionCard, SliderRow, Row } from '../common'

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <div className="row-item">
      <span className="fs-body" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (/^#[0-9a-fA-F]{3,8}$/.test(draft)) onChange(draft)
          }}
          style={{ width: 90, padding: '6px 10px', fontFamily: 'var(--font-mono)' }}
        />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 42 }} />
      </div>
    </div>
  )
}

export default function ThemePage() {
  const settings = useSettings()
  const push = useToast((s) => s.push)
  const [cssDraft, setCssDraft] = useState(settings.customCss)

  return (
    <>
      <SectionCard title="官方主题卡">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {colorPresets.map((p) => {
            const applied = JSON.stringify(settings.colors) === JSON.stringify(p.colors)
            const fav = settings.favorites.includes(p.name)
            return (
              <div
                key={p.name}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  border: applied ? '1.5px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: 56,
                    background: p.colors.bgPrimary,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.colors.bgPanel, border: `1px solid ${p.colors.textSecondary}22` }} />
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.colors.accent }} />
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.colors.bgContainer, border: `1px solid ${p.colors.textSecondary}22` }} />
                </div>
                <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="fs-aux" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="pressable"
                      onClick={() => settings.toggleFavorite(p.name)}
                      style={{ color: fav ? '#f5c542' : 'var(--text-disabled)' }}
                    >
                      <Star size={13} fill={fav ? '#f5c542' : 'none'} />
                    </button>
                  </div>
                </div>
                <button
                  className="pressable btn btn-sm"
                  style={{ width: 'calc(100% - 16px)', margin: '0 8px 10px' }}
                  onClick={() => {
                    settings.applyPreset(p.name)
                    push(`已应用主题「${p.name}」`)
                  }}
                >
                  {applied ? '当前主题' : '一键应用'}
                </button>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="自定义配色微调">
        <ColorField
          label="强调色"
          value={settings.colors.accent}
          onChange={(v) => settings.setColors({ accent: v })}
        />
        <SliderRow
          label="玻璃透明度"
          value={settings.colors.glassOpacity}
          min={0}
          max={0.5}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => settings.setColors({ glassOpacity: v })}
        />
        <SliderRow
          label="壁纸暗度"
          value={settings.colors.wallpaperDark}
          min={0}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => settings.setColors({ wallpaperDark: v })}
        />
        <SliderRow
          label="玻璃模糊"
          value={settings.colors.glassBlur}
          min={0}
          max={40}
          format={(v) => `${v}px`}
          onChange={(v) => settings.setColors({ glassBlur: v })}
        />

        <div style={{ marginTop: 10, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: settings.colors.bgSecondary, padding: 14 }}>
            <div className="nav-title" style={{ color: settings.colors.textPrimary, marginBottom: 8 }}>实时预览</div>
            <div
              style={{
                background: `rgba(255,255,255,${settings.colors.glassOpacity})`,
                border: `1px solid rgba(255,255,255,${Math.min(0.3, settings.colors.glassOpacity + 0.04)})`,
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: settings.colors.textBody, fontSize: 13 }}>卡片组件示例</span>
              <span style={{ background: settings.colors.accent, color: '#000', borderRadius: 999, fontSize: 11, padding: '3px 10px' }}>按钮</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="高级 · 自定义 CSS">
        <textarea
          rows={6}
          value={cssDraft}
          onChange={(e) => setCssDraft(e.target.value)}
          placeholder={'/* 粘贴自定义 CSS，实时作用于整机 */\n.glass { border-radius: 20px; }'}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={() => {
              setCssDraft('')
              settings.setCustomCss('')
              push('已清除自定义 CSS', 'info')
            }}
          >
            清除
          </button>
          <button
            className="btn btn-accent"
            style={{ flex: 1 }}
            onClick={() => {
              settings.setCustomCss(cssDraft)
              push('自定义 CSS 已应用')
            }}
          >
            应用
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <Row
          label="恢复默认主题与字体"
          sub="清除自定义配色微调"
          right={<RotateCcw size={16} color="var(--text-secondary)" />}
          onClick={() => {
            settings.resetTheme()
            settings.setCustomCss('')
            setCssDraft('')
            push('已恢复默认', 'info')
          }}
        />
      </SectionCard>
    </>
  )
}
