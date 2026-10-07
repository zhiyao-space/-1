import { useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { useSettings, CN_FONT_STACKS, EN_FONT_STACKS } from '../../store/settings'
import { useToast } from '../../store/ui'
import { SectionCard, SliderRow } from '../common'
import { putBlob, getBlob } from '../../lib/idb'

const CN_OPTIONS = [
  { key: 'puhui', name: '阿里巴巴普惠体（项目默认）' },
  { key: 'wenquanyi', name: '文泉驿' },
  { key: 'custom', name: '自定义字体文件' },
] as const

const EN_OPTIONS = [
  { key: 'inter', name: 'Inter' },
  { key: 'jetbrains', name: 'JetBrains Mono' },
  { key: 'dela', name: 'Dela Gothic One' },
  { key: 'custom', name: '自定义字体文件' },
] as const

export default function FontPage() {
  const settings = useSettings()
  const push = useToast((s) => s.push)
  const [testText, setTestText] = useState('')

  const uploadFont = async (lang: 'cn' | 'en') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ttf,.otf,font/ttf,font/otf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const buf = await file.arrayBuffer()
        const family = lang === 'cn' ? 'KSCustomCN' : 'KSCustomEN'
        const face = new FontFace(family, buf)
        await face.load()
        document.fonts.add(face)
        const blob = new Blob([buf], { type: file.type || 'font/otf' })
        const id = await putBlob(blob)
        settings.setCustomFont(lang, id)
        if (lang === 'cn') settings.setFonts({ cnFont: 'custom' })
        else settings.setFonts({ enFont: 'custom' })
        push(`字体「${file.name.replace(/\.[^.]+$/, '')}」已应用`)
      } catch {
        push('字体文件解析失败', 'error')
      }
    }
    input.click()
  }

  const clearCustomFont = (lang: 'cn' | 'en') => {
    settings.setCustomFont(lang, null)
    if (lang === 'cn') settings.setFonts({ cnFont: 'puhui' })
    else settings.setFonts({ enFont: 'inter' })
    push('已清除自定义字体', 'info')
  }

  const previewText = testText || '在此输入测试文字，预览当前字体效果'

  return (
    <>
      <SectionCard title="中文字体">
        {CN_OPTIONS.map((o) => (
          <button
            key={o.key}
            className="row-item pressable"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => {
              if (o.key === 'custom') {
                uploadFont('cn')
              } else {
                settings.setFonts({ cnFont: o.key })
                push(`中文字体已切换为「${o.name}」`)
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '1.5px solid var(--text-secondary)',
                  background: settings.fonts.cnFont === o.key ? 'var(--accent)' : 'transparent',
                  display: 'inline-block',
                }}
              />
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{o.name}</span>
              <span className="fs-micro" style={{ color: 'var(--text-tertiary)', fontFamily: CN_FONT_STACKS[o.key] }}>
                空蚀纪 Aa
              </span>
            </span>
            {o.key === 'custom' && settings.customFontCnId && (
              <button
                className="pressable"
                style={{ color: '#ff8a8a' }}
                onClick={(e) => {
                  e.stopPropagation()
                  clearCustomFont('cn')
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </button>
        ))}
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => uploadFont('cn')}>
          <Upload size={13} /> 导入 .ttf / .otf
        </button>
      </SectionCard>

      <SectionCard title="英文字体">
        {EN_OPTIONS.map((o) => (
          <button
            key={o.key}
            className="row-item pressable"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => {
              if (o.key === 'custom') {
                uploadFont('en')
              } else {
                settings.setFonts({ enFont: o.key })
                push(`英文字体已切换为「${o.name}」`)
              }
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '1.5px solid var(--text-secondary)',
                  background: settings.fonts.enFont === o.key ? 'var(--accent)' : 'transparent',
                  display: 'inline-block',
                }}
              />
              <span className="fs-body" style={{ color: 'var(--text-primary)', fontFamily: EN_FONT_STACKS[o.key] }}>
                {o.name}
              </span>
            </span>
            {o.key === 'custom' && settings.customFontEnId && (
              <button
                className="pressable"
                style={{ color: '#ff8a8a' }}
                onClick={(e) => {
                  e.stopPropagation()
                  clearCustomFont('en')
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </button>
        ))}
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => uploadFont('en')}>
          <Upload size={13} /> 导入 .ttf / .otf
        </button>
      </SectionCard>

      <SectionCard title="字号与排版">
        <SliderRow
          label="全局字号缩放"
          value={settings.fonts.scale}
          min={0.8}
          max={1.2}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(v) => settings.setFonts({ scale: v })}
        />
        <SliderRow
          label="中文字间距"
          value={settings.fonts.lsCn}
          min={0}
          max={0.08}
          step={0.005}
          format={(v) => `${v.toFixed(3)}em`}
          onChange={(v) => settings.setFonts({ lsCn: v })}
        />
        <SliderRow
          label="英文字间距"
          value={settings.fonts.lsEn}
          min={-0.02}
          max={0.12}
          step={0.005}
          format={(v) => `${v.toFixed(3)}em`}
          onChange={(v) => settings.setFonts({ lsEn: v })}
        />
        <SliderRow
          label="标题字重"
          value={settings.fonts.titleWeight}
          min={400}
          max={700}
          step={100}
          onChange={(v) => settings.setFonts({ titleWeight: v })}
        />
        <SliderRow
          label="正文字重"
          value={settings.fonts.bodyWeight}
          min={300}
          max={600}
          step={100}
          onChange={(v) => settings.setFonts({ bodyWeight: v })}
        />
      </SectionCard>

      <SectionCard title="字体预览">
        <input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="输入测试文字查看效果"
        />
        <div style={{ marginTop: 12 }}>
          <div className="app-name" style={{ fontSize: 26 }}>{settings.phoneName}</div>
          <div className="nav-title fs-h2" style={{ color: 'var(--text-primary)', marginTop: 8 }}>
            模块标题导航栏样式
          </div>
          <div className="message-text" style={{ color: 'var(--text-body)', marginTop: 6 }}>
            {previewText}
          </div>
          <div className="timestamp" style={{ marginTop: 6 }}>2026-09-26 14:30:00 MON</div>
        </div>
      </SectionCard>
    </>
  )
}
