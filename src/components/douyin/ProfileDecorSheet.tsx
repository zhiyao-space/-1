import { useRef, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useDouyin } from '../../store/douyin'
import { useToast } from '../../store/ui'
import {
  FILTER_PRESETS,
  STICKER_PRESETS,
  TEXT_COLORS,
  THEME_PRESETS,
  filterCss,
  layerStyle,
  makeLayer,
  type DyAuthor,
  type DyLayer,
} from '../../lib/douyinEngine'
import { DyIcon, DySheet, LayerContent, useCoverSrc } from './parts'

function seeded(seed: string, mod: number, salt: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = ((h ^ seed.charCodeAt(i)) * 16777619) >>> 0
  h = (h + salt * 2654435761) >>> 0
  return h % mod
}

const clamp = (n: number) => Math.min(0.96, Math.max(0.04, n))

export default function ProfileDecorSheet({ author, onClose }: { author: DyAuthor; onClose: () => void }) {
  const profile = useDouyin((s) => s.profiles[author.key])
  const updateProfile = useDouyin((s) => s.updateProfile)
  const toast = useToast((s) => s.push)
  const src = useCoverSrc(profile?.bgImage ?? null)

  const [filter, setFilter] = useState(profile?.filter ?? 'none')
  const [theme, setTheme] = useState(profile?.theme ?? 'dark')
  const [layers, setLayers] = useState<DyLayer[]>(profile?.layers ?? [])
  const [selId, setSelId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')

  const previewRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ id: string; box: DOMRect } | null>(null)

  const hue = seeded(author.key, 360, 7)
  const sel = layers.find((l) => l.id === selId) ?? null

  const onLayerDown = (l: DyLayer, e: React.PointerEvent) => {
    e.stopPropagation()
    setSelId(l.id)
    const box = previewRef.current?.getBoundingClientRect()
    if (!box) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { id: l.id, box }
  }
  const onLayerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const x = clamp((e.clientX - d.box.left) / d.box.width)
    const y = clamp((e.clientY - d.box.top) / d.box.height)
    setLayers((ls) => ls.map((l) => (l.id === d.id ? { ...l, x, y } : l)))
  }
  const onLayerUp = () => {
    drag.current = null
  }

  const patchSel = (patch: Partial<DyLayer>) =>
    setLayers((ls) => ls.map((l) => (l.id === selId ? { ...l, ...patch } : l)))

  const addSticker = (preset: { icon: string; color: string }) => {
    const l = makeLayer('sticker', '', { icon: preset.icon, color: preset.color })
    setLayers((ls) => [...ls, l])
    setSelId(l.id)
  }
  const addText = () => {
    const t = draftText.trim()
    if (!t) return
    const l = makeLayer('text', t.slice(0, 12))
    setLayers((ls) => [...ls, l])
    setSelId(l.id)
    setDraftText('')
  }
  const removeSel = () => {
    setLayers((ls) => ls.filter((l) => l.id !== selId))
    setSelId(null)
  }

  if (!profile) return null

  const save = () => {
    updateProfile(author.key, { filter, theme, layers })
    toast('主页装扮已保存')
    onClose()
  }

  const reset = () => {
    setFilter('none')
    setTheme('dark')
    setLayers([])
    setSelId(null)
  }

  return (
    <DySheet
      title="主页装扮"
      onClose={onClose}
      footer={
        <div className="dy-sheet-foot">
          <button className="dy-btn dy-btn--ghost pressable" style={{ flex: 0, padding: '0 14px' }} onClick={reset}>
            <RotateCcw size={14} /> 重置
          </button>
          <button className="dy-btn dy-btn--primary pressable" onClick={save}>
            保存装扮
          </button>
        </div>
      }
    >
      {/* 预览（可拖拽贴纸 / 文字） */}
      <div className="dy-decor-hint">拖动贴纸或文字调整位置</div>
      <div
        className="dy-decor-preview"
        ref={previewRef}
        onClick={() => setSelId(null)}
        onPointerUp={onLayerUp}
        onPointerCancel={onLayerUp}
      >
        <div
          className="dy-decor-bg"
          style={
            src
              ? { backgroundImage: `url(${src})`, filter: filterCss(filter) }
              : {
                  background: `linear-gradient(150deg, hsl(${hue} 55% 26%), hsl(${(hue + 60) % 360} 60% 12%))`,
                  filter: filterCss(filter),
                }
          }
        />
        <div className="dy-decor-mask" />
        {layers.map((l) => (
          <span
            key={l.id}
            className={`dy-decor-layer${l.id === selId ? ' dy-decor-layer--sel' : ''}`}
            style={layerStyle(l)}
            onPointerDown={(e) => onLayerDown(l, e)}
            onPointerMove={onLayerMove}
            onPointerUp={onLayerUp}
          >
            <LayerContent layer={l} />
          </span>
        ))}
      </div>

      {/* 主题模板 */}
      <div className="dy-card-title" style={{ marginTop: 14 }}>
        主题模板
      </div>
      <div className="dy-decor-wrap">
        {THEME_PRESETS.map((t) => (
          <button
            key={t.id}
            className={`dy-chip pressable${theme === t.id ? ' dy-chip--on' : ''}`}
            onClick={() => {
              setTheme(t.id)
              setFilter(t.filter)
            }}
          >
            <span className="dy-decor-swatch" style={{ background: t.accent }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* 背景滤镜 */}
      <div className="dy-card-title" style={{ marginTop: 12 }}>
        背景滤镜
      </div>
      <div className="dy-decor-wrap">
        {FILTER_PRESETS.map((f) => (
          <button
            key={f.id}
            className={`dy-chip pressable${filter === f.id ? ' dy-chip--on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 贴纸 */}
      <div className="dy-card-title" style={{ marginTop: 12 }}>
        贴纸
      </div>
      <div className="dy-decor-stickers">
        {STICKER_PRESETS.map((s) => (
          <button key={s.id} className="dy-decor-sticker pressable" onClick={() => addSticker(s)}>
            <DyIcon name={s.icon} size={22} color={s.color} strokeWidth={2.2} />
          </button>
        ))}
      </div>

      {/* 文字 */}
      <div className="dy-card-title" style={{ marginTop: 12 }}>
        文字图层
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="dy-input"
          style={{ flex: 1 }}
          placeholder="输入要添加的文字"
          maxLength={12}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addText()
          }}
        />
        <button className="dy-btn dy-btn--ghost pressable" style={{ flex: 0, padding: '0 14px' }} onClick={addText}>
          添加
        </button>
      </div>

      {/* 选中图层控制 */}
      {sel && (
        <div className="dy-decor-ctl">
          <div className="dy-card-title" style={{ marginTop: 0 }}>
            选中：{sel.kind === 'text' ? `“${sel.content}”` : '贴纸'}
          </div>
          <div className="dy-decor-ctl-row">
            <span>大小</span>
            <input
              type="range"
              min={0.5}
              max={2.4}
              step={0.05}
              value={sel.scale}
              onChange={(e) => patchSel({ scale: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span>{sel.scale.toFixed(2)}x</span>
          </div>
          <div className="dy-decor-ctl-row">
            <span>旋转</span>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={sel.rot}
              onChange={(e) => patchSel({ rot: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span>{sel.rot}°</span>
          </div>
          <div className="dy-decor-ctl-row">
            <span>颜色</span>
            <div className="dy-decor-wrap">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`dy-decor-color pressable${sel.color === c ? ' dy-decor-color--on' : ''}`}
                  style={{ background: c }}
                  onClick={() => patchSel({ color: c })}
                />
              ))}
            </div>
          </div>
          <button className="dy-btn dy-btn--ghost pressable" style={{ marginTop: 8 }} onClick={removeSel}>
            <Trash2 size={14} /> 删除该图层
          </button>
        </div>
      )}
    </DySheet>
  )
}