import { useEffect, useRef, useState } from 'react'
import { ChevronRight, ImagePlus, RotateCcw, Check } from 'lucide-react'
import { SectionCard, SliderRow, Toggle } from '../common'
import Avatar from '../chat/Avatar'
import { useBlobURL } from '../WallpaperLayer'
import { useSettings } from '../../store/settings'
import { useCharacters } from '../../store/characters'
import { useToast } from '../../store/ui'
import { compressImage } from '../../lib/image'
import { putBlob } from '../../lib/idb'
import {
  useDesktop,
  BG_PRESETS,
  WALLPAPER_PRESETS,
  DEFAULT_STYLES,
  DEFAULT_VISIBILITY,
  darken,
  resolveGradient,
  wallpaperCss,
  type ModuleStyles,
  type ModuleVisibility,
  type ShadowLevel,
} from '../../store/desktopModules'

const SHADOWS: { id: ShadowLevel; label: string }[] = [
  { id: 'weak', label: '弱' },
  { id: 'medium', label: '中' },
  { id: 'strong', label: '强' },
]

export default function DesktopCustomizePage({ onBack }: { onBack: () => void }) {
  const styles = useDesktop((s) => s.styles)
  const visibility = useDesktop((s) => s.visibility)
  const wallpaperPresetId = useDesktop((s) => s.wallpaperPresetId)
  const setStyles = useDesktop((s) => s.setStyles)
  const setVisibility = useDesktop((s) => s.setVisibility)
  const setWallpaperPreset = useDesktop((s) => s.setWallpaperPreset)

  const wallpaperId = useSettings((s) => s.wallpapers.desktop)
  const setWallpaper = useSettings((s) => s.setWallpaper)
  const characters = useCharacters((s) => s.characters)
  const push = useToast((s) => s.push)

  const previewUrl = useBlobURL(wallpaperId)
  const fileRef = useRef<HTMLInputElement>(null)
  const avatarRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const savedRef = useRef(false)
  const snapshotRef = useRef<{ styles: ModuleStyles; visibility: ModuleVisibility } | null>(null)

  // 进入页面时记录快照，未保存就离开则还原（实时预览 + 可撤销）
  useEffect(() => {
    snapshotRef.current = {
      styles: { ...useDesktop.getState().styles },
      visibility: { ...useDesktop.getState().visibility },
    }
    return () => {
      if (!savedRef.current && snapshotRef.current) {
        useDesktop.setState({ styles: snapshotRef.current.styles, visibility: snapshotRef.current.visibility })
      }
    }
  }, [])

  const save = () => {
    savedRef.current = true
    push('桌面外观已保存')
  }

  const reset = () => {
    setStyles({ ...DEFAULT_STYLES })
    useDesktop.setState({ visibility: { ...DEFAULT_VISIBILITY } })
    push('已重置为默认（记得保存）', 'info')
  }

  const onWallpaperFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const blob = await compressImage(f, 1920)
      const id = await putBlob(blob)
      setWallpaper('desktop', id)
      push('壁纸已更新')
    } catch {
      push('图片处理失败', 'error')
    }
  }

  const onAvatarFile = async (charId: string, f: File | undefined) => {
    if (!f) return
    try {
      const blob = await compressImage(f, 256)
      const id = await putBlob(blob)
      useCharacters.getState().updateCharacter(charId, { avatarId: id })
      push('头像已更新')
    } catch {
      push('图片处理失败', 'error')
    }
  }

  const gradient = resolveGradient(styles)

  return (
    <>
      <div className="no-select" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexShrink: 0 }}>
        <button className="pressable" onClick={onBack} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="nav-title fs-h2" style={{ color: 'var(--text-primary)', flex: 1 }}>
          桌面外观自定义
        </span>
        <button className="btn btn-sm pressable" onClick={reset}>
          <RotateCcw size={13} /> 重置
        </button>
        <button className="btn btn-sm btn-accent pressable" onClick={save}>
          <Check size={13} /> 保存
        </button>
      </div>

      <div className="page-enter" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        {/* 壁纸设置 */}
        <SectionCard title="壁纸设置">
          <div
            style={{
              height: 120,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid #2a2a2a',
              background: previewUrl ? undefined : wallpaperCss(wallpaperPresetId),
              marginBottom: 12,
            }}
          >
            {previewUrl && <img src={previewUrl} alt="壁纸预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-sm pressable" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={14} /> 从相册选择
            </button>
            <button
              className="btn btn-sm pressable"
              style={{ flex: 1 }}
              onClick={() => {
                setWallpaper('desktop', null)
                push('已恢复默认壁纸')
              }}
            >
              恢复默认
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              void onWallpaperFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>内置暗黑壁纸</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WALLPAPER_PRESETS.map((w) => (
              <button
                key={w.id}
                className="pressable"
                onClick={() => {
                  setWallpaperPreset(w.id)
                  setWallpaper('desktop', null)
                }}
                title={w.label}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 10,
                  background: w.css,
                  border: wallpaperPresetId === w.id && !previewUrl ? '2px solid var(--text-primary)' : '1px solid #2a2a2a',
                }}
              />
            ))}
          </div>
        </SectionCard>

        {/* 模块样式设置 */}
        <SectionCard title="模块样式设置">
          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 8 }}>模块背景色</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            {BG_PRESETS.map((p) => (
              <button
                key={p.id}
                className="pressable"
                title={p.label}
                onClick={() => setStyles({ presetId: p.id })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `linear-gradient(160deg, ${p.from}, ${p.to})`,
                  border: styles.presetId === p.id ? '2px solid var(--text-primary)' : '1px solid #2a2a2a',
                }}
              />
            ))}
            <label
              className="pressable"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 10,
                border: styles.presetId === 'custom' ? '2px solid var(--text-primary)' : '1px solid #2a2a2a',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              <input
                type="color"
                value={styles.customFrom}
                onChange={(e) =>
                  setStyles({ presetId: 'custom', customFrom: e.target.value, customTo: darken(e.target.value) })
                }
                style={{ width: 22, height: 22, padding: 0, border: 'none', background: 'none' }}
              />
              <span className="fs-micro" style={{ color: 'var(--text-secondary)' }}>自定义</span>
            </label>
          </div>

          <SliderRow
            label="圆角大小"
            value={styles.borderRadius}
            min={8}
            max={24}
            format={(v) => `${v}px`}
            onChange={(v) => setStyles({ borderRadius: v })}
          />
          <SliderRow
            label="模块间距"
            value={styles.spacing}
            min={8}
            max={24}
            format={(v) => `${v}px`}
            onChange={(v) => setStyles({ spacing: v })}
          />

          <div className="fs-micro" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>阴影强度</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {SHADOWS.map((s) => (
              <button
                key={s.id}
                className="btn btn-sm pressable"
                style={{
                  flex: 1,
                  background: styles.shadow === s.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: styles.shadow === s.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                onClick={() => setStyles({ shadow: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div
            className="no-select"
            style={{
              marginTop: 14,
              padding: 14,
              background: `linear-gradient(160deg, ${gradient.from}, ${gradient.to})`,
              borderRadius: styles.borderRadius,
              border: '1px solid #2a2a2a',
            }}
          >
            <span className="fs-micro" style={{ color: '#888888' }}>样式预览</span>
          </div>
        </SectionCard>

        {/* 组件头像设置 */}
        <SectionCard title="组件头像设置">
          {characters.length === 0 ? (
            <div className="fs-micro" style={{ color: 'var(--text-disabled)' }}>
              还没有角色，先去「聊天」创建一个。
            </div>
          ) : (
            characters.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Avatar imageId={c.avatarId} name={c.name} size={40} />
                <span className="fs-body" style={{ flex: 1, color: 'var(--text-primary)' }}>{c.name}</span>
                <button className="btn btn-sm pressable" onClick={() => avatarRefs.current[c.id]?.click()}>
                  换
                </button>
                {c.avatarId && (
                  <button
                    className="btn btn-sm pressable"
                    onClick={() => {
                      useCharacters.getState().updateCharacter(c.id, { avatarId: null })
                      push('已恢复默认头像', 'info')
                    }}
                  >
                    恢复
                  </button>
                )}
                <input
                  ref={(el) => {
                    avatarRefs.current[c.id] = el
                  }}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    void onAvatarFile(c.id, e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
            ))
          )}
        </SectionCard>

        {/* 模块开关 */}
        <SectionCard title="模块开关">
          {(
            [
              ['time', '时间卡'],
              ['monologue', '独白卡'],
              ['recent', '最近互动'],
              ['playing', '正在播放'],
            ] as [keyof ModuleVisibility, string][]
          ).map(([key, label]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="fs-body" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <Toggle checked={visibility[key]} onChange={(v) => setVisibility(key, v)} />
            </div>
          ))}
        </SectionCard>
      </div>
    </>
  )
}